// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * BridgedCamino with MasterMinter Deployment Module
 *
 * Deploys both BridgedCaminoV1 and MasterMinter atomically in a single module.
 * This solves the chicken-and-egg problem by:
 * 1. Deploying MasterMinter with address(0) as temporary minter manager, deployer as temporary owner
 * 2. Deploying BridgedCaminoV1 with MasterMinter as minterRoleAdmin
 * 3. Calling setMinterManager() on MasterMinter (from deployer) to connect them
 * 4. Transferring MasterMinter ownership from deployer to masterMinterOwner
 *
 * This approach:
 * - Is completely atomic (no frontrunning risk)
 * - Deployer needs no special roles on the token
 * - MasterMinter automatically gets MINTER_ROLE_ADMIN during token initialization
 * - Deployer only has temporary ownership of MasterMinter during deployment
 *
 * Required Parameters:
 * - Token Config: name, symbol
 * - Initial Roles: defaultAdmin, pauser, upgrader, blacklister
 * - Role Admins: pauserRoleAdmin, upgraderRoleAdmin, blacklisterRoleAdmin
 * - MasterMinter: masterMinterOwner
 *
 * Security Notes:
 * - All addresses should be multisigs in production
 * - defaultAdmin should be the same as masterMinterOwner for emergency minter removal
 * - MasterMinter automatically receives MINTER_ROLE_ADMIN
 * - Deployer has no privileges after deployment completes
 */
module.exports = buildModule("BridgedCaminoV1Module", (m) => {
    // Get deployer account (the account running the deployment)
    const deployer = m.getAccount(0);

    // Token configuration
    const name = m.getParameter("name");
    const symbol = m.getParameter("symbol");

    // Initial role holders
    const defaultAdmin = m.getParameter("defaultAdmin");
    const pauser = m.getParameter("pauser");
    const upgrader = m.getParameter("upgrader");
    const blacklister = m.getParameter("blacklister");

    // Role admins (manage who can have each role)
    const pauserRoleAdmin = m.getParameter("pauserRoleAdmin");
    const upgraderRoleAdmin = m.getParameter("upgraderRoleAdmin");
    const blacklisterRoleAdmin = m.getParameter("blacklisterRoleAdmin");

    // MasterMinter owner (final owner, usually a multisig)
    const masterMinterOwner = m.getParameter("masterMinterOwner");

    // Step 1: Deploy MasterMinter with address(0) as temporary minter manager
    // Deployer is set as temporary owner so we can call setMinterManager
    const masterMinter = m.contract(
        "MasterMinter",
        [
            ethers.ZeroAddress, // Temporary address(0), will be set after token deployment
            deployer, // Temporary owner (deployer), will be transferred to masterMinterOwner
        ],
        { id: "MasterMinter" },
    );

    // Step 2: Deploy BridgedCaminoV1 implementation
    const bridgedCaminoV1Impl = m.contract("BridgedCaminoV1", [], { id: "BridgedCaminoV1Implementation" });

    // Create initialization parameters
    // Important: MasterMinter gets minterRoleAdmin, so it can manage minters
    const initParams = {
        name,
        symbol,
        defaultAdmin,
        pauser,
        upgrader,
        blacklister,
        pauserRoleAdmin,
        upgraderRoleAdmin,
        minterRoleAdmin: masterMinter, // MasterMinter gets MINTER_ROLE_ADMIN automatically
        blacklisterRoleAdmin,
    };

    // Encode initialization call
    const initializeData = m.encodeFunctionCall(bridgedCaminoV1Impl, "initialize", [initParams]);

    // Step 3: Deploy ERC1967 proxy with initialization
    // This is atomic - initialization happens in the proxy constructor
    const proxy = m.contract("ERC1967Proxy", [bridgedCaminoV1Impl, initializeData], { id: "BridgedCaminoV1Proxy" });

    // Get a typed contract instance at the proxy address
    const bridgedCaminoV1Proxy = m.contractAt("BridgedCaminoV1", proxy);

    // Step 4: Set the minter manager on MasterMinter now that the token is deployed
    // This connects the MasterMinter to the token
    // Deployer can call this because they are the temporary owner
    const setMinterManagerCall = m.call(masterMinter, "setMinterManager", [bridgedCaminoV1Proxy], { id: "SetMinterManagerOnMasterMinter" });

    // Step 5: Transfer ownership of MasterMinter to the final owner (multisig)
    // After this, deployer has no control over MasterMinter
    // IMPORTANT: This must happen AFTER setMinterManager, so we add it as a dependency
    m.call(masterMinter, "transferOwnership", [masterMinterOwner], {
        id: "TransferMasterMinterOwnership",
        after: [setMinterManagerCall]
    });

    return { bridgedCaminoV1Proxy, bridgedCaminoV1Impl, masterMinter };
});
