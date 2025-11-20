const { scope } = require("hardhat/config");

const camScope = scope("cam", "BridgedCamino token management tasks");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Password } = require("enquirer");

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

// Indentation configuration
const INDENT_SIZE = 2; // Number of spaces per indent level

function getIndent(level = 0) {
    return " ".repeat(level * INDENT_SIZE);
}

function log(message, indent = 0, color = colors.reset) {
    const indentStr = getIndent(indent);
    console.log(`${indentStr}${color}${message}${colors.reset}`);
}

function header(message) {
    log("", 0, colors.reset);
    log("=".repeat(80), 0, colors.cyan);
    log(message, 0, colors.bright + colors.cyan);
    log("=".repeat(80), 0, colors.cyan);
}

function subheader(message) {
    log("", 0, colors.reset);
    log(message, 0, colors.bright + colors.blue);
    log("-".repeat(80), 0, colors.blue);
}

function success(message, indent = 0) {
    log(`✓ ${message}`, indent, colors.green);
}

function warning(message, indent = 0) {
    log(`⚠ ${message}`, indent, colors.yellow);
}

function error(message, indent = 0) {
    log(`✗ ${message}`, indent, colors.red);
}

function info(message, indent = 0) {
    log(`ℹ ${message}`, indent, colors.cyan);
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

async function getPrivateKey(taskArgs) {
    if (taskArgs.privateKey) {
        return taskArgs.privateKey;
    }

    // Prompt for private key using enquirer (properly hides input)
    const prompt = new Password({
        name: "privateKey",
        message: "Enter private key",
    });

    try {
        const privateKey = await prompt.run();
        return privateKey.trim();
    } catch (err) {
        // User cancelled (Ctrl+C)
        error("Operation cancelled by user", 0);
        process.exit(1);
    }
}

async function getSignerFromPrivateKey(privateKey, ethers) {
    // Add 0x prefix if missing
    if (!privateKey.startsWith("0x")) {
        privateKey = "0x" + privateKey;
    }

    try {
        const wallet = new ethers.Wallet(privateKey, ethers.provider);
        return wallet;
    } catch (err) {
        throw new Error(`Invalid private key: ${err.message}`);
    }
}

async function loadDeployment(deploymentId, ethers) {
    const deployedAddressesPath = path.join(
        process.cwd(),
        "ignition",
        "deployments",
        deploymentId,
        "deployed_addresses.json",
    );

    if (!fs.existsSync(deployedAddressesPath)) {
        throw new Error(
            `No deployment found for deployment ID: ${deploymentId}\n` + `Expected path: ${deployedAddressesPath}`,
        );
    }

    const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));
    const proxyAddress =
        deployedAddresses["BridgedCaminoV1Module#BridgedCaminoV1Proxy"] ||
        deployedAddresses["BridgedCaminoV1Module#BridgedCaminoV1"];
    const masterMinterAddress = deployedAddresses["BridgedCaminoV1Module#MasterMinter"];

    return { proxyAddress, masterMinterAddress };
}

