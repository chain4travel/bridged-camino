# Solidity API

## BlacklistableUpgradeable

Provides blacklist functionality for token contracts

_Implements address blacklisting to enable regulatory compliance and incident response.
Use cases include freezing stolen funds, complying with legal requirements, or
preventing compromised addresses from interacting with the token._

### BLACKLISTER_ROLE

```solidity
bytes32 BLACKLISTER_ROLE
```

### BLACKLISTER_ROLE_ADMIN

```solidity
bytes32 BLACKLISTER_ROLE_ADMIN
```

### BlacklistableStorage

```solidity
struct BlacklistableStorage {
    mapping(address => bool) blacklisted;
}
```

### \_getBlacklistableStorage

```solidity
function _getBlacklistableStorage() internal pure returns (struct BlacklistableUpgradeable.BlacklistableStorage $)
```

### \_\_Blacklistable_init

```solidity
function __Blacklistable_init() internal
```

### Blacklisted

```solidity
event Blacklisted(address _account)
```

### UnBlacklisted

```solidity
event UnBlacklisted(address _account)
```

### AccountIsBlacklisted

```solidity
error AccountIsBlacklisted(address _account)
```

### notBlacklisted

```solidity
modifier notBlacklisted(address _account)
```

### isBlacklisted

```solidity
function isBlacklisted(address _account) external view returns (bool)
```

### blacklist

```solidity
function blacklist(address _account) external
```

Adds an address to the blacklist

_Use this for regulatory compliance, freezing stolen funds, or blocking compromised addresses.
Blacklisted addresses cannot transfer, receive, or approve tokens._

#### Parameters

| Name      | Type    | Description              |
| --------- | ------- | ------------------------ |
| \_account | address | The address to blacklist |

### unBlacklist

```solidity
function unBlacklist(address _account) external
```

Removes an address from the blacklist

_Use this to restore access after legal resolution or when address is no longer a threat._

#### Parameters

| Name      | Type    | Description                          |
| --------- | ------- | ------------------------------------ |
| \_account | address | The address to remove from blacklist |

### \_isBlacklisted

```solidity
function _isBlacklisted(address _account) internal view virtual returns (bool)
```

### \_blacklist

```solidity
function _blacklist(address _account) internal virtual
```

### \_unBlacklist

```solidity
function _unBlacklist(address _account) internal virtual
```

## BridgedCaminoV1

A bridged wrapped token for Camino network with controlled minting and emergency controls.

_This contract implements a secure bridging pattern where: - Minting is restricted to authorized bridges with individual allowance quotas to limit blast radius - Burning is restricted to bridges to ensure proper cross-chain reconciliation - Pausability provides emergency stop mechanism for security incidents - Blacklisting enables regulatory compliance and recovery from compromised addresses - UUPS upgradeability allows bug fixes while maintaining the same proxy address_

### PAUSER_ROLE

```solidity
bytes32 PAUSER_ROLE
```

### PAUSER_ROLE_ADMIN

```solidity
bytes32 PAUSER_ROLE_ADMIN
```

### MINTER_ROLE

```solidity
bytes32 MINTER_ROLE
```

### MINTER_ROLE_ADMIN

```solidity
bytes32 MINTER_ROLE_ADMIN
```

### UPGRADER_ROLE

```solidity
bytes32 UPGRADER_ROLE
```

### UPGRADER_ROLE_ADMIN

```solidity
bytes32 UPGRADER_ROLE_ADMIN
```

### BridgedCaminoV1Storage

```solidity
struct BridgedCaminoV1Storage {
    mapping(address => uint256) minterAllowance;
}
```

### \_getBridgedCaminoV1Storage

```solidity
function _getBridgedCaminoV1Storage() internal pure returns (struct BridgedCaminoV1.BridgedCaminoV1Storage $)
```

### Mint

```solidity
event Mint(address minter, address to, uint256 amount)
```

Emitted when a minter mints `amount` tokens to `to`

#### Parameters

| Name   | Type    | Description                  |
| ------ | ------- | ---------------------------- |
| minter | address | The address of the minter    |
| to     | address | The address of the recipient |
| amount | uint256 | The amount of tokens minted  |

### Burn

```solidity
event Burn(address minter, address from, uint256 amount)
```

Emitted when a minter burns `amount` tokens from `from`

#### Parameters

| Name   | Type    | Description                 |
| ------ | ------- | --------------------------- |
| minter | address | The address of the minter   |
| from   | address | The address of the burner   |
| amount | uint256 | The amount of tokens burned |

### MinterConfigured

```solidity
event MinterConfigured(address minter, uint256 allowance, bool newMinter)
```

Emitted when a minter is configured

#### Parameters

| Name      | Type    | Description                      |
| --------- | ------- | -------------------------------- |
| minter    | address | The address of the minter        |
| allowance | uint256 | The allowance of the minter      |
| newMinter | bool    | Whether the minter is new or not |

### MinterRemoved

```solidity
event MinterRemoved(address minter)
```

Emitted when a minter is removed

#### Parameters

| Name   | Type    | Description               |
| ------ | ------- | ------------------------- |
| minter | address | The address of the minter |

### AmountExceedsMintAllowance

```solidity
error AmountExceedsMintAllowance(address _minter, uint256 _amount)
```

Thrown when the mint amount exceeds the minter's allowance

#### Parameters

| Name     | Type    | Description                  |
| -------- | ------- | ---------------------------- |
| \_minter | address | The address of the minter    |
| \_amount | uint256 | The amount attempted to mint |

### InitParams

