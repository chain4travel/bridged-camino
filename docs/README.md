# Bridged Camino Documentation

Welcome to the Bridged Camino token documentation. This is a UUPS-upgradeable ERC20 token implementation with advanced minting controls based on the USDC pattern.

## Quick Start

### For Deployers

See [**Deployment Guide**](./DEPLOYMENT.md) for complete deployment instructions.

Quick deploy:

```bash
npx hardhat ignition deploy ignition/modules/BridgedCaminoV1.js \
  --network <network> \
  --parameters ignition/modules/exampleParameters.json
```

### For Developers

See [**Contract API Reference**](./API.md) for detailed contract documentation.

## Documentation

| Document                            | Description                                 |
| ----------------------------------- | ------------------------------------------- |
| [Deployment Guide](./DEPLOYMENT.md) | Complete deployment and configuration guide |
| [Contract API](./API.md)            | Auto-generated Solidity documentation       |
| [README](../README.md)              | Project overview and development guide      |

## Key Features

### Token Features (BridgedCaminoV1)

- ✅ **UUPS Upgradeable** - Upgrade logic while maintaining same address
- ✅ **Role-Based Access Control** - Granular permission system
- ✅ **Pausable** - Emergency stop mechanism
- ✅ **Blacklistable** - Regulatory compliance
- ✅ **Burnable** - Supply reduction by authorized minters
- ✅ **Permit (EIP-2612)** - Gasless approvals

### Minting System (MasterMinter)

- ✅ **Controller-Minter Pattern** - Three-tier hierarchy (USDC-proven)
- ✅ **Allowance Quotas** - Limited blast radius per minter
- ✅ **Multiple Controllers** - Operational flexibility
- ✅ **Emergency Removal** - Can revoke compromised minters

## Architecture

### Token Architecture

```
┌─────────────────────────┐
│  ERC1967 Proxy          │ ← Users interact here
│  (Your token address)   │
└───────────┬─────────────┘
            │ delegates to
            ▼
┌─────────────────────────┐
│  BridgedCaminoV1        │ ← Implementation (upgradeable)
│  (Logic contract)       │
└─────────────────────────┘
```

### Minting Architecture

```
Governance Multisig
        │
        │ owns
        ▼
┌──────────────────┐
│  MasterMinter    │ ← Has MINTER_ROLE_ADMIN
└────────┬─────────┘
         │ manages
         ▼
   Controllers ────────┐
    (EOAs/Bots)        │ configure
         │             │
         │             ▼
         │      ┌──────────────┐
         └─────→│  Minters     │ ← Have MINTER_ROLE
                │  (Bridges)   │
                └──────┬───────┘
                       │ mint tokens
                       ▼
                ┌──────────────┐
                │  Recipients  │
                └──────────────┘
```

## Roles & Permissions

### Token Roles

| Role                 | Purpose           | Recommended Holder        |
| -------------------- | ----------------- | ------------------------- |
| `DEFAULT_ADMIN_ROLE` | Ultimate control  | Governance multisig       |
| `MINTER_ROLE_ADMIN`  | Manages minters   | **MasterMinter contract** |
| `MINTER_ROLE`        | Can mint tokens   | Bridge contracts          |
| `PAUSER_ROLE`        | Emergency pause   | Ops multisig/bot          |
| `UPGRADER_ROLE`      | Contract upgrades | Governance multisig       |
| `BLACKLISTER_ROLE`   | Compliance        | Compliance multisig       |

### MasterMinter Roles

| Role       | Purpose             | Recommended Holder  |
| ---------- | ------------------- | ------------------- |
| `owner`    | Manages controllers | Governance multisig |
| Controller | Manages 1 minter    | Operations EOA/bot  |
| Minter     | Mints tokens        | Bridge contract     |

## Workflows

### Adding a New Bridge

1. **Governance** calls `MasterMinter.configureController(controller, bridge)`
2. **Controller** calls `MasterMinter.configureMinter(allowance)`
3. **Bridge** can now call `Token.mint(recipient, amount)`

See [Deployment Guide](./DEPLOYMENT.md#post-deployment-configuration) for details.

### Emergency Minter Removal

```javascript
// Option 1: Controller removes their minter
await masterMinter.connect(controller).removeMinter();

// Option 2: Owner assigns emergency controller to compromised minter
await masterMinter.connect(owner).configureController(emergencyController, compromisedMinter);
await masterMinter.connect(emergencyController).removeMinter();

// Option 3: DEFAULT_ADMIN_ROLE directly removes (fallback)
await token.connect(defaultAdmin).removeMinter(bridgeAddress);
```

## Security

### Built-in Protections

- **Limited allowances** - Each minter has a quota
- **Role separation** - Different concerns managed by different addresses
- **Pausability** - Stop all transfers in emergency
- **Blacklisting** - Block specific addresses
- **Upgradeability** - Fix bugs without redeployment

### Best Practices

✅ Use multisigs for all admin roles
✅ Set conservative minter allowances
✅ Monitor minter allowances regularly
✅ Have emergency procedures documented
✅ Test upgrades on testnet first
✅ Verify all contracts on block explorer

## Development

### Running Tests

```bash
yarn test                    # Run all tests
yarn test test/Controller    # Run specific test file
REPORT_GAS=true yarn test   # With gas reporting
```

### Generating Documentation

```bash
yarn hardhat docgen
```

This generates `docs/API.md` with complete contract documentation.

### Building

```bash
yarn compile    # Compile contracts
yarn clean      # Clean artifacts
```

## Links

- **GitHub**: https://github.com/chain4travel/bridged-camino
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **API Reference**: [API.md](./API.md)

## License

BSD-3-Clause - See [LICENSE](../LICENSE) for details.
