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

    /**
     * @dev Maximum allowance that each controller can assign to its minter.
     *      When configureController is called, defaults to 0 (zero-only controller).
     *      Owner must explicitly set ceiling via setControllerCeiling.
     *      Special value: type(uint256).max means unlimited.
     */
    mapping(address controller => uint256 ceiling) internal controllerCeilings;

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

    /**
     * @notice Emitted when a controller's allowance ceiling is updated
     * @param controller The address of the controller
     * @param ceiling The new ceiling value (type(uint256).max means unlimited)
     */
    event ControllerCeilingUpdated(address indexed controller, uint256 ceiling);

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

    /**
     * @notice Thrown when trying to set an allowance that exceeds the controller's ceiling
     * @param requestedAllowance The allowance that was requested
     * @param ceiling The maximum allowed ceiling for this controller
     */
    error AllowanceExceedsCeiling(uint256 requestedAllowance, uint256 ceiling);

    /***************************************************
     *                CONSTRUCTOR                      *
     ***************************************************/

    /**
     * @notice Initializes the MintController with a minter manager and owner
     * @dev Can be deployed with address(0) for minterManager to support atomic deployment
     *      where MasterMinter is deployed before the token. In this case, setMinterManager()
     *      must be called before any controller functions can be used.
     * @param minterManager_ The address of the minter manager contract (can be address(0))
     * @param owner The address of the owner
     */
    constructor(address minterManager_, address owner) Controller(owner) {
        // Allow address(0) for deployment flexibility
        // If deployed with address(0), setMinterManager() must be called before use
        if (minterManager_ != address(0)) {
            minterManager = IMinterManagement(minterManager_);
        }
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

    /**
     * @notice Gets the allowance ceiling for a controller
     * @param controller The address of the controller
     * @return The ceiling value (type(uint256).max means unlimited)
     */
    function getControllerCeiling(address controller) external view returns (uint256) {
        return controllerCeilings[controller];
    }

    /***************************************************
     *           ONLY OWNER FUNCTIONS                  *
     ***************************************************/

    /**
     * @notice Sets the minter manager
     * @dev This function serves two purposes:
     *      1. Initial setup: If deployed with address(0), this sets the minter manager for the first time
     *      2. Migration: Allows changing to a new token contract if needed
     * @param newMinterManager The address of the new minter manager contract
     */
    function setMinterManager(address newMinterManager) public onlyOwner {
        if (newMinterManager == address(0)) {
            revert MinterManagerZeroAddress();
        }

        emit MinterManagerSet(address(minterManager), newMinterManager);
        minterManager = IMinterManagement(newMinterManager);
    }

    /**
     * @notice Configure a controller with the given worker (minter)
     * @dev Overrides Controller.configureController to also set a default ceiling of 0.
     *      The ceiling defaults to 0 (zero-only controller) for safety.
     *      Owner must call setControllerCeiling to grant higher allowance permissions.
     * @param controller The controller to be configured with a worker
     * @param worker The worker (minter) to be set for the controller
     */
    function configureController(address controller, address worker) public override onlyOwner {
        super.configureController(controller, worker);
        // Set default ceiling to 0 (zero-only, safest default)
        // Owner must explicitly call setControllerCeiling to grant allowance permissions
        if (controllerCeilings[controller] == 0) {
            // Only set if not already configured (to avoid resetting an existing ceiling)
            controllerCeilings[controller] = 0;
            emit ControllerCeilingUpdated(controller, 0);
        }
    }

    /**
     * @notice Sets the allowance ceiling for a controller
     * @dev Ceiling values:
     *      - 0: Controller can only set allowance to 0 (can only disable minters)
     *      - Any value > 0 and < max: Maximum allowance the controller can assign
     *      - type(uint256).max: Unlimited
     *      Only the owner can set controller ceilings.
     * @param controller The address of the controller
     * @param ceiling The maximum allowance the controller can assign
     */
    function setControllerCeiling(address controller, uint256 ceiling) public onlyOwner {
        controllerCeilings[controller] = ceiling;
        emit ControllerCeilingUpdated(controller, ceiling);
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
        _validateAllowanceCeiling(msg.sender, newAllowance);
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

        _validateAllowanceCeiling(msg.sender, newAllowance);

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
     * @notice Validates that the requested allowance does not exceed the controller's ceiling
     * @dev Ceiling of type(uint256).max means unlimited (no validation).
     *      Any other ceiling value is enforced.
     * @param controller The controller address to check
     * @param newAllowance The allowance to validate
     */
    function _validateAllowanceCeiling(address controller, uint256 newAllowance) internal view {
        uint256 ceiling = controllerCeilings[controller];

        // Max ceiling means unlimited, no validation needed
        if (ceiling == type(uint256).max) {
            return;
        }

        // Enforce ceiling
        if (newAllowance > ceiling) {
            revert AllowanceExceedsCeiling(newAllowance, ceiling);
        }
    }

    /**
     * @notice Uses the IMinterManagement interface to enable the minter and set its allowance
     * @param minter Minter to set new allowance of
     * @param newAllowance New allowance to be set for minter
     */
    function _setMinterAllowance(address minter, uint256 newAllowance) internal {
        minterManager.configureMinter(minter, newAllowance);
    }
}
