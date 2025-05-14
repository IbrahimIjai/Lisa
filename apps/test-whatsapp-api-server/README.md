# WhatsApp API Server

This Express.js server integrates with WhatsApp Cloud API to create a bot that can handle messages and perform blockchain transactions.

## Prerequisites

- Node.js v14+ and pnpm
- WhatsApp Business API account
- Meta developer account with WhatsApp integration

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a `.env` file based on the example below:

   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # WhatsApp API Configuration
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN=your_verification_token
   ```

3. Get your WhatsApp API credentials:
   - Go to [Meta Developer Portal](https://developers.facebook.com/)
   - Create or select your app
   - Add WhatsApp product
   - Get access token and phone number ID
   - Create a verification token (any random string)

## Running the Server

Development mode:

```bash
pnpm dev
```

Production mode:

```bash
pnpm start
```

## WhatsApp Webhook Setup

1. Ensure your server is publicly accessible via HTTPS
2. In the Meta Developer Portal, set your webhook URL to:
   `https://your-domain.com/api/whatsapp/webhook`
3. Use the same verification token you set in the environment variables
4. Subscribe to messages

## Current Features

- Webhook verification
- Receiving and processing text messages
- Sending text messages back to users

## Planned Features

- Blockchain wallet integration
- Token swapping via 1inch
- Private key management
- On-chain transactions
