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

### isMinter

```solidity
function isMinter(address account) external view virtual returns (bool)
```

Checks if an address is a minter

_Returns true if the address has the MINTER_ROLE_

#### Parameters

| Name    | Type    | Description          |
| ------- | ------- | -------------------- |
| account | address | The address to check |

#### Return Values

| Name | Type | Description                                      |
| ---- | ---- | ------------------------------------------------ |
| [0]  | bool | True if the address is a minter, false otherwise |

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

## IMinterManagement

Interface for contracts that manage minters and their allowances

_A contract that implements this interface has external functions for adding and removing
minters and modifying their allowances. This is compatible with USDC's MinterManagementInterface
but modernized for Solidity ^0.8.0_

### isMinter

```solidity
function isMinter(address account) external view returns (bool)
```

Checks if an address is a minter

#### Parameters

| Name    | Type    | Description          |
| ------- | ------- | -------------------- |
| account | address | The address to check |

#### Return Values

| Name | Type | Description                                      |
| ---- | ---- | ------------------------------------------------ |
| [0]  | bool | True if the address is a minter, false otherwise |

### minterAllowance

```solidity
function minterAllowance(address minter) external view returns (uint256)
```

Returns the remaining minting quota for a given minter

#### Parameters

| Name   | Type    | Description               |
| ------ | ------- | ------------------------- |
| minter | address | The address of the minter |

#### Return Values

| Name | Type    | Description                           |
| ---- | ------- | ------------------------------------- |
| [0]  | uint256 | The remaining allowance of the minter |

### configureMinter

```solidity
function configureMinter(address minter, uint256 minterAllowedAmount) external
```

Grants minter role to an address and sets their minting allowance

#### Parameters

| Name                | Type    | Description                  |
| ------------------- | ------- | ---------------------------- |
| minter              | address | The address of the minter    |
| minterAllowedAmount | uint256 | The minting allowance to set |

### removeMinter

```solidity
function removeMinter(address minter) external
```

Removes minter role from an address

#### Parameters

| Name   | Type    | Description                         |
| ------ | ------- | ----------------------------------- |
| minter | address | The address of the minter to remove |

## Controller

Generic implementation of the owner-controller-worker model

_One owner manages many controllers. Each controller manages one worker.
Workers may be reused across different controllers.
This is a modernized version of USDC's Controller contract using custom errors._

### ControllerConfigured

```solidity
event ControllerConfigured(address controller, address worker)
```

Emitted when a controller is configured with a worker

#### Parameters

| Name       | Type    | Description                   |
| ---------- | ------- | ----------------------------- |
| controller | address | The address of the controller |
| worker     | address | The address of the worker     |

### ControllerRemoved

```solidity
event ControllerRemoved(address controller)
```

Emitted when a controller is removed

#### Parameters

| Name       | Type    | Description                   |
| ---------- | ------- | ----------------------------- |
| controller | address | The address of the controller |

### NotController

```solidity
error NotController(address caller)
```

Thrown when a non-controller address attempts a controller-only action

#### Parameters

| Name   | Type    | Description                           |
| ------ | ------- | ------------------------------------- |
| caller | address | The address that attempted the action |

### ControllerZeroAddress

```solidity
error ControllerZeroAddress()
```

Thrown when attempting to configure a controller with a zero address

### WorkerZeroAddress

```solidity
error WorkerZeroAddress()
```

Thrown when attempting to configure a worker with a zero address

### ControllerNotFound

```solidity
error ControllerNotFound(address controller)
```

Thrown when attempting to remove a controller that doesn't exist

#### Parameters

| Name       | Type    | Description                               |
| ---------- | ------- | ----------------------------------------- |
| controller | address | The controller address that doesn't exist |

### IndexOutOfBounds

```solidity
error IndexOutOfBounds(uint256 index, uint256 count)
```

Thrown when attempting to access a controller at an invalid index

#### Parameters

| Name  | Type    | Description                       |
| ----- | ------- | --------------------------------- |
| index | uint256 | The invalid index being accessed  |
| count | uint256 | The current number of controllers |

### onlyController

```solidity
modifier onlyController()
```

Ensures that caller is a controller with a non-zero worker address

### constructor

```solidity
constructor(address owner) public
```

### getWorker

```solidity
function getWorker(address controller) external view returns (address)
```

Gets the worker address managed by a controller

#### Parameters

