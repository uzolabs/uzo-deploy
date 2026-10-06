// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {UzoToken} from "../src/templates/UzoToken.sol";

contract UzoTokenTest is Test {
    address internal recipient = makeAddr("recipient");
    uint256 internal constant SUPPLY = 1_000_000 ether;

    UzoToken internal token;

    function setUp() public {
        token = new UzoToken("Test Token", "TT", SUPPLY, recipient);
    }

    // ---------- constructor ----------

    function test_constructor_mintsWholeSupplyToRecipient() public view {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TT");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.balanceOf(recipient), SUPPLY);
    }

    function test_constructor_emitsTransferFromZero() public {
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), recipient, SUPPLY);
        new UzoToken("A", "B", SUPPLY, recipient);
    }

    function test_constructor_revertsOnEmptyName() public {
        vm.expectRevert(UzoToken.EmptyName.selector);
        new UzoToken("", "TT", SUPPLY, recipient);
    }

    function test_constructor_revertsOnEmptySymbol() public {
        vm.expectRevert(UzoToken.EmptySymbol.selector);
        new UzoToken("Test", "", SUPPLY, recipient);
    }

    function test_constructor_revertsOnZeroSupply() public {
        vm.expectRevert(UzoToken.ZeroSupply.selector);
        new UzoToken("Test", "TT", 0, recipient);
    }

    function test_constructor_revertsOnZeroRecipient() public {
        vm.expectRevert(UzoToken.ZeroRecipient.selector);
        new UzoToken("Test", "TT", SUPPLY, address(0));
    }

    function testFuzz_constructor(uint256 supply, address to) public {
        vm.assume(to != address(0));
        supply = bound(supply, 1, type(uint256).max);
        UzoToken t = new UzoToken("Fuzz", "FZ", supply, to);
        assertEq(t.totalSupply(), supply);
        assertEq(t.balanceOf(to), supply);
    }

    // ---------- template ----------

    function test_uzoTemplate() public view {
        (bytes32 id, uint16 version) = token.uzoTemplate();
        assertEq(id, bytes32("uzo.token"));
        assertEq(version, 1);
    }

    // ---------- no mint, no owner ----------

    function test_hasNoMintOrOwnerFunctions() public {
        (bool ok,) =
            address(token).call(abi.encodeWithSignature("mint(address,uint256)", recipient, 1));
        assertFalse(ok);
        (ok,) = address(token).call(abi.encodeWithSignature("owner()"));
        assertFalse(ok);
    }

    // ---------- burn ----------

    function testFuzz_burn(uint256 amount) public {
        amount = bound(amount, 0, SUPPLY);
        vm.prank(recipient);
        token.burn(amount);
        assertEq(token.totalSupply(), SUPPLY - amount);
        assertEq(token.balanceOf(recipient), SUPPLY - amount);
    }

    function test_burnFrom_needsAllowance() public {
        address spender = makeAddr("spender");
        vm.expectRevert();
        vm.prank(spender);
        token.burnFrom(recipient, 1);

        vm.prank(recipient);
        token.approve(spender, 10);
        vm.prank(spender);
        token.burnFrom(recipient, 10);
        assertEq(token.totalSupply(), SUPPLY - 10);
    }

    // ---------- permit ----------

    function test_permit() public {
        (address owner, uint256 key) = makeAddrAndKey("owner");
        vm.prank(recipient);
        token.transfer(owner, 100);

        address spender = makeAddr("spender");
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                owner,
                spender,
                100,
                token.nonces(owner),
                deadline
            )
        );
        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);

        token.permit(owner, spender, 100, deadline, v, r, s);
        assertEq(token.allowance(owner, spender), 100);
        assertEq(token.nonces(owner), 1);

        // Replay fails.
        vm.expectRevert();
        token.permit(owner, spender, 100, deadline, v, r, s);
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
}
