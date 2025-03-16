// src/simple-ai-bot.ts - Simplified bot with AI integration
import { Bot } from "grammy";
import dotenv from "dotenv";
import {
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from "@aptos-labs/ts-sdk";
import { AgentRuntime, LocalSigner, createAptosTools } from "move-agent-kit";
import { ChatAnthropic } from "@langchain/anthropic";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

// Load environment variables
dotenv.config();

// Main function that runs the bot
async function runBot() {
  console.log("Starting bot initialization...");
  
  // 1. Check and get environment variables
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const privateKeyStr = process.env.APTOS_PRIVATE_KEY;
  
  if (!token) {
    console.error("Error: TELEGRAM_BOT_TOKEN not found");
    process.exit(1);
  }
  
  if (!anthropicKey) {
    console.error("Error: ANTHROPIC_API_KEY not found");
    process.exit(1);
  }
  
  if (!privateKeyStr) {
    console.error("Error: APTOS_PRIVATE_KEY not found");
    process.exit(1);
  }
  
  console.log("✅ All required environment variables found");
  
  try {
    // 2. Initialize Aptos
    console.log("Initializing Aptos client...");
    const aptosConfig = new AptosConfig({
      network: Network.MAINNET,
    });
    const aptos = new Aptos(aptosConfig);
    
    // 3. Initialize account
    console.log("Setting up account from private key...");
    try {
      // Create a proper private key instance
      const privateKey = new Ed25519PrivateKey(privateKeyStr);
      
      // Derive account
      const account = await aptos.account.deriveAccountFromPrivateKey({ 
        privateKey 
      });
      
      console.log("✅ Account derived successfully:", account.accountAddress.toString());
      
      // 4. Set up LLM and agent
      console.log("Initializing AI components...");
      const llm = new ChatAnthropic({
        modelName: "claude-3-5-sonnet-20241022",
        temperature: 0.7,
        anthropicApiKey: anthropicKey,
      });
      
      // 5. Create signer and agent runtime
      const signer = new LocalSigner(account, Network.MAINNET);
      const aptosAgent = new AgentRuntime(signer, aptos, {
        PANORA_API_KEY: process.env.PANORA_API_KEY,
      });
      
      // 6. Create tools and memory
      const tools = createAptosTools(aptosAgent);
      const memory = new MemorySaver();
      
      // 7. Create bot instance
      console.log("Creating Telegram bot...");
      const bot = new Bot(token);
      
      // 8. Define message handler
      bot.on("message:text", async (ctx) => {
        const userId = ctx.from?.id.toString();
        if (!userId) return;
        
        console.log(`Received message from user ${userId}: ${ctx.message.text}`);
        
        try {
          // Show typing indicator
          await ctx.replyWithChatAction("typing");
          
          // Create agent config for this user
          const config = { configurable: { thread_id: userId } };
          
          // Create agent for this user
          const agent = createReactAgent({
            llm,
            tools,
            checkpointSaver: memory,
            messageModifier: `
            You are CryptoSage, a helpful crypto portfolio management assistant that can interact with the Aptos blockchain using the Move Agent Kit.
            You help users manage their crypto assets, check balances, execute transactions, and provide insights on market trends.
            Be concise and helpful with your responses.
            `,
          });
          
          // Process the message
          console.log("Processing message through AI agent...");
          const stream = await agent.stream(
            { messages: [new HumanMessage(ctx.message.text)] },
            config
          );
          
          // Handle timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 60000) // 60-second timeout
          );
          
          // Process the stream
          for await (const chunk of (await Promise.race([stream, timeoutPromise])) as any) {
            if ("agent" in chunk) {
              if (chunk.agent.messages && chunk.agent.messages[0] && chunk.agent.messages[0].content) {
                const messageContent = chunk.agent.messages[0].content;
                console.log("Received agent response, sending to user...");
                
                if (Array.isArray(messageContent)) {
                  const extractedTexts = messageContent
                    .filter((msg) => msg.type === "text")
                    .map((msg) => msg.text)
                    .join("\n\n");
                  
                  await ctx.reply(extractedTexts || "No text response available.");
                } else if (typeof messageContent === "object") {
                  await ctx.reply(JSON.stringify(messageContent, null, 2));
                } else {
                  await ctx.reply(String(messageContent));
                }
              }
            }
          }
        } catch (error) {
          console.error("Error processing message:", error);
          await ctx.reply("Sorry, I encountered an error processing your request. Please try again.");
        }
      });
      
      // 9. Start the bot
      console.log("Starting bot in polling mode...");
      await bot.start({
        onStart: (botInfo) => {
          console.log(`✅ Bot @${botInfo.username} started successfully!`);
          console.log("Bot is now running in polling mode.");
          console.log("Send a message to the bot to test it.");
        },
        allowed_updates: ["message", "callback_query"],
      });
      
    } catch (accountError) {
      console.error("Error with account setup:", accountError);
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the bot
console.log("=== CryptoSage Bot Starting ===");
runBot().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});