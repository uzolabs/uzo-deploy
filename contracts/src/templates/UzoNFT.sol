// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {IUzoTemplate} from "../interfaces/IUzoTemplate.sol";

bytes32 constant UZO_NFT_ID = "uzo.nft";
uint16 constant UZO_NFT_VERSION = 1;

/// @title UzoNFT
/// @notice ERC721 collection with a fixed maximum supply. Only the owner mints. Token IDs are
/// sequential from 1. The owner can change the base URI until they freeze metadata, which is
/// permanent. Optional ERC2981 royalty info, capped at 10%.
/// @dev Tested, not audited. Ownership moves in two steps (transfer, then accept).
contract UzoNFT is ERC721, ERC2981, Ownable2Step, IERC4906, IUzoTemplate {
    /// @notice Highest royalty allowed, in basis points (10%).
    uint96 public constant MAX_ROYALTY_BPS = 1000;

    /// @notice Most tokens that can ever exist. Set once at deployment.
    uint256 public immutable maxSupply;

    /// @notice True once the owner has frozen metadata. It can never be unset.
    bool public metadataFrozen;

    uint256 private _minted;
    string private _baseTokenURI;

    /// @notice The base URI changed.
    /// @param baseURI The new base URI.
    event BaseURIUpdated(string baseURI);
    /// @notice Metadata is now frozen for good.
    event MetadataFrozen();

    /// @notice The name is empty.
    error EmptyName();
    /// @notice The symbol is empty.
    error EmptySymbol();
    /// @notice The maximum supply is zero.
    error ZeroMaxSupply();
    /// @notice The royalty is above `MAX_ROYALTY_BPS`.
    error RoyaltyTooHigh(uint96 bps);
    /// @notice A royalty was set without a receiver.
    error RoyaltyWithoutReceiver();
    /// @notice A batch mint asked for zero tokens.
    error ZeroQuantity();
    /// @notice The mint would go past the maximum supply.
    error MaxSupplyExceeded(uint256 requested, uint256 remaining);
    /// @notice Metadata is frozen and cannot change.
    error MetadataIsFrozen();

    /// @notice Creates the collection.
    /// @param name_ Collection name. Must not be empty.
    /// @param symbol_ Collection symbol. Must not be empty.
    /// @param baseURI_ Base URI. Token URIs are this followed by the token ID. May be empty.
    /// @param maxSupply_ Most tokens that can ever exist. Must be above zero.
    /// @param owner_ First owner. Must not be the zero address.
    /// @param royaltyReceiver Receives royalties, or the zero address for no royalty.
    /// @param royaltyBps Royalty in basis points, at most 1000. Must be zero if there is no receiver.
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_,
        address owner_,
        address royaltyReceiver,
        uint96 royaltyBps
    ) ERC721(name_, symbol_) Ownable(owner_) {
        if (bytes(name_).length == 0) revert EmptyName();
        if (bytes(symbol_).length == 0) revert EmptySymbol();
        if (maxSupply_ == 0) revert ZeroMaxSupply();
        if (royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh(royaltyBps);
        if (royaltyReceiver == address(0)) {
            if (royaltyBps != 0) revert RoyaltyWithoutReceiver();
        } else {
            _setDefaultRoyalty(royaltyReceiver, royaltyBps);
        }
        maxSupply = maxSupply_;
        _baseTokenURI = baseURI_;
    }

    /// @notice Mints the next token to `to`.
    /// @param to Receiver. If it is a contract it must accept ERC721 tokens.
    /// @return tokenId The ID of the new token.
    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        return _mintBatch(to, 1);
    }

    /// @notice Mints `quantity` tokens with consecutive IDs to `to`.
    /// @param to Receiver. If it is a contract it must accept ERC721 tokens.
    /// @param quantity How many tokens to mint. Must be above zero.
    /// @return firstTokenId The ID of the first new token.
    function mintBatch(address to, uint256 quantity)
        external
        onlyOwner
        returns (uint256 firstTokenId)
    {
        return _mintBatch(to, quantity);
    }

    /// @notice Changes the base URI. Not possible once metadata is frozen.
    /// @param baseURI_ The new base URI.
    function setBaseURI(string calldata baseURI_) external onlyOwner {
        if (metadataFrozen) revert MetadataIsFrozen();
        _baseTokenURI = baseURI_;
        emit BaseURIUpdated(baseURI_);
        emit BatchMetadataUpdate(1, type(uint256).max);
    }

    /// @notice Freezes metadata for good. The base URI can never change after this.
    function freezeMetadata() external onlyOwner {
        if (metadataFrozen) revert MetadataIsFrozen();
        metadataFrozen = true;
        emit MetadataFrozen();
    }

    /// @notice How many tokens have been minted so far.
    /// @return The number of minted tokens.
    function totalMinted() external view returns (uint256) {
        return _minted;
    }

    /// @notice The current base URI.
    /// @return The base URI.
    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    /// @inheritdoc IUzoTemplate
    function uzoTemplate() external pure returns (bytes32 id, uint16 version) {
        return (UZO_NFT_ID, UZO_NFT_VERSION);
    }

    /// @notice Whether this contract implements an interface (ERC165).
    /// @param interfaceId The interface identifier.
    /// @return True for ERC721, ERC721Metadata, ERC2981, ERC4906 and ERC165.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981, IERC165)
        returns (bool)
    {
        return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
    }

    function _mintBatch(address to, uint256 quantity) private returns (uint256 firstTokenId) {
        if (quantity == 0) revert ZeroQuantity();
        uint256 minted = _minted;
        uint256 remaining = maxSupply - minted;
        if (quantity > remaining) revert MaxSupplyExceeded(quantity, remaining);
        // Update the counter before any receiver callback runs.
        _minted = minted + quantity;
        firstTokenId = minted + 1;
        for (uint256 i; i < quantity; ++i) {
            _safeMint(to, firstTokenId + i);
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
