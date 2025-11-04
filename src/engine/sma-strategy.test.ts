import { SimpleSMA } from "./sma-strategy.js";

describe("SimpleSMA", () => {
  test("should initialize with correct window sizes", () => {
    const sma = new SimpleSMA(5, 20);
    expect(sma.shortWindow).toBe(5);
    expect(sma.longWindow).toBe(20);
  });

  test("should not generate signal until long window is full", () => {
    const sma = new SimpleSMA(2, 5);

    // Add 4 prices (not enough for long window of 5)
    sma.pushPrice(100);
    sma.pushPrice(101);
    sma.pushPrice(102);
    sma.pushPrice(103);

    expect(sma.checkSignal()).toBeNull();
  });

  test("should generate LONG signal when short MA > long MA", () => {
    const sma = new SimpleSMA(2, 5);

    // Add prices with uptrend
    sma.pushPrice(100);
    sma.pushPrice(101);
    sma.pushPrice(102);
    sma.pushPrice(103);
    sma.pushPrice(104);

    // Short MA (103.5) > Long MA (102)
    const signal = sma.checkSignal();
    expect(signal).toBe("LONG");
  });

  test("should generate SHORT signal when short MA < long MA", () => {
    const sma = new SimpleSMA(2, 5);

    // Start with high prices
    sma.pushPrice(110);
    sma.pushPrice(109);
    sma.pushPrice(108);
    sma.pushPrice(107);
    sma.pushPrice(106);

    // Short MA (106.5) < Long MA (108)
    const signal = sma.checkSignal();
    expect(signal).toBe("SHORT");
  });

  test("should only trigger signal on crossover", () => {
    const sma = new SimpleSMA(2, 5);

    // Initial uptrend
    sma.pushPrice(100);
    sma.pushPrice(101);
    sma.pushPrice(102);
    sma.pushPrice(103);
    sma.pushPrice(104);

    // First signal should be LONG
    expect(sma.checkSignal()).toBe("LONG");

    // Continue uptrend - no new signal
    sma.pushPrice(105);
    expect(sma.checkSignal()).toBeNull();

    sma.pushPrice(106);
    expect(sma.checkSignal()).toBeNull();
  });

  test("should maintain fixed window sizes", () => {
    const sma = new SimpleSMA(3, 5);

    // Add more prices than window size
    for (let i = 1; i <= 10; i++) {
      sma.pushPrice(100 + i);
    }

    // Windows should be at max size
    expect(sma.short.length).toBe(3);
    expect(sma.long.length).toBe(5);
  });

  test("should calculate SMA correctly", () => {
    const sma = new SimpleSMA(3, 5);

    // Test getSMA method
    const result = sma.getSMA([100, 102, 104]);
    expect(result).toBe(102); // (100 + 102 + 104) / 3 = 102
  });

  test("should handle empty array in getSMA", () => {
    const sma = new SimpleSMA(3, 5);
    const result = sma.getSMA([]);
    expect(isNaN(result)).toBe(true);
  });
});
