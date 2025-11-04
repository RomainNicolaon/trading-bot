# 🚀 Quick Start: Dashboard in 2 Minutes

## Step 1: Start the Bot

```bash
npm run start
```

You should see:
```
🤖 Trading Bot Starting...
📊 Symbols: [ 'AAPL', 'TSLA' ]
📈 Strategy: SMA(5,20) Crossover
🔌 Data Provider: ALPACA
🌐 Dashboard: http://localhost:3000    ← Dashboard URL
---
```

## Step 2: Open Dashboard

**Click or copy this URL into your browser:**
```
http://localhost:3000
```

## Step 3: Watch Live Trading! 🎉

You'll immediately see:

### ✅ Connection Status
- Green dot = Connected
- Red dot = Disconnected

### 📊 Summary Cards
- **Total P&L**: Your profit/loss
- **Total Trades**: Number of trades
- **Win Rate**: % of winning trades
- **Active Positions**: Open positions

### 📈 Live Updates
- Trades appear in real-time
- P&L updates as prices change
- Chart shows cumulative profit/loss
- Audio beep when trades execute

## 🎯 What to Expect

### During Market Hours (9:30 AM - 4:00 PM ET)
- ✅ Trades will appear every few minutes
- ✅ Prices update continuously
- ✅ P&L changes in real-time

### Outside Market Hours
- ⏸️ No new trades (market closed)
- ⏸️ Dashboard shows last known state
- ⏸️ Bot is still running, waiting for market open

## 📱 Dashboard Features

### Current Positions Panel
Shows each open position:
- Symbol (AAPL, TSLA, etc.)
- Quantity held
- Average buy price
- Current price
- Unrealized P&L (profit/loss)

### Recent Trades Panel
Shows last 50 trades:
- **Green BUY** = Long entry
- **Red SELL** = Position exit
- P&L shown for closed trades
- Time of execution

### P&L Chart
- Line chart of cumulative profit/loss
- Green line = profitable
- Red line = losing
- Zero line for reference

## 🎨 Understanding Colors

- **Green** = Profit / BUY orders
- **Red** = Loss / SELL orders
- **Purple** = Primary theme color

## 🔄 Real-Time Updates

The dashboard updates automatically when:
1. ✅ New trade is executed
2. ✅ Price changes (every tick)
3. ✅ Position is opened/closed
4. ✅ P&L is recalculated

**No refresh needed!** Everything updates live via WebSocket.

## 🐛 Troubleshooting

### Dashboard Won't Load?
1. Make sure bot is running: `npm run start`
2. Check you see "Dashboard: http://localhost:3000" in console
3. Try refreshing the page
4. Check if another app is using port 3000

### No Trades Showing?
1. **Check market hours**: US markets open 9:30 AM - 4:00 PM ET
2. Wait a few minutes for strategy signals
3. Look at bot console for `[MOCK EXEC]` messages
4. Verify market data is flowing (check bot logs)

### Connection Status Red?
1. Bot might have crashed - check console
2. Refresh the dashboard page
3. Restart the bot
4. Wait 3 seconds for auto-reconnect

## 💡 Pro Tips

1. **Keep Both Open**: Bot console + Dashboard browser tab
2. **Watch Console**: See detailed logs while dashboard shows visuals
3. **Multiple Tabs**: Open dashboard in multiple browsers to test
4. **Mobile**: Dashboard works on phones too!

## 📊 Example Session

```
1. Start bot: npm run start
2. Open: http://localhost:3000
3. See: "Connected" status
4. Wait: Market data starts flowing
5. Watch: First trade appears (BUY 100 AAPL @ $270.05)
6. Monitor: P&L updates as price changes
7. See: Second trade (SELL 100 AAPL @ $270.50)
8. Result: +$45 profit shown in dashboard!
```

## 🎓 Learning Mode

Use the dashboard to:
- **Understand the strategy**: See when it buys/sells
- **Track performance**: Is it profitable?
- **Learn patterns**: What market conditions trigger trades?
- **Improve**: Adjust strategy parameters based on results

## 🚀 Next Steps

Once comfortable with the dashboard:
1. Read [DASHBOARD.md](DASHBOARD.md) for advanced features
2. Modify strategy parameters in `src/index.ts`
3. Try different symbols in `.env` file
4. Experiment with SMA windows (default: 5, 20)

---

**Enjoy your live trading dashboard!** 📊

Questions? Check [DASHBOARD.md](DASHBOARD.md) for full documentation.
