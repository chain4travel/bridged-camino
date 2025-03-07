# Solidity API

## BlacklistableUpgradeable

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

### unBlacklist

```solidity
function unBlacklist(address _account) external
```

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

A pausable, upgradable and permit-enabled ERC20 token with minting and burning capabilities.

### PAUSER_ROLE

```solidity
bytes32 PAUSER_ROLE
```

_PAUSER_ROLE is a role that allows a user to pause and unpause the contract_

### PAUSER_ROLE_ADMIN

```solidity
bytes32 PAUSER_ROLE_ADMIN
```

_PAUSER_ROLE_ADMIN is the role that can grant and revoke the PAUSER_ROLE_

### MINTER_ROLE

```solidity
bytes32 MINTER_ROLE
```

_MINTER_ROLE is a role that allows a user to mint tokens_

### MINTER_ROLE_ADMIN

```solidity
bytes32 MINTER_ROLE_ADMIN
```

_MINTER_ROLE_ADMIN is the role that can grant and revoke the MINTER_ROLE_

### UPGRADER_ROLE

```solidity
bytes32 UPGRADER_ROLE
```

_UPGRADER_ROLE is a role that allows a user to upgrade the contract_

### UPGRADER_ROLE_ADMIN

```solidity
bytes32 UPGRADER_ROLE_ADMIN
```

_UPGRADER_ROLE_ADMIN is the role that can grant and revoke the UPGRADER_ROLE_

### BridgedCaminoV1Storage

```solidity
struct BridgedCaminoV1Storage {
    mapping(address => uint256) minterAllowed;
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

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(string _name, string _symbol, address defaultAdmin, address pauser, address upgrader) public
```

### mint

```solidity
function mint(address to, uint256 amount) external virtual
```

Mint `amount` tokens to `to` using the minter's allowance

_Only `MINTER_ROLE` can call this function_

#### Parameters

| Name   | Type    | Description                  |
| ------ | ------- | ---------------------------- |
| to     | address | The address of the recipient |
| amount | uint256 | The amount of tokens to mint |

### minterAllowance

```solidity
function minterAllowance(address minter) external view virtual returns (uint256 amount)
```

Get the mint allowance of the `minter`

#### Parameters

| Name   | Type    | Description               |
| ------ | ------- | ------------------------- |
| minter | address | The address of the minter |

#### Return Values

| Name   | Type    | Description                 |
| ------ | ------- | --------------------------- |
| amount | uint256 | The allowance of the minter |

### configureMinter

```solidity
function configureMinter(address minter, uint256 minterAllowedAmount) external
```

Configure a `minter` with an initial allowance of `minterAllowedAmount`

_Only `MINTER_ROLE_ADMIN` can call this function_

#### Parameters

| Name                | Type    | Description                         |
| ------------------- | ------- | ----------------------------------- |
| minter              | address | The address of the minter           |
| minterAllowedAmount | uint256 | The initial allowance of the minter |

### removeMinter

```solidity
function removeMinter(address minter) external virtual
```

Revoke the minter role from `minter` and remove its allowance

_Only `MINTER_ROLE_ADMIN` can call this function_

#### Parameters

| Name   | Type    | Description               |
| ------ | ------- | ------------------------- |
| minter | address | The address of the minter |

### burn

```solidity
function burn(uint256 amount) public virtual
```

Burns `amount` tokens from the caller.

_Only `MINTER_ROLE` can call this function_

#### Parameters

| Name   | Type    | Description                   |
| ------ | ------- | ----------------------------- |
| amount | uint256 | The amount of tokens to burn. |

### burnFrom

```solidity
function burnFrom(address from, uint256 amount) public virtual
```

Burns `amount` tokens from `from`.

_Only `MINTER_ROLE` can call this function_

#### Parameters

| Name   | Type    | Description                            |
| ------ | ------- | -------------------------------------- |
| from   | address | The address from which to burn tokens. |
| amount | uint256 | The amount of tokens to burn.          |

### pause

```solidity
function pause() public virtual
```

Pauses the contract

_Only `PAUSER_ROLE` can call this function_

### unpause

```solidity
function unpause() public virtual
```

Unpauses the contract

_Only `PAUSER_ROLE` can call this function_

### \_authorizeUpgrade

```solidity
function _authorizeUpgrade(address newImplementation) internal virtual
```

Authorizes the upgrade

_Only `UPGRADER_ROLE` can call this function_

#### Parameters

| Name              | Type    | Description                           |
| ----------------- | ------- | ------------------------------------- |
| newImplementation | address | The address of the new implementation |

### \_approve

```solidity
function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual
```

Approves a spender to spend the specified value of tokens on behalf of the owner

_This function checks that the owner, spender, and caller are not blacklisted_

#### Parameters

| Name      | Type    | Description                                          |
| --------- | ------- | ---------------------------------------------------- |
| owner     | address | The address of the token owner                       |
| spender   | address | The address of the spender                           |
| value     | uint256 | The amount of tokens to approve                      |
| emitEvent | bool    | A flag indicating whether to emit the Approval event |

### \_update

```solidity
function _update(address from, address to, uint256 value) internal virtual
```

Updates the token balances of `from` and `to` after a transfer

_This function checks that `from`, `to`, and the caller are not blacklisted_

#### Parameters

| Name  | Type    | Description                      |
| ----- | ------- | -------------------------------- |
| from  | address | The address of the sender        |
| to    | address | The address of the recipient     |
| value | uint256 | The amount of tokens to transfer |

## BridgedCaminoUpgradeTest

### getTestResult

```solidity
function getTestResult() public pure returns (string)
```
