// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.28;

import { AccessControlEnumerableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title BlacklistableUpgradeable
 * @notice Provides blacklist functionality for token contracts
 * @dev Implements address blacklisting to enable regulatory compliance and incident response.
 *      Use cases include freezing stolen funds, complying with legal requirements, or
 *      preventing compromised addresses from interacting with the token.
 */
abstract contract BlacklistableUpgradeable is Initializable, AccessControlEnumerableUpgradeable {
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE_ADMIN = keccak256("BLACKLISTER_ROLE_ADMIN");

    /***************************************************
     *                   STORAGE                       *
     ***************************************************/

    /// @custom:storage-location erc7201:camino.network.BridgedCamino.blacklistable
    struct BlacklistableStorage {
        mapping(address => bool) blacklisted;
    }

    // ERC-7201 namespaced storage pattern prevents storage collisions during upgrades
    // keccak256(abi.encode(uint256(keccak256("camino.network.BridgedCaminoV1.blacklistable")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant BlacklistableStorageLocation =
        0x68774384eeaf242da1643f15db6daf1574e4e74409b3ab6ed48adc9617047100;

    function _getBlacklistableStorage() internal pure returns (BlacklistableStorage storage $) {
        assembly {
            $.slot := BlacklistableStorageLocation
        }
    }

    /***************************************************
     *                     INIT                        *
     ***************************************************/

    function __Blacklistable_init() internal onlyInitializing {
        _setRoleAdmin(BLACKLISTER_ROLE, BLACKLISTER_ROLE_ADMIN);
    }

    /***************************************************
     *                    EVENTS                       *
     ***************************************************/

    event Blacklisted(address indexed _account);
    event UnBlacklisted(address indexed _account);

    /***************************************************
     *                    ERRORS                       *
     ***************************************************/

    error AccountIsBlacklisted(address _account);

    /***************************************************
     *                  MODIFIERS                      *
     ***************************************************/

    modifier notBlacklisted(address _account) {
        if (_isBlacklisted(_account)) {
            revert AccountIsBlacklisted(_account);
        }
        _;
    }

    /***************************************************
     *                    FUNCS                        *
     ***************************************************/

    function isBlacklisted(address _account) external view returns (bool) {
        return _isBlacklisted(_account);
    }

    /**
     * @notice Adds an address to the blacklist
     * @dev Use this for regulatory compliance, freezing stolen funds, or blocking compromised addresses.
     *      Blacklisted addresses cannot transfer, receive, or approve tokens.
     * @param _account The address to blacklist
     */
    function blacklist(address _account) external onlyRole(BLACKLISTER_ROLE) {
        _blacklist(_account);
        emit Blacklisted(_account);
    }

    /**
     * @notice Removes an address from the blacklist
     * @dev Use this to restore access after legal resolution or when address is no longer a threat.
     * @param _account The address to remove from blacklist
     */
    function unBlacklist(address _account) external onlyRole(BLACKLISTER_ROLE) {
        _unBlacklist(_account);
        emit UnBlacklisted(_account);
    }

    function _isBlacklisted(address _account) internal view virtual returns (bool) {
        return _getBlacklistableStorage().blacklisted[_account];
    }

    function _blacklist(address _account) internal virtual {
        _getBlacklistableStorage().blacklisted[_account] = true;
    }

    function _unBlacklist(address _account) internal virtual {
        _getBlacklistableStorage().blacklisted[_account] = false;
    }
}
