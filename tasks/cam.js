const { scope } = require("hardhat/config");

const camScope = scope("cam", "BridgedCamino token management tasks");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ANSI color codes for terminal output
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function header(message) {
    log(`\n${"=".repeat(80)}`, colors.cyan);
    log(message, colors.bright + colors.cyan);
    log("=".repeat(80), colors.cyan);
}

function subheader(message) {
    log(`\n${message}`, colors.bright + colors.blue);
    log("-".repeat(80), colors.blue);
}

function success(message) {
    log(`✓ ${message}`, colors.green);
}

function warning(message) {
    log(`⚠ ${message}`, colors.yellow);
}

function error(message) {
    log(`✗ ${message}`, colors.red);
}

function info(message) {
    log(`ℹ ${message}`, colors.cyan);
}

async function promptUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`${colors.yellow}${question}${colors.reset} `, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

async function checkExistingDeployment(deploymentId) {
    const deploymentPath = path.join(process.cwd(), "ignition", "deployments", deploymentId);

    if (fs.existsSync(deploymentPath)) {
        const deployedAddressesPath = path.join(deploymentPath, "deployed_addresses.json");

        if (fs.existsSync(deployedAddressesPath)) {
            warning("EXISTING DEPLOYMENT DETECTED!");
            log(`  Deployment folder: ${deploymentPath}`, colors.yellow);

            try {
                const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));
                log("\n  Previously deployed contracts:", colors.yellow);
                for (const [contractName, address] of Object.entries(deployedAddresses)) {
                    log(`    ${contractName}: ${address}`, colors.yellow);
                }
                return { exists: true, addresses: deployedAddresses, path: deploymentPath };
            } catch (err) {
                error(`  Error reading deployed addresses: ${err.message}`);
            }
        }
    }

    return { exists: false };
}

function validateAddress(address, name, ethers) {
    if (!ethers.isAddress(address)) {
        throw new Error(`Invalid address for ${name}: ${address}`);
    }
    if (address === ethers.ZeroAddress) {
        throw new Error(`${name} cannot be the zero address`);
    }
}

function loadParameters(parametersFile, ethers) {
    const parametersPath = path.resolve(parametersFile);

    if (!fs.existsSync(parametersPath)) {
        throw new Error(`Parameters file not found: ${parametersPath}`);
    }

    success(`Loading parameters from: ${parametersPath}`);

    const parametersContent = fs.readFileSync(parametersPath, "utf8");
    const parameters = JSON.parse(parametersContent);

    if (!parameters.BridgedCaminoV1Module) {
        throw new Error("Parameters file must contain 'BridgedCaminoV1Module' key");
    }

    const moduleParams = parameters.BridgedCaminoV1Module;

    // Validate required parameters
    const required = [
        "name",
        "symbol",
        "defaultAdmin",
        "pauser",
        "upgrader",
        "blacklister",
        "pauserRoleAdmin",
        "upgraderRoleAdmin",
        "blacklisterRoleAdmin",
        "masterMinterOwner",
    ];

    for (const param of required) {
        if (!moduleParams[param]) {
            throw new Error(`Missing required parameter: ${param}`);
        }
    }

    // Validate addresses
    const addressParams = [
        "defaultAdmin",
        "pauser",
        "upgrader",
        "blacklister",
        "pauserRoleAdmin",
        "upgraderRoleAdmin",
        "blacklisterRoleAdmin",
        "masterMinterOwner",
    ];

    for (const param of addressParams) {
        validateAddress(moduleParams[param], param, ethers);
    }

    return moduleParams;
}

function displayNetworkInfo(networkName, chainId, deployer, balance, ethers) {
    subheader("Network Information");
    log(`  Network Name:     ${networkName}`, colors.bright);
    log(`  Chain ID:         ${chainId}`, colors.bright);
    log(`  Deployer Address: ${deployer}`, colors.bright);
    log(`  Deployer Balance: ${ethers.formatEther(balance)} ETH`, colors.bright);

    // Warn if balance is low
    if (balance < ethers.parseEther("0.01")) {
        warning("  Low deployer balance! Deployment may fail due to insufficient gas.");
    }
}

function displayTokenConfiguration(params) {
    subheader("Token Configuration");
    log(`  Name  : "${params.name}"`, colors.bright);
    log(`  Symbol: "${params.symbol}"`, colors.bright);
}

