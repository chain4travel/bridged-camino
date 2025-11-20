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

async function getPrivateKey(taskArgs) {
    if (taskArgs.privateKey) {
        return taskArgs.privateKey;
    }

    // Prompt for private key without echoing to terminal
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        // Disable echo
        const stdin = process.stdin;
        if (stdin.isTTY) {
            stdin.setRawMode(true);
        }

        process.stdout.write(`${colors.yellow}Enter private key (input hidden): ${colors.reset}`);

        let privateKey = "";
        let reading = true;

        const onData = (char) => {
            if (!reading) return;

            const charStr = char.toString();

            if (charStr === "\n" || charStr === "\r" || charStr === "\u0004") {
                // Enter or Ctrl+D
                reading = false;
                if (stdin.isTTY) {
                    stdin.setRawMode(false);
                }
                stdin.removeListener("data", onData);
                rl.close();
                process.stdout.write("\n");
                resolve(privateKey.trim());
            } else if (charStr === "\u0003") {
                // Ctrl+C
                reading = false;
                if (stdin.isTTY) {
                    stdin.setRawMode(false);
                }
                stdin.removeListener("data", onData);
                rl.close();
                process.stdout.write("\n");
                error("Operation cancelled by user");
                process.exit(1);
            } else if (charStr === "\u007f" || charStr === "\b") {
                // Backspace
                if (privateKey.length > 0) {
                    privateKey = privateKey.slice(0, -1);
                }
            } else if (charStr >= " " && charStr <= "~") {
                // Printable characters
                privateKey += charStr;
            }
        };

        stdin.on("data", onData);
    });
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

            info(`Network: ${network.name}`);
            info(`Chain ID: ${chainId}`);
            info(`Deployment ID: ${deploymentId}`);

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
            log(`  Token Proxy:        ${proxyAddress}`, colors.bright);
            log(`  Implementation:     ${implAddress}`, colors.cyan);
            log(`  MasterMinter:       ${masterMinterAddress}`, colors.cyan);

            // Verify contracts exist at these addresses
            subheader("Verifying Contract Deployment");
            const proxyCode = await provider.getCode(proxyAddress);
            const masterMinterCode = await provider.getCode(masterMinterAddress);

            if (proxyCode === "0x") {
                throw new Error(
                    `No contract found at Token Proxy address: ${proxyAddress}\n\n` +
                        `This usually means:\n` +
                        `  1. The deployment was made to a different network\n` +
                        `  2. You're querying an ephemeral network (hardhat) instead of persistent (localhost)\n` +
                        `  3. The deployment ID doesn't match the current network\n\n` +
                        `Solutions:\n` +
                        `  - If deployed to localhost, add: --network localhost\n` +
                        `  - If deployed to a testnet/mainnet, specify: --network <network-name>\n` +
                        `  - Check available deployments in: ignition/deployments/`,
                );
            }

            if (masterMinterCode === "0x") {
                throw new Error(`No contract found at MasterMinter address: ${masterMinterAddress}`);
            }

            success("Contracts verified on-chain");

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

            log(`  Name:           ${name}`, colors.bright);
            log(`  Symbol:         ${symbol}`, colors.bright);
            log(`  Decimals:       ${decimals}`);
            log(`  Total Supply:   ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
            log(`  Paused:         ${isPaused ? "YES" : "NO"}`, isPaused ? colors.red : colors.green);

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
                log(`\n  ${role.name}:`, colors.bright);
                log(`    Role Hash:  ${role.value}`, colors.cyan);
                log(`    Members:    ${memberCount}`);

                if (memberCount > 0) {
                    for (let i = 0; i < memberCount; i++) {
                        const member = await token.getRoleMember(role.value, i);
                        log(`      [${i}] ${member}`, colors.green);
                    }
                } else {
                    log(`      (none)`, colors.yellow);
                }

                log("");
            }

            // MasterMinter Information
            subheader("MasterMinter Details");
            const masterMinterOwner = await masterMinter.owner();
            const minterManagerAddress = await masterMinter.getMinterManager();

            log(`  Contract:       ${masterMinterAddress}`, colors.bright);
            log(`  Owner:          ${masterMinterOwner}`, colors.bright);
            log(`  Minter Manager: ${minterManagerAddress}`, colors.cyan);

            // Check if owner is a contract (multisig, etc.)
            const ownerCode = await provider.getCode(masterMinterOwner);
            const isOwnerContract = ownerCode !== "0x";
            if (isOwnerContract) {
                info(`  Owner is a contract (likely a multisig or governance contract)`);
            } else {
                warning(`  Owner is an EOA (externally owned account)`);
            }

            // Minters Information
            subheader("Minters and Allowances");
            const MINTER_ROLE = await token.MINTER_ROLE();
            const minterCount = await token.getRoleMemberCount(MINTER_ROLE);

            if (minterCount === 0) {
                warning("No minters configured");
            } else {
                log(`  Total Minters: ${minterCount}\n`, colors.bright);

                for (let i = 0; i < minterCount; i++) {
                    const minter = await token.getRoleMember(MINTER_ROLE, i);
                    const allowance = await token.minterAllowance(minter);
                    const isMinter = await token.isMinter(minter);

                    log(`  [${i}] ${minter}`, colors.bright + colors.green);
                    log(`      Status:    ${isMinter ? "Active" : "Inactive"}`, isMinter ? colors.green : colors.red);
                    log(`      Allowance: ${ethers.formatUnits(allowance, decimals)} ${symbol}`);
                }
            }

            // Try to enumerate controllers via events
            subheader("Controllers Information");

            if (taskArgs.skipEvents) {
                warning("Event scanning skipped (--skip-events flag set)");
                info("Controllers cannot be enumerated without event scanning.");
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
                    log(
                        `  Scanning from deployment block ${fromBlock} to ${toBlock}... (${toBlock - fromBlock} blocks)`,
                        colors.cyan,
                    );
                    info(`  Deployment detected at block ${deploymentBlock}`);
                } else {
                    log(`  Scanning from block ${fromBlock} to ${toBlock}...`, colors.cyan);
                }

                if (blockChunkSize > 0 && toBlock - fromBlock > blockChunkSize) {
                    info(`  Large range detected. Will query in chunks of ${blockChunkSize} blocks.`);
                }

                try {
                    const configuredFilter = masterMinter.filters.ControllerConfigured();
                    const removedFilter = masterMinter.filters.ControllerRemoved();

                    let configuredEvents = [];
                    let removedEvents = [];

                    // Query in chunks if needed
                    if (blockChunkSize > 0 && toBlock - fromBlock > blockChunkSize) {
                        log(
                            `  Processing ${Math.ceil((toBlock - fromBlock) / blockChunkSize)} chunks...\n`,
                            colors.cyan,
                        );

                        for (let start = fromBlock; start <= toBlock; start += blockChunkSize) {
                            const end = Math.min(start + blockChunkSize - 1, toBlock);
                            log(`    Querying blocks ${start} to ${end}...`, colors.cyan);

                            const configuredChunk = await masterMinter.queryFilter(configuredFilter, start, end);
                            const removedChunk = await masterMinter.queryFilter(removedFilter, start, end);

                            configuredEvents = configuredEvents.concat(configuredChunk);
                            removedEvents = removedEvents.concat(removedChunk);
                        }

                        log(`  ✓ Completed chunked query\n`, colors.green);
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

                    log(`  Found ${configuredEvents.length} ControllerConfigured events`, colors.cyan);
                    log(`  Found ${removedEvents.length} ControllerRemoved events\n`, colors.cyan);

                    if (controllerMap.size === 0) {
                        warning("No active controllers found");
                        info("This is normal if no controllers have been configured yet.");
                    } else {
                        log(`  Active Controllers: ${controllerMap.size}\n`, colors.bright);

                        let index = 0;
                        for (const [controller, worker] of controllerMap) {
                            log(`  [${index}] Controller: ${controller}`, colors.bright + colors.cyan);
                            log(`      Worker/Minter: ${worker}`, colors.green);

                            // Get worker's allowance if it's a minter
                            try {
                                const workerIsMinter = await token.isMinter(worker);
                                if (workerIsMinter) {
                                    const workerAllowance = await token.minterAllowance(worker);
                                    log(
                                        `      Allowance:     ${ethers.formatUnits(workerAllowance, decimals)} ${symbol}`,
                                    );
                                } else {
                                    warning(`      Worker is not an active minter (configure minter not called?)`);
                                }
                            } catch (e) {
                                warning(`      Could not read worker status: ${e.message}`);
                            }

                            index++;
                        }
                    }
                } catch (e) {
                    error(`Could not enumerate controllers: ${e.message}`);

                    if (e.message.includes("10000 blocks") || e.message.includes("block range")) {
                        warning("\nYour RPC provider has block range limits. Try one of these solutions:");
                        log("  1. Use --from-block to start from a recent block:", colors.cyan);
                        log(
                            `     yarn hardhat cam status --network ${network.name} --from-block ${toBlock - 10000}`,
                            colors.cyan,
                        );
                        log("  2. Use a smaller chunk size:", colors.cyan);
                        log(
                            `     yarn hardhat cam status --network ${network.name} --block-chunk-size 2000`,
                            colors.cyan,
                        );
                        log("  3. Skip event scanning:", colors.cyan);
                        log(`     yarn hardhat cam status --network ${network.name} --skip-events`, colors.cyan);
                    }
                }
            }

            // Summary
            header("Status Summary");
            success(`Network: ${network.name} (Chain ID: ${chainId})`);
            success(`Token: ${name} (${symbol})`);
            success(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
            success(`Paused: ${isPaused ? "YES" : "NO"}`);
            success(`Minters: ${minterCount}`);
            success(`MasterMinter Owner: ${masterMinterOwner}`);

            log("");
        } catch (err) {
            error("Status check failed!");
            error(err.message);

            if (err.stack) {
                log("\nStack trace:", colors.red);
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

            info(`Network: ${network.name} (Chain ID: ${chainId})`);
            info(`Deployment ID: ${deploymentId}`);

            // Load deployment
            const { masterMinterAddress } = await loadDeployment(deploymentId, ethers);

            // Get private key
            const privateKey = await getPrivateKey(taskArgs);
            const signer = await getSignerFromPrivateKey(privateKey, ethers);
            const signerAddress = await signer.getAddress();

            subheader("Transaction Details");
            log(`  MasterMinter:   ${masterMinterAddress}`, colors.bright);
            log(`  Signer:         ${signerAddress}`, colors.bright);
            log(`  Controller:     ${taskArgs.controller}`, colors.cyan);
            log(`  Worker/Minter:  ${taskArgs.worker}`, colors.cyan);

            // Get contract instance
            const masterMinter = await ethers.getContractAt("MasterMinter", masterMinterAddress, signer);

            // Check if signer is owner
            const owner = await masterMinter.owner();
            if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
                throw new Error(`Signer ${signerAddress} is not the MasterMinter owner.\nOwner is: ${owner}`);
            }

            success(`Signer is the MasterMinter owner`);

            // Send transaction
            log("\nSending transaction...", colors.cyan);
            const tx = await masterMinter.configureController(taskArgs.controller, taskArgs.worker);
            info(`Transaction hash: ${tx.hash}`);

            log("Waiting for confirmation...", colors.cyan);
            const receipt = await tx.wait();

            header("Transaction Confirmed");
            success(`Block number: ${receipt.blockNumber}`);
            success(`Gas used: ${receipt.gasUsed.toString()}`);
            success(`Controller ${taskArgs.controller} configured with worker ${taskArgs.worker}`);

            log("");
        } catch (err) {
            error("Transaction failed!");
            error(err.message);

            if (err.stack) {
                log("\nStack trace:", colors.red);
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

            info(`Network: ${network.name} (Chain ID: ${chainId})`);
            info(`Deployment ID: ${deploymentId}`);

            // Load deployment
            const { masterMinterAddress } = await loadDeployment(deploymentId, ethers);

            // Get private key
            const privateKey = await getPrivateKey(taskArgs);
            const signer = await getSignerFromPrivateKey(privateKey, ethers);
            const signerAddress = await signer.getAddress();

            subheader("Transaction Details");
            log(`  MasterMinter: ${masterMinterAddress}`, colors.bright);
            log(`  Signer:       ${signerAddress}`, colors.bright);
            log(`  Controller:   ${taskArgs.controller}`, colors.cyan);

            // Get contract instance
            const masterMinter = await ethers.getContractAt("MasterMinter", masterMinterAddress, signer);

            // Check if signer is owner
            const owner = await masterMinter.owner();
            if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
                throw new Error(`Signer ${signerAddress} is not the MasterMinter owner.\nOwner is: ${owner}`);
            }

            success(`Signer is the MasterMinter owner`);

            // Send transaction
            log("\nSending transaction...", colors.cyan);
            const tx = await masterMinter.removeController(taskArgs.controller);
            info(`Transaction hash: ${tx.hash}`);

            log("Waiting for confirmation...", colors.cyan);
            const receipt = await tx.wait();

            header("Transaction Confirmed");
            success(`Block number: ${receipt.blockNumber}`);
            success(`Gas used: ${receipt.gasUsed.toString()}`);
            success(`Controller ${taskArgs.controller} removed`);

            log("");
        } catch (err) {
            error("Transaction failed!");
            error(err.message);

            if (err.stack) {
                log("\nStack trace:", colors.red);
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

            info(`Network: ${network.name} (Chain ID: ${chainId})`);
            info(`Deployment ID: ${deploymentId}`);

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
            log(`  MasterMinter: ${masterMinterAddress}`, colors.bright);
            log(`  Controller:   ${controllerAddress}`, colors.bright);
            log(`  Worker:       ${worker}`, colors.cyan);
            log(`  New Allowance: ${ethers.formatUnits(allowanceWei, decimals)} ${symbol}`, colors.cyan);

            // Send transaction
            log("\nSending transaction...", colors.cyan);
            const tx = await masterMinter.configureMinter(allowanceWei);
            info(`Transaction hash: ${tx.hash}`);

            log("Waiting for confirmation...", colors.cyan);
            const receipt = await tx.wait();

            header("Transaction Confirmed");
            success(`Block number: ${receipt.blockNumber}`);
            success(`Gas used: ${receipt.gasUsed.toString()}`);
            success(
                `Minter ${worker} configured with allowance: ${ethers.formatUnits(allowanceWei, decimals)} ${symbol}`,
            );

            log("");
        } catch (err) {
            error("Transaction failed!");
            error(err.message);

            if (err.stack) {
                log("\nStack trace:", colors.red);
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

            info(`Network: ${network.name} (Chain ID: ${chainId})`);
            info(`Deployment ID: ${deploymentId}`);

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
            log(`  MasterMinter: ${masterMinterAddress}`, colors.bright);
            log(`  Controller:   ${controllerAddress}`, colors.bright);
            log(`  Worker:       ${worker}`, colors.cyan);

            // Send transaction
            log("\nSending transaction...", colors.cyan);
            const tx = await masterMinter.removeMinter();
            info(`Transaction hash: ${tx.hash}`);

            log("Waiting for confirmation...", colors.cyan);
            const receipt = await tx.wait();

            header("Transaction Confirmed");
            success(`Block number: ${receipt.blockNumber}`);
            success(`Gas used: ${receipt.gasUsed.toString()}`);
            success(`Minter ${worker} removed`);

            log("");
        } catch (err) {
            error("Transaction failed!");
            error(err.message);

            if (err.stack) {
                log("\nStack trace:", colors.red);
                console.error(err.stack);
            }

            process.exit(1);
        }
    });

module.exports = {};
