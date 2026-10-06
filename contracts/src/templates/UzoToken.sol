// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {IUzoTemplate} from "../interfaces/IUzoTemplate.sol";

bytes32 constant UZO_TOKEN_ID = "uzo.token";
uint16 constant UZO_TOKEN_VERSION = 1;

/// @title UzoToken
/// @notice Fixed-supply ERC20 token. The whole supply is minted once, at deployment, to one
/// recipient. There is no owner and no way to mint more. Holders can burn their own tokens
/// and approve spenders by signature (EIP-2612).
/// @dev Tested, not audited.
contract UzoToken is ERC20, ERC20Permit, ERC20Burnable, IUzoTemplate {
    /// @notice The name is empty.
    error EmptyName();
    /// @notice The symbol is empty.
    error EmptySymbol();
    /// @notice The initial supply is zero.
    error ZeroSupply();
    /// @notice The recipient is the zero address.
    error ZeroRecipient();

    /// @notice Creates the token and mints the whole supply to `recipient`.
    /// @param name_ Token name. Must not be empty.
    /// @param symbol_ Token symbol. Must not be empty.
    /// @param initialSupply Total supply in base units (18 decimals). Must be above zero.
    /// @param recipient Receives the whole supply. Must not be the zero address.
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address recipient
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (bytes(name_).length == 0) revert EmptyName();
        if (bytes(symbol_).length == 0) revert EmptySymbol();
        if (initialSupply == 0) revert ZeroSupply();
        if (recipient == address(0)) revert ZeroRecipient();
        _mint(recipient, initialSupply);
    }

    /// @inheritdoc IUzoTemplate
    function uzoTemplate() external pure returns (bytes32 id, uint16 version) {
        return (UZO_TOKEN_ID, UZO_TOKEN_VERSION);
    }
}
