# Bridged Camino

This repository contains the smart contracts for CAM ERC20 tokens on
EVM-compatible chains.

## Naming

The token should be named as follows:

- Token name:
    - `Bridged Camino (Third-Party Team)` if deployed and managed by a
      third-party bridge/team.
    - `Camino Token` if deployed and managed by Camino Network Foundation.
- Token symbol:
    - If deployed and managed by a third-party bridge/team (not Camino Network
      Foundation): `CAM.c` (`.c` indicates it's a bridged token originating from
      the `Camino` chain)
    - If deployed and managed by the Camino Network Foundation: `CAM`

## Fork this Repository

To use this repository as a base for your Bridged Camino token, fork it.

## Documentation

For comprehensive instructions on deployment, configuration, and detailed contract information, please refer to the following:

- [**Deployment Guide**](./docs/DEPLOYMENT.md): Detailed steps for deploying the Bridged Camino token and MasterMinter system.
- [**Developer Documentation**](./docs/README.md): Project overview, development guide, and information on running tests and generating documentation.
- [**Contract API Reference**](./docs/api/index.md): Auto-generated documentation for the smart contracts.
