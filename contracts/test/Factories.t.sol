// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {UzoTokenFactory} from "../src/factories/UzoTokenFactory.sol";
import {UzoNFTFactory} from "../src/factories/UzoNFTFactory.sol";
import {UzoTipJarFactory} from "../src/factories/UzoTipJarFactory.sol";
import {UzoToken} from "../src/templates/UzoToken.sol";
import {UzoNFT} from "../src/templates/UzoNFT.sol";
import {UzoTipJar} from "../src/templates/UzoTipJar.sol";
import {MockUSDT} from "./mocks/Mocks.sol";

contract FactoriesTest is Test {
    event Deployed(
        address indexed deployer,
        address indexed instance,
        bytes32 indexed templateId,
        uint16 version
    );

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    MockUSDT internal usdt;
    UzoTokenFactory internal tokenFactory;
    UzoNFTFactory internal nftFactory;
    UzoTipJarFactory internal tipJarFactory;

    function setUp() public {
        usdt = new MockUSDT();
        tokenFactory = new UzoTokenFactory();
        nftFactory = new UzoNFTFactory();
        tipJarFactory = new UzoTipJarFactory(address(usdt));
    }

    function _nftParams(address owner) internal pure returns (UzoNFTFactory.Params memory) {
        return UzoNFTFactory.Params({
            name: "Collection",
            symbol: "COL",
            baseURI: "ipfs://x/",
            maxSupply: 10,
            owner: owner,
            royaltyReceiver: owner,
            royaltyBps: 250
        });
    }

    // ---------- token factory ----------

    function testFuzz_tokenFactory_predictMatchesDeploy(bytes32 salt, uint256 supply) public {
        supply = bound(supply, 1, type(uint256).max);
        address predicted = tokenFactory.predictAddress(alice, salt, "Tok", "TK", supply, alice);

        vm.expectEmit(true, true, true, true, address(tokenFactory));
        emit Deployed(alice, predicted, bytes32("uzo.token"), 1);
        vm.prank(alice);
        address instance = tokenFactory.deploy(salt, "Tok", "TK", supply, alice);

        assertEq(instance, predicted);
        assertEq(UzoToken(instance).balanceOf(alice), supply);
    }

    function test_tokenFactory_bubblesTemplateErrors() public {
        vm.expectRevert(UzoToken.ZeroSupply.selector);
        tokenFactory.deploy(bytes32(0), "Tok", "TK", 0, alice);
    }

    // ---------- NFT factory ----------

    function testFuzz_nftFactory_predictMatchesDeploy(bytes32 salt) public {
        UzoNFTFactory.Params memory p = _nftParams(alice);
        address predicted = nftFactory.predictAddress(alice, salt, p);

        vm.expectEmit(true, true, true, true, address(nftFactory));
        emit Deployed(alice, predicted, bytes32("uzo.nft"), 1);
        vm.prank(alice);
        address instance = nftFactory.deploy(salt, p);

        assertEq(instance, predicted);
        UzoNFT nft = UzoNFT(instance);
        assertEq(nft.owner(), alice);
        assertEq(nft.maxSupply(), 10);
        assertEq(nft.baseURI(), "ipfs://x/");
    }

    function test_nftFactory_ownerIsParamNotCaller() public {
        vm.prank(alice);
        address instance = nftFactory.deploy(bytes32(0), _nftParams(bob));
        assertEq(UzoNFT(instance).owner(), bob);
    }

    // ---------- tip jar factory ----------

    function test_tipJarFactory_storesUsdt() public view {
        assertEq(tipJarFactory.usdt(), address(usdt));
    }

    function test_tipJarFactory_revertsOnUsdtWithoutCode() public {
        vm.expectRevert(UzoTipJarFactory.InvalidUsdt.selector);
        new UzoTipJarFactory(address(0));
        vm.expectRevert(UzoTipJarFactory.InvalidUsdt.selector);
        new UzoTipJarFactory(makeAddr("eoa"));
    }

    function testFuzz_tipJarFactory_predictMatchesDeploy(bytes32 salt, address recipient) public {
        vm.assume(recipient != address(0));
        address predicted = tipJarFactory.predictAddress(alice, salt, recipient, "Tips");
        vm.assume(recipient != predicted);

        vm.expectEmit(true, true, true, true, address(tipJarFactory));
        emit Deployed(alice, predicted, bytes32("uzo.tipjar"), 1);
        vm.prank(alice);
        address instance = tipJarFactory.deploy(salt, recipient, "Tips");

        assertEq(instance, predicted);
        assertEq(UzoTipJar(instance).recipient(), recipient);
        assertEq(address(UzoTipJar(instance).usdt()), address(usdt));
        assertEq(UzoTipJar(instance).title(), "Tips");
    }

    // ---------- shared CREATE2 properties ----------

    function test_sameSaltDifferentSendersGiveDifferentAddresses() public {
        vm.prank(alice);
        address a = tokenFactory.deploy(bytes32("s"), "Tok", "TK", 1, alice);
        vm.prank(bob);
        address b = tokenFactory.deploy(bytes32("s"), "Tok", "TK", 1, alice);
        assertTrue(a != b);
    }

    function test_cannotSquatAnotherUsersAddress() public {
        address alicePredicted =
            tokenFactory.predictAddress(alice, bytes32("s"), "Tok", "TK", 1, alice);
        vm.prank(bob);
        address bobs = tokenFactory.deploy(bytes32("s"), "Tok", "TK", 1, alice);
        assertTrue(bobs != alicePredicted);

        vm.prank(alice);
        assertEq(tokenFactory.deploy(bytes32("s"), "Tok", "TK", 1, alice), alicePredicted);
    }

    function test_sameSenderSameSaltSameArgsReverts() public {
        vm.startPrank(alice);
        tokenFactory.deploy(bytes32("s"), "Tok", "TK", 1, alice);
        vm.expectRevert();
        tokenFactory.deploy(bytes32("s"), "Tok", "TK", 1, alice);
        vm.stopPrank();
    }

    function test_differentArgsGiveDifferentAddresses() public view {
        address a = tokenFactory.predictAddress(alice, bytes32("s"), "Tok", "TK", 1, alice);
        address b = tokenFactory.predictAddress(alice, bytes32("s"), "Tok", "TK", 2, alice);
        assertTrue(a != b);
    }

    function test_deployEmitsExactlyOneDeployedEvent() public {
        vm.recordLogs();
        vm.prank(alice);
        address instance = tipJarFactory.deploy(bytes32(0), bob, "");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 1);
        assertEq(logs[0].emitter, address(tipJarFactory));
        assertEq(logs[0].topics[0], Deployed.selector);
        assertEq(address(uint160(uint256(logs[0].topics[2]))), instance);
    }

    function test_factoriesHaveNoOwner() public {
        (bool ok,) = address(tokenFactory).call(abi.encodeWithSignature("owner()"));
        assertFalse(ok);
        (ok,) = address(nftFactory).call(abi.encodeWithSignature("owner()"));
        assertFalse(ok);
        (ok,) = address(tipJarFactory).call(abi.encodeWithSignature("owner()"));
        assertFalse(ok);
    }

    function test_gas_deploys() public {
        vm.startPrank(alice);
        tokenFactory.deploy(bytes32("g"), "Gas Token", "GAS", 1_000_000 ether, alice);
        nftFactory.deploy(bytes32("g"), _nftParams(alice));
        tipJarFactory.deploy(bytes32("g"), alice, "Tips for my work");
        vm.stopPrank();
    }
}
