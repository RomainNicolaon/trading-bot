# Crypto Trading Bot (TypeScript)

A cryptocurrency algorithmic trading bot that connects to Binance for real-time market data, analyzes prices using Simple Moving Average (SMA) crossover strategy, and executes trades on crypto pairs like BTC/USDT and ETH/USDT.

## 🏗️ Architecture Overview

```
Market Data → Strategy Engine (SMA) → Order Execution → Dashboard 📊
```

The bot follows a unidirectional data flow:
1. **Market Layer**: Receives real-time trade data via WebSocket
2. **Strategy Layer**: Analyzes price movements using technical indicators
3. **Execution Layer**: Places orders based on trading signals
4. **Dashboard**: Real-time web UI showing trades, P&L, and performance

### 🌐 Live Dashboard

The bot includes a **real-time web dashboard** at `http://localhost:3000`:
- 📈 Live trade feed
- 💰 Profit/Loss tracking
- 📊 Performance metrics
- 🎯 Win rate statistics

See [DASHBOARD.md](DASHBOARD.md) for full documentation.

## 📁 Project Structure

```
src/
├── index.ts                 # Main orchestrator - connects all components
├── config.ts                # Configuration (API keys, symbols)
├── market/
│   └── binance-ws.ts        # WebSocket client for Binance (FREE)
├── engine/
│   └── sma-strategy.ts      # Simple Moving Average strategy
├── execution/
│   ├── binance-exec.ts      # Binance order execution (CCXT)
│   ├── mock-exec.ts         # Mock order execution
│   └── position-tracker.ts  # Position and P&L tracking
├── dashboard/
│   ├── server.ts            # Dashboard WebSocket server
│   ├── dashboard.html       # Dashboard UI
│   ├── dashboard.css        # Dashboard styling
│   └── dashboard.js         # Dashboard client logic
└── utils/
    └── close-all-binance-positions.ts  # Utility to close all positions
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- **Binance API Key** (FREE for crypto trading) 🆓

### Installation

```bash
npm install
```

### Configuration

#### Step 1: Get Binance API Keys

**For Testnet (Recommended for learning):**
1. Visit [Binance Testnet](https://testnet.binance.vision/)
2. Create an account and generate API keys
3. No real money required - perfect for testing!

**For Live Trading (REAL MONEY):**
1. Visit [Binance](https://www.binance.com/)
2. Create an account and complete KYC verification
3. Generate API keys with trading permissions
4. ⚠️ **WARNING**: This uses REAL money!

#### Step 2: Create .env file

Create a `.env` file in the project root:

```bash
# Binance Configuration
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# Use testnet for paper trading (default: true)
BINANCE_TESTNET=true

# Trading pairs (crypto)
SYMBOLS=BTC/USDT,ETH/USDT

# Execution mode: "mock" for simulation, "real" for actual trading
EXECUTION_MODE=mock

# Maximum trade value in USDT
MAX_TRADE_VALUE=50
```

**Important Settings:**
- `BINANCE_TESTNET=true` - Uses fake money (SAFE for learning)
- `BINANCE_TESTNET=false` - Uses REAL money (⚠️ BE CAREFUL!)
- `EXECUTION_MODE=mock` - Simulates trades without placing orders
- `EXECUTION_MODE=real` - Places actual orders on Binance

### Run

```bash
# Development mode (with ts-node)
npm run dev

# Open dashboard in browser
# Navigate to: http://localhost:3000

# Production mode (compile first)
npm run build
npm run prod

