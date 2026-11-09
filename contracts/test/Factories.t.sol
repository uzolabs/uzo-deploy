// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {UzoTokenFactory} from "../src/factories/UzoTokenFactory.sol";
import {UzoNFTFactory} from "../src/factories/UzoNFTFactory.sol";
import {UzoTipJarFactory} from "../src/factories/UzoTipJarFactory.sol";
import {UzoToken} from "../src/templates/UzoToken.sol";
import {UzoNFT} from "../src/templates/UzoNFT.sol";
import {UzoTipJar} from "../src/templates/UzoTipJar.sol";
import {UzoFee} from "../src/factories/UzoFee.sol";
import {MockUSDT} from "./mocks/Mocks.sol";

/// A wallet that refuses native payments.
contract RefusesPayment {}

contract FactoriesTest is Test {
    event Deployed(
        address indexed deployer,
        address indexed instance,
        bytes32 indexed templateId,
        uint16 version
    );

    uint256 internal constant FEE = 0.1 ether;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal feeWallet = makeAddr("fee wallet");

    MockUSDT internal usdt;
    UzoTokenFactory internal tokenFactory;
    UzoNFTFactory internal nftFactory;
    UzoTipJarFactory internal tipJarFactory;

    function setUp() public {
        usdt = new MockUSDT();
        tokenFactory = new UzoTokenFactory(FEE, feeWallet);
        nftFactory = new UzoNFTFactory(FEE, feeWallet);
        tipJarFactory = new UzoTipJarFactory(address(usdt), FEE, feeWallet);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(address(this), 100 ether);
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
        address instance = tokenFactory.deploy{value: FEE}(salt, "Tok", "TK", supply, alice);

        assertEq(instance, predicted);
        assertEq(UzoToken(instance).balanceOf(alice), supply);
    }

    function test_tokenFactory_bubblesTemplateErrors() public {
        vm.expectRevert(UzoToken.ZeroSupply.selector);
        tokenFactory.deploy{value: FEE}(bytes32(0), "Tok", "TK", 0, alice);
    }

    // ---------- NFT factory ----------

    function testFuzz_nftFactory_predictMatchesDeploy(bytes32 salt) public {
        UzoNFTFactory.Params memory p = _nftParams(alice);
        address predicted = nftFactory.predictAddress(alice, salt, p);

        vm.expectEmit(true, true, true, true, address(nftFactory));
        emit Deployed(alice, predicted, bytes32("uzo.nft"), 1);
        vm.prank(alice);
        address instance = nftFactory.deploy{value: FEE}(salt, p);

        assertEq(instance, predicted);
        UzoNFT nft = UzoNFT(instance);
        assertEq(nft.owner(), alice);
        assertEq(nft.maxSupply(), 10);
        assertEq(nft.baseURI(), "ipfs://x/");
    }

    function test_nftFactory_ownerIsParamNotCaller() public {
        vm.prank(alice);
        address instance = nftFactory.deploy{value: FEE}(bytes32(0), _nftParams(bob));
        assertEq(UzoNFT(instance).owner(), bob);
    }

    // ---------- tip jar factory ----------

    function test_tipJarFactory_storesUsdt() public view {
        assertEq(tipJarFactory.usdt(), address(usdt));
    }

    function test_tipJarFactory_revertsOnUsdtWithoutCode() public {
        vm.expectRevert(UzoTipJarFactory.InvalidUsdt.selector);
        new UzoTipJarFactory(address(0), FEE, feeWallet);
        vm.expectRevert(UzoTipJarFactory.InvalidUsdt.selector);
        new UzoTipJarFactory(makeAddr("eoa"), FEE, feeWallet);
    }

    function testFuzz_tipJarFactory_predictMatchesDeploy(bytes32 salt, address recipient) public {
        vm.assume(recipient != address(0));
        address predicted = tipJarFactory.predictAddress(alice, salt, recipient, "Tips");
        vm.assume(recipient != predicted);

        vm.expectEmit(true, true, true, true, address(tipJarFactory));
        emit Deployed(alice, predicted, bytes32("uzo.tipjar"), 1);
        vm.prank(alice);
        address instance = tipJarFactory.deploy{value: FEE}(salt, recipient, "Tips");

        assertEq(instance, predicted);
        assertEq(UzoTipJar(instance).recipient(), recipient);
        assertEq(address(UzoTipJar(instance).usdt()), address(usdt));
        assertEq(UzoTipJar(instance).title(), "Tips");
    }

    // ---------- fee ----------

    function test_fee_storedOnEveryFactory() public view {
        assertEq(tokenFactory.fee(), FEE);
        assertEq(nftFactory.fee(), FEE);
        assertEq(tipJarFactory.fee(), FEE);
        assertEq(tokenFactory.feeRecipient(), feeWallet);
        assertEq(nftFactory.feeRecipient(), feeWallet);
        assertEq(tipJarFactory.feeRecipient(), feeWallet);
    }

    function test_fee_forwardedStraightAway() public {
        vm.startPrank(alice);
        tokenFactory.deploy{value: FEE}(bytes32("f"), "Tok", "TK", 1, alice);
        assertEq(feeWallet.balance, FEE);
        nftFactory.deploy{value: FEE}(bytes32("f"), _nftParams(alice));
        assertEq(feeWallet.balance, 2 * FEE);
        tipJarFactory.deploy{value: FEE}(bytes32("f"), alice, "Tips");
        assertEq(feeWallet.balance, 3 * FEE);
        vm.stopPrank();

        assertEq(alice.balance, 100 ether - 3 * FEE);
        assertEq(address(tokenFactory).balance, 0);
        assertEq(address(nftFactory).balance, 0);
        assertEq(address(tipJarFactory).balance, 0);
    }

    function testFuzz_fee_wrongAmountReverts(uint256 sent) public {
        sent = bound(sent, 0, 10 ether);
        vm.assume(sent != FEE);
        vm.deal(alice, sent);
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(UzoFee.WrongFee.selector, FEE, sent));
        tokenFactory.deploy{value: sent}(bytes32("f"), "Tok", "TK", 1, alice);
        vm.expectRevert(abi.encodeWithSelector(UzoFee.WrongFee.selector, FEE, sent));
        nftFactory.deploy{value: sent}(bytes32("f"), _nftParams(alice));
        vm.expectRevert(abi.encodeWithSelector(UzoFee.WrongFee.selector, FEE, sent));
        tipJarFactory.deploy{value: sent}(bytes32("f"), alice, "Tips");
        vm.stopPrank();
        assertEq(feeWallet.balance, 0);
    }

    function test_fee_failedDeployKeepsTheFee() public {
        vm.prank(alice);
        vm.expectRevert(UzoToken.ZeroSupply.selector);
        tokenFactory.deploy{value: FEE}(bytes32(0), "Tok", "TK", 0, alice);
        assertEq(alice.balance, 100 ether);
        assertEq(feeWallet.balance, 0);
    }

    function test_fee_recipientThatRefusesBlocksTheDeploy() public {
        address refuser = address(new RefusesPayment());
        UzoTokenFactory f = new UzoTokenFactory(FEE, refuser);
        vm.prank(alice);
        vm.expectRevert(UzoFee.FeeTransferFailed.selector);
        f.deploy{value: FEE}(bytes32(0), "Tok", "TK", 1, alice);
    }

    function test_fee_zeroRecipientRejected() public {
        vm.expectRevert(UzoFee.InvalidFeeRecipient.selector);
        new UzoTokenFactory(FEE, address(0));
        vm.expectRevert(UzoFee.InvalidFeeRecipient.selector);
        new UzoNFTFactory(FEE, address(0));
        vm.expectRevert(UzoFee.InvalidFeeRecipient.selector);
        new UzoTipJarFactory(address(usdt), FEE, address(0));
    }

    function test_fee_zeroFeeFactoryIsFree() public {
        UzoTokenFactory f = new UzoTokenFactory(0, feeWallet);
        vm.prank(alice);
        f.deploy(bytes32(0), "Tok", "TK", 1, alice);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(UzoFee.WrongFee.selector, 0, 1));
        f.deploy{value: 1}(bytes32("x"), "Tok", "TK", 1, alice);
    }

    function test_fee_tipsPayNoFee() public {
        vm.prank(alice);
        UzoTipJar jar = UzoTipJar(tipJarFactory.deploy{value: FEE}(bytes32(0), bob, "Tips"));
        uint256 before = bob.balance;
        vm.prank(alice);
        jar.tipNative{value: 1 ether}("hi");
        assertEq(bob.balance, before + 1 ether);
        assertEq(feeWallet.balance, FEE);
    }

    function test_fee_cannotBeChanged() public {
        string[3] memory setters = ["setFee(uint256)", "setFeeRecipient(address)", "withdraw()"];
        for (uint256 i; i < setters.length; i++) {
            (bool ok,) = address(tokenFactory).call(abi.encodeWithSignature(setters[i], 0));
            assertFalse(ok);
        }
    }

    // ---------- shared CREATE2 properties ----------

    function test_sameSaltDifferentSendersGiveDifferentAddresses() public {
        vm.prank(alice);
        address a = tokenFactory.deploy{value: FEE}(bytes32("s"), "Tok", "TK", 1, alice);
        vm.prank(bob);
        address b = tokenFactory.deploy{value: FEE}(bytes32("s"), "Tok", "TK", 1, alice);
        assertTrue(a != b);
    }

    function test_cannotSquatAnotherUsersAddress() public {
        address alicePredicted =
            tokenFactory.predictAddress(alice, bytes32("s"), "Tok", "TK", 1, alice);
        vm.prank(bob);
        address bobs = tokenFactory.deploy{value: FEE}(bytes32("s"), "Tok", "TK", 1, alice);
        assertTrue(bobs != alicePredicted);

        vm.prank(alice);
        assertEq(
            tokenFactory.deploy{value: FEE}(bytes32("s"), "Tok", "TK", 1, alice), alicePredicted
        );
    }

    function test_sameSenderSameSaltSameArgsReverts() public {
        vm.startPrank(alice);
        tokenFactory.deploy{value: FEE}(bytes32("s"), "Tok", "TK", 1, alice);
        vm.expectRevert();
        tokenFactory.deploy{value: FEE}(bytes32("s"), "Tok", "TK", 1, alice);
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
        address instance = tipJarFactory.deploy{value: FEE}(bytes32(0), bob, "");
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
        tokenFactory.deploy{value: FEE}(bytes32("g"), "Gas Token", "GAS", 1_000_000 ether, alice);
        nftFactory.deploy{value: FEE}(bytes32("g"), _nftParams(alice));
        tipJarFactory.deploy{value: FEE}(bytes32("g"), alice, "Tips for my work");
        vm.stopPrank();
    }
}
