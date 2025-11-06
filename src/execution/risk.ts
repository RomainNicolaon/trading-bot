// Risk-based position sizing helper
export function calculatePositionSize({
  totalCapital,
  riskPerTrade,
  entry,
  stop,
}: {
  totalCapital: number;
  riskPerTrade: number;
  entry: number;
  stop: number;
}) {
  // maxLoss = totalCapital * riskPerTrade
  const maxLoss = totalCapital * riskPerTrade;
  const riskPerUnit = Math.abs(entry - stop);
  if (riskPerUnit === 0) return 0;
  const size = maxLoss / riskPerUnit;
  return size;
}