async function checkExistingDeployment(deploymentId) {
    const deploymentPath = path.join(process.cwd(), "ignition", "deployments", deploymentId);

    if (fs.existsSync(deploymentPath)) {
        const deployedAddressesPath = path.join(deploymentPath, "deployed_addresses.json");

        if (fs.existsSync(deployedAddressesPath)) {
            warning("EXISTING DEPLOYMENT DETECTED!", 0);
            log(`Deployment folder: ${deploymentPath}`, 1, colors.yellow);

            try {
                const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));
                log("", 0);
                log("Previously deployed contracts:", 1, colors.yellow);
                for (const [contractName, address] of Object.entries(deployedAddresses)) {
                    log(`${contractName}: ${address}`, 2, colors.yellow);
                }
                return { exists: true, addresses: deployedAddresses, path: deploymentPath };
            } catch (err) {
                error(`Error reading deployed addresses: ${err.message}`, 1);
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

    success(`Loading parameters from: ${parametersPath}`, 0);

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
    log(`Network Name:     ${networkName}`, 1, colors.bright);
    log(`Chain ID:         ${chainId}`, 1, colors.bright);
    log(`Deployer Address: ${deployer}`, 1, colors.bright);
    log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`, 1, colors.bright);

    // Warn if balance is low
    if (balance < ethers.parseEther("0.01")) {
        warning("Low deployer balance! Deployment may fail due to insufficient gas.", 1);
    }
}

function displayTokenConfiguration(params) {
    subheader("Token Configuration");
    log(`Name  : "${params.name}"`, 1, colors.bright);
    log(`Symbol: "${params.symbol}"`, 1, colors.bright);
}

function displayRoleConfiguration(params) {
    subheader("Role Configuration");

    log("", 0);
    log("Initial Role Holders:", 1, colors.bright);
    log(`DEFAULT_ADMIN_ROLE: ${params.defaultAdmin}`, 2);
    log(`PAUSER_ROLE:        ${params.pauser}`, 2);
    log(`UPGRADER_ROLE:      ${params.upgrader}`, 2);
    log(`BLACKLISTER_ROLE:   ${params.blacklister}`, 2);

    log("", 0);
    log("Role Admins (can grant/revoke roles):", 1, colors.bright);
    log(`PAUSER_ROLE_ADMIN:      ${params.pauserRoleAdmin}`, 2);
    log(`UPGRADER_ROLE_ADMIN:    ${params.upgraderRoleAdmin}`, 2);
    log(`MINTER_ROLE_ADMIN:      <MasterMinter Contract> (auto-assigned)`, 2);
    log(`BLACKLISTER_ROLE_ADMIN: ${params.blacklisterRoleAdmin}`, 2);

    log("", 0);
    log("MasterMinter Configuration:", 1, colors.bright);
    log(`Owner: ${params.masterMinterOwner}`, 2);

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

    log("", 0);
    log(`Unique addresses used: ${uniqueAddresses.size}`, 1, colors.cyan);

    if (uniqueAddresses.size === 1) {
        warning("All roles assigned to the same address!", 1);
        warning("This is NOT recommended for production deployments.", 1);
        warning("Consider using multisig wallets for different roles.", 1);
    }
}

function displaySecurityChecklist() {
    subheader("Security Checklist");
    warning("Please verify the following before proceeding:", 0);
    log("□ All addresses are correct and controlled by the right parties", 1);
    log("□ Using multisig wallets for critical roles in production", 1);
    log("□ Parameters file has been reviewed and approved", 1);
    log("□ Network and chain ID are correct", 1);
    log("□ Deployer has sufficient balance for gas fees", 1);
    log("□ You have backed up the private key/mnemonic", 1);
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

            info(`Target Network: ${targetNetwork}`, 0);
            info(`Chain ID: ${chainId}`, 0);
            info(`Deployment ID: ${deploymentId}`, 0);
            info(`Parameters File: ${parametersFile}`, 0);

            // Load parameters
            subheader("Loading Parameters");
            const params = loadParameters(parametersFile, ethers);
            success("Parameters loaded and validated", 0);

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
                log("", 0);
                warning("An existing deployment was found for this network!", 0);
                warning("Continuing will either resume or create a new deployment depending on Ignition's state.", 0);
                log("", 0);
                log("Options:", 0, colors.yellow);
                log("- If you want to redeploy, delete the deployment folder first:", 1, colors.yellow);
                log(`rm -rf ${existingDeployment.path}`, 2, colors.cyan);
                log("- If you want to resume a failed deployment, continue with 'yes'", 1, colors.yellow);
            } else {
                success("No existing deployment found with this deployment ID. This will be a fresh deployment.", 0);
            }

            // Display security checklist
            displaySecurityChecklist();

            // Ask for confirmation
            log("", 0);
            const answer = await promptUser("Type 'yes' to proceed with deployment:");

            if (answer !== "yes") {
                log("", 0);
                log("Deployment cancelled by user.", 0, colors.red);
                process.exit(0);
            }

            // Proceed with deployment
            header("Starting Deployment");

            const startTime = Date.now();

            info("Deploying contracts using Hardhat Ignition...", 0);
            info("This may take several minutes depending on network conditions.", 0);
            log("", 0);

            // Run ignition deploy via the CLI command
            const ignitionArgs = {
                modulePath: "./ignition/modules/BridgedCaminoV1.js",
                parameters: parametersFile,
            };

            // Add deployment ID if provided
            if (taskArgs.deploymentId) {
                ignitionArgs.deploymentId = taskArgs.deploymentId;
                info(`Using deployment ID: ${taskArgs.deploymentId}`, 0);
            }

            // Add verify flag if provided
            if (taskArgs.verify) {
                ignitionArgs.verify = true;
                info("Verification on block explorer will be performed after deployment.", 0);
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

            success(`Deployment completed in ${deploymentTime} seconds`, 0);

            subheader("Deployed Contracts");
            log(`BridgedCaminoV1 Token (Proxy):     ${proxyAddress}`, 1, colors.bright + colors.green);
            log(`BridgedCaminoV1 Implementation:    ${implAddress}`, 1, colors.cyan);
            log(`MasterMinter:                      ${masterMinterAddress}`, 1, colors.cyan);

            subheader("Deployment Details");
            log(`Network:        ${targetNetwork}`, 1);
            log(`Chain ID:       ${chainId}`, 1);
            log(`Deployment ID:  ${deploymentId}`, 1);
            log(`Deployer:       ${deployerAddress}`, 1);
            log(`Block Number:   ${await provider.getBlockNumber()}`, 1);
            log(`Timestamp:      ${new Date().toISOString()}`, 1);

            subheader("Token Information");
            log(`Name:           ${params.name}`, 1);
            log(`Symbol:         ${params.symbol}`, 1);
            log(`Decimals:       18 (standard ERC20)`, 1);
            log(`Initial Supply: 0 (minting required)`, 1);

            subheader("Role Configuration Summary");
            log(`DEFAULT_ADMIN:       ${params.defaultAdmin}`, 1);
            log(`PAUSER:              ${params.pauser}`, 1);
            log(`UPGRADER:            ${params.upgrader}`, 1);
            log(`BLACKLISTER:         ${params.blacklister}`, 1);
            log(`MINTER_ROLE_ADMIN:   ${masterMinterAddress} (MasterMinter)`, 1);
            log(`MasterMinter Owner:  ${params.masterMinterOwner}`, 1);

            subheader("Verification");
            if (taskArgs.verify) {
                success("Contracts have been verified on the block explorer.", 0);
            }
            info("To verify contracts on block explorer:", 0);
            log("", 0);
            log("# Using Ignition", 1, colors.cyan);
            log(`yarn hardhat ignition verify ${deploymentId}`, 1, colors.cyan);
            log("", 0);
            log("# Or verify individually", 1, colors.cyan);
            log(`yarn hardhat verify --network ${targetNetwork} ${implAddress}`, 1, colors.cyan);
            log(`yarn hardhat verify --network ${targetNetwork} ${masterMinterAddress} \\`, 1, colors.cyan);
            log(`"${ethers.ZeroAddress}" "${deployerAddress}"`, 2, colors.cyan);

            subheader("Next Steps");
            info("After deployment, you should:", 0);
            log("1. Verify the contracts on the block explorer", 1);
            log("2. Configure minters via MasterMinter.configureMinter()", 1);
            log("3. Test minting functionality", 1);
            log("4. Set up monitoring and alerts", 1);
            log("5. Update documentation with deployed addresses", 1);

            subheader("Important Notes");
            warning("The deployer address has NO special privileges on the token after deployment.", 0);
            warning("All role management is controlled by the configured role admins.", 0);
            warning("MasterMinter ownership has been transferred to the specified masterMinterOwner.", 0);
            warning("Commit the ignition deployment folder to your version control system.", 0);

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
            log("", 0);
            success(`Deployment summary saved to: ${summaryPath}`, 0);

            header("Deployment Complete");
        } catch (err) {
            error("Deployment failed!", 0);
            error(err.message, 0);

            if (err.stack) {
                log("", 0);
                log("Stack trace:", 0, colors.red);
                console.error(err.stack);
            }

            process.exit(1);
        }
    });

camScope
    .task("status", "Display current state of deployed BridgedCaminoV1 token and MasterMinter")
    .addOptionalParam("deploymentId", "Deployment ID to check status for")
    .addOptionalParam("fromBlock", "Starting block for event scanning (default: deployment block)")
    .addOptionalParam("toBlock", "Ending block for event scanning (default: latest)")
    .addOptionalParam(
        "blockChunkSize",
        "Max blocks per query for event scanning (default: 5000, set to 0 to disable chunking)",
        "5000",
    )
    .addFlag("skipEvents", "Skip event scanning for controllers (faster, less complete)")
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;

        try {
            header("BridgedCamino Token Status");

            // Get network information
            const provider = ethers.provider;
            const networkInfo = await provider.getNetwork();
            const chainId = networkInfo.chainId;

            // Determine deployment ID
            const deploymentId = taskArgs.deploymentId || `chain-${chainId}`;

            info(`Network: ${network.name}`, 0);
            info(`Chain ID: ${chainId}`, 0);
            info(`Deployment ID: ${deploymentId}`, 0);

            // Load deployment addresses
            const deployedAddressesPath = path.join(
                process.cwd(),
                "ignition",
                "deployments",
                deploymentId,
                "deployed_addresses.json",
            );

            if (!fs.existsSync(deployedAddressesPath)) {
                throw new Error(
                    `No deployment found for deployment ID: ${deploymentId}\n` +
                        `Expected path: ${deployedAddressesPath}`,
                );
            }

            const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));
            const proxyAddress =
                deployedAddresses["BridgedCaminoV1Module#BridgedCaminoV1Proxy"] ||
                deployedAddresses["BridgedCaminoV1Module#BridgedCaminoV1"];
            const implAddress = deployedAddresses["BridgedCaminoV1Module#BridgedCaminoV1Implementation"];
            const masterMinterAddress = deployedAddresses["BridgedCaminoV1Module#MasterMinter"];

            // Display contract addresses
            subheader("Deployed Contracts");
            log(`Token Proxy:        ${proxyAddress}`, 1, colors.bright);
            log(`Implementation:     ${implAddress}`, 1, colors.cyan);
            log(`MasterMinter:       ${masterMinterAddress}`, 1, colors.cyan);

            // Verify contracts exist at these addresses
            subheader("Verifying Contract Deployment");
            const proxyCode = await provider.getCode(proxyAddress);
            const masterMinterCode = await provider.getCode(masterMinterAddress);

            if (proxyCode === "0x") {
                throw new Error(
                    `No contract found at Token Proxy address: ${proxyAddress}\n\n` +
                        `This usually means:\n` +
                        `${getIndent(1)}1. The deployment was made to a different network\n` +
                        `${getIndent(1)}2. You're querying an ephemeral network (hardhat) instead of persistent (localhost)\n` +
                        `${getIndent(1)}3. The deployment ID doesn't match the current network\n\n` +
                        `Solutions:\n` +
                        `${getIndent(1)}- If deployed to localhost, add: --network localhost\n` +
                        `${getIndent(1)}- If deployed to a testnet/mainnet, specify: --network <network-name>\n` +
                        `${getIndent(1)}- Check available deployments in: ignition/deployments/`,
                );
            }

            if (masterMinterCode === "0x") {
                throw new Error(`No contract found at MasterMinter address: ${masterMinterAddress}`);
            }

            success("Contracts verified on-chain", 0);

            // Get contract instances
            const token = await ethers.getContractAt("BridgedCaminoV1", proxyAddress);
            const masterMinter = await ethers.getContractAt("MasterMinter", masterMinterAddress);

            // Token Information
            subheader("Token Information");
            const name = await token.name();
            const symbol = await token.symbol();
            const decimals = await token.decimals();
            const totalSupply = await token.totalSupply();
            const isPaused = await token.paused();

            log(`Name:           ${name}`, 1, colors.bright);
            log(`Symbol:         ${symbol}`, 1, colors.bright);
            log(`Decimals:       ${decimals}`, 1);
            log(`Total Supply:   ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`, 1);
            log(`Paused:         ${isPaused ? "YES" : "NO"}`, 1, isPaused ? colors.red : colors.green);

            // Role definitions
            const roles = [
                { name: "DEFAULT_ADMIN_ROLE", value: await token.DEFAULT_ADMIN_ROLE() },
                { name: "PAUSER_ROLE", value: await token.PAUSER_ROLE() },
                { name: "PAUSER_ROLE_ADMIN", value: await token.PAUSER_ROLE_ADMIN() },
                { name: "MINTER_ROLE", value: await token.MINTER_ROLE() },
                { name: "MINTER_ROLE_ADMIN", value: await token.MINTER_ROLE_ADMIN() },
                { name: "UPGRADER_ROLE", value: await token.UPGRADER_ROLE() },
                { name: "UPGRADER_ROLE_ADMIN", value: await token.UPGRADER_ROLE_ADMIN() },
                { name: "BLACKLISTER_ROLE", value: await token.BLACKLISTER_ROLE() },
                { name: "BLACKLISTER_ROLE_ADMIN", value: await token.BLACKLISTER_ROLE_ADMIN() },
            ];

            // Display Roles and Members
            subheader("Access Control Roles");
            for (const role of roles) {
                const memberCount = await token.getRoleMemberCount(role.value);
                log("", 0);
                log(`${role.name}:`, 1, colors.bright);
                log(`Role Hash:  ${role.value}`, 2, colors.cyan);
                log(`Members:    ${memberCount}`, 2);

                if (memberCount > 0) {
                    for (let i = 0; i < memberCount; i++) {
                        const member = await token.getRoleMember(role.value, i);
                        log(`[${i}] ${member}`, 3, colors.green);
                    }
                } else {
                    log(`(none)`, 3, colors.yellow);
                }

                log("", 0);
            }

            // MasterMinter Information
            subheader("MasterMinter Details");
            const masterMinterOwner = await masterMinter.owner();
            const minterManagerAddress = await masterMinter.getMinterManager();

            log(`Contract:       ${masterMinterAddress}`, 1, colors.bright);
            log(`Owner:          ${masterMinterOwner}`, 1, colors.bright);
            log(`Minter Manager: ${minterManagerAddress}`, 1, colors.cyan);

            // Check if owner is a contract (multisig, etc.)
            const ownerCode = await provider.getCode(masterMinterOwner);
            const isOwnerContract = ownerCode !== "0x";
            if (isOwnerContract) {
                info(`Owner is a contract (likely a multisig or governance contract)`, 1);
            } else {
                warning(`Owner is an EOA (externally owned account)`, 1);
            }

            // Minters Information
            subheader("Minters and Allowances");
            const MINTER_ROLE = await token.MINTER_ROLE();
            const minterCount = await token.getRoleMemberCount(MINTER_ROLE);
            let totalAllowance = 0n;

            if (minterCount === 0) {
                warning("No minters configured", 0);
            } else {
                log(`Total Minters: ${minterCount}`, 1, colors.bright);
                log("", 0);

                for (let i = 0; i < minterCount; i++) {
                    const minter = await token.getRoleMember(MINTER_ROLE, i);
                    const allowance = await token.minterAllowance(minter);
                    const isMinter = await token.isMinter(minter);

                    log(`[${i}] ${minter}`, 1, colors.bright + colors.green);
                    log(`Status:    ${isMinter ? "Active" : "Inactive"}`, 3, isMinter ? colors.green : colors.red);
                    log(`Allowance: ${ethers.formatUnits(allowance, decimals)} ${symbol}`, 3);

                    totalAllowance += allowance;
                }
            }

            log("", 0);
            warning(`Total Allowance: ${ethers.formatUnits(totalAllowance, decimals)} ${symbol}`, 1, colors.bright);

            // Try to enumerate controllers via events
            subheader("Controllers Information");

            if (taskArgs.skipEvents) {
                warning("Event scanning skipped (--skip-events flag set)", 0);
                info("Controllers cannot be enumerated without event scanning.", 0);
            } else {
                // Determine deployment block from journal
                let deploymentBlock = 0;
                try {
                    const journalPath = path.join(
                        process.cwd(),
                        "ignition",
                        "deployments",
                        deploymentId,
                        "journal.jsonl",
                    );

                    if (fs.existsSync(journalPath)) {
                        const journalLines = fs.readFileSync(journalPath, "utf8").split("\n");
                        for (const line of journalLines) {
                            if (line.trim() && line.includes('"type":"TRANSACTION_CONFIRM"')) {
                                const entry = JSON.parse(line);
                                if (entry.receipt && entry.receipt.blockNumber) {
                                    deploymentBlock = entry.receipt.blockNumber;
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignore errors, fall back to 0
                }

                // Determine block range
                let fromBlock = taskArgs.fromBlock ? parseInt(taskArgs.fromBlock) : deploymentBlock;
                let toBlock = taskArgs.toBlock ? parseInt(taskArgs.toBlock) : "latest";
                const blockChunkSize = parseInt(taskArgs.blockChunkSize);

                if (toBlock === "latest") {
                    toBlock = await provider.getBlockNumber();
                }

                if (deploymentBlock > 0 && !taskArgs.fromBlock) {
                    log(`Scanning from deployment block ${fromBlock} to ${toBlock}... (${toBlock - fromBlock} blocks)`, 1, colors.cyan);
                    info(`Deployment detected at block ${deploymentBlock}`, 1);
                } else {
                    log(`Scanning from block ${fromBlock} to ${toBlock}...`, 1, colors.cyan);
                }

                if (blockChunkSize > 0 && toBlock - fromBlock > blockChunkSize) {
                    info(`Large range detected. Will query in chunks of ${blockChunkSize} blocks.`, 1);
                }

                try {
                    const configuredFilter = masterMinter.filters.ControllerConfigured();
                    const removedFilter = masterMinter.filters.ControllerRemoved();

                    let configuredEvents = [];
                    let removedEvents = [];

                    // Query in chunks if needed
                    if (blockChunkSize > 0 && toBlock - fromBlock > blockChunkSize) {
                        log(`Processing ${Math.ceil((toBlock - fromBlock) / blockChunkSize)} chunks...`, 1, colors.cyan);
                        log("", 0);

                        for (let start = fromBlock; start <= toBlock; start += blockChunkSize) {
                            const end = Math.min(start + blockChunkSize - 1, toBlock);
                            log(`Querying blocks ${start} to ${end}...`, 2, colors.cyan);

                            const configuredChunk = await masterMinter.queryFilter(configuredFilter, start, end);
                            const removedChunk = await masterMinter.queryFilter(removedFilter, start, end);

                            configuredEvents = configuredEvents.concat(configuredChunk);
                            removedEvents = removedEvents.concat(removedChunk);
                        }

                        log("✓ Completed chunked query", 1, colors.green);
                        log("", 0);
                    } else {
                        // Query all at once
                        configuredEvents = await masterMinter.queryFilter(configuredFilter, fromBlock, toBlock);
                        removedEvents = await masterMinter.queryFilter(removedFilter, fromBlock, toBlock);
                    }

                    // Build a map of current controllers
                    const controllerMap = new Map();

                    // Add configured controllers
                    for (const event of configuredEvents) {
                        controllerMap.set(event.args.controller, event.args.worker);
                    }

                    // Remove removed controllers
                    for (const event of removedEvents) {
                        controllerMap.delete(event.args.controller);
                    }

                    log(`Found ${configuredEvents.length} ControllerConfigured events`, 1, colors.cyan);
                    log(`Found ${removedEvents.length} ControllerRemoved events`, 1, colors.cyan);
                    log("", 0);

                    if (controllerMap.size === 0) {
                        warning("No active controllers found", 0);
                        info("This is normal if no controllers have been configured yet.", 0);
                    } else {
                        log(`Active Controllers: ${controllerMap.size}`, 1, colors.bright);
                        log("", 0);

                        let index = 0;
                        for (const [controller, worker] of controllerMap) {
                            log(`[${index}] Controller: ${controller}`, 1, colors.bright + colors.cyan);
                            log(`Worker/Minter: ${worker}`, 3, colors.green);

                            // Get worker's allowance if it's a minter
                            try {
                                const workerIsMinter = await token.isMinter(worker);
                                if (workerIsMinter) {
                                    const workerAllowance = await token.minterAllowance(worker);
                                    log(`Allowance:     ${ethers.formatUnits(workerAllowance, decimals)} ${symbol}`, 3);
                                } else {
                                    warning(`Worker is not an active minter (configure minter not called?)`, 3);
                                }
                            } catch (e) {
                                warning(`Could not read worker status: ${e.message}`, 3);
                            }

                            index++;
                        }
                    }
                } catch (e) {
                    error(`Could not enumerate controllers: ${e.message}`, 0);

                    if (e.message.includes("10000 blocks") || e.message.includes("block range")) {
                        log("", 0);
                        warning("Your RPC provider has block range limits. Try one of these solutions:", 0);
                        log("1. Use --from-block to start from a recent block:", 1, colors.cyan);
                        log(`yarn hardhat cam status --network ${network.name} --from-block ${toBlock - 10000}`, 2, colors.cyan);
                        log("2. Use a smaller chunk size:", 1, colors.cyan);
                        log(`yarn hardhat cam status --network ${network.name} --block-chunk-size 2000`, 2, colors.cyan);
                        log("3. Skip event scanning:", 1, colors.cyan);
                        log(`yarn hardhat cam status --network ${network.name} --skip-events`, 2, colors.cyan);
                    }
                }
            }

            // Summary
            header("Status Summary");
            success(`Network: ${network.name} (Chain ID: ${chainId})`, 0);
            success(`Token: ${name} (${symbol})`, 0);
            success(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`, 0);
            success(`Paused: ${isPaused ? "YES" : "NO"}`, 0);
            success(`Minters: ${minterCount}`, 0);
            success(`MasterMinter Owner: ${masterMinterOwner}`, 0);

            log("", 0);
        } catch (err) {
            error("Status check failed!", 0);
            error(err.message, 0);

            if (err.stack) {
                log("", 0);
                log("Stack trace:", 0, colors.red);
                console.error(err.stack);
            }

            process.exit(1);
        }
    });

camScope
    .task("configure-controller", "Configure a controller and its worker/minter (MasterMinter owner only)")
    .addParam("controller", "Controller address")
    .addParam("worker", "Worker/minter address managed by the controller")
    .addOptionalParam("deploymentId", "Deployment ID")
    .addOptionalParam("privateKey", "Private key of MasterMinter owner (prompted if not provided)")
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;

        try {
            header("Configure Controller");

            // Get network info
            const provider = ethers.provider;
            const networkInfo = await provider.getNetwork();
            const chainId = networkInfo.chainId;
            const deploymentId = taskArgs.deploymentId || `chain-${chainId}`;

            info(`Network: ${network.name} (Chain ID: ${chainId})`, 0);
            info(`Deployment ID: ${deploymentId}`, 0);

            // Load deployment
            const { masterMinterAddress } = await loadDeployment(deploymentId, ethers);

            // Get private key
            const privateKey = await getPrivateKey(taskArgs);
            const signer = await getSignerFromPrivateKey(privateKey, ethers);
            const signerAddress = await signer.getAddress();

            subheader("Transaction Details");
            log(`MasterMinter:   ${masterMinterAddress}`, 1, colors.bright);
            log(`Signer:         ${signerAddress}`, 1, colors.bright);
            log(`Controller:     ${taskArgs.controller}`, 1, colors.cyan);
            log(`Worker/Minter:  ${taskArgs.worker}`, 1, colors.cyan);

            // Get contract instance
            const masterMinter = await ethers.getContractAt("MasterMinter", masterMinterAddress, signer);

            // Check if signer is owner
            const owner = await masterMinter.owner();
            if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
                throw new Error(`Signer ${signerAddress} is not the MasterMinter owner.\nOwner is: ${owner}`);
            }

            success(`Signer is the MasterMinter owner`, 0);

            // Send transaction
            log("", 0);
            log("Sending transaction...", 0, colors.cyan);
            const tx = await masterMinter.configureController(taskArgs.controller, taskArgs.worker);
            info(`Transaction hash: ${tx.hash}`, 0);

            log("Waiting for confirmation...", 0, colors.cyan);
            const receipt = await tx.wait();

            header("Transaction Confirmed");
            success(`Block number: ${receipt.blockNumber}`, 0);
            success(`Gas used: ${receipt.gasUsed.toString()}`, 0);
            success(`Controller ${taskArgs.controller} configured with worker ${taskArgs.worker}`, 0);

            log("", 0);
        } catch (err) {
            error("Transaction failed!", 0);
            error(err.message, 0);

            if (err.stack) {
                log("", 0);
                log("Stack trace:", 0, colors.red);
                console.error(err.stack);
            }

            process.exit(1);
        }
    });

camScope
    .task("remove-controller", "Remove a controller (MasterMinter owner only)")
    .addParam("controller", "Controller address to remove")
    .addOptionalParam("deploymentId", "Deployment ID")
    .addOptionalParam("privateKey", "Private key of MasterMinter owner (prompted if not provided)")
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;

        try {
            header("Remove Controller");

            // Get network info
            const provider = ethers.provider;
            const networkInfo = await provider.getNetwork();
            const chainId = networkInfo.chainId;
            const deploymentId = taskArgs.deploymentId || `chain-${chainId}`;

            info(`Network: ${network.name} (Chain ID: ${chainId})`, 0);
            info(`Deployment ID: ${deploymentId}`, 0);

            // Load deployment
            const { masterMinterAddress } = await loadDeployment(deploymentId, ethers);

            // Get private key
            const privateKey = await getPrivateKey(taskArgs);
            const signer = await getSignerFromPrivateKey(privateKey, ethers);
            const signerAddress = await signer.getAddress();

            subheader("Transaction Details");
            log(`MasterMinter: ${masterMinterAddress}`, 1, colors.bright);
            log(`Signer:       ${signerAddress}`, 1, colors.bright);
            log(`Controller:   ${taskArgs.controller}`, 1, colors.cyan);

            // Get contract instance
            const masterMinter = await ethers.getContractAt("MasterMinter", masterMinterAddress, signer);

            // Check if signer is owner
            const owner = await masterMinter.owner();
            if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
                throw new Error(`Signer ${signerAddress} is not the MasterMinter owner.\nOwner is: ${owner}`);
            }

            success(`Signer is the MasterMinter owner`, 0);

            // Send transaction
            log("", 0);
            log("Sending transaction...", 0, colors.cyan);
            const tx = await masterMinter.removeController(taskArgs.controller);
            info(`Transaction hash: ${tx.hash}`, 0);

            log("Waiting for confirmation...", 0, colors.cyan);
            const receipt = await tx.wait();

            header("Transaction Confirmed");
            success(`Block number: ${receipt.blockNumber}`, 0);
            success(`Gas used: ${receipt.gasUsed.toString()}`, 0);
            success(`Controller ${taskArgs.controller} removed`, 0);

            log("", 0);
        } catch (err) {
            error("Transaction failed!", 0);
            error(err.message, 0);

            if (err.stack) {
                log("", 0);
                log("Stack trace:", 0, colors.red);
                console.error(err.stack);
            }

            process.exit(1);
        }
    });

camScope
    .task("configure-minter", "Configure minter allowance (Controller only)")
    .addParam("allowance", "Minting allowance (in token units, e.g., 1000000 for 1M tokens)")
    .addOptionalParam("deploymentId", "Deployment ID")
    .addOptionalParam("privateKey", "Private key of controller (prompted if not provided)")
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;

        try {
            header("Configure Minter Allowance");

            // Get network info
            const provider = ethers.provider;
            const networkInfo = await provider.getNetwork();
            const chainId = networkInfo.chainId;
            const deploymentId = taskArgs.deploymentId || `chain-${chainId}`;

            info(`Network: ${network.name} (Chain ID: ${chainId})`, 0);
            info(`Deployment ID: ${deploymentId}`, 0);

            // Load deployment
            const { proxyAddress, masterMinterAddress } = await loadDeployment(deploymentId, ethers);

            // Get private key
            const privateKey = await getPrivateKey(taskArgs);
            const signer = await getSignerFromPrivateKey(privateKey, ethers);
            const controllerAddress = await signer.getAddress();

            // Get token info for display
            const token = await ethers.getContractAt("BridgedCaminoV1", proxyAddress);
            const symbol = await token.symbol();
            const decimals = await token.decimals();

            // Get contract instance
            const masterMinter = await ethers.getContractAt("MasterMinter", masterMinterAddress, signer);

            // Get controller's worker
            const worker = await masterMinter.getWorker(controllerAddress);
            if (worker === ethers.ZeroAddress) {
                throw new Error(
                    `Address ${controllerAddress} is not a configured controller.\n` +
                        `Controllers must be configured by the MasterMinter owner first.`,
                );
            }

            // Parse allowance
            const allowanceWei = ethers.parseUnits(taskArgs.allowance, decimals);

            subheader("Transaction Details");
            log(`MasterMinter: ${masterMinterAddress}`, 1, colors.bright);
            log(`Controller:   ${controllerAddress}`, 1, colors.bright);
            log(`Worker:       ${worker}`, 1, colors.cyan);
            log(`New Allowance: ${ethers.formatUnits(allowanceWei, decimals)} ${symbol}`, 1, colors.cyan);

            // Send transaction
            log("", 0);
            log("Sending transaction...", 0, colors.cyan);
            const tx = await masterMinter.configureMinter(allowanceWei);
            info(`Transaction hash: ${tx.hash}`, 0);

            log("Waiting for confirmation...", 0, colors.cyan);
            const receipt = await tx.wait();

            header("Transaction Confirmed");
            success(`Block number: ${receipt.blockNumber}`, 0);
            success(`Gas used: ${receipt.gasUsed.toString()}`, 0);
            success(
                `Minter ${worker} configured with allowance: ${ethers.formatUnits(allowanceWei, decimals)} ${symbol}`,
                0,
            );

            log("", 0);
        } catch (err) {
            error("Transaction failed!", 0);
            error(err.message, 0);

            if (err.stack) {
                log("", 0);
                log("Stack trace:", 0, colors.red);
                console.error(err.stack);
            }

            process.exit(1);
        }
    });

camScope
    .task("remove-minter", "Remove controller's minter (Controller only)")
    .addOptionalParam("deploymentId", "Deployment ID")
    .addOptionalParam("privateKey", "Private key of controller (prompted if not provided)")
    .setAction(async (taskArgs, hre) => {
        const { ethers, network } = hre;

        try {
            header("Remove Minter");

            // Get network info
            const provider = ethers.provider;
            const networkInfo = await provider.getNetwork();
            const chainId = networkInfo.chainId;
            const deploymentId = taskArgs.deploymentId || `chain-${chainId}`;

            info(`Network: ${network.name} (Chain ID: ${chainId})`, 0);
            info(`Deployment ID: ${deploymentId}`, 0);

            // Load deployment
            const { masterMinterAddress } = await loadDeployment(deploymentId, ethers);

            // Get private key
            const privateKey = await getPrivateKey(taskArgs);
            const signer = await getSignerFromPrivateKey(privateKey, ethers);
            const controllerAddress = await signer.getAddress();

            // Get contract instance
            const masterMinter = await ethers.getContractAt("MasterMinter", masterMinterAddress, signer);

            // Get controller's worker
            const worker = await masterMinter.getWorker(controllerAddress);
            if (worker === ethers.ZeroAddress) {
                throw new Error(
                    `Address ${controllerAddress} is not a configured controller.\n` +
                        `Controllers must be configured by the MasterMinter owner first.`,
                );
            }

            subheader("Transaction Details");
            log(`MasterMinter: ${masterMinterAddress}`, 1, colors.bright);
            log(`Controller:   ${controllerAddress}`, 1, colors.bright);
            log(`Worker:       ${worker}`, 1, colors.cyan);

            // Send transaction
            log("", 0);
            log("Sending transaction...", 0, colors.cyan);
            const tx = await masterMinter.removeMinter();
            info(`Transaction hash: ${tx.hash}`, 0);

            log("Waiting for confirmation...", 0, colors.cyan);
            const receipt = await tx.wait();

            header("Transaction Confirmed");
            success(`Block number: ${receipt.blockNumber}`, 0);
            success(`Gas used: ${receipt.gasUsed.toString()}`, 0);
            success(`Minter ${worker} removed`, 0);

            log("", 0);
        } catch (err) {
            error("Transaction failed!", 0);
            error(err.message, 0);

            if (err.stack) {
                log("", 0);
                log("Stack trace:", 0, colors.red);
                console.error(err.stack);
            }

            process.exit(1);
        }
    });

module.exports = {};
