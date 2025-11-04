import { PositionTracker } from "./position-tracker.js";
import { DashboardServer } from "../dashboard/server.js";

let positionTracker: PositionTracker | null = null;
let dashboardServer: DashboardServer | null = null;

export function initializeExecution(tracker: PositionTracker, dashboard: DashboardServer) {
  positionTracker = tracker;
  dashboardServer = dashboard;
}

export async function placeOrder(
  symbol: string,
  side: "BUY" | "SELL",
  qty: number,
  price?: number
) {
  // ici tu appellerais l'API broker (Interactive Brokers / Alpaca / FIX)
  console.log(`[MOCK EXEC] ${side} ${qty} ${symbol} @ ${price || "MKT"}`);
  
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
