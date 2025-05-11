// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interface/IZeroStaking.sol";

/**
 * @title ZeroDebt
 * @notice Manages Buy Now Pay Later (BNPL) transactions using staked assets as collateral
 */
contract ZeroDebt is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct DebtInfo {
        address borrower; // Address of the user borrowing
        address merchant; // Address of the merchant
        address token; // Token used for payment
        uint256 amount; // Amount borrowed
        address collateralToken; // Token used as collateral
        uint256 collateralAmount; // Amount of collateral locked
        uint256 repaymentDeadline; // Timestamp by which repayment must be made
        uint256 penalty; // Penalty percentage in basis points (e.g., 500 = 5%)
        bool repaid; // Whether the debt has been repaid
        bool liquidated; // Whether the debt has been liquidated
    }

    // Staking contract reference
    IZeroStaking public zeroStaking;

    // Platform fee in basis points (e.g., 100 = 1%)
    uint256 public platformFee = 100;

    // Default penalty rate in basis points (e.g., 500 = 5%)
    uint256 public defaultPenalty = 500;

    // Minimum time for BNPL (1 day)
    uint256 public minimumRepaymentPeriod = 1 days;

    // Maximum time for BNPL (30 days)
    uint256 public maximumRepaymentPeriod = 30 days;

    // Debts by ID
    mapping(uint256 => DebtInfo) public debts;

    // Next debt ID
    uint256 public nextDebtId = 1;

    // User to debt IDs
    mapping(address => uint256[]) public userDebts;

    // Merchant to debt IDs
    mapping(address => uint256[]) public merchantDebts;

    // Authorized integrators (like ZeroPay)
    mapping(address => bool) public authorizedIntegrators;

    // Events
    event DebtCreated(
        uint256 indexed debtId,
        address indexed borrower,
        address indexed merchant,
        address token,
        uint256 amount,
        uint256 repaymentDeadline
    );

    event DebtRepaid(
        uint256 indexed debtId,
        address indexed borrower,
        uint256 amount
    );
    event DebtLiquidated(
        uint256 indexed debtId,
        address indexed borrower,
        uint256 amount
    );
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event DefaultPenaltyUpdated(uint256 oldPenalty, uint256 newPenalty);
    event IntegratorAuthorized(address indexed integrator);
    event IntegratorDeauthorized(address indexed integrator);

    /**
     * @dev Constructor
     * @param _zeroStaking Address of the ZeroStaking contract
     */
    constructor(address _zeroStaking) Ownable(msg.sender) {
        zeroStaking = IZeroStaking(_zeroStaking);
    }

    /**
     * @dev Create a new BNPL transaction
     * @param merchant Address of the merchant
     * @param paymentToken Address of the token to pay with
     * @param paymentAmount Amount to pay
     * @param collateralToken Address of the token used as collateral
     * @param repaymentPeriod Period in seconds after which repayment is due
     * @return debtId ID of the created debt
     */
    function createDebt(
        address merchant,
        address paymentToken,
        uint256 paymentAmount,
        address collateralToken,
        uint256 repaymentPeriod
    ) external nonReentrant returns (uint256) {
        require(merchant != address(0), "Invalid merchant address");
        require(paymentAmount > 0, "Payment amount must be greater than 0");
        require(
            repaymentPeriod >= minimumRepaymentPeriod,
            "Repayment period too short"
        );
        require(
            repaymentPeriod <= maximumRepaymentPeriod,
            "Repayment period too long"
        );

        // Check available credit
        uint256 availableCredit = zeroStaking.getAvailableCredit(
            msg.sender,
            collateralToken
        );
        require(
            availableCredit >= paymentAmount,
            "Insufficient credit available"
        );

        // Calculate collateral required
        uint256 collateralRatio = zeroStaking.collateralRatio();
        uint256 collateralRequired = (paymentAmount * collateralRatio) / 10000;

        // Lock collateral
        zeroStaking.lockCollateral(
            msg.sender,
            collateralToken,
            collateralRequired
        );

        // Transfer payment to merchant (minus platform fee)
        uint256 fee = (paymentAmount * platformFee) / 10000;
        uint256 merchantPayment = paymentAmount - fee;

        // Transfer tokens from caller to merchant and this contract for the fee
        IERC20(paymentToken).safeTransferFrom(
            msg.sender,
            merchant,
            merchantPayment
        );
        if (fee > 0) {
            IERC20(paymentToken).safeTransferFrom(
                msg.sender,
                address(this),
                fee
            );
        }

        // Create debt record
        uint256 debtId = nextDebtId++;
        uint256 repaymentDeadline = block.timestamp + repaymentPeriod;

        DebtInfo storage debt = debts[debtId];
        debt.borrower = msg.sender;
        debt.merchant = merchant;
        debt.token = paymentToken;
        debt.amount = paymentAmount;
        debt.collateralToken = collateralToken;
        debt.collateralAmount = collateralRequired;
        debt.repaymentDeadline = repaymentDeadline;
        debt.penalty = defaultPenalty;
        debt.repaid = false;
        debt.liquidated = false;

        // Update user and merchant debt mappings
        userDebts[msg.sender].push(debtId);
        merchantDebts[merchant].push(debtId);

        emit DebtCreated(
            debtId,
            msg.sender,
            merchant,
            paymentToken,
            paymentAmount,
            repaymentDeadline
        );

        return debtId;
    }

    /**
     * @dev Create a debt on behalf of a user (only for authorized integrators)
     * @param borrower Address of the user borrowing
     * @param merchant Address of the merchant
     * @param paymentToken Address of the token to pay with
     * @param paymentAmount Amount to pay
     * @param collateralToken Address of the token used as collateral
     * @param repaymentPeriod Period in seconds after which repayment is due
     * @return debtId ID of the created debt
     */
    function createDebtFor(
        address borrower,
        address merchant,
        address paymentToken,
        uint256 paymentAmount,
        address collateralToken,
        uint256 repaymentPeriod
    ) external nonReentrant returns (uint256) {
        require(authorizedIntegrators[msg.sender], "Caller not authorized");
        require(borrower != address(0), "Invalid borrower address");
        require(merchant != address(0), "Invalid merchant address");
        require(paymentAmount > 0, "Payment amount must be greater than 0");
        require(
            repaymentPeriod >= minimumRepaymentPeriod,
            "Repayment period too short"
        );
        require(
            repaymentPeriod <= maximumRepaymentPeriod,
            "Repayment period too long"
        );

        // Check available credit
        uint256 availableCredit = zeroStaking.getAvailableCredit(
            borrower,
            collateralToken
        );
        require(
            availableCredit >= paymentAmount,
            "Insufficient credit available"
        );

        // Calculate collateral required
        uint256 collateralRatio = zeroStaking.collateralRatio();
        uint256 collateralRequired = (paymentAmount * collateralRatio) / 10000;

        // Lock collateral
        zeroStaking.lockCollateral(
            borrower,
            collateralToken,
            collateralRequired
        );

        // Transfer payment to merchant (minus platform fee)
        uint256 fee = (paymentAmount * platformFee) / 10000;
        uint256 merchantPayment = paymentAmount - fee;

        // Transfer tokens from provided address to merchant
        IERC20(paymentToken).safeTransfer(merchant, merchantPayment);

        // Create debt record
        uint256 debtId = nextDebtId++;
        uint256 repaymentDeadline = block.timestamp + repaymentPeriod;

        DebtInfo storage debt = debts[debtId];
        debt.borrower = borrower;
        debt.merchant = merchant;
        debt.token = paymentToken;
        debt.amount = paymentAmount;
        debt.collateralToken = collateralToken;
        debt.collateralAmount = collateralRequired;
        debt.repaymentDeadline = repaymentDeadline;
        debt.penalty = defaultPenalty;
        debt.repaid = false;
        debt.liquidated = false;

        // Update user and merchant debt mappings
        userDebts[borrower].push(debtId);
        merchantDebts[merchant].push(debtId);

        emit DebtCreated(
            debtId,
            borrower,
            merchant,
            paymentToken,
            paymentAmount,
            repaymentDeadline
        );

        return debtId;
    }

    /**
     * @dev Repay a BNPL debt
     * @param debtId ID of the debt to repay
     */
    function repayDebt(uint256 debtId) external nonReentrant {
        DebtInfo storage debt = debts[debtId];

        require(debt.borrower == msg.sender, "Not the borrower");
        require(!debt.repaid, "Debt already repaid");
        require(!debt.liquidated, "Debt already liquidated");

        // Calculate repayment amount (including penalty if late)
        uint256 repaymentAmount = debt.amount;
        if (block.timestamp > debt.repaymentDeadline) {
            uint256 penaltyAmount = (debt.amount * debt.penalty) / 10000;
            repaymentAmount += penaltyAmount;
        }

        // Transfer repayment from user to this contract
        IERC20(debt.token).safeTransferFrom(
            msg.sender,
            address(this),
            repaymentAmount
        );

        // Unlock collateral
        zeroStaking.unlockCollateral(
            debt.borrower,
            debt.collateralToken,
            debt.collateralAmount
        );

        // Mark debt as repaid
        debt.repaid = true;

        emit DebtRepaid(debtId, msg.sender, repaymentAmount);
    }

    /**
     * @dev Liquidate a defaulted debt (can be called by anyone after deadline)
     * @param debtId ID of the debt to liquidate
     */
    function liquidateDebt(uint256 debtId) external nonReentrant {
        DebtInfo storage debt = debts[debtId];

        require(!debt.repaid, "Debt already repaid");
        require(!debt.liquidated, "Debt already liquidated");
        require(
            block.timestamp > debt.repaymentDeadline,
            "Repayment deadline not passed"
        );

        // Calculate penalty amount
        uint256 penaltyAmount = (debt.amount * debt.penalty) / 10000;
        uint256 totalDue = debt.amount + penaltyAmount;

        // Distribute penalties: 50% to protocol, 50% to merchant
        uint256 merchantShare = penaltyAmount / 2;
        uint256 protocolShare = penaltyAmount - merchantShare;

        // Liquidate collateral
        zeroStaking.liquidateCollateral(
            debt.borrower,
            debt.collateralToken,
            debt.collateralAmount,
            address(this)
        );

        // Mark debt as liquidated
        debt.liquidated = true;

        // Send merchant's share of penalty + original payment
        if (merchantShare > 0) {
            IERC20(debt.token).safeTransfer(debt.merchant, merchantShare);
        }

        // Protocol keeps the rest

        emit DebtLiquidated(debtId, debt.borrower, totalDue);
    }

    /**
     * @dev Authorize an integrator
     * @param integrator Address of the integrator to authorize
     */
    function authorizeIntegrator(address integrator) external onlyOwner {
        require(integrator != address(0), "Invalid integrator address");
        authorizedIntegrators[integrator] = true;
        emit IntegratorAuthorized(integrator);
    }

    /**
     * @dev Deauthorize an integrator
     * @param integrator Address of the integrator to deauthorize
     */
    function deauthorizeIntegrator(address integrator) external onlyOwner {
        authorizedIntegrators[integrator] = false;
        emit IntegratorDeauthorized(integrator);
    }

    /**
     * @dev Set platform fee
     * @param _platformFee New platform fee in basis points
     */
    function setPlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 1000, "Fee too high"); // Max 10%
        uint256 oldFee = platformFee;
        platformFee = _platformFee;
        emit PlatformFeeUpdated(oldFee, _platformFee);
    }

    /**
     * @dev Set default penalty
     * @param _defaultPenalty New default penalty in basis points
     */
    function setDefaultPenalty(uint256 _defaultPenalty) external onlyOwner {
        require(_defaultPenalty <= 3000, "Penalty too high"); // Max 30%
        uint256 oldPenalty = defaultPenalty;
        defaultPenalty = _defaultPenalty;
        emit DefaultPenaltyUpdated(oldPenalty, _defaultPenalty);
    }

    /**
     * @dev Set minimum repayment period
     * @param _period New minimum period in seconds
     */
    function setMinimumRepaymentPeriod(uint256 _period) external onlyOwner {
        require(
            _period <= maximumRepaymentPeriod,
            "Min period exceeds max period"
        );
        minimumRepaymentPeriod = _period;
    }

    /**
     * @dev Set maximum repayment period
     * @param _period New maximum period in seconds
     */
    function setMaximumRepaymentPeriod(uint256 _period) external onlyOwner {
        require(
            _period >= minimumRepaymentPeriod,
            "Max period below min period"
        );
        maximumRepaymentPeriod = _period;
    }

    /**
     * @dev Get user's active debts
     * @param user Address of the user
     * @return Array of active debt IDs
     */
    function getUserActiveDebts(
        address user
    ) external view returns (uint256[] memory) {
        uint256[] memory allDebts = userDebts[user];
        uint256 activeCount = 0;

        // First count active debts
        for (uint256 i = 0; i < allDebts.length; i++) {
            if (!debts[allDebts[i]].repaid && !debts[allDebts[i]].liquidated) {
                activeCount++;
            }
        }

        // Create result array
        uint256[] memory activeDebts = new uint256[](activeCount);
        uint256 index = 0;

        // Fill result array
        for (uint256 i = 0; i < allDebts.length; i++) {
            if (!debts[allDebts[i]].repaid && !debts[allDebts[i]].liquidated) {
                activeDebts[index++] = allDebts[i];
            }
        }

        return activeDebts;
    }

    /**
     * @dev Withdraw accumulated fees (owner only)
     * @param token Address of the token to withdraw
     * @param recipient Address to receive the fees
     */
    function withdrawFees(address token, address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(recipient, balance);
        }
    }
}
