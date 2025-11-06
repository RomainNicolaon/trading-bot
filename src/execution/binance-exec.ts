import * as ccxt from "ccxt";
import pino from "pino";
import {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_TESTNET,
  RISK_PER_TRADE,
  STOP_LOSS,
} from "../config.js";
import { PositionTracker } from "./position-tracker.js";
import { DashboardServer } from "../dashboard/server.js";
import pinoLogger from "../pinoLogger.js";
import { sendDiscordMessage } from "./discord.js";

const logger = pinoLogger;

let positionTracker: PositionTracker | null = null;
let dashboardServer: DashboardServer | null = null;
let exchange: ccxt.binance | null = null;

/**
 * Initialize Binance execution using CCXT
 * CCXT provides a unified API for multiple exchanges
 */
export async function initializeExecution(
  tracker: PositionTracker,
  dashboard: DashboardServer
) {
  positionTracker = tracker;
  dashboardServer = dashboard;

  const mode = BINANCE_TESTNET ? "TESTNET (FAKE MONEY)" : "LIVE (REAL MONEY)";
  logger.info(`Binance execution initialized - Mode: ${mode}`);

  // Initialize CCXT Binance exchange
  const exchangeOptions: any = {
    apiKey: BINANCE_API_KEY,
    secret: BINANCE_API_SECRET,
    enableRateLimit: true, // Important: respect API rate limits
    options: {
      defaultType: "spot", // Use spot trading (not futures)
    },
  };

  // Set testnet configuration if using testnet
  if (BINANCE_TESTNET) {
    exchangeOptions.options.testnet = true;
    logger.info("Using Binance Testnet");
  } else {
    logger.warn("⚠️  WARNING: Using LIVE Binance - REAL MONEY!");
  }

  exchange = new ccxt.binance(exchangeOptions);

  // Load existing positions from Binance
  try {
    const balance = await getBalance();
    logger.info({ balance }, "Account balance");

    const positions = await getPositions();
    if (positions.length > 0) {
      logger.info(
        { count: positions.length },
        "Found existing positions in Binance account"
      );
      positionTracker.syncPositions(positions);

      // Also sync positions to dashboard
      for (const pos of positions) {
        dashboardServer.updatePrice(pos.symbol, pos.currentPrice);
      }
    } else {
      logger.info("No existing positions found in Binance account");
    }
  } catch (error: any) {
    logger.error(
      { error: error.message },
      "Failed to fetch initial positions/balance"
    );
  }

  // Send initial account info to dashboard
  await updateAccountInfo();

  // Update account info every 30 seconds
  setInterval(async () => {
    await updateAccountInfo();
  }, 30000);
}

/**
 * Fetch and send account info to dashboard
 */
