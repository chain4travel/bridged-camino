// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.22;

import { BridgedCaminoV1 } from "../BridgedCamino.sol";

contract BridgedCaminoUpgradeTest is BridgedCaminoV1 {
    function getTestResult() public pure returns (string memory) {
        return "Success";
    }
}
