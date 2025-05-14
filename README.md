# Lisa: WhatsApp DeFi Gateway

Lisa is a WhatsApp-based bot that brings decentralized finance (DeFi) to billions of users via a familiar messaging interface. Our platform enables anyone with a WhatsApp account to participate in blockchain activities without requiring specialized apps or technical knowledge.

## 🚀 Features

- **Token Swaps**: Swap tokens via 1inch or other DEX aggregators directly from WhatsApp
- **Wallet Management**: Securely create, import, and manage crypto wallets
- **DeFi Interactions**: Supply assets to lending protocols like Morpho, Aave, or Compound
- **Payments**: Send and receive crypto payments using just a phone number
- **Yield Opportunities**: Access yield farming and staking protocols
- **Real-time Notifications**: Get alerts for transactions and market movements
- **Multi-chain Support**: Interact with Ethereum, Polygon, and other EVM-compatible chains

## 💡 Why WhatsApp?

- **Massive Reach**: Over 2 billion users worldwide
- **No New App Required**: Users leverage a familiar interface they already use daily
- **Low Barrier to Entry**: Perfect for crypto newcomers and the underbanked
- **End-to-End Encryption**: Built on WhatsApp's secure messaging infrastructure

## 🏗️ Architecture

The project consists of:

- **WhatsApp API Integration**: For message handling and user interactions
- **Crypto Backend**: Secure wallet infrastructure and blockchain interactions
- **DeFi Adapters**: Specialized modules to interact with various DeFi protocols

## 🔧 Development

Check out the server implementation in the [apps/test-whatsapp-api-server](apps/test-whatsapp-api-server) directory.

## 🛣️ Roadmap

- ✅ WhatsApp API integration with webhook verification
- ⬜ Wallet creation and management
- ⬜ Token swapping via DEX aggregators
- ⬜ Lending protocol integration
- ⬜ Fiat on/off ramps
- ⬜ Multi-chain support
- ⬜ User notification system

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ for DeFi accessibility

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
