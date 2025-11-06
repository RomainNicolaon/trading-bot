import pinoLogger from "../pinoLogger.js";

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openedDate: string; // Date when position was first opened (YYYY-MM-DD format) - kept for tracking purposes
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
      if (position.quantity > 0 && position.avgPrice > 0) {
        const pnl = (price - position.avgPrice) * quantity;
        // Sanity check: prevent absurd P&L values
        if (Math.abs(pnl) < 1000000) {
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
        } else {
          pinoLogger.warn(
            { symbol, pnl, avgPrice: position.avgPrice, price },
            "Skipped recording absurd P&L value - likely bad avgPrice"
          );
        }
      }
      position.quantity -= quantity;
    }

    position.currentPrice = price;
    // Only calculate unrealized P&L if avgPrice is valid
    position.unrealizedPnl =
      position.avgPrice > 0
        ? (position.currentPrice - position.avgPrice) * position.quantity
        : 0;

    this.positions.set(symbol, position);
    this.trades.push(trade);

    return trade;
  }

  // Check if a position can be sold today
  // Note: Crypto has no PDT rules, so positions can always be sold
  canSellToday(symbol: string): boolean {
    const position = this.positions.get(symbol);
    if (!position || position.quantity === 0) {
      return false;
    }

    // Crypto has no PDT restrictions - can sell anytime
    return true;
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

  // Sync existing positions from exchange (for bot restarts)
  syncPositions(exchangePositions: any[]) {
    pinoLogger.info(
      { count: exchangePositions.length },
      "Syncing existing positions from exchange"
    );

    const today = new Date().toISOString().split("T")[0];

    for (const pos of exchangePositions) {
      // For crypto, we can sell positions anytime (no PDT rules)
      const openedDate = today;

      const avgPrice = parseFloat(pos.avg_entry_price || pos.avgPrice || 0);
      const currentPrice = parseFloat(pos.current_price || pos.currentPrice || 0);
      const quantity = parseFloat(pos.qty);
      
      // Calculate unrealized P&L safely, only if we have valid prices
      let unrealizedPnl = 0;
      if (avgPrice > 0 && currentPrice > 0 && quantity > 0) {
        unrealizedPnl = (currentPrice - avgPrice) * quantity;
        // Sanity check
        if (!isFinite(unrealizedPnl) || Math.abs(unrealizedPnl) > 1000000) {
          pinoLogger.warn(
            { symbol: pos.symbol, avgPrice, currentPrice, quantity },
            "Ignoring invalid unrealized P&L from synced position"
          );
          unrealizedPnl = 0;
        }
      }

      const position: Position = {
        symbol: pos.symbol,
        quantity: quantity,
        avgPrice: avgPrice,
        currentPrice: currentPrice,
        unrealizedPnl: unrealizedPnl,
        realizedPnl: 0, // We don't track historical realized P&L from before this session
        openedDate: openedDate,
      };

      this.positions.set(pos.symbol, position);

      pinoLogger.info(
        {
          symbol: position.symbol,
          quantity: position.quantity,
          avgPrice: position.avgPrice,
          unrealizedPnl: position.unrealizedPnl.toFixed(2),
        },
        `✅ Loaded existing position: ${position.quantity} units @ $${position.avgPrice.toFixed(2)}`
      );
    }

    if (exchangePositions.length > 0) {
      pinoLogger.info(
        "✅ Existing positions loaded successfully. Crypto has no PDT restrictions - can trade anytime."
      );
    }
  }
}
