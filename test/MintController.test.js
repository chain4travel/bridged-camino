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
            name: "Bridged Camino (Third-Party Team)",
            symbol: "CAM.c",
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

        // Configure controller1 with minter1 and set a reasonable ceiling for testing
        await mintController.connect(owner).configureController(controller1.address, minter1.address);
        await mintController.connect(owner).setControllerCeiling(controller1.address, ethers.parseEther("10000"));

        // Configure controller2 with minter2 and set a reasonable ceiling for testing
        await mintController.connect(owner).configureController(controller2.address, minter2.address);
        await mintController.connect(owner).setControllerCeiling(controller2.address, ethers.parseEther("10000"));

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

        it("Should allow deployment with zero address for atomic deployment pattern", async function () {
            const { owner } = await loadFixture(deployMintControllerFixture);
            const MintController = await ethers.getContractFactory("MintController");

            // Should be able to deploy with address(0)
            const mintController = await MintController.deploy(ethers.ZeroAddress, owner.address);

            // But getMinterManager should return address(0)
            expect(await mintController.getMinterManager()).to.equal(ethers.ZeroAddress);
        });

        it("Should require setMinterManager before use when deployed with zero address", async function () {
            const { owner, controller1 } = await loadFixture(deployMintControllerFixture);
            const MintController = await ethers.getContractFactory("MintController");

            // Deploy with address(0)
            const mintController = await MintController.deploy(ethers.ZeroAddress, owner.address);

            // Configure a controller
            await mintController.connect(owner).configureController(controller1.address, controller1.address);

            // Trying to call configureMinter should fail because minterManager is not set
            await expect(mintController.connect(controller1).configureMinter(1000)).to.be.reverted; // Will revert when trying to call address(0)
        });
    });

    describe("setMinterManager", function () {
        it("Should allow owner to update minter manager", async function () {
            const { mintController, owner, otherAccount } = await loadFixture(deployMintControllerFixture);

            // Deploy a new mock minter manager
            const BridgedCaminoV1 = await ethers.getContractFactory("BridgedCaminoV1");
            const newMinterManagerImpl = await BridgedCaminoV1.deploy();

            await expect(mintController.connect(owner).setMinterManager(await newMinterManagerImpl.getAddress()))
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
            const { mintController, minterManager, controller1, minter1 } = await loadFixture(
                mintControllerWithConfiguredControllersFixture,
            );

            const allowance = ethers.parseEther("1000");

            await expect(mintController.connect(controller1).configureMinter(allowance))
                .to.emit(mintController, "MinterConfigured")
                .withArgs(controller1.address, minter1.address, allowance);

            // Verify minter was configured in the minter manager
            expect(await minterManager.isMinter(minter1.address)).to.equal(true);
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(allowance);
        });

        it("Should allow controller to update their minter's allowance", async function () {
            const { mintController, minterManager, controller1, minter1 } = await loadFixture(
                mintControllerWithConfiguredControllersFixture,
            );

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
            const { mintController, minterManager, controller1, minter1 } = await loadFixture(
                mintControllerWithConfiguredControllersFixture,
            );

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

            await expect(mintController.connect(controller1).incrementMinterAllowance(0)).to.be.revertedWithCustomError(
                mintController,
                "AllowanceIncrementZero",
            );
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
            const { mintController, owner, controller1 } = await loadFixture(mintControllerWithConfiguredControllersFixture);

            const maxUint256 = ethers.MaxUint256;

            // Set unlimited ceiling
            await mintController.connect(owner).setControllerCeiling(controller1.address, ethers.MaxUint256);
            await mintController.connect(controller1).configureMinter(maxUint256);

            // Try to increment by 1, should overflow
            await expect(mintController.connect(controller1).incrementMinterAllowance(1)).to.be.reverted;
        });
    });

    describe("decrementMinterAllowance", function () {
        it("Should allow controller to decrement their minter's allowance", async function () {
            const { mintController, minterManager, controller1, minter1 } = await loadFixture(
                mintControllerWithConfiguredControllersFixture,
            );

            const initialAllowance = ethers.parseEther("1000");
            const decrement = ethers.parseEther("300");

            await mintController.connect(controller1).configureMinter(initialAllowance);

            await expect(mintController.connect(controller1).decrementMinterAllowance(decrement))
                .to.emit(mintController, "MinterAllowanceDecremented")
                .withArgs(controller1.address, minter1.address, decrement, initialAllowance - decrement);

            expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance - decrement);
        });

        it("Should cap decrement at current allowance (safe decrement)", async function () {
            const { mintController, minterManager, controller1, minter1 } = await loadFixture(
                mintControllerWithConfiguredControllersFixture,
            );

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

            await expect(mintController.connect(controller1).decrementMinterAllowance(0)).to.be.revertedWithCustomError(
                mintController,
                "AllowanceDecrementZero",
            );
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
            const { mintController, minterManager, controller1, minter1 } = await loadFixture(
                mintControllerWithConfiguredControllersFixture,
            );

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
                await loadFixture(mintControllerWithConfiguredControllersFixture);

            // Reconfigure both controllers to manage the same minter (minter1)
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
            const { mintController, minterManager, controller1, minter1, recipient } = await loadFixture(
                mintControllerWithConfiguredControllersFixture,
            );

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
            const { mintController, minterManager, controller1, minter1, recipient } = await loadFixture(
                mintControllerWithConfiguredControllersFixture,
            );

            const allowance = ethers.parseEther("1000");

            // Configure and then remove minter
            await mintController.connect(controller1).configureMinter(allowance);
            await mintController.connect(controller1).removeMinter();

            // Minter should not be able to mint
            await expect(minterManager.connect(minter1).mint(recipient.address, ethers.parseEther("100"))).to.be
                .reverted;
        });
    });

    describe("Controller Ceilings", function () {
        describe("configureController with default ceiling", function () {
            it("Should set ceiling to 0 when configuring new controller", async function () {
                const { mintController, owner, otherAccount } = await loadFixture(deployMintControllerFixture);

                const newController = otherAccount;
                const newMinter = otherAccount;

                // Configure controller should emit both events
                await expect(mintController.connect(owner).configureController(newController.address, newMinter.address))
                    .to.emit(mintController, "ControllerConfigured")
                    .withArgs(newController.address, newMinter.address)
                    .and.to.emit(mintController, "ControllerCeilingUpdated")
                    .withArgs(newController.address, 0);

                expect(await mintController.getControllerCeiling(newController.address)).to.equal(0);
            });

            it("Should not reset ceiling when reconfiguring existing controller", async function () {
                const { mintController, owner, controller1, minter2 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                // Set a custom ceiling
                const ceiling = ethers.parseEther("5000");
                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);

                // Reconfigure the same controller with a different minter
                await mintController.connect(owner).configureController(controller1.address, minter2.address);

                // Ceiling should remain unchanged
                expect(await mintController.getControllerCeiling(controller1.address)).to.equal(ceiling);
            });
        });

        describe("setControllerCeiling", function () {
            it("Should allow owner to set controller ceiling", async function () {
                const { mintController, owner, controller1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("5000");

                await expect(mintController.connect(owner).setControllerCeiling(controller1.address, ceiling))
                    .to.emit(mintController, "ControllerCeilingUpdated")
                    .withArgs(controller1.address, ceiling);

                expect(await mintController.getControllerCeiling(controller1.address)).to.equal(ceiling);
            });

            it("Should allow owner to update existing ceiling", async function () {
                const { mintController, owner, controller1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling1 = ethers.parseEther("5000");
                const ceiling2 = ethers.parseEther("10000");

                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling1);
                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling2);

                expect(await mintController.getControllerCeiling(controller1.address)).to.equal(ceiling2);
            });

            it("Should allow owner to set ceiling to 0 (zero-only, for disabler controllers)", async function () {
                const { mintController, owner, controller1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                // Set ceiling to 0 (controller can only set allowance to 0)
                await expect(mintController.connect(owner).setControllerCeiling(controller1.address, 0))
                    .to.emit(mintController, "ControllerCeilingUpdated")
                    .withArgs(controller1.address, 0);

                expect(await mintController.getControllerCeiling(controller1.address)).to.equal(0);
            });

            it("Should allow owner to set ceiling to MaxUint256 (unlimited)", async function () {
                const { mintController, owner, controller1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                // Set a ceiling first
                await mintController.connect(owner).setControllerCeiling(controller1.address, ethers.parseEther("5000"));

                // Remove ceiling by setting to MaxUint256
                await expect(mintController.connect(owner).setControllerCeiling(controller1.address, ethers.MaxUint256))
                    .to.emit(mintController, "ControllerCeilingUpdated")
                    .withArgs(controller1.address, ethers.MaxUint256);

                expect(await mintController.getControllerCeiling(controller1.address)).to.equal(ethers.MaxUint256);
            });

            it("Should revert if called by non-owner", async function () {
                const { mintController, controller1 } = await loadFixture(mintControllerWithConfiguredControllersFixture);

                await expect(
                    mintController.connect(controller1).setControllerCeiling(controller1.address, ethers.parseEther("5000")),
                ).to.be.revertedWithCustomError(mintController, "OwnableUnauthorizedAccount");
            });
        });

        describe("getControllerCeiling", function () {
            it("Should return 0 for newly configured controller (default ceiling)", async function () {
                const { mintController, owner, otherAccount } = await loadFixture(deployMintControllerFixture);

                // Configure a new controller
                await mintController.connect(owner).configureController(otherAccount.address, otherAccount.address);

                // Controllers default to ceiling of 0 when configured
                expect(await mintController.getControllerCeiling(otherAccount.address)).to.equal(0);
            });

            it("Should return correct ceiling after it is set", async function () {
                const { mintController, owner, controller1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("7500");
                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);

                expect(await mintController.getControllerCeiling(controller1.address)).to.equal(ceiling);
            });
        });

        describe("configureMinter with ceiling", function () {
            it("Should allow configureMinter when allowance is below ceiling", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("5000");
                const allowance = ethers.parseEther("3000");

                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);
                await expect(mintController.connect(controller1).configureMinter(allowance))
                    .to.emit(mintController, "MinterConfigured")
                    .withArgs(controller1.address, minter1.address, allowance);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(allowance);
            });

            it("Should allow configureMinter when allowance equals ceiling", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("5000");

                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);
                await mintController.connect(controller1).configureMinter(ceiling);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(ceiling);
            });

            it("Should revert when allowance exceeds ceiling", async function () {
                const { mintController, owner, controller1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("5000");
                const allowance = ethers.parseEther("6000");

                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);

                await expect(mintController.connect(controller1).configureMinter(allowance))
                    .to.be.revertedWithCustomError(mintController, "AllowanceExceedsCeiling")
                    .withArgs(allowance, ceiling);
            });

            it("Should allow unlimited allowance when ceiling is set to MaxUint256", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const veryLargeAllowance = ethers.MaxUint256;

                // Set ceiling to MaxUint256 (unlimited)
                await mintController.connect(owner).setControllerCeiling(controller1.address, ethers.MaxUint256);
                await mintController.connect(controller1).configureMinter(veryLargeAllowance);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(veryLargeAllowance);
            });

            it("Should enforce default ceiling of 0 (controller can only disable)", async function () {
                const { mintController, minterManager, owner, otherAccount } = await loadFixture(
                    deployMintControllerFixture,
                );

                // Configure a new controller (defaults to ceiling of 0)
                await mintController.connect(owner).configureController(otherAccount.address, otherAccount.address);

                // Controllers default to ceiling of 0 (zero-only)
                expect(await mintController.getControllerCeiling(otherAccount.address)).to.equal(0);

                // Can configure allowance of 0
                await mintController.connect(otherAccount).configureMinter(0);
                expect(await minterManager.minterAllowance(otherAccount.address)).to.equal(0);

                // Cannot configure any non-zero allowance
                await expect(mintController.connect(otherAccount).configureMinter(1))
                    .to.be.revertedWithCustomError(mintController, "AllowanceExceedsCeiling")
                    .withArgs(1, 0);
            });
        });

        describe("incrementMinterAllowance with ceiling", function () {
            it("Should allow increment when new allowance is below ceiling", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("5000");
                const initialAllowance = ethers.parseEther("2000");
                const increment = ethers.parseEther("1000");

                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);
                await mintController.connect(controller1).configureMinter(initialAllowance);

                await expect(mintController.connect(controller1).incrementMinterAllowance(increment))
                    .to.emit(mintController, "MinterAllowanceIncremented")
                    .withArgs(controller1.address, minter1.address, increment, initialAllowance + increment);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance + increment);
            });

            it("Should allow increment when new allowance equals ceiling", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("5000");
                const initialAllowance = ethers.parseEther("3000");
                const increment = ethers.parseEther("2000");

                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);
                await mintController.connect(controller1).configureMinter(initialAllowance);
                await mintController.connect(controller1).incrementMinterAllowance(increment);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(ceiling);
            });

            it("Should revert when increment would exceed ceiling", async function () {
                const { mintController, owner, controller1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("5000");
                const initialAllowance = ethers.parseEther("3000");
                const increment = ethers.parseEther("3000");

                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);
                await mintController.connect(controller1).configureMinter(initialAllowance);

                const expectedNewAllowance = initialAllowance + increment;

                await expect(mintController.connect(controller1).incrementMinterAllowance(increment))
                    .to.be.revertedWithCustomError(mintController, "AllowanceExceedsCeiling")
                    .withArgs(expectedNewAllowance, ceiling);
            });

            it("Should allow unlimited increment when ceiling is MaxUint256", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const initialAllowance = ethers.parseEther("1000");
                const largeIncrement = ethers.parseEther("1000000");

                // Set ceiling to MaxUint256 (unlimited)
                await mintController.connect(owner).setControllerCeiling(controller1.address, ethers.MaxUint256);
                await mintController.connect(controller1).configureMinter(initialAllowance);
                await mintController.connect(controller1).incrementMinterAllowance(largeIncrement);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance + largeIncrement);
            });

            it("Should prevent increment when ceiling is 0 (default zero-only controller)", async function () {
                const { mintController, owner, otherAccount } = await loadFixture(
                    deployMintControllerFixture,
                );

                // Configure a new controller (defaults to ceiling of 0)
                await mintController.connect(owner).configureController(otherAccount.address, otherAccount.address);

                // Controllers default to ceiling of 0 (zero-only)
                expect(await mintController.getControllerCeiling(otherAccount.address)).to.equal(0);

                // Configure with allowance 0
                await mintController.connect(otherAccount).configureMinter(0);

                // Cannot increment from 0 (would exceed ceiling of 0)
                await expect(mintController.connect(otherAccount).incrementMinterAllowance(1))
                    .to.be.revertedWithCustomError(mintController, "AllowanceExceedsCeiling")
                    .withArgs(1, 0);
            });
        });

        describe("decrementMinterAllowance with ceiling", function () {
            it("Should allow decrement regardless of ceiling (reducing is always allowed)", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const ceiling = ethers.parseEther("5000");
                const initialAllowance = ethers.parseEther("3000");
                const decrement = ethers.parseEther("1000");

                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling);
                await mintController.connect(controller1).configureMinter(initialAllowance);
                await mintController.connect(controller1).decrementMinterAllowance(decrement);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance - decrement);
            });

            it("Should allow zero-ceiling controller to decrement (useful for disabling)", async function () {
                const { mintController, minterManager, owner } = await loadFixture(deployMintControllerFixture);

                const [, , , controller1, disablerController, minter1] = await ethers.getSigners();

                // Configure controller1 with a normal ceiling
                await mintController.connect(owner).configureController(controller1.address, minter1.address);
                await mintController.connect(owner).setControllerCeiling(controller1.address, ethers.parseEther("10000"));

                // Configure with normal controller first
                const initialAllowance = ethers.parseEther("5000");
                await mintController.connect(controller1).configureMinter(initialAllowance);

                // Create a zero-ceiling controller for the same minter (disabler role)
                await mintController.connect(owner).configureController(disablerController.address, minter1.address);
                expect(await mintController.getControllerCeiling(disablerController.address)).to.equal(0);

                // Zero-ceiling controller can decrement (but not increment)
                const decrement = ethers.parseEther("2000");
                await mintController.connect(disablerController).decrementMinterAllowance(decrement);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance - decrement);
            });
        });

        describe("Multiple controllers with different ceilings", function () {
            it("Should enforce different ceilings for different controllers", async function () {
                const { mintController, minterManager, owner, controller1, controller2, minter1, minter2 } =
                    await loadFixture(mintControllerWithConfiguredControllersFixture);

                const ceiling1 = ethers.parseEther("3000");
                const ceiling2 = ethers.parseEther("7000");

                // Set different ceilings
                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling1);
                await mintController.connect(owner).setControllerCeiling(controller2.address, ceiling2);

                // Controller1 can configure up to 3000
                await mintController.connect(controller1).configureMinter(ceiling1);
                expect(await minterManager.minterAllowance(minter1.address)).to.equal(ceiling1);

                // Controller1 cannot exceed 3000
                await expect(
                    mintController.connect(controller1).configureMinter(ethers.parseEther("4000")),
                ).to.be.revertedWithCustomError(mintController, "AllowanceExceedsCeiling");

                // Controller2 can configure up to 7000
                await mintController.connect(controller2).configureMinter(ceiling2);
                expect(await minterManager.minterAllowance(minter2.address)).to.equal(ceiling2);

                // Controller2 cannot exceed 7000
                await expect(
                    mintController.connect(controller2).configureMinter(ethers.parseEther("8000")),
                ).to.be.revertedWithCustomError(mintController, "AllowanceExceedsCeiling");
            });

            it("Should allow one controller with limited ceiling and another with unlimited", async function () {
                const { mintController, minterManager, owner, controller1, controller2, minter2 } =
                    await loadFixture(mintControllerWithConfiguredControllersFixture);

                const ceiling1 = ethers.parseEther("5000");

                // Set limited ceiling for controller1
                await mintController.connect(owner).setControllerCeiling(controller1.address, ceiling1);

                // Controller1 is limited by ceiling
                await expect(
                    mintController.connect(controller1).configureMinter(ethers.parseEther("6000")),
                ).to.be.revertedWithCustomError(mintController, "AllowanceExceedsCeiling");

                // Set unlimited ceiling for controller2
                await mintController.connect(owner).setControllerCeiling(controller2.address, ethers.MaxUint256);

                // Controller2 has unlimited ceiling (can set any amount)
                const largeAllowance = ethers.parseEther("1000000");
                await mintController.connect(controller2).configureMinter(largeAllowance);
                expect(await minterManager.minterAllowance(minter2.address)).to.equal(largeAllowance);
            });
        });

        describe("Ceiling edge cases", function () {
            it("Should handle ceiling of 1 (minimum non-zero ceiling)", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                await mintController.connect(owner).setControllerCeiling(controller1.address, 1);

                // Can configure allowance of 1
                await mintController.connect(controller1).configureMinter(1);
                expect(await minterManager.minterAllowance(minter1.address)).to.equal(1);

                // Cannot configure allowance of 2
                await expect(mintController.connect(controller1).configureMinter(2))
                    .to.be.revertedWithCustomError(mintController, "AllowanceExceedsCeiling")
                    .withArgs(2, 1);
            });

            it("Should handle MaxUint256 ceiling (effectively unlimited)", async function () {
                const { mintController, minterManager, owner, controller1, minter1 } = await loadFixture(
                    mintControllerWithConfiguredControllersFixture,
                );

                const maxCeiling = ethers.MaxUint256;

                await mintController.connect(owner).setControllerCeiling(controller1.address, maxCeiling);
                await mintController.connect(controller1).configureMinter(maxCeiling);

                expect(await minterManager.minterAllowance(minter1.address)).to.equal(maxCeiling);
            });
        });
    });
});
