# 🆓 Free Alternative: Alpaca Setup Guide

## Why Alpaca?

**Polygon Free Tier Issue**: Polygon's free tier does NOT include WebSocket access (requires $29/month plan).

**Alpaca Solution**: Alpaca provides **FREE real-time market data via WebSocket** with no cost!

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Free Alpaca Account

1. Go to: **https://alpaca.markets/**
2. Click "Get Started Free"
3. Sign up for a **paper trading account** (no credit card required)
4. Verify your email

### Step 2: Get Your API Keys

1. Log in to Alpaca dashboard
2. Go to: **https://app.alpaca.markets/paper/dashboard/overview**
3. Click on "Your API Keys" in the sidebar
4. Copy both:
   - **API Key ID**
   - **Secret Key**

### Step 3: Configure Your Bot

Edit your `.env` file:

```bash
# Use Alpaca (FREE)
DATA_PROVIDER=alpaca

# Paste your Alpaca credentials
ALPACA_API_KEY=PKxxxxxxxxxxxxxxxxxxxxx
ALPACA_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Symbols to trade
SYMBOLS=AAPL,TSLA
```

### Step 4: Run!

```bash
npm run start
```

## ✅ Expected Output

```
🤖 Trading Bot Starting...
📊 Symbols: [ 'AAPL', 'TSLA' ]
📈 Strategy: SMA(5,20) Crossover
🔌 Data Provider: ALPACA
---
{"level":30,"msg":"🔌 Alpaca WebSocket opened, authenticating..."}
{"level":30,"msg":"✅ Alpaca authentication successful"}
{"level":30,"msg":"📊 Subscribed to symbols"}
{"level":30,"msg":"✅ Subscription confirmed"}
{"level":30,"symbol":"AAPL","price":150.25,"msg":"📈 Trade received"}
[MOCK EXEC] BUY 100 AAPL @ 150.25
```

## 📊 Alpaca vs Polygon Comparison

| Feature | Alpaca (FREE) | Polygon Free | Polygon Paid |
|---------|---------------|--------------|--------------|
| **Cost** | $0 | $0 | $29/month |
| **WebSocket** | ✅ Yes | ❌ No | ✅ Yes |
| **Real-time Data** | ✅ Yes (IEX) | ❌ No | ✅ Yes |
| **Data Source** | IEX Exchange | - | All exchanges |
| **Rate Limits** | Generous | - | Higher |
| **Best For** | Learning, Testing | REST API only | Production |

## 🔄 Switching Between Providers

Just change `DATA_PROVIDER` in your `.env` file:

```bash
# Use Alpaca (free)
DATA_PROVIDER=alpaca

# Or use Polygon (paid plan required)
DATA_PROVIDER=polygon
```

## ⚠️ Important Notes

### Market Hours
- **US Stock Market**: 9:30 AM - 4:00 PM ET (Monday-Friday)
- **Pre-market**: 4:00 AM - 9:30 AM ET
- **After-hours**: 4:00 PM - 8:00 PM PM ET

You'll only receive trade data during market hours!

### Data Source
- Alpaca uses **IEX Exchange** data (free tier)
- This is real market data, just from one exchange
- Sufficient for learning and testing strategies

### Paper Trading
- Alpaca account is for **paper trading** (simulated)
- Perfect for testing your bot without real money
- Can upgrade to live trading later if desired

## 🎯 Testing Your Setup

### 1. Check During Market Hours
Run the bot when US markets are open to see live data.

### 2. Verify Symbols
Make sure your symbols are valid US stocks:
```bash
SYMBOLS=AAPL,TSLA,GOOGL,MSFT
```

### 3. Check Logs
You should see:
- ✅ Authentication successful
- 📊 Subscribed to symbols
- 📈 Trade received (during market hours)

## 🐛 Troubleshooting

### "Authentication failed"
- Double-check your API keys (no extra spaces)
- Make sure you copied BOTH the key and secret
- Verify keys are from **paper trading** account

### "No trade data"
- Check if market is open (9:30 AM - 4:00 PM ET)
- Verify symbols are valid US stocks
- Wait a few seconds - trades come in as they happen

### "Connection closed"
- Check your internet connection
- Verify API keys are correct
- Try regenerating keys in Alpaca dashboard

## 📚 Additional Resources

- **Alpaca Docs**: https://alpaca.markets/docs/
- **Market Data API**: https://alpaca.markets/docs/market-data/
- **WebSocket Docs**: https://alpaca.markets/docs/market-data/real-time/

## 💡 Pro Tips

1. **Start with paper trading** - Test your strategy thoroughly
2. **Monitor during market hours** - See real trades happening
3. **Check the logs** - Use `logger.debug` to see all messages
4. **Test with liquid stocks** - AAPL, TSLA, MSFT have lots of trades

---

**Ready to go?** Follow the 4 steps above and you'll have free real-time market data in minutes! 🚀
