// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {UzoToken, UZO_TOKEN_ID, UZO_TOKEN_VERSION} from "../templates/UzoToken.sol";

/// @title UzoTokenFactory
/// @notice Deploys UzoToken contracts with CREATE2. It has no owner, no fees and no state.
/// The salt includes the caller, so nobody can take another person's address.
/// @dev Tested, not audited.
contract UzoTokenFactory {
    /// @notice A new instance was deployed.
    /// @param deployer Who called `deploy`.
    /// @param instance The new contract.
    /// @param templateId The template identifier.
    /// @param version The template version.
    event Deployed(
        address indexed deployer,
        address indexed instance,
        bytes32 indexed templateId,
        uint16 version
    );

    /// @notice Deploys a new UzoToken. The whole supply goes to `recipient`.
    /// @param userSalt Any value. Combined with the caller to make the CREATE2 salt.
    /// @param name Token name.
    /// @param symbol Token symbol.
    /// @param initialSupply Total supply in base units (18 decimals).
    /// @param recipient Receives the whole supply.
    /// @return instance The new token.
    function deploy(
        bytes32 userSalt,
        string calldata name,
        string calldata symbol,
        uint256 initialSupply,
        address recipient
    ) external returns (address instance) {
        instance = address(
            new UzoToken{salt: _salt(msg.sender, userSalt)}(name, symbol, initialSupply, recipient)
        );
        emit Deployed(msg.sender, instance, UZO_TOKEN_ID, UZO_TOKEN_VERSION);
    }

    /// @notice The address `deploy` would return for these inputs.
    /// @param deployer The account that will call `deploy`.
    /// @param userSalt The salt it will pass.
    /// @param name Token name.
    /// @param symbol Token symbol.
    /// @param initialSupply Total supply in base units.
    /// @param recipient Receives the whole supply.
    /// @return The predicted address.
    function predictAddress(
        address deployer,
        bytes32 userSalt,
        string calldata name,
        string calldata symbol,
        uint256 initialSupply,
        address recipient
    ) external view returns (address) {
        bytes memory initCode = abi.encodePacked(
            type(UzoToken).creationCode, abi.encode(name, symbol, initialSupply, recipient)
        );
        return Create2.computeAddress(_salt(deployer, userSalt), keccak256(initCode));
    }

    function _salt(address deployer, bytes32 userSalt) private pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }
}
