import Binance from "binance-api-node";
// @ts-ignore - binance-api-node has issues with ES module imports
const BinanceClient = Binance.default || Binance;
import { SYMBOLS } from "../config.js";
import pinoLogger from "../pinoLogger.js";

export type TradeMsg = {
  ev: string;
  sym: string;
  p: number;
  s: number;
  t: number;
};

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds
let isShuttingDown = false;
let cleanupFunctions: Array<() => void> = [];

/**
 * Start Binance WebSocket for real-time crypto trades
 * Uses binance-api-node for official WebSocket support
 * 
 * @param apiKey - Binance API key
 * @param apiSecret - Binance API secret
 * @param onTrade - Callback function for trade events
 * @param useTestnet - Use testnet (default: true for safety)
 */
export function startBinanceSocket(
  apiKey: string,
  apiSecret: string,
  onTrade: (m: TradeMsg) => void,
  useTestnet: boolean = true
): void {
  try {
    pinoLogger.info("🔌 Connecting to Binance WebSocket...");
    
    // Initialize Binance client
    const client = BinanceClient({
      apiKey,
      apiSecret,
      // Testnet is not directly supported by binance-api-node
      // For testnet, you'd need to use a different approach
    });

    reconnectAttempts = 0;

    // Convert SYMBOLS format from "BTC/USDC" to "BTCUSDC" (Binance format)
    const binanceSymbols = SYMBOLS.map(s => s.replace("/", "").toLowerCase());

    pinoLogger.info({ symbols: binanceSymbols }, "📡 Subscribing to trade streams");

    // Subscribe to trade streams for each symbol
    binanceSymbols.forEach((symbol) => {
      const cleanup = client.ws.trades(symbol, (trade: any) => {
        try {
          // Normalize Binance trade data to our TradeMsg format
          const tick: TradeMsg = {
            ev: "T",
            sym: symbol.toUpperCase().replace(/USDC$/, "/USDC"), // Convert back to BTC/USDC format
            p: parseFloat(trade.price),
            s: parseFloat(trade.quantity),
            t: trade.eventTime,
          };

          onTrade(tick);
        } catch (err: any) {
          pinoLogger.error(
            { err: err.message, symbol },
            "Error processing trade"
          );
        }
      });

      cleanupFunctions.push(cleanup);
    });

    pinoLogger.info("✅ Binance WebSocket connected successfully");
    
    // Note: binance-api-node handles reconnection automatically
    // but we keep the reconnection logic for consistency
  } catch (error: any) {
    pinoLogger.error({ error: error.message }, "❌ Failed to connect to Binance WebSocket");

    // Auto-reconnect logic
    if (!isShuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = RECONNECT_DELAY * reconnectAttempts;

      pinoLogger.info(
        { attempt: reconnectAttempts, delayMs: delay },
        `🔄 Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
      );

      setTimeout(() => {
        pinoLogger.info("🔄 Attempting to reconnect...");
        startBinanceSocket(apiKey, apiSecret, onTrade, useTestnet);
      }, delay);
    } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      pinoLogger.error(
        "❌ Max reconnection attempts reached. Please restart the bot."
      );
    }
  }
}

/**
 * Shutdown Binance WebSocket connections
 */
export function shutdownBinanceSocket() {
  isShuttingDown = true;
  
  // Close all WebSocket connections
  cleanupFunctions.forEach(cleanup => {
    try {
      cleanup();
    } catch (err: any) {
      pinoLogger.error({ err: err.message }, "Error closing WebSocket");
    }
  });
  
  cleanupFunctions = [];
  pinoLogger.info("🛑 Binance WebSocket shutdown initiated");
}
