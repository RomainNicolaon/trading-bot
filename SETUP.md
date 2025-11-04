# Quick Setup Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Get Your API Key

1. Go to [polygon.io/dashboard/signup](https://polygon.io/dashboard/signup)
2. Sign up for a **free account**
3. Copy your API key from the dashboard

### Step 3: Configure

**Option A: Create .env file (Easiest)**
```bash
# Create .env file
echo POLYGON_API_KEY=your_key_here > .env
echo SYMBOLS=AAPL,TSLA >> .env
```

**Option B: Set environment variable**
```powershell
# Windows PowerShell
$env:POLYGON_API_KEY="your_key_here"
```

### Step 4: Run!
```bash
npm run start
```

## ✅ Expected Output

When working correctly, you should see:
```
🤖 Trading Bot Starting...
📊 Symbols: [ 'AAPL', 'TSLA' ]
📈 Strategy: SMA(5,20) Crossover
🔑 API Key: ✅ Set
---
{"level":30,"time":...,"msg":"ws open, authenticating"}
{"level":30,"time":...,"msg":"ws authenticated"}
```

## ❌ Common Issues

### Issue: "ws closed" immediately after "ws open"
**Cause**: Missing or invalid API key

**Solution**: 
1. Check your API key is set: `echo $env:POLYGON_API_KEY`
2. Verify it's correct on [polygon.io/dashboard](https://polygon.io/dashboard)
3. Make sure you copied the entire key (no spaces)

### Issue: "API Key: ❌ Missing"
**Cause**: Environment variable not set

**Solution**:
```powershell
# Set it for current session
$env:POLYGON_API_KEY="your_key_here"

# Or create .env file (permanent)
echo POLYGON_API_KEY=your_key_here > .env
```

### Issue: No trade data coming in
**Cause**: Market is closed or symbols are not trading

**Solution**:
- Stock market hours: 9:30 AM - 4:00 PM ET (Monday-Friday)
- Try during market hours
- Check if symbols are valid

## 🎯 Testing Without API Key

If you want to test the code structure without connecting to Polygon:

1. Comment out the WebSocket connection in `src/index.ts`
2. Create mock data to test the strategy
3. Run unit tests: `npm test`

## 📚 Next Steps

Once running:
1. Watch for `[MOCK EXEC]` messages showing trade signals
2. Review the strategy logic in `src/engine/sma-strategy.ts`
3. Modify the SMA windows (default: 5, 20) to experiment
4. Add more symbols in `.env` file

## 🆘 Still Having Issues?

Check:
1. Node.js version: `node --version` (should be v18+)
2. Dependencies installed: `npm list`
3. TypeScript compiles: `npm run build`
4. API key is valid on Polygon dashboard

---

**Need Help?** Check the main [README.md](README.md) for detailed documentation.
