# Deployment Guide

This guide covers deploying the BridgedCaminoV1 token with the MasterMinter controller-minter system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Deployment Steps](#deployment-steps)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Verification](#verification)
- [Security Checklist](#security-checklist)

## Overview

The deployment creates a complete token infrastructure with:

1. **BridgedCaminoV1** - UUPS upgradeable ERC20 token with role-based access control
2. **MasterMinter** - Controller-minter management system (USDC pattern)

### What Gets Deployed

```
┌─────────────────────────┐
│ BridgedCaminoV1 (Impl)  │ ← Implementation contract
└─────────────────────────┘

┌─────────────────────────┐
│ ERC1967 Proxy           │ ← Main token contract (users interact with this)
└─────────────────────────┘

┌─────────────────────────┐
│ MasterMinter            │ ← Minter management system
└─────────────────────────┘
```

## Architecture

### Role Hierarchy

The system uses a three-tier hierarchy for minting control:

```
┌──────────────────────────────┐
│  Owner Address               │  (masterMinterOwner, recommend multisig)
│  - Manages controllers       │
│  - Can remove controllers    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  MasterMinter Contract       │  (Has MINTER_ROLE_ADMIN on token)
│  - Grants/revokes MINTER_ROLE│
│  - Maps controllers → minters│
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Controller(s)               │  (EOA or automation bot)
│  - Manages 1 minter          │
│  - Sets allowances           │
│  - Can remove their minter   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Minter(s)                   │  (Bridge contracts)
│  - Has MINTER_ROLE           │
│  - Mints within allowance    │
│  - Each has quota limit      │
└──────────────────────────────┘
```

### Key Roles on BridgedCaminoV1

| Role                 | Holder                    | Purpose                                      |
| -------------------- | ------------------------- | -------------------------------------------- |
| `DEFAULT_ADMIN_ROLE` | Admin address             | Ultimate control, can grant any role admin   |
| `MINTER_ROLE_ADMIN`  | **MasterMinter contract** | Manages minters (grants/revokes MINTER_ROLE) |
| `MINTER_ROLE`        | Bridge contracts          | Can mint tokens within allowance             |
| `PAUSER_ROLE`        | Pauser address            | Can pause/unpause the token                  |
| `UPGRADER_ROLE`      | Upgrader address          | Can upgrade the implementation               |
| `BLACKLISTER_ROLE`   | Blacklister address       | Can blacklist/unblacklist addresses          |

**Note:** Using multisig wallets for role holders is strongly recommended for production security.

### MasterMinter Workflow

1. **Owner** (masterMinterOwner address) calls `configureController(controller, minter)`
    - Associates a controller address with a minter address

2. **Controller** (operations address/bot) calls `configureMinter(allowance)`
    - MasterMinter grants `MINTER_ROLE` to the minter
    - Sets the minter's allowance on the token

3. **Minter** (bridge contract) calls `token.mint(recipient, amount)`
    - Can mint up to their allowance
    - Allowance decreases with each mint

### Why This Pattern?

This three-tier system provides:

- **Separation of concerns**: Governance doesn't directly manage minters
- **Limited blast radius**: Each minter has an allowance quota
- **Operational flexibility**: Controllers can adjust allowances without governance
- **Security**: Compromised controller can only affect their minter
- **USDC-proven**: Battle-tested pattern managing billions of dollars

## Prerequisites

### 1. Addresses Required

Prepare the following addresses (multisigs recommended for production):

```javascript
{
  // Token roles
  "defaultAdmin": "0x...",        // Ultimate control (recommend multisig)
  "pauser": "0x...",              // Emergency pause (recommend multisig/bot)
  "upgrader": "0x...",            // Contract upgrades (recommend multisig)
  "blacklister": "0x...",         // Regulatory compliance (recommend multisig)

  // Role admins
  "pauserRoleAdmin": "0x...",     // Manages pausers (recommend multisig)
  "upgraderRoleAdmin": "0x...",   // Manages upgraders (recommend multisig)
  "blacklisterRoleAdmin": "0x...", // Manages blacklisters (recommend multisig)

  // MasterMinter
  "masterMinterOwner": "0x..."    // Manages controllers (recommend multisig)
}
```

**Security Note:** Using multisig wallets (e.g., Gnosis Safe) for admin addresses is strongly recommended for production deployments to prevent single points of failure.

### 2. Configuration File

Copy the example parameters file and update with your addresses:

```bash
# Create network-specific parameters file
cp ignition/modules/exampleParameters.json ignition/modules/<network>Parameters.json

# Edit the file with your addresses
# Example: caminoParameters.json, columbusParameters.json
```

Update your network parameters file with the correct addresses:

```json
{
    "BridgedCaminoV1Module": {
        "name": "Bridged Camino",
        "symbol": "WCAM.c",
        "defaultAdmin": "0x...",           // Ultimate control
        "pauser": "0x...",                 // Emergency pause
        "upgrader": "0x...",               // Contract upgrades
        "blacklister": "0x...",            // Compliance
        "pauserRoleAdmin": "0x...",        // Manages pausers
        "upgraderRoleAdmin": "0x...",      // Manages upgraders
        "blacklisterRoleAdmin": "0x...",   // Manages blacklisters
        "masterMinterOwner": "0x..."       // Manages controllers
    }
}
```

### 3. Network Configuration

Ensure `hardhat.config.js` has correct network settings:

```javascript
networks: {
  yourNetwork: {
    url: "https://...",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY], // Deployer needs only gas
  }
}
```

## Deployment Steps

### Step 1: Deploy Everything

```bash
npx hardhat ignition deploy ignition/modules/BridgedCaminoV1.js \
  --network <network> \
  --parameters ignition/modules/<network>Parameters.json
```

Example for Camino mainnet:
```bash
npx hardhat ignition deploy ignition/modules/BridgedCaminoV1.js \
  --network camino \
  --parameters ignition/modules/caminoParameters.json
```

**What This Does (Atomically):**

1. Deploys MasterMinter with deployer as temporary owner
2. Deploys BridgedCaminoV1 implementation
3. Deploys ERC1967 Proxy and initializes token
    - MasterMinter receives `MINTER_ROLE_ADMIN`
    - All role holders are configured
4. Calls `setMinterManager()` on MasterMinter to connect it to the token
5. Transfers MasterMinter ownership to `masterMinterOwner`

**Result:** Deployer has **zero privileges** after completion.

### Step 2: Note Deployed Addresses

Save the deployment output:

```
BridgedCaminoV1 Proxy: 0x...
BridgedCaminoV1 Implementation: 0x...
MasterMinter: 0x...
```

### Step 3: Verify Deployment State

```bash
# Check token roles
cast call <PROXY_ADDRESS> "hasRole(bytes32,address)" \
  $(cast keccak "MINTER_ROLE_ADMIN()") <MASTER_MINTER_ADDRESS>
# Should return: true

# Check MasterMinter owner
cast call <MASTER_MINTER_ADDRESS> "owner()"
# Should return: <masterMinterOwner>

# Check MasterMinter points to token
cast call <MASTER_MINTER_ADDRESS> "getMinterManager()"
# Should return: <PROXY_ADDRESS>
```

## Post-Deployment Configuration

### Adding Your First Minter (Bridge)

#### Option A: Using Cast (CLI)

```bash
# 1. Configure controller → minter mapping (from masterMinterOwner multisig)
cast send <MASTER_MINTER_ADDRESS> \
  "configureController(address,address)" \
  <CONTROLLER_ADDRESS> \
  <BRIDGE_ADDRESS> \
  --from <MASTER_MINTER_OWNER>

# 2. Set initial allowance (from controller)
cast send <MASTER_MINTER_ADDRESS> \
  "configureMinter(uint256)" \
  1000000000000000000000 \  # 1000 tokens (18 decimals)
  --from <CONTROLLER_ADDRESS>
```

#### Option B: Using Ethers.js Script

```javascript
const masterMinter = await ethers.getContractAt("MasterMinter", MASTER_MINTER_ADDRESS);
const token = await ethers.getContractAt("BridgedCaminoV1", TOKEN_PROXY_ADDRESS);

// 1. Owner configures controller
await masterMinter.connect(owner).configureController(controllerAddress, bridgeAddress);

// 2. Controller sets allowance
await masterMinter.connect(controller).configureMinter(
    ethers.parseEther("1000"), // 1000 token allowance
);

// 3. Verify bridge can mint
console.log("Is minter:", await token.isMinter(bridgeAddress));
console.log("Allowance:", await token.minterAllowance(bridgeAddress));
```

### Managing Minters

#### Increase Allowance

```javascript
// Controller can increment without re-approval
await masterMinter.connect(controller).incrementMinterAllowance(
    ethers.parseEther("500"), // Add 500 more tokens
);
```

#### Decrease Allowance

```javascript
// Controller can decrease (e.g., to phase out a bridge)
await masterMinter.connect(controller).decrementMinterAllowance(ethers.parseEther("200"));
```

#### Remove Minter

**Normal removal** (controller removes their own minter):
```javascript
await masterMinter.connect(controller).removeMinter();
```

**Emergency removal** (if controller is compromised/unresponsive):

The MasterMinter owner can assign the compromised minter to an emergency controller:

```javascript
// 1. Owner assigns emergency controller to the compromised minter
await masterMinter.connect(owner).configureController(
  emergencyController,
  compromisedMinterAddress
);

// 2. Emergency controller removes the minter
await masterMinter.connect(emergencyController).removeMinter();
```

**Pro tip:** Pre-sign the removal transaction and keep it ready for instant broadcast in emergencies.

**⚠️ Important:** Simply calling `removeController()` does NOT remove the minter from the token! The minter will still have `MINTER_ROLE` and can continue minting. Always use `removeMinter()` to actually revoke the minting capability.

## Final State After Deployment

### Token Contract (Proxy)

```
Address: 0x... (ERC1967 Proxy)

Roles:
├─ DEFAULT_ADMIN_ROLE → defaultAdmin address
├─ PAUSER_ROLE → pauser address
├─ UPGRADER_ROLE → upgrader address
├─ BLACKLISTER_ROLE → blacklister address
├─ MINTER_ROLE_ADMIN → MasterMinter contract ⭐
└─ MINTER_ROLE → (none initially, controllers add them)

State:
├─ Total Supply: 0
├─ Paused: false
└─ Owner: N/A (no Ownable, uses AccessControl)
```

### MasterMinter Contract

```
Address: 0x...

State:
├─ Owner → masterMinterOwner address
├─ Minter Manager → BridgedCaminoV1 Proxy
├─ Controllers → (none initially)
└─ Has MINTER_ROLE_ADMIN on token ⭐

Can do:
├─ Configure controllers (owner only)
├─ Remove controllers (owner only)
└─ Controllers can manage their minters
```

### Deployer

```
Privileges: NONE ✅
The deployer has zero control after deployment completes.
```

## Verification

### On-Chain Verification

```bash
# Verify implementation
npx hardhat verify --network <network> <IMPLEMENTATION_ADDRESS>

# Verify proxy (requires constructor args)
npx hardhat verify --network <network> <PROXY_ADDRESS> \
  <IMPLEMENTATION_ADDRESS> <INIT_DATA_HASH>

# Verify MasterMinter
npx hardhat verify --network <network> <MASTER_MINTER_ADDRESS> \
  <TOKEN_PROXY_ADDRESS> <MASTER_MINTER_OWNER>
```

### Functional Verification

```javascript
// 1. Check roles
await token.hasRole(MINTER_ROLE_ADMIN, masterMinterAddress); // true
await token.isMinter(someAddress); // false (no minters yet)

// 2. Check MasterMinter
await masterMinter.owner(); // masterMinterOwner
await masterMinter.getMinterManager(); // token proxy address

// 3. Try minting (should fail, no minters)
await expect(token.mint(recipient, 100)).to.be.reverted;
```

## Security Checklist

Before going to production:

- [ ] All admin role addresses are multisigs (recommended, not EOAs)
- [ ] Deployer address has no roles after deployment
- [ ] MasterMinter has `MINTER_ROLE_ADMIN` on the token
- [ ] MasterMinter points to correct token address
- [ ] MasterMinter owner is properly configured
- [ ] Test pause/unpause functionality
- [ ] Test blacklist functionality
- [ ] Test upgrade mechanism (on testnet)
- [ ] Controllers are trusted addresses/systems
- [ ] Minter allowances follow principle of least privilege
- [ ] Emergency procedures are documented and tested
- [ ] All contracts are verified on block explorer
- [ ] Deployment artifacts are backed up

## Emergency Procedures

### Pause Token Transfers

```javascript
// From pauser account
await token.connect(pauser).pause();
```

### Remove Compromised Minter

**If controller is responsive:**
```javascript
await masterMinter.connect(controller).removeMinter();
```

**If controller is compromised/unresponsive:**
```javascript
// 1. MasterMinter owner assigns emergency controller
await masterMinter.connect(owner).configureController(
  emergencyController,
  compromisedMinterAddress
);

// 2. Emergency controller removes the minter
await masterMinter.connect(emergencyController).removeMinter();
```

**Fallback (requires DEFAULT_ADMIN_ROLE):**
```javascript
// If MasterMinter owner is unavailable, DEFAULT_ADMIN_ROLE can remove by granting itself permission
// 1. Grant MINTER_ROLE_ADMIN to self
const MINTER_ROLE_ADMIN = await token.MINTER_ROLE_ADMIN();
await token.connect(defaultAdmin).grantRole(MINTER_ROLE_ADMIN, defaultAdmin.address);

// 2. Remove the minter
await token.connect(defaultAdmin).removeMinter(compromisedMinterAddress);

// 3. (Optional) Revoke MINTER_ROLE_ADMIN from self to restore separation
await token.connect(defaultAdmin).revokeRole(MINTER_ROLE_ADMIN, defaultAdmin.address);
```

**Best practice:** Pre-sign emergency removal transactions and keep them ready for instant execution.

### Blacklist Compromised Address

```javascript
await token.connect(blacklister).blacklist(compromisedAddress);
```

### Emergency Upgrade

```javascript
// 1. Deploy new implementation
const newImpl = await BridgedCaminoV2.deploy();

// 2. Upgrade via upgrader role
await token.connect(upgrader).upgradeToAndCall(
    newImpl.address,
    "0x", // No initialization call
);
```

## Support

For issues or questions:

- GitHub: https://github.com/chain4travel/bridged-camino
- Documentation: See `docs/` folder
- Contract API: See `api/index.md`
