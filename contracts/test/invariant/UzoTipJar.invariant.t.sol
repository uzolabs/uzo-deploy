// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {UzoTipJar} from "../../src/templates/UzoTipJar.sol";
import {MockUSDT} from "../mocks/Mocks.sol";

contract TipJarHandler is Test {
    UzoTipJar public immutable jar;
    MockUSDT public immutable usdt;
    address[] internal actors;

    uint256 public nativeTipped;
    uint256 public tokenTipped;
    uint256 public tipCount;

    constructor(UzoTipJar jar_, MockUSDT usdt_) {
        jar = jar_;
        usdt = usdt_;
        for (uint256 i; i < 5; ++i) {
            actors.push(makeAddr(string(abi.encodePacked("actor", vm.toString(i)))));
        }
    }

    function tipNative(uint256 actorSeed, uint256 amount, uint8 messageLength) external {
        address actor = actors[actorSeed % actors.length];
        amount = bound(amount, 1, 1_000 ether);
        vm.deal(actor, amount);
        vm.prank(actor);
        jar.tipNative{value: amount}(string(new bytes(bound(messageLength, 0, 140))));
        nativeTipped += amount;
        ++tipCount;
    }

    function tipToken(uint256 actorSeed, uint256 amount, uint8 messageLength) external {
        address actor = actors[actorSeed % actors.length];
        amount = bound(amount, 1, 1e15);
        usdt.mint(actor, amount);
        vm.startPrank(actor);
        usdt.approve(address(jar), amount);
        jar.tipToken(amount, string(new bytes(bound(messageLength, 0, 140))));
        vm.stopPrank();
        tokenTipped += amount;
        ++tipCount;
    }

    /// Plain transfers must always fail.
    function sendPlain(uint256 actorSeed, uint256 amount) external {
        address actor = actors[actorSeed % actors.length];
        amount = bound(amount, 1, 1_000 ether);
        vm.deal(actor, amount);
        vm.prank(actor);
        (bool ok,) = address(jar).call{value: amount}("");
        assertFalse(ok);
    }
}

contract UzoTipJarInvariantTest is Test {
    address internal recipient = makeAddr("recipient");
    MockUSDT internal usdt;
    UzoTipJar internal jar;
    TipJarHandler internal handler;

    function setUp() public {
        usdt = new MockUSDT();
        jar = new UzoTipJar(recipient, address(usdt), "jar");
        handler = new TipJarHandler(jar, usdt);
        targetContract(address(handler));
    }

    /// The jar never holds BOT.
    function invariant_nativeBalanceIsZero() public view {
        assertEq(address(jar).balance, 0);
    }

    /// The jar never holds USDT.
    function invariant_tokenBalanceIsZero() public view {
        assertEq(usdt.balanceOf(address(jar)), 0);
    }

    /// Everything tipped reached the recipient.
    function invariant_recipientReceivedEverything() public view {
        assertEq(recipient.balance, handler.nativeTipped());
        assertEq(usdt.balanceOf(recipient), handler.tokenTipped());
    }
}
