import { config } from "dotenv";
import pinoLogger from "./pinoLogger.js";

// Load .env file if it exists
config();

// Data provider configuration
export const DATA_PROVIDER = (
  process.env.DATA_PROVIDER || "alpaca"
).toLowerCase();

// Polygon configuration (Paid - requires WebSocket plan)
export const POLYGON_API_KEY = process.env.POLYGON_API_KEY || "";

// Execution mode: "mock" for simulation, "real" for actual trading
export const EXECUTION_MODE = process.env.EXECUTION_MODE || "mock";

// Alpaca configuration (FREE WebSocket access)
export const ALPACA_API_KEY = process.env.ALPACA_API_KEY || "";
export const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET || "";

// Alpaca live trading
export const ALPACA_LIVE = EXECUTION_MODE === "real";

// Trading symbols
export const SYMBOLS = (process.env.SYMBOLS || "AAPL,TSLA").split(",");

// Extended hours trading (pre-market and after-hours)
export const EXTENDED_HOURS = process.env.EXTENDED_HOURS === "true";

// Maximum trade value (in euros)
export const MAX_TRADE_VALUE = process.env.MAX_TRADE_VALUE || 50;

// Validate configuration based on provider
if (DATA_PROVIDER === "polygon") {
  if (!POLYGON_API_KEY) {
    pinoLogger.error("ERROR: POLYGON_API_KEY is not set");
    pinoLogger.error("   Set it in .env file or use Alpaca instead (free)");
    process.exit(1);
  }
  pinoLogger.warn(
    "NOTE: Polygon free tier does NOT include WebSocket access"
  );
  pinoLogger.warn("   You need a paid plan ($29/month) for real-time data");
  pinoLogger.warn(
    "   Or switch to Alpaca (free): Set DATA_PROVIDER=alpaca in .env"
  );
} else if (DATA_PROVIDER === "alpaca") {
  if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
    pinoLogger.error("ERROR: Alpaca credentials not set");
    pinoLogger.error("   Get FREE API keys at: https://alpaca.markets/");
    pinoLogger.error(
      "   Set ALPACA_API_KEY and ALPACA_API_SECRET in .env file"
    );
    process.exit(1);
  }
}
