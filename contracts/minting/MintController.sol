// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.22;

import { Controller } from "./Controller.sol";
import { IMinterManagement } from "../interfaces/IMinterManagement.sol";

/**
 * @title MintController
 * @notice Manages minters for a contract that implements the IMinterManagement interface
 * @dev The MintController contract lets the owner designate certain addresses as controllers,
 *      and these controllers then manage the minters by adding and removing minters, as well as
 *      modifying their minting allowance. A controller may manage exactly one minter, but the same
 *      minter address may be managed by multiple controllers.
 *
 *      MintController inherits from the Controller contract. It treats the Controller workers as minters.
 *      This is a modernized version of USDC's MintController contract using custom errors and Solidity ^0.8.0
 */
contract MintController is Controller {
    /***************************************************
     *                   STORAGE                       *
     ***************************************************/

    /**
     * @dev MintController calls the minterManager to execute/record minter
     * management tasks, as well as to query the status of a minter address.
     */
    IMinterManagement internal minterManager;

    /***************************************************
     *                    EVENTS                       *
     ***************************************************/

    /**
     * @notice Emitted when the minter manager is updated
     * @param oldMinterManager The address of the old minter manager
     * @param newMinterManager The address of the new minter manager
     */
    event MinterManagerSet(address indexed oldMinterManager, address indexed newMinterManager);

    /**
     * @notice Emitted when a minter is configured by a controller
     * @param controller The address of the controller
     * @param minter The address of the minter
     * @param allowance The new allowance for the minter
     */
    event MinterConfigured(address indexed controller, address indexed minter, uint256 allowance);

    /**
     * @notice Emitted when a minter is removed by a controller
     * @param controller The address of the controller
     * @param minter The address of the minter
     */
    event MinterRemoved(address indexed controller, address indexed minter);

    /**
     * @notice Emitted when a minter's allowance is incremented
     * @param controller The address of the controller
     * @param minter The address of the minter
     * @param increment The amount the allowance was incremented by
     * @param newAllowance The new total allowance
     */
    event MinterAllowanceIncremented(
        address indexed controller,
        address indexed minter,
        uint256 increment,
        uint256 newAllowance
    );

    /**
     * @notice Emitted when a minter's allowance is decremented
     * @param controller The address of the controller
     * @param minter The address of the minter
     * @param decrement The amount the allowance was decremented by
     * @param newAllowance The new total allowance
     */
    event MinterAllowanceDecremented(
        address indexed controller,
        address indexed minter,
        uint256 decrement,
        uint256 newAllowance
    );

    /***************************************************
     *                    ERRORS                       *
     ***************************************************/

    /**
     * @notice Thrown when the minter manager address is zero
     */
    error MinterManagerZeroAddress();

    /**
     * @notice Thrown when trying to increment allowance by zero
     */
    error AllowanceIncrementZero();

    /**
     * @notice Thrown when trying to decrement allowance by zero
     */
    error AllowanceDecrementZero();

    /**
     * @notice Thrown when trying to increment/decrement allowance for an inactive minter
     * @param minter The minter address that is not active
     */
    error MinterNotActive(address minter);

    /***************************************************
     *                CONSTRUCTOR                      *
     ***************************************************/

    /**
     * @notice Initializes the MintController with a minter manager and owner
     * @param minterManager_ The address of the minter manager contract
     * @param owner The address of the owner
     */
    constructor(address minterManager_, address owner) Controller(owner) {
        if (minterManager_ == address(0)) {
            revert MinterManagerZeroAddress();
        }
        minterManager = IMinterManagement(minterManager_);
    }

    /***************************************************
     *              VIEW FUNCTIONS                     *
     ***************************************************/

    /**
     * @notice Gets the minter manager
     * @return The minter manager contract
     */
    function getMinterManager() external view returns (IMinterManagement) {
        return minterManager;
    }

    /***************************************************
     *           ONLY OWNER FUNCTIONS                  *
     ***************************************************/

    /**
     * @notice Sets the minter manager
     * @param newMinterManager The address of the new minter manager contract
     */
    function setMinterManager(address newMinterManager) public onlyOwner {
        if (newMinterManager == address(0)) {
            revert MinterManagerZeroAddress();
        }

        emit MinterManagerSet(address(minterManager), newMinterManager);
        minterManager = IMinterManagement(newMinterManager);
    }

    /***************************************************
     *         ONLY CONTROLLER FUNCTIONS               *
     ***************************************************/

    /**
     * @notice Removes the controller's own minter
     * @dev Can only be called by an active controller
     */
    function removeMinter() public onlyController {
        address minter = controllers[msg.sender];
        emit MinterRemoved(msg.sender, minter);
        minterManager.removeMinter(minter);
    }

    /**
     * @notice Enables the minter and sets its allowance
     * @dev Can only be called by an active controller
     * @param newAllowance New allowance to be set for minter
     */
    function configureMinter(uint256 newAllowance) public onlyController {
        address minter = controllers[msg.sender];
        emit MinterConfigured(msg.sender, minter, newAllowance);
        _setMinterAllowance(minter, newAllowance);
    }

    /**
     * @notice Increases the minter's allowance if and only if the minter is an active minter
     * @dev A minter is considered active if minterManager.isMinter(minter) returns true.
     *      Can only be called by an active controller.
     * @param allowanceIncrement The amount to increment the allowance by
     */
    function incrementMinterAllowance(uint256 allowanceIncrement) public onlyController {
        if (allowanceIncrement == 0) {
            revert AllowanceIncrementZero();
        }

        address minter = controllers[msg.sender];
        if (!minterManager.isMinter(minter)) {
            revert MinterNotActive(minter);
        }

        uint256 currentAllowance = minterManager.minterAllowance(minter);
        uint256 newAllowance = currentAllowance + allowanceIncrement;

        emit MinterAllowanceIncremented(msg.sender, minter, allowanceIncrement, newAllowance);
        _setMinterAllowance(minter, newAllowance);
    }

    /**
     * @notice Decreases the minter's allowance if and only if the minter is currently active
     * @dev The controller can safely send a signed decrementMinterAllowance() transaction to a minter
     *      and not worry about it being used to undo a removeMinter() transaction.
     *      If the decrement is greater than the current allowance, the allowance is set to 0.
     *      Can only be called by an active controller.
     * @param allowanceDecrement The amount to decrement the allowance by
     */
    function decrementMinterAllowance(uint256 allowanceDecrement) public onlyController {
        if (allowanceDecrement == 0) {
            revert AllowanceDecrementZero();
        }

        address minter = controllers[msg.sender];
        if (!minterManager.isMinter(minter)) {
            revert MinterNotActive(minter);
        }

        uint256 currentAllowance = minterManager.minterAllowance(minter);
        uint256 actualAllowanceDecrement = currentAllowance > allowanceDecrement
            ? allowanceDecrement
            : currentAllowance;
        uint256 newAllowance = currentAllowance - actualAllowanceDecrement;

        emit MinterAllowanceDecremented(msg.sender, minter, actualAllowanceDecrement, newAllowance);
        _setMinterAllowance(minter, newAllowance);
    }

    /***************************************************
     *           INTERNAL FUNCTIONS                    *
     ***************************************************/

    /**
     * @notice Uses the IMinterManagement interface to enable the minter and set its allowance
     * @param minter Minter to set new allowance of
     * @param newAllowance New allowance to be set for minter
     */
    function _setMinterAllowance(address minter, uint256 newAllowance) internal {
        minterManager.configureMinter(minter, newAllowance);
    }
}
