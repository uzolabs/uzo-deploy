// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {UzoTokenFactory} from "../src/factories/UzoTokenFactory.sol";
import {UzoNFTFactory} from "../src/factories/UzoNFTFactory.sol";
import {UzoTipJarFactory} from "../src/factories/UzoTipJarFactory.sol";
import {UzoFee} from "../src/factories/UzoFee.sol";

/// Deploys the three Uzo factories through the standard CREATE2 deployer, so the addresses are
/// fixed by the bytecode and this salt. Safe to run again: a factory that already exists is
/// reused, not redeployed.
///
/// Chain data is never typed in here. It comes from the Uzo SDK through script/sdk-env.mjs:
///   eval "$(node script/sdk-env.mjs)"                       testnet
///   eval "$(node script/sdk-env.mjs --mainnet)"             mainnet, manual runs only
/// then
///   UZO_NETWORK=testnet forge script script/Deploy.s.sol --rpc-url bot_testnet \
///     --account <keystore name> --broadcast
///
/// Every factory charges FEE per deploy and forwards it to FEE_RECIPIENT in the same
/// transaction. Both are fixed in the factory forever. Changing either means new factories at
/// new addresses.
///
/// The deployer key lives in a Foundry keystore on the deployer's machine. It is never passed
/// as a flag, put in an env file, or given to CI.
contract Deploy is Script {
    bytes32 internal constant SALT = keccak256("uzo.deploy.factories.v1");

    /// The fee per deploy, on testnet and mainnet alike.
    uint256 public constant FEE = 0.1 ether;
    /// Uzo's fee wallet. Fees arrive here in the same transaction as the deploy.
    address public constant FEE_RECIPIENT = 0x2b5D37D93432f25e65BD8bed07cFbc303b72389D;

    struct Network {
        string name;
        uint256 chainId;
        address usdt;
        uint256 fee;
        address feeRecipient;
    }

    error WrongChain(uint256 expected, uint256 actual);
    error UnknownNetwork(string name);
    error MainnetFromCi();
    error UsdtHasNoCode(address usdt);
    error UsdtMismatch(address expected, address actual);
    error AddressMismatch(address predicted, address deployed);
    error FeeMismatch(address factory);

    /// Entry point. Reads UZO_NETWORK (default testnet) and CI from the environment.
    function run() external returns (address, address, address) {
        return
            deploy(
                resolveNetwork(vm.envOr("UZO_NETWORK", string("testnet")), vm.envOr("CI", false))
            );
    }

    /// Deploys, or reuses, the three factories on `net`.
    function deploy(Network memory net)
        public
        returns (address tokenFactory, address nftFactory, address tipJarFactory)
    {
        if (block.chainid != net.chainId) revert WrongChain(net.chainId, block.chainid);
        if (net.usdt.code.length == 0) revert UsdtHasNoCode(net.usdt);

        bytes memory feeArgs = abi.encode(net.fee, net.feeRecipient);
        bytes memory tipJarArgs = abi.encode(net.usdt, net.fee, net.feeRecipient);
        tokenFactory = _predict(type(UzoTokenFactory).creationCode, feeArgs);
        nftFactory = _predict(type(UzoNFTFactory).creationCode, feeArgs);
        tipJarFactory = _predict(type(UzoTipJarFactory).creationCode, tipJarArgs);

        vm.startBroadcast();
        if (_isNew(tokenFactory, "UzoTokenFactory")) {
            _check(
                address(new UzoTokenFactory{salt: SALT}(net.fee, net.feeRecipient)), tokenFactory
            );
        }
        if (_isNew(nftFactory, "UzoNFTFactory")) {
            _check(address(new UzoNFTFactory{salt: SALT}(net.fee, net.feeRecipient)), nftFactory);
        }
        if (_isNew(tipJarFactory, "UzoTipJarFactory")) {
            _check(
                address(new UzoTipJarFactory{salt: SALT}(net.usdt, net.fee, net.feeRecipient)),
                tipJarFactory
            );
        }
        vm.stopBroadcast();

        // The tip jar factory fixes USDT forever. Make sure it is the SDK's USDT.
        address stored = UzoTipJarFactory(tipJarFactory).usdt();
        if (stored != net.usdt) revert UsdtMismatch(net.usdt, stored);
        console.log("UzoTipJarFactory.usdt matches the SDK:", stored);

        // The addresses already pin the fee, but read it back so a mistake is loud.
        _checkFee(UzoFee(tokenFactory), net);
        _checkFee(UzoFee(nftFactory), net);
        _checkFee(UzoFee(tipJarFactory), net);
        console.log("Fee per deploy (wei):", net.fee);
        console.log("Fee recipient:", net.feeRecipient);
    }

    /// Picks the network's chain ID and USDT from the SDK exports in the environment.
    function resolveNetwork(string memory name, bool ci) public view returns (Network memory net) {
        net.name = name;
        net.fee = FEE;
        net.feeRecipient = FEE_RECIPIENT;
        bytes32 key = keccak256(bytes(name));
        if (key == keccak256("testnet")) {
            net.chainId = vm.envUint("BOT_TESTNET_CHAIN_ID");
            net.usdt = vm.envAddress("BOT_TESTNET_USDT");
        } else if (key == keccak256("mainnet")) {
            // Mainnet deploys run by hand from the deployer's machine, never from CI.
            if (ci) revert MainnetFromCi();
            net.chainId = vm.envUint("BOT_MAINNET_CHAIN_ID");
            net.usdt = vm.envAddress("BOT_MAINNET_USDT");
        } else {
            revert UnknownNetwork(name);
        }
    }

    function _predict(bytes memory creationCode, bytes memory args)
        internal
        pure
        returns (address)
    {
        return vm.computeCreate2Address(SALT, keccak256(bytes.concat(creationCode, args)));
    }

    function _checkFee(UzoFee factory, Network memory net) internal view {
        if (factory.fee() != net.fee || factory.feeRecipient() != net.feeRecipient) {
            revert FeeMismatch(address(factory));
        }
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
