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
 * @notice A pausable, upgradable and permit-enabled ERC20 token with minting and burning capabilities.
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
    /**
     * @dev PAUSER_ROLE is a role that allows a user to pause and unpause the contract
     */
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /**
     * @dev PAUSER_ROLE_ADMIN is the role that can grant and revoke the PAUSER_ROLE
     */
    bytes32 public constant PAUSER_ROLE_ADMIN = keccak256("PAUSER_ROLE_ADMIN");

    /**
     * @dev MINTER_ROLE is a role that allows a user to mint tokens
     */
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @dev MINTER_ROLE_ADMIN is the role that can grant and revoke the MINTER_ROLE
     */
    bytes32 public constant MINTER_ROLE_ADMIN = keccak256("MINTER_ROLE_ADMIN");

    /**
     * @dev UPGRADER_ROLE is a role that allows a user to upgrade the contract
     */
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /**
     * @dev UPGRADER_ROLE_ADMIN is the role that can grant and revoke the UPGRADER_ROLE
     */
    bytes32 public constant UPGRADER_ROLE_ADMIN = keccak256("UPGRADER_ROLE_ADMIN");

    /***************************************************
     *                   STORAGE                       *
     ***************************************************/

    /// @custom:storage-location erc7201:camino.network.BridgedCaminoV1
    struct BridgedCaminoV1Storage {
        // Minter allowances
        mapping(address minter => uint256 allowance) minterAllowed;
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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        address defaultAdmin,
        address pauser,
        address upgrader
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __ERC20Permit_init(_name);
        __UUPSUpgradeable_init();
        __Blacklistable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(UPGRADER_ROLE, upgrader);

        _setRoleAdmin(PAUSER_ROLE, PAUSER_ROLE_ADMIN);
        _setRoleAdmin(MINTER_ROLE, MINTER_ROLE_ADMIN);
        _setRoleAdmin(UPGRADER_ROLE, UPGRADER_ROLE_ADMIN);
    }

    /***************************************************
     *                     MINT                        *
     ***************************************************/

    /**
     * @notice Mint `amount` tokens to `to` using the minter's allowance
     * @dev Only `MINTER_ROLE` can call this function
     * @param to The address of the recipient
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external virtual whenNotPaused onlyRole(MINTER_ROLE) {
        BridgedCaminoV1Storage storage $ = _getBridgedCaminoV1Storage();

        uint256 minterAllowedAmount = $.minterAllowed[msg.sender];

        if (minterAllowedAmount < amount) {
            revert AmountExceedsMintAllowance(msg.sender, amount);
        }

        $.minterAllowed[msg.sender] = minterAllowedAmount - amount;

        emit Mint(msg.sender, to, amount);

        _mint(to, amount);
    }

    /**
     * @notice Get the mint allowance of the `minter`
     * @param minter The address of the minter
     * @return amount The allowance of the minter
     */
    function minterAllowance(address minter) external view virtual returns (uint256 amount) {
        BridgedCaminoV1Storage storage $ = _getBridgedCaminoV1Storage();
        return $.minterAllowed[minter];
    }

    /**
     * @notice Configure a `minter` with an initial allowance of `minterAllowedAmount`
     * @dev Only `MINTER_ROLE_ADMIN` can call this function
     * @param minter The address of the minter
     * @param minterAllowedAmount The initial allowance of the minter
     */
    function configureMinter(
        address minter,
        uint256 minterAllowedAmount
    ) external whenNotPaused onlyRole(MINTER_ROLE_ADMIN) {
        BridgedCaminoV1Storage storage $ = _getBridgedCaminoV1Storage();

        // Grant minter role
        bool granted = _grantRole(MINTER_ROLE, minter);

        // Set minter allowance
        $.minterAllowed[minter] = minterAllowedAmount;

        // Emit event
        emit MinterConfigured(minter, minterAllowedAmount, granted);
    }

    /**
     * @notice Revoke the minter role from `minter` and remove its allowance
     * @dev Only `MINTER_ROLE_ADMIN` can call this function
     * @param minter The address of the minter
     */
    function removeMinter(address minter) external virtual onlyRole(MINTER_ROLE_ADMIN) {
        BridgedCaminoV1Storage storage $ = _getBridgedCaminoV1Storage();

        // Revoke minter role
        _revokeRole(MINTER_ROLE, minter);

        // Remove minter allowance
        $.minterAllowed[minter] = 0;

        // Emit event
        emit MinterRemoved(minter);
    }

    /***************************************************
     *                     BURN                        *
     ***************************************************/

    /**
     * @notice Burns `amount` tokens from the caller.
     * @dev Only `MINTER_ROLE` can call this function
     * @param amount The amount of tokens to burn.
     */
    function burn(uint256 amount) public virtual override whenNotPaused onlyRole(MINTER_ROLE) {
        emit Burn(msg.sender, msg.sender, amount);
        super.burn(amount);
    }

    /**
     * @notice Burns `amount` tokens from `from`.
     * @dev Only `MINTER_ROLE` can call this function
     * @param from The address from which to burn tokens.
     * @param amount The amount of tokens to burn.
     */
    function burnFrom(address from, uint256 amount) public virtual override whenNotPaused onlyRole(MINTER_ROLE) {
        emit Burn(msg.sender, from, amount);
        super.burnFrom(from, amount);
    }

    /***************************************************
     *                    PAUSER                       *
     ***************************************************/

    /**
     * @notice Pauses the contract
     * @dev Only `PAUSER_ROLE` can call this function
     */
    function pause() public virtual onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses the contract
     * @dev Only `PAUSER_ROLE` can call this function
     */
    function unpause() public virtual onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /***************************************************
     *                  UPGRADE AUTH                   *
     ***************************************************/

    /**
     * @notice Authorizes the upgrade
     * @dev Only `UPGRADER_ROLE` can call this function
     * @param newImplementation The address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(UPGRADER_ROLE) {}

    /***************************************************
     *                 BLACKLIST AUTH                  *
     ***************************************************/

    /**
     * @notice Approves a spender to spend the specified value of tokens on behalf of the owner
     * @dev This function checks that the owner, spender, and caller are not blacklisted
     * @param owner The address of the token owner
     * @param spender The address of the spender
     * @param value The amount of tokens to approve
     * @param emitEvent A flag indicating whether to emit the Approval event
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
     * @notice Updates the token balances of `from` and `to` after a transfer
     * @dev This function checks that `from`, `to`, and the caller are not blacklisted
     * @param from The address of the sender
     * @param to The address of the recipient
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
        super._update(from, to, value);
    }
}