| Name       | Type    | Description            |
| ---------- | ------- | ---------------------- |
| controller | address | The controller address |

#### Return Values

| Name | Type    | Description                                                  |
| ---- | ------- | ------------------------------------------------------------ |
| [0]  | address | The worker address (address(0) if controller not configured) |

### \_getWorker

```solidity
function _getWorker(address controller) internal view returns (address)
```

_Internal function to get the worker address for a controller_

#### Parameters

| Name       | Type    | Description            |
| ---------- | ------- | ---------------------- |
| controller | address | The controller address |

#### Return Values

| Name | Type    | Description                                                  |
| ---- | ------- | ------------------------------------------------------------ |
| [0]  | address | The worker address (address(0) if controller not configured) |

### getControllerCount

```solidity
function getControllerCount() external view returns (uint256)
```

Gets the total number of configured controllers

#### Return Values

| Name | Type    | Description              |
| ---- | ------- | ------------------------ |
| [0]  | uint256 | The count of controllers |

### getControllerAt

```solidity
function getControllerAt(uint256 index) external view returns (address controller, address worker)
```

Gets the controller and worker at a specific index

#### Parameters

| Name  | Type    | Description        |
| ----- | ------- | ------------------ |
| index | uint256 | The index to query |

#### Return Values

| Name       | Type    | Description                                       |
| ---------- | ------- | ------------------------------------------------- |
| controller | address | The controller address at the given index         |
| worker     | address | The worker address associated with the controller |

### configureController

```solidity
function configureController(address controller, address worker) public
```

Configure a controller with the given worker

_The worker must be a non-zero address. To disable a controller, use
removeController instead._

#### Parameters

| Name       | Type    | Description                                   |
| ---------- | ------- | --------------------------------------------- |
| controller | address | The controller to be configured with a worker |
| worker     | address | The worker to be set for the controller       |

### removeController

```solidity
function removeController(address controller) public
```

Disables a controller by removing it from the enumerable map

_WARNING: A worker can be managed by multiple controllers. Removing one
controller does not affect the worker's status if it remains managed by at
least one other controller._

#### Parameters

| Name       | Type    | Description               |
| ---------- | ------- | ------------------------- |
| controller | address | The controller to disable |

## MasterMinter

MasterMinter uses multiple controllers to manage minters for a contract
that implements the IMinterManagement interface

\_MasterMinter inherits all its functionality from MintController.
This provides a clean separation of concerns: - Owner (typically a multisig or governance contract) manages controllers - Controllers (typically EOAs or automated systems) manage individual minters - Minters (typically bridge contracts) mint tokens within their allowances

     This is a modernized version of USDC's MasterMinter contract._

### constructor

```solidity
constructor(address minterManager, address owner) public
```

Initializes the MasterMinter with a minter manager and owner

#### Parameters

| Name          | Type    | Description                                                               |
| ------------- | ------- | ------------------------------------------------------------------------- |
| minterManager | address | The address of the minter manager contract (typically the token contract) |
| owner         | address | The address of the owner (typically a multisig or governance contract)    |

## MintController

Manages minters for a contract that implements the IMinterManagement interface

\_The MintController contract lets the owner designate certain addresses as controllers,
and these controllers then manage the minters by adding and removing minters, as well as
modifying their minting allowance. A controller may manage exactly one minter, but the same
minter address may be managed by multiple controllers.

     MintController inherits from the Controller contract. It treats the Controller workers as minters.
     This is a modernized version of USDC's MintController contract using custom errors and Solidity ^0.8.0_

### minterManager

```solidity
contract IMinterManagement minterManager
```

_MintController calls the minterManager to execute/record minter
management tasks, as well as to query the status of a minter address._

### controllerCeilings

```solidity
mapping(address => uint256) controllerCeilings
```

_Maximum allowance that each controller can assign to its minter.
When configureController is called, defaults to 0 (zero-only controller).
Owner must explicitly set ceiling via setControllerCeiling.
Special value: type(uint256).max means unlimited._

### MinterManagerSet

```solidity
event MinterManagerSet(address oldMinterManager, address newMinterManager)
```

Emitted when the minter manager is updated

#### Parameters

| Name             | Type    | Description                           |
| ---------------- | ------- | ------------------------------------- |
| oldMinterManager | address | The address of the old minter manager |
| newMinterManager | address | The address of the new minter manager |

### MinterConfigured

```solidity
event MinterConfigured(address controller, address minter, uint256 allowance)
```

