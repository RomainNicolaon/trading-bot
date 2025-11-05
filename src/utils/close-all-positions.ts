import axios from "axios";
import { config } from "dotenv";

// Load environment variables
config();

const ALPACA_API_KEY = process.env.ALPACA_API_KEY || "";
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET || "";
const EXECUTION_MODE = process.env.EXECUTION_MODE || "mock";

// Use paper trading API by default
const ALPACA_API_URL =
  EXECUTION_MODE === "real"
    ? "https://api.alpaca.markets/v2"
    : "https://paper-api.alpaca.markets/v2";

async function closeAllPositions() {
  try {
    console.log("🔍 Fetching all open positions...");

    // Get all positions
    const response = await axios.get(`${ALPACA_API_URL}/positions`, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
      },
    });

    const positions = response.data;

    if (positions.length === 0) {
      console.log("✅ No open positions to close");
      return;
    }

    console.log(`📊 Found ${positions.length} open position(s):`);
    positions.forEach((pos: any) => {
      console.log(
        `   - ${pos.symbol}: ${pos.qty} shares @ $${parseFloat(pos.avg_entry_price).toFixed(2)} (P&L: $${parseFloat(pos.unrealized_pl).toFixed(2)})`
      );
    });

    console.log("\n🔄 Closing all positions...");

    // Close all positions using Alpaca's bulk close endpoint
    const closeResponse = await axios.delete(`${ALPACA_API_URL}/positions`, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
      },
    });

    console.log("✅ All positions closed successfully!");
    console.log(`📋 Close orders:`, closeResponse.data);

    // Wait a moment and verify
    console.log("\n⏳ Waiting 2 seconds to verify...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const verifyResponse = await axios.get(`${ALPACA_API_URL}/positions`, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
      },
    });

    if (verifyResponse.data.length === 0) {
      console.log("✅ Verified: All positions are closed");
    } else {
      console.log(
        `⚠️  Warning: ${verifyResponse.data.length} position(s) still open`
      );
    }
  } catch (error: any) {
    console.error("❌ Error closing positions:");
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message:`, error.response.data);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the script
console.log("🚀 Close All Positions Utility");
console.log(`📍 API URL: ${ALPACA_API_URL}`);
console.log(`🔐 Mode: ${EXECUTION_MODE === "real" ? "LIVE (REAL MONEY)" : "PAPER (FAKE MONEY)"}`);
console.log("---\n");

closeAllPositions()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
