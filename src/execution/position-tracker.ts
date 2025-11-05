import pinoLogger from "../pinoLogger.js";

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openedDate: string; // Date when position was first opened (YYYY-MM-DD format)
}

export interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  pnl?: number;
}

export class PositionTracker {
  private positions: Map<string, Position> = new Map();
  private trades: Trade[] = [];
  private tradeIdCounter = 0;

  recordTrade(
    symbol: string,
    side: "BUY" | "SELL",
    quantity: number,
    price: number
  ): Trade {
    const trade: Trade = {
      id: `T${++this.tradeIdCounter}`,
      timestamp: Date.now(),
      symbol,
      side,
      quantity,
      price,
    };

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Update position
    const position = this.positions.get(symbol) || {
      symbol,
      quantity: 0,
      avgPrice: 0,
      currentPrice: price,
      unrealizedPnl: 0,
      realizedPnl: 0,
      openedDate: today,
    };

    if (side === "BUY") {
      // Set openedDate if this is a new position (quantity was 0)
      if (position.quantity === 0) {
        position.openedDate = today;
      }

      // Calculate new average price
      const totalCost =
        position.avgPrice * position.quantity + price * quantity;
      position.quantity += quantity;
      position.avgPrice =
        position.quantity > 0 ? totalCost / position.quantity : 0;

      pinoLogger.info(
        {
          symbol,
          quantity,
          price,
          avgPrice: position.avgPrice,
          openedDate: position.openedDate,
        },
        "LONG position opened/increased"
      );
    } else {
      // SELL - realize P&L
      if (position.quantity > 0) {
        const pnl = (price - position.avgPrice) * quantity;
        position.realizedPnl += pnl;
        trade.pnl = pnl;

        pinoLogger.info(
          {
            symbol,
            quantity,
            price,
            pnl: pnl.toFixed(2),
          },
          `Position closed/reduced - P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(
            2
          )}`
        );
      }
      position.quantity -= quantity;
    }

    position.currentPrice = price;
    position.unrealizedPnl =
      (position.currentPrice - position.avgPrice) * position.quantity;

    this.positions.set(symbol, position);
    this.trades.push(trade);

    return trade;
  }

  // Check if a position can be sold today (PDT protection)
  canSellToday(symbol: string): boolean {
    const position = this.positions.get(symbol);
    if (!position || position.quantity === 0) {
      return false;
    }

    const today = new Date().toISOString().split("T")[0];
    return position.openedDate !== today;
  }

  updatePrice(symbol: string, price: number) {
    const position = this.positions.get(symbol);
    if (position && position.quantity > 0) {
      position.currentPrice = price;
      position.unrealizedPnl = (price - position.avgPrice) * position.quantity;
    }
  }

  getPosition(symbol: string): Position | undefined {
    return this.positions.get(symbol);
  }

  getAllPositions(): Position[] {
    return Array.from(this.positions.values()).filter((p) => p.quantity > 0);
  }

  getTrades(): Trade[] {
    return this.trades;
  }

  getTotalPnl(): number {
    return Array.from(this.positions.values()).reduce(
      (sum, pos) => sum + pos.realizedPnl + pos.unrealizedPnl,
      0
    );
  }

  getStats() {
    const closedTrades = this.trades.filter((t) => t.pnl !== undefined);
    const wins = closedTrades.filter((t) => t.pnl! > 0).length;
    const losses = closedTrades.filter((t) => t.pnl! < 0).length;
    const totalPnl = this.getTotalPnl();

    return {
      totalTrades: this.trades.length,
      closedTrades: closedTrades.length,
      wins,
      losses,
      winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
      totalPnl,
      activePositions: this.getAllPositions().length,
    };
  }

  // Sync existing positions from Alpaca (for bot restarts)
  syncPositions(alpacaPositions: any[]) {
    pinoLogger.info(
      { count: alpacaPositions.length },
      "Syncing existing positions from Alpaca"
    );

    const today = new Date().toISOString().split("T")[0];

    for (const pos of alpacaPositions) {
      // IMPORTANT: We can't reliably determine when positions were opened
      // To be safe with PDT rules, assume all synced positions were opened today
      // User must wait until next day to sell them
      const openedDate = today;

      const position: Position = {
        symbol: pos.symbol,
        quantity: parseFloat(pos.qty),
        avgPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        unrealizedPnl: parseFloat(pos.unrealized_pl),
        realizedPnl: 0, // We don't track historical realized P&L from before this session
        openedDate: openedDate,
      };

      this.positions.set(pos.symbol, position);

      pinoLogger.warn(
        {
          symbol: position.symbol,
          quantity: position.quantity,
          avgPrice: position.avgPrice,
          unrealizedPnl: position.unrealizedPnl.toFixed(2),
        },
        `⚠️ Loaded existing position: ${position.quantity} shares @ $${position.avgPrice.toFixed(2)} - CANNOT SELL TODAY (PDT protection)`
      );
    }

    if (alpacaPositions.length > 0) {
      pinoLogger.warn(
        "⚠️ Existing positions detected! These cannot be sold today due to PDT rules."
      );
      pinoLogger.warn(
        "💡 To sell these positions, wait until tomorrow or close them manually via Alpaca dashboard."
      );
    }
  }
}