async function updateAccountInfo() {
  if (!dashboardServer || !exchange) return;

  try {
    const balance = await exchange.fetchBalance();
    const usdc = balance.USDC || { free: 0, used: 0, total: 0 };

    dashboardServer.updateAccountInfo({
      buyingPower: Number(usdc.free) || 0,
      cash: Number(usdc.free) || 0,
      dailyChange: 0, // CCXT doesn't provide daily change directly
      dayTradeCount: 0, // No PDT rules for crypto
      equity: Number(usdc.total) || 0,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to fetch account info");
  }
}

/**
 * Place an order on Binance using CCXT
 *
 * @param symbol - Trading pair (e.g., "BTC/USDC")
 * @param side - "BUY" or "SELL"
 * @param qty - Quantity to trade (in base currency, e.g., BTC)
 * @param price - Current price (for logging and validation)
 */
export async function placeOrder(
  symbol: string,
  side: "BUY" | "SELL",
  qty: number,
  price?: number
) {
  if (!exchange) {
    logger.error("Exchange not initialized");
    return null;
  }

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

      // Adjust quantity to not exceed current position
      if (qty > currentQty) {
        logger.warn(
          { symbol, requestedQty: qty, availableQty: currentQty },
          `Adjusted SELL quantity from ${qty} to ${currentQty} (max available)`
        );
        qty = currentQty;
      }

      sendDiscordMessage(`SELL ${qty} ${symbol}`, symbol.split("/")[0]);
    }

    // Check buying power before placing BUY orders
    if (side === "BUY" && price) {
      const balance = await exchange.fetchBalance();
      const usdc = balance.USDC || { free: 0 };
      const buyingPower = Number(usdc.free) || 0;

      // If qty is 0, use risk-based position sizing
      if (qty === 0) {
        // Risk config from .env
        const totalCapital = Number(usdc.free) + Number(usdc.used || 0);
        const riskPerTrade = RISK_PER_TRADE; // e.g., 0.02 = 2%
        const entry = price;
        const stopPrice = price * (1 - STOP_LOSS); // e.g., if price=100 and STOP_LOSS=0.05, stop=95
        
        // Calculate position size based on risk
        // maxLoss = totalCapital * riskPerTrade (e.g., 50€ * 0.02 = 1€)
        // positionSize = maxLoss / stopDistance (e.g., 1€ / 5€ = 0.2 BTC)
        const { calculatePositionSize } = await import("./risk.js");
        let riskQty = calculatePositionSize({
          totalCapital,
          riskPerTrade,
          entry,
          stop: stopPrice,
        });

        // Don't exceed available buying power
        const maxQty = (buyingPower * 0.99) / price;
        let adjustedQty = Math.min(riskQty, maxQty);

        // Get market info to respect minimum order size
        const market = exchange.market(symbol);
        const minQty = market.limits.amount?.min || 0;
        if (adjustedQty < minQty) {
          logger.warn(
            { symbol, buyingPower, minQty },
            `Insufficient buying power: $${buyingPower.toFixed(2)} available. Minimum order: ${minQty}. Skipping trade.`
          );
          return null;
        }
        // Round to appropriate precision
        const precision = market.precision.amount || 8;
        const roundedQty = parseFloat(adjustedQty.toFixed(precision));
        
        // Check if rounded quantity is still valid
        if (roundedQty < minQty || roundedQty === 0) {
          logger.warn(
            { symbol, buyingPower, minQty, roundedQty, riskQty, totalCapital },
            `Risk-based sizing too small: $${totalCapital.toFixed(2)} capital, 2% risk = $${(totalCapital*riskPerTrade).toFixed(2)}, calculated ${roundedQty} ${symbol.split('/')[0]} (min: ${minQty}). Skipping trade.`
          );
          return null;
        }
        
        logger.info(
          { symbol, buyingPower, calculatedQty: roundedQty, riskQty },
          `Using risk-based sizing: $${totalCapital.toFixed(2)} capital, risking $${(totalCapital*riskPerTrade).toFixed(2)} → ${roundedQty} ${symbol.split('/')[0]}`
        );
        qty = roundedQty;
      } else if (qty * price > buyingPower) {
        // Fallback: adjust to fit buying power
        const adjustedQty = (buyingPower * 0.99) / price;
        const market = exchange.market(symbol);
        const minQty = market.limits.amount?.min || 0;
        if (adjustedQty < minQty) {
          logger.warn(
            { symbol, buyingPower, minQty },
            `Insufficient buying power: $${buyingPower.toFixed(2)} available. Minimum order: ${minQty}. Skipping trade.`
          );
          return null;
        }
        const precision = market.precision.amount || 8;
        const roundedQty = parseFloat(adjustedQty.toFixed(precision));
        
        // Check if rounded quantity is still valid
        if (roundedQty < minQty || roundedQty === 0) {
          logger.warn(
            { symbol, buyingPower, minQty, roundedQty, originalQty: qty },
            `Adjusted quantity too small: ${roundedQty} ${symbol.split('/')[0]} (min: ${minQty}). Skipping trade.`
          );
          return null;
        }
        
        logger.warn(
          {
            symbol,
            originalQty: qty,
            adjustedQty: roundedQty,
            buyingPower,
          },
          `Adjusted order quantity from ${qty} to ${roundedQty} to fit buying power`
        );
        qty = roundedQty;
      }
    }

    logger.info({ symbol, side, qty, price }, "📤 Placing order with Binance");

    // Place market order using CCXT
    const order = await exchange.createMarketOrder(
      symbol,
      side.toLowerCase(),
      qty
    );

    logger.info(
      { orderId: order.id, status: order.status, filledQty: order.filled },
      `Order placed: ${side} ${qty} ${symbol}`
    );

    sendDiscordMessage(
      `Order placed: ${side} ${qty} ${symbol}`,
      symbol.split("/")[0]
    );

    // Record trade in position tracker
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
      qty: order.amount,
      side: order.side,
    };
  } catch (error: any) {
    logger.error(
      {
        error: error.message,
        symbol,
        side,
        qty,
      },
      `❌ Failed to place order : ${error.message}`
    );

    // Don't throw - let bot continue running
    return null;
  }
}

/**
 * Get account balance
 */
export async function getBalance() {
  if (!exchange) {
    throw new Error("Exchange not initialized");
  }

  try {
    const balance = await exchange.fetchBalance();
    return balance;
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get balance");
    throw error;
  }
}

/**
 * Get current positions
 * For spot trading, this means checking which coins we have balance for
 */
export async function getPositions() {
  if (!exchange) {
    throw new Error("Exchange not initialized");
  }

  try {
    const balance = await exchange.fetchBalance();
    const positions: any[] = [];

    // Convert balances to position format
    for (const [currency, bal] of Object.entries(balance.total)) {
      if (bal > 0 && currency !== "USDC") {
        // Skip USDC as it's the quote currency
        const symbol = `${currency}/USDC`;

        try {
          // Fetch current price
          const ticker = await exchange.fetchTicker(symbol);

          positions.push({
            symbol,
            qty: bal,
            avg_entry_price: 0, // We don't have historical entry price
            current_price: ticker.last,
            unrealized_pl: 0, // Calculate later if needed
          });
        } catch (err) {
          // Skip if ticker not available
          logger.warn({ currency }, `Could not fetch ticker for ${symbol}`);
        }
      }
    }

    return positions;
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get positions");
    throw error;
  }
}
