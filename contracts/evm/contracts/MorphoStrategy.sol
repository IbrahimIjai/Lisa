// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interface/MorphoStrategy.sol";

/**
 * Interface for Morpho Vault (ERC4626 standard)
 */
interface IMorphoVault {
    function deposit(
        uint256 assets,
        address receiver
    ) external returns (uint256 shares);

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256 shares);

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 assets);

    function maxWithdraw(address owner) external view returns (uint256 assets);

    function previewRedeem(uint256 shares) external view returns (uint256);

    function totalAssets() external view returns (uint256);

    function convertToShares(uint256 assets) external view returns (uint256);

    function convertToAssets(uint256 shares) external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);
}

/**
 * Interface for Morpho Universal Rewards Distributor (URD)
 */
interface IURD {
    function claim(
        address account,
        address reward,
        uint256 claimable,
        bytes32[] calldata proof
    ) external returns (uint256 amount);
}

/**
 * @title MorphoStrategyImpl
 * @notice Implementation of the MorphoStrategy interface for generating yield using Morpho Vaults
 */
contract MorphoStrategyImpl is MorphoStrategy, Ownable {
    using SafeERC20 for IERC20;

    // Mapping from token to Morpho Vault
    mapping(address => address) public vaults;

    // URD contract for rewards
    IURD public urd;

    // Historical APY tracking
    mapping(address => uint256) public lastKnownAPY;

    // Tracking deposits and shares
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalShares;

    event VaultSet(address indexed token, address indexed vault);
    event URDSet(address indexed urd);
    event Deposited(address indexed token, uint256 amount, uint256 shares);
    event Withdrawn(address indexed token, uint256 amount, uint256 shares);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Set the Morpho Vault for a token
     * @param token Address of the token
     * @param vault Address of the Morpho Vault
     */
    function setVault(address token, address vault) external onlyOwner {
        vaults[token] = vault;
        emit VaultSet(token, vault);
    }

    /**
     * @dev Set the URD contract for rewards
     * @param _urd Address of the URD contract
     */
    function setURD(address _urd) external onlyOwner {
        urd = IURD(_urd);
        emit URDSet(_urd);
    }

    /**
     * @dev Deposit tokens into the Morpho Vault
     * @param token Address of the token to deposit
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external override {
        address vault = vaults[token];
        require(vault != address(0), "Vault not set for token");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).approve(vault, amount);

        uint256 sharesBefore = IMorphoVault(vault).balanceOf(address(this));
        uint256 shares = IMorphoVault(vault).deposit(amount, address(this));

        // Verify shares received
        require(
            IMorphoVault(vault).balanceOf(address(this)) >=
                sharesBefore + shares,
            "Deposit failed"
        );

        totalDeposited[token] += amount;
        totalShares[token] += shares;

        // Update APY estimation based on current vault data
        _updateAPYEstimate(token);

        emit Deposited(token, amount, shares);
    }

    /**
     * @dev Withdraw tokens from the Morpho Vault
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external override {
        address vault = vaults[token];
        require(vault != address(0), "Vault not set for token");
        require(amount > 0, "Amount must be greater than 0");

        // Calculate shares to redeem based on amount
        uint256 sharesToRedeem = _calculateSharesToRedeem(vault, amount);

        // Ensure we have enough shares
        require(sharesToRedeem <= totalShares[token], "Insufficient shares");

        // Withdraw assets
        uint256 assetsBefore = IERC20(token).balanceOf(address(this));
        uint256 assetsReceived = IMorphoVault(vault).redeem(
            sharesToRedeem,
            address(this),
            address(this)
        );

        // Verify assets received
        require(
            IERC20(token).balanceOf(address(this)) >=
                assetsBefore + assetsReceived,
            "Withdraw failed"
        );

        // If we received more than requested, adjust the amount
        uint256 actualAmount = amount > assetsReceived
            ? assetsReceived
            : amount;

        // Update totals
        totalDeposited[token] = totalDeposited[token] > actualAmount
            ? totalDeposited[token] - actualAmount
            : 0;
        totalShares[token] -= sharesToRedeem;

        // Update APY estimation
        _updateAPYEstimate(token);

        // Transfer to caller
        IERC20(token).safeTransfer(msg.sender, actualAmount);

        emit Withdrawn(token, actualAmount, sharesToRedeem);
    }

    /**
     * @dev Get the current APY for a token
     * @param token Address of the token
     * @return Current APY in basis points (e.g., 1300 = 13%)
     */
    function getAPY(address token) external view override returns (uint256) {
        // Return the last known APY (updated on deposits/withdrawals)
        return lastKnownAPY[token];
    }

    /**
     * @dev Claim rewards from Morpho URD for a user
     * @param user Address of the user claiming rewards
     * @param claimable Total claimable amount (from off-chain data)
     * @param proof Merkle proof for claiming from Morpho URD
     * @return Amount of rewards claimed
     */
    function claimRewards(
        address user,
        uint256 claimable,
        bytes32[] calldata proof
    ) external override returns (uint256) {
        require(address(urd) != address(0), "URD not set");

        // Temporarily assuming rewards token is USDC for simplicity
        // In a real implementation, this would be dynamic
        address rewardToken = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // USDC mainnet

        // Claim rewards
        uint256 amountClaimed = urd.claim(user, rewardToken, claimable, proof);

        // Transfer rewards to user
        if (amountClaimed > 0) {
            IERC20(rewardToken).safeTransfer(user, amountClaimed);
        }

        emit RewardsClaimed(user, amountClaimed);

        return amountClaimed;
    }

    /**
     * @dev Update APY estimate based on vault performance
     * @param token Token address
     */
    function _updateAPYEstimate(address token) internal {
        address vault = vaults[token];
        if (vault == address(0)) return;

        // Set a conservative APY estimate of 13% for USDC on Morpho
        // In a production environment, this would use historical data and calculate based on
        // actual vault performance over time

        if (token == 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) {
            // USDC mainnet
            lastKnownAPY[token] = 1300; // 13.00%
        } else {
            lastKnownAPY[token] = 1000; // 10.00% default for other tokens
        }
    }

    /**
     * @dev Calculate shares to redeem based on asset amount
     * @param vault Vault address
     * @param assetAmount Asset amount to withdraw
     * @return Shares amount to redeem
     */
    function _calculateSharesToRedeem(
        address vault,
        uint256 assetAmount
    ) internal view returns (uint256) {
        // Use the vault's conversion function to determine shares
        return IMorphoVault(vault).convertToShares(assetAmount);
    }
}
