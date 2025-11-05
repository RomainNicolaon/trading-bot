# 🎯 Execution Modes Guide

## Overview

Your bot supports two execution modes:
- **MOCK** - Simulates trades (no real orders) ✅ SAFE
- **REAL** - Places actual orders with Alpaca ⚠️ USE WITH CAUTION

## 🛡️ MOCK Mode (Development - Default)

**What it does:**
- Simulates buy/sell orders
- Tracks positions and P&L
- Shows everything in dashboard
- **NO REAL MONEY** involved

**Perfect for:**
- Testing your strategy
- Learning how the bot works
- Debugging issues
- Experimenting with settings

**Configuration:**
```bash
# In your .env file
EXECUTION_MODE=mock
```

**Run:**
```bash
npm start      # Development
npm run prod   # Production
```

You'll see:
```
💰 Execution Mode: MOCK
[MOCK EXEC] BUY 3 PLUG @ 2.535
```

---

## 💰 REAL Mode (Production Trading)

**What it does:**
- Places ACTUAL orders with Alpaca
- Uses REAL or PAPER money (depending on ALPACA_LIVE setting)
- Executes market orders immediately
- **REAL CONSEQUENCES**

### Option 1: Paper Trading (Fake Money) ✅ RECOMMENDED

**Configuration:**
```bash
# In your .env file
EXECUTION_MODE=real
# ALPACA_LIVE not set (defaults to paper trading)
```

**What happens:**
- Uses Alpaca paper trading API
- Fake $100,000 account
- Real market prices
- No real money at risk
- Perfect for testing before going live

### Option 2: Live Trading (Real Money) ⚠️ DANGER

**Configuration:**
```bash
# In your .env file
EXECUTION_MODE=real
ALPACA_LIVE=true  # ⚠️ REAL MONEY!
```

**What happens:**
- Uses Alpaca live trading API
- YOUR REAL MONEY
- Real orders on real market
- Can lose money quickly
- **USE EXTREME CAUTION**

---

## 🔄 Switching Between Modes

### Development → Production (Paper Trading)

1. Update `.env`:
```bash
EXECUTION_MODE=real
# Don't set ALPACA_LIVE (stays on paper trading)
```

2. Rebuild and run:
```bash
npm run build
npm run prod
```

3. Verify in console:
```
💰 Execution Mode: REAL
💰 Alpaca execution mode: PAPER (FAKE MONEY)
```

### Paper Trading → Live Trading ⚠️

**ONLY DO THIS IF YOU:**
- ✅ Tested extensively in mock mode
- ✅ Tested extensively in paper trading mode
- ✅ Understand the risks
- ✅ Can afford to lose the money
- ✅ Have proper risk management

1. Enable live trading in Alpaca dashboard
2. Get live trading API keys
3. Update `.env`:
```bash
EXECUTION_MODE=real
ALPACA_LIVE=true
ALPACA_API_KEY=your_live_key
ALPACA_API_SECRET=your_live_secret
```

4. **START WITH SMALL AMOUNTS**
5. Monitor closely

---

## 📊 Comparison Table

| Feature | MOCK | REAL (Paper) | REAL (Live) |
|---------|------|--------------|-------------|
| Real orders | ❌ | ✅ | ✅ |
| Real money | ❌ | ❌ | ✅ |
| Real prices | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Risk | None | None | HIGH |
| Best for | Development | Testing | Production |

---

## 🚨 Safety Checklist

Before using REAL mode with live money:

- [ ] Tested strategy in mock mode for at least 1 week
- [ ] Tested in paper trading for at least 1 week
- [ ] Strategy is profitable in paper trading
- [ ] Understand max trade value limits (currently €50)
- [ ] Set up stop losses
- [ ] Monitor bot actively
- [ ] Start with minimum capital
- [ ] Have emergency stop plan
- [ ] Understand you can lose money

---

## 🔍 Verifying Your Mode

Check console output on startup:

**Mock Mode:**
```
💰 Execution Mode: MOCK
[MOCK EXEC] BUY 3 PLUG @ 2.535
```

**Real Mode (Paper):**
```
💰 Execution Mode: REAL
💰 Alpaca execution mode: PAPER (FAKE MONEY)
📤 Placing order with Alpaca
✅ Order placed: BUY 3 PLUG
```

**Real Mode (Live):**
```
💰 Execution Mode: REAL
💰 Alpaca execution mode: LIVE (REAL MONEY)  ⚠️
📤 Placing order with Alpaca
✅ Order placed: BUY 3 PLUG
```

---

## 🛠️ Troubleshooting

### Orders not executing in REAL mode

1. Check Alpaca account status
2. Verify API keys are correct
3. Check market hours (9:30 AM - 4:00 PM ET)
4. Ensure sufficient buying power
5. Check bot logs for errors

### Want to switch back to MOCK

```bash
# In .env file
EXECUTION_MODE=mock
```

Restart bot:
```bash
npm run prod
```

---

## 📝 Recommended Workflow

1. **Week 1-2:** MOCK mode
   - Test strategy
   - Fix bugs
   - Tune parameters

2. **Week 3-4:** REAL mode (Paper trading)
   - Verify orders execute correctly
   - Check P&L accuracy
   - Monitor performance

3. **Week 5+:** Consider live trading (optional)
   - Start with minimum capital
   - Monitor closely
   - Scale up slowly if profitable

---

## ⚠️ Important Notes

- **Mock mode** = Safe, no risk
- **Paper trading** = Safe, fake money, real market
- **Live trading** = REAL MONEY, REAL RISK
- Always start with mock mode
- Test thoroughly before going live
- Never risk more than you can afford to lose
- Bot is for educational purposes
- Past performance ≠ future results

---

**Current default:** MOCK mode (safe) ✅

To change: Edit `EXECUTION_MODE` in your `.env` file
