// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title YieldStrategy Interface
 * @notice Interface for yield generation strategies
 */
interface YieldStrategy {
    /**
     * @dev Deposit tokens into the yield strategy
     * @param token Address of the token to deposit
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external;

    /**
     * @dev Withdraw tokens from the yield strategy
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external;

    /**
     * @dev Get the current APY for a token
     * @param token Address of the token
     * @return Current APY in basis points (e.g., 1300 = 13%)
     */
    function getAPY(address token) external view returns (uint256);
}
