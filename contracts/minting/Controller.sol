// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { EnumerableMap } from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

/**
 * @title Controller
 * @notice Generic implementation of the owner-controller-worker model
 * @dev One owner manages many controllers. Each controller manages one worker.
 *      Workers may be reused across different controllers.
 *      This is a modernized version of USDC's Controller contract using custom errors.
 */
contract Controller is Ownable {
    using EnumerableMap for EnumerableMap.AddressToAddressMap;

    /***************************************************
     *                   STORAGE                       *
     ***************************************************/

    /**
     * @dev A controller manages a single worker address.
     * controllers[controller] = worker
     */
    EnumerableMap.AddressToAddressMap private controllers;

    /***************************************************
     *                    EVENTS                       *
     ***************************************************/

    /**
     * @notice Emitted when a controller is configured with a worker
     * @param controller The address of the controller
     * @param worker The address of the worker
     */
    event ControllerConfigured(address indexed controller, address indexed worker);

    /**
     * @notice Emitted when a controller is removed
     * @param controller The address of the controller
     */
    event ControllerRemoved(address indexed controller);

    /***************************************************
     *                    ERRORS                       *
     ***************************************************/

    /**
     * @notice Thrown when a non-controller address attempts a controller-only action
     * @param caller The address that attempted the action
     */
    error NotController(address caller);

    /**
     * @notice Thrown when attempting to configure a controller with a zero address
     */
    error ControllerZeroAddress();

    /**
     * @notice Thrown when attempting to configure a worker with a zero address
     */
    error WorkerZeroAddress();

    /**
     * @notice Thrown when attempting to remove a controller that doesn't exist
     * @param controller The controller address that doesn't exist
     */
    error ControllerNotFound(address controller);

    /**
     * @notice Thrown when attempting to access a controller at an invalid index
     * @param index The invalid index being accessed
     * @param count The current number of controllers
     */
    error IndexOutOfBounds(uint256 index, uint256 count);

    /***************************************************
     *                  MODIFIERS                      *
     ***************************************************/

    /**
     * @notice Ensures that caller is a controller with a non-zero worker address
     */
    modifier onlyController() {
        if (!controllers.contains(msg.sender)) {
            revert NotController(msg.sender);
        }
        _;
    }

    /***************************************************
     *                CONSTRUCTOR                      *
     ***************************************************/

    constructor(address owner) Ownable(owner) {}

    /***************************************************
     *              VIEW FUNCTIONS                     *
     ***************************************************/

    /**
     * @notice Gets the worker address managed by a controller
     * @param controller The controller address
     * @return The worker address (address(0) if controller not configured)
     */
    function getWorker(address controller) external view returns (address) {
        return _getWorker(controller);
    }

    /**
     * @dev Internal function to get the worker address for a controller
     * @param controller The controller address
     * @return The worker address (address(0) if controller not configured)
     */
    function _getWorker(address controller) internal view returns (address) {
        (, address worker) = controllers.tryGet(controller);
        return worker;
    }

    /**
     * @notice Gets the total number of configured controllers
     * @return The count of controllers
     */
    function getControllerCount() external view returns (uint256) {
        return controllers.length();
    }

    /**
     * @notice Gets the controller and worker at a specific index
     * @param index The index to query
     * @return controller The controller address at the given index
     * @return worker The worker address associated with the controller
     */
    function getControllerAt(uint256 index) external view returns (address controller, address worker) {
        if (index >= controllers.length()) {
            revert IndexOutOfBounds(index, controllers.length());
        }
        return controllers.at(index);
    }

    /***************************************************
     *           ONLY OWNER FUNCTIONS                  *
     ***************************************************/

    /**
     * @notice Configure a controller with the given worker
     * @dev The worker must be a non-zero address. To disable a controller, use
     * removeController instead.
     * @param controller The controller to be configured with a worker
     * @param worker The worker to be set for the controller
     */
    function configureController(address controller, address worker) public onlyOwner {
        if (controller == address(0)) {
            revert ControllerZeroAddress();
        }
        if (worker == address(0)) {
            revert WorkerZeroAddress();
        }

        controllers.set(controller, worker);
        emit ControllerConfigured(controller, worker);
    }

    /**
     * @notice Disables a controller by removing it from the enumerable map
     * @dev WARNING: A worker can be managed by multiple controllers. Removing one
     * controller does not affect the worker's status if it remains managed by at
     * least one other controller.
     * @param controller The controller to disable
     */
    function removeController(address controller) public onlyOwner {
        if (controller == address(0)) {
            revert ControllerZeroAddress();
        }
        if (!controllers.contains(controller)) {
            revert ControllerNotFound(controller);
        }

        controllers.remove(controller);
        emit ControllerRemoved(controller);
    }
}
