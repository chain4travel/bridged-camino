const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("MasterMinter", function () {
    async function deployMasterMinterFixture() {
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
            minterRoleAdmin: deployer.address, // Deployer initially, will grant to MasterMinter
            blacklisterRoleAdmin: deployer.address,
        };

        const initializeData = bridgedCaminoV1Impl.interface.encodeFunctionData("initialize", [initParams]);

        const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
        const bridgedCaminoV1Proxy = await ERC1967ProxyFactory.deploy(
            await bridgedCaminoV1Impl.getAddress(),
            initializeData,
        );

        const minterManager = await BridgedCaminoV1.attach(await bridgedCaminoV1Proxy.getAddress());

        // Deploy MasterMinter
        const MasterMinter = await ethers.getContractFactory("MasterMinter");
        const masterMinter = await MasterMinter.deploy(await minterManager.getAddress(), owner.address);

        // Grant MINTER_ROLE_ADMIN to MasterMinter so it can manage minters
        const MINTER_ROLE_ADMIN = await minterManager.MINTER_ROLE_ADMIN();
        await minterManager.connect(deployer).grantRole(MINTER_ROLE_ADMIN, await masterMinter.getAddress());

        return {
            masterMinter,
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

    async function masterMinterWithConfiguredControllersFixture() {
        const {
            masterMinter,
            minterManager,
            owner,
            minterManagerAdmin,
            controller1,
            controller2,
            minter1,
            minter2,
            recipient,
        } = await loadFixture(deployMasterMinterFixture);

        // Configure controller1 with minter1
        await masterMinter.connect(owner).configureController(controller1.address, minter1.address);

        // Configure controller2 with minter2
        await masterMinter.connect(owner).configureController(controller2.address, minter2.address);

        return {
            masterMinter,
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
            const { masterMinter, owner } = await loadFixture(deployMasterMinterFixture);
            expect(await masterMinter.owner()).to.equal(owner.address);
        });

        it("Should set the correct minter manager", async function () {
            const { masterMinter, minterManager } = await loadFixture(deployMasterMinterFixture);
            expect(await masterMinter.getMinterManager()).to.equal(await minterManager.getAddress());
        });

        it("Should inherit from MintController", async function () {
            const { masterMinter } = await loadFixture(deployMasterMinterFixture);

            // Verify it has all MintController functions
            expect(masterMinter.configureController).to.be.a("function");
            expect(masterMinter.removeController).to.be.a("function");
            expect(masterMinter.configureMinter).to.be.a("function");
            expect(masterMinter.incrementMinterAllowance).to.be.a("function");
            expect(masterMinter.decrementMinterAllowance).to.be.a("function");
            expect(masterMinter.removeMinter).to.be.a("function");
            expect(masterMinter.getMinterManager).to.be.a("function");
            expect(masterMinter.setMinterManager).to.be.a("function");
        });
    });

    describe("Controller functionality", function () {
        it("Should allow owner to configure controllers", async function () {
            const { masterMinter, owner, controller1, minter1 } = await loadFixture(deployMasterMinterFixture);

            await expect(masterMinter.connect(owner).configureController(controller1.address, minter1.address))
                .to.emit(masterMinter, "ControllerConfigured")
                .withArgs(controller1.address, minter1.address);

            expect(await masterMinter.getWorker(controller1.address)).to.equal(minter1.address);
        });

        it("Should allow owner to remove controllers", async function () {
            const { masterMinter, owner, controller1 } = await loadFixture(masterMinterWithConfiguredControllersFixture);

            await expect(masterMinter.connect(owner).removeController(controller1.address))
                .to.emit(masterMinter, "ControllerRemoved")
                .withArgs(controller1.address);

            expect(await masterMinter.getWorker(controller1.address)).to.equal(ethers.ZeroAddress);
        });
    });

    describe("MintController functionality", function () {
        it("Should allow controllers to configure minters", async function () {
            const { masterMinter, minterManager, controller1, minter1 } =
                await loadFixture(masterMinterWithConfiguredControllersFixture);

            const allowance = ethers.parseEther("1000");

            await expect(masterMinter.connect(controller1).configureMinter(allowance))
                .to.emit(masterMinter, "MinterConfigured")
                .withArgs(controller1.address, minter1.address, allowance);

            expect(await minterManager.isMinter(minter1.address)).to.equal(true);
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(allowance);
        });

        it("Should allow controllers to increment minter allowances", async function () {
            const { masterMinter, minterManager, controller1, minter1 } =
                await loadFixture(masterMinterWithConfiguredControllersFixture);

            const initialAllowance = ethers.parseEther("1000");
            const increment = ethers.parseEther("500");

            await masterMinter.connect(controller1).configureMinter(initialAllowance);

            await expect(masterMinter.connect(controller1).incrementMinterAllowance(increment))
                .to.emit(masterMinter, "MinterAllowanceIncremented")
                .withArgs(controller1.address, minter1.address, increment, initialAllowance + increment);

            expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance + increment);
        });

        it("Should allow controllers to decrement minter allowances", async function () {
            const { masterMinter, minterManager, controller1, minter1 } =
                await loadFixture(masterMinterWithConfiguredControllersFixture);

            const initialAllowance = ethers.parseEther("1000");
            const decrement = ethers.parseEther("300");

            await masterMinter.connect(controller1).configureMinter(initialAllowance);

            await expect(masterMinter.connect(controller1).decrementMinterAllowance(decrement))
                .to.emit(masterMinter, "MinterAllowanceDecremented")
                .withArgs(controller1.address, minter1.address, decrement, initialAllowance - decrement);

            expect(await minterManager.minterAllowance(minter1.address)).to.equal(initialAllowance - decrement);
        });

        it("Should allow controllers to remove minters", async function () {
            const { masterMinter, minterManager, controller1, minter1 } =
                await loadFixture(masterMinterWithConfiguredControllersFixture);

            await masterMinter.connect(controller1).configureMinter(ethers.parseEther("1000"));

            await expect(masterMinter.connect(controller1).removeMinter())
                .to.emit(masterMinter, "MinterRemoved")
                .withArgs(controller1.address, minter1.address);

            expect(await minterManager.isMinter(minter1.address)).to.equal(false);
        });
    });

    describe("Multi-controller scenario", function () {
        it("Should support multiple controllers managing different minters", async function () {
            const { masterMinter, minterManager, controller1, controller2, minter1, minter2, recipient } =
                await loadFixture(masterMinterWithConfiguredControllersFixture);

            const allowance1 = ethers.parseEther("1000");
            const allowance2 = ethers.parseEther("2000");

            // Controller1 configures minter1
            await masterMinter.connect(controller1).configureMinter(allowance1);

            // Controller2 configures minter2
            await masterMinter.connect(controller2).configureMinter(allowance2);

            // Both minters should be active with correct allowances
            expect(await minterManager.isMinter(minter1.address)).to.equal(true);
            expect(await minterManager.isMinter(minter2.address)).to.equal(true);
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(allowance1);
            expect(await minterManager.minterAllowance(minter2.address)).to.equal(allowance2);

            // Both minters should be able to mint
            await minterManager.connect(minter1).mint(recipient.address, ethers.parseEther("100"));
            await minterManager.connect(minter2).mint(recipient.address, ethers.parseEther("200"));

            expect(await minterManager.balanceOf(recipient.address)).to.equal(ethers.parseEther("300"));
        });

        it("Should allow owner to update minter manager for all controllers", async function () {
            const { masterMinter, owner } = await loadFixture(masterMinterWithConfiguredControllersFixture);

            // Deploy a new minter manager
            const BridgedCaminoV1 = await ethers.getContractFactory("BridgedCaminoV1");
            const newMinterManagerImpl = await BridgedCaminoV1.deploy();

            const oldMinterManager = await masterMinter.getMinterManager();

            await expect(
                masterMinter.connect(owner).setMinterManager(await newMinterManagerImpl.getAddress()),
            )
                .to.emit(masterMinter, "MinterManagerSet")
                .withArgs(oldMinterManager, await newMinterManagerImpl.getAddress());

            expect(await masterMinter.getMinterManager()).to.equal(await newMinterManagerImpl.getAddress());
        });
    });

    describe("End-to-end workflow", function () {
        it("Should support complete lifecycle: configure -> mint -> adjust -> remove", async function () {
            const { masterMinter, minterManager, owner, controller1, minter1, recipient } =
                await loadFixture(deployMasterMinterFixture);

            // 1. Owner configures controller1 to manage minter1
            await masterMinter.connect(owner).configureController(controller1.address, minter1.address);

            // 2. Controller1 configures minter1 with initial allowance
            const initialAllowance = ethers.parseEther("1000");
            await masterMinter.connect(controller1).configureMinter(initialAllowance);

            // 3. Minter1 mints some tokens
            await minterManager.connect(minter1).mint(recipient.address, ethers.parseEther("100"));
            expect(await minterManager.balanceOf(recipient.address)).to.equal(ethers.parseEther("100"));

            // 4. Controller1 increments allowance
            await masterMinter.connect(controller1).incrementMinterAllowance(ethers.parseEther("500"));
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(ethers.parseEther("1400"));

            // 5. Minter1 mints more tokens
            await minterManager.connect(minter1).mint(recipient.address, ethers.parseEther("400"));
            expect(await minterManager.balanceOf(recipient.address)).to.equal(ethers.parseEther("500"));

            // 6. Controller1 decrements allowance
            await masterMinter.connect(controller1).decrementMinterAllowance(ethers.parseEther("500"));
            expect(await minterManager.minterAllowance(minter1.address)).to.equal(ethers.parseEther("500"));

            // 7. Controller1 removes minter
            await masterMinter.connect(controller1).removeMinter();
            expect(await minterManager.isMinter(minter1.address)).to.equal(false);

            // 8. Minter1 can no longer mint
            await expect(minterManager.connect(minter1).mint(recipient.address, ethers.parseEther("100"))).to.be
                .reverted;

            // 9. Owner removes controller1
            await masterMinter.connect(owner).removeController(controller1.address);
            expect(await masterMinter.getWorker(controller1.address)).to.equal(ethers.ZeroAddress);
        });
    });
});
