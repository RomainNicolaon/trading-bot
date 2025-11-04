export class SimpleSMA {
  shortWindow: number;
  longWindow: number;
  short: number[] = [];
  long: number[] = [];
  lastSignal: "LONG" | "SHORT" | null = null;
  constructor(shortWindow = 5, longWindow = 20) {
    this.shortWindow = shortWindow;
    this.longWindow = longWindow;
  }
  pushPrice(p: number) {
    this.short.push(p);
    this.long.push(p);
    if (this.short.length > this.shortWindow) this.short.shift();
    if (this.long.length > this.longWindow) this.long.shift();
  }
  getSMA(arr: number[]) {
    if (arr.length === 0) return NaN;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  checkSignal() {
    if (this.long.length < this.longWindow) return null;
    const s = this.getSMA(this.short),
      l = this.getSMA(this.long);
    if (isNaN(s) || isNaN(l)) return null;
    const sig = s > l ? "LONG" : "SHORT";
    if (sig !== this.lastSignal) {
      this.lastSignal = sig;
      return sig;
    }
    return null;
  }
}
