// scripts/set-webhook.ts
import dotenv from 'dotenv';
import { Bot } from 'grammy';

// Load environment variables
dotenv.config();

async function setWebhook() {
  // Check environment variables
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.WEBHOOK_URL;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN environment variable not found');
    process.exit(1);
  }
  
  if (!webhookUrl) {
    console.error('WEBHOOK_URL environment variable not found. Please set it to your deployed API route, e.g. https://your-domain.vercel.app/api');
    process.exit(1);
  }

  try {
    // Create bot instance
    const bot = new Bot(token);
    
    // Get current webhook info
    const currentWebhook = await bot.api.getWebhookInfo();
    console.log('Current webhook info:', currentWebhook);
    
    if (currentWebhook.url === webhookUrl) {
      console.log(`Webhook is already set to ${webhookUrl}`);
    } else {
      // Set webhook
      const result = await bot.api.setWebhook(webhookUrl, {
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
      });
      
      if (result) {
        console.log(`✅ Webhook successfully set to: ${webhookUrl}`);
      } else {
        console.error('❌ Failed to set webhook');
      }
    }
    
    // Get updated webhook info
    const updatedWebhook = await bot.api.getWebhookInfo();
    console.log('Updated webhook info:', updatedWebhook);
  } catch (error) {
    console.error('Error setting webhook:', error);
    process.exit(1);
  }
}

setWebhook().catch(console.error);