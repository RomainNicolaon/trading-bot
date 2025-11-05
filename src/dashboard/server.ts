import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pinoLogger from "../pinoLogger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  pnl?: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export class DashboardServer {
  private wss: WebSocketServer;
  private httpServer: http.Server;
  private trades: Trade[] = [];
  private positions: Map<string, Position> = new Map();
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;

    // Create HTTP server
    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (ws) => {
      pinoLogger.info("Dashboard client connected");

      // Send initial state
      ws.send(
        JSON.stringify({
          type: "initial",
          trades: this.trades,
          positions: Array.from(this.positions.values()),
        })
      );

      ws.on("close", () => {
        pinoLogger.info("Dashboard client disconnected");
      });
    });
  }

  start() {
    this.httpServer.listen(this.port, () => {
      pinoLogger.info(
        `Dashboard server running at http://localhost:${this.port}`
      );
      pinoLogger.info(`Open your browser to view the dashboard`);
    });
  }

  private handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    const url = req.url || "/";

    if (url === "/" || url === "/index.html") {
      this.serveFile(res, "dashboard.html", "text/html");
    } else if (url === "/dashboard.css") {
      this.serveFile(res, "dashboard.css", "text/css");
    } else if (url === "/dashboard.js") {
      this.serveFile(res, "dashboard.js", "application/javascript");
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  }

  private serveFile(
    res: http.ServerResponse,
    filename: string,
    contentType: string
  ) {
    const filePath = path.join(__dirname, filename);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading file");
        pinoLogger.error({ err, filename }, "Error serving file");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  }

  // Called when bot executes a trade
  recordTrade(trade: Trade) {
    this.trades.push(trade);

    // Update positions
    this.updatePosition(trade);

    // Broadcast to all connected clients
    this.broadcast({
      type: "trade",
      trade,
      positions: Array.from(this.positions.values()),
    });

    pinoLogger.info({ trade }, "Trade recorded");
  }

  // Update price for P&L calculation
  updatePrice(symbol: string, price: number) {
    const position = this.positions.get(symbol);
    if (position) {
      position.currentPrice = price;
      position.unrealizedPnl = (price - position.avgPrice) * position.quantity;

      this.broadcast({
        type: "price_update",
        positions: Array.from(this.positions.values()),
      });
    }
  }

  private updatePosition(trade: Trade) {
    const position = this.positions.get(trade.symbol) || {
      symbol: trade.symbol,
      quantity: 0,
      avgPrice: 0,
      currentPrice: trade.price,
      unrealizedPnl: 0,
      realizedPnl: 0,
    };

    if (trade.side === "BUY") {
      // Calculate new average price
      const totalCost =
        position.avgPrice * position.quantity + trade.price * trade.quantity;
      position.quantity += trade.quantity;
      position.avgPrice = totalCost / position.quantity;
    } else {
      // SELL - realize P&L
      const pnl = (trade.price - position.avgPrice) * trade.quantity;
      position.realizedPnl += pnl;
      position.quantity -= trade.quantity;
      trade.pnl = pnl;
    }

    position.currentPrice = trade.price;
    position.unrealizedPnl =
      (position.currentPrice - position.avgPrice) * position.quantity;

    this.positions.set(trade.symbol, position);
  }

  // Send log message to dashboard
  sendLog(level: string, message: string) {
    this.broadcast({
      type: "log",
      log: {
        level,
        message,
        timestamp: Date.now(),
      },
    });
  }

  private broadcast(data: any) {
    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        // OPEN
        client.send(message);
      }
    });
  }

  getStats() {
    const totalPnl = Array.from(this.positions.values()).reduce(
      (sum, pos) => sum + pos.realizedPnl + pos.unrealizedPnl,
      0
    );

    return {
      totalTrades: this.trades.length,
      totalPnl,
      positions: Array.from(this.positions.values()),
    };
  }
}
