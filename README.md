# Bridged Camino

This repository contains the smart contracts for WCAM ERC20 tokens on EVM-compatible chains.

## Naming

The token should be named as follows:

- Token name: `BridgedCamino`
- Token symbol:
    - If deployed and managed by a third-party bridge (not Camino Network Foundation): `WCAM.c` (`.c` indicates it's a bridged token originating from the `Camino` chain)
    - If deployed and managed by the Camino Network Foundation: `WCAM`

## Fork this Repository

To use this repository as a base for your Bridged Camino token, fork it.

## Deployment

### Install Dependencies

Run `yarn` to install dependencies:

```
yarn
```

<details>
<summary>Example output:</summary>

```
yarn install v1.22.22
[1/4] Resolving packages...
[2/4] Fetching packages...
[3/4] Linking dependencies...
warning " > @nomicfoundation/hardhat-ignition-ethers@0.15.9" has unmet peer dependency "@nomicfoundation/ignition-core@^0.15.9".
warning " > @nomicfoundation/hardhat-toolbox@5.0.0" has unmet peer dependency "@types/chai@^4.2.0".
warning " > @nomicfoundation/hardhat-toolbox@5.0.0" has unmet peer dependency "@types/mocha@>=9.1.0".
warning " > @nomicfoundation/hardhat-toolbox@5.0.0" has unmet peer dependency "@types/node@>=18.0.0".
warning " > @nomicfoundation/hardhat-toolbox@5.0.0" has unmet peer dependency "ts-node@>=8.0.0".
warning " > @nomicfoundation/hardhat-toolbox@5.0.0" has unmet peer dependency "typescript@>=4.5.0".
warning " > @typechain/ethers-v6@0.5.1" has unmet peer dependency "typescript@>=4.7.0".
warning "@typechain/ethers-v6 > ts-essentials@7.0.3" has unmet peer dependency "typescript@>=3.7.0".
warning " > typechain@8.3.2" has unmet peer dependency "typescript@>=4.3.0".
[4/4] Building fresh packages...
Done in 6.82s.
```

</details>

### Run tests

Please run the following command to test the contracts:

```
yarn test
```

<details>
<summary>Example output:</summary>

```
yarn run v1.22.22
$ REPORT_GAS=true yarn hardhat test
$ /home/ekrem/tmp/bridged-camino/node_modules/.bin/hardhat test
Compiled 42 Solidity files successfully (evm target: paris).
 ·----------------------------|--------------------------------|--------------------------------·
 |  Solc version: 0.8.28      ·  Optimizer enabled: true       ·  Runs: 10000                   │
 ·····························|································|·································
 |  Contract Name             ·  Deployed size (KiB) (change)  ·  Initcode size (KiB) (change)  │
 ·····························|································|·································
 |  Address                   ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  Panic                     ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  StorageSlot               ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  Errors                    ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  Strings                   ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  ERC1967Utils              ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  MessageHashUtils          ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  SignedMath                ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  SafeCast                  ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  ECDSA                     ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  EnumerableSet             ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  Math                      ·                      0.084 ()  ·                      0.138 ()  │
 ·····························|································|·································
 |  ERC1967Proxy              ·                      0.179 ()  ·                      1.028 ()  │
 ·····························|································|·································
 |  BridgedCaminoV1           ·                     15.231 ()  ·                     15.479 ()  │
 ·····························|································|·································
 |  BridgedCaminoUpgradeTest  ·                     15.311 ()  ·                     15.558 ()  │
 ·----------------------------|--------------------------------|--------------------------------·

BridgedCaminoV1
Deployment
✔ Should set the right name and symbol
✔ Should set the right decimals
✔ Should set the right total supply
✔ Should set the right roles
✔ Should revert calling initialize twice
✔ Check eip712Domain
Upgrade
✔ Should upgrade
✔ Should revert calling upgradeToAndCall from non-upgrader
Mint
✔ Should mint tokens
✔ Should revert if not minter
✔ Should revert configure minter if not minter admin
✔ Should revert if amount exceeds minter allowance
✔ Should revert when paused
✔ Should remove minter correctly
✔ Should revert if remove minter if not minter admin
Burn
✔ Should burn correctly
✔ Should revert if burn more than balance
✔ Should revert burn if not minter
✔ Should revert burn when paused
✔ Should burnFrom correctly
✔ Should revert burnFrom if not minter
✔ Should revert burnFrom when paused
Pause
✔ Should pause and unpause the contract
✔ Should revert pause/unpause if not pauser
Blacklist
✔ Should blacklist and unblacklist an account
✔ Should revert mint with blacklisted to and msg.sender
✔ Should revert burn with blacklisted msg.sender
✔ Should revert burnFrom with blacklisted from and msg.sender
✔ Should revert blacklist/unblacklist with non-blacklister
✔ Should get blacklisted accounts correctly
✔ Should revert transfer with blacklisted from/to
✔ Should revert transferFrom with blacklisted from/to/spender

·----------------------------------------|---------------------------|---------------|-----------------------------·
| Solc version: 0.8.28 · Optimizer enabled: true · Runs: 10000 · Block limit: 30000000 gas │
·········································|···························|···············|······························
| Methods │
····················|····················|·············|·············|···············|···············|··············
| Contract · Method · Min · Max · Avg · # calls · usd (avg) │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · approve · 39215 · 56015 · 52631 · 10 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · blacklist · 52489 · 52501 · 52494 · 22 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · burn · - · - · 49953 · 5 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · burnFrom · 47008 · 58687 · 51680 · 5 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · configureMinter · - · - · 146874 · 4 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · grantRole · 123266 · 123278 · 123273 · 10 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · mint · 57610 · 91882 · 88335 · 34 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · pause · - · - · 51931 · 8 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · removeMinter · - · - · 46884 · 3 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · transfer · 46257 · 63381 · 51969 · 6 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · transferFrom · 49079 · 70135 · 59607 · 4 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · unBlacklist · 30581 · 30593 · 30584 · 16 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · unpause · - · - · 29966 · 2 · - │
····················|····················|·············|·············|···············|···············|··············
| BridgedCaminoV1 · upgradeToAndCall · - · - · 37733 · 2 · - │
····················|····················|·············|·············|···············|···············|··············
| Deployments · · % of limit · │
·········································|·············|·············|···············|···············|··············
| BridgedCaminoUpgradeTest · - · - · 3447039 · 11.5 % · - │
·········································|·············|·············|···············|···············|··············
| BridgedCaminoV1 · - · - · 3429872 · 11.4 % · - │
·········································|·············|·············|···············|···············|··············
| ERC1967Proxy · - · - · 633206 · 2.1 % · - │
·----------------------------------------|-------------|-------------|---------------|---------------|-------------·

32 passing (2s)

Done in 4.79s.

```

</details>

### Edit ignition module parameters for the deployment

Update the parameters file `ignition/modules/bridgedCaminoParameters.json` with your
information for symbol and addresses.

### Set deployer private key

You need to set a RPC URL and a deployer for your specific chain in the `hardhat.config.js`
file.

For example, there are already options for the Amoy testnet of Polygon. To set the deployer
private key you need to use the command below:

```
yarn hardhat vars set AMOY_DEPLOYER_PRIVATE_KEY
```

This will save the variable into the file `$HOME/.config/hardhat-nodejs/vars.json`.

You can use the command below to see how to set variables and which are already set:

```
yarn hardhat vars setup
```

<details>
<summary>Example output:</summary>

```
yarn run v1.22.22
$ /hgst/work/github.com/havan/bridged-camino/node_modules/.bin/hardhat vars setup
The following configuration variables are optional:

  npx hardhat vars set AMOY_DEPLOYER_PRIVATE_KEY
  npx hardhat vars set COLUMBUS_URL
  npx hardhat vars set CAMINO_URL
  npx hardhat vars set AMOY_URL

Configuration variables already set:

  Optional:
    COLUMBUS_DEPLOYER_PRIVATE_KEY
    CAMINO_DEPLOYER_PRIVATE_KEY

Done in 0.50s.
```

</details>

### Deploy the Contract

You can deploy the contract to the selected network using the command below. Update
`<network>` with your desired network that you have added to the `hardhat.config.js`
file.

```
yarn hardhat ignition deploy ignition/modules/BridgedCaminoV1.js --parameters ignition/modules/bridgedCaminoParameters.json --network <network>
```

Deployment artifacts will be saved to `ignition/deployments/chain-<chainID>`.

> [!IMPORTANT]
>
> **It is recommended to also push these artifacts to your repository.**

<details>
<summary>Example output for localhost (using `yarn hardhat node`):</summary>

```
yarn run v1.22.22
$ /hgst/work/github.com/havan/bridged-camino/node_modules/.bin/hardhat ignition deploy ignition/modules/BridgedCaminoV1.js --parameters ignition/modules/bridgedCaminoParameters.json --network localhost
 ·----------------------------|--------------------------------|--------------------------------·
 |  Solc version: 0.8.28      ·  Optimizer enabled: true       ·  Runs: 10000                   │
 ·····························|································|·································
 |  Contract Name             ·  Deployed size (KiB) (change)  ·  Initcode size (KiB) (change)  │
 ·····························|································|·································
 |  Errors                    ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Panic                     ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Address                   ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Strings                   ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  StorageSlot               ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  ERC1967Utils              ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  ECDSA                     ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  SignedMath                ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  SafeCast                  ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Math                      ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  MessageHashUtils          ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  EnumerableSet             ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  ERC1967Proxy              ·                 0.179 (0.000)  ·                 1.028 (0.000)  │
 ·····························|································|·································
 |  BridgedCaminoV1           ·                15.231 (0.000)  ·                15.479 (0.000)  │
 ·····························|································|·································
 |  BridgedCaminoUpgradeTest  ·                15.311 (0.000)  ·                15.558 (0.000)  │
 ·----------------------------|--------------------------------|--------------------------------·
Hardhat Ignition 🚀

Deploying [ BridgedCaminoV1Module ]

Batch #1
  Executed BridgedCaminoV1Module#BridgedCaminoV1

Batch #2
  Executed BridgedCaminoV1Module#encodeFunctionCall(BridgedCaminoV1Module#BridgedCaminoV1.initialize)

Batch #3
  Executed BridgedCaminoV1Module#ERC1967Proxy

Batch #4
  Executed BridgedCaminoV1Module#BridgedCaminoV1Proxy

[ BridgedCaminoV1Module ] successfully deployed 🚀

Deployed Addresses

BridgedCaminoV1Module#BridgedCaminoV1 - 0x5FbDB2315678afecb367f032d93F642f64180aa3
BridgedCaminoV1Module#ERC1967Proxy - 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
BridgedCaminoV1Module#BridgedCaminoV1Proxy - 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Done in 1.94s.
```

</details>
