// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title IZeroStaking
 * @notice Interface for interacting with the ZeroStaking contract
 */
interface IZeroStaking {
    /**
     * @dev Lock collateral for a BNPL transaction
     * @param user Address of the user
     * @param token Address of the token to lock
     * @param amount Amount to lock
     */
    function lockCollateral(
        address user,
        address token,
        uint256 amount
    ) external;

    /**
     * @dev Unlock collateral after a BNPL transaction is completed
     * @param user Address of the user
     * @param token Address of the token to unlock
     * @param amount Amount to unlock
     */
    function unlockCollateral(
        address user,
        address token,
        uint256 amount
    ) external;

    /**
     * @dev Liquidate collateral for a defaulted BNPL transaction
     * @param user Address of the user
     * @param token Address of the token to liquidate
     * @param amount Amount to liquidate
     * @param recipient Address to send the liquidated tokens to
     */
    function liquidateCollateral(
        address user,
        address token,
        uint256 amount,
        address recipient
    ) external;

    /**
     * @dev Get available credit for a user based on their staked tokens
     * @param user Address of the user
     * @param token Address of the token
     * @return Available credit amount
     */
    function getAvailableCredit(
        address user,
        address token
    ) external view returns (uint256);

    /**
     * @dev Get collateralization ratio
     * @return Collateralization ratio in basis points
     */
    function collateralRatio() external view returns (uint256);
}
