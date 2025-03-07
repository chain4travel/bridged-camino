// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BridgedCaminoV1Module", (m) => {
    const admin = m.getAccount(0);

    const defaultAdmin = m.getParameter("defaultAdmin");
    const pauser = m.getParameter("pauser");
    const upgrader = m.getParameter("upgrader");

    const name = m.getParameter("name");
    const symbol = m.getParameter("symbol");

    const bridgedCaminoV1 = m.contract("BridgedCaminoV1");

    const initializeData = m.encodeFunctionCall(bridgedCaminoV1, "initialize", [
        name,
        symbol,
        defaultAdmin,
        pauser,
        upgrader,
    ]);

    // Deploy the proxy contract for BridgedCaminoV1 with the initialize data
    const BridgedCaminoV1Proxy = m.contract("ERC1967Proxy", [bridgedCaminoV1, initializeData]);

    // Create instance of the proxy contract with the BridgedCaminoV1 ABI
    const bridgedCaminoV1Proxy = m.contractAt("BridgedCaminoV1", BridgedCaminoV1Proxy, { id: "BridgedCaminoV1Proxy" });

    return { bridgedCaminoV1Proxy };
});
