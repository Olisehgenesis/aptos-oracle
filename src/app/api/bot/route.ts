// src/bot.ts
import { Bot, GrammyError, HttpError } from "grammy";
import dotenv from "dotenv";
import { processMessage } from "@/services/moveService";


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
      
      // Process the message through our agent
      console.log(`[bot:message] Processing message through agent for user ${userId}`);
      console.time(`[bot:message] Agent processing time for user ${userId}`);
      const stream = await processMessage(userId, messageText);
      console.timeEnd(`[bot:message] Agent processing time for user ${userId}`);
      
      // Set a timeout for the agent processing
      console.log(`[bot:message] Setting up timeout for stream processing`);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          console.log(`[bot:message] Stream processing timeout triggered for user ${userId}`);
          reject(new Error("Timeout"));
        }, 30000)
      );
      
      try {
        console.log(`[bot:message] Starting to process stream chunks for user ${userId}`);
        console.time(`[bot:message] Stream processing time for user ${userId}`);
        
        for await (const chunk of (await Promise.race([
          stream,
          timeoutPromise,
        ])) as AsyncIterable<{ agent?: any; tools?: any }>) {
          if ("agent" in chunk) {
            console.log(`[bot:message] Received agent chunk for user ${userId}`);
            if (chunk.agent.messages[0].content) {
              console.log(`[bot:message] Processing content from agent message for user ${userId}`);
              const messageContent = chunk.agent.messages[0].content;

              if (Array.isArray(messageContent)) {
                console.log(`[bot:message] Processing array message content for user ${userId}`);
                const extractedTexts = messageContent
                  .filter((msg) => msg.type === "text")
                  .map((msg) => msg.text)
                  .join("\n\n");

                console.log(`[bot:message] Sending reply to user ${userId}`);
                await ctx.reply(extractedTexts || "No text response available.");
              } else if (typeof messageContent === "object") {
                console.log(`[bot:message] Processing object message content for user ${userId}`);
                console.log(`[bot:message] Sending reply to user ${userId}`);
                await ctx.reply(JSON.stringify(messageContent, null, 2));
              } else {
                console.log(`[bot:message] Processing string message content for user ${userId}`);
                console.log(`[bot:message] Sending reply to user ${userId}`);
                await ctx.reply(String(messageContent));
              }
            } else {
              console.log(`[bot:message] No content in agent message for user ${userId}`);
            }
          } else if ("tools" in chunk) {
            console.log(`[bot:message] Received tools chunk for user ${userId}`);
          } else {
            console.log(`[bot:message] Received unknown chunk type for user ${userId}`);
          }
        }
        
        console.timeEnd(`[bot:message] Stream processing time for user ${userId}`);
        console.log(`[bot:message] Completed processing all stream chunks for user ${userId}`);
      } catch (error: any) {
        if (error.message === "Timeout") {
          console.log(`[bot:message] Stream processing timed out for user ${userId}`);
          await ctx.reply(
            "I'm sorry, the operation took too long and timed out. Please try again."
          );
        } else {
          console.error(`[bot:message] Error processing stream for user ${userId}:`, error);
          await ctx.reply(
            "I'm sorry, an error occurred while processing your request."
          );
        }
      }
      
      console.timeEnd(`[bot:message] Total processing time for user ${userId}`);
    } catch (error) {
      console.error(`[bot:message] Error handling message for user ${userId}:`, error);
      await ctx.reply("Sorry, I encountered an internal error. Please try again later.");
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
export async function startBot() {
  console.log("[startBot] Function called");
  console.time('[startBot] Total startup time');
  
  try {
    console.log("[startBot] Initializing bot");
    const bot = await initBot();
    
    console.log("[startBot] Starting the bot in polling mode");
    console.time('[startBot] Bot polling start time');
    
    await bot.start({
      onStart: (botInfo) => {
        console.log(`[startBot] Bot started successfully as @${botInfo.username}`);
      },
      drop_pending_updates: true,
    });
    
    console.timeEnd('[startBot] Bot polling start time');
    console.timeEnd('[startBot] Total startup time');
    
    return bot;
  } catch (error) {
    console.error("[startBot] Failed to start bot:", error);
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