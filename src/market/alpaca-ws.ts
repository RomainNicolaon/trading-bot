import WebSocket from "ws";
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
let reconnectTimeout: NodeJS.Timeout | null = null;
let isShuttingDown = false;

// Alpaca provides FREE WebSocket access for market data
// Get free API keys at: https://alpaca.markets/
export function startAlpacaSocket(
  apiKey: string,
  apiSecret: string,
  onTrade: (m: TradeMsg) => void
): WebSocket {
  const url = `wss://stream.data.alpaca.markets/v2/iex`; // Free IEX data
  const ws = new WebSocket(url);

  ws.on("open", () => {
    pinoLogger.info("✅ Alpaca WebSocket connected, authenticating...");
    reconnectAttempts = 0; // Reset on successful connection

    // Authenticate
    ws.send(
      JSON.stringify({
        action: "auth",
        key: apiKey,
        secret: apiSecret,
      })
    );
  });

  ws.on("message", (data) => {
    try {
      const msgs = JSON.parse(data.toString());

      // Handle array of messages
      const messageArray = Array.isArray(msgs) ? msgs : [msgs];

      messageArray.forEach((m: any) => {
        // Authentication response
        if (m.T === "success" && m.msg === "authenticated") {
          pinoLogger.info("✅ Alpaca authentication successful");

          // Subscribe to trades
          ws.send(
            JSON.stringify({
              action: "subscribe",
              trades: SYMBOLS,
            })
          );
          pinoLogger.info({ symbols: SYMBOLS }, "📡 Subscribed to symbols");
        }

        // Subscription confirmation
        else if (m.T === "subscription") {
          pinoLogger.info({ subscriptions: m }, "✅ Subscription confirmed");
        }

        // Trade data
        else if (m.T === "t") {
          const tick: TradeMsg = {
            ev: "T",
            sym: m.S, // Symbol
            p: m.p, // Price
            s: m.s, // Size
            t: m.t, // Timestamp (nanoseconds)
          };
          
          // Wrap onTrade in try-catch to prevent crashes
          try {
            onTrade(tick);
          } catch (err: any) {
            pinoLogger.error({ err: err.message, symbol: tick.sym }, "Error processing trade");
          }
        }

        // Error messages
        else if (m.T === "error") {
          pinoLogger.error({ error: m }, "❌ Alpaca error");
        }
      });
    } catch (err: any) {
      pinoLogger.error({ err: err.message }, "❌ Parse error");
    }
  });

  ws.on("error", (e) => {
    pinoLogger.error({ error: e.message }, "❌ WebSocket error");
  });

  ws.on("close", (code, reason) => {
    pinoLogger.warn(
      { code, reason: reason.toString() },
      `🔌 WebSocket closed - Code: ${code}`
    );

    if (code === 1008) {
      pinoLogger.error(
        "❌ Authentication failed - check your Alpaca API credentials"
      );
      return; // Don't reconnect on auth failure
    }

    // Auto-reconnect logic (unless shutting down)
    if (!isShuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = RECONNECT_DELAY * reconnectAttempts; // Exponential backoff
      
      pinoLogger.info(
        { attempt: reconnectAttempts, delayMs: delay },
        `🔄 Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
      );

      reconnectTimeout = setTimeout(() => {
        pinoLogger.info("🔄 Attempting to reconnect...");
        startAlpacaSocket(apiKey, apiSecret, onTrade);
      }, delay);
    } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      pinoLogger.error(
        "❌ Max reconnection attempts reached. Please restart the bot."
      );
    }
  });

  return ws;
}

// Call this on graceful shutdown
export function shutdownAlpacaSocket() {
  isShuttingDown = true;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  pinoLogger.info("🛑 Alpaca WebSocket shutdown initiated");
}
