import WebSocket from "ws";
import { POLYGON_API_KEY, SYMBOLS } from "../config.js";
import pino from "pino";
const logger = pino({ level: "info" });

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
    logger.info("ws open, authenticating");
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
        logger.info({ event: m.ev, status: m.status, message: m.message }, "ws message");
        
        if (m.ev === "status") {
          // Handle status messages (auth success/fail, subscription status)
          if (m.status === "auth_success") {
            logger.info("✅ Authentication successful");
          } else if (m.status === "auth_failed") {
            logger.error("❌ Authentication failed - check your API key");
          } else if (m.status === "success") {
            logger.info({ message: m.message }, "Subscription successful");
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
      logger.error({ err }, "parse err");
    }
  });
  ws.on("error", (e) => logger.error({ error: e.message }, "ws error"));
  ws.on("close", (code, reason) => {
    logger.info(
      { code, reason: reason.toString() },
      `ws closed - Code: ${code}, Reason: ${reason || "No reason provided"}`
    );
    if (code === 1008) {
      logger.error("❌ Connection closed due to policy violation (likely auth failure)");
    }
  });
  return ws;
}
