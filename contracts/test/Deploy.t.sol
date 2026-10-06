// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../script/Deploy.s.sol";
import {UzoTipJarFactory} from "../src/factories/UzoTipJarFactory.sol";
import {MockUSDT} from "./mocks/Mocks.sol";

/// Calls the script's functions with explicit inputs. vm.setEnv is process-wide and tests run
/// in parallel, so these tests never set environment variables.
contract DeployScriptTest is Test {
    Deploy internal script;
    MockUSDT internal usdt;

    function setUp() public {
        script = new Deploy();
        usdt = new MockUSDT();
    }

    function _net() internal view returns (Deploy.Network memory) {
        return Deploy.Network({name: "testnet", chainId: block.chainid, usdt: address(usdt)});
    }

    function test_deploysAllFactoriesWithSdkUsdt() public {
        (address token, address nft, address tipJar) = script.deploy(_net());
        assertGt(token.code.length, 0);
        assertGt(nft.code.length, 0);
        assertEq(UzoTipJarFactory(tipJar).usdt(), address(usdt));
    }

    function test_rerunReusesExistingFactories() public {
        (address token, address nft, address tipJar) = script.deploy(_net());
        (address token2, address nft2, address tipJar2) = script.deploy(_net());
        assertEq(token, token2);
        assertEq(nft, nft2);
        assertEq(tipJar, tipJar2);
    }

    function test_revertsOnWrongChain() public {
        Deploy.Network memory net = _net();
        net.chainId = block.chainid + 1;
        vm.expectRevert(
            abi.encodeWithSelector(Deploy.WrongChain.selector, net.chainId, block.chainid)
        );
        script.deploy(net);
    }

    function test_revertsWhenUsdtHasNoCode() public {
        Deploy.Network memory net = _net();
        net.usdt = makeAddr("not a token");
        vm.expectRevert(abi.encodeWithSelector(Deploy.UsdtHasNoCode.selector, net.usdt));
        script.deploy(net);
    }

    function test_mainnetRefusedInCi() public {
        vm.expectRevert(Deploy.MainnetFromCi.selector);
        script.resolveNetwork("mainnet", true);
    }

    function test_revertsOnUnknownNetwork() public {
        vm.expectRevert(abi.encodeWithSelector(Deploy.UnknownNetwork.selector, "devnet"));
        script.resolveNetwork("devnet", false);
    }
}
