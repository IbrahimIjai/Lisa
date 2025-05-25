# ZeroPay: Conversational DeFi Gateway

ZeroPay is a conversational AI platform that brings decentralized finance (DeFi) to users through a natural chat interface. Our platform enables anyone to participate in blockchain activities without requiring specialized apps or technical knowledge - just chat with Lisa, our AI assistant.

## 🚀 Features

- **Token Swaps**: Swap tokens via 1inch or other DEX aggregators through simple chat commands
- **Wallet Management**: Securely create, import, and manage crypto wallets
- **DeFi Interactions**: Supply assets to lending protocols like Morpho, Aave, or Compound
- **Payments**: Send and receive crypto payments easily through conversational interface
- **Yield Opportunities**: Access yield farming and staking protocols
- **Real-time Notifications**: Get alerts for transactions and market movements
- **Multi-chain Support**: Interact with Ethereum, Polygon, and other EVM-compatible chains

## 💡 Why Conversational DeFi?

- **Natural Interaction**: Engage with DeFi through natural language rather than complex interfaces
- **Low Barrier to Entry**: Perfect for crypto newcomers and the underbanked
- **Guided Experience**: AI assistant helps users navigate DeFi options safely
- **Future Messaging Integration**: Plans to connect with WhatsApp, X (Twitter), and Telegram for even broader accessibility

## 🏗️ Architecture

The project consists of:

- **Conversational AI**: Advanced natural language processing for understanding user intent
- **Web Interface**: Clean, modern chat interface for interacting with Lisa
- **Crypto Backend**: Secure wallet infrastructure and blockchain interactions
- **DeFi Adapters**: Specialized modules to interact with various DeFi protocols
- **Messaging Connectors**: Future integrations with WhatsApp, X, and Telegram

## 🔧 Development

The project is structured as a monorepo with the following components:

- **Web App**: Next.js frontend with chat interface in the [apps/web](apps/web) directory
- **UI Components**: Shared UI library in the [packages/ui](packages/ui) directory
- **Backend Services**: API and blockchain services

## 🛣️ Roadmap

- ✅ Web chat interface development
- ✅ Conversational AI integration
- ⬜ Wallet creation and management
- ⬜ Token swapping via DEX aggregators
- ⬜ Lending protocol integration
- ⬜ Fiat on/off ramps
- ⬜ Multi-chain support
- ⬜ WhatsApp, X, and Telegram integration
- ⬜ User notification system

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ for making DeFi accessible through conversation

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
