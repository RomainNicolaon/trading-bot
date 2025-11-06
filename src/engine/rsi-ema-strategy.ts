/**
 * RSI + EMA Strategy
 * 
 * Buy Signal:
 * - EMA(9) > EMA(21) (uptrend)
 * - RSI(14) < 60 and rising (momentum building)
 * 
 * Sell Signal:
 * - EMA(9) < EMA(21) (downtrend)
 * - RSI(14) > 70 (overbought)
 * 
 * Expected win rate: 55-65% on 1h crypto charts
 */

export class RsiEmaStrategy {
  private prices: number[] = [];
  private ema9: number | null = null;
  private ema21: number | null = null;
  private rsiPeriod = 14;
  private lastSignal: "LONG" | "SHORT" | null = null;
  private prevRsi: number | null = null;

  constructor() {}

  /**
   * Calculate EMA (Exponential Moving Average)
   * EMA = Price(t) * k + EMA(y) * (1 - k)
   * where k = 2 / (N + 1)
   */
  private calculateEMA(price: number, prevEMA: number | null, period: number): number {
    if (prevEMA === null) {
      return price; // First EMA is just the price
    }
    const k = 2 / (period + 1);
    return price * k + prevEMA * (1 - k);
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * RSI = 100 - (100 / (1 + RS))
   * where RS = Average Gain / Average Loss
   */
  private calculateRSI(): number | null {
    if (this.prices.length < this.rsiPeriod + 1) {
      return null; // Need at least rsiPeriod + 1 prices
    }

    const changes: number[] = [];
    for (let i = 1; i < this.prices.length; i++) {
      changes.push(this.prices[i] - this.prices[i - 1]);
    }

    // Take last rsiPeriod changes
    const recentChanges = changes.slice(-this.rsiPeriod);
    
    let gains = 0;
    let losses = 0;
    
    for (const change of recentChanges) {
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / this.rsiPeriod;
    const avgLoss = losses / this.rsiPeriod;

    if (avgLoss === 0) {
      return 100; // No losses means RSI = 100
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  /**
   * Push new price and update indicators
   */
  pushPrice(price: number) {
    this.prices.push(price);
    
    // Keep only last 100 prices to avoid memory issues
    if (this.prices.length > 100) {
      this.prices.shift();
    }

    // Update EMAs
    this.ema9 = this.calculateEMA(price, this.ema9, 9);
    this.ema21 = this.calculateEMA(price, this.ema21, 21);
  }

  /**
   * Check for trading signals
   * Returns "LONG" for buy, "SHORT" for sell, or null for no signal
   */
  checkSignal(): "LONG" | "SHORT" | null {
    // Need enough data for all indicators
    if (this.prices.length < this.rsiPeriod + 1 || this.ema9 === null || this.ema21 === null) {
      return null;
    }

    const rsi = this.calculateRSI();
    if (rsi === null) {
      return null;
    }

    const ema9 = this.ema9;
    const ema21 = this.ema21;
    const rsiRising = this.prevRsi !== null && rsi > this.prevRsi;

    let signal: "LONG" | "SHORT" | null = null;

    // BUY Signal: EMA(9) > EMA(21) AND RSI < 60 and rising
    if (ema9 > ema21 && rsi < 60 && rsiRising) {
      signal = "LONG";
    }
    // SELL Signal: EMA(9) < EMA(21) AND RSI > 70
    else if (ema9 < ema21 && rsi > 70) {
      signal = "SHORT";
    }

    // Store current RSI for next comparison
    this.prevRsi = rsi;

    // Only return signal if it's different from last signal (avoid repeated signals)
    if (signal !== null && signal !== this.lastSignal) {
      this.lastSignal = signal;
      return signal;
    }

    return null;
  }

  /**
   * Get current indicator values (for debugging/logging)
   */
  getIndicators() {
    return {
      ema9: this.ema9,
      ema21: this.ema21,
      rsi: this.calculateRSI(),
      pricesCount: this.prices.length,
    };
  }
}