Initialization parameters for BridgedCamino

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct InitParams {
    string name;
    string symbol;
    address defaultAdmin;
    address pauser;
    address upgrader;
    address blacklister;
    address pauserRoleAdmin;
    address upgraderRoleAdmin;
    address minterRoleAdmin;
    address blacklisterRoleAdmin;
}
```

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(struct BridgedCaminoV1.InitParams params) public
```

Initializes the BridgedCamino token with all roles and admins

#### Parameters

| Name   | Type                              | Description                                     |
| ------ | --------------------------------- | ----------------------------------------------- |
| params | struct BridgedCaminoV1.InitParams | Struct containing all initialization parameters |

### mint

```solidity
function mint(address to, uint256 amount) external virtual
```

Mints tokens from the caller's minting allowance quota

_Restricted to MINTER_ROLE (typically bridge contracts). The allowance system ensures
that if a single bridge is compromised, damage is limited to that bridge's quota.
Reverts if paused to prevent minting during security incidents._

#### Parameters

| Name   | Type    | Description                  |
| ------ | ------- | ---------------------------- |
| to     | address | The address of the recipient |
| amount | uint256 | The amount of tokens to mint |

### minterAllowance

```solidity
function minterAllowance(address minter) external view virtual returns (uint256 amount)
```

Returns the remaining minting quota for a given minter

_Use this to monitor bridge allowances and detect when they need to be increased_

#### Parameters

| Name   | Type    | Description               |
| ------ | ------- | ------------------------- |
| minter | address | The address of the minter |

#### Return Values

| Name   | Type    | Description                           |
| ------ | ------- | ------------------------------------- |
| amount | uint256 | The remaining allowance of the minter |

### configureMinter

```solidity
function configureMinter(address minter, uint256 minterAllowanceAmount) external
```

Grants MINTER_ROLE to an address and sets/updates their minting allowance quota

_Used to onboard new bridges or adjust existing bridge quotas. Setting allowance to a lower
value can be used to gradually phase out a bridge. Reverts if paused to prevent
configuration changes during incident investigation._

#### Parameters

| Name                  | Type    | Description                                              |
| --------------------- | ------- | -------------------------------------------------------- |
| minter                | address | The address of the minter                                |
| minterAllowanceAmount | uint256 | The new total allowance for the minter (not incremental) |

### removeMinter

```solidity
function removeMinter(address minter) external virtual
```

Removes minting privileges from an address

_Use this to decommission bridges or revoke access from compromised addresses.
Can be called even when paused to allow emergency response._

#### Parameters

| Name   | Type    | Description                         |
| ------ | ------- | ----------------------------------- |
| minter | address | The address of the minter to remove |

### burn

```solidity
function burn(uint256 amount) public virtual
```

Burns tokens from the caller's balance

_Restricted to MINTER_ROLE to ensure only bridges burn tokens during unlock operations,
maintaining proper cross-chain accounting. Can be called when paused to allow
emergency supply reduction during security incidents (following USDC pattern)._

#### Parameters

| Name   | Type    | Description                  |
| ------ | ------- | ---------------------------- |
| amount | uint256 | The amount of tokens to burn |

### burnFrom

```solidity
function burnFrom(address from, uint256 amount) public virtual
```

Burns tokens from a specified address (requires prior approval)

_Restricted to MINTER_ROLE for cross-chain accounting. Can be called when paused
to enable emergency response scenarios like burning tokens from compromised addresses._

#### Parameters

| Name   | Type    | Description                           |
| ------ | ------- | ------------------------------------- |
| from   | address | The address from which to burn tokens |
| amount | uint256 | The amount of tokens to burn          |

### pause

```solidity
function pause() public virtual
```

Activates emergency stop, preventing mints and transfers

_Use this immediately upon detecting a security incident. Pausing stops new supply
creation and token movement while allowing burns for incident remediation._

### unpause

```solidity
function unpause() public virtual
```

Deactivates emergency stop, resuming normal operations

_Use this after security incident is resolved and contract state is verified as safe._

### \_authorizeUpgrade

```solidity
function _authorizeUpgrade(address newImplementation) internal virtual
```

Authorizes upgrading the contract implementation

_UUPS upgrade authorization. Restricted to UPGRADER_ROLE to ensure only authorized
governance can deploy new logic while maintaining the same proxy address._

#### Parameters

| Name              | Type    | Description                                    |
| ----------------- | ------- | ---------------------------------------------- |
| newImplementation | address | The address of the new implementation contract |

### \_approve

```solidity
function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual
```

_Overrides ERC20 approve to add blacklist checks
Checks msg.sender to prevent blacklisted users from granting approvals via permit or other mechanisms.
Checks owner and spender to prevent blacklisted addresses from participating in the approval system._

#### Parameters

| Name      | Type    | Description                        |
| --------- | ------- | ---------------------------------- |
| owner     | address | The address of the token owner     |
| spender   | address | The address of the spender         |
| value     | uint256 | The amount of tokens to approve    |
| emitEvent | bool    | Whether to emit the Approval event |

### \_update

```solidity
function _update(address from, address to, uint256 value) internal virtual
```

_Overrides ERC20 update to add blacklist and pause checks
Checks msg.sender in addition to from/to to prevent blacklisted addresses from
moving tokens via third-party mechanisms like transferFrom or contract interactions.
Allows burning even when paused (to == address(0)) to enable emergency supply reduction._

#### Parameters

| Name  | Type    | Description                                           |
| ----- | ------- | ----------------------------------------------------- |
| from  | address | The address of the sender (address(0) for minting)    |
| to    | address | The address of the recipient (address(0) for burning) |
| value | uint256 | The amount of tokens to transfer                      |

## BridgedCaminoUpgradeTest

### getTestResult

```solidity
function getTestResult() public pure returns (string)
```
