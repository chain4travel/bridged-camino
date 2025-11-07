# Bridged Camino Documentation

Welcome to the Bridged Camino token documentation. This is a UUPS-upgradeable ERC20 token implementation with advanced minting controls based on the USDC pattern.

## Quick Start

### For Deployers

See [**Deployment Guide**](./DEPLOYMENT.md) for complete deployment instructions.

### For Developers

See [**Contract API Reference**](./api/index.md) for detailed contract documentation.

## Documentation

| Document                            | Description                                 |
| ----------------------------------- | ------------------------------------------- |
| [Deployment Guide](./DEPLOYMENT.md) | Complete deployment and configuration guide |
| [Contract API](./api/index.md)      | Auto-generated Solidity documentation       |
| [Project README](../README.md)      | Project overview and development guide      |

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

The system uses a three-tier minting hierarchy:

1. **Owner** (masterMinterOwner address) manages controllers via MasterMinter
2. **Controllers** (addresses/bots) manage individual minters and set allowances
3. **Minters** (bridge contracts) mint tokens within their allowance quotas

See [Deployment Guide](./DEPLOYMENT.md#architecture) for detailed architecture diagrams and role descriptions.

## Security

### Built-in Protections

- **Limited allowances** - Each minter has a quota
- **Role separation** - Different concerns managed by different addresses
- **Pausability** - Stop all transfers in emergency
- **Blacklisting** - Block specific addresses
- **Upgradeability** - Fix bugs without redeployment

### Best Practices

✅ Use multisig wallets for admin role addresses (strongly recommended)
✅ Set conservative minter allowances
✅ Monitor minter allowances regularly
✅ Have emergency procedures documented
✅ Test upgrades on testnet first
✅ Verify all contracts on block explorer

## Development

### Running Tests

```bash
yarn test                                 # Run all tests
yarn test test/BridgedCaminoV1.test.js    # Run specific test file
REPORT_GAS=true yarn test                 # With gas reporting
```

### Generating Documentation

```bash
yarn hardhat docgen
```

This generates `docs/api/index.md` with complete contract documentation.

### Building

```bash
yarn compile    # Compile contracts
yarn clean      # Clean artifacts
```

## Links

- **GitHub**: https://github.com/chain4travel/bridged-camino
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **API Reference**: [api/index.md](./api/index.md)

## License

BSD-3-Clause - See [LICENSE](../LICENSE) for details.
