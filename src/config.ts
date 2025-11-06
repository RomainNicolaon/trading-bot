import { config } from "dotenv";
import pinoLogger from "./pinoLogger.js";

// Load .env file if it exists
config();

// Execution mode: "mock" for simulation, "real" for actual trading
export const EXECUTION_MODE = process.env.EXECUTION_MODE || "mock";

// Binance configuration (FREE WebSocket access for crypto)
export const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "";
export const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || "";

// Use Binance Testnet for paper trading (default), or real trading
export const BINANCE_TESTNET = process.env.BINANCE_TESTNET !== "false"; // Default to testnet for safety

// Trading symbols (crypto pairs on Binance)
// Format: BTC/USDC, ETH/USDC, etc.
export const SYMBOLS = (process.env.SYMBOLS || "BTC/USDC,ETH/USDC").split(",");

// Maximum trade value (in USDC for crypto)
export const MAX_TRADE_VALUE = Number(process.env.MAX_TRADE_VALUE) || 50;

// Discord webhook URL
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

// Validate Binance configuration
if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
  pinoLogger.error("ERROR: Binance credentials not set");
  pinoLogger.error("   Get FREE API keys at: https://www.binance.com/");
  pinoLogger.error(
    "   Set BINANCE_API_KEY and BINANCE_API_SECRET in .env file"
  );
  pinoLogger.error(
    "   For testnet: https://testnet.binance.vision/"
  );
  process.exit(1);
}

const mode = BINANCE_TESTNET ? "TESTNET (FAKE MONEY)" : "LIVE (REAL MONEY)";
pinoLogger.info(`Binance mode: ${mode}`);

if (!BINANCE_TESTNET) {
  pinoLogger.warn("⚠️  WARNING: BINANCE_TESTNET=false - USING REAL MONEY!");
  pinoLogger.warn("⚠️  Set BINANCE_TESTNET=true in .env for paper trading");
}
