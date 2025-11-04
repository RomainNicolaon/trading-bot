import axios from "axios";
import { ALPACA_API_KEY, ALPACA_API_SECRET, EXTENDED_HOURS } from "../config.js";
import { PositionTracker } from "./position-tracker.js";
import { DashboardServer } from "../dashboard/server.js";
import pino from "pino";

const logger = pino({ level: "info" });

let positionTracker: PositionTracker | null = null;
let dashboardServer: DashboardServer | null = null;

// Use paper trading API by default (safe for testing)
const ALPACA_API_URL = process.env.ALPACA_LIVE === "true" 
  ? "https://api.alpaca.markets/v2"  // REAL MONEY - BE CAREFUL!
  : "https://paper-api.alpaca.markets/v2";  // Paper trading (fake money)

export function initializeExecution(tracker: PositionTracker, dashboard: DashboardServer) {
  positionTracker = tracker;
  dashboardServer = dashboard;
  
  const mode = process.env.ALPACA_LIVE === "true" ? "LIVE (REAL MONEY)" : "PAPER (FAKE MONEY)";
  logger.info(`💰 Alpaca execution mode: ${mode}`);
  logger.info(`🔗 API URL: ${ALPACA_API_URL}`);
  logger.info(`⏰ Extended hours: ${EXTENDED_HOURS ? "ENABLED" : "DISABLED"}`);
}

export async function placeOrder(
  symbol: string,
  side: "BUY" | "SELL",
  qty: number,
  price?: number
) {
  try {
    // Prepare order data
    const orderData = {
      symbol,
      qty,
      side: side.toLowerCase(),
      type: "market",  // Market order for immediate execution
      time_in_force: "day",  // Order valid for the day
      extended_hours: EXTENDED_HOURS,  // Enable after-hours and pre-market trading
    };

    logger.info({ symbol, side, qty, price }, "📤 Placing order with Alpaca");

    // Send order to Alpaca
    const response = await axios.post(
      `${ALPACA_API_URL}/orders`,
      orderData,
      {
        headers: {
          "APCA-API-KEY-ID": ALPACA_API_KEY,
          "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
          "Content-Type": "application/json",
        },
      }
    );

    const order = response.data;
    logger.info(
      { orderId: order.id, status: order.status, filledQty: order.filled_qty },
      `✅ Order placed: ${side} ${qty} ${symbol}`
    );

    // Record trade in position tracker (use filled price if available)
    if (positionTracker && price) {
      const trade = positionTracker.recordTrade(symbol, side, qty, price);
      
      // Send to dashboard
      if (dashboardServer) {
        dashboardServer.recordTrade(trade);
      }
    }

    return { 
      orderId: order.id,
      status: order.status,
      symbol: order.symbol,
      qty: order.qty,
      side: order.side,
    };

  } catch (error: any) {
    logger.error(
      { 
        error: error.response?.data || error.message,
        symbol,
        side,
        qty 
      },
      "❌ Failed to place order"
    );
    throw error;
  }
}

// Get account information
export async function getAccount() {
  try {
    const response = await axios.get(`${ALPACA_API_URL}/account`, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
      },
    });
    return response.data;
  } catch (error: any) {
    logger.error({ error: error.response?.data || error.message }, "❌ Failed to get account");
    throw error;
  }
}

// Get current positions
export async function getPositions() {
  try {
    const response = await axios.get(`${ALPACA_API_URL}/positions`, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
      },
    });
    return response.data;
  } catch (error: any) {
    logger.error({ error: error.response?.data || error.message }, "❌ Failed to get positions");
    throw error;
  }
}
