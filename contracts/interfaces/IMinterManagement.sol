// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.22;

/**
 * @title IMinterManagement
 * @notice Interface for contracts that manage minters and their allowances
 * @dev A contract that implements this interface has external functions for adding and removing
 *      minters and modifying their allowances. This is compatible with USDC's MinterManagementInterface
 *      but modernized for Solidity ^0.8.0
 */
interface IMinterManagement {
    /**
     * @notice Checks if an address is a minter
     * @param account The address to check
     * @return True if the address is a minter, false otherwise
     */
    function isMinter(address account) external view returns (bool);

    /**
     * @notice Returns the remaining minting quota for a given minter
     * @param minter The address of the minter
     * @return The remaining allowance of the minter
     */
    function minterAllowance(address minter) external view returns (uint256);

    /**
     * @notice Grants minter role to an address and sets their minting allowance
     * @param minter The address of the minter
     * @param minterAllowedAmount The minting allowance to set
     */
    function configureMinter(address minter, uint256 minterAllowedAmount) external;

    /**
     * @notice Removes minter role from an address
     * @param minter The address of the minter to remove
     */
    function removeMinter(address minter) external;
}
