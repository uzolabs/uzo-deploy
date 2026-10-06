// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {UzoNFT, UZO_NFT_ID, UZO_NFT_VERSION} from "../templates/UzoNFT.sol";

/// @title UzoNFTFactory
/// @notice Deploys UzoNFT collections with CREATE2. It has no owner, no fees and no state.
/// The salt includes the caller, so nobody can take another person's address.
/// @dev Tested, not audited.
contract UzoNFTFactory {
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

    /// @notice Constructor arguments for a new collection.
    /// @param name Collection name.
    /// @param symbol Collection symbol.
    /// @param baseURI Base URI for token metadata.
    /// @param maxSupply Most tokens that can ever exist.
    /// @param owner First owner of the collection.
    /// @param royaltyReceiver Receives royalties, or the zero address for none.
    /// @param royaltyBps Royalty in basis points, at most 1000.
    struct Params {
        string name;
        string symbol;
        string baseURI;
        uint256 maxSupply;
        address owner;
        address royaltyReceiver;
        uint96 royaltyBps;
    }

    /// @notice Deploys a new UzoNFT collection.
    /// @param userSalt Any value. Combined with the caller to make the CREATE2 salt.
    /// @param p Constructor arguments for the collection.
    /// @return instance The new collection.
    function deploy(bytes32 userSalt, Params calldata p) external returns (address instance) {
        instance = address(
            new UzoNFT{salt: _salt(msg.sender, userSalt)}(
                p.name, p.symbol, p.baseURI, p.maxSupply, p.owner, p.royaltyReceiver, p.royaltyBps
            )
        );
        // The only external call is our own template constructor, so the order is safe.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Deployed(msg.sender, instance, UZO_NFT_ID, UZO_NFT_VERSION);
    }

    /// @notice The address `deploy` would return for these inputs.
    /// @param deployer The account that will call `deploy`.
    /// @param userSalt The salt it will pass.
    /// @param p Constructor arguments for the collection.
    /// @return The predicted address.
    function predictAddress(address deployer, bytes32 userSalt, Params calldata p)
        external
        view
        returns (address)
    {
        bytes memory args = abi.encode(
            p.name, p.symbol, p.baseURI, p.maxSupply, p.owner, p.royaltyReceiver, p.royaltyBps
        );
        // creationCode is a fixed constant, so the packed encoding cannot collide.
        // forge-lint: disable-next-line(encode-packed-collision)
        bytes32 initHash = keccak256(abi.encodePacked(type(UzoNFT).creationCode, args));
        return Create2.computeAddress(_salt(deployer, userSalt), initHash);
    }

    function _salt(address deployer, bytes32 userSalt) private pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }
}
