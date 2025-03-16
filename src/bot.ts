// src/bot.ts
import { Bot, GrammyError, HttpError } from "grammy";
import dotenv from "dotenv";
import { processMessage } from "./services/moveService";

console.log("[bot] Module loading started");

// Load environment variables
console.log("[bot] Loading environment variables");
dotenv.config();
console.log("[bot] Environment variables loaded");

// Initialize the bot
export async function initBot() {
  console.log("[initBot] Function called");
  console.time('[initBot] Total initialization time');
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[initBot] TELEGRAM_BOT_TOKEN environment variable not found");
    throw new Error("TELEGRAM_BOT_TOKEN environment variable not found.");
  }
  console.log("[initBot] TELEGRAM_BOT_TOKEN found");
  
  console.log("[initBot] Creating new Bot instance");
  console.time('[initBot] Bot instance creation time');
  const bot = new Bot(token);
  console.timeEnd('[initBot] Bot instance creation time');
  
  // Welcome message for /start command
  console.log("[initBot] Setting up /start command handler");
  bot.command("start", async (ctx) => {
    console.log(`[bot:start] Command received from user ${ctx.from?.id}`);
    await ctx.reply(`
Welcome to Aptos Oracle! 🚀

I'm your AI assistant for managing your crypto portfolio on the Aptos blockchain. I can help you:

• Check token balances
• View transaction history
• Get information about Aptos protocols and tokens
• Execute transactions when requested

How can I assist you today?
    `);
    console.log(`[bot:start] Reply sent to user ${ctx.from?.id}`);
  });
  
  // Help command
  console.log("[initBot] Setting up /help command handler");
  bot.command("help", async (ctx) => {
    console.log(`[bot:help] Command received from user ${ctx.from?.id}`);
    await ctx.reply(`
CryptoSage Commands:

/start - Start the bot and get a welcome message
/help - Show this help message
/balance - Check your token balances
/wallet - Get your wallet information
/info - Information about supported protocols

You can also just chat with me naturally about your crypto portfolio needs!
    `);
    console.log(`[bot:help] Reply sent to user ${ctx.from?.id}`);
  });
  
  // Handle regular text messages
  console.log("[initBot] Setting up text message handler");
  bot.on("message:text", async (ctx) => {
    const messageText = ctx.message.text;
    const userId = ctx.from?.id.toString();
    
    console.log(`[bot:message] Received message from user ${userId}: ${messageText.substring(0, 30)}${messageText.length > 30 ? '...' : ''}`);
    
    // Skip if the message is a command (handled separately)
    if (messageText.startsWith('/') && messageText.length > 1) {
      console.log(`[bot:message] Skipping command message: ${messageText}`);
      return;
    }
    
    if (!userId) {
      console.log(`[bot:message] No userId found, skipping processing`);
      return;
    }
    
    try {
      console.time(`[bot:message] Total processing time for user ${userId}`);
      
      // Show typing indicator
      console.log(`[bot:message] Setting typing action for user ${userId}`);
      await ctx.replyWithChatAction("typing");
      
      // Send immediate acknowledgment to the user
      await ctx.reply("I'm processing your request. This may take a moment for the first interaction...");
      
      // Process the message through our agent
      console.log(`[bot:message] Processing message through agent for user ${userId}`);
      console.time(`[bot:message] Agent processing time for user ${userId}`);
      
      // Add timeout for the processMessage call
      const messagePromise = processMessage(userId, messageText);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log(`[bot:message] processMessage timed out after 3 minutes for user ${userId}`);
          reject(new Error("Agent initialization timeout"));
        }, 180000); // 3 minutes
      });
      
      const stream = await Promise.race([messagePromise, timeoutPromise])
        .catch(error => {
          console.error(`[bot:message] Error in processMessage for user ${userId}:`, error);
          ctx.reply("I'm sorry, it's taking longer than expected to process your request. Please try again later.");
          throw error;
        });
      
          console.timeEnd(`[bot:message] Agent processing time for user ${userId}`);
        } catch (error) {
          console.error(`[bot:message] Error processing message for user ${userId}:`, error);
          await ctx.reply("An error occurred while processing your request. Please try again later.");
        } finally {
          console.timeEnd(`[bot:message] Total processing time for user ${userId}`);
        }
      });
  
  // Error handling for the bot
  console.log("[initBot] Setting up error handler");

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`[bot:error] Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("[bot:error] Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("[bot:error] Could not contact Telegram:", e);
    } else {
      console.error("[bot:error] Unknown error:", e);
    }
  });
  
  console.timeEnd('[initBot] Total initialization time');
  console.log("[initBot] Bot initialization completed successfully");
  return bot;
}
  

    // Start the bot in polling mode (used for direct execution)
    // Update this function in bot.ts
    // Updated startBot function that uses the alternative approach
    export async function startBot() {
      console.log("[startBot] Function called");
      console.time('[startBot] Total startup time');
      
      try {
        console.log("[startBot] Initializing bot");
        const bot = await initBot();
        
        console.log("[startBot] Starting the bot in alternative mode");
        console.time('[startBot] Bot connection time');
        
        // Log every 30 seconds while waiting
        let waitSeconds = 0;
        const intervalId = setInterval(() => {
          waitSeconds += 30;
          console.log(`[startBot] Still waiting for bot connection after ${waitSeconds} seconds...`);
        }, 30000);
        
        // Start with a different approach - first connect to API
        console.log("[startBot] Connecting to Telegram API...");
        
        return new Promise((resolve, reject) => {
          bot.api.getMe()
            .then(botInfo => {
              console.log(`[startBot] Bot connected successfully as @${botInfo.username}`);
              clearInterval(intervalId);
              console.timeEnd('[startBot] Bot connection time');
              
              // Now start polling in the background
              console.log("[startBot] Starting polling in background...");
              bot.start({
                drop_pending_updates: true,
                onStart: (info) => {
                  console.log(`[startBot] Polling started for @${info.username}`);
                  console.timeEnd('[startBot] Total startup time');
                }
              });
              
              // Resolve with the bot immediately after connection is confirmed
              resolve(bot);
            })
            .catch(error => {
              clearInterval(intervalId);
              console.error("[startBot] Failed to connect to Telegram API:", error);
              reject(error);
            });
        });
      } catch (error) {
        console.error("[startBot] Failed to initialize bot:", error);
        throw error;
      }
    }

// Main function for direct execution
async function main() {
  console.log("[main] Starting main function");
  console.time('[main] Total execution time');
  
  console.log("[main] Environment check:");
  console.log(`[main] - TELEGRAM_BOT_TOKEN set: ${Boolean(process.env.TELEGRAM_BOT_TOKEN)}`);
  console.log(`[main] - ANTHROPIC_API_KEY set: ${Boolean(process.env.ANTHROPIC_API_KEY)}`);
  console.log(`[main] - APTOS_PRIVATE_KEY set: ${Boolean(process.env.APTOS_PRIVATE_KEY)}`);
  console.log(`[main] - PANORA_API_KEY set: ${Boolean(process.env.PANORA_API_KEY)}`);
  
  try {
    console.log("[main] Starting bot");
    await startBot();
    console.log("[main] Bot is running! Press Ctrl+C to stop.");
    console.timeEnd('[main] Total execution time');
  } catch (error) {
    console.error("[main] Failed to start the bot:", error);
    console.timeEnd('[main] Total execution time');
    process.exit(1);
  }
}

// If this file is run directly (not imported)
if (require.main === module) {
  console.log("[bot] Running as main module");
  main().catch(err => {
    console.error("[main] Unhandled error in main:", err);
    process.exit(1);
  });
}

console.log("[bot] Module loading completed");