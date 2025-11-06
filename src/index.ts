import { startBinanceSocket } from "./market/binance-ws.js";
import { RsiEmaStrategy } from "./engine/rsi-ema-strategy.js";
import { PositionTracker } from "./execution/position-tracker.js";
import { DashboardServer } from "./dashboard/server.js";
import {
  SYMBOLS,
  EXECUTION_MODE,
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_TESTNET,
} from "./config.js";
import pinoLogger from "./pinoLogger.js";

// Print startup info first
pinoLogger.info("🚀 Crypto Trading Bot Starting...");
pinoLogger.info({ symbols: SYMBOLS }, "Trading Pairs:");
pinoLogger.info("Strategy: RSI(14) + EMA(9,21)");
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

const strategyMap = new Map<string, RsiEmaStrategy>();
SYMBOLS.forEach((s) => strategyMap.set(s, new RsiEmaStrategy()));

// Callback function for processing trades
const onTrade = (tick: any) => {
  const strategy = strategyMap.get(tick.sym);
  if (!strategy) return;

  // Update price for P&L calculation
  positionTracker.updatePrice(tick.sym, tick.p);
  dashboardServer.updatePrice(tick.sym, tick.p);

  // Feed price to strategy
  strategy.pushPrice(tick.p);
  const sig = strategy.checkSignal();

  if (sig) {
    // Log indicator values for debugging
    const indicators = strategy.getIndicators();
    pinoLogger.info(
      { symbol: tick.sym, signal: sig, ...indicators },
      `📊 Signal: ${sig} | EMA9: ${indicators.ema9?.toFixed(2)} | EMA21: ${indicators.ema21?.toFixed(2)} | RSI: ${indicators.rsi?.toFixed(2)}`
    );

    // Use risk-based position sizing - quantity will be calculated in placeOrder
    const side = sig === "LONG" ? "BUY" : "SELL";
    
    // Pass 0 as quantity - placeOrder will calculate based on risk management
    placeOrder(tick.sym, side, 0, tick.p);
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
