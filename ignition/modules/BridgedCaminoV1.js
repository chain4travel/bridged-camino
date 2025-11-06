// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * BridgedCaminoV1 Deployment Module
 *
 * Deploys a UUPS-upgradeable ERC20 token with role-based access control.
 *
 * Required Parameters:
 * - Token Config: name, symbol
 * - Initial Roles: defaultAdmin, pauser, upgrader, blacklister
 * - Role Admins: pauserRoleAdmin, upgraderRoleAdmin, minterRoleAdmin, blacklisterRoleAdmin
 *
 * Security Notes:
 * - All addresses should be multisigs in production
 * - defaultAdmin has ultimate control and can grant other role admins
 * - Role admins can only manage their specific role (principle of least privilege)
 */
module.exports = buildModule("BridgedCaminoV1Module", (m) => {
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
    const minterRoleAdmin = m.getParameter("minterRoleAdmin");
    const blacklisterRoleAdmin = m.getParameter("blacklisterRoleAdmin");

    // Deploy implementation contract
    const bridgedCaminoV1Impl = m.contract("BridgedCaminoV1", [], { id: "BridgedCaminoV1Implementation" });

    // Create initialization parameters struct
    const initParams = {
        name,
        symbol,
        defaultAdmin,
        pauser,
        upgrader,
        blacklister,
        pauserRoleAdmin,
        upgraderRoleAdmin,
        minterRoleAdmin,
        blacklisterRoleAdmin,
    };

    // Encode initialization call
    const initializeData = m.encodeFunctionCall(bridgedCaminoV1Impl, "initialize", [initParams]);

    // Deploy ERC1967 proxy with initialization
    // This creates a proxy that delegates all calls to the implementation
    const proxy = m.contract("ERC1967Proxy", [bridgedCaminoV1Impl, initializeData], { id: "BridgedCaminoV1Proxy" });

    // Get a typed contract instance at the proxy address
    // This allows interaction with the proxy using the BridgedCaminoV1 ABI
    const bridgedCaminoV1Proxy = m.contractAt("BridgedCaminoV1", proxy);

    return {
        bridgedCaminoV1Proxy,
        bridgedCaminoV1Impl, // Return implementation for reference
    };
});
