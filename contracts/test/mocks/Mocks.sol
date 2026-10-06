// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {UzoTipJar} from "../../src/templates/UzoTipJar.sol";
import {UzoNFT} from "../../src/templates/UzoNFT.sol";

/// Plain 6-decimal ERC20 standing in for USDT (no permit, like the real one).
contract MockUSDT is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// Token that returns false instead of reverting (SafeERC20 must catch this).
contract FalseReturningToken {
    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}

/// Token that tries to reenter the tip jar during transferFrom.
contract ReentrantToken {
    UzoTipJar public jar;

    function setJar(UzoTipJar jar_) external {
        jar = jar_;
    }

    function transferFrom(address, address, uint256) external returns (bool) {
        jar.tipToken(1, "again");
        return true;
    }
}

/// Recipient that refuses native transfers.
contract RejectingRecipient {
    receive() external payable {
        revert("no");
    }
}

/// Recipient that tries to reenter the tip jar when paid.
contract ReentrantRecipient {
    UzoTipJar public jar;

    function setJar(UzoTipJar jar_) external {
        jar = jar_;
    }

    receive() external payable {
        jar.tipNative{value: msg.value}("again");
    }
}

/// Contract that accepts ERC721 tokens.
contract NFTReceiver is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }
}

/// Contract without onERC721Received.
contract NotNFTReceiver {}

/// Receiver that owns the collection and mints again from inside the callback.
contract ReentrantMinter is IERC721Receiver {
    UzoNFT public nft;
    bool private _done;

    function setNft(UzoNFT nft_) external {
        nft = nft_;
    }

    function mintOne() external {
        nft.mint(address(this));
    }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        if (!_done) {
            _done = true;
            nft.mint(address(this));
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}
