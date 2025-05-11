// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IZeroDebt {
    function createDebtFor(
        address borrower,
        address merchant,
        address paymentToken,
        uint256 paymentAmount,
        address collateralToken,
        uint256 repaymentPeriod
    ) external returns (uint256);
}

/**
 * @title ZeroPay
 * @notice Merchant integration contract for Zero Protocol
 */
contract ZeroPay is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ZeroDebt contract reference
    IZeroDebt public zeroDebt;

    // Supported payment tokens
    mapping(address => bool) public supportedPaymentTokens;

    // Supported collateral tokens
    mapping(address => bool) public supportedCollateralTokens;

    // Default repayment period (2 weeks)
    uint256 public defaultRepaymentPeriod = 14 days;

    // Merchant configuration
    struct MerchantConfig {
        bool registered;
        uint256 customRepaymentPeriod; // 0 means use default
        address preferredPaymentToken;
    }

    // Merchant registry
    mapping(address => MerchantConfig) public merchants;

    // Order Info
    struct OrderInfo {
        address merchant;
        address customer;
        uint256 amount;
        address paymentToken;
        bool isPaid;
        bool isBNPL;
        uint256 debtId; // Only relevant for BNPL orders
    }

    // Orders mapping
    mapping(bytes32 => OrderInfo) public orders;

    // Events
    event MerchantRegistered(address indexed merchant);
    event MerchantConfigUpdated(address indexed merchant);
    event OrderCreated(
        bytes32 indexed orderId,
        address indexed merchant,
        address token,
        uint256 amount
    );
    event OrderPaid(
        bytes32 indexed orderId,
        address indexed customer,
        bool isBNPL
    );
    event PaymentTokenAdded(address indexed token);
    event PaymentTokenRemoved(address indexed token);
    event CollateralTokenAdded(address indexed token);
    event CollateralTokenRemoved(address indexed token);

    /**
     * @dev Constructor
     * @param _zeroDebt Address of the ZeroDebt contract
     */
    constructor(address _zeroDebt) Ownable(msg.sender) {
        zeroDebt = IZeroDebt(_zeroDebt);
    }

    /**
     * @dev Register as a merchant
     * @param preferredPaymentToken Preferred token for payments
     * @param customRepaymentPeriod Custom repayment period (0 to use default)
     */
    function registerMerchant(
        address preferredPaymentToken,
        uint256 customRepaymentPeriod
    ) external {
        if (preferredPaymentToken != address(0)) {
            require(
                supportedPaymentTokens[preferredPaymentToken],
                "Token not supported"
            );
        }

        MerchantConfig storage config = merchants[msg.sender];
        config.registered = true;
        config.preferredPaymentToken = preferredPaymentToken;

        if (customRepaymentPeriod > 0) {
            config.customRepaymentPeriod = customRepaymentPeriod;
        } else {
            config.customRepaymentPeriod = 0; // Use default
        }

        emit MerchantRegistered(msg.sender);
    }

    /**
     * @dev Update merchant configuration
     * @param preferredPaymentToken Preferred token for payments
     * @param customRepaymentPeriod Custom repayment period (0 to use default)
     */
    function updateMerchantConfig(
        address preferredPaymentToken,
        uint256 customRepaymentPeriod
    ) external {
        require(merchants[msg.sender].registered, "Merchant not registered");

        if (preferredPaymentToken != address(0)) {
            require(
                supportedPaymentTokens[preferredPaymentToken],
                "Token not supported"
            );
        }

        MerchantConfig storage config = merchants[msg.sender];
        config.preferredPaymentToken = preferredPaymentToken;

        if (customRepaymentPeriod > 0) {
            config.customRepaymentPeriod = customRepaymentPeriod;
        } else {
            config.customRepaymentPeriod = 0; // Use default
        }

        emit MerchantConfigUpdated(msg.sender);
    }

    /**
     * @dev Create a new order (merchant only)
     * @param orderIdString String identifier for the order (e.g., from merchant system)
     * @param token Token to receive as payment
     * @param amount Token amount expected
     * @return orderId Order ID hash
     */
    function createOrder(
        string calldata orderIdString,
        address token,
        uint256 amount
    ) external returns (bytes32) {
        require(merchants[msg.sender].registered, "Merchant not registered");
        require(amount > 0, "Amount must be greater than 0");
        require(supportedPaymentTokens[token], "Token not supported");

        // Generate a unique order ID based on merchant, orderIdString, and timestamp
        bytes32 orderId = keccak256(
            abi.encodePacked(msg.sender, orderIdString, block.timestamp)
        );

        // Create order
        OrderInfo storage order = orders[orderId];
        order.merchant = msg.sender;
        order.amount = amount;
        order.paymentToken = token;

        emit OrderCreated(orderId, msg.sender, token, amount);

        return orderId;
    }

    /**
     * @dev Pay for an order directly with tokens (not BNPL)
     * @param orderId Order ID hash
     */
    function payOrder(bytes32 orderId) external nonReentrant {
        OrderInfo storage order = orders[orderId];
        require(order.merchant != address(0), "Order does not exist");
        require(!order.isPaid, "Order already paid");

        address paymentToken = order.paymentToken;
        uint256 tokenAmount = order.amount;

        // Transfer tokens from customer to merchant
        IERC20(paymentToken).safeTransferFrom(
            msg.sender,
            order.merchant,
            tokenAmount
        );

        // Update order
        order.customer = msg.sender;
        order.isPaid = true;
        order.isBNPL = false;

        emit OrderPaid(orderId, msg.sender, false);
    }

    /**
     * @dev Pay for an order using BNPL
     * @param orderId Order ID hash
     * @param collateralToken Token to use as collateral
     */
    function payOrderBNPL(
        bytes32 orderId,
        address collateralToken
    ) external nonReentrant {
        OrderInfo storage order = orders[orderId];
        require(order.merchant != address(0), "Order does not exist");
        require(!order.isPaid, "Order already paid");
        require(
            supportedCollateralTokens[collateralToken],
            "Collateral token not supported"
        );

        address paymentToken = order.paymentToken;
        uint256 tokenAmount = order.amount;

        // Determine repayment period
        uint256 repaymentPeriod = defaultRepaymentPeriod;
        if (merchants[order.merchant].customRepaymentPeriod > 0) {
            repaymentPeriod = merchants[order.merchant].customRepaymentPeriod;
        }

        // Get tokens from ZeroDebt and send directly to merchant
        uint256 debtId = zeroDebt.createDebtFor(
            msg.sender,
            order.merchant,
            paymentToken,
            tokenAmount,
            collateralToken,
            repaymentPeriod
        );

        // Update order
        order.customer = msg.sender;
        order.isPaid = true;
        order.isBNPL = true;
        order.debtId = debtId;

        emit OrderPaid(orderId, msg.sender, true);
    }

    /**
     * @dev Add a supported payment token
     * @param token Token address
     */
    function addPaymentToken(address token) external onlyOwner {
        supportedPaymentTokens[token] = true;
        emit PaymentTokenAdded(token);
    }

    /**
     * @dev Remove a supported payment token
     * @param token Token address
     */
    function removePaymentToken(address token) external onlyOwner {
        supportedPaymentTokens[token] = false;
        emit PaymentTokenRemoved(token);
    }

    /**
     * @dev Add a supported collateral token
     * @param token Token address
     */
    function addCollateralToken(address token) external onlyOwner {
        supportedCollateralTokens[token] = true;
        emit CollateralTokenAdded(token);
    }

    /**
     * @dev Remove a supported collateral token
     * @param token Token address
     */
    function removeCollateralToken(address token) external onlyOwner {
        supportedCollateralTokens[token] = false;
        emit CollateralTokenRemoved(token);
    }

    /**
     * @dev Set the default repayment period
     * @param period New period in seconds
     */
    function setDefaultRepaymentPeriod(uint256 period) external onlyOwner {
        defaultRepaymentPeriod = period;
    }

    /**
     * @dev Set the ZeroDebt contract address
     * @param _zeroDebt New ZeroDebt contract address
     */
    function setZeroDebt(address _zeroDebt) external onlyOwner {
        zeroDebt = IZeroDebt(_zeroDebt);
    }

    /**
     * @dev Check if an order is paid
     * @param orderId Order ID hash
     * @return isPaid Whether the order is paid
     * @return isBNPL Whether the order was paid with BNPL
     */
    function checkOrderStatus(
        bytes32 orderId
    ) external view returns (bool isPaid, bool isBNPL) {
        OrderInfo storage order = orders[orderId];
        return (order.isPaid, order.isBNPL);
    }
}
