// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {UzoFee} from "./UzoFee.sol";
import {UzoNFT, UZO_NFT_ID, UZO_NFT_VERSION} from "../templates/UzoNFT.sol";

/// @title UzoNFTFactory
/// @notice Deploys UzoNFT collections with CREATE2. It has no owner and no state beyond its fee,
/// fixed at deployment (see UzoFee).
/// The salt includes the caller, so nobody can take another person's address.
/// @dev Tested, not audited.
contract UzoNFTFactory is UzoFee {
    /// @notice Creates the factory.
    /// @param fee_ Native amount every deploy must send, in wei.
    /// @param feeRecipient_ Receives every fee. Must not be the zero address.
    constructor(uint256 fee_, address feeRecipient_) UzoFee(fee_, feeRecipient_) {}

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

    /// @notice Deploys a new UzoNFT collection. Send exactly `fee`.
    /// @param userSalt Any value. Combined with the caller to make the CREATE2 salt.
    /// @param p Constructor arguments for the collection.
    /// @return instance The new collection.
    function deploy(bytes32 userSalt, Params calldata p)
        external
        payable
        returns (address instance)
    {
        _checkFee();
        instance = address(
            new UzoNFT{salt: _salt(msg.sender, userSalt)}(
                p.name, p.symbol, p.baseURI, p.maxSupply, p.owner, p.royaltyReceiver, p.royaltyBps
            )
        );
        // The template constructor is our own code, and the fee is paid last, so the order is safe.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Deployed(msg.sender, instance, UZO_NFT_ID, UZO_NFT_VERSION);
        _payFee();
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
