# 📊 Trading Bot Dashboard

## Overview

A real-time web dashboard that visualizes your trading bot's performance, showing live trades, positions, P&L, and performance metrics.

![Dashboard Preview](https://via.placeholder.com/800x400/667eea/ffffff?text=Trading+Bot+Dashboard)

## ✨ Features

### Real-Time Updates
- **Live Trade Feed**: See every buy/sell as it happens
- **Position Tracking**: Monitor all open positions with live P&L
- **Price Updates**: Real-time price changes for accurate P&L calculation
- **WebSocket Connection**: Instant updates with no page refresh needed

### Performance Metrics
- **Total P&L**: Combined realized + unrealized profit/loss
- **Win Rate**: Percentage of profitable trades
- **Trade Count**: Total number of executed trades
- **Active Positions**: Number of currently open positions

### Visualizations
- **P&L Chart**: Line chart showing cumulative profit/loss over time
- **Position Cards**: Detailed view of each open position
- **Trade History**: Scrollable list of recent trades with P&L

### Smart Features
- **Audio Notifications**: Beep sound when new trades execute
- **Color Coding**: Green for profits, red for losses
- **Auto-Reconnect**: Automatically reconnects if connection drops
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### 1. Start the Bot

```bash
npm run start
```

The dashboard server starts automatically on port 3000.

### 2. Open Dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

### 3. Watch Live Trading

You'll see:
- ✅ **Connected** status indicator
- 📊 Real-time trade updates
- 📈 Live P&L calculations
- 🎯 Performance statistics

## 📸 Dashboard Sections

### Header
- **Title**: Trading Bot Dashboard
- **Connection Status**: Shows if connected to bot (green dot = connected)

### Summary Cards (Top Row)
1. **Total P&L**: Your total profit/loss in dollars and percentage
2. **Total Trades**: Number of trades executed
3. **Win Rate**: Percentage of winning trades (Wins/Losses)
4. **Active Positions**: Number of currently open positions

### Current Positions Panel
Shows all open positions with:
- **Symbol**: Stock ticker (e.g., AAPL, TSLA)
- **Unrealized P&L**: Current profit/loss (not yet closed)
- **Quantity**: Number of shares held
- **Avg Price**: Average purchase price
- **Current Price**: Latest market price

### Recent Trades Panel
Scrollable list of recent trades showing:
- **Side**: BUY (green) or SELL (red)
- **Symbol**: Stock ticker
- **Quantity & Price**: Trade details
- **P&L**: Realized profit/loss (for SELL orders)
- **Time**: When the trade was executed

### P&L Chart (Bottom)
Line chart showing:
- **Cumulative P&L**: Total profit/loss over time
- **Zero Line**: Reference line at $0
- **Current Value**: Latest P&L displayed in corner

## 🎨 Color Scheme

- **Positive P&L**: Green (#10b981)
- **Negative P&L**: Red (#ef4444)
- **BUY Orders**: Green background
- **SELL Orders**: Red background
- **Primary**: Purple gradient (#667eea to #764ba2)

## 🔧 Technical Details

### Architecture

```
┌─────────────────────────────────────────┐
│         Trading Bot (index.ts)          │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │    Position Tracker              │  │
│  │    - Records trades              │  │
│  │    - Calculates P&L              │  │
│  │    - Tracks positions            │  │
│  └──────────────────────────────────┘  │
│                 │                       │
│                 ▼                       │
│  ┌──────────────────────────────────┐  │
│  │    Dashboard Server              │  │
│  │    - HTTP server (port 3000)     │  │
│  │    - WebSocket server            │  │
│  │    - Broadcasts updates          │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
                 │
                 │ WebSocket
                 ▼
┌─────────────────────────────────────────┐
│      Web Browser (Dashboard UI)         │
│                                         │
│  - HTML/CSS/JS                          │
│  - Real-time updates                    │
│  - Charts & visualizations              │
└─────────────────────────────────────────┘
```

### Files

#### Backend
- **`src/dashboard/server.ts`**: WebSocket server and HTTP server
- **`src/execution/position-tracker.ts`**: Position and P&L tracking
- **`src/execution/mock-exec.ts`**: Order execution with tracking

#### Frontend
- **`src/dashboard/dashboard.html`**: Dashboard UI structure
- **`src/dashboard/dashboard.css`**: Styling and animations
- **`src/dashboard/dashboard.js`**: WebSocket client and UI updates

### WebSocket Messages

#### Server → Client

**Initial State**
```json
{
  "type": "initial",
  "trades": [...],
  "positions": [...]
}
```

**New Trade**
```json
{
  "type": "trade",
  "trade": {
    "id": "T1",
    "timestamp": 1699123456789,
    "symbol": "AAPL",
    "side": "BUY",
    "quantity": 100,
    "price": 150.25,
    "pnl": 125.50
  },
  "positions": [...]
}
```

**Price Update**
```json
{
  "type": "price_update",
  "positions": [...]
}
```

## 📊 P&L Calculation

### Unrealized P&L (Open Positions)
```
Unrealized P&L = (Current Price - Average Price) × Quantity
```

**Example**:
- Bought 100 AAPL @ $150
- Current price: $155
- Unrealized P&L = ($155 - $150) × 100 = **+$500**

### Realized P&L (Closed Positions)
```
Realized P&L = (Sell Price - Average Buy Price) × Quantity
```

**Example**:
- Bought 100 AAPL @ $150
- Sold 100 AAPL @ $155
- Realized P&L = ($155 - $150) × 100 = **+$500**

### Total P&L
```
Total P&L = Sum of (Realized P&L + Unrealized P&L) for all positions
```

## 🎯 Usage Examples

### Monitoring Live Trading

1. Start bot: `npm run start`
2. Open dashboard: `http://localhost:3000`
3. Watch trades appear in real-time
4. Monitor P&L as prices change

### Analyzing Performance

Check the summary cards to see:
- Are you profitable overall?
- What's your win rate?
- How many positions are open?

### Reviewing Trade History

Scroll through recent trades to:
- See which trades were profitable
- Identify patterns in your strategy
- Verify execution prices

## 🔍 Troubleshooting

### Dashboard Won't Load

**Problem**: Page shows "Cannot connect"

**Solutions**:
1. Make sure bot is running: `npm run start`
2. Check port 3000 is not in use
3. Try refreshing the page
4. Check browser console for errors

### No Trades Showing

**Problem**: Dashboard is empty

**Solutions**:
1. Wait for market hours (9:30 AM - 4:00 PM ET)
2. Verify bot is receiving market data
3. Check if strategy is generating signals
4. Look at bot console for trade logs

### Connection Status Red

**Problem**: "Disconnected" status

**Solutions**:
1. Restart the bot
2. Refresh the dashboard page
3. Check if port 3000 is accessible
4. Wait 3 seconds for auto-reconnect

### P&L Seems Wrong

**Problem**: Numbers don't match expectations

**Solutions**:
1. Remember: P&L includes both realized and unrealized
2. Check if positions are open (unrealized) or closed (realized)
3. Verify trade prices in the trade history
4. Restart bot to reset tracking

## 🎨 Customization

### Change Port

Edit `src/index.ts`:
```typescript
const dashboardServer = new DashboardServer(3000); // Change port here
```

### Modify Colors

Edit `src/dashboard/dashboard.css`:
```css
.card-value.positive {
    color: #10b981; /* Change profit color */
}

.card-value.negative {
    color: #ef4444; /* Change loss color */
}
```

### Adjust Update Frequency

Edit `src/index.ts`:
```typescript
setInterval(() => {
  // Log stats
}, 60000); // Change interval (milliseconds)
```

## 📱 Mobile View

The dashboard is fully responsive:
- **Desktop**: Full layout with all panels
- **Tablet**: Stacked panels
- **Mobile**: Single column, optimized for small screens

## 🔐 Security Notes

### Local Network Only

By default, the dashboard only accepts connections from `localhost`. To allow network access:

1. Modify `src/dashboard/server.ts`
2. Change `listen` to bind to `0.0.0.0`
3. **Warning**: Only do this on trusted networks!

### Production Deployment

For production use, add:
- **Authentication**: Login system
- **HTTPS**: SSL/TLS encryption
- **Rate Limiting**: Prevent abuse
- **Access Control**: IP whitelisting

## 🚀 Advanced Features

### Export Data

Add export functionality to save:
- Trade history as CSV
- P&L reports
- Performance metrics

### Alerts

Add notifications for:
- Large losses
- Win/loss streaks
- Position limits reached

### Multiple Strategies

Track performance per strategy:
- Compare different algorithms
- A/B testing
- Strategy allocation

## 📖 Related Documentation

- [README.md](README.md) - Main project documentation
- [ALPACA_SETUP.md](ALPACA_SETUP.md) - Data provider setup
- [CODE_REVIEW.md](CODE_REVIEW.md) - Code quality analysis

---

**Enjoy your real-time trading dashboard!** 📊🚀

For issues or questions, check the troubleshooting section above.
