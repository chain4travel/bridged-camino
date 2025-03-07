// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.22;

import { AccessControlEnumerableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

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

    // keccak256(abi.encode(uint256(keccak256("camino.network.BridgedCamino.blacklistable")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant BlacklistableStorageLocation =
        0x8ab61072870d396feb4c0fe4201edd42096db02ccbea2f0e07461744ef273100;

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

    function blacklist(address _account) external onlyRole(BLACKLISTER_ROLE) {
        _blacklist(_account);
        emit Blacklisted(_account);
    }

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
