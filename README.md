# Aptos Oracle - Telegram Bot

A Telegram bot that serves as an AI-powered crypto assistant for the Aptos blockchain, enabling users to interact with the blockchain through natural language conversations.

## Features

- 🤖 **AI-Powered Assistant**: Uses Claude AI to understand and respond to natural language requests
- 🔄 **Blockchain Integration**: Interact with the Aptos blockchain using the Move Agent Kit
- 📊 **Balance Checking**: Check token balances and transaction history
- 💸 **Transaction Execution**: Execute blockchain transactions through conversations
- 📚 **Educational Content**: Learn about Aptos protocols and tokens
- 🛠️ **Network Resilience**: Built-in solutions for network connectivity issues

## Architecture

Aptos Oracle combines several powerful technologies:

- **Telegram Bot API**: User interface through Telegram
- **Anthropic Claude API**: Natural language understanding
- **Aptos Blockchain**: Transaction execution and chain interaction
- **Move Agent Kit**: Smart contract interaction
- **LangChain**: Agent orchestration

## Prerequisites

- Node.js 16+
- npm or pnpm
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Anthropic API Key (for Claude)
- Aptos Private Key (for blockchain operations)
- Optional: Panora API Key (for enhanced market data)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/aptos-oracle.git
   cd aptos-oracle
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the example environment file and fill in your credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

## Configuration

The bot can be configured through environment variables:

### Core Configuration
```
TELEGRAM_BOT_TOKEN=your_bot_token
ANTHROPIC_API_KEY=your_anthropic_key
APTOS_PRIVATE_KEY=your_aptos_key
PANORA_API_KEY=your_panora_key (optional)
```

### Network Configuration
```
# Enable if you're having network issues connecting to Telegram API
USE_PROXY=false
HTTP_PROXY=http://your-proxy-server:port (optional)
HTTPS_PROXY=https://your-proxy-server:port (optional)
SOCKS_PROXY=socks5://localhost:1080 (optional)
```

### Bot Mode
```
# Use webhook mode instead of polling (recommended for production)
USE_WEBHOOK=false
WEBHOOK_DOMAIN=https://your-domain.com
PORT=3000
```

## Running the Bot

### Development Mode
```bash
# Start in polling mode
pnpm bot

# Start with detailed logging
DEBUG=grammy* pnpm bot
```

### Production Mode
```bash
# Start in webhook mode (recommended for production)
USE_WEBHOOK=true pnpm webhook

# With PM2 for process management
pm2 start npm --name "aptos-oracle" -- run webhook
```

## Bot Commands

Aptos Oracle supports the following commands:

- `/start` - Welcome message and introduction
- `/help` - List all available commands
- `/balance` - Check token balances
- `/info` - Get information about supported protocols

Users can also interact with the bot using natural language to perform actions like:
- "Check my APT balance"
- "Execute a transaction to transfer tokens"
- "Show me information about the Aptos ecosystem"

## Centralized Wallet Architecture

The bot uses a single admin wallet defined by `APTOS_PRIVATE_KEY` in the environment variables:

- All blockchain operations are executed through this central wallet
- The wallet is initialized during startup using the Aptos TS SDK
- Transactions are signed using this wallet's private key
- Users interact with the same wallet across all conversations

## Troubleshooting

### Network Connectivity Issues

If the bot fails to connect to the Telegram API:

1. Check your network's outbound connectivity to api.telegram.org
2. Try enabling proxy support by setting `USE_PROXY=true` and configuring a proxy
3. Switch to webhook mode if you have a public domain
4. Check if Telegram is blocked in your region

### Agent Communication Errors

If the AI agent fails to respond properly:

1. Verify your Anthropic API key is valid
2. Check the logs for error messages
3. Ensure your Aptos private key is correctly formatted

## Development

### Project Structure

```
/src
  /services
    moveService.ts      # Aptos blockchain integration and agent creation
  /utils
    proxySetup.ts       # Network proxy configuration
  bot.ts                # Telegram bot implementation
  webhook.ts            # Webhook server implementation
```

### Adding New Features

1. Extend the bot commands in `bot.ts`
2. Modify agent capabilities in `moveService.ts`
3. Enhance AI prompts in the agent configuration

## Performance Optimization

The bot includes several performance optimizations:

1. **Agent Caching**: Agents are cached by user ID to avoid recreating them
2. **Alternative API Access**: Configuration for alternative Telegram API servers
3. **Network Resilience**: Proxy support for challenging network environments
4. **Webhook Mode**: Option to use webhooks instead of polling for better reliability

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Credits

- [Aptos Blockchain](https://aptoslabs.com/)
- [Grammy Telegram Bot Framework](https://grammy.dev/)
- [Move Agent Kit](https://github.com/aptos-labs/move-agent-kit)
- [Anthropic Claude API](https://www.anthropic.com/)
- [LangChain](https://langchain.com/)

## Security Considerations

- The admin wallet private key is stored in environment variables - keep this secure
- Use environment variables for all sensitive credentials
- In production, use HTTPS for webhook endpoints
- Consider implementing rate limiting for public-facing endpoints

---

Built with ❤️ for the Aptos ecosystem