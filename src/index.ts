import { startPolygonSocket } from "./market/polygon-ws.js";
import { startAlpacaSocket } from "./market/alpaca-ws.js";
import { SimpleSMA } from "./engine/sma-strategy.js";
import { PositionTracker } from "./execution/position-tracker.js";
import { DashboardServer } from "./dashboard/server.js";
import {
  SYMBOLS,
  DATA_PROVIDER,
  EXTENDED_HOURS,
  EXECUTION_MODE,
  ALPACA_API_KEY,
  ALPACA_API_SECRET,
} from "./config.js";
import pinoLogger from "./pinoLogger.js";

// Print startup info first
pinoLogger.info("Trading Bot Starting...");
pinoLogger.info({ symbols: SYMBOLS }, "Symbols:");
pinoLogger.info({ extendedHours: EXTENDED_HOURS }, "Extended Hours:");
pinoLogger.info("Strategy: SMA(5,20) Crossover");
pinoLogger.info(
  { dataProvider: DATA_PROVIDER.toUpperCase() },
  "Data Provider:"
);
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
  const realExec = await import("./execution/alpaca-exec.js");
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

// Initialize position tracker
const positionTracker = new PositionTracker();

// Initialize execution system with tracker and dashboard
initializeExecution(positionTracker, dashboardServer);

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
    // Calculate quantity to keep trade value under €500
    const maxTradeValue = 500;
    const maxQty = Math.floor(maxTradeValue / tick.p);

    // Skip trade if price is too high for even 1 share
    if (maxQty < 1) {
      pinoLogger.warn(
        `Skipping ${sig} ${tick.sym} - price $${tick.p} exceeds max trade value €${maxTradeValue}`
      );
      return;
    }

    const side = sig === "LONG" ? "BUY" : "SELL";
    placeOrder(tick.sym, side, maxQty, tick.p);
  }
};

// Start WebSocket based on configured provider
if (DATA_PROVIDER === "polygon") {
  startPolygonSocket(onTrade);
} else if (DATA_PROVIDER === "alpaca") {
  startAlpacaSocket(ALPACA_API_KEY, ALPACA_API_SECRET, onTrade);
} else {
  pinoLogger.error(`Unknown data provider: ${DATA_PROVIDER}`);
  pinoLogger.error('Valid options: "polygon" or "alpaca"');
  process.exit(1);
}

// Log stats every 60 seconds
setInterval(() => {
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
