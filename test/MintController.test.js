const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("MintController", function () {
    async function deployMintControllerFixture() {
        const [
            deployer,
            owner,
            minterManagerAdmin,
            controller1,
            controller2,
            minter1,
            minter2,
            recipient,
            otherAccount,
        ] = await ethers.getSigners();

        // Deploy BridgedCaminoV1 to act as the minter manager
        const BridgedCaminoV1 = await ethers.getContractFactory("BridgedCaminoV1");
        const bridgedCaminoV1Impl = await BridgedCaminoV1.deploy();

        const initParams = {
            name: "BridgedCamino",
            symbol: "WCAM.c",
            defaultAdmin: deployer.address,
            pauser: deployer.address,
            upgrader: deployer.address,
            blacklister: deployer.address,
            pauserRoleAdmin: deployer.address,
            upgraderRoleAdmin: deployer.address,
            minterRoleAdmin: deployer.address, // Deployer initially, will grant to MintController
            blacklisterRoleAdmin: deployer.address,
        };

        const initializeData = bridgedCaminoV1Impl.interface.encodeFunctionData("initialize", [initParams]);

        const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
        const bridgedCaminoV1Proxy = await ERC1967ProxyFactory.deploy(
            await bridgedCaminoV1Impl.getAddress(),
            initializeData,
        );

        const minterManager = await BridgedCaminoV1.attach(await bridgedCaminoV1Proxy.getAddress());

        // Deploy MintController
        const MintController = await ethers.getContractFactory("MintController");
        const mintController = await MintController.deploy(await minterManager.getAddress(), owner.address);

        // Grant MINTER_ROLE_ADMIN to MintController so it can manage minters
        const MINTER_ROLE_ADMIN = await minterManager.MINTER_ROLE_ADMIN();
        await minterManager.connect(deployer).grantRole(MINTER_ROLE_ADMIN, await mintController.getAddress());

        return {
            mintController,
            minterManager,
            owner,
            minterManagerAdmin,
            controller1,
            controller2,
            minter1,
            minter2,
            recipient,
            otherAccount,
        };
    }

    async function mintControllerWithConfiguredControllersFixture() {
        const {
            mintController,
            minterManager,
            owner,
            minterManagerAdmin,
            controller1,
            controller2,
            minter1,
            minter2,
            recipient,
        } = await loadFixture(deployMintControllerFixture);

        // Configure controller1 with minter1
        await mintController.connect(owner).configureController(controller1.address, minter1.address);

        // Configure controller2 with minter2
        await mintController.connect(owner).configureController(controller2.address, minter2.address);

        return {
            mintController,
            minterManager,
            owner,
            minterManagerAdmin,
            controller1,
            controller2,
            minter1,
            minter2,
            recipient,
        };
    }

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            const { mintController, owner } = await loadFixture(deployMintControllerFixture);
            expect(await mintController.owner()).to.equal(owner.address);
        });

        it("Should set the correct minter manager", async function () {
            const { mintController, minterManager } = await loadFixture(deployMintControllerFixture);
            expect(await mintController.getMinterManager()).to.equal(await minterManager.getAddress());
        });

        it("Should revert if minter manager is zero address", async function () {
            const { owner } = await loadFixture(deployMintControllerFixture);
            const MintController = await ethers.getContractFactory("MintController");

            await expect(MintController.deploy(ethers.ZeroAddress, owner.address)).to.be.revertedWithCustomError(
                MintController,
                "MinterManagerZeroAddress",
            );
        });
    });

    describe("setMinterManager", function () {
        it("Should allow owner to update minter manager", async function () {
            const { mintController, owner, otherAccount } = await loadFixture(deployMintControllerFixture);

            // Deploy a new mock minter manager
            const BridgedCaminoV1 = await ethers.getContractFactory("BridgedCaminoV1");
            const newMinterManagerImpl = await BridgedCaminoV1.deploy();

            await expect(
                mintController.connect(owner).setMinterManager(await newMinterManagerImpl.getAddress()),
            )
                .to.emit(mintController, "MinterManagerSet")
                .withArgs(await mintController.getMinterManager(), await newMinterManagerImpl.getAddress());

            expect(await mintController.getMinterManager()).to.equal(await newMinterManagerImpl.getAddress());
        });

        it("Should revert if new minter manager is zero address", async function () {
            const { mintController, owner } = await loadFixture(deployMintControllerFixture);

            await expect(
                mintController.connect(owner).setMinterManager(ethers.ZeroAddress),
            ).to.be.revertedWithCustomError(mintController, "MinterManagerZeroAddress");
        });

        it("Should revert if called by non-owner", async function () {
            const { mintController, otherAccount } = await loadFixture(deployMintControllerFixture);

            await expect(
                mintController.connect(otherAccount).setMinterManager(otherAccount.address),
            ).to.be.revertedWithCustomError(mintController, "OwnableUnauthorizedAccount");
        });
    });

    describe("configureMinter", function () {
        it("Should allow controller to configure their minter with allowance", async function () {
            const { mintController, minterManager, minterManagerAdmin, controller1, minter1 } =
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            const allowance = ethers.parseEther("1000");

            await expect(mintController.connect(controller1).configureMinter(allowance))
                .to.emit(mintController, "MinterConfigured")
                .withArgs(controller1.address, minter1.address, allowance);

            // Verify minter was configured in the minter manager
            expect(await minterManager.isMinter(minter1.address)).to.equal(true);
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(allowance);
        });

        it("Should allow controller to update their minter's allowance", async function () {
            const { mintController, minterManager, controller1, minter1 } =
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            const allowance1 = ethers.parseEther("1000");
            const allowance2 = ethers.parseEther("2000");

            await mintController.connect(controller1).configureMinter(allowance1);
            await mintController.connect(controller1).configureMinter(allowance2);

            expect(await minterManager.minterAllowance(minter1.address)).to.equal(allowance2);
        });

        it("Should revert if caller is not a controller", async function () {
            const { mintController, otherAccount } = await loadFixture(deployMintControllerFixture);

            await expect(mintController.connect(otherAccount).configureMinter(1000)).to.be.revertedWithCustomError(
                mintController,
                "NotController",
            );
        });
    });

    describe("incrementMinterAllowance", function () {
        it("Should allow controller to increment their minter's allowance", async function () {
            const { mintController, minterManager, controller1, minter1 } =
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            const initialAllowance = ethers.parseEther("1000");
            const increment = ethers.parseEther("500");

            // Configure minter first
            await mintController.connect(controller1).configureMinter(initialAllowance);

            // Increment allowance
            await expect(mintController.connect(controller1).incrementMinterAllowance(increment))
                .to.emit(mintController, "MinterAllowanceIncremented")
                .withArgs(controller1.address, minter1.address, increment, initialAllowance + increment);

            expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance + increment);
        });

        it("Should revert if increment is zero", async function () {
            const { mintController, controller1 } = await loadFixture(mintControllerWithConfiguredControllersFixture);

            await expect(
                mintController.connect(controller1).incrementMinterAllowance(0),
            ).to.be.revertedWithCustomError(mintController, "AllowanceIncrementZero");
        });

        it("Should revert if minter is not active", async function () {
            const { mintController, controller1 } = await loadFixture(mintControllerWithConfiguredControllersFixture);

            // Try to increment without configuring first
            await expect(
                mintController.connect(controller1).incrementMinterAllowance(ethers.parseEther("100")),
            ).to.be.revertedWithCustomError(mintController, "MinterNotActive");
        });

        it("Should revert if caller is not a controller", async function () {
            const { mintController, otherAccount } = await loadFixture(deployMintControllerFixture);

            await expect(
                mintController.connect(otherAccount).incrementMinterAllowance(1000),
            ).to.be.revertedWithCustomError(mintController, "NotController");
        });

        it("Should revert on overflow", async function () {
            const { mintController, controller1 } = await loadFixture(mintControllerWithConfiguredControllersFixture);

            const maxUint256 = ethers.MaxUint256;
            await mintController.connect(controller1).configureMinter(maxUint256);

            // Try to increment by 1, should overflow
            await expect(mintController.connect(controller1).incrementMinterAllowance(1)).to.be.reverted;
        });
    });

    describe("decrementMinterAllowance", function () {
        it("Should allow controller to decrement their minter's allowance", async function () {
            const { mintController, minterManager, controller1, minter1 } =
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            const initialAllowance = ethers.parseEther("1000");
            const decrement = ethers.parseEther("300");

            await mintController.connect(controller1).configureMinter(initialAllowance);

            await expect(mintController.connect(controller1).decrementMinterAllowance(decrement))
                .to.emit(mintController, "MinterAllowanceDecremented")
                .withArgs(controller1.address, minter1.address, decrement, initialAllowance - decrement);

            expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance - decrement);
        });

        it("Should cap decrement at current allowance (safe decrement)", async function () {
            const { mintController, minterManager, controller1, minter1 } =
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            const initialAllowance = ethers.parseEther("100");
            const decrement = ethers.parseEther("200"); // More than available

            await mintController.connect(controller1).configureMinter(initialAllowance);

            await expect(mintController.connect(controller1).decrementMinterAllowance(decrement))
                .to.emit(mintController, "MinterAllowanceDecremented")
                .withArgs(controller1.address, minter1.address, initialAllowance, 0n);

            expect(await minterManager.minterAllowance(minter1.address)).to.equal(0);
        });

        it("Should revert if decrement is zero", async function () {
            const { mintController, controller1 } = await loadFixture(mintControllerWithConfiguredControllersFixture);

            await expect(
                mintController.connect(controller1).decrementMinterAllowance(0),
            ).to.be.revertedWithCustomError(mintController, "AllowanceDecrementZero");
        });

        it("Should revert if minter is not active", async function () {
            const { mintController, controller1 } = await loadFixture(mintControllerWithConfiguredControllersFixture);

            await expect(
                mintController.connect(controller1).decrementMinterAllowance(ethers.parseEther("100")),
            ).to.be.revertedWithCustomError(mintController, "MinterNotActive");
        });

        it("Should revert if caller is not a controller", async function () {
            const { mintController, otherAccount } = await loadFixture(deployMintControllerFixture);

            await expect(
                mintController.connect(otherAccount).decrementMinterAllowance(1000),
            ).to.be.revertedWithCustomError(mintController, "NotController");
        });
    });

    describe("removeMinter", function () {
        it("Should allow controller to remove their minter", async function () {
            const { mintController, minterManager, controller1, minter1 } =
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            // Configure minter first
            await mintController.connect(controller1).configureMinter(ethers.parseEther("1000"));

            await expect(mintController.connect(controller1).removeMinter())
                .to.emit(mintController, "MinterRemoved")
                .withArgs(controller1.address, minter1.address);

            // Verify minter was removed
            expect(await minterManager.isMinter(minter1.address)).to.equal(false);
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(0);
        });

        it("Should revert if caller is not a controller", async function () {
            const { mintController, otherAccount } = await loadFixture(deployMintControllerFixture);

            await expect(mintController.connect(otherAccount).removeMinter()).to.be.revertedWithCustomError(
                mintController,
                "NotController",
            );
        });
    });

    describe("Multiple controllers managing same minter", function () {
        it("Should allow multiple controllers to manage the same minter independently", async function () {
            const { mintController, minterManager, owner, controller1, controller2, minter1 } =
                await loadFixture(deployMintControllerFixture);

            // Configure both controllers to manage minter1
            await mintController.connect(owner).configureController(controller1.address, minter1.address);
            await mintController.connect(owner).configureController(controller2.address, minter1.address);

            // Controller1 sets allowance to 1000
            await mintController.connect(controller1).configureMinter(ethers.parseEther("1000"));
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(ethers.parseEther("1000"));

            // Controller2 can update the same minter's allowance to 2000
            await mintController.connect(controller2).configureMinter(ethers.parseEther("2000"));
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(ethers.parseEther("2000"));

            // Controller1 can increment
            await mintController.connect(controller1).incrementMinterAllowance(ethers.parseEther("500"));
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(ethers.parseEther("2500"));

            // Controller2 can decrement
            await mintController.connect(controller2).decrementMinterAllowance(ethers.parseEther("1000"));
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(ethers.parseEther("1500"));
        });
    });

    describe("Integration with BridgedCaminoV1", function () {
        it("Should enable minter to mint after being configured", async function () {
            const { mintController, minterManager, controller1, minter1, recipient } =
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            const allowance = ethers.parseEther("1000");
            const mintAmount = ethers.parseEther("100");

            // Configure minter
            await mintController.connect(controller1).configureMinter(allowance);

            // Minter should be able to mint
            await expect(minterManager.connect(minter1).mint(recipient.address, mintAmount))
                .to.emit(minterManager, "Mint")
                .withArgs(minter1.address, recipient.address, mintAmount);

            expect(await minterManager.balanceOf(recipient.address)).to.equal(mintAmount);
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(allowance - mintAmount);
        });

        it("Should prevent minting after minter is removed", async function () {
            const { mintController, minterManager, controller1, minter1, recipient } =
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            const allowance = ethers.parseEther("1000");

            // Configure and then remove minter
            await mintController.connect(controller1).configureMinter(allowance);
            await mintController.connect(controller1).removeMinter();

            // Minter should not be able to mint
            await expect(minterManager.connect(minter1).mint(recipient.address, ethers.parseEther("100"))).to.be.reverted;
        });
    });
});
