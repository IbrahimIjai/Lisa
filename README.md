# Zero Protocol

> _Buy Now, Pay Later Protocol for Web3_

Zero Protocol is a decentralized Buy Now, Pay Later (BNPL) solution for blockchain applications. It enables users to stake their crypto assets and utilize them as collateral to make purchases while continuing to earn yield on their staked assets.

## Core Components

### 1. ZeroStaking

The collateral management system that allows users to:

- Stake assets (USDC, ETH, etc.) to be used as collateral
- Earn yield on staked assets (via Morpho integration for ~13% APY on USDC)
- Lock and unlock collateral for BNPL transactions

### 2. ZeroDebt

The debt management system that:

- Creates BNPL transactions between borrowers and merchants
- Tracks repayments and deadlines
- Handles liquidations for defaulted transactions

### 3. ZeroPay

The merchant integration layer that:

- Provides a simple checkout experience for merchants
- Allows merchants to accept BNPL payments
- Supports both direct payments and BNPL payments

## How It Works

### For Users

1. **Stake Assets**: Deposit crypto assets into ZeroStaking to earn yield and establish a credit line.
2. **Shop with BNPL**: Make purchases from supported merchants using your credit line without having to sell your assets.
3. **Repay Later**: Pay back the debt before the deadline to retrieve your collateral, or face liquidation + penalty fees.
4. **Earn Yield**: Continue earning yield on your staked assets even while they're being used as collateral for BNPL.

### For Merchants

1. **Register**: Register as a merchant in the ZeroPay contract.
2. **Create Orders**: Create payment orders with specific token amounts.
3. **Receive Payments**: Accept payments via direct transfer or BNPL.
4. **Earn Penalties**: Receive a portion of penalty fees if customers default on their payments.

## Protocol Flow

1. User stakes assets in ZeroStaking (e.g., USDC)
2. Assets are deployed to Morpho to earn ~13% APY
3. Merchant creates an order through ZeroPay, specifying token and amount
4. User selects BNPL payment option for the order
5. ZeroDebt locks appropriate collateral in ZeroStaking
6. Merchant receives payment immediately
7. User must repay the debt before the deadline
8. If repaid on time, collateral is unlocked and user keeps earned yield
9. If not repaid, collateral is liquidated with penalty (shared between protocol and merchant)

## Technical Architecture

### Smart Contracts

- **ZeroStaking.sol**: Handles collateral and yield generation
- **MorphoStrategyImpl.sol**: Integrates with Morpho for yield optimization
- **ZeroDebt.sol**: Manages BNPL transactions and repayments
- **ZeroPay.sol**: Merchant integration and checkout flow

### Key Features

- **Yield-Bearing Collateral**: Stake and earn yield while using assets as collateral
- **Configurable Terms**: Customizable repayment periods and collateralization ratios
- **Merchant Integration**: Simple API for merchants to integrate BNPL
- **Rewards Distribution**: Morpho rewards claimed via Universal Rewards Distributor (URD)

## Advantages

- Keep earning yield on staked assets
- No need to sell crypto holdings to make purchases
- Merchants receive payment immediately
- Both users and merchants benefit from the protocol
- Additional yield from penalty fees

## Security Considerations

- Collateralization ratio of 150% by default
- Strict liquidation mechanism for defaulted debts
- Non-custodial design (no central party holds funds)
- Clear terms and penalties for late payments

## Development Status

Zero Protocol is currently in development for a hackathon submission. The initial version focuses on USDC support on Base with Morpho integration for optimized yields.

## Future Roadmap

- Support for additional tokens and yield strategies
- Integration with DEX liquidity pools for yield optimization
- NFT minting integration
- Mobile app for users to manage BNPL transactions
- SDK for merchant website integration
- Price oracle integration for USD-denominated payments

```bash
pnpm dlx shadcn@latest init
```

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Tailwind

Your `tailwind.config.ts` and `globals.css` are already set up to use the components from the `ui` package.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```
