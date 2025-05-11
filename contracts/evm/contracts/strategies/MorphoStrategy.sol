// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/YieldStrategy.sol";
import "./interfaces/IERC4626.sol";

/**
 * @title IUniversalRewardsDistributor
 * @dev Interface for Morpho's Universal Rewards Distributor (URD)
 */
interface IUniversalRewardsDistributor {
    function claim(address account, address reward, uint256 claimable, bytes32[] calldata proof) 
        external returns (uint256 amount);
}

/**
 * @title MorphoStrategy
 * @dev Yield strategy using Morpho for USDC
 */
contract MorphoStrategy is YieldStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Morpho USDC Vault (ERC4626)
    IERC4626 public immutable morphoVault;
    
    // USDC token address
    address public immutable usdcToken;
    
    // Morpho Rewards Distributor
    IUniversalRewardsDistributor public rewardsDistributor;
    
    // Reward token address (typically MORPHO)
    address public rewardToken;
    
    uint256 public currentAPY;//(e.g., 1300 = 13%)
    
    // Last time APY was updated
    uint256 public lastAPYUpdate;
    
    // Historical yields to calculate APY
    struct YieldSnapshot {
        uint256 timestamp;
        uint256 sharePrice; // Price of one vault share in terms of USDC (scaled by 1e18)
    }
    
    // Last 10 yield snapshots for APY calculation
    YieldSnapshot[10] public yieldSnapshots;
    uint8 public currentSnapshotIndex;
    
    // Total deposited per token
    mapping(address => uint256) public totalDeposited;
    
    // User share balances
    mapping(address => uint256) public userShares;
    
    event Deposited(address indexed user, address indexed token, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, address indexed token, uint256 amount, uint256 shares);
    event RewardsClaimed(address indexed user, address indexed rewardToken, uint256 amount);
    event APYUpdated(uint256 newAPY);
    
    constructor(address _morphoVault, address _usdcToken, address _rewardsDistributor, address _rewardToken) Ownable(msg.sender) {
        morphoVault = IERC4626(_morphoVault);
        usdcToken = _usdcToken;
        rewardsDistributor = IUniversalRewardsDistributor(_rewardsDistributor);
        rewardToken = _rewardToken;
        currentAPY = 1300; // 13% default
        
        // Initialize the first yield snapshot
        yieldSnapshots[0] = YieldSnapshot({
            timestamp: block.timestamp,
            sharePrice: morphoVault.convertToAssets(1e18) // 1 share in assets, scaled by 1e18
        });
        
        lastAPYUpdate = block.timestamp;
    }
    
    /**
     * @dev Set the rewards distributor address
     * @param _rewardsDistributor New rewards distributor address
     */
    function setRewardsDistributor(address _rewardsDistributor) external onlyOwner {
        rewardsDistributor = IUniversalRewardsDistributor(_rewardsDistributor);
    }
    
    /**
     * @dev Set the reward token address
     * @param _rewardToken New reward token address
     */
    function setRewardToken(address _rewardToken) external onlyOwner {
        rewardToken = _rewardToken;
    }
    
    /**
     * @dev Update APY calculation based on yield snapshots
     */
    function updateAPY() public {
        // Only update if enough time has passed (at least 1 day)
        if (block.timestamp < lastAPYUpdate + 1 days) {
            return;
        }
        
        // Record new snapshot
        currentSnapshotIndex = (currentSnapshotIndex + 1) % 10;
        uint256 currentSharePrice = morphoVault.convertToAssets(1e18);
        
        yieldSnapshots[currentSnapshotIndex] = YieldSnapshot({
            timestamp: block.timestamp,
            sharePrice: currentSharePrice
        });
        
        // Find oldest snapshot within 30 days
        uint8 oldestIndex = currentSnapshotIndex;
        uint256 oldestTimestamp = block.timestamp;
        
        for (uint8 i = 0; i < 10; i++) {
            // Skip uninitialized snapshots
            if (yieldSnapshots[i].timestamp == 0) continue;
            
            // Skip snapshots older than 30 days
            if (block.timestamp - yieldSnapshots[i].timestamp > 30 days) continue;
            
            if (yieldSnapshots[i].timestamp < oldestTimestamp) {
                oldestTimestamp = yieldSnapshots[i].timestamp;
                oldestIndex = i;
            }
        }
        
        // Calculate APY based on share price change
        if (oldestTimestamp < block.timestamp && oldestIndex != currentSnapshotIndex) {
            uint256 oldSharePrice = yieldSnapshots[oldestIndex].sharePrice;
            uint256 timeElapsedInSeconds = block.timestamp - oldestTimestamp;
            
            // Calculate yield for the period
            uint256 yieldForPeriod = (currentSharePrice * 1e18) / oldSharePrice - 1e18;
            
            // Convert to annualized yield (in basis points)
            // APY = (1 + yield)^(365 days / elapsed time) - 1
            // For simplicity, we'll use a linear approximation for short time periods
            uint256 annualizedYield = (yieldForPeriod * 365 days * 10000) / (timeElapsedInSeconds * 1e18);
            
            currentAPY = annualizedYield;
            emit APYUpdated(currentAPY);
        }
        
        lastAPYUpdate = block.timestamp;
    }
    
    /**
     * @dev Deposit USDC into Morpho
     * @param token Address of the token (must be USDC)
     * @param amount Amount to deposit
     * @return Amount of shares minted
     */
    function deposit(address token, uint256 amount) external override nonReentrant returns (uint256) {
        require(token == usdcToken, "Only USDC supported");
        require(amount > 0, "Amount must be greater than 0");
        
        updateAPY();
        
        // Transfer USDC from sender to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve Morpho Vault to spend USDC
        IERC20(token).safeApprove(address(morphoVault), amount);
        
        // Deposit into Morpho Vault
        uint256 sharesBefore = morphoVault.balanceOf(address(this));
        morphoVault.deposit(amount, address(this));
        uint256 sharesAfter = morphoVault.balanceOf(address(this));
        
        // Calculate shares minted
        uint256 sharesMinted = sharesAfter - sharesBefore;
        
        // Update total deposited
        totalDeposited[token] += amount;
        
        // Update user shares
        userShares[msg.sender] += sharesMinted;
        
        emit Deposited(msg.sender, token, amount, sharesMinted);
        
        return sharesMinted;
    }
    
    /**
     * @dev Withdraw USDC from Morpho
     * @param token Address of the token (must be USDC)
     * @param amount Amount to withdraw
     * @return Amount withdrawn
     */
    function withdraw(address token, uint256 amount) external override nonReentrant returns (uint256) {
        require(token == usdcToken, "Only USDC supported");
        require(amount > 0, "Amount must be greater than 0");
        
        updateAPY();
        
        // Calculate shares to redeem
        uint256 totalAssets = morphoVault.convertToAssets(morphoVault.balanceOf(address(this)));
        uint256 userAssets = totalAssets * userShares[msg.sender] / morphoVault.balanceOf(address(this));
        
        require(amount <= userAssets, "Insufficient balance");
        
        uint256 sharesToRedeem = morphoVault.previewWithdraw(amount);
        require(sharesToRedeem <= userShares[msg.sender], "Insufficient shares");
        
        // Withdraw from Morpho Vault
        uint256 assetsWithdrawn = morphoVault.withdraw(amount, address(this), address(this));
        
        // Update total deposited
        totalDeposited[token] -= amount;
        
        // Update user shares
        userShares[msg.sender] -= sharesToRedeem;
        
        // Transfer USDC to sender
        IERC20(token).safeTransfer(msg.sender, assetsWithdrawn);
        
        emit Withdrawn(msg.sender, token, assetsWithdrawn, sharesToRedeem);
        
        return assetsWithdrawn;
    }
    
    /**
     * @dev Claim rewards from Morpho
     * @param user Address claiming rewards
     * @param claimable Total claimable amount
     * @param proof Merkle proof for the claim
     * @return Amount of rewards claimed
     */
    function claimRewards(
        address user,
        uint256 claimable,
        bytes32[] calldata proof
    ) external nonReentrant returns (uint256) {
        require(user == msg.sender || msg.sender == owner(), "Not authorized");
        require(address(rewardsDistributor) != address(0), "Rewards distributor not set");
        require(rewardToken != address(0), "Reward token not set");
        
        // Claim rewards from the rewards distributor
        uint256 rewardsClaimed = rewardsDistributor.claim(
            user,
            rewardToken,
            claimable,
            proof
        );
        
        // Transfer rewards to user
        if (rewardsClaimed > 0 && user != address(this)) {
            IERC20(rewardToken).safeTransfer(user, rewardsClaimed);
        }
        
        emit RewardsClaimed(user, rewardToken, rewardsClaimed);
        
        return rewardsClaimed;
    }
    
    /**
     * @dev Get current APY for USDC
     * @param token Address of the token (must be USDC)
     * @return Current APY in basis points
     */
    function getAPY(address token) external view override returns (uint256) {
        if (token != usdcToken) return 0;
        return currentAPY;
    }
    
    /**
     * @dev Get total deposited for a token
     * @param token Address of the token
     * @return Total deposited amount
     */
    function getTotalDeposited(address token) external view override returns (uint256) {
        return totalDeposited[token];
    }
    
    /**
     * @dev Get user's deposited amount
     * @param user Address of the user
     * @param token Address of the token (must be USDC)
     * @return User's deposited amount
     */
    function getUserDeposited(address user, address token) external view returns (uint256) {
        if (token != usdcToken || userShares[user] == 0) return 0;
        
        uint256 totalShares = morphoVault.balanceOf(address(this));
        if (totalShares == 0) return 0;
        
        uint256 totalAssets = morphoVault.convertToAssets(totalShares);
        return totalAssets * userShares[user] / totalShares;
    }
    
    /**
     * @dev Get user's pending rewards (to be implemented with off-chain data)
     * @param user Address of the user
     * @return Pending rewards (always returns 0 as actual rewards require off-chain Merkle proof)
     */
    function getUserPendingRewards(address user) external view returns (uint256) {
        // This function would typically rely on off-chain data to provide the total claimable rewards
        // For the hackathon, we'll return 0 as the actual implementation requires data from the URD
        return 0;
    }
    
    /**
     * @dev Withdraw all USDC for a user
     * @param user Address of the user
     * @return Amount withdrawn
     */
    function withdrawAll(address user) external nonReentrant returns (uint256) {
        require(user == msg.sender || msg.sender == owner(), "Not authorized");
        require(userShares[user] > 0, "No shares to withdraw");
        
        updateAPY();
        
        // Calculate user's assets
        uint256 totalShares = morphoVault.balanceOf(address(this));
        uint256 userSharesAmount = userShares[user];
        
        uint256 assets = morphoVault.redeem(userSharesAmount, address(this), address(this));
        
        totalDeposited[usdcToken] -= assets;
        
        userShares[user] = 0;
        
        IERC20(usdcToken).safeTransfer(user, assets);
        
        emit Withdrawn(user, usdcToken, assets, userSharesAmount);
        
        return assets;
    }
    
    /**
     * @dev Emergency function to recover stuck tokens
     * @param token Address of the token to recover
     * @return Amount recovered
     */
    function recoverToken(address token) external onlyOwner returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(owner(), balance);
        return balance;
    }
}
