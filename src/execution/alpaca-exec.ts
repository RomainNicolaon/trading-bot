import axios from "axios";
import pino from "pino";
import {
  ALPACA_API_KEY,
  ALPACA_API_SECRET,
  EXTENDED_HOURS,
  ALPACA_LIVE,
} from "../config.js";
import { PositionTracker } from "./position-tracker.js";
import { DashboardServer } from "../dashboard/server.js";

const logger = pino({ level: "info" });

let positionTracker: PositionTracker | null = null;
let dashboardServer: DashboardServer | null = null;

// Use paper trading API by default (safe for testing)
const ALPACA_API_URL = ALPACA_LIVE
  ? "https://api.alpaca.markets/v2" // REAL MONEY - BE CAREFUL!
  : "https://paper-api.alpaca.markets/v2"; // Paper trading (fake money)

export async function initializeExecution(
  tracker: PositionTracker,
  dashboard: DashboardServer
) {
  positionTracker = tracker;
  dashboardServer = dashboard;

  const mode = ALPACA_LIVE ? "LIVE (REAL MONEY)" : "PAPER (FAKE MONEY)";
  logger.info(`Alpaca execution mode: ${mode}`);
  logger.info(`API URL: ${ALPACA_API_URL}`);
  logger.info(`Extended hours: ${EXTENDED_HOURS ? "ENABLED" : "DISABLED"}`);

  // Fetch and sync existing positions from Alpaca
  try {
    const positions = await getPositions();
    if (positions.length > 0) {
      logger.info(
        { count: positions.length },
        "Found existing positions in Alpaca account"
      );
      positionTracker.syncPositions(positions);

      // Also sync positions to dashboard
      for (const pos of positions) {
        dashboardServer.updatePrice(
          pos.symbol,
          parseFloat(pos.current_price)
        );
      }
    } else {
      logger.info("No existing positions found in Alpaca account");
    }

    // Log account info
    const account = await getAccount();
    logger.info(
      {
        buyingPower: parseFloat(account.buying_power).toFixed(2),
        cash: parseFloat(account.cash).toFixed(2),
        portfolioValue: parseFloat(account.portfolio_value).toFixed(2),
      },
      "Account status"
    );
  } catch (error: any) {
    logger.error(
      { error: error.message },
      "Failed to fetch initial positions/account info"
    );
  }
}

export async function placeOrder(
  symbol: string,
  side: "BUY" | "SELL",
  qty: number,
  price?: number
) {
  try {
    // Check for short selling (SELL without existing position)
    if (side === "SELL") {
      const currentPosition = positionTracker?.getPosition(symbol);
      const currentQty = currentPosition?.quantity || 0;

      if (currentQty === 0) {
        logger.warn(
          { symbol },
          `Cannot SELL ${symbol} - no existing position (short selling not allowed)`
        );
        return null;
      }

      // PDT Protection: Check if position can be sold today (must hold overnight)
      if (positionTracker && !positionTracker.canSellToday(symbol)) {
        logger.warn(
          { symbol, openedDate: currentPosition?.openedDate },
          `Cannot SELL ${symbol} - position opened today (PDT protection: must hold overnight)`
        );
        return null;
      }

      // Adjust quantity to not exceed current position
      if (qty > currentQty) {
        logger.warn(
          { symbol, requestedQty: qty, availableQty: currentQty },
          `Adjusted SELL quantity from ${qty} to ${currentQty} (max available)`
        );
        qty = currentQty;
      }
    }

    // Check buying power before placing BUY orders
    if (side === "BUY" && price) {
      const account = await getAccount();
      const buyingPower = parseFloat(account.buying_power);
      const estimatedCost = qty * price;

      if (estimatedCost > buyingPower) {
        // Adjust quantity to fit within buying power (with 1% buffer for price fluctuation)
        const adjustedQty = Math.floor((buyingPower * 0.99) / price);
        
        if (adjustedQty < 1) {
          logger.warn(
            { symbol, buyingPower, estimatedCost },
            `Insufficient buying power: $${buyingPower.toFixed(2)} available, $${estimatedCost.toFixed(2)} needed. Skipping trade.`
          );
          return null;
        }

        logger.warn(
          { symbol, originalQty: qty, adjustedQty, buyingPower, estimatedCost },
          `Adjusted order quantity from ${qty} to ${adjustedQty} to fit buying power`
        );
        qty = adjustedQty;
      }
    }

    // Prepare order data
    const orderData = {
      symbol,
      qty,
      side: side.toLowerCase(),
      type: "market", // Market order for immediate execution
      time_in_force: "day", // Order valid for the day
      extended_hours: EXTENDED_HOURS, // Enable after-hours and pre-market trading
    };

    logger.info({ symbol, side, qty, price }, "📤 Placing order with Alpaca");

    // Send order to Alpaca
    const response = await axios.post(`${ALPACA_API_URL}/orders`, orderData, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
        "Content-Type": "application/json",
      },
    });

    const order = response.data;
    logger.info(
      { orderId: order.id, status: order.status, filledQty: order.filled_qty },
      `Order placed: ${side} ${qty} ${symbol}`
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
        qty,
      },
      "Failed to place order"
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
    logger.error(
      { error: error.response?.data || error.message },
      "Failed to get account"
    );
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
    logger.error(
      { error: error.response?.data || error.message },
      "Failed to get positions"
    );
    throw error;
  }
}
