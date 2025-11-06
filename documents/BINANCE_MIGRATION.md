# Binance Migration Guide

## Overview

Your trading bot has been successfully migrated from **Alpaca (stocks)** to **Binance (cryptocurrency)**. This document explains all the changes made and how to use the new system.

## 🎯 Key Changes

### 1. **Exchange Platform**
- **Before**: Alpaca (US stocks like AAPL, TSLA)
- **After**: Binance (crypto pairs like BTC/USDT, ETH/USDT)

### 2. **Trading Assets**
- **Before**: Stocks (whole shares only)
- **After**: Cryptocurrencies (fractional amounts supported)

### 3. **Trading Rules**
- **Before**: Pattern Day Trading (PDT) rules - must hold positions overnight
- **After**: No PDT rules - can buy and sell anytime (24/7 trading)

### 4. **Libraries Used**
- **CCXT**: Multi-exchange library for order execution (supports 100+ exchanges)
- **binance-api-node**: Official Binance WebSocket client for real-time data

## 📁 New Files Created

### Market Data Layer
- **`src/market/binance-ws.ts`**: Real-time WebSocket connection to Binance
  - Subscribes to trade streams for crypto pairs
  - Handles reconnection automatically
  - Converts Binance format to internal format

### Execution Layer
- **`src/execution/binance-exec.ts`**: Order execution using CCXT
  - Places market orders on Binance
  - Checks buying power before trades
  - Syncs existing positions on startup
  - Updates account info every 30 seconds

### Utilities
- **`src/utils/close-all-binance-positions.ts`**: Close all open positions
  - Useful for emergency exits
  - Works with both testnet and live trading
  - Run with: `npm run close-positions`

## 🔧 Modified Files

### Configuration
- **`src/config.ts`**:
  - Added `BINANCE_API_KEY` and `BINANCE_API_SECRET`
  - Added `BINANCE_TESTNET` flag (default: true for safety)
  - Changed default symbols to `BTC/USDT,ETH/USDT`
  - Removed Alpaca-specific configs (ALPACA_LIVE, EXTENDED_HOURS)

### Main Application
- **`src/index.ts`**:
  - Imports `startBinanceSocket` instead of `startAlpacaSocket`
  - Uses `binance-exec` for real trading mode
  - Calculates fractional quantities for crypto (8 decimal places)
  - Updated logging messages for crypto

### Position Tracking
- **`src/execution/position-tracker.ts`**:
  - Removed PDT (Pattern Day Trading) restrictions
  - `canSellToday()` now always returns true (crypto has no PDT)
  - Updated position sync to handle both Alpaca and Binance formats

### Package Configuration
- **`package.json`**:
  - Added `ccxt` (v4.2.0) for multi-exchange support
  - Added `binance-api-node` (v0.12.5) for WebSocket
  - Updated `close-positions` script to use Binance utility

### Documentation
- **`README.md`**: Complete rewrite for crypto trading
- **`.env.example`**: Updated with Binance configuration

## 🚀 Getting Started

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Get Binance API Keys

**For Testing (Recommended):**
1. Visit https://testnet.binance.vision/
2. Create account and generate API keys
3. No real money required!

**For Live Trading:**
1. Visit https://www.binance.com/
2. Complete KYC verification
3. Generate API keys with trading permissions
4. ⚠️ **WARNING**: Uses REAL money!

### Step 3: Configure Environment

Create `.env` file:
```bash
# Binance Configuration
DATA_PROVIDER=binance
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here

# Use testnet (fake money) - SAFE
BINANCE_TESTNET=true

# Trading pairs
SYMBOLS=BTC/USDT,ETH/USDT

# Execution mode
EXECUTION_MODE=mock  # or "real" for actual trading

# Max trade value in USDT
MAX_TRADE_VALUE=50
```

### Step 4: Run the Bot

```bash
# Development mode
npm run dev

# View dashboard
# Open http://localhost:3000 in your browser

# Close all positions (if needed)
npm run close-positions
```

## 🔐 Safety Features

### Multiple Safety Layers

