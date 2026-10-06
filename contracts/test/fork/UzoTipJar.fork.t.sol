// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {UzoTipJarFactory} from "../../src/factories/UzoTipJarFactory.sol";
import {UzoTipJar} from "../../src/templates/UzoTipJar.sol";

/// Runs the tip jar against real testnet USDT on a fork of BOT Chain testnet.
/// Needs BOT_TESTNET_RPC_URL and BOT_TESTNET_USDT, which script/sdk-env.mjs exports from the
/// Uzo SDK. Skips when they are not set. Never forks mainnet.
contract UzoTipJarForkTest is Test {
    uint256 internal constant TESTNET_CHAIN_ID = 968;

    IERC20 internal usdt;
    UzoTipJarFactory internal factory;
    UzoTipJar internal jar;
    address internal recipient = makeAddr("recipient");
    address internal tipper = makeAddr("tipper");
    bool internal forked;

    event Tipped(address indexed from, address indexed token, uint256 amount, string message);

    function setUp() public {
        string memory rpc = vm.envOr("BOT_TESTNET_RPC_URL", string(""));
        address usdtAddr = vm.envOr("BOT_TESTNET_USDT", address(0));
        if (bytes(rpc).length == 0 || usdtAddr == address(0)) return;

        vm.createSelectFork(rpc);
        require(block.chainid == TESTNET_CHAIN_ID, "not BOT Chain testnet");
        forked = true;

        usdt = IERC20(usdtAddr);
        factory = new UzoTipJarFactory(usdtAddr);
        vm.prank(recipient);
        jar = UzoTipJar(factory.deploy(bytes32("fork"), recipient, "Fork test"));
    }

    modifier onlyFork() {
        if (!forked) {
            vm.skip(true);
        }
        _;
    }

    function test_fork_usdtIsSixDecimals() public onlyFork {
        assertEq(IERC20Metadata(address(usdt)).decimals(), 6);
    }

    function test_fork_tipTokenWithRealUsdt() public onlyFork {
        deal(address(usdt), tipper, 10e6);
        vm.startPrank(tipper);
        usdt.approve(address(jar), 2e6);
        vm.expectEmit(true, true, false, true, address(jar));
        emit Tipped(tipper, address(usdt), 2e6, "fork tip");
        jar.tipToken(2e6, "fork tip");
        vm.stopPrank();

        assertEq(usdt.balanceOf(recipient), 2e6);
        assertEq(usdt.balanceOf(tipper), 8e6);
        assertEq(usdt.balanceOf(address(jar)), 0);
    }

    function test_fork_tipTokenNeedsApproval() public onlyFork {
        deal(address(usdt), tipper, 10e6);
        vm.expectRevert();
        vm.prank(tipper);
        jar.tipToken(1e6, "");
    }

    function test_fork_tipNative() public onlyFork {
        vm.deal(tipper, 1 ether);
        vm.prank(tipper);
        jar.tipNative{value: 0.5 ether}("gm");
        assertEq(recipient.balance, 0.5 ether);
        assertEq(address(jar).balance, 0);
    }

    function test_fork_predictAddressMatches() public onlyFork {
        assertEq(
            factory.predictAddress(recipient, bytes32("fork"), recipient, "Fork test"), address(jar)
        );
    }
}
