// Dashboard WebSocket client
let ws;
let trades = [];
let positions = [];
let pnlHistory = [];
let chart;

// Connect to WebSocket server
function connect() {
    ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
        console.log('Connected to dashboard server');
        updateConnectionStatus(true);
    };
    
    ws.onclose = () => {
        console.log('Disconnected from dashboard server');
        updateConnectionStatus(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
}

function handleMessage(data) {
    switch (data.type) {
        case 'initial':
            trades = data.trades || [];
            positions = data.positions || [];
            renderAll();
            break;
            
        case 'trade':
            trades.unshift(data.trade); // Add to beginning
            if (trades.length > 100) trades.pop(); // Keep last 100
            positions = data.positions || [];
            renderAll();
            playNotificationSound();
            break;
            
        case 'price_update':
            positions = data.positions || [];
            renderPositions();
            updateSummary();
            break;
    }
}

function renderAll() {
    renderPositions();
    renderTrades();
    updateSummary();
    updateChart();
}

function renderPositions() {
    const container = document.getElementById('positionsContainer');
    
    if (positions.length === 0) {
        container.innerHTML = '<div class="empty-state">No open positions</div>';
        return;
    }
    
    container.innerHTML = positions.map(pos => {
        const pnlClass = pos.unrealizedPnl >= 0 ? 'positive' : 'negative';
        const pnlSign = pos.unrealizedPnl >= 0 ? '+' : '';
        
        return `
            <div class="position-item">
                <div class="position-header">
                    <div class="position-symbol">${pos.symbol}</div>
                    <div class="position-pnl ${pnlClass}">
                        ${pnlSign}$${pos.unrealizedPnl.toFixed(2)}
                    </div>
                </div>
                <div class="position-details">
                    <div class="position-detail">
                        <div class="position-detail-label">Quantity</div>
                        <div class="position-detail-value">${pos.quantity}</div>
                    </div>
                    <div class="position-detail">
                        <div class="position-detail-label">Avg Price</div>
                        <div class="position-detail-value">$${pos.avgPrice.toFixed(2)}</div>
                    </div>
                    <div class="position-detail">
                        <div class="position-detail-label">Current Price</div>
                        <div class="position-detail-value">$${pos.currentPrice.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTrades() {
    const container = document.getElementById('tradesContainer');
    
    if (trades.length === 0) {
        container.innerHTML = '<div class="empty-state">No trades yet</div>';
        return;
    }
    
    container.innerHTML = trades.slice(0, 50).map(trade => {
        const sideClass = trade.side.toLowerCase();
        const time = new Date(trade.timestamp).toLocaleTimeString();
        const pnlHtml = trade.pnl !== undefined ? `
            <div class="trade-pnl ${trade.pnl >= 0 ? 'positive' : 'negative'}">
                ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}
            </div>
        ` : '';
        
        return `
            <div class="trade-item ${sideClass}">
                <div class="trade-info">
                    <div class="trade-side ${sideClass}">${trade.side}</div>
                    <div>
                        <div class="trade-symbol">${trade.symbol}</div>
                        <div class="trade-details">
                            ${trade.quantity} @ $${trade.price.toFixed(2)}
                        </div>
                    </div>
                </div>
                <div>
                    ${pnlHtml}
                    <div class="trade-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateSummary() {
    // Calculate total P&L
    const totalPnl = positions.reduce((sum, pos) => 
        sum + pos.realizedPnl + pos.unrealizedPnl, 0
    );
    
    const totalPnlEl = document.getElementById('totalPnl');
    totalPnlEl.textContent = `$${totalPnl.toFixed(2)}`;
    totalPnlEl.className = 'card-value ' + (totalPnl >= 0 ? 'positive' : 'negative');
    
    // Total trades
    document.getElementById('totalTrades').textContent = trades.length;
    
    // Win rate
    const closedTrades = trades.filter(t => t.pnl !== undefined);
    const wins = closedTrades.filter(t => t.pnl > 0).length;
    const losses = closedTrades.filter(t => t.pnl < 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length * 100).toFixed(1) : 0;
    
    document.getElementById('winRate').textContent = `${winRate}%`;
    document.getElementById('winLoss').textContent = `${wins}W / ${losses}L`;
    
    // Active positions
    const activeCount = positions.filter(p => p.quantity > 0).length;
    document.getElementById('activePositions').textContent = activeCount;
    
    // P&L percentage (assuming starting capital of $10,000)
    const startingCapital = 10000;
    const pnlPercent = ((totalPnl / startingCapital) * 100).toFixed(2);
    const pnlPercentEl = document.getElementById('pnlPercent');
    pnlPercentEl.textContent = `${pnlPercent >= 0 ? '+' : ''}${pnlPercent}%`;
    pnlPercentEl.style.color = totalPnl >= 0 ? '#10b981' : '#ef4444';
}

function updateChart() {
    const canvas = document.getElementById('pnlChart');
    const ctx = canvas.getContext('2d');
    
    // Calculate cumulative P&L over time
    let cumulativePnl = 0;
    const pnlData = trades.slice().reverse().map(trade => {
        if (trade.pnl !== undefined) {
            cumulativePnl += trade.pnl;
        }
        return {
            time: new Date(trade.timestamp),
            pnl: cumulativePnl
        };
    });
    
    if (pnlData.length === 0) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // make canvas hidden
        canvas.style.display = 'none';
        
        const emptyState = document.getElementById('empty-state');
        emptyState.textContent = 'No P&L data yet';
        emptyState.style.fontSize = '24px';
        emptyState.style.color = '#9ca3af';
        emptyState.style.textAlign = 'center';
        return;
    }
    
    // Simple line chart
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;
    
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Find min/max
    const maxPnl = Math.max(...pnlData.map(d => d.pnl), 0);
    const minPnl = Math.min(...pnlData.map(d => d.pnl), 0);
    const range = maxPnl - minPnl || 1;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    // Draw zero line
    const zeroY = padding + chartHeight - ((0 - minPnl) / range * chartHeight);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, zeroY);
    ctx.lineTo(canvas.width - padding, zeroY);
    ctx.stroke();
    
    // Draw P&L line
    ctx.strokeStyle = cumulativePnl >= 0 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    pnlData.forEach((point, i) => {
        const x = padding + (i / (pnlData.length - 1 || 1)) * chartWidth;
        const y = padding + chartHeight - ((point.pnl - minPnl) / range * chartHeight);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
        const value = maxPnl - (range / 5) * i;
        const y = padding + (chartHeight / 5) * i;
        ctx.fillText(`$${value.toFixed(0)}`, padding - 10, y + 4);
    }
    
    // Current P&L label
    ctx.textAlign = 'left';
    ctx.fillStyle = cumulativePnl >= 0 ? '#10b981' : '#ef4444';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`Current: $${cumulativePnl.toFixed(2)}`, canvas.width - padding + 10, 30);
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    if (connected) {
        dot.className = 'status-dot connected';
        text.textContent = 'Connected';
    } else {
        dot.className = 'status-dot disconnected';
        text.textContent = 'Disconnected';
    }
}

function checkMarketStatus() {
    const now = new Date();
    
    // Convert to ET (UTC-5 or UTC-4 depending on DST)
    const etOffset = -5; // Standard time, adjust for DST if needed
    const etTime = new Date(now.getTime() + (etOffset * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = hours * 60 + minutes; // Minutes since midnight
    
    const dot = document.getElementById('marketDot');
    const text = document.getElementById('marketText');
    
    // Weekend
    if (day === 0 || day === 6) {
        dot.className = 'market-dot closed';
        text.textContent = 'Market Closed (Weekend)';
        return;
    }
    
    // Market hours in ET
    const preMarketStart = 4 * 60; // 4:00 AM
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    const afterHoursEnd = 20 * 60; // 8:00 PM
    
    if (currentTime >= marketOpen && currentTime < marketClose) {
        // Regular market hours
        dot.className = 'market-dot open';
        const closeTime = new Date(etTime);
        closeTime.setHours(16, 0, 0);
        const minutesUntilClose = Math.floor((closeTime - etTime) / 60000);
        text.textContent = `Market Open (closes in ${Math.floor(minutesUntilClose / 60)}h ${minutesUntilClose % 60}m)`;
    } else if (currentTime >= preMarketStart && currentTime < marketOpen) {
        // Pre-market
        dot.className = 'market-dot pre-market';
        const openTime = new Date(etTime);
        openTime.setHours(9, 30, 0);
        const minutesUntilOpen = Math.floor((openTime - etTime) / 60000);
        text.textContent = `Pre-Market (opens in ${Math.floor(minutesUntilOpen / 60)}h ${minutesUntilOpen % 60}m)`;
    } else if (currentTime >= marketClose && currentTime < afterHoursEnd) {
        // After hours
        dot.className = 'market-dot after-hours';
        text.textContent = 'After Hours Trading';
    } else {
        // Closed
        dot.className = 'market-dot closed';
        text.textContent = 'Market Closed';
    }
}

function updateMarketStatus() {
    checkMarketStatus();
    // Update every minute
    setInterval(checkMarketStatus, 60000);
}

function playNotificationSound() {
    // Simple beep using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Ignore audio errors
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    connect();
    updateMarketStatus();
    
    // Update chart on window resize
    window.addEventListener('resize', () => {
        if (trades.length > 0) {
            updateChart();
        }
    });
});
