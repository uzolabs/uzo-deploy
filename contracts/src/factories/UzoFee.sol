// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title UzoFee
/// @notice The deploy fee shared by the Uzo factories. The amount and the wallet that receives
/// it are fixed when a factory is deployed and can never change: there is no owner and no
/// setter. A deploy must send exactly `fee`, and the factory forwards it to `feeRecipient` in
/// the same transaction, so a factory never holds funds.
/// @dev Tested, not audited.
abstract contract UzoFee {
    /// @notice The native amount every `deploy` call must send, in wei.
    uint256 public immutable fee;

    /// @notice Receives every fee, straight away.
    address public immutable feeRecipient;

    /// @notice The call sent a different amount than `fee`.
    error WrongFee(uint256 expected, uint256 sent);

    /// @notice The fee recipient is the zero address.
    error InvalidFeeRecipient();

    /// @notice The fee recipient refused the payment.
    error FeeTransferFailed();

    constructor(uint256 fee_, address feeRecipient_) {
        if (feeRecipient_ == address(0)) revert InvalidFeeRecipient();
        fee = fee_;
        feeRecipient = feeRecipient_;
    }

    /// @dev Call first in `deploy`.
    function _checkFee() internal view {
        if (msg.value != fee) revert WrongFee(fee, msg.value);
    }

    /// @dev Call last in `deploy`, after every state change and event. The recipient is fixed
    /// at deployment, so the call can only reach a wallet the factory's deployer chose.
    function _payFee() internal {
        if (msg.value == 0) return;
        (bool ok,) = feeRecipient.call{value: msg.value}("");
        if (!ok) revert FeeTransferFailed();
    }
}