1. **Testnet by Default**: `BINANCE_TESTNET=true` uses fake money
2. **Mock Mode**: `EXECUTION_MODE=mock` simulates trades without placing orders
3. **Position Limits**: `MAX_TRADE_VALUE` caps trade size
4. **Buying Power Checks**: Prevents trades exceeding available balance
5. **No Short Selling**: Can only sell existing positions

### Trading Modes Explained

| Mode | Testnet | Execution | Real Money? | Safe? |
|------|---------|-----------|-------------|-------|
| Mock + Testnet | ✅ | Simulated | ❌ No | ✅ Very Safe |
| Real + Testnet | ✅ | Real Orders | ❌ No | ✅ Safe |
| Mock + Live | ❌ | Simulated | ❌ No | ⚠️ Careful |
| Real + Live | ❌ | Real Orders | ✅ YES | ⚠️ DANGEROUS |

**Recommended for learning**: Mock + Testnet or Real + Testnet

## 📊 Crypto vs Stocks Differences

### Advantages of Crypto
- ✅ **24/7 Trading**: No market hours restrictions
- ✅ **No PDT Rules**: Buy and sell anytime
- ✅ **Fractional Trading**: Trade 0.001 BTC if you want
- ✅ **Lower Barriers**: Start with small amounts
- ✅ **Global Access**: Trade from anywhere

### Considerations
- ⚠️ **Higher Volatility**: Crypto prices move faster
- ⚠️ **Different Risks**: Regulatory uncertainty
- ⚠️ **No Circuit Breakers**: No trading halts

## 🛠️ Technical Details

### CCXT Integration
CCXT provides a unified API for 100+ exchanges:
- Binance (current)
- Coinbase Pro
- Kraken
- Bybit
- And many more...

To switch exchanges, modify `binance-exec.ts`:
```typescript
// Change from:
const exchange = new ccxt.binance({...});

// To:
const exchange = new ccxt.coinbasepro({...});
```

### WebSocket Data Flow
```
Binance WebSocket
    ↓
binance-ws.ts (normalize data)
    ↓
index.ts (route to strategy)
    ↓
sma-strategy.ts (analyze)
    ↓
binance-exec.ts (execute)
    ↓
Binance API
```

## 🐛 Troubleshooting

### "Cannot find module 'ccxt'"
Run: `npm install`

### "Authentication failed"
- Check API keys in `.env`
- Ensure keys have trading permissions
- For testnet, use testnet keys (not live keys)

### "Insufficient balance"
- Check your USDT balance on Binance
- Reduce `MAX_TRADE_VALUE` in `.env`
- For testnet, get free test funds from testnet faucet

### Positions not syncing
- Ensure `EXECUTION_MODE=real`
- Check that you have open positions on Binance
- Verify API keys have read permissions

## 📚 Next Steps

### Recommended Learning Path
1. ✅ Run in mock mode with testnet (current setup)
2. ✅ Test with real mode + testnet (fake orders)
3. ⚠️ Test with small amounts on live (real money)
4. ⚠️ Scale up gradually

### Suggested Improvements
- Add more technical indicators (RSI, MACD, Bollinger Bands)
- Implement stop-loss and take-profit orders
- Add backtesting framework
- Create multiple strategies
- Add risk management rules
- Implement portfolio rebalancing

## 🔗 Resources

- **Binance API Docs**: https://binance-docs.github.io/apidocs/spot/en/
- **CCXT Documentation**: https://docs.ccxt.com/
- **Binance Testnet**: https://testnet.binance.vision/
- **Crypto Trading Guide**: https://academy.binance.com/

## ⚠️ Important Warnings

1. **This is educational software** - Not financial advice
2. **Crypto is volatile** - Only trade what you can afford to lose
3. **Test thoroughly** - Use testnet before live trading
4. **Start small** - Begin with minimal amounts
5. **Understand risks** - Crypto trading carries significant risk
6. **Secure your keys** - Never share API keys or commit them to git
7. **Tax implications** - Crypto trades may be taxable in your jurisdiction

## 📞 Support

If you encounter issues:
1. Check the logs in the console
2. Verify your `.env` configuration
3. Test with testnet first
4. Review Binance API status page

---

**Happy Trading! 🚀**

Remember: The best trade is often no trade. Always do your research and never invest more than you can afford to lose.
