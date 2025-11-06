import { PositionTracker } from "./position-tracker.js";
import { DashboardServer } from "../dashboard/server.js";
import pinoLogger from "../pinoLogger.js";
import { RISK_PER_TRADE, STOP_LOSS } from "../config.js";

let positionTracker: PositionTracker | null = null;
let dashboardServer: DashboardServer | null = null;

// Mock balance for testing
const MOCK_BALANCE = 50; // $50 USDC for testing

export async function initializeExecution(
  tracker: PositionTracker,
  dashboard: DashboardServer
) {
  positionTracker = tracker;
  dashboardServer = dashboard;
  pinoLogger.info("Mock execution mode - no real positions to sync");
  pinoLogger.info(`Mock balance: $${MOCK_BALANCE} USDC`);
}

export async function placeOrder(
  symbol: string,
  side: "BUY" | "SELL",
  qty: number,
  price?: number
) {
  if (!price) {
    pinoLogger.warn("Mock execution requires price");
    return null;
  }

  // Calculate quantity using risk-based sizing if qty is 0
  if (side === "BUY" && qty === 0) {
    const totalCapital = MOCK_BALANCE;
    const riskPerTrade = RISK_PER_TRADE;
    const entry = price;
    const stopPrice = price * (1 - STOP_LOSS);
    
    // Calculate position size based on risk
    const { calculatePositionSize } = await import("./risk.js");
    const riskQty = calculatePositionSize({
      totalCapital,
      riskPerTrade,
      entry,
      stop: stopPrice,
    });
    
    // Don't exceed available buying power
    const maxQty = (MOCK_BALANCE * 0.99) / price;
    qty = Math.min(riskQty, maxQty);
    
    // Round to reasonable precision
    qty = parseFloat(qty.toFixed(8));
    
    pinoLogger.info(
      { symbol, totalCapital, riskQty, calculatedQty: qty },
      `Mock: Using risk-based sizing: $${totalCapital} capital, risking $${(totalCapital * riskPerTrade).toFixed(2)} → ${qty} ${symbol.split('/')[0]}`
    );
  } else if (side === "SELL" && qty === 0) {
    // For SELL, get current position quantity
    const currentPosition = positionTracker?.getPosition(symbol);
    qty = currentPosition?.quantity || 0;
    
    if (qty === 0) {
      pinoLogger.warn({ symbol }, "Mock: Cannot SELL - no position");
      return null;
    }
  }

  // Mock execution - no real broker API calls
  pinoLogger.info(`MOCK EXEC: ${side} ${qty} ${symbol} @ ${price}`);

  // Record trade in position tracker
  if (positionTracker && price) {
    const trade = positionTracker.recordTrade(symbol, side, qty, price);

    // Send to dashboard
    if (dashboardServer) {
      dashboardServer.recordTrade(trade);
    }
  }

  return { orderId: "MOCK-" + Date.now() };
}
