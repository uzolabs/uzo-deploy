// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {UzoNFT} from "../src/templates/UzoNFT.sol";
import {NFTReceiver, NotNFTReceiver, ReentrantMinter} from "./mocks/Mocks.sol";

contract UzoNFTTest is Test {
    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal royalty = makeAddr("royalty");
    uint256 internal constant MAX = 100;

    UzoNFT internal nft;

    event BaseURIUpdated(string baseURI);
    event MetadataFrozen();
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    function setUp() public {
        nft = new UzoNFT("Collection", "COL", "ipfs://base/", MAX, owner, royalty, 500);
    }

    // ---------- constructor ----------

    function test_constructor_setsState() public view {
        assertEq(nft.name(), "Collection");
        assertEq(nft.symbol(), "COL");
        assertEq(nft.baseURI(), "ipfs://base/");
        assertEq(nft.maxSupply(), MAX);
        assertEq(nft.owner(), owner);
        assertEq(nft.totalMinted(), 0);
        assertFalse(nft.metadataFrozen());
        (address r, uint256 amount) = nft.royaltyInfo(1, 10_000);
        assertEq(r, royalty);
        assertEq(amount, 500);
    }

    function test_constructor_noRoyalty() public {
        UzoNFT n = new UzoNFT("C", "C", "", 1, owner, address(0), 0);
        (address r, uint256 amount) = n.royaltyInfo(1, 10_000);
        assertEq(r, address(0));
        assertEq(amount, 0);
    }

    function test_constructor_revertsOnEmptyName() public {
        vm.expectRevert(UzoNFT.EmptyName.selector);
        new UzoNFT("", "C", "", 1, owner, address(0), 0);
    }

    function test_constructor_revertsOnEmptySymbol() public {
        vm.expectRevert(UzoNFT.EmptySymbol.selector);
        new UzoNFT("C", "", "", 1, owner, address(0), 0);
    }

    function test_constructor_revertsOnZeroMaxSupply() public {
        vm.expectRevert(UzoNFT.ZeroMaxSupply.selector);
        new UzoNFT("C", "C", "", 0, owner, address(0), 0);
    }

    function test_constructor_revertsOnZeroOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new UzoNFT("C", "C", "", 1, address(0), address(0), 0);
    }

    function test_constructor_revertsOnRoyaltyTooHigh() public {
        vm.expectRevert(abi.encodeWithSelector(UzoNFT.RoyaltyTooHigh.selector, uint96(1001)));
        new UzoNFT("C", "C", "", 1, owner, royalty, 1001);
    }

    function test_constructor_revertsOnRoyaltyWithoutReceiver() public {
        vm.expectRevert(UzoNFT.RoyaltyWithoutReceiver.selector);
        new UzoNFT("C", "C", "", 1, owner, address(0), 1);
    }

    function testFuzz_constructor_royalty(uint96 bps, uint256 salePrice) public {
        bps = uint96(bound(bps, 0, 1000));
        salePrice = bound(salePrice, 0, type(uint128).max);
        UzoNFT n = new UzoNFT("C", "C", "", 1, owner, royalty, bps);
        (address r, uint256 amount) = n.royaltyInfo(1, salePrice);
        assertEq(r, royalty);
        assertEq(amount, salePrice * bps / 10_000);
    }

    // ---------- template and interfaces ----------

    function test_uzoTemplate() public view {
        (bytes32 id, uint16 version) = nft.uzoTemplate();
        assertEq(id, bytes32("uzo.nft"));
        assertEq(version, 1);
    }

    function test_supportsInterface() public view {
        assertTrue(nft.supportsInterface(0x01ffc9a7)); // ERC165
        assertTrue(nft.supportsInterface(0x80ac58cd)); // ERC721
        assertTrue(nft.supportsInterface(0x5b5e139f)); // ERC721Metadata
        assertTrue(nft.supportsInterface(0x2a55205a)); // ERC2981
        assertTrue(nft.supportsInterface(0x49064906)); // ERC4906
        assertFalse(nft.supportsInterface(0xffffffff));
    }

    // ---------- mint ----------

    function test_mint_sequentialFromOne() public {
        vm.startPrank(owner);
        assertEq(nft.mint(alice), 1);
        assertEq(nft.mint(alice), 2);
        vm.stopPrank();
        assertEq(nft.ownerOf(1), alice);
        assertEq(nft.ownerOf(2), alice);
        assertEq(nft.totalMinted(), 2);
        assertEq(nft.tokenURI(2), "ipfs://base/2");
    }

    function test_mint_onlyOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        nft.mint(alice);
    }

    function test_mintBatch_onlyOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        nft.mintBatch(alice, 1);
    }

    function test_mintBatch() public {
        vm.prank(owner);
        assertEq(nft.mintBatch(alice, 10), 1);
        vm.prank(owner);
        assertEq(nft.mintBatch(alice, 5), 11);
        assertEq(nft.balanceOf(alice), 15);
        assertEq(nft.ownerOf(15), alice);
        assertEq(nft.totalMinted(), 15);
    }

    function test_mintBatch_revertsOnZero() public {
        vm.expectRevert(UzoNFT.ZeroQuantity.selector);
        vm.prank(owner);
        nft.mintBatch(alice, 0);
    }

    function test_mint_revertsPastMaxSupply() public {
        vm.startPrank(owner);
        nft.mintBatch(alice, MAX);
        vm.expectRevert(abi.encodeWithSelector(UzoNFT.MaxSupplyExceeded.selector, 1, 0));
        nft.mint(alice);
        vm.stopPrank();
    }

    function test_mintBatch_revertsPastMaxSupply() public {
        vm.startPrank(owner);
        nft.mintBatch(alice, MAX - 3);
        vm.expectRevert(abi.encodeWithSelector(UzoNFT.MaxSupplyExceeded.selector, 4, 3));
        nft.mintBatch(alice, 4);
        vm.stopPrank();
    }

    function testFuzz_mintBatch_neverExceedsMax(uint8 a, uint8 b) public {
        uint256 qa = bound(a, 1, MAX);
        uint256 qb = bound(b, 1, MAX);
        vm.startPrank(owner);
        nft.mintBatch(alice, qa);
        if (qa + qb > MAX) {
            vm.expectRevert(abi.encodeWithSelector(UzoNFT.MaxSupplyExceeded.selector, qb, MAX - qa));
            nft.mintBatch(alice, qb);
            assertEq(nft.totalMinted(), qa);
        } else {
            assertEq(nft.mintBatch(alice, qb), qa + 1);
            assertEq(nft.totalMinted(), qa + qb);
        }
        vm.stopPrank();
        assertLe(nft.totalMinted(), MAX);
    }

    function test_mint_toContractReceiver() public {
        NFTReceiver r = new NFTReceiver();
        vm.prank(owner);
        nft.mint(address(r));
        assertEq(nft.ownerOf(1), address(r));
    }

    function test_mint_revertsToNonReceiverContract() public {
        NotNFTReceiver r = new NotNFTReceiver();
        vm.expectRevert(
            abi.encodeWithSelector(IERC721Errors.ERC721InvalidReceiver.selector, address(r))
        );
        vm.prank(owner);
        nft.mint(address(r));
    }

    function test_mint_revertsToZeroAddress() public {
        vm.expectRevert(
            abi.encodeWithSelector(IERC721Errors.ERC721InvalidReceiver.selector, address(0))
        );
        vm.prank(owner);
        nft.mint(address(0));
    }

    function test_mint_reentrantOwnerKeepsIdsConsistent() public {
        ReentrantMinter m = new ReentrantMinter();
        UzoNFT n = new UzoNFT("C", "C", "", 2, address(m), address(0), 0);
        m.setNft(n);
        m.mintOne();
        assertEq(n.totalMinted(), 2);
        assertEq(n.ownerOf(1), address(m));
        assertEq(n.ownerOf(2), address(m));
    }

    // ---------- metadata ----------

    function test_setBaseURI() public {
        vm.expectEmit(false, false, false, true);
        emit BaseURIUpdated("ar://new/");
        vm.expectEmit(false, false, false, true);
        emit BatchMetadataUpdate(1, type(uint256).max);
        vm.prank(owner);
        nft.setBaseURI("ar://new/");
        assertEq(nft.baseURI(), "ar://new/");

        vm.prank(owner);
        nft.mint(alice);
        assertEq(nft.tokenURI(1), "ar://new/1");
    }

    function test_setBaseURI_onlyOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        nft.setBaseURI("x");
    }

    function test_freezeMetadata() public {
        vm.expectEmit(false, false, false, true);
        emit MetadataFrozen();
        vm.prank(owner);
        nft.freezeMetadata();
        assertTrue(nft.metadataFrozen());

        vm.startPrank(owner);
        vm.expectRevert(UzoNFT.MetadataIsFrozen.selector);
        nft.setBaseURI("x");
        vm.expectRevert(UzoNFT.MetadataIsFrozen.selector);
        nft.freezeMetadata();
        vm.stopPrank();
        assertEq(nft.baseURI(), "ipfs://base/");
    }

    function test_freezeMetadata_onlyOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        nft.freezeMetadata();
    }

    function test_mintStillWorksAfterFreeze() public {
        vm.startPrank(owner);
        nft.freezeMetadata();
        nft.mint(alice);
        vm.stopPrank();
        assertEq(nft.tokenURI(1), "ipfs://base/1");
    }

    function test_tokenURI_emptyBase() public {
        UzoNFT n = new UzoNFT("C", "C", "", 1, owner, address(0), 0);
        vm.prank(owner);
        n.mint(alice);
        assertEq(n.tokenURI(1), "");
    }

    // ---------- ownership ----------

    function test_ownership_twoStep() public {
        vm.prank(owner);
        nft.transferOwnership(alice);
        assertEq(nft.owner(), owner);
        assertEq(nft.pendingOwner(), alice);

        vm.prank(alice);
        nft.acceptOwnership();
        assertEq(nft.owner(), alice);

        vm.prank(alice);
        nft.mint(alice);
    }

    function test_ownership_renounceStopsMinting() public {
        vm.prank(owner);
        nft.renounceOwnership();
        assertEq(nft.owner(), address(0));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        vm.prank(owner);
        nft.mint(alice);
    }
}
