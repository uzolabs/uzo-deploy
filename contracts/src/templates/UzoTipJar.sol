// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IUzoTemplate} from "../interfaces/IUzoTemplate.sol";

bytes32 constant UZO_TIP_JAR_ID = "uzo.tipjar";
uint16 constant UZO_TIP_JAR_VERSION = 1;

/// @title UzoTipJar
/// @notice Lets anyone tip one fixed recipient in BOT or USDT, with a short public message.
/// Tips go straight to the recipient in the same transaction. The jar never holds funds.
/// @dev Tested, not audited. No owner, no receive or fallback, nothing to withdraw.
contract UzoTipJar is ReentrancyGuardTransient, IUzoTemplate {
    using SafeERC20 for IERC20;

    /// @notice Longest title allowed, in bytes.
    uint256 public constant MAX_TITLE_BYTES = 64;
    /// @notice Longest message allowed, in bytes.
    uint256 public constant MAX_MESSAGE_BYTES = 140;

    /// @notice Receives every tip. Set once at deployment.
    address public immutable recipient;
    /// @notice The only token accepted by `tipToken` (USDT on BOT Chain).
    IERC20 public immutable usdt;
    /// @notice Title shown on the tip page. Set once at deployment.
    string public title;

    /// @notice A tip was sent to the recipient.
    /// @param from Who sent the tip.
    /// @param token The token tipped, or the zero address for BOT.
    /// @param amount Amount in the token's base units.
    /// @param message The tipper's message. May be empty.
    event Tipped(address indexed from, address indexed token, uint256 amount, string message);

    /// @notice The recipient is the zero address or this jar.
    error InvalidRecipient();
    /// @notice The token is the zero address.
    error ZeroToken();
    /// @notice The title is longer than `MAX_TITLE_BYTES`.
    error TitleTooLong(uint256 length);
    /// @notice The message is longer than `MAX_MESSAGE_BYTES`.
    error MessageTooLong(uint256 length);
    /// @notice The tip amount is zero.
    error ZeroAmount();
    /// @notice The recipient did not accept the BOT transfer.
    error NativeTransferFailed();

    /// @notice Creates the tip jar.
    /// @param recipient_ Receives every tip. Must not be the zero address.
    /// @param usdt_ The token `tipToken` accepts. The factory passes USDT.
    /// @param title_ Title for the tip page, at most 64 bytes. May be empty.
    constructor(address recipient_, address usdt_, string memory title_) {
        if (recipient_ == address(0) || recipient_ == address(this)) revert InvalidRecipient();
        if (usdt_ == address(0)) revert ZeroToken();
        if (bytes(title_).length > MAX_TITLE_BYTES) revert TitleTooLong(bytes(title_).length);
        recipient = recipient_;
        usdt = IERC20(usdt_);
        title = title_;
    }

    /// @notice Tips the recipient in BOT. The full `msg.value` is forwarded.
    /// @param message Public message, at most 140 bytes. May be empty.
    function tipNative(string calldata message) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (bytes(message).length > MAX_MESSAGE_BYTES) {
            revert MessageTooLong(bytes(message).length);
        }
        emit Tipped(msg.sender, address(0), msg.value, message);
        (bool ok,) = recipient.call{value: msg.value}("");
        if (!ok) revert NativeTransferFailed();
    }

    /// @notice Tips the recipient in USDT. Approve this jar for `amount` first.
    /// @param amount Amount in USDT base units (6 decimals). Must be above zero.
    /// @param message Public message, at most 140 bytes. May be empty.
    function tipToken(uint256 amount, string calldata message) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (bytes(message).length > MAX_MESSAGE_BYTES) {
            revert MessageTooLong(bytes(message).length);
        }
        emit Tipped(msg.sender, address(usdt), amount, message);
        usdt.safeTransferFrom(msg.sender, recipient, amount);
    }

    /// @inheritdoc IUzoTemplate
    function uzoTemplate() external pure returns (bytes32 id, uint16 version) {
        return (UZO_TIP_JAR_ID, UZO_TIP_JAR_VERSION);
    }
}
