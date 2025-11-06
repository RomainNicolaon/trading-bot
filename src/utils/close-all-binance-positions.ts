import * as ccxt from "ccxt";
import { config } from "dotenv";

// Load environment variables
config();

const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "";
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || "";
const BINANCE_TESTNET = process.env.BINANCE_TESTNET !== "false";

async function closeAllBinancePositions() {
  try {
    console.log("🔍 Initializing Binance connection...");

    // Initialize CCXT Binance exchange
    const exchangeOptions: any = {
      apiKey: BINANCE_API_KEY,
      secret: BINANCE_API_SECRET,
      enableRateLimit: true,
      options: {
        defaultType: "spot",
      },
    };

    // Set testnet configuration if using testnet
    if (BINANCE_TESTNET) {
      exchangeOptions.options.testnet = true;
      console.log("✅ Using Binance Testnet");
    } else {
      console.log("⚠️  WARNING: Using LIVE Binance - REAL MONEY!");
    }

    const exchange = new ccxt.binance(exchangeOptions);

    console.log("🔍 Fetching account balance...");

    // Get balance
    const balance = await exchange.fetchBalance();
    const positions: any[] = [];

    // Find all non-zero balances (excluding USDC)
    for (const [currency, bal] of Object.entries(balance.total)) {
      const amount = bal as number;
      if (amount > 0 && currency !== "USDC") {
        positions.push({
          currency,
          amount,
          symbol: `${currency}/USDC`,
        });
      }
    }

    if (positions.length === 0) {
      console.log("✅ No open positions to close");
      return;
    }

    console.log(`📊 Found ${positions.length} open position(s):`);
    
    // Fetch current prices for each position
    for (const pos of positions) {
      try {
        const ticker = await exchange.fetchTicker(pos.symbol);
        const price = Number(ticker.last) || 0;
        const value = pos.amount * price;
        console.log(
          `   - ${pos.symbol}: ${pos.amount} ${pos.currency} @ $${price.toFixed(2)} (≈ $${value.toFixed(2)} USDC)`
        );
      } catch (err) {
        console.log(`   - ${pos.symbol}: ${pos.amount} ${pos.currency} (price unavailable)`);
      }
    }

    console.log("\n🔄 Closing all positions...");

    // Close each position by selling to USDC
    const results: any[] = [];
    for (const pos of positions) {
      try {
        console.log(`   Selling ${pos.amount} ${pos.currency}...`);
        
        const order = await exchange.createMarketOrder(
          pos.symbol,
          "sell",
          pos.amount
        );

        results.push({
          symbol: pos.symbol,
          status: "success",
          orderId: order.id,
        });

        console.log(`   ✅ ${pos.symbol} closed (Order ID: ${order.id})`);
      } catch (error: any) {
        results.push({
          symbol: pos.symbol,
          status: "failed",
          error: error.message,
        });
        console.error(`   ❌ Failed to close ${pos.symbol}: ${error.message}`);
      }
    }

    console.log("\n✅ Position closing complete!");
    console.log(`📋 Results:`);
    console.log(`   Success: ${results.filter(r => r.status === "success").length}`);
    console.log(`   Failed: ${results.filter(r => r.status === "failed").length}`);

    // Wait a moment and verify
    console.log("\n⏳ Waiting 2 seconds to verify...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const verifyBalance = await exchange.fetchBalance();
    const remainingPositions: string[] = [];

    for (const [currency, bal] of Object.entries(verifyBalance.total)) {
      const amount = bal as number;
      if (amount > 0 && currency !== "USDC") {
        remainingPositions.push(`${currency}: ${amount}`);
      }
    }

    if (remainingPositions.length === 0) {
      console.log("✅ Verified: All positions are closed");
    } else {
      console.log(
        `⚠️  Warning: ${remainingPositions.length} position(s) still open:`
      );
      remainingPositions.forEach(pos => console.log(`   - ${pos}`));
    }
  } catch (error: any) {
    console.error("❌ Error closing positions:");
    if (error.message) {
      console.error(`   ${error.message}`);
    } else {
      console.error(`   ${error}`);
    }
    process.exit(1);
  }
}

// Run the script
closeAllBinancePositions()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error.message);
    process.exit(1);
  });