# Close all open positions (useful utility)
npm run close-positions
```

### 📊 View Dashboard

Once the bot is running, open your browser to:
```
http://localhost:3000
```

You'll see:
- ✅ Live trade feed
- 💰 Real-time P&L
- 📈 Performance charts
- 🎯 Win/loss statistics

**Full dashboard guide**: [DASHBOARD.md](DASHBOARD.md)

## 📚 Code Walkthrough

### Step 1: Configuration (`src/config.ts`)

```typescript
export const BINANCE_API_KEY = process.env.BINANCE_API_KEY || '';
export const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || '';
export const SYMBOLS = (process.env.SYMBOLS || 'BTC/USDT,ETH/USDT').split(',');
```

**What it does**: Loads Binance API credentials and trading symbols from environment variables.

---

### Step 2: Main Orchestrator (`src/index.ts`)

#### 2.1 Initialize Strategy Map

```typescript
const smaMap = new Map<string, SimpleSMA>();
SYMBOLS.forEach(s => smaMap.set(s, new SimpleSMA(5, 20)));
```

**What it does**: Creates a separate SMA strategy instance for each symbol (BTC/USDT, ETH/USDT, etc.). Each strategy tracks its own moving averages independently.

**Parameters**: 
- `5` = Short-term window (5 price points)
- `20` = Long-term window (20 price points)

#### 2.2 Start WebSocket Connection

```typescript
startBinanceSocket(BINANCE_API_KEY, BINANCE_API_SECRET, (tick: any) => {
  const s = smaMap.get(tick.sym);
  if (!s) return;
  
  s.pushPrice(tick.p);
  const sig = s.checkSignal();
  
  if (sig) {
    const maxQty = MAX_TRADE_VALUE / tick.p;
    const side = sig === 'LONG' ? 'BUY' : 'SELL';
    placeOrder(tick.sym, side, maxQty, tick.p);
  }
}, BINANCE_TESTNET);
```

**What it does**: 
1. Establishes WebSocket connection to Binance
2. For each incoming trade tick:
   - Retrieves the appropriate strategy for that symbol
   - Feeds the price to the strategy
   - Checks if a trading signal is generated
   - Executes an order if signal detected

---

### Step 3: Market Data Layer (`src/market/binance-ws.ts`)

#### 3.1 WebSocket Connection Setup

```typescript
export function startBinanceSocket(
  apiKey: string,
  apiSecret: string,
  onTrade: (tick: any) => void,
  testnet: boolean = true
) {
  const baseUrl = testnet 
    ? 'wss://testnet.binance.vision/ws'
    : 'wss://stream.binance.com:9443/ws';
```

**What it does**: Creates a WebSocket connection to Binance's real-time crypto data feed.

#### 3.2 Stream Subscription

```typescript
  const streams = SYMBOLS.map(s => 
    `${s.toLowerCase().replace('/', '')}@trade`
  ).join('/');
  
  const ws = new WebSocket(`${baseUrl}/${streams}`);
```

**What it does**: 
1. Subscribes to trade streams for each symbol (e.g., `btcusdt@trade`, `ethusdt@trade`)
2. Binance provides FREE real-time data for crypto

#### 3.3 Message Processing

```typescript
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.e === 'trade') {
    const tick = {
      sym: msg.s.replace('USDT', '/USDT'),  // Convert BTCUSDT to BTC/USDT
      p: parseFloat(msg.p),                  // Price
      q: parseFloat(msg.q),                  // Quantity
      t: msg.T                               // Timestamp
    };
    onTrade(tick);
  }
});
```

**What it does**: 
1. Parses incoming JSON messages
2. Filters for trade events
3. Normalizes data into a tick object
4. Calls the callback function with the tick data

---

### Step 4: Strategy Engine (`src/engine/sma-strategy.ts`)

#### 4.1 Strategy Class Structure

```typescript
export class SimpleSMA {
  shortWindow: number;  // e.g., 5
  longWindow: number;   // e.g., 20
  short: number[] = []; // Short-term price buffer
  long: number[] = [];  // Long-term price buffer
  lastSignal: 'LONG' | 'SHORT' | null = null;
```

**What it does**: Maintains two sliding windows of prices for calculating moving averages.

#### 4.2 Price Update

```typescript
pushPrice(p: number) {
  this.short.push(p);
  this.long.push(p);
  
  // Maintain fixed window sizes
  if (this.short.length > this.shortWindow) this.short.shift();
  if (this.long.length > this.longWindow) this.long.shift();
}
```

**What it does**: 
1. Adds new price to both windows
2. Removes oldest price if window is full (FIFO queue)
3. Keeps windows at fixed size (5 and 20 prices)

#### 4.3 Signal Generation

```typescript
checkSignal() {
  if (this.long.length < this.longWindow) return null;
  
  const s = this.getSMA(this.short);  // Short-term average
  const l = this.getSMA(this.long);   // Long-term average
  
  if (isNaN(s) || isNaN(l)) return null;
  
  const sig = s > l ? 'LONG' : 'SHORT';
  
  // Only return signal on crossover (state change)
  if (sig !== this.lastSignal) {
    this.lastSignal = sig;
    return sig;
  }
  
  return null;
}
```

**What it does**: 
1. Waits until enough data is collected (20 prices)
2. Calculates both moving averages
3. **Generates signal**:
   - `LONG`: Short MA > Long MA (uptrend - buy signal)
   - `SHORT`: Short MA < Long MA (downtrend - sell signal)
4. **Only triggers on crossover**: Returns signal only when trend changes

**Example**:
```
Price: 100, 102, 104, 106, 108...
Short MA (5): 104
Long MA (20): 100
Signal: LONG (short > long = uptrend)
```

#### 4.4 SMA Calculation

```typescript
getSMA(arr: number[]) {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
```

**What it does**: Calculates the arithmetic mean of prices in the window.

---

### Step 5: Execution Layer (`src/execution/mock-exec.ts`)

```typescript
export async function placeOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  qty: number,
  price?: number
) {
  // Mock execution - no real orders placed
  console.log(`[MOCK EXEC] ${side} ${qty} ${symbol} @ ${price || 'MKT'}`);
  return { orderId: 'MOCK-' + Date.now() };
}
```

**What it does**: 
- **Currently**: Logs order details to console
- **Production**: Would connect to a real broker API to execute trades

**Example output**:
```
[MOCK EXEC] BUY 100 AAPL @ 150.25
[MOCK EXEC] SELL 100 TSLA @ 245.80
```

---

## 🔄 Complete Data Flow Example

1. **Binance sends trade**: `{"e":"trade","s":"BTCUSDT","p":"45000.50","q":"0.1","T":1699123456789}`
2. **WebSocket receives & normalizes**: `{sym:'BTC/USDT', p:45000.50, q:0.1, t:1699123456789}`
3. **Orchestrator routes to strategy**: `smaMap.get('BTC/USDT').pushPrice(45000.50)`
4. **Strategy updates windows**:
   - Short window: `[44800, 44900, 44950, 45000, 45000.50]`
   - Long window: `[44500, 44550, ..., 45000.50]` (20 prices)
5. **Strategy calculates**:
   - Short MA: `44930.10`
   - Long MA: `44750.25`
   - Signal: `LONG` (44930.10 > 44750.25)
6. **Order execution**: `placeOrder('BTC/USDT', 'BUY', 0.001, 45000.50)`
7. **Console output**: `[MOCK EXEC] BUY 0.001 BTC/USDT @ 45000.50`

---

## 🛠️ Technical Details

### TypeScript Configuration

- **Module System**: ES Modules (`"type": "module"`)
- **Target**: ES2020
- **Imports**: Require `.js` extensions for relative imports (ESM standard)

### Dependencies

- **ws**: WebSocket client for real-time data
- **ccxt**: Unified cryptocurrency exchange API
- **binance-api-node**: Binance-specific API client
- **pino**: Fast JSON logger
- **ts-node**: TypeScript execution for development

---

## ⚠️ Important Warnings

### This is a Pedagogical Example

**DO NOT use in production without**:

1. **Backtesting**: Test strategy on historical data
2. **Risk Management**: 
   - Position sizing based on account size
   - Stop-loss orders
   - Maximum drawdown limits
   - Portfolio diversification
3. **Real Broker Integration**: Replace mock execution with actual broker API
4. **Error Handling**: Robust error recovery and logging
5. **Data Validation**: Verify data quality and handle missing/delayed data
6. **Latency Optimization**: Minimize execution delay
7. **Regulatory Compliance**: Follow financial regulations in your jurisdiction

### Known Limitations

- No position tracking (can place duplicate orders)
- No stop-loss or take-profit
- Simplified signal logic (no volume, volatility, or other indicators)
- Mock execution (no real orders)
- No reconnection logic for WebSocket disconnects
- No data persistence or state recovery

---

## 🔧 Next Steps for Production

1. **Add Position Management**: Track open positions, prevent duplicate entries
2. **Implement Risk Controls**: Max position size, daily loss limits
3. **Enhance Binance Integration**: Add advanced order types (limit, stop-loss)
4. **Add More Indicators**: RSI, MACD, Bollinger Bands, volume analysis
5. **Implement Backtesting**: Test strategy on historical data
6. **Add Database**: Store trades, positions, and performance metrics
7. **Build Monitoring**: Alerts, dashboards, performance tracking
8. **Add Tests**: Unit tests, integration tests, strategy validation

---

## 📖 Learning Resources

- [Binance API Docs](https://binance-docs.github.io/apidocs/spot/en/)
- [CCXT Documentation](https://docs.ccxt.com/)
- [Technical Analysis Basics](https://www.investopedia.com/technical-analysis-4689657)
- [Algorithmic Trading Guide](https://www.investopedia.com/articles/active-trading/101014/basics-algorithmic-trading-concepts-and-examples.asp)

---

## 📄 License

Educational use only. Use at your own risk.
