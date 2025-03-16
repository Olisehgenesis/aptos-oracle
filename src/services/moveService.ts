// src/services/moveService.ts
import {
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  PrivateKey,
  PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import { AgentRuntime, LocalSigner, createAptosTools } from "move-agent-kit";
import { ChatAnthropic } from "@langchain/anthropic";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

console.log("[moveService] Module loading started");

// Initialize and cache the Aptos client
let aptosClient: Aptos | null = null;
let account: any = null;
let signer: LocalSigner | null = null;

// Cache for agent instances by userId
const agentCache = new Map();

// Get or initialize the Aptos client
export function getAptosClient() {
  console.log("[getAptosClient] Function called");
  
  if (!aptosClient) {
    console.time('[getAptosClient] Initialization time');
    console.log("[getAptosClient] Creating new Aptos client with MAINNET network");
    
    const aptosConfig = new AptosConfig({
      network: Network.TESTNET,
    });
    aptosClient = new Aptos(aptosConfig);
    
    console.log("[getAptosClient] Aptos client created successfully");
    console.timeEnd('[getAptosClient] Initialization time');
  } else {
    console.log("[getAptosClient] Returning cached Aptos client");
  }
  
  return aptosClient;
}

// Initialize account and signer if not already done
// Replace initializeAccount function in moveService.ts
export async function initializeAccount() {
  console.log("[initializeAccount] Function called");
  console.time('[initializeAccount] Total initialization time');
  
  if (!account) {
    console.log("[initializeAccount] Account not initialized yet, creating new account");
    const aptos = getAptosClient();
    
    // Get private key from environment
    console.log("[initializeAccount] Checking for APTOS_PRIVATE_KEY environment variable");
    const privateKeyStr = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyStr) {
      console.error("[initializeAccount] APTOS_PRIVATE_KEY environment variable is missing");
      throw new Error("Missing APTOS_PRIVATE_KEY environment variable");
    }
    console.log("[initializeAccount] APTOS_PRIVATE_KEY found");

    try {
      // Format the private key according to AIP-80
      console.log("[initializeAccount] Formatting private key to be AIP-80 compliant...");
      console.time('[initializeAccount] Private key formatting time');
      const formattedPrivateKey = PrivateKey.formatPrivateKey(privateKeyStr, PrivateKeyVariants.Ed25519);
      console.timeEnd('[initializeAccount] Private key formatting time');
      console.log("[initializeAccount] Private key formatted successfully");
 
      // Create private key instance
      console.log("[initializeAccount] Creating Ed25519PrivateKey instance");
      console.time('[initializeAccount] Private key instance creation time');
      const privateKey = new Ed25519PrivateKey(formattedPrivateKey);
      console.timeEnd('[initializeAccount] Private key instance creation time');
      console.log("[initializeAccount] Ed25519PrivateKey instance created");
       
      // Derive account
      console.log("[initializeAccount] Deriving account from private key...");
      console.time('[initializeAccount] Account derivation time');
      
      // Add timeout to account derivation
      const derivationPromise = aptos.deriveAccountFromPrivateKey({
        privateKey
      });
      
      // Set a 60-second timeout for account derivation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("[initializeAccount] Account derivation timed out after 60 seconds"));
        }, 60000);
      });
      
      try {
        account = await Promise.race([derivationPromise, timeoutPromise]);
        console.log("[initializeAccount] Account derived successfully");
      } catch (error) {
        console.error("[initializeAccount] Error or timeout during account derivation:", error);
        throw error;
      }
      
      console.timeEnd('[initializeAccount] Account derivation time');
    
      // Create signer
      console.log("[initializeAccount] Creating LocalSigner...");
      console.time('[initializeAccount] Signer creation time');
      signer = new LocalSigner(account, Network.MAINNET);
      console.timeEnd('[initializeAccount] Signer creation time');
      
      console.log("[initializeAccount] Account initialized successfully:", account.accountAddress.toString());
    } catch (error) {
      console.error("[initializeAccount] Error initializing account:", error);
      throw error;
    }
  } else {
    console.log("[initializeAccount] Using cached account and signer");
  }
  
  console.timeEnd('[initializeAccount] Total initialization time');
  return { account, signer };
}