Emitted when a minter is configured by a controller

#### Parameters

| Name       | Type    | Description                      |
| ---------- | ------- | -------------------------------- |
| controller | address | The address of the controller    |
| minter     | address | The address of the minter        |
| allowance  | uint256 | The new allowance for the minter |

### MinterRemoved

```solidity
event MinterRemoved(address controller, address minter)
```

Emitted when a minter is removed by a controller

#### Parameters

| Name       | Type    | Description                   |
| ---------- | ------- | ----------------------------- |
| controller | address | The address of the controller |
| minter     | address | The address of the minter     |

### MinterAllowanceIncremented

```solidity
event MinterAllowanceIncremented(address controller, address minter, uint256 increment, uint256 newAllowance)
```

Emitted when a minter's allowance is incremented

#### Parameters

| Name         | Type    | Description                                 |
| ------------ | ------- | ------------------------------------------- |
| controller   | address | The address of the controller               |
| minter       | address | The address of the minter                   |
| increment    | uint256 | The amount the allowance was incremented by |
| newAllowance | uint256 | The new total allowance                     |

### MinterAllowanceDecremented

```solidity
event MinterAllowanceDecremented(address controller, address minter, uint256 decrement, uint256 newAllowance)
```

Emitted when a minter's allowance is decremented

#### Parameters

| Name         | Type    | Description                                 |
| ------------ | ------- | ------------------------------------------- |
| controller   | address | The address of the controller               |
| minter       | address | The address of the minter                   |
| decrement    | uint256 | The amount the allowance was decremented by |
| newAllowance | uint256 | The new total allowance                     |

### ControllerCeilingUpdated

```solidity
event ControllerCeilingUpdated(address controller, uint256 ceiling)
```

Emitted when a controller's allowance ceiling is updated

#### Parameters

| Name       | Type    | Description                                               |
| ---------- | ------- | --------------------------------------------------------- |
| controller | address | The address of the controller                             |
| ceiling    | uint256 | The new ceiling value (type(uint256).max means unlimited) |

### MinterManagerZeroAddress

```solidity
error MinterManagerZeroAddress()
```

Thrown when the minter manager address is zero

### AllowanceIncrementZero

```solidity
error AllowanceIncrementZero()
```

Thrown when trying to increment allowance by zero

### AllowanceDecrementZero

```solidity
error AllowanceDecrementZero()
```

Thrown when trying to decrement allowance by zero

### MinterNotActive

```solidity
error MinterNotActive(address minter)
```

Thrown when trying to increment/decrement allowance for an inactive minter

#### Parameters

| Name   | Type    | Description                           |
| ------ | ------- | ------------------------------------- |
| minter | address | The minter address that is not active |

### AllowanceExceedsCeiling

```solidity
error AllowanceExceedsCeiling(uint256 requestedAllowance, uint256 ceiling)
```

Thrown when trying to set an allowance that exceeds the controller's ceiling

#### Parameters

| Name               | Type    | Description                                     |
| ------------------ | ------- | ----------------------------------------------- |
| requestedAllowance | uint256 | The allowance that was requested                |
| ceiling            | uint256 | The maximum allowed ceiling for this controller |

### constructor

```solidity
constructor(address minterManager_, address owner) public
```

Initializes the MintController with a minter manager and owner

_Can be deployed with address(0) for minterManager to support atomic deployment
where MasterMinter is deployed before the token. In this case, setMinterManager()
must be called before any controller functions can be used._

#### Parameters

| Name            | Type    | Description                                                    |
| --------------- | ------- | -------------------------------------------------------------- |
| minterManager\_ | address | The address of the minter manager contract (can be address(0)) |
| owner           | address | The address of the owner                                       |

### getMinterManager

```solidity
function getMinterManager() external view returns (contract IMinterManagement)
```

Gets the minter manager

#### Return Values

| Name | Type                       | Description                 |
| ---- | -------------------------- | --------------------------- |
| [0]  | contract IMinterManagement | The minter manager contract |

### getControllerCeiling

```solidity
function getControllerCeiling(address controller) external view returns (uint256)
```

Gets the allowance ceiling for a controller

#### Parameters

| Name       | Type    | Description                   |
| ---------- | ------- | ----------------------------- |
| controller | address | The address of the controller |

#### Return Values

| Name | Type    | Description                                           |
| ---- | ------- | ----------------------------------------------------- |
| [0]  | uint256 | The ceiling value (type(uint256).max means unlimited) |

