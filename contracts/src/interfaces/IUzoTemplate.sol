// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IUzoTemplate
/// @notice Every Uzo template reports which template and version it is.
interface IUzoTemplate {
    /// @notice The template identifier and version of this contract.
    /// @return id Template identifier, a short ASCII string left-aligned in bytes32.
    /// @return version Template version, starting at 1.
    function uzoTemplate() external pure returns (bytes32 id, uint16 version);
}