// Get or create an agent for a specific user
// Modified getOrCreateAgent function in moveService.ts
export async function getOrCreateAgent(userId: string) {
  console.log(`[getOrCreateAgent] Function called for userId: ${userId}`);
  console.time(`[getOrCreateAgent] Total time for userId: ${userId}`);
  
  // Check if we already have an agent for this user
  if (agentCache.has(userId)) {
    console.log(`[getOrCreateAgent] Returning cached agent for userId: ${userId}`);
    console.timeEnd(`[getOrCreateAgent] Total time for userId: ${userId}`);
    return agentCache.get(userId);
  }
  
  console.log(`[getOrCreateAgent] Creating new agent for userId: ${userId}`);
  
  // Initialize Anthropic LLM
  console.log("[getOrCreateAgent] Initializing ChatAnthropic LLM");
  console.time('[getOrCreateAgent] LLM initialization time');
  
  // Only initialize the essential components at first to respond quickly
  const llm = new ChatAnthropic({
    modelName: "claude-3-5-sonnet-20241022",
    temperature: 0.7,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.timeEnd('[getOrCreateAgent] LLM initialization time');
  
  // Create a minimal memory saver
  console.log("[getOrCreateAgent] Initializing MemorySaver");
  const memory = new MemorySaver();
  
  // Create agent configuration
  console.log("[getOrCreateAgent] Creating agent configuration");
  const config = { configurable: { thread_id: userId } };
  
  // Create a placeholder agent and cache it immediately
  // This allows us to return something quickly while 
  // the full initialization happens in the background
  const placeholderAgent = {
    agent: {
      stream: async ({ }) => {
        // Return a simple stream that just yields a "initializing" message
        return {
          [Symbol.asyncIterator]: async function* () {
            yield {
              agent: {
                messages: [
                  {
                    content: "I'm initializing my blockchain capabilities. This may take a moment for the first interaction. I'll be ready shortly."
                  }
                ]
              }
            };
          }
        };
      }
    },
    config,
    isPlaceholder: true
  };
  
  // Cache the placeholder immediately
  agentCache.set(userId, placeholderAgent);
  
  // Start initializing the real agent in the background
  console.log(`[getOrCreateAgent] Starting background initialization for userId: ${userId}`);
  
  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      console.time(`[getOrCreateAgent] Background initialization for userId: ${userId}`);
      
      // Initialize account and signer
      console.log("[getOrCreateAgent] Initializing account and signer");
      const { signer } = await initializeAccount();
      
      // Initialize Move Agent
      console.log("[getOrCreateAgent] Creating AgentRuntime");
      console.time('[getOrCreateAgent] AgentRuntime creation time');
      const aptos = getAptosClient();
      const aptosAgent = new AgentRuntime(signer!, aptos, {
        PANORA_API_KEY: process.env.PANORA_API_KEY,
      });
      console.timeEnd('[getOrCreateAgent] AgentRuntime creation time');
      
      // Create tools
      console.log("[getOrCreateAgent] Creating Aptos tools");
      console.time('[getOrCreateAgent] Tools creation time');
      const tools = createAptosTools(aptosAgent);
      console.timeEnd('[getOrCreateAgent] Tools creation time');
      
      // Create React agent
      console.log("[getOrCreateAgent] Creating React agent");
      console.time('[getOrCreateAgent] Agent creation time');
      const realAgent = createReactAgent({
        llm,
        tools,
        checkpointSaver: memory,
        messageModifier: `
        You are Aptos Oracle, a helpful crypto portfolio management assistant that can interact with the Aptos blockchain using the Move Agent Kit.
        You help users manage their crypto assets, check balances, execute transactions, and provide insights on market trends.
        
        You are empowered to interact onchain using your tools. 
        If you ever need funds, you can request them from the testnet faucet. 
        If not, you can provide your wallet details and request funds from the user. 
        
        If there is a 5XX (internal) HTTP error code, ask the user to try again later. 
        If someone asks you to do something you can't do with your currently available tools, you must say so, and encourage them to implement it themselves using the Move Agent Kit, recommend they go to the Aptos documentation for more information about Move development. 
        
        When displaying token amounts, always format them according to the token's decimals.
        
        Be concise and helpful with your responses. Refrain from restating your tools' descriptions unless it is explicitly requested.
        `,
      });
      console.timeEnd('[getOrCreateAgent] Agent creation time');
      
      // Replace the placeholder with the real agent
      agentCache.set(userId, { agent: realAgent, config, isPlaceholder: false });
      console.log(`[getOrCreateAgent] Real agent initialized and cached for userId: ${userId}`);
      
      console.timeEnd(`[getOrCreateAgent] Background initialization for userId: ${userId}`);
    } catch (error) {
      console.error(`[getOrCreateAgent] Error in background initialization for userId: ${userId}:`, error);
      // If initialization fails, we'll keep the placeholder in the cache
      // Next time the user sends a message, it will try again
    }
  }, 0);
  
  console.timeEnd(`[getOrCreateAgent] Total time for userId: ${userId}`);
  return placeholderAgent;
}

// Also need to modify the processMessage function to handle placeholder agents
export async function processMessage(userId: string, message: string) {
  console.log(`[processMessage] Processing message for userId: ${userId}`);
  console.time(`[processMessage] Total processing time for userId: ${userId}`);
  
  const agentData = await getOrCreateAgent(userId);
  
  // If this is a placeholder and we're not initializing yet, start initialization
  if (agentData.isPlaceholder) {
    console.log(`[processMessage] Using placeholder agent for userId: ${userId}`);
  }
  
  // Create a stream of the agent's response
  console.log(`[processMessage] Streaming agent response for userId: ${userId}`);
  console.time(`[processMessage] Agent stream creation time for userId: ${userId}`);
  const stream = await agentData.agent.stream(
    { messages: [new HumanMessage(message)] },
    agentData.config
  );
  console.timeEnd(`[processMessage] Agent stream creation time for userId: ${userId}`);
  
  console.timeEnd(`[processMessage] Total processing time for userId: ${userId}`);
  return stream;
}

// Process a user message through the agent

// Clear cached agent for a user
export function clearAgentCache(userId?: string) {
  if (userId) {
    console.log(`[clearAgentCache] Clearing agent cache for userId: ${userId}`);
    agentCache.delete(userId);
  } else {
    console.log(`[clearAgentCache] Clearing entire agent cache with ${agentCache.size} entries`);
    agentCache.clear();
  }
  console.log(`[clearAgentCache] Current agent cache size: ${agentCache.size}`);
}

console.log("[moveService] Module loading completed");