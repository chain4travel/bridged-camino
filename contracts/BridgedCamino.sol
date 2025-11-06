// SPDX-License-Identifier: BSD-3-Clause
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import { AccessControlEnumerableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { ERC20BurnableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import { ERC20PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import { ERC20PermitUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { BlacklistableUpgradeable } from "./BlacklistableUpgradeable.sol";

/**
 * @title BridgedCamino
 * @notice A bridged wrapped token for Camino network with controlled minting and emergency controls.
 * @dev This contract implements a secure bridging pattern where:
 *      - Minting is restricted to authorized bridges with individual allowance quotas to limit blast radius
 *      - Burning is restricted to bridges to ensure proper cross-chain reconciliation
 *      - Pausability provides emergency stop mechanism for security incidents
 *      - Blacklisting enables regulatory compliance and recovery from compromised addresses
 *      - UUPS upgradeability allows bug fixes while maintaining the same proxy address
 */
contract BridgedCaminoV1 is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlEnumerableUpgradeable,
    ERC20PermitUpgradeable,
    BlacklistableUpgradeable,
    UUPSUpgradeable
{
    // Role separation ensures that different operational concerns can be managed independently
    // with appropriate privilege levels, following principle of least privilege
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant PAUSER_ROLE_ADMIN = keccak256("PAUSER_ROLE_ADMIN");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MINTER_ROLE_ADMIN = keccak256("MINTER_ROLE_ADMIN");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant UPGRADER_ROLE_ADMIN = keccak256("UPGRADER_ROLE_ADMIN");

    /***************************************************
     *                   STORAGE                       *
     ***************************************************/

    /// @custom:storage-location erc7201:camino.network.BridgedCaminoV1
    struct BridgedCaminoV1Storage {
        // Each minter has an individual allowance to limit damage if a bridge is compromised
        // This implements the same security pattern as USDC's FiatToken
        mapping(address minter => uint256 allowance) minterAllowance;
    }

    // keccak256(abi.encode(uint256(keccak256("camino.network.BridgedCaminoV1")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant BridgedCaminoV1StorageLocation =
        0x182ef02838af5b5b479414017cf218d6b9338a983918bfae3ca63eb3174f1500;

    function _getBridgedCaminoV1Storage() internal pure returns (BridgedCaminoV1Storage storage $) {
        assembly {
            $.slot := BridgedCaminoV1StorageLocation
        }
    }

    /***************************************************
     *                    EVENTS                       *
     ***************************************************/

    /**
     * @notice Emitted when a minter mints `amount` tokens to `to`
     * @param minter The address of the minter
     * @param to The address of the recipient
     * @param amount The amount of tokens minted
     */
    event Mint(address indexed minter, address indexed to, uint256 amount);

    /**
     * @notice Emitted when a minter burns `amount` tokens from `from`
     * @param minter The address of the minter
     * @param from The address of the burner
     * @param amount The amount of tokens burned
     */
    event Burn(address indexed minter, address indexed from, uint256 amount);

    /**
     * @notice Emitted when a minter is configured
     * @param minter The address of the minter
     * @param allowance The allowance of the minter
     * @param newMinter Whether the minter is new or not
     */
    event MinterConfigured(address indexed minter, uint256 allowance, bool newMinter);

    /**
     * @notice Emitted when a minter is removed
     * @param minter The address of the minter
     */
    event MinterRemoved(address indexed minter);

    /***************************************************
     *                    ERRORS                       *
     ***************************************************/

    /**
     * @notice Thrown when the mint amount exceeds the minter's allowance
     * @param _minter The address of the minter
     * @param _amount The amount attempted to mint
     */
    error AmountExceedsMintAllowance(address _minter, uint256 _amount);

    /***************************************************
     *                     INIT                        *
     ***************************************************/

    /**
     * @notice Initialization parameters for BridgedCamino
     * @param name Token name (e.g., "Bridged Camino")
     * @param symbol Token symbol (e.g., "bCAM")
     * @param defaultAdmin Address that receives DEFAULT_ADMIN_ROLE (controls all role admins)
     * @param pauser Address that receives PAUSER_ROLE (can pause/unpause)
     * @param upgrader Address that receives UPGRADER_ROLE (can upgrade contract)
     * @param blacklister Address that receives BLACKLISTER_ROLE (can blacklist addresses)
     * @param pauserRoleAdmin Address that receives PAUSER_ROLE_ADMIN (manages pausers)
     * @param upgraderRoleAdmin Address that receives UPGRADER_ROLE_ADMIN (manages upgraders)
     * @param minterRoleAdmin Address that receives MINTER_ROLE_ADMIN (manages minters)
     * @param blacklisterRoleAdmin Address that receives BLACKLISTER_ROLE_ADMIN (manages blacklisters)
     */
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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the BridgedCamino token with all roles and admins
     * @param params Struct containing all initialization parameters
     */
    function initialize(InitParams calldata params) public initializer {
        __ERC20_init(params.name, params.symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __ERC20Permit_init(params.name);
        __UUPSUpgradeable_init();
        __Blacklistable_init();

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, params.defaultAdmin);
        _grantRole(PAUSER_ROLE, params.pauser);
        _grantRole(UPGRADER_ROLE, params.upgrader);
        _grantRole(BLACKLISTER_ROLE, params.blacklister);

        // Grant admin roles
        _grantRole(PAUSER_ROLE_ADMIN, params.pauserRoleAdmin);
        _grantRole(UPGRADER_ROLE_ADMIN, params.upgraderRoleAdmin);
        _grantRole(MINTER_ROLE_ADMIN, params.minterRoleAdmin);
        _grantRole(BLACKLISTER_ROLE_ADMIN, params.blacklisterRoleAdmin);

        // Set role admins
        _setRoleAdmin(PAUSER_ROLE, PAUSER_ROLE_ADMIN);
        _setRoleAdmin(MINTER_ROLE, MINTER_ROLE_ADMIN);
        _setRoleAdmin(UPGRADER_ROLE, UPGRADER_ROLE_ADMIN);
        // This is already set in __Blacklistable_init(), but we set it here
        // explicitly for consistency
        _setRoleAdmin(BLACKLISTER_ROLE, BLACKLISTER_ROLE_ADMIN);
    }

    /***************************************************
     *                     MINT                        *
     ***************************************************/

    /**
     * @notice Mints tokens from the caller's minting allowance quota
     * @dev Restricted to MINTER_ROLE (typically bridge contracts). The allowance system ensures
     *      that if a single bridge is compromised, damage is limited to that bridge's quota.
     *      Reverts if paused to prevent minting during security incidents.
     * @param to The address of the recipient
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external virtual whenNotPaused onlyRole(MINTER_ROLE) {
        BridgedCaminoV1Storage storage $ = _getBridgedCaminoV1Storage();

        uint256 minterAllowanceAmount = $.minterAllowance[msg.sender];

        if (minterAllowanceAmount < amount) {
            revert AmountExceedsMintAllowance(msg.sender, amount);
        }

        $.minterAllowance[msg.sender] = minterAllowanceAmount - amount;

        emit Mint(msg.sender, to, amount);

        _mint(to, amount);
    }

    /**
     * @notice Returns the remaining minting quota for a given minter
     * @dev Use this to monitor bridge allowances and detect when they need to be increased
     * @param minter The address of the minter
     * @return amount The remaining allowance of the minter
     */
    function minterAllowance(address minter) external view virtual returns (uint256 amount) {
        BridgedCaminoV1Storage storage $ = _getBridgedCaminoV1Storage();
        return $.minterAllowance[minter];
    }

    /**
     * @notice Grants MINTER_ROLE to an address and sets/updates their minting allowance quota
     * @dev Used to onboard new bridges or adjust existing bridge quotas. Setting allowance to a lower
     *      value can be used to gradually phase out a bridge. Reverts if paused to prevent
     *      configuration changes during incident investigation.
     * @param minter The address of the minter
     * @param minterAllowanceAmount The new total allowance for the minter (not incremental)
     */
    function configureMinter(
        address minter,
        uint256 minterAllowanceAmount
    ) external whenNotPaused onlyRole(MINTER_ROLE_ADMIN) {
        BridgedCaminoV1Storage storage $ = _getBridgedCaminoV1Storage();

        // Grant minter role
        bool granted = _grantRole(MINTER_ROLE, minter);

        // Set minter allowance
        $.minterAllowance[minter] = minterAllowanceAmount;

        // Emit event
        emit MinterConfigured(minter, minterAllowanceAmount, granted);
    }

    /**
     * @notice Removes minting privileges from an address
     * @dev Use this to decommission bridges or revoke access from compromised addresses.
     *      Can be called even when paused to allow emergency response.
     * @param minter The address of the minter to remove
     */
    function removeMinter(address minter) external virtual onlyRole(MINTER_ROLE_ADMIN) {
        BridgedCaminoV1Storage storage $ = _getBridgedCaminoV1Storage();

        // Revoke minter role
        _revokeRole(MINTER_ROLE, minter);

        // Remove minter allowance
        $.minterAllowance[minter] = 0;

        // Emit event
        emit MinterRemoved(minter);
    }

    /***************************************************
     *                     BURN                        *
     ***************************************************/

    /**
     * @notice Burns tokens from the caller's balance
     * @dev Restricted to MINTER_ROLE to ensure only bridges burn tokens during unlock operations,
     *      maintaining proper cross-chain accounting. Can be called when paused to allow
     *      emergency supply reduction during security incidents (following USDC pattern).
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) public virtual override onlyRole(MINTER_ROLE) {
        emit Burn(msg.sender, msg.sender, amount);
        super.burn(amount);
    }

    /**
     * @notice Burns tokens from a specified address (requires prior approval)
     * @dev Restricted to MINTER_ROLE for cross-chain accounting. Can be called when paused
     *      to enable emergency response scenarios like burning tokens from compromised addresses.
     * @param from The address from which to burn tokens
     * @param amount The amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public virtual override onlyRole(MINTER_ROLE) {
        emit Burn(msg.sender, from, amount);
        super.burnFrom(from, amount);
    }

    /***************************************************
     *                    PAUSER                       *
     ***************************************************/

    /**
     * @notice Activates emergency stop, preventing mints and transfers
     * @dev Use this immediately upon detecting a security incident. Pausing stops new supply
     *      creation and token movement while allowing burns for incident remediation.
     */
    function pause() public virtual onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Deactivates emergency stop, resuming normal operations
     * @dev Use this after security incident is resolved and contract state is verified as safe.
     */
    function unpause() public virtual onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /***************************************************
     *                  UPGRADE AUTH                   *
     ***************************************************/

    /**
     * @notice Authorizes upgrading the contract implementation
     * @dev UUPS upgrade authorization. Restricted to UPGRADER_ROLE to ensure only authorized
     *      governance can deploy new logic while maintaining the same proxy address.
     * @param newImplementation The address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(UPGRADER_ROLE) {}

    /***************************************************
     *                 BLACKLIST AUTH                  *
     ***************************************************/

    /**
     * @dev Overrides ERC20 approve to add blacklist checks
     *      Checks msg.sender to prevent blacklisted users from granting approvals via permit or other mechanisms.
     *      Checks owner and spender to prevent blacklisted addresses from participating in the approval system.
     * @param owner The address of the token owner
     * @param spender The address of the spender
     * @param value The amount of tokens to approve
     * @param emitEvent Whether to emit the Approval event
     */
    function _approve(
        address owner,
        address spender,
        uint256 value,
        bool emitEvent
    )
        internal
        virtual
        override(ERC20Upgradeable)
        notBlacklisted(owner)
        notBlacklisted(spender)
        notBlacklisted(msg.sender)
    {
        super._approve(owner, spender, value, emitEvent);
    }

    /**
     * @dev Overrides ERC20 update to add blacklist and pause checks
     *      Checks msg.sender in addition to from/to to prevent blacklisted addresses from
     *      moving tokens via third-party mechanisms like transferFrom or contract interactions.
     *      Allows burning even when paused (to == address(0)) to enable emergency supply reduction.
     * @param from The address of the sender (address(0) for minting)
     * @param to The address of the recipient (address(0) for burning)
     * @param value The amount of tokens to transfer
     */
    function _update(
        address from,
        address to,
        uint256 value
    )
        internal
        virtual
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
        notBlacklisted(from)
        notBlacklisted(to)
        notBlacklisted(msg.sender)
    {
        // Allow burning even when paused for emergency supply reduction
        // For all other operations (mint, transfer), enforce pause check
        if (to != address(0)) {
            _requireNotPaused();
        }

        // Call ERC20Upgradeable._update directly to bypass ERC20PausableUpgradeable's pause check
        // since we're handling pause logic manually above
        ERC20Upgradeable._update(from, to, value);
    }
}
