require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");
require("solidity-docgen");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: {
                enabled: true,
                runs: 10000,
            },
            evmVersion: "paris",
        },
    },
    contractSizer: {
        runOnCompile: true,
    },
    ignition: {
        requiredConfirmations: 1,
    },
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        columbus: {
            url: vars.get("COLUMBUS_URL", "https://columbus.camino.network/ext/bc/C/rpc"),
            accounts: vars.has("COLUMBUS_DEPLOYER_PRIVATE_KEY") ? [vars.get("COLUMBUS_DEPLOYER_PRIVATE_KEY")] : [],
        },
        camino: {
            url: vars.get("CAMINO_URL", "https://api.camino.network/ext/bc/C/rpc"),
            accounts: vars.has("CAMINO_DEPLOYER_PRIVATE_KEY") ? [vars.get("CAMINO_DEPLOYER_PRIVATE_KEY")] : [],
        },
        amoy: {
            url: vars.get("AMOY_URL", "https://rpc-amoy.polygon.technology"),
            accounts: vars.has("AMOY_DEPLOYER_PRIVATE_KEY") ? [vars.get("AMOY_DEPLOYER_PRIVATE_KEY")] : [],
        },
    },
    etherscan: {
        apiKey: {
            columbus: "abc",
            camino: "abc",
        },
        customChains: [
            {
                network: "columbus",
                chainId: 501,
                urls: {
                    apiURL: "https://columbus.caminoscan.com/api",
                    browserURL: "https://columbus.caminoscan.com",
                },
            },
            {
                network: "camino",
                chainId: 500,
                urls: {
                    apiURL: "https://caminoscan.com/api",
                    browserURL: "https://caminoscan.com",
                },
            },
        ],
    },
    docgen: {
        path: "./docs",
        pages: "single",
    },
};
