// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.22;

import { MintController } from "./MintController.sol";

/**
 * @title MasterMinter
 * @notice MasterMinter uses multiple controllers to manage minters for a contract
 *         that implements the IMinterManagement interface
 * @dev MasterMinter inherits all its functionality from MintController.
 *      This provides a clean separation of concerns:
 *      - Owner (typically a multisig or governance contract) manages controllers
 *      - Controllers (typically EOAs or automated systems) manage individual minters
 *      - Minters (typically bridge contracts) mint tokens within their allowances
 *
 *      This is a modernized version of USDC's MasterMinter contract.
 */
contract MasterMinter is MintController {
    /**
     * @notice Initializes the MasterMinter with a minter manager and owner
     * @param minterManager The address of the minter manager contract (typically the token contract)
     * @param owner The address of the owner (typically a multisig or governance contract)
     */
    constructor(address minterManager, address owner) MintController(minterManager, owner) {}
}
