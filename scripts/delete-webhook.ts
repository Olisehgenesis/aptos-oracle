// scripts/delete-webhook.ts
import dotenv from 'dotenv';
import { Bot } from 'grammy';

// Load environment variables
dotenv.config();

async function deleteWebhook() {
  // Check environment variables
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN environment variable not found');
    process.exit(1);
  }

  try {
    // Create bot instance
    const bot = new Bot(token);
    
    // Get current webhook info
    const currentWebhook = await bot.api.getWebhookInfo();
    console.log('Current webhook info:', currentWebhook);
    
    if (currentWebhook.url) {
      // Delete webhook
      const result = await bot.api.deleteWebhook({
        drop_pending_updates: true
      });
      
      if (result) {
        console.log('✅ Webhook successfully deleted');
      } else {
        console.error('❌ Failed to delete webhook');
      }
    } else {
      console.log('No webhook is currently set');
    }
    
    // Get updated webhook info
    const updatedWebhook = await bot.api.getWebhookInfo();
    console.log('Updated webhook info:', updatedWebhook);
  } catch (error) {
    console.error('Error deleting webhook:', error);
    process.exit(1);
  }
}

deleteWebhook().catch(console.error);