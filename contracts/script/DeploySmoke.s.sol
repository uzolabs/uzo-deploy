// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {UzoTokenFactory} from "../src/factories/UzoTokenFactory.sol";
import {UzoNFTFactory} from "../src/factories/UzoNFTFactory.sol";
import {UzoTipJarFactory} from "../src/factories/UzoTipJarFactory.sol";

/// Deploys one instance of each template through the recorded factories, as a smoke test.
/// Factory addresses come from config/deployments.json, written by record-deployments.mjs.
/// The sender is a team address: record-deployments.mjs adds it to team-addresses.json so
/// these deployments are always shown separately from real users.
///
///   eval "$(node script/sdk-env.mjs)"
///   UZO_NETWORK=testnet forge script script/DeploySmoke.s.sol --rpc-url bot_testnet \
///     --account <keystore name> --broadcast
///
/// Safe to run again: an instance that already exists is skipped.
contract DeploySmoke is Script {
    bytes32 internal constant USER_SALT = keccak256("uzo.deploy.smoke.v1");

    error WrongChain(uint256 expected, uint256 actual);
    error UnknownNetwork(string name);
    error MainnetFromCi();
    error NoFactory(string key);
    error AddressMismatch(address predicted, address deployed);

    struct Factories {
        UzoTokenFactory token;
        UzoNFTFactory nft;
        UzoTipJarFactory tipJar;
    }

    function run() external returns (address token, address nft, address tipJar) {
        string memory network = vm.envOr("UZO_NETWORK", string("testnet"));
        uint256 chainId = _chainId(network, vm.envOr("CI", false));
        if (block.chainid != chainId) revert WrongChain(chainId, block.chainid);

        Factories memory f = _factories(chainId);

        vm.startBroadcast();
        (, address me,) = vm.readCallers();
        token = _token(f.token, me);
        nft = _nft(f.nft, me);
        tipJar = _tipJar(f.tipJar, me);
        vm.stopBroadcast();
    }

    function _token(UzoTokenFactory factory, address me) internal returns (address instance) {
        string memory name = "Uzo Smoke Test Token";
        string memory symbol = "UZOSMOKE";
        uint256 supply = 1_000_000 ether;
        instance = factory.predictAddress(me, USER_SALT, name, symbol, supply, me);
        if (_isNew(instance, "UzoToken")) {
            _check(factory.deploy(USER_SALT, name, symbol, supply, me), instance);
        }
    }

    function _nft(UzoNFTFactory factory, address me) internal returns (address instance) {
        UzoNFTFactory.Params memory p = UzoNFTFactory.Params({
            name: "Uzo Smoke Test NFT",
            symbol: "UZOSNFT",
            baseURI: "",
            maxSupply: 10,
            owner: me,
            royaltyReceiver: me,
            royaltyBps: 500
        });
        instance = factory.predictAddress(me, USER_SALT, p);
        if (_isNew(instance, "UzoNFT")) _check(factory.deploy(USER_SALT, p), instance);
    }

    function _tipJar(UzoTipJarFactory factory, address me) internal returns (address instance) {
        string memory title = "Uzo smoke test tip jar";
        instance = factory.predictAddress(me, USER_SALT, me, title);
        if (_isNew(instance, "UzoTipJar")) _check(factory.deploy(USER_SALT, me, title), instance);
    }

    function _factories(uint256 chainId) internal view returns (Factories memory f) {
        string memory json =
            vm.readFile(string.concat(vm.projectRoot(), "/../config/deployments.json"));
        string memory base = string.concat(".chains.", vm.toString(chainId), ".factories.");
        f.token = UzoTokenFactory(_factory(json, base, "token"));
        f.nft = UzoNFTFactory(_factory(json, base, "nft"));
        f.tipJar = UzoTipJarFactory(_factory(json, base, "tipJar"));
    }

    function _factory(string memory json, string memory base, string memory key)
        internal
        view
        returns (address factory)
    {
        string memory path = string.concat(base, key, ".address");
        if (!vm.keyExistsJson(json, path)) revert NoFactory(key);
        factory = vm.parseJsonAddress(json, path);
        if (factory.code.length == 0) revert NoFactory(key);
    }

    function _chainId(string memory network, bool ci) internal view returns (uint256) {
        bytes32 key = keccak256(bytes(network));
        if (key == keccak256("testnet")) return vm.envUint("BOT_TESTNET_CHAIN_ID");
        if (key == keccak256("mainnet")) {
            if (ci) revert MainnetFromCi();
            return vm.envUint("BOT_MAINNET_CHAIN_ID");
        }
        revert UnknownNetwork(network);
    }

    function _isNew(address predicted, string memory name) internal view returns (bool) {
        if (predicted.code.length > 0) {
            console.log(name, "already deployed at", predicted);
            return false;
        }
        console.log(name, "deploying to", predicted);
        return true;
    }

    function _check(address deployed, address predicted) internal pure {
        if (deployed != predicted) revert AddressMismatch(predicted, deployed);
    }
}
