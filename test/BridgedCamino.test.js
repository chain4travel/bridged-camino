const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("BridgedCaminoV1", function () {
    async function deployBridgedCaminoV1Fixture() {
        // Contracts are deployed using the first signer/account by default
        const [
            deployer,
            defaultAdmin,
            pauserAdmin,
            pauser,
            upgraderAdmin,
            upgrader,
            minterAdmin,
            minter,
            blacklisterAdmin,
            blacklister,
            otherAccount1,
            otherAccount2,
        ] = await ethers.getSigners();

        // Deploy the BridgedCaminoV1 contract implementation
        const BridgedCaminoV1 = await ethers.getContractFactory("BridgedCaminoV1");

        const bridgedCaminoV1Impl = await BridgedCaminoV1.deploy();

        const name = "BridgedCamino";
        const symbol = "WCAM.c";

        // Encode the initialization data
        const initializeData = bridgedCaminoV1Impl.interface.encodeFunctionData("initialize", [
            name,
            symbol,
            defaultAdmin.address,
            pauser.address,
            upgrader.address,
        ]);

        // Get the ERC1967ProxyFactory
        const ERC1967ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");

        // Deploy the proxy contract
        const bridgedCaminoV1Proxy = await ERC1967ProxyFactory.deploy(
            await bridgedCaminoV1Impl.getAddress(),
            initializeData,
        );

        // Get the proxy with the BridgedCaminoV1 interface
        const proxiedBridgedCaminoV1 = await BridgedCaminoV1.attach(await bridgedCaminoV1Proxy.getAddress());

        return {
            proxiedBridgedCaminoV1,
            deployer,
            defaultAdmin,
            pauserAdmin,
            pauser,
            upgraderAdmin,
            upgrader,
            minterAdmin,
            minter,
            blacklisterAdmin,
            blacklister,
            otherAccount1,
            otherAccount2,
            name,
            symbol,
        };
    }

    async function bridgedCaminoV1WithMintersFixture() {
        const {
            proxiedBridgedCaminoV1,
            deployer,
            defaultAdmin,
            pauserAdmin,
            pauser,
            upgraderAdmin,
            upgrader,
            minterAdmin,
            minter,
            blacklisterAdmin,
            blacklister,
            otherAccount1,
            otherAccount2,
        } = await loadFixture(deployBridgedCaminoV1Fixture);

        const minterAllowedAmount = ethers.parseEther("1000");
        const MINTER_ROLE_ADMIN = await proxiedBridgedCaminoV1.MINTER_ROLE_ADMIN();

        await proxiedBridgedCaminoV1.connect(defaultAdmin).grantRole(MINTER_ROLE_ADMIN, minterAdmin.address);
        await proxiedBridgedCaminoV1.connect(minterAdmin).configureMinter(minter.address, minterAllowedAmount);

        return {
            proxiedBridgedCaminoV1,
            deployer,
            defaultAdmin,
            pauserAdmin,
            pauser,
            upgraderAdmin,
            upgrader,
            minterAdmin,
            minter,
            blacklisterAdmin,
            blacklister,
            minterAllowedAmount,
            otherAccount1,
            otherAccount2,
        };
    }

    async function bridgedCaminoV1WithBlacklistFixture() {
        const {
            proxiedBridgedCaminoV1,
            deployer,
            defaultAdmin,
            pauserAdmin,
            pauser,
            upgraderAdmin,
            upgrader,
            minterAdmin,
            minter,
            blacklisterAdmin,
            blacklister,
            minterAllowedAmount,
            otherAccount1,
            otherAccount2,
        } = await loadFixture(bridgedCaminoV1WithMintersFixture);

        await proxiedBridgedCaminoV1
            .connect(defaultAdmin)
            .grantRole(await proxiedBridgedCaminoV1.BLACKLISTER_ROLE_ADMIN(), blacklisterAdmin.address);
        await proxiedBridgedCaminoV1
            .connect(blacklisterAdmin)
            .grantRole(await proxiedBridgedCaminoV1.BLACKLISTER_ROLE(), blacklister.address);

        return {
            proxiedBridgedCaminoV1,
            deployer,
            defaultAdmin,
            pauserAdmin,
            pauser,
            upgraderAdmin,
            upgrader,
            minterAdmin,
            minter,
            blacklisterAdmin,
            blacklister,
            minterAllowedAmount,
            otherAccount1,
            otherAccount2,
        };
    }

    // Helper to get the current chainId.
    async function getChainId() {
        return (await ethers.provider.getNetwork()).chainId;
    }

    // Returns the permit digest as defined in EIP-2612.
    async function signPermit(token, signer, owner, spender, value, nonce, deadline) {
        const name = await token.name();
        const version = "1";
        const chainId = await getChainId();
        const verifyingContract = await token.getAddress();

        const domain = {
            name,
            version,
            chainId,
            verifyingContract,
        };

        // The permit struct following EIP-2612.
        const types = {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        };

        const message = {
            owner: owner.address,
            spender: spender.address,
            value: value.toString(),
            nonce: nonce.toString(),
            deadline: deadline.toString(),
        };

        const signature = await signer.signTypedData(domain, types, message);

        return signature;
    }

    describe("Deployment", function () {
        it("Should set the right name and symbol", async function () {
            const { proxiedBridgedCaminoV1, name, symbol } = await loadFixture(deployBridgedCaminoV1Fixture);
            expect(await proxiedBridgedCaminoV1.name()).to.equal(name);
            expect(await proxiedBridgedCaminoV1.symbol()).to.equal(symbol);
        });

        it("Should set the right decimals", async function () {
            const { proxiedBridgedCaminoV1 } = await loadFixture(deployBridgedCaminoV1Fixture);
            expect(await proxiedBridgedCaminoV1.decimals()).to.equal(18);
        });

        it("Should set the right total supply", async function () {
            const { proxiedBridgedCaminoV1 } = await loadFixture(deployBridgedCaminoV1Fixture);
            expect(await proxiedBridgedCaminoV1.totalSupply()).to.equal(0);

            // TODO: check total supply after mint
        });

        it("Should set the right roles", async function () {
            const { proxiedBridgedCaminoV1, deployer, defaultAdmin, pauserAdmin, pauser, upgraderAdmin, upgrader } =
                await loadFixture(deployBridgedCaminoV1Fixture);

            // Get roles
            const MINTER_ROLE = await proxiedBridgedCaminoV1.MINTER_ROLE();
            const MINTER_ROLE_ADMIN = await proxiedBridgedCaminoV1.MINTER_ROLE_ADMIN();
            const PAUSER_ROLE = await proxiedBridgedCaminoV1.PAUSER_ROLE();
            const PAUSER_ROLE_ADMIN = await proxiedBridgedCaminoV1.PAUSER_ROLE_ADMIN();
            const UPGRADER_ROLE = await proxiedBridgedCaminoV1.UPGRADER_ROLE();
            const UPGRADER_ROLE_ADMIN = await proxiedBridgedCaminoV1.UPGRADER_ROLE_ADMIN();

            expect(await proxiedBridgedCaminoV1.getRoleAdmin(MINTER_ROLE)).to.equal(MINTER_ROLE_ADMIN);

            expect(await proxiedBridgedCaminoV1.hasRole(PAUSER_ROLE, pauser.address)).to.equal(true);
            expect(await proxiedBridgedCaminoV1.getRoleAdmin(PAUSER_ROLE)).to.equal(PAUSER_ROLE_ADMIN);

            expect(await proxiedBridgedCaminoV1.hasRole(UPGRADER_ROLE, upgrader.address)).to.equal(true);
            expect(await proxiedBridgedCaminoV1.getRoleAdmin(UPGRADER_ROLE)).to.equal(UPGRADER_ROLE_ADMIN);
        });

        it("Should revert calling initialize twice", async function () {
            const { proxiedBridgedCaminoV1, defaultAdmin, pauser, upgrader, name, symbol } =
                await loadFixture(deployBridgedCaminoV1Fixture);

            await expect(
                proxiedBridgedCaminoV1.initialize(name, symbol, defaultAdmin.address, pauser.address, upgrader.address),
            ).to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "InvalidInitialization");
        });

        it("Check eip712Domain", async function () {
            const { proxiedBridgedCaminoV1, name, symbol } = await loadFixture(deployBridgedCaminoV1Fixture);
            const eip712Domain = await proxiedBridgedCaminoV1.eip712Domain();

            expect(eip712Domain.fields).to.equal("0x0f");
            expect(eip712Domain.name).to.equal(name);
            expect(eip712Domain.version).to.equal("1");
            expect(eip712Domain.chainId).to.equal(await getChainId());
            expect(eip712Domain.verifyingContract).to.equal(await proxiedBridgedCaminoV1.getAddress());
            expect(eip712Domain.salt).to.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
            expect(eip712Domain.extensions).to.deep.equal([]);
        });
    });

    describe("Upgrade", function () {
        it("Should upgrade", async function () {
            const { proxiedBridgedCaminoV1, deployer, defaultAdmin, upgrader, upgraderAdmin } =
                await loadFixture(deployBridgedCaminoV1Fixture);

            // Create new implementation
            const BridgedCaminoUpgradeTest = await ethers.getContractFactory("BridgedCaminoUpgradeTest");

            // Deploy new implementation
            const bridgedCaminoUpgradeTest = await BridgedCaminoUpgradeTest.deploy();

            // Implementation address
            const newImplementationAddress = await bridgedCaminoUpgradeTest.getAddress();

            // Upgrade
            await expect(proxiedBridgedCaminoV1.connect(upgrader).upgradeToAndCall(newImplementationAddress, "0x"))
                .to.emit(proxiedBridgedCaminoV1, "Upgraded")
                .withArgs(newImplementationAddress);

            // Attach the new ABI to the proxy
            const upgradedProxiedBridgedCamino = BridgedCaminoUpgradeTest.attach(
                await proxiedBridgedCaminoV1.getAddress(),
            );

            // Check new implementation
            expect(await upgradedProxiedBridgedCamino.getTestResult()).to.equal("Success");
        });

        it("Should revert calling upgradeToAndCall from non-upgrader", async function () {
            const { proxiedBridgedCaminoV1, deployer, defaultAdmin, upgrader, upgraderAdmin } =
                await loadFixture(deployBridgedCaminoV1Fixture);

            // Upgrader role
            const UPGRADER_ROLE = await proxiedBridgedCaminoV1.UPGRADER_ROLE();

            // Call upgradeToAndCall from non-upgrader
            await expect(
                proxiedBridgedCaminoV1
                    .connect(defaultAdmin)
                    .upgradeToAndCall(await proxiedBridgedCaminoV1.getAddress(), "0x"),
            )
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(defaultAdmin.address, UPGRADER_ROLE);
        });
    });

    describe("Mint", function () {
        it("Should mint tokens", async function () {
            const {
                proxiedBridgedCaminoV1,
                deployer,
                defaultAdmin,
                pauserAdmin,
                pauser,
                upgraderAdmin,
                upgrader,
                minterAdmin,
                minter,
            } = await loadFixture(deployBridgedCaminoV1Fixture);

            // Get roles
            const MINTER_ROLE = await proxiedBridgedCaminoV1.MINTER_ROLE();
            const MINTER_ROLE_ADMIN = await proxiedBridgedCaminoV1.MINTER_ROLE_ADMIN();

            // Grant the minter admin role
            expect(await proxiedBridgedCaminoV1.connect(defaultAdmin).grantRole(MINTER_ROLE_ADMIN, minterAdmin.address))
                .to.emit(proxiedBridgedCaminoV1, "RoleGranted")
                .withArgs(MINTER_ROLE_ADMIN, minterAdmin.address, defaultAdmin.address);

            // Configure minter role using the minter admin
            const minterAllowedAmount = ethers.parseEther("1000");
            const newMinter = true;

            const configureMinterTx = await proxiedBridgedCaminoV1
                .connect(minterAdmin)
                .configureMinter(minter.address, minterAllowedAmount);

            // Check MinterConfigured event
            await expect(configureMinterTx)
                .to.emit(proxiedBridgedCaminoV1, "MinterConfigured")
                .withArgs(minter.address, minterAllowedAmount, newMinter);

            // Check RoleGranted event
            await expect(configureMinterTx)
                .to.emit(proxiedBridgedCaminoV1, "RoleGranted")
                .withArgs(MINTER_ROLE, minter.address, minterAdmin.address);

            // Check minter role
            expect(await proxiedBridgedCaminoV1.hasRole(MINTER_ROLE, minter.address)).to.equal(true);

            // Check minter allowance
            expect(await proxiedBridgedCaminoV1.minterAllowance(minter.address)).to.equal(minterAllowedAmount);

            // Check mint
            const mintTx = await proxiedBridgedCaminoV1.connect(minter).mint(minter.address, minterAllowedAmount);

            // Check Mint event
            await expect(mintTx)
                .to.emit(proxiedBridgedCaminoV1, "Mint")
                .withArgs(minter.address, minter.address, minterAllowedAmount);

            // Check Transfer event
            await expect(mintTx)
                .to.emit(proxiedBridgedCaminoV1, "Transfer")
                .withArgs(ethers.ZeroAddress, minter.address, minterAllowedAmount);

            // Check token balance change
            await expect(mintTx).to.changeTokenBalance(proxiedBridgedCaminoV1, minter.address, minterAllowedAmount);

            // Check minter allowance
            expect(await proxiedBridgedCaminoV1.minterAllowance(minter.address)).to.equal(0n);
        });

        it("Should revert if not minter", async function () {
            const {
                proxiedBridgedCaminoV1,
                deployer,
                defaultAdmin,
                pauserAdmin,
                pauser,
                upgraderAdmin,
                upgrader,
                minterAdmin,
                minter,
            } = await loadFixture(deployBridgedCaminoV1Fixture);

            // Get minter role
            const MINTER_ROLE = await proxiedBridgedCaminoV1.MINTER_ROLE();

            // Try to mint
            await expect(
                proxiedBridgedCaminoV1.connect(deployer).mint(deployer.address, 1),
            ).to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount");

            await expect(proxiedBridgedCaminoV1.connect(pauser).mint(pauser.address, 1))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(pauser.address, MINTER_ROLE);

            await expect(proxiedBridgedCaminoV1.connect(upgrader).mint(upgrader.address, 1))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(upgrader.address, MINTER_ROLE);

            await expect(proxiedBridgedCaminoV1.connect(defaultAdmin).mint(defaultAdmin.address, 1))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(defaultAdmin.address, MINTER_ROLE);

            // Grant minter admin
            const MINTER_ROLE_ADMIN = await proxiedBridgedCaminoV1.MINTER_ROLE_ADMIN();
            await proxiedBridgedCaminoV1.connect(defaultAdmin).grantRole(MINTER_ROLE_ADMIN, minterAdmin.address);

            // Try to mint
            await expect(proxiedBridgedCaminoV1.connect(minterAdmin).mint(minterAdmin.address, 1))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(minterAdmin.address, MINTER_ROLE);
        });

        it("Should revert configure minter if not minter admin", async function () {
            const { proxiedBridgedCaminoV1, deployer, defaultAdmin, pauser, upgrader, minter } =
                await loadFixture(deployBridgedCaminoV1Fixture);

            const MINTER_ROLE_ADMIN = await proxiedBridgedCaminoV1.MINTER_ROLE_ADMIN();

            // Try to configure minter
            await expect(
                proxiedBridgedCaminoV1.connect(deployer).configureMinter(minter.address, 1),
            ).to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount");

            await expect(proxiedBridgedCaminoV1.connect(pauser).configureMinter(minter.address, 1))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(pauser.address, MINTER_ROLE_ADMIN);

            await expect(proxiedBridgedCaminoV1.connect(upgrader).configureMinter(minter.address, 1))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(upgrader.address, MINTER_ROLE_ADMIN);

            await expect(proxiedBridgedCaminoV1.connect(defaultAdmin).configureMinter(minter.address, 1))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(defaultAdmin.address, MINTER_ROLE_ADMIN);
        });

        it("Should revert if amount exceeds minter allowance", async function () {
            const { proxiedBridgedCaminoV1, minterAdmin, minter, minterAllowedAmount } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            const invalidAmount = minterAllowedAmount + 1n;

            // Try to mint more than minter allowance
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(minter.address, invalidAmount))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AmountExceedsMintAllowance")
                .withArgs(minter.address, invalidAmount);
        });

        it("Should revert when paused", async function () {
            const { proxiedBridgedCaminoV1, pauser, minterAdmin, minter, minterAllowedAmount } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            // Pause the contract
            expect(await proxiedBridgedCaminoV1.connect(pauser).pause()).to.emit(proxiedBridgedCaminoV1, "Paused");

            // Try to mint
            await expect(
                proxiedBridgedCaminoV1.connect(minter).mint(minter.address, minterAllowedAmount),
            ).to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "EnforcedPause");

            // Try to configure minter
            await expect(
                proxiedBridgedCaminoV1.connect(minterAdmin).configureMinter(minter.address, minterAllowedAmount),
            ).to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "EnforcedPause");
        });

        it("Should remove minter correctly", async function () {
            const { proxiedBridgedCaminoV1, minterAdmin, minter, minterAllowedAmount } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            // Minter role
            const MINTER_ROLE = await proxiedBridgedCaminoV1.MINTER_ROLE();

            // Check minter role & allowance
            expect(await proxiedBridgedCaminoV1.hasRole(MINTER_ROLE, minter.address)).to.be.true;
            expect(await proxiedBridgedCaminoV1.minterAllowance(minter.address)).to.equal(minterAllowedAmount);

            // Mint with minter
            const amount = minterAllowedAmount / 2n;
            expect(await proxiedBridgedCaminoV1.connect(minter).mint(minter.address, amount)).to.not.reverted;

            // Remove minter
            const removeMinterTx = await proxiedBridgedCaminoV1.connect(minterAdmin).removeMinter(minter.address);
            await expect(removeMinterTx).to.emit(proxiedBridgedCaminoV1, "MinterRemoved").withArgs(minter.address);
            await expect(removeMinterTx)
                .to.emit(proxiedBridgedCaminoV1, "RoleRevoked")
                .withArgs(MINTER_ROLE, minter.address, minterAdmin.address);

            // Check minter role & allowance
            expect(await proxiedBridgedCaminoV1.hasRole(MINTER_ROLE, minter.address)).to.be.false;
            expect(await proxiedBridgedCaminoV1.minterAllowance(minter.address)).to.equal(0n);

            // Try to mint with minter
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(minter.address, amount))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(minter.address, MINTER_ROLE);
        });

        it("Should revert if remove minter if not minter admin", async function () {
            const { proxiedBridgedCaminoV1, deployer, minter } = await loadFixture(bridgedCaminoV1WithMintersFixture);

            // Minter admin role
            const MINTER_ROLE_ADMIN = await proxiedBridgedCaminoV1.MINTER_ROLE_ADMIN();

            // Try to remove minter
            await expect(proxiedBridgedCaminoV1.connect(deployer).removeMinter(minter.address))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(deployer.address, MINTER_ROLE_ADMIN);

            await expect(proxiedBridgedCaminoV1.connect(minter).removeMinter(minter.address))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(minter.address, MINTER_ROLE_ADMIN);
        });
    });

    describe("Burn", function () {
        it("Should burn correctly", async function () {
            const { proxiedBridgedCaminoV1, minter, minterAllowedAmount } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            // Minter role
            const MINTER_ROLE = await proxiedBridgedCaminoV1.MINTER_ROLE();

            // Check minter role & allowance
            expect(await proxiedBridgedCaminoV1.hasRole(MINTER_ROLE, minter.address)).to.be.true;
            expect(await proxiedBridgedCaminoV1.minterAllowance(minter.address)).to.equal(minterAllowedAmount);

            // Mint with minter
            const amount = minterAllowedAmount / 2n;
            expect(await proxiedBridgedCaminoV1.connect(minter).mint(minter.address, amount)).to.not.reverted;

            // Try to burn
            const burnTx = await proxiedBridgedCaminoV1.connect(minter).burn(1n);
            await expect(burnTx)
                .to.emit(proxiedBridgedCaminoV1, "Transfer")
                .withArgs(minter.address, ethers.ZeroAddress, 1n);
            await expect(burnTx).to.emit(proxiedBridgedCaminoV1, "Burn").withArgs(minter.address, minter.address, 1n);
        });

        it("Should revert if burn more than balance", async function () {
            const { proxiedBridgedCaminoV1, minter, minterAllowedAmount } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            // Try to burn
            await expect(proxiedBridgedCaminoV1.connect(minter).burn(1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "ERC20InsufficientBalance")
                .withArgs(minter.address, 0n, 1n);

            // Mint some
            const mintAmount = minterAllowedAmount / 2n;
            expect(await proxiedBridgedCaminoV1.connect(minter).mint(minter.address, mintAmount)).to.not.reverted;

            // Try to burn
            const burnAmount = mintAmount + 1n;
            await expect(proxiedBridgedCaminoV1.connect(minter).burn(burnAmount))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "ERC20InsufficientBalance")
                .withArgs(minter.address, mintAmount, burnAmount);
        });

        it("Should revert burn if not minter", async function () {
            const { proxiedBridgedCaminoV1, deployer } = await loadFixture(bridgedCaminoV1WithMintersFixture);

            // Try to burn
            await expect(proxiedBridgedCaminoV1.connect(deployer).burn(1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(deployer.address, await proxiedBridgedCaminoV1.MINTER_ROLE());
        });

        it("Should revert burn when paused", async function () {
            const { proxiedBridgedCaminoV1, pauser, minter, minterAllowedAmount } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            // Mint some tokens
            const mintAmount = minterAllowedAmount / 2n;
            expect(await proxiedBridgedCaminoV1.connect(minter).mint(minter.address, mintAmount)).to.not.reverted;

            // Pause the contract
            expect(await proxiedBridgedCaminoV1.connect(pauser).pause()).to.not.reverted;

            // Try to burn
            await expect(proxiedBridgedCaminoV1.connect(minter).burn(1n)).to.be.revertedWithCustomError(
                proxiedBridgedCaminoV1,
                "EnforcedPause",
            );
        });

        it("Should burnFrom correctly", async function () {
            const { proxiedBridgedCaminoV1, minter, minterAllowedAmount, otherAccount1 } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            // Minter role
            const MINTER_ROLE = await proxiedBridgedCaminoV1.MINTER_ROLE();

            // Check minter role & allowance
            expect(await proxiedBridgedCaminoV1.hasRole(MINTER_ROLE, minter.address)).to.be.true;
            expect(await proxiedBridgedCaminoV1.minterAllowance(minter.address)).to.equal(minterAllowedAmount);

            // Mint with minter to otherAccount1
            const amount = minterAllowedAmount / 2n;
            expect(await proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, amount)).to.not.reverted;

            // Try to burnFrom, should fail as minter doesn't have approval yet
            await expect(proxiedBridgedCaminoV1.connect(minter).burnFrom(minter.address, amount))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "ERC20InsufficientAllowance")
                .withArgs(minter.address, 0n, amount); // (spender, currentAllowance, amount)

            // Approve minter with otherAccount1
            const approveTx = await proxiedBridgedCaminoV1.connect(otherAccount1).approve(minter.address, amount);
            await expect(approveTx)
                .to.emit(proxiedBridgedCaminoV1, "Approval")
                .withArgs(otherAccount1.address, minter.address, amount);

            // Try to burnFrom otherAccount1 with minter
            const burnFromTx = await proxiedBridgedCaminoV1.connect(minter).burnFrom(otherAccount1.address, amount);
            await expect(burnFromTx)
                .to.emit(proxiedBridgedCaminoV1, "Transfer")
                .withArgs(otherAccount1.address, ethers.ZeroAddress, amount);
            await expect(burnFromTx)
                .to.emit(proxiedBridgedCaminoV1, "Burn")
                .withArgs(minter.address, otherAccount1.address, amount);
        });

        it("Should revert burnFrom if not minter", async function () {
            const { proxiedBridgedCaminoV1, minter, otherAccount1 } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            // Give some tokens to the otherAccount1
            expect(await proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 1n)).to.not.reverted;

            // Try to burnFrom
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).burnFrom(otherAccount1.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(otherAccount1.address, await proxiedBridgedCaminoV1.MINTER_ROLE());
        });

        it("Should revert burnFrom when paused", async function () {
            const { proxiedBridgedCaminoV1, pauser, minter, minterAllowedAmount, otherAccount1 } = await loadFixture(
                bridgedCaminoV1WithMintersFixture,
            );

            // Mint some tokens for otherAccount1
            const mintAmount = minterAllowedAmount / 2n;
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, mintAmount)).to.not
                .reverted;

            // Approve minter with otherAccount1
            const approveTx = await proxiedBridgedCaminoV1.connect(otherAccount1).approve(minter.address, mintAmount);
            await expect(approveTx)
                .to.emit(proxiedBridgedCaminoV1, "Approval")
                .withArgs(otherAccount1.address, minter.address, mintAmount);

            // Pause the contract
            await expect(proxiedBridgedCaminoV1.connect(pauser).pause()).to.not.reverted;

            // Try to burnFrom, should fail
            await expect(
                proxiedBridgedCaminoV1.connect(minter).burnFrom(otherAccount1.address, mintAmount),
            ).to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "EnforcedPause");
        });
    });

    describe("Pause", function () {
        it("Should pause and unpause the contract", async function () {
            const { proxiedBridgedCaminoV1, pauser, minter } = await loadFixture(bridgedCaminoV1WithMintersFixture);

            // Pause the contract
            expect(await proxiedBridgedCaminoV1.connect(pauser).pause())
                .to.emit(proxiedBridgedCaminoV1, "Paused")
                .withArgs(pauser.address);

            // Try to mint, should fail
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(minter.address, 1n)).to.be.revertedWithCustomError(
                proxiedBridgedCaminoV1,
                "EnforcedPause",
            );

            // Unpause the contract
            await expect(proxiedBridgedCaminoV1.connect(pauser).unpause())
                .to.emit(proxiedBridgedCaminoV1, "Unpaused")
                .withArgs(pauser.address);

            // Try to mint, should succeed
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(minter.address, 1n)).to.not.reverted;
        });

        it("Should revert pause/unpause if not pauser", async function () {
            const { proxiedBridgedCaminoV1, minter } = await loadFixture(bridgedCaminoV1WithMintersFixture);

            const PAUSER_ROLE = await proxiedBridgedCaminoV1.PAUSER_ROLE();

            await expect(proxiedBridgedCaminoV1.connect(minter).pause())
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(minter.address, PAUSER_ROLE);

            await expect(proxiedBridgedCaminoV1.connect(minter).unpause())
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(minter.address, PAUSER_ROLE);
        });
    });

    describe("Blacklist", function () {
        it("Should blacklist and unblacklist an account", async function () {
            const { proxiedBridgedCaminoV1, defaultAdmin, blacklister, blacklisterAdmin, minter, otherAccount1 } =
                await loadFixture(bridgedCaminoV1WithMintersFixture);

            // Grant blacklister role
            const BLACKLISTER_ROLE = await proxiedBridgedCaminoV1.BLACKLISTER_ROLE();
            const BLACKLISTER_ROLE_ADMIN = await proxiedBridgedCaminoV1.BLACKLISTER_ROLE_ADMIN();

            // Grant blacklister admin role
            await expect(
                await proxiedBridgedCaminoV1
                    .connect(defaultAdmin)
                    .grantRole(BLACKLISTER_ROLE_ADMIN, blacklisterAdmin.address),
            )
                .to.emit(proxiedBridgedCaminoV1, "RoleGranted")
                .withArgs(BLACKLISTER_ROLE_ADMIN, blacklisterAdmin.address, defaultAdmin.address);

            // Grant blacklister role
            await expect(
                await proxiedBridgedCaminoV1.connect(blacklisterAdmin).grantRole(BLACKLISTER_ROLE, blacklister.address),
            )
                .to.emit(proxiedBridgedCaminoV1, "RoleGranted")
                .withArgs(BLACKLISTER_ROLE, blacklister.address, blacklisterAdmin.address);

            // Blacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(otherAccount1.address);

            // Try to mint, should fail
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount1.address);

            // unBlacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).unBlacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "UnBlacklisted")
                .withArgs(otherAccount1.address);

            // Try to mint, should succeed
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 1n)).to.not.reverted;
        });

        it("Should revert mint with blacklisted to and msg.sender", async function () {
            const { proxiedBridgedCaminoV1, minter, blacklister, otherAccount1 } = await loadFixture(
                bridgedCaminoV1WithBlacklistFixture,
            );

            // Blacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(otherAccount1.address);

            // Try to mint, should fail
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount1.address);

            // Unblacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).unBlacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "UnBlacklisted")
                .withArgs(otherAccount1.address);

            // Try to mint, should succeed
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 1n)).to.not.reverted;

            // Blacklist minter
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(minter.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(minter.address);

            // Try to mint, should fail
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(minter.address);

            // Unblacklist minter
            await expect(proxiedBridgedCaminoV1.connect(blacklister).unBlacklist(minter.address))
                .to.emit(proxiedBridgedCaminoV1, "UnBlacklisted")
                .withArgs(minter.address);

            // Try to mint, should succeed
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 1n)).to.not.reverted;
        });

        it("Should revert burn with blacklisted msg.sender", async function () {
            const { proxiedBridgedCaminoV1, minter, blacklister } = await loadFixture(
                bridgedCaminoV1WithBlacklistFixture,
            );

            // Mint some tokens for the minter
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(minter.address, 1000n)).to.not.reverted;

            // Blacklist minter
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(minter.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(minter.address);

            // Try to burn, should fail
            await expect(proxiedBridgedCaminoV1.connect(minter).burn(1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(minter.address);

            // Unblacklist minter
            await expect(proxiedBridgedCaminoV1.connect(blacklister).unBlacklist(minter.address))
                .to.emit(proxiedBridgedCaminoV1, "UnBlacklisted")
                .withArgs(minter.address);

            // Try to burn, should succeed
            await expect(proxiedBridgedCaminoV1.connect(minter).burn(1n)).to.be.not.reverted;
        });

        it("Should revert burnFrom with blacklisted from and msg.sender", async function () {
            const { proxiedBridgedCaminoV1, minter, blacklister, otherAccount1 } = await loadFixture(
                bridgedCaminoV1WithBlacklistFixture,
            );

            // Mint some tokens for the otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 1000n)).to.not.reverted;

            // Approve minter to spend otherAccount1's tokens
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).approve(minter.address, 1000n)).to.not.reverted;

            // Blacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(otherAccount1.address);

            // Try to burnFrom, should fail
            await expect(proxiedBridgedCaminoV1.connect(minter).burnFrom(otherAccount1.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount1.address);

            // Unblacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).unBlacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "UnBlacklisted")
                .withArgs(otherAccount1.address);

            // Try to burnFrom, should succeed
            await expect(proxiedBridgedCaminoV1.connect(minter).burnFrom(otherAccount1.address, 1n)).to.not.reverted;

            // Blacklist minter
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(minter.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(minter.address);

            // Try to burnFrom, should fail
            await expect(proxiedBridgedCaminoV1.connect(minter).burnFrom(otherAccount1.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(minter.address);
        });

        it("Should revert blacklist/unblacklist with non-blacklister", async function () {
            const { proxiedBridgedCaminoV1, minter, otherAccount1 } = await loadFixture(
                bridgedCaminoV1WithBlacklistFixture,
            );

            // Blacklister role
            const BLACKLISTER_ROLE = await proxiedBridgedCaminoV1.BLACKLISTER_ROLE();

            // Try to blacklist, should fail
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).blacklist(otherAccount1.address))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(otherAccount1.address, BLACKLISTER_ROLE);

            // Try to unblacklist, should fail
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).unBlacklist(otherAccount1.address))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccessControlUnauthorizedAccount")
                .withArgs(otherAccount1.address, BLACKLISTER_ROLE);
        });

        it("Should get blacklisted accounts correctly", async function () {
            const { proxiedBridgedCaminoV1, minter, blacklister, otherAccount1 } = await loadFixture(
                bridgedCaminoV1WithBlacklistFixture,
            );

            // Check otherAccount1 is not blacklisted
            expect(await proxiedBridgedCaminoV1.isBlacklisted(otherAccount1.address)).to.be.false;

            // Blacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(otherAccount1.address);

            // Check otherAccount1 is blacklisted
            expect(await proxiedBridgedCaminoV1.isBlacklisted(otherAccount1.address)).to.be.true;

            // Unblacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).unBlacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "UnBlacklisted")
                .withArgs(otherAccount1.address);

            // Check otherAccount1 is not blacklisted
            expect(await proxiedBridgedCaminoV1.isBlacklisted(otherAccount1.address)).to.be.false;
        });

        it("Should revert transfer with blacklisted from/to", async function () {
            const { proxiedBridgedCaminoV1, minter, blacklister, otherAccount1, otherAccount2 } = await loadFixture(
                bridgedCaminoV1WithBlacklistFixture,
            );

            // Mint some tokens for otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 2000n)).to.not.reverted;

            // Try to transfer from otherAccount1 to otherAccount2, should succeed
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).transfer(otherAccount2.address, 1000n))
                .to.emit(proxiedBridgedCaminoV1, "Transfer")
                .withArgs(otherAccount1.address, otherAccount2.address, 1000n);

            // Blacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(otherAccount1.address);

            // Try to transfer from otherAccount1 to otherAccount2, should fail
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).transfer(otherAccount2.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount1.address);

            // Try to transfer from otherAccount2 to otherAccount1, should fail too
            await expect(proxiedBridgedCaminoV1.connect(otherAccount2).transfer(otherAccount1.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount1.address);

            // Unblacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).unBlacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "UnBlacklisted")
                .withArgs(otherAccount1.address);

            // Try to transfer from otherAccount1 to otherAccount2, should succeed
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).transfer(otherAccount2.address, 1n))
                .to.emit(proxiedBridgedCaminoV1, "Transfer")
                .withArgs(otherAccount1.address, otherAccount2.address, 1n);

            // Try to transfer from otherAccount2 to otherAccount1, should succeed
            await expect(proxiedBridgedCaminoV1.connect(otherAccount2).transfer(otherAccount1.address, 1n))
                .to.emit(proxiedBridgedCaminoV1, "Transfer")
                .withArgs(otherAccount2.address, otherAccount1.address, 1n);

            // Blacklist otherAccount2
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(otherAccount2.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(otherAccount2.address);

            // Try to transfer from otherAccount1 to otherAccount2, should fail
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).transfer(otherAccount2.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount2.address);

            // Try to transfer from otherAccount2 to otherAccount1, should fail too
            await expect(proxiedBridgedCaminoV1.connect(otherAccount2).transfer(otherAccount1.address, 1n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount2.address);
        });

        it("Should revert transferFrom with blacklisted from/to/spender", async function () {
            const { proxiedBridgedCaminoV1, deployer, minter, blacklister, otherAccount1, otherAccount2 } =
                await loadFixture(bridgedCaminoV1WithBlacklistFixture);

            // Mint some tokens for otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(minter).mint(otherAccount1.address, 2000n)).to.not.reverted;

            // Approve otherAccount2 as spender
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).approve(otherAccount2.address, 1000n))
                .to.emit(proxiedBridgedCaminoV1, "Approval")
                .withArgs(otherAccount1.address, otherAccount2.address, 1000n);

            // Check allowance
            const allowance = await proxiedBridgedCaminoV1.allowance(otherAccount1.address, otherAccount2.address);
            expect(allowance).to.equal(1000n);

            // Blacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(otherAccount1.address);

            // Try to transferFrom from otherAccount1 to otherAccount2 with otherAccount2 as spender, should fail
            await expect(
                proxiedBridgedCaminoV1
                    .connect(otherAccount2)
                    .transferFrom(otherAccount1.address, otherAccount2.address, 1n),
            )
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount1.address);

            // Try to approve otherAccount2 as spender with otherAccount1 as from, should fail
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).approve(otherAccount2.address, 1500n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount1.address);

            // Try to approve otherAccount1 as spender with otherAccount2 as from, should fail
            await expect(proxiedBridgedCaminoV1.connect(otherAccount2).approve(otherAccount1.address, 1500n))
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount1.address);

            // Unblacklist otherAccount1
            await expect(proxiedBridgedCaminoV1.connect(blacklister).unBlacklist(otherAccount1.address))
                .to.emit(proxiedBridgedCaminoV1, "UnBlacklisted")
                .withArgs(otherAccount1.address);

            // Try to transferFrom from otherAccount1 to otherAccount2 with otherAccount2 as spender, should succeed
            await expect(
                proxiedBridgedCaminoV1
                    .connect(otherAccount2)
                    .transferFrom(otherAccount1.address, otherAccount2.address, 1n),
            )
                .to.emit(proxiedBridgedCaminoV1, "Transfer")
                .withArgs(otherAccount1.address, otherAccount2.address, 1n);

            // Check allowance
            const allowance2 = await proxiedBridgedCaminoV1.allowance(otherAccount1.address, otherAccount2.address);
            expect(allowance2).to.equal(allowance - 1n);

            // Approve otherAccount2 as spender with otherAccount1 as from and value of uint256.max
            const UINT256MAX = 2n ** 256n - 1n;
            await expect(proxiedBridgedCaminoV1.connect(otherAccount1).approve(otherAccount2.address, UINT256MAX))
                .to.emit(proxiedBridgedCaminoV1, "Approval")
                .withArgs(otherAccount1.address, otherAccount2.address, UINT256MAX);

            // Check allowance
            const allowanceMax = await proxiedBridgedCaminoV1.allowance(otherAccount1.address, otherAccount2.address);
            expect(allowanceMax).to.equal(UINT256MAX);

            // Try to transferFrom from otherAccount1 to otherAccount2 with otherAccount2 as spender, should succeed
            await expect(
                proxiedBridgedCaminoV1
                    .connect(otherAccount2)
                    .transferFrom(otherAccount1.address, otherAccount2.address, 30n),
            )
                .to.emit(proxiedBridgedCaminoV1, "Transfer")
                .withArgs(otherAccount1.address, otherAccount2.address, 30n);

            // Check allowance, should not change
            const newAllowanceMax = await proxiedBridgedCaminoV1.allowance(
                otherAccount1.address,
                otherAccount2.address,
            );
            expect(newAllowanceMax).to.equal(UINT256MAX);

            // Blacklist otherAccount2
            await expect(proxiedBridgedCaminoV1.connect(blacklister).blacklist(otherAccount2.address))
                .to.emit(proxiedBridgedCaminoV1, "Blacklisted")
                .withArgs(otherAccount2.address);

            // Try to transferFrom from otherAccount1 to deployer (another account) with otherAccount2 as spender, should fail
            await expect(
                proxiedBridgedCaminoV1
                    .connect(otherAccount2)
                    .transferFrom(otherAccount1.address, deployer.address, 30n),
            )
                .to.be.revertedWithCustomError(proxiedBridgedCaminoV1, "AccountIsBlacklisted")
                .withArgs(otherAccount2.address);
        });
    });
});
