// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interface/YieldStrategy.sol";
import "./interface/MorphoStrategy.sol";


contract ZeroStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct StakeInfo {
        uint256 amount;
        uint256 lockedAmount; // Amount currently used as collateral for BNPL
        uint256 lastUpdateTime;
    }

    // Mapping from user address to token address to stake info
    mapping(address => mapping(address => StakeInfo)) public stakes;
    
    // Supported tokens for staking
    mapping(address => bool) public supportedTokens;
    
    // Collateralization ratio (in basis points, e.g., 15000 = 150%)
    uint256 public collateralRatio = 15000;
    
    address public zeroDebtContract;

    YieldStrategy public yieldStrategy;
    
    mapping(address => uint256) public totalRewards;
    
    mapping(address => mapping(address => uint256)) public userRewards;
    
    mapping(address => mapping(address => uint256)) public lastRewardUpdate;
    
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event Staked(address indexed user, address indexed token, uint256 amount);
    event Unstaked(address indexed user, address indexed token, uint256 amount);
    event CollateralLocked(address indexed user, address indexed token, uint256 amount);
    event CollateralUnlocked(address indexed user, address indexed token, uint256 amount);
    event RewardsClaimed(address indexed user, address indexed token, uint256 amount);

    constructor()Ownable(msg.sender)  {
        // constructor logic
    }

    /**
     * @dev Stake tokens as collateral
     * @param token Address of the token to stake
     * @param amount Amount to stake
     */
    function stake(address token, uint256 amount) external nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");
    
        _updateRewards(msg.sender, token);
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Deposit to yield strategy if available
        if (address(yieldStrategy) != address(0)) {
            IERC20(token).approve(address(yieldStrategy), amount);
            yieldStrategy.deposit(token, amount);
        }
        
        StakeInfo storage stakeInfo = stakes[msg.sender][token];
        stakeInfo.amount += amount;
        stakeInfo.lastUpdateTime = block.timestamp;
        
        emit Staked(msg.sender, token, amount);
    }
    
    /**
     * @dev Unstake tokens (only available for unlocked tokens)
     * @param token Address of the token to unstake
     * @param amount Amount to unstake
     */
    function unstake(address token, uint256 amount) external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender][token];
        
        require(amount > 0, "Amount must be greater than 0");
        require(stakeInfo.amount >= amount, "Insufficient staked amount");
        require(stakeInfo.amount - stakeInfo.lockedAmount >= amount, "Amount exceeds unlocked balance");
        
        _updateRewards(msg.sender, token);
        
        stakeInfo.amount -= amount;
        stakeInfo.lastUpdateTime = block.timestamp;
        
        if (address(yieldStrategy) != address(0)) {
            yieldStrategy.withdraw(token, amount);
        }
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, token, amount);
    }
    
    /**
     * @dev Lock collateral for a BNPL transaction (only callable by ZeroDebt contract)
     * @param user Address of the user
     * @param token Address of the token to lock
     * @param amount Amount to lock
     */
    
    function lockCollateral(address user, address token, uint256 amount) external {
        require(msg.sender == zeroDebtContract, "Only ZeroDebt contract can lock collateral");
        
        StakeInfo storage stakeInfo = stakes[user][token];
        require(stakeInfo.amount - stakeInfo.lockedAmount >= amount, "Insufficient unlocked balance");
        
        stakeInfo.lockedAmount += amount;
        
        emit CollateralLocked(user, token, amount);
    }
    
    /**
     * @dev Unlock collateral after a BNPL transaction is completed (only callable by ZeroDebt contract)
     * @param user Address of the user
     * @param token Address of the token to unlock
     * @param amount Amount to unlock
     */
    function unlockCollateral(address user, address token, uint256 amount) external {
        require(msg.sender == zeroDebtContract, "Only ZeroDebt contract can unlock collateral");
        
        StakeInfo storage stakeInfo = stakes[user][token];
        require(stakeInfo.lockedAmount >= amount, "Insufficient locked balance");
        
        stakeInfo.lockedAmount -= amount;
        
        emit CollateralUnlocked(user, token, amount);
    }
    
    /**
     * @dev Liquidate collateral for a defaulted BNPL transaction (only callable by ZeroDebt contract)
     * @param user Address of the user
     * @param token Address of the token to liquidate
     * @param amount Amount to liquidate
     * @param recipient Address to send the liquidated tokens to
     */
    function liquidateCollateral(address user, address token, uint256 amount, address recipient) external {
        require(msg.sender == zeroDebtContract, "Only ZeroDebt contract can liquidate collateral");
        
        StakeInfo storage stakeInfo = stakes[user][token];
        require(stakeInfo.lockedAmount >= amount, "Insufficient locked balance");
        
        // Update stakes
        stakeInfo.amount -= amount;
        stakeInfo.lockedAmount -= amount;
        
        // Withdraw from yield strategy if available
        if (address(yieldStrategy) != address(0)) {
            yieldStrategy.withdraw(token, amount);
        }
        
        // Transfer to recipient
        IERC20(token).safeTransfer(recipient, amount);
        
        emit CollateralUnlocked(user, token, amount);
    }
    
    /**
     * @dev Get available credit for a user based on their staked tokens
     * @param user Address of the user
     * @param token Address of the token
     * @return Available credit amount
     */
    function getAvailableCredit(address user, address token) external view returns (uint256) {
        StakeInfo storage stakeInfo = stakes[user][token];
        uint256 unlocked = stakeInfo.amount - stakeInfo.lockedAmount;
        
        // Credit is unlocked amount divided by collateral ratio
        return (unlocked * 10000) / collateralRatio;
    }
    
    /**
     * @dev Get total staked amount for a user
     * @param user Address of the user
     * @param token Address of the token
     * @return Total staked amount
     */
    function getStakedAmount(address user, address token) external view returns (uint256) {
        return stakes[user][token].amount;
    }
    
    /**
     * @dev Get locked amount for a user
     * @param user Address of the user
     * @param token Address of the token
     * @return Locked amount
     */
    function getLockedAmount(address user, address token) external view returns (uint256) {
        return stakes[user][token].lockedAmount;
    }

    /**
     * @dev Update rewards for a user
     * @param user Address of the user
     * @param token Address of the token
     */
    function _updateRewards(address user, address token) internal {
        if (address(yieldStrategy) == address(0)) return;
        
        StakeInfo storage stakeInfo = stakes[user][token];
        if (stakeInfo.amount == 0) return;
        
        uint256 timeElapsed = block.timestamp - lastRewardUpdate[user][token];
        if (timeElapsed == 0) return;
        
        // Calculate rewards based on APY and time elapsed
        uint256 apy = yieldStrategy.getAPY(token);
        uint256 reward = (stakeInfo.amount * apy * timeElapsed) / (365 days * 10000);
        
        userRewards[user][token] += reward;
        totalRewards[token] += reward;
        lastRewardUpdate[user][token] = block.timestamp;
    }
    
    /**
     * @dev Claim rewards for a user
     * @param token Address of the token
     * @param claimable Total claimable amount (from off-chain data)
     * @param proof Merkle proof for claiming from Morpho URD
     */
    function claimRewards(
        address token, 
        uint256 claimable,
        bytes32[] calldata proof
    ) external nonReentrant {
        require(address(yieldStrategy) != address(0), "No yield strategy set");
        
        // Call the yield strategy to claim rewards
        // We need to pass this call to the MorphoStrategy which has the URD integration
        // This will require a special function in MorphoStrategy that accepts the Merkle proof
        
        // Method depends on the YieldStrategy implementation
        // For MorphoStrategy, we'll need to cast and call the claimRewards function
        
        MorphoStrategy morphoStrategy = MorphoStrategy(address(yieldStrategy));
        morphoStrategy.claimRewards(msg.sender, claimable, proof);
        
        emit RewardsClaimed(msg.sender, token, claimable);
    }
    
    /**
     * @dev Get pending rewards for a user
     * @param user Address of the user
     * @param token Address of the token
     * @return Pending rewards amount
     */
    function getPendingRewards(address user, address token) external view returns (uint256) {
        if (address(yieldStrategy) == address(0)) return 0;
        
        StakeInfo storage stakeInfo = stakes[user][token];
        if (stakeInfo.amount == 0) return userRewards[user][token];
        
        uint256 timeElapsed = block.timestamp - lastRewardUpdate[user][token];
        
        // Calculate rewards based on APY and time elapsed
        uint256 apy = yieldStrategy.getAPY(token);
        uint256 reward = (stakeInfo.amount * apy * timeElapsed) / (365 days * 10000);
        
        return userRewards[user][token] + reward;
    }
    
    /**
     * @dev Get current APY for a token
     * @param token Address of the token
     * @return Current APY in basis points (e.g., 1300 = 13%)
     */
    function getCurrentAPY(address token) external view returns (uint256) {
        if (address(yieldStrategy) == address(0)) return 0;
        return yieldStrategy.getAPY(token);
    }

    /**
     * @dev Set the ZeroDebt contract address
     * @param _zeroDebtContract Address of the ZeroDebt contract
     */
    function setZeroDebtContract(address _zeroDebtContract) external onlyOwner {
        zeroDebtContract = _zeroDebtContract;
    }

    /**
     * @dev Set the yield strategy contract
     * @param _yieldStrategy Address of the yield strategy contract
     */
    function setYieldStrategy(address _yieldStrategy) external onlyOwner {
        yieldStrategy = YieldStrategy(_yieldStrategy);
    }
    
    /**
     * @dev Add a supported token for staking
     * @param token Address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }
    
    /**
     * @dev Remove a supported token
     * @param token Address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }
    
    /**
     * @dev Set the collateralization ratio
     * @param _collateralRatio New collateralization ratio in basis points
     */
    function setCollateralRatio(uint256 _collateralRatio) external onlyOwner {
        require(_collateralRatio >= 10000, "Ratio must be at least 100%");
        collateralRatio = _collateralRatio;
    }
    
}
