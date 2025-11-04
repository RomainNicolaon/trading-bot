import WebSocket from "ws";
import { POLYGON_API_KEY, SYMBOLS } from "../config.js";
import pinoLogger from "../pinoLogger.js";

export type TradeMsg = {
  ev: string;
  sym: string;
  p: number;
  s: number;
  t: number;
};

export function startPolygonSocket(onTrade: (m: TradeMsg) => void) {
  const url = `wss://socket.polygon.io/stocks`;
  const ws = new WebSocket(url);
  ws.on("open", () => {
    pinoLogger.info("ws open, authenticating");
    ws.send(JSON.stringify({ action: "auth", params: POLYGON_API_KEY }));
    // subscribe trades for symbols
    ws.send(
      JSON.stringify({
        action: "subscribe",
        params: SYMBOLS.map((s) => `T.${s}`).join(","),
      })
    );
  });
  ws.on("message", (data) => {
    try {
      const msgs = JSON.parse(data.toString());
      if (!Array.isArray(msgs)) return;
      msgs.forEach((m: any) => {
        // Log all message types for debugging
        pinoLogger.info(
          {
            event: m.ev,
            status: m.status,
            message: m.message,
          },
          "ws message"
        );

        if (m.ev === "status") {
          // Handle status messages (auth success/fail, subscription status)
          if (m.status === "auth_success") {
            pinoLogger.info("Authentication successful");
          } else if (m.status === "auth_failed") {
            pinoLogger.error("Authentication failed - check your API key");
          } else if (m.status === "success") {
            pinoLogger.info({ message: m.message }, "Subscription successful");
          }
        } else if (m.ev === "T") {
          // Trade event
          const tick: TradeMsg = {
            ev: m.ev,
            sym: m.sym,
            p: m.p,
            s: m.s,
            t: m.t,
          };
          onTrade(tick);
        }
      });
    } catch (err) {
      pinoLogger.error({ err }, "parse err");
    }
  });
  ws.on("error", (e) => pinoLogger.error({ error: e.message }, "ws error"));
  ws.on("close", (code, reason) => {
    pinoLogger.info(
      { code, reason: reason.toString() },
      `ws closed - Code: ${code}, Reason: ${reason || "No reason provided"}`
    );
    if (code === 1008) {
      pinoLogger.error(
        { code, reason: reason.toString() },
        "Connection closed due to policy violation (likely auth failure)"
      );
    }
  });
  return ws;
}