### setMinterManager

```solidity
function setMinterManager(address newMinterManager) public
```

Sets the minter manager

_This function serves two purposes: 1. Initial setup: If deployed with address(0), this sets the minter manager for the first time 2. Migration: Allows changing to a new token contract if needed_

#### Parameters

| Name             | Type    | Description                                    |
| ---------------- | ------- | ---------------------------------------------- |
| newMinterManager | address | The address of the new minter manager contract |

### configureControllerWithCeiling

```solidity
function configureControllerWithCeiling(address controller, address worker, uint256 ceiling) public
```

Configure a controller with the given worker (minter) and allowance ceiling

_Extends configureController from parent to also set the allowance ceiling.
Ceiling values: - 0: Controller can only set allowance to 0 (can only disable minters) - Any value > 0 and < max: Maximum allowance the controller can assign - type(uint256).max: Unlimited_

#### Parameters

| Name       | Type    | Description                                      |
| ---------- | ------- | ------------------------------------------------ |
| controller | address | The controller to be configured with a worker    |
| worker     | address | The worker (minter) to be set for the controller |
| ceiling    | uint256 | The maximum allowance the controller can assign  |

### setControllerCeiling

```solidity
function setControllerCeiling(address controller, uint256 ceiling) public
```

Sets the allowance ceiling for a controller

_Ceiling values: - 0: Controller can only set allowance to 0 (can only disable minters) - Any value > 0 and < max: Maximum allowance the controller can assign - type(uint256).max: Unlimited
Only the owner can set controller ceilings._

#### Parameters

| Name       | Type    | Description                                     |
| ---------- | ------- | ----------------------------------------------- |
| controller | address | The address of the controller                   |
| ceiling    | uint256 | The maximum allowance the controller can assign |

### removeMinter

```solidity
function removeMinter() public
```

Removes the controller's own minter

_Can only be called by an active controller_

### configureMinter

```solidity
function configureMinter(uint256 newAllowance) public
```

Enables the minter and sets its allowance

_Can only be called by an active controller_

#### Parameters

| Name         | Type    | Description                        |
| ------------ | ------- | ---------------------------------- |
| newAllowance | uint256 | New allowance to be set for minter |

### incrementMinterAllowance

```solidity
function incrementMinterAllowance(uint256 allowanceIncrement) public
```

Increases the minter's allowance if and only if the minter is an active minter

_A minter is considered active if minterManager.isMinter(minter) returns true.
Can only be called by an active controller._

#### Parameters

| Name               | Type    | Description                              |
| ------------------ | ------- | ---------------------------------------- |
| allowanceIncrement | uint256 | The amount to increment the allowance by |

### decrementMinterAllowance

```solidity
function decrementMinterAllowance(uint256 allowanceDecrement) public
```

Decreases the minter's allowance if and only if the minter is currently active

_The controller can safely send a signed decrementMinterAllowance() transaction to a minter
and not worry about it being used to undo a removeMinter() transaction.
If the decrement is greater than the current allowance, the allowance is set to 0.
Can only be called by an active controller._

#### Parameters

| Name               | Type    | Description                              |
| ------------------ | ------- | ---------------------------------------- |
| allowanceDecrement | uint256 | The amount to decrement the allowance by |

### \_validateAllowanceCeiling

```solidity
function _validateAllowanceCeiling(address controller, uint256 newAllowance) internal view
```

Validates that the requested allowance does not exceed the controller's ceiling

_Ceiling of type(uint256).max represents unlimited allowance (no validation).
For any other ceiling value, the function enforces that newAllowance <= ceiling.
Reverts with AllowanceExceedsCeiling if the limit is exceeded._

#### Parameters

| Name         | Type    | Description                     |
| ------------ | ------- | ------------------------------- |
| controller   | address | The controller address to check |
| newAllowance | uint256 | The allowance to validate       |

### \_setMinterAllowance

```solidity
function _setMinterAllowance(address minter, uint256 newAllowance) internal
```

Uses the IMinterManagement interface to enable the minter and set its allowance

#### Parameters

| Name         | Type    | Description                        |
| ------------ | ------- | ---------------------------------- |
| minter       | address | Minter to set new allowance of     |
| newAllowance | uint256 | New allowance to be set for minter |

## BridgedCaminoUpgradeTest

### getTestResult

```solidity
function getTestResult() public pure returns (string)
```
