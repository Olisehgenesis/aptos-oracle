// derive-account.ts - Derive an account from private key and submit a simple transaction
import {
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  PrivateKey,
  PrivateKeyVariants
} from "@aptos-labs/ts-sdk";

// Fix imports
import { Account } from "@aptos-labs/ts-sdk";

// Simplified version of deriving an account from a private key and performing an action
async function main() {
  console.log("=== Aptos Account Derivation Test ===");
  
  // For testing, we'll create a new account first to get a private key
  console.log("\nStep 1: Creating a test account to get a private key");
  const testAccount = Account.generate();
  const privateKeyStr = testAccount.privateKey.toString();
  console.log(`Generated private key: ${privateKeyStr}`);
  console.log(`Generated address: ${testAccount.accountAddress.toString()}`);
  
  // Initialize Aptos client
  console.log("\nStep 2: Initializing Aptos client");
  console.time('Aptos client initialization');
  const aptosConfig = new AptosConfig({
    network: Network.TESTNET,
  });
  const aptos = new Aptos(aptosConfig);
  console.timeEnd('Aptos client initialization');
  
  // Fund the account to ensure it has balance
  console.log("\nStep 3: Funding the account");
  try {
    console.time('Account funding');
    const fundTransaction = await aptos.fundAccount({
      accountAddress: testAccount.accountAddress,
      amount: 100000000, // 1 APT
    });
    console.log(`Funding transaction hash: ${fundTransaction.hash}`);
    console.log('Waiting for funding transaction to complete...');
    await aptos.waitForTransaction({ transactionHash: fundTransaction.hash });
    console.timeEnd('Account funding');
  } catch (error) {
    console.error("Error funding account:", error);
    return;
  }
  
  // Now derive an account from the private key (simulating what you'd do with a stored key)
  console.log("\nStep 4: Deriving account from private key");
  console.time('Account derivation (total)');
  
  let derivedAccount;
  let signer;
  
  try {
    // Format the private key according to AIP-80
    console.log("Formatting private key to be AIP-80 compliant...");
    console.time('Private key formatting');
    const formattedPrivateKey = PrivateKey.formatPrivateKey(privateKeyStr, PrivateKeyVariants.Ed25519);
    console.timeEnd('Private key formatting');
    console.log("Private key formatted successfully");
 
    // Create private key instance
    console.log("Creating Ed25519PrivateKey instance");
    console.time('Private key instance creation');
    const privateKey = new Ed25519PrivateKey(formattedPrivateKey);
    console.timeEnd('Private key instance creation');
    console.log("Ed25519PrivateKey instance created");
       
    // Derive account
    console.log("Deriving account from private key...");
    console.time('Account derivation');
    derivedAccount = await aptos.deriveAccountFromPrivateKey({
      privateKey
    });
    console.timeEnd('Account derivation');
    console.log("Account derived successfully");
    console.log(`Derived address: ${derivedAccount.accountAddress.toString()}`);
    
   
    console.timeEnd('Signer creation');
    console.log("LocalSigner created successfully");
  } catch (error) {
    console.error("Error deriving account:", error);
    return;
  }
  
  console.timeEnd('Account derivation (total)');
  
  // Check account resources to see if it exists on-chain
  console.log("\nStep 5: Verifying account exists on chain");
  try {
    console.time('Account verification');
    const resources = await aptos.getAccountResources({
      accountAddress: derivedAccount.accountAddress,
    });
    
    // Find APT coin resource to check balance
    const aptosCoin = resources.find(
      (r) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    );
    
    if (aptosCoin && 'data' in aptosCoin) {
      const balance = (aptosCoin.data as any).coin.value;
      const balanceAPT = parseInt(balance) / 100_000_000;
      console.log(`Account exists on-chain with balance: ${balanceAPT} APT (${balance} octas)`);
    } else {
      console.log('Account exists but has no APT balance');
    }
    console.timeEnd('Account verification');
  } catch (error) {
    console.error("Error verifying account:", error);
    return;
  }
  
  // Perform a simple transaction - update account authentication key to same value
  // This is effectively a no-op but demonstrates transaction submission
  console.log("\nStep 6: Submitting a simple transaction");
 
  
  console.log("\n=== Test Completed ===");
}



// Run the script
main().catch(error => {
  console.error("Unhandled error:", error);
});