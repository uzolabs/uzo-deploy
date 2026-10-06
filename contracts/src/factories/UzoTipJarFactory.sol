// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {UzoTipJar, UZO_TIP_JAR_ID, UZO_TIP_JAR_VERSION} from "../templates/UzoTipJar.sol";

/// @title UzoTipJarFactory
/// @notice Deploys UzoTipJar contracts with CREATE2. It has no owner and no fees. Its only
/// state is the USDT address, fixed at deployment. The salt includes the caller, so nobody
/// can take another person's address.
/// @dev Tested, not audited.
contract UzoTipJarFactory {
    /// @notice The token every tip jar from this factory accepts in `tipToken`.
    address public immutable usdt;

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

    /// @notice The USDT address has no code.
    error InvalidUsdt();

    /// @notice Creates the factory.
    /// @param usdt_ USDT on this chain. Must be a deployed contract.
    constructor(address usdt_) {
        if (usdt_.code.length == 0) revert InvalidUsdt();
        usdt = usdt_;
    }

    /// @notice Deploys a new UzoTipJar for `recipient`.
    /// @param userSalt Any value. Combined with the caller to make the CREATE2 salt.
    /// @param recipient Receives every tip.
    /// @param title Title for the tip page, at most 64 bytes.
    /// @return instance The new tip jar.
    function deploy(bytes32 userSalt, address recipient, string calldata title)
        external
        returns (address instance)
    {
        instance =
            address(new UzoTipJar{salt: _salt(msg.sender, userSalt)}(recipient, usdt, title));
        emit Deployed(msg.sender, instance, UZO_TIP_JAR_ID, UZO_TIP_JAR_VERSION);
    }

    /// @notice The address `deploy` would return for these inputs.
    /// @param deployer The account that will call `deploy`.
    /// @param userSalt The salt it will pass.
    /// @param recipient Receives every tip.
    /// @param title Title for the tip page.
    /// @return The predicted address.
    function predictAddress(
        address deployer,
        bytes32 userSalt,
        address recipient,
        string calldata title
    ) external view returns (address) {
        bytes memory initCode =
            abi.encodePacked(type(UzoTipJar).creationCode, abi.encode(recipient, usdt, title));
        return Create2.computeAddress(_salt(deployer, userSalt), keccak256(initCode));
    }

    function _salt(address deployer, bytes32 userSalt) private pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }
}
