import pinoLogger from "../pinoLogger.js";

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
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

    // Update position
    const position = this.positions.get(symbol) || {
      symbol,
      quantity: 0,
      avgPrice: 0,
      currentPrice: price,
      unrealizedPnl: 0,
      realizedPnl: 0,
    };

    if (side === "BUY") {
      // Calculate new average price
      const totalCost =
        position.avgPrice * position.quantity + price * quantity;
      position.quantity += quantity;
      position.avgPrice =
        position.quantity > 0 ? totalCost / position.quantity : 0;

      pinoLogger.info(`LONG position opened/increased`, {
        symbol,
        quantity,
        price,
        avgPrice: position.avgPrice,
      });
    } else {
      // SELL - realize P&L
      if (position.quantity > 0) {
        const pnl = (price - position.avgPrice) * quantity;
        position.realizedPnl += pnl;
        trade.pnl = pnl;

        pinoLogger.info(
          `Position closed/reduced - P&L: ${
            pnl >= 0 ? "+" : ""
          }$${pnl.toFixed(2)}`,
          { symbol, quantity, price, pnl: pnl.toFixed(2) }
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
}
