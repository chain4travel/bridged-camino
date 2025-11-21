// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Controller
 * @notice Generic implementation of the owner-controller-worker model
 * @dev One owner manages many controllers. Each controller manages one worker.
 *      Workers may be reused across different controllers.
 *      This is a modernized version of USDC's Controller contract using custom errors.
 */
contract Controller is Ownable {
    /***************************************************
     *                   STORAGE                       *
     ***************************************************/

    /**
     * @dev A controller manages a single worker address.
     * controllers[controller] = worker
     */
    mapping(address controller => address worker) internal controllers;

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

    /***************************************************
     *                  MODIFIERS                      *
     ***************************************************/

    /**
     * @notice Ensures that caller is a controller with a non-zero worker address
     */
    modifier onlyController() {
        if (controllers[msg.sender] == address(0)) {
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
        return controllers[controller];
    }

    /***************************************************
     *           ONLY OWNER FUNCTIONS                  *
     ***************************************************/

    /**
     * @notice Configure a controller with the given worker
     * @dev The worker must be a non-zero address. To disable a controller, use removeController instead.
     * @param controller The controller to be configured with a worker
     * @param worker The worker to be set for the controller
     */
    function configureController(address controller, address worker) public virtual onlyOwner {
        if (controller == address(0)) {
            revert ControllerZeroAddress();
        }
        if (worker == address(0)) {
            revert WorkerZeroAddress();
        }

        controllers[controller] = worker;
        emit ControllerConfigured(controller, worker);
    }

    /**
     * @notice Disables a controller by setting its worker to address(0)
     * @param controller The controller to disable
     */
    function removeController(address controller) public onlyOwner {
        if (controller == address(0)) {
            revert ControllerZeroAddress();
        }
        if (controllers[controller] == address(0)) {
            revert ControllerNotFound(controller);
        }

        controllers[controller] = address(0);
        emit ControllerRemoved(controller);
    }
}
