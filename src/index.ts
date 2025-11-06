import { startBinanceSocket } from "./market/binance-ws.js";
import { SimpleSMA } from "./engine/sma-strategy.js";
import { PositionTracker } from "./execution/position-tracker.js";
import { DashboardServer } from "./dashboard/server.js";
import {
  SYMBOLS,
  EXECUTION_MODE,
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_TESTNET,
  MAX_TRADE_VALUE,
} from "./config.js";
import pinoLogger from "./pinoLogger.js";

// Print startup info first
pinoLogger.info("🚀 Crypto Trading Bot Starting...");
pinoLogger.info({ symbols: SYMBOLS }, "Trading Pairs:");
pinoLogger.info("Strategy: SMA(5,20) Crossover");
pinoLogger.info("Data Provider: Binance");
pinoLogger.info(
  { executionMode: EXECUTION_MODE.toUpperCase() },
  "Execution Mode:"
);
pinoLogger.info("Dashboard: http://localhost:3000");
pinoLogger.info("---");

// Import the right execution module based on mode
let placeOrder: any;
let initializeExecution: any;

if (EXECUTION_MODE === "real") {
  const realExec = await import("./execution/binance-exec.js");
  placeOrder = realExec.placeOrder;
  initializeExecution = realExec.initializeExecution;
} else {
  const mockExec = await import("./execution/mock-exec.js");
  placeOrder = mockExec.placeOrder;
  initializeExecution = mockExec.initializeExecution;
}

// Initialize dashboard server
const dashboardServer = new DashboardServer(3000);
dashboardServer.start();

// Connect logger to dashboard for live log streaming
pinoLogger.setDashboard(dashboardServer);

// Initialize position tracker
const positionTracker = new PositionTracker();

// Initialize execution system with tracker and dashboard (load existing positions)
await initializeExecution(positionTracker, dashboardServer);

const smaMap = new Map<string, SimpleSMA>();
SYMBOLS.forEach((s) => smaMap.set(s, new SimpleSMA(5, 20)));

// Callback function for processing trades
const onTrade = (tick: any) => {
  const s = smaMap.get(tick.sym);
  if (!s) return;

  // Update price for P&L calculation
  positionTracker.updatePrice(tick.sym, tick.p);
  dashboardServer.updatePrice(tick.sym, tick.p);

  // Feed price to strategy
  s.pushPrice(tick.p);
  const sig = s.checkSignal();

  if (sig) {
    // Calculate quantity to keep trade value under max USDT
    const maxTradeValue = Number(MAX_TRADE_VALUE);
    const maxQty = maxTradeValue / tick.p;

    // For crypto, we can trade fractional amounts
    // Round to 8 decimal places (standard for crypto)
    const roundedQty = parseFloat(maxQty.toFixed(8));

    // Skip trade if quantity is too small
    if (roundedQty <= 0) {
      pinoLogger.warn(
        `Skipping ${sig} ${tick.sym} - calculated quantity too small`
      );
      return;
    }

    const side = sig === "LONG" ? "BUY" : "SELL";
    placeOrder(tick.sym, side, roundedQty, tick.p);
  }
};

// Start Binance WebSocket
startBinanceSocket(BINANCE_API_KEY, BINANCE_API_SECRET, onTrade, BINANCE_TESTNET);
pinoLogger.info("✅ Binance WebSocket initialized");

// Log stats every 60 seconds
const statsInterval = setInterval(() => {
  const stats = positionTracker.getStats();
  pinoLogger.info("----------Trading Stats----------");
  pinoLogger.info(`Total Trades: ${stats.totalTrades}`);
  pinoLogger.info(
    `Win Rate: ${stats.winRate.toFixed(1)}% (${stats.wins}W/${stats.losses}L)`
  );
  pinoLogger.info(`Total P&L: $${stats.totalPnl.toFixed(2)}`);
  pinoLogger.info(`Active Positions: ${stats.activePositions}`);
  pinoLogger.info("----------End of Stats----------");
}, 60000);

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  pinoLogger.info(`\n🛑 Received ${signal}, shutting down gracefully...`);

  // Stop accepting new trades
  clearInterval(statsInterval);

  // Log final stats
  const finalStats = positionTracker.getStats();
  pinoLogger.info("----------Final Stats----------");
  pinoLogger.info(`Total Trades: ${finalStats.totalTrades}`);
  pinoLogger.info(
    `Win Rate: ${finalStats.winRate.toFixed(1)}% (${finalStats.wins}W/${finalStats.losses}L)`
  );
  pinoLogger.info(`Total P&L: $${finalStats.totalPnl.toFixed(2)}`);
  pinoLogger.info(`Active Positions: ${finalStats.activePositions}`);
  pinoLogger.info("----------End of Stats----------");
  pinoLogger.info("✅ Bot stopped successfully");

  process.exit(0);
}

// Handle shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C
process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // Kill command

// Handle uncaught errors to prevent crashes
process.on("uncaughtException", (err) => {
  pinoLogger.error({ err: err.message, stack: err.stack }, "❌ Uncaught Exception");
  pinoLogger.error("Bot will continue running, but please investigate this error");
});

process.on("unhandledRejection", (reason, promise) => {
  pinoLogger.error(
    { reason, promise },
    "❌ Unhandled Promise Rejection"
  );
  pinoLogger.error("Bot will continue running, but please investigate this error");
});
