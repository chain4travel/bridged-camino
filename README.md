# Bridged Camino

This repository contains the smart contracts for CAM ERC20 tokens on
EVM-compatible chains.

## Naming

The token should be named as follows:

- Token name:
    - `Bridged Camino (Third-Party Team)` if deployed and managed by a
      third-party bridge/team.
    - `Camino Token` if deployed and managed by Camino Network Foundation.
- Token symbol:
    - If deployed and managed by a third-party bridge/team (not Camino Network
      Foundation): `CAM.c` (`.c` indicates it's a bridged token originating from
      the `Camino` chain)
    - If deployed and managed by the Camino Network Foundation: `CAM`

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
yarn run v1.22.19
$ yarn hardhat test
$ /hgst/work/github.com/chain4travel/bridged-camino/node_modules/.bin/hardhat test
 ·----------------------------|--------------------------------|--------------------------------·
 |  Solc version: 0.8.28      ·  Optimizer enabled: true       ·  Runs: 10000                   │
 ·····························|································|·································
 |  Contract Name             ·  Deployed size (KiB) (change)  ·  Initcode size (KiB) (change)  │
 ·····························|································|·································
 |  Comparators               ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Arrays                    ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  StorageSlot               ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Address                   ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  SlotDerivation            ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Errors                    ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Panic                     ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Strings                   ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  ERC1967Utils              ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  SafeCast                  ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  SignedMath                ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  EnumerableMap             ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  ECDSA                     ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  Math                      ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  EnumerableSet             ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  MessageHashUtils          ·                 0.084 (0.000)  ·                 0.138 (0.000)  │
 ·····························|································|·································
 |  ERC1967Proxy              ·                 0.179 (0.000)  ·                 1.028 (0.000)  │
 ·····························|································|·································
 |  Controller                ·                 2.491 (0.000)  ·                 2.738 (0.000)  │
 ·····························|································|·································
 |  MintController            ·                 5.477 (0.000)  ·                 5.799 (0.000)  │
 ·····························|································|·································
 |  MasterMinter              ·                 5.477 (0.000)  ·                 5.803 (0.000)  │
 ·····························|································|·································
 |  BridgedCaminoV1           ·                15.778 (0.000)  ·                16.025 (0.000)  │
 ·····························|································|·································
 |  BridgedCaminoUpgradeTest  ·                15.857 (0.000)  ·                16.104 (0.000)  │
 ·----------------------------|--------------------------------|--------------------------------·


  BridgedCaminoV1
    Deployment
      ✔ Should set the right name and symbol (706ms)
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
      ✔ Should allow burn when paused for emergency response
      ✔ Should burnFrom correctly (38ms)
      ✔ Should revert burnFrom if not minter
      ✔ Should allow burnFrom when paused for emergency response
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
      ✔ Should revert transfer with blacklisted from/to (44ms)
      ✔ Should revert transferFrom with blacklisted from/to/spender (56ms)

  Controller
    Deployment
      ✔ Should set the correct owner
    configureController
      ✔ Should allow owner to configure a controller
      ✔ Should allow reconfiguring an existing controller with a different worker
      ✔ Should allow multiple controllers to manage the same worker
      ✔ Should revert if controller address is zero
      ✔ Should revert if worker address is zero
      ✔ Should revert if called by non-owner
    removeController
      ✔ Should allow owner to remove a controller
      ✔ Should revert if controller address is zero
      ✔ Should revert if controller doesn't exist
      ✔ Should revert if called by non-owner
    getWorker
      ✔ Should return the correct worker for a controller
      ✔ Should return zero address for unconfigured controller
    getControllerAt
      ✔ Should return the correct controller and worker at a specific index
      ✔ Should revert with IndexOutOfBounds when index is too high
      ✔ Should revert with IndexOutOfBounds when list is empty
    onlyController modifier
      ✔ Should allow configured controllers to access protected functions

  MasterMinter
    Deployment
      ✔ Should set the correct owner (59ms)
      ✔ Should set the correct minter manager
      ✔ Should inherit from MintController
    Controller functionality
      ✔ Should allow owner to configure controllers
      ✔ Should allow owner to remove controllers
    MintController functionality
      ✔ Should allow controllers to configure minters
      ✔ Should allow controllers to increment minter allowances
      ✔ Should allow controllers to decrement minter allowances
      ✔ Should allow controllers to remove minters
    Multi-controller scenario
      ✔ Should support multiple controllers managing different minters
      ✔ Should allow owner to update minter manager for all controllers
    End-to-end workflow
      ✔ Should support complete lifecycle: configure -> mint -> adjust -> remove

  MintController
    Deployment
      ✔ Should set the correct owner (61ms)
      ✔ Should set the correct minter manager
      ✔ Should allow deployment with zero address for atomic deployment pattern
      ✔ Should require setMinterManager before use when deployed with zero address
    setMinterManager
      ✔ Should allow owner to update minter manager
      ✔ Should revert if new minter manager is zero address
      ✔ Should revert if called by non-owner
    configureMinter
      ✔ Should allow controller to configure their minter with allowance
      ✔ Should allow controller to update their minter's allowance
      ✔ Should revert if caller is not a controller
    incrementMinterAllowance
      ✔ Should allow controller to increment their minter's allowance
      ✔ Should revert if increment is zero
      ✔ Should revert if minter is not active
      ✔ Should revert if caller is not a controller
      ✔ Should revert on overflow
    decrementMinterAllowance
      ✔ Should allow controller to decrement their minter's allowance
      ✔ Should cap decrement at current allowance (safe decrement)
      ✔ Should revert if decrement is zero
      ✔ Should revert if minter is not active
      ✔ Should revert if caller is not a controller
    removeMinter
      ✔ Should allow controller to remove their minter
      ✔ Should revert if caller is not a controller
    Multiple controllers managing same minter
      ✔ Should allow multiple controllers to manage the same minter independently
    Integration with BridgedCaminoV1
      ✔ Should enable minter to mint after being configured
      ✔ Should prevent minting after minter is removed
    Controller Ceilings
      configureController with default ceiling
        ✔ Should set ceiling to 0 when configuring new controller
        ✔ Should update ceiling when reconfiguring existing controller
      setControllerCeiling
        ✔ Should allow owner to set controller ceiling
        ✔ Should allow owner to update existing ceiling
        ✔ Should allow owner to set ceiling to 0 (zero-only, for disabler controllers)
        ✔ Should allow owner to set ceiling to MaxUint256 (unlimited)
        ✔ Should revert if called by non-owner
      getControllerCeiling
        ✔ Should return 0 for newly configured controller (default ceiling)
        ✔ Should return correct ceiling after it is set
      configureMinter with ceiling
        ✔ Should allow configureMinter when allowance is below ceiling
        ✔ Should allow configureMinter when allowance equals ceiling
        ✔ Should revert when allowance exceeds ceiling
        ✔ Should allow unlimited allowance when ceiling is set to MaxUint256
        ✔ Should enforce default ceiling of 0 (controller can only disable)
      incrementMinterAllowance with ceiling
        ✔ Should allow increment when new allowance is below ceiling
        ✔ Should allow increment when new allowance equals ceiling
        ✔ Should revert when increment would exceed ceiling
        ✔ Should allow unlimited increment when ceiling is MaxUint256
        ✔ Should prevent increment when ceiling is 0 (default zero-only controller)
      decrementMinterAllowance with ceiling
        ✔ Should allow decrement regardless of ceiling (reducing is always allowed)
        ✔ Should allow zero-ceiling controller to decrement (useful for disabling)
      Multiple controllers with different ceilings
        ✔ Should enforce different ceilings for different controllers
        ✔ Should allow one controller with limited ceiling and another with unlimited
      Ceiling edge cases
        ✔ Should handle ceiling of 1 (minimum non-zero ceiling)
        ✔ Should handle MaxUint256 ceiling (effectively unlimited)


  111 passing (2s)

Done in 3.84s.

```

</details>

### Edit ignition module parameters for the deployment

Update the parameters file `ignition/modules/bridgedCaminoParameters.json` with
your information for symbol and addresses.

### Set deployer private key

You need to set a RPC URL and a deployer for your specific chain in the
`hardhat.config.js` file.

For example, there are already options for the Amoy testnet of Polygon. To set
the deployer private key you need to use the command below:

```
yarn hardhat vars set AMOY_DEPLOYER_PRIVATE_KEY
```

This will save the variable into the file
`$HOME/.config/hardhat-nodejs/vars.json`.

You can use the command below to see how to set variables and which are already
set:

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

You can deploy the contract to the selected network using the command below.
Update `<network>` with your desired network that you have added to the
`hardhat.config.js` file.

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