function displayRoleConfiguration(params) {
    subheader("Role Configuration");

    log("\n  Initial Role Holders:", colors.bright);
    log(`    DEFAULT_ADMIN_ROLE: ${params.defaultAdmin}`);
    log(`    PAUSER_ROLE:        ${params.pauser}`);
    log(`    UPGRADER_ROLE:      ${params.upgrader}`);
    log(`    BLACKLISTER_ROLE:   ${params.blacklister}`);

    log("\n  Role Admins (can grant/revoke roles):", colors.bright);
    log(`    PAUSER_ROLE_ADMIN:      ${params.pauserRoleAdmin}`);
    log(`    UPGRADER_ROLE_ADMIN:    ${params.upgraderRoleAdmin}`);
    log(`    MINTER_ROLE_ADMIN:      <MasterMinter Contract> (auto-assigned)`);
    log(`    BLACKLISTER_ROLE_ADMIN: ${params.blacklisterRoleAdmin}`);

    log("\n  MasterMinter Configuration:", colors.bright);
    log(`    Owner: ${params.masterMinterOwner}`);

    // Check for duplicates and warn about security
    const uniqueAddresses = new Set([
        params.defaultAdmin,
        params.pauser,
        params.upgrader,
        params.blacklister,
        params.pauserRoleAdmin,
        params.upgraderRoleAdmin,
        params.blacklisterRoleAdmin,
        params.masterMinterOwner,
    ]);

    log(`\n  Unique addresses used: ${uniqueAddresses.size}`, colors.cyan);

    if (uniqueAddresses.size === 1) {
        warning("  All roles assigned to the same address!");
        warning("  This is NOT recommended for production deployments.");
        warning("  Consider using multisig wallets for different roles.");
    }
}

function displaySecurityChecklist() {
    subheader("Security Checklist");
    warning("Please verify the following before proceeding:");
    log("  □ All addresses are correct and controlled by the right parties");
    log("  □ Using multisig wallets for critical roles in production");
    log("  □ Parameters file has been reviewed and approved");
    log("  □ Network and chain ID are correct");
    log("  □ Deployer has sufficient balance for gas fees");
    log("  □ You have backed up the private key/mnemonic");
}

