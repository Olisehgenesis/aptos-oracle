// Modified startup approach
// src/index.ts - Create this file as a new entry point

import { startBot } from './bot';
import { getAptosClient } from './services/moveService';

// Minimal initialization for startup
console.log("[index] Starting application");
console.time('[index] Application startup time');

// Initialize bot without other services
startBot()
  .then(bot => {
    console.log("[index] Bot started successfully");
    console.timeEnd('[index] Application startup time');
    
    // Initialize other services in the background AFTER bot is running
    setTimeout(() => {
      console.log("[index] Starting background initialization of other services");
      console.time('[index] Background initialization time');
      
      // Initialize Aptos client in the background
      getAptosClient();
      
      console.log("[index] Background initialization completed");
      console.timeEnd('[index] Background initialization time');
    }, 1000);
  })
  .catch(error => {
    console.error("[index] Failed to start application:", error);
    process.exit(1);
  });