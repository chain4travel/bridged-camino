const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("Controller", function () {
    async function deployControllerFixture() {
        const [owner, controller1, controller2, worker1, worker2, otherAccount] = await ethers.getSigners();

        const Controller = await ethers.getContractFactory("Controller");
        const controller = await Controller.deploy(owner.address);

        return {
            controller,
            owner,
            controller1,
            controller2,
            worker1,
            worker2,
            otherAccount,
        };
    }

    async function controllerWithConfiguredControllersFixture() {
        const { controller, owner, controller1, controller2, worker1, worker2, otherAccount } =
            await loadFixture(deployControllerFixture);

        // Configure controller1 with worker1
        await controller.connect(owner).configureController(controller1.address, worker1.address);

        // Configure controller2 with worker2
        await controller.connect(owner).configureController(controller2.address, worker2.address);

        return {
            controller,
            owner,
            controller1,
            controller2,
            worker1,
            worker2,
            otherAccount,
        };
    }

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            const { controller, owner } = await loadFixture(deployControllerFixture);
            expect(await controller.owner()).to.equal(owner.address);
        });
    });

    describe("configureController", function () {
        it("Should allow owner to configure a controller", async function () {
            const { controller, owner, controller1, worker1 } = await loadFixture(deployControllerFixture);

            await expect(controller.connect(owner).configureController(controller1.address, worker1.address))
                .to.emit(controller, "ControllerConfigured")
                .withArgs(controller1.address, worker1.address);

            expect(await controller.getWorker(controller1.address)).to.equal(worker1.address);
        });

        it("Should allow reconfiguring an existing controller with a different worker", async function () {
            const { controller, owner, controller1, worker1, worker2 } =
                await loadFixture(controllerWithConfiguredControllersFixture);

            // Reconfigure controller1 with worker2
            await expect(controller.connect(owner).configureController(controller1.address, worker2.address))
                .to.emit(controller, "ControllerConfigured")
                .withArgs(controller1.address, worker2.address);

            expect(await controller.getWorker(controller1.address)).to.equal(worker2.address);
        });

        it("Should allow multiple controllers to manage the same worker", async function () {
            const { controller, owner, controller1, controller2, worker1 } = await loadFixture(deployControllerFixture);

            // Both controllers manage the same worker
            await controller.connect(owner).configureController(controller1.address, worker1.address);
            await controller.connect(owner).configureController(controller2.address, worker1.address);

            expect(await controller.getWorker(controller1.address)).to.equal(worker1.address);
            expect(await controller.getWorker(controller2.address)).to.equal(worker1.address);
        });

        it("Should revert if controller address is zero", async function () {
            const { controller, owner, worker1 } = await loadFixture(deployControllerFixture);

            await expect(
                controller.connect(owner).configureController(ethers.ZeroAddress, worker1.address),
            ).to.be.revertedWithCustomError(controller, "ControllerZeroAddress");
        });

        it("Should revert if worker address is zero", async function () {
            const { controller, owner, controller1 } = await loadFixture(deployControllerFixture);

            await expect(
                controller.connect(owner).configureController(controller1.address, ethers.ZeroAddress),
            ).to.be.revertedWithCustomError(controller, "WorkerZeroAddress");
        });

        it("Should revert if called by non-owner", async function () {
            const { controller, controller1, worker1, otherAccount } = await loadFixture(deployControllerFixture);

            await expect(
                controller.connect(otherAccount).configureController(controller1.address, worker1.address),
            ).to.be.revertedWithCustomError(controller, "OwnableUnauthorizedAccount");
        });
    });

    describe("removeController", function () {
        it("Should allow owner to remove a controller", async function () {
            const { controller, owner, controller1 } = await loadFixture(controllerWithConfiguredControllersFixture);

            await expect(controller.connect(owner).removeController(controller1.address))
                .to.emit(controller, "ControllerRemoved")
                .withArgs(controller1.address);

            expect(await controller.getWorker(controller1.address)).to.equal(ethers.ZeroAddress);
        });

        it("Should revert if controller address is zero", async function () {
            const { controller, owner } = await loadFixture(deployControllerFixture);

            await expect(controller.connect(owner).removeController(ethers.ZeroAddress)).to.be.revertedWithCustomError(
                controller,
                "ControllerZeroAddress",
            );
        });

        it("Should revert if controller doesn't exist", async function () {
            const { controller, owner, otherAccount } = await loadFixture(deployControllerFixture);

            await expect(
                controller.connect(owner).removeController(otherAccount.address),
            ).to.be.revertedWithCustomError(controller, "ControllerNotFound");
        });

        it("Should revert if called by non-owner", async function () {
            const { controller, controller1, otherAccount } = await loadFixture(
                controllerWithConfiguredControllersFixture,
            );

            await expect(
                controller.connect(otherAccount).removeController(controller1.address),
            ).to.be.revertedWithCustomError(controller, "OwnableUnauthorizedAccount");
        });
    });

    describe("getWorker", function () {
        it("Should return the correct worker for a controller", async function () {
            const { controller, controller1, worker1 } = await loadFixture(controllerWithConfiguredControllersFixture);

            expect(await controller.getWorker(controller1.address)).to.equal(worker1.address);
        });

        it("Should return zero address for unconfigured controller", async function () {
            const { controller, otherAccount } = await loadFixture(deployControllerFixture);

            expect(await controller.getWorker(otherAccount.address)).to.equal(ethers.ZeroAddress);
        });
    });

    describe("onlyController modifier", function () {
        // Note: We can't directly test the modifier without a function that uses it.
        // This will be tested more thoroughly in MintController tests.
        it("Should allow configured controllers to access protected functions", async function () {
            const { controller, controller1 } = await loadFixture(controllerWithConfiguredControllersFixture);

            // The modifier checks if controllers[msg.sender] != address(0)
            const worker = await controller.getWorker(controller1.address);
            expect(worker).to.not.equal(ethers.ZeroAddress);
        });
    });
});