camScope
    .task("deploy", "Deploy BridgedCaminoV1 token and MasterMinter contracts")
    .addOptionalParam("parameters", "Path to the parameters JSON file")
    .addOptionalParam("deploymentId", "Set the id of the deployment")
    .addFlag("verify", "Verify the deployment on configured block explorer")
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;

        try {
            header("BridgedCamino Token Deployment");

            const targetNetwork = network.name;

            // Get network information
            const provider = ethers.provider;
            const networkInfo = await provider.getNetwork();
            const chainId = networkInfo.chainId;

            // Determine deployment ID (defaults to chain-<chainId> if not provided)
            const deploymentId = taskArgs.deploymentId || `chain-${chainId}`;

            // Determine parameters file: use provided path or default to deployment-specific file
            const parametersFile =
                taskArgs.parameters ||
                path.join(process.cwd(), "ignition", "modules", `${deploymentId}_parameters.json`);

            // Check if parameters file exists early
            if (!fs.existsSync(parametersFile)) {
                throw new Error(
                    `Parameters file not found: ${parametersFile}\n` +
                        `Please create a parameters file for deployment "${deploymentId}" or specify a custom path using --parameters`,
                );
            }

            info(`Target Network: ${targetNetwork}`);
            info(`Chain ID: ${chainId}`);
            info(`Deployment ID: ${deploymentId}`);
            info(`Parameters File: ${parametersFile}`);

            // Load parameters
            subheader("Loading Parameters");
            const params = loadParameters(parametersFile, ethers);
            success("Parameters loaded and validated");

            // Get deployer information
            const [deployer] = await ethers.getSigners();
            const deployerAddress = await deployer.getAddress();
            const balance = await provider.getBalance(deployerAddress);

            // Display all information
            displayNetworkInfo(targetNetwork, chainId, deployerAddress, balance, ethers);
            displayTokenConfiguration(params);
            displayRoleConfiguration(params);

            // Check for existing deployment
            subheader("Checking for Existing Deployments");
            const existingDeployment = await checkExistingDeployment(deploymentId);

            if (existingDeployment.exists) {
                log("");
                warning("An existing deployment was found for this network!");
                warning("Continuing will either resume or create a new deployment depending on Ignition's state.");
                log("\nOptions:", colors.yellow);
                log("  - If you want to redeploy, delete the deployment folder first:", colors.yellow);
                log(`    rm -rf ${existingDeployment.path}`, colors.cyan);
                log("  - If you want to resume a failed deployment, continue with 'yes'", colors.yellow);
            } else {
                success("No existing deployment found with this deployment ID. This will be a fresh deployment.");
            }

            // Display security checklist
            displaySecurityChecklist();

            // Ask for confirmation
            log("");
            const answer = await promptUser("Type 'yes' to proceed with deployment:");

            if (answer !== "yes") {
                log("\nDeployment cancelled by user.", colors.red);
                process.exit(0);
            }

            // Proceed with deployment
            header("Starting Deployment");

            const startTime = Date.now();

            info("Deploying contracts using Hardhat Ignition...");
            info("This may take several minutes depending on network conditions.\n");

            // Run ignition deploy via the CLI command
            const ignitionArgs = {
                modulePath: "./ignition/modules/BridgedCaminoV1.js",
                parameters: parametersFile,
            };

            // Add deployment ID if provided
            if (taskArgs.deploymentId) {
                ignitionArgs.deploymentId = taskArgs.deploymentId;
                info(`Using deployment ID: ${taskArgs.deploymentId}`);
            }

            // Add verify flag if provided
            if (taskArgs.verify) {
                ignitionArgs.verify = true;
                info("Verification on block explorer will be performed after deployment.");
            }

            await hre.run({ scope: "ignition", task: "deploy" }, ignitionArgs);

            const endTime = Date.now();
            const deploymentTime = ((endTime - startTime) / 1000).toFixed(2);

            // Read deployed addresses from the deployment artifacts
            const deployedAddressesPath = path.join(
                process.cwd(),
                "ignition",
                "deployments",
                deploymentId,
                "deployed_addresses.json",
            );

            const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));
            const proxyAddress =
                deployedAddresses["BridgedCaminoV1Module#BridgedCaminoV1Proxy"] ||
                deployedAddresses["BridgedCaminoV1Module#BridgedCaminoV1"];
            const implAddress = deployedAddresses["BridgedCaminoV1Module#BridgedCaminoV1Implementation"];
            const masterMinterAddress = deployedAddresses["BridgedCaminoV1Module#MasterMinter"];

            // Display deployment summary
            header("Deployment Successful!");

            success(`Deployment completed in ${deploymentTime} seconds`);

            subheader("Deployed Contracts");
            log(`  BridgedCaminoV1 Token (Proxy):     ${proxyAddress}`, colors.bright + colors.green);
            log(`  BridgedCaminoV1 Implementation:    ${implAddress}`, colors.cyan);
            log(`  MasterMinter:                      ${masterMinterAddress}`, colors.cyan);

            subheader("Deployment Details");
            log(`  Network:        ${targetNetwork}`);
            log(`  Chain ID:       ${chainId}`);
            log(`  Deployment ID:  ${deploymentId}`);
            log(`  Deployer:       ${deployerAddress}`);
            log(`  Block Number:   ${await provider.getBlockNumber()}`);
            log(`  Timestamp:      ${new Date().toISOString()}`);

            subheader("Token Information");
            log(`  Name:           ${params.name}`);
            log(`  Symbol:         ${params.symbol}`);
            log(`  Decimals:       18 (standard ERC20)`);
            log(`  Initial Supply: 0 (minting required)`);

            subheader("Role Configuration Summary");
            log(`  DEFAULT_ADMIN:       ${params.defaultAdmin}`);
            log(`  PAUSER:              ${params.pauser}`);
            log(`  UPGRADER:            ${params.upgrader}`);
            log(`  BLACKLISTER:         ${params.blacklister}`);
            log(`  MINTER_ROLE_ADMIN:   ${masterMinterAddress} (MasterMinter)`);
            log(`  MasterMinter Owner:  ${params.masterMinterOwner}`);

            subheader("Verification");
            if (taskArgs.verify) {
                success("Contracts have been verified on the block explorer.");
            }
            info("To verify contracts on block explorer:");
            log(`\n  # Using Ignition`, colors.cyan);
            log(`  yarn hardhat ignition verify ${deploymentId}`, colors.cyan);
            log(`\n  # Or verify individually`, colors.cyan);
            log(`  yarn hardhat verify --network ${targetNetwork} ${implAddress}`, colors.cyan);
            log(`  yarn hardhat verify --network ${targetNetwork} ${masterMinterAddress} \\`, colors.cyan);
            log(`    "${ethers.ZeroAddress}" "${deployerAddress}"`, colors.cyan);

            subheader("Next Steps");
            info("After deployment, you should:");
            log("  1. Verify the contracts on the block explorer");
            log("  2. Configure minters via MasterMinter.configureMinter()");
            log("  3. Test minting functionality");
            log("  4. Set up monitoring and alerts");
            log("  5. Update documentation with deployed addresses");

            subheader("Important Notes");
            warning("The deployer address has NO special privileges on the token after deployment.");
            warning("All role management is controlled by the configured role admins.");
            warning("MasterMinter ownership has been transferred to the specified masterMinterOwner.");
            warning("Commit the ignition deployment folder to your version control system.");

            // Save deployment info to a summary file
            const summaryPath = path.join(
                process.cwd(),
                "ignition",
                "deployments",
                deploymentId,
                "deploy_task_summary.json",
            );

            const summary = {
                network: targetNetwork,
                chainId: Number(chainId),
                deploymentId: deploymentId,
                deployer: deployerAddress,
                timestamp: new Date().toISOString(),
                deploymentTime: `${deploymentTime}s`,
                contracts: {
                    proxy: proxyAddress,
                    implementation: implAddress,
                    masterMinter: masterMinterAddress,
                },
                parameters: params,
            };

            fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
            log("");
            success(`Deployment summary saved to: ${summaryPath}`);

            header("Deployment Complete");
        } catch (err) {
            error("Deployment failed!");
            error(err.message);

            if (err.stack) {
                log("\nStack trace:", colors.red);
                console.error(err.stack);
            }

            process.exit(1);
        }
    });

module.exports = {};
