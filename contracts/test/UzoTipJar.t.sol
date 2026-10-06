// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {UzoTipJar} from "../src/templates/UzoTipJar.sol";
import {
    MockUSDT,
    FalseReturningToken,
    ReentrantToken,
    RejectingRecipient,
    ReentrantRecipient
} from "./mocks/Mocks.sol";

contract UzoTipJarTest is Test {
    address internal recipient = makeAddr("recipient");
    address internal tipper = makeAddr("tipper");

    MockUSDT internal usdt;
    UzoTipJar internal jar;

    event Tipped(address indexed from, address indexed token, uint256 amount, string message);

    function setUp() public {
        usdt = new MockUSDT();
        jar = new UzoTipJar(recipient, address(usdt), "Buy me a coffee");
        vm.deal(tipper, 100 ether);
        usdt.mint(tipper, 1_000_000e6);
        vm.prank(tipper);
        usdt.approve(address(jar), type(uint256).max);
    }

    // ---------- constructor ----------

    function test_constructor_setsState() public view {
        assertEq(jar.recipient(), recipient);
        assertEq(address(jar.usdt()), address(usdt));
        assertEq(jar.title(), "Buy me a coffee");
    }

    function test_constructor_allowsEmptyAndMaxTitle() public {
        assertEq(new UzoTipJar(recipient, address(usdt), "").title(), "");
        string memory t64 = string(new bytes(64));
        assertEq(bytes(new UzoTipJar(recipient, address(usdt), t64).title()).length, 64);
    }

    function test_constructor_revertsOnZeroRecipient() public {
        vm.expectRevert(UzoTipJar.InvalidRecipient.selector);
        new UzoTipJar(address(0), address(usdt), "");
    }

    function test_constructor_revertsWhenRecipientIsItself() public {
        address predicted = vm.computeCreateAddress(address(this), vm.getNonce(address(this)));
        vm.expectRevert(UzoTipJar.InvalidRecipient.selector);
        new UzoTipJar(predicted, address(usdt), "");
    }

    function test_constructor_revertsOnZeroToken() public {
        vm.expectRevert(UzoTipJar.ZeroToken.selector);
        new UzoTipJar(recipient, address(0), "");
    }

    function test_constructor_revertsOnLongTitle() public {
        vm.expectRevert(abi.encodeWithSelector(UzoTipJar.TitleTooLong.selector, 65));
        new UzoTipJar(recipient, address(usdt), string(new bytes(65)));
    }

    function test_uzoTemplate() public view {
        (bytes32 id, uint16 version) = jar.uzoTemplate();
        assertEq(id, bytes32("uzo.tipjar"));
        assertEq(version, 1);
    }

    // ---------- tipNative ----------

    function test_tipNative_forwardsAndEmits() public {
        vm.expectEmit(true, true, false, true, address(jar));
        emit Tipped(tipper, address(0), 1 ether, "gm");
        vm.prank(tipper);
        jar.tipNative{value: 1 ether}("gm");
        assertEq(recipient.balance, 1 ether);
        assertEq(address(jar).balance, 0);
    }

    function test_tipNative_revertsOnZero() public {
        vm.expectRevert(UzoTipJar.ZeroAmount.selector);
        vm.prank(tipper);
        jar.tipNative("gm");
    }

    function test_tipNative_messageLimit() public {
        vm.prank(tipper);
        jar.tipNative{value: 1}(string(new bytes(140)));
        vm.expectRevert(abi.encodeWithSelector(UzoTipJar.MessageTooLong.selector, 141));
        vm.prank(tipper);
        jar.tipNative{value: 1}(string(new bytes(141)));
    }

    function test_tipNative_revertsWhenRecipientRejects() public {
        UzoTipJar j = new UzoTipJar(address(new RejectingRecipient()), address(usdt), "");
        vm.expectRevert(UzoTipJar.NativeTransferFailed.selector);
        vm.prank(tipper);
        j.tipNative{value: 1 ether}("");
    }

    function test_tipNative_reentrancyBlocked() public {
        ReentrantRecipient r = new ReentrantRecipient();
        UzoTipJar j = new UzoTipJar(address(r), address(usdt), "");
        r.setJar(j);
        // The reentrant call fails inside receive(), so the outer transfer fails.
        vm.expectRevert(UzoTipJar.NativeTransferFailed.selector);
        vm.prank(tipper);
        j.tipNative{value: 1 ether}("");
    }

    function testFuzz_tipNative(uint256 amount, bytes calldata message) public {
        amount = bound(amount, 1, 100 ether);
        vm.assume(message.length <= 140);
        uint256 before = recipient.balance;
        vm.prank(tipper);
        jar.tipNative{value: amount}(string(message));
        assertEq(recipient.balance - before, amount);
        assertEq(address(jar).balance, 0);
    }

    // ---------- tipToken ----------

    function test_tipToken_transfersAndEmits() public {
        vm.expectEmit(true, true, false, true, address(jar));
        emit Tipped(tipper, address(usdt), 5e6, "thanks");
        vm.prank(tipper);
        jar.tipToken(5e6, "thanks");
        assertEq(usdt.balanceOf(recipient), 5e6);
        assertEq(usdt.balanceOf(address(jar)), 0);
    }

    function test_tipToken_revertsOnZero() public {
        vm.expectRevert(UzoTipJar.ZeroAmount.selector);
        vm.prank(tipper);
        jar.tipToken(0, "");
    }

    function test_tipToken_messageLimit() public {
        vm.expectRevert(abi.encodeWithSelector(UzoTipJar.MessageTooLong.selector, 141));
        vm.prank(tipper);
        jar.tipToken(1, string(new bytes(141)));
    }

    function test_tipToken_revertsWithoutApproval() public {
        address other = makeAddr("other");
        usdt.mint(other, 10e6);
        vm.expectRevert();
        vm.prank(other);
        jar.tipToken(1e6, "");
    }

    function test_tipToken_revertsWithoutBalance() public {
        address other = makeAddr("other");
        vm.prank(other);
        usdt.approve(address(jar), 1e6);
        vm.expectRevert();
        vm.prank(other);
        jar.tipToken(1e6, "");
    }

    function test_tipToken_revertsOnFalseReturn() public {
        FalseReturningToken t = new FalseReturningToken();
        UzoTipJar j = new UzoTipJar(recipient, address(t), "");
        vm.expectRevert(
            abi.encodeWithSelector(SafeERC20.SafeERC20FailedOperation.selector, address(t))
        );
        vm.prank(tipper);
        j.tipToken(1, "");
    }

    function test_tipToken_reentrancyBlocked() public {
        ReentrantToken t = new ReentrantToken();
        UzoTipJar j = new UzoTipJar(recipient, address(t), "");
        t.setJar(j);
        vm.expectRevert(ReentrancyGuardTransient.ReentrancyGuardReentrantCall.selector);
        vm.prank(tipper);
        j.tipToken(1, "");
    }

    function testFuzz_tipToken(uint256 amount, bytes calldata message) public {
        amount = bound(amount, 1, 1_000_000e6);
        vm.assume(message.length <= 140);
        vm.prank(tipper);
        jar.tipToken(amount, string(message));
        assertEq(usdt.balanceOf(recipient), amount);
        assertEq(usdt.balanceOf(address(jar)), 0);
    }

    // ---------- no receive / fallback ----------

    function test_rejectsPlainTransfers() public {
        vm.prank(tipper);
        (bool ok,) = address(jar).call{value: 1 ether}("");
        assertFalse(ok);
        vm.prank(tipper);
        (ok,) = address(jar).call{value: 1 ether}(hex"deadbeef");
        assertFalse(ok);
        assertEq(address(jar).balance, 0);
    }
}
