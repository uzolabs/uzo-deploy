// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Phase 0 throwaway. Tests BOTScan verification of factory-created
/// contracts that have constructor arguments and immutables. Not product code.
contract SpikeChild {
    address public immutable recipient;
    string public title;

    constructor(address recipient_, string memory title_) {
        recipient = recipient_;
        title = title_;
    }
}

contract SpikeFactory {
    event Deployed(address indexed deployer, address indexed instance);

    function deploy(bytes32 userSalt, address recipient, string calldata title) external returns (address instance) {
        bytes32 salt = keccak256(abi.encode(msg.sender, userSalt));
        instance = address(new SpikeChild{salt: salt}(recipient, title));
        emit Deployed(msg.sender, instance);
    }
}
