# Trading Bot Skeleton (TypeScript)

A pedagogical algorithmic trading bot that connects to real-time market data via Polygon WebSocket, analyzes prices using Simple Moving Average (SMA) crossover strategy, and executes mock orders.

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
│   ├── polygon-ws.ts        # WebSocket client for Polygon.io
│   └── alpaca-ws.ts         # WebSocket client for Alpaca (FREE)
├── engine/
│   └── sma-strategy.ts      # Simple Moving Average strategy
├── execution/
│   ├── mock-exec.ts         # Mock order execution
│   └── position-tracker.ts  # Position and P&L tracking
└── dashboard/
    ├── server.ts            # Dashboard WebSocket server
    ├── dashboard.html       # Dashboard UI
    ├── dashboard.css        # Dashboard styling
    └── dashboard.js         # Dashboard client logic
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- **Market Data API Key** (choose one):
  - **Alpaca** (FREE WebSocket) - Recommended for learning ✅
  - **Polygon** (Paid $29/month for WebSocket)

### Installation

```bash
npm install
```

### Configuration

#### Option 1: Using .env file (Recommended)

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. **Choose your data provider**:

   **A. Alpaca (FREE - Recommended)** 🆓
   ```bash
   DATA_PROVIDER=alpaca
   ALPACA_API_KEY=your_alpaca_key
   ALPACA_API_SECRET=your_alpaca_secret
   SYMBOLS=AAPL,TSLA
   ```
   Get free keys at: [alpaca.markets](https://alpaca.markets/)
   
   📖 **Detailed setup guide**: See [ALPACA_SETUP.md](ALPACA_SETUP.md)

   **B. Polygon (Paid $29/month)**
   ```bash
   DATA_PROVIDER=polygon
   POLYGON_API_KEY=your_polygon_key
   SYMBOLS=AAPL,TSLA
   ```
   ⚠️ **Note**: Polygon free tier does NOT include WebSocket access

#### Option 2: Using environment variables

```bash
# Windows PowerShell
$env:POLYGON_API_KEY="your_api_key_here"
$env:SYMBOLS="AAPL,TSLA"

# Linux/Mac
export POLYGON_API_KEY="your_api_key_here"
export SYMBOLS="AAPL,TSLA"
```

### Run

```bash
# Development mode (with ts-node)
npm run start

# Open dashboard in browser
# Navigate to: http://localhost:3000

# Production mode (compile first)
npm run build
npm run prod
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
export const POLYGON_API_KEY = process.env.POLYGON_API_KEY || '';
export const SYMBOLS = (process.env.SYMBOLS || 'AAPL,TSLA').split(',');
```

**What it does**: Loads API credentials and trading symbols from environment variables.

---

### Step 2: Main Orchestrator (`src/index.ts`)

#### 2.1 Initialize Strategy Map

```typescript
const smaMap = new Map<string, SimpleSMA>();
SYMBOLS.forEach(s => smaMap.set(s, new SimpleSMA(5, 20)));
```

**What it does**: Creates a separate SMA strategy instance for each symbol (AAPL, TSLA, etc.). Each strategy tracks its own moving averages independently.

**Parameters**: 
- `5` = Short-term window (5 price points)
- `20` = Long-term window (20 price points)

#### 2.2 Start WebSocket Connection

```typescript
startPolygonSocket((tick: any) => {
  const s = smaMap.get(tick.sym);
  if (!s) return;
  
  s.pushPrice(tick.p);
  const sig = s.checkSignal();
  
  if (sig) {
    const qty = 100;
    const side = sig === 'LONG' ? 'BUY' : 'SELL';
    placeOrder(tick.sym, side, qty, tick.p);
  }
});
```

**What it does**: 
1. Establishes WebSocket connection to Polygon
2. For each incoming trade tick:
   - Retrieves the appropriate strategy for that symbol
   - Feeds the price to the strategy
   - Checks if a trading signal is generated
   - Executes an order if signal detected

---

### Step 3: Market Data Layer (`src/market/polygon-ws.ts`)

#### 3.1 WebSocket Connection Setup

```typescript
export function startPolygonSocket(onTrade: (m: TradeMsg) => void) {
  const url = `wss://socket.polygon.io/stocks`;
  const ws = new WebSocket(url);
```

**What it does**: Creates a WebSocket connection to Polygon's real-time stock data feed.

#### 3.2 Authentication & Subscription

```typescript
ws.on('open', () => {
  logger.info('ws open, authenticating');
  ws.send(JSON.stringify({action: 'auth', params: POLYGON_API_KEY}));
  ws.send(JSON.stringify({
    action: 'subscribe', 
    params: SYMBOLS.map(s => `T.${s}`).join(',')
  }));
});
```

**What it does**: 
1. Authenticates with your API key
2. Subscribes to trade events (`T.AAPL`, `T.TSLA`, etc.)

#### 3.3 Message Processing

```typescript
ws.on('message', (data) => {
  const msgs = JSON.parse(data.toString());
  if (!Array.isArray(msgs)) return;
  
  msgs.forEach((m: any) => {
    if (m.ev === 'T') {  // 'T' = Trade event
      const tick: TradeMsg = {
        ev: m.ev,   // Event type
        sym: m.sym, // Symbol (e.g., "AAPL")
        p: m.p,     // Price
        s: m.s,     // Size
        t: m.t      // Timestamp
      };
      onTrade(tick);
    }
  });
});
```

**What it does**: 
1. Parses incoming JSON messages
2. Filters for trade events (type 'T')
3. Normalizes data into a `TradeMsg` object
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
  // TODO: Replace with real broker API
  // (Interactive Brokers, Alpaca, FIX protocol, etc.)
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

1. **Polygon sends trade**: `{"ev":"T","sym":"AAPL","p":150.25,"s":100,"t":1699123456789}`
2. **WebSocket receives & normalizes**: `{ev:'T', sym:'AAPL', p:150.25, s:100, t:1699123456789}`
3. **Orchestrator routes to strategy**: `smaMap.get('AAPL').pushPrice(150.25)`
4. **Strategy updates windows**:
   - Short window: `[148.5, 149.0, 149.5, 150.0, 150.25]`
   - Long window: `[145.0, 145.5, ..., 150.25]` (20 prices)
5. **Strategy calculates**:
   - Short MA: `149.45`
   - Long MA: `147.80`
   - Signal: `LONG` (149.45 > 147.80)
6. **Order execution**: `placeOrder('AAPL', 'BUY', 100, 150.25)`
7. **Console output**: `[MOCK EXEC] BUY 100 AAPL @ 150.25`

---

## 🛠️ Technical Details

### TypeScript Configuration

- **Module System**: ES Modules (`"type": "module"`)
- **Target**: ES2020
- **Imports**: Require `.js` extensions for relative imports (ESM standard)

### Dependencies

- **ws**: WebSocket client for real-time data
- **pino**: Fast JSON logger
- **axios**: HTTP client (for REST API calls if needed)
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
3. **Integrate Real Broker**: Alpaca, Interactive Brokers, or FIX protocol
4. **Add More Indicators**: RSI, MACD, Bollinger Bands, volume analysis
5. **Implement Backtesting**: Test strategy on historical data
6. **Add Database**: Store trades, positions, and performance metrics
7. **Build Monitoring**: Alerts, dashboards, performance tracking
8. **Add Tests**: Unit tests, integration tests, strategy validation

---

## 📖 Learning Resources

- [Polygon.io API Docs](https://polygon.io/docs/stocks)
- [Technical Analysis Basics](https://www.investopedia.com/technical-analysis-4689657)
- [Algorithmic Trading Guide](https://www.investopedia.com/articles/active-trading/101014/basics-algorithmic-trading-concepts-and-examples.asp)

---

## 📄 License

Educational use only. Use at your own risk.
