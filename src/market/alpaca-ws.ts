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

// Alpaca provides FREE WebSocket access for market data
// Get free API keys at: https://alpaca.markets/
export function startAlpacaSocket(
  apiKey: string,
  apiSecret: string,
  onTrade: (m: TradeMsg) => void
) {
  const url = `wss://stream.data.alpaca.markets/v2/iex`; // Free IEX data
  const ws = new WebSocket(url);

  ws.on("open", () => {
    pinoLogger.info("Alpaca WebSocket opened, authenticating...");

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
        // Debug logging disabled in production

        // Authentication response
        if (m.T === "success" && m.msg === "authenticated") {
          pinoLogger.info("Alpaca authentication successful");

          // Subscribe to trades
          ws.send(
            JSON.stringify({
              action: "subscribe",
              trades: SYMBOLS,
            })
          );
          pinoLogger.info("Subscribed to symbols", { symbols: SYMBOLS });
        }

        // Subscription confirmation
        else if (m.T === "subscription") {
          pinoLogger.info("Subscription confirmed", { subscriptions: m });
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
          // Trade logging reduced in production
          onTrade(tick);
        }

        // Error messages
        else if (m.T === "error") {
          pinoLogger.error("Alpaca error", { error: m });
        }
      });
    } catch (err) {
      pinoLogger.error("Parse error", { err });
    }
  });

  ws.on("error", (e) => {
    pinoLogger.error("WebSocket error", { error: e.message });
  });

  ws.on("close", (code, reason) => {
    pinoLogger.warn(`🔌 WebSocket closed - Code: ${code}`, {
      code,
      reason: reason.toString(),
    });

    if (code === 1008) {
      pinoLogger.error(
        "Authentication failed - check your Alpaca API credentials"
      );
    }
  });

  return ws;
}
