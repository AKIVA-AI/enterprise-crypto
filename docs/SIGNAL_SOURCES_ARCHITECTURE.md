# Signal Sources Architecture

## Overview

This document outlines the verified capabilities and production requirements for the trading signal infrastructure.

---

## Current Signal Sources (Verified)

### 1. LunarCrush (Social Intelligence)
**Status**: ✅ Ready (works with simulated data, production-ready when API key added)

| Feature | Status | Notes |
|---------|--------|-------|
| Galaxy Score | ✅ | Social sentiment score (0-100) |
| Social Velocity | ✅ | Rate of social engagement change |
| Alt Rank | ✅ | Relative ranking vs other coins |
| Social Volume | ✅ | Total social mentions |
| Meme Momentum Signals | ✅ | Auto-generated for high-velocity coins |

**Production Requirement**: 
- Secret: `LUNARCRUSH_API_KEY`
- Obtain from: https://lunarcrush.com/developers
- Cost: Free tier available, paid for higher limits

**Signal Types Generated**:
- `lunarcrush_social` - Overall social sentiment
- `meme_momentum` - High social velocity detection

---

### 2. On-Chain/Whale Analytics
**Status**: ✅ Ready (uses internal whale tracking data)

| Feature | Status | Notes |
|---------|--------|-------|
| Whale Transaction Tracking | ✅ | Large transfers to/from exchanges |
| Exchange Flow Analysis | ✅ | Net inflow/outflow calculations |
| Smart Money Flow | ✅ | Institutional wallet tracking |
| Holder Concentration | ✅ | Top holder percentage analysis |

**Production Requirement**: 
- No external API needed (uses internal `whale_transactions` table)
- For real blockchain data, consider adding: Moralis, Alchemy, or Etherscan API

**Signal Types Generated**:
- `whale_activity` - Aggregate whale movements
- `whale_mega_transaction` - Large ($10M+) transactions
- `onchain_whale_flow` - Exchange flow direction
- `onchain_holder_analysis` - Holder behavior patterns

---

### 3. TradingView Webhooks
**Status**: ✅ Ready (webhook endpoint active)

| Feature | Status | Notes |
|---------|--------|-------|
| JSON Alert Parsing | ✅ | Full JSON payload support |
| Text Alert Parsing | ✅ | Simple text format support |
| Auto Trade Intent Creation | ✅ | Creates intents for buy/sell signals |
| Multi-format Support | ✅ | Comma or space separated |

**Production Requirement**:
- Secret: `TRADINGVIEW_WEBHOOK_SECRET` (optional but recommended)
- Webhook URL: `https://amvakxshlojoshdfcqos.supabase.co/functions/v1/tradingview-webhook`

**Signal Types Generated**:
- `tradingview_*` - Named by strategy/indicator

**TradingView Alert Format**:
```json
{
  "ticker": "BTCUSDT",
  "action": "buy",
  "price": 45000,
  "strategy": "momentum_cross",
  "strength": 0.8,
  "confidence": 0.7,
  "stop_loss": 44000,
  "take_profit": 48000,
  "secret": "your_webhook_secret"
}
```

Or simple text:
```
BTCUSDT buy 45000 strength=0.8 sl=44000 tp=48000 strategy=momentum
```

---

### 4. CryptoCompare
**Status**: ✅ Ready (simulated fallback available)

| Feature | Status | Notes |
|---------|--------|-------|
| IntoTheBlock Signals | ✅ | Large holder behavior |
| Address Net Growth | ✅ | New vs leaving addresses |
| In/Out Money Signals | ✅ | Profitable holder analysis |

**Production Requirement**:
- Secret: `CRYPTOCOMPARE_API_KEY`
- Obtain from: https://min-api.cryptocompare.com/

**Signal Types Generated**:
- `cryptocompare_onchain` - Aggregate on-chain sentiment

---

## Real-Time Price Data Sources

### Current Implementation

| Source | Type | Status | Use Case |
|--------|------|--------|----------|
| Binance WebSocket | Real-time | ✅ Active | Live price feed via `useLivePriceFeed` |
| Coinbase Public API | REST | ✅ Active | Ticker data, product info |
| Simulated Feed | Demo | ✅ Fallback | Development/demo mode |

### Binance WebSocket (Primary)
- **Endpoint**: `wss://stream.binance.com:9443/stream`
- **Data**: 24hr ticker updates (~1s latency)
- **Pairs**: All USDT pairs
- **No API key required** for public streams

### Coinbase (US-Compliant)
- **Endpoint**: `https://api.exchange.coinbase.com/products/{pair}/ticker`
- **Data**: Spot prices, bid/ask
- **For Trading**: Requires `COINBASE_API_KEY` + `COINBASE_API_SECRET`

---

## Production Data Sources Needed

### Priority 1: Already Integrated (Just Need API Keys)

| Service | Purpose | Secret Name | Status |
|---------|---------|-------------|--------|
| LunarCrush | Social/meme metrics | `LUNARCRUSH_API_KEY` | Ready to add |
| TradingView | TA webhooks | `TRADINGVIEW_WEBHOOK_SECRET` | Ready to add |
| Coinbase | US trading | `COINBASE_API_KEY`, `COINBASE_API_SECRET` | Ready to add |
| Kraken | US trading | `KRAKEN_API_KEY`, `KRAKEN_API_SECRET` | Ready to add |

### Priority 2: Recommended Additions

| Service | Purpose | Why Needed |
|---------|---------|------------|
| CoinGecko Pro | Token metadata, prices | More complete token coverage |
| Moralis | On-chain data | Real blockchain transaction data |
| Whale Alert API | Whale transactions | Real whale movement data |
| DeFiLlama | TVL data | DEX liquidity metrics |

### Priority 3: Advanced (Future)

| Service | Purpose | Why Needed |
|---------|---------|------------|
| Glassnode | On-chain analytics | Institutional-grade metrics |
| Santiment | Social + on-chain | Combined sentiment analysis |
| The Graph | DEX data | Real-time DEX trades |
| Nansen | Smart money tracking | Wallet labeling |

---

## SDK Requirements

### Currently NOT Required

| SDK | Reason |
|-----|--------|
| Coinbase SDK | ❌ Direct REST API with HMAC signing implemented |
| Binance SDK | ❌ Public WebSocket streams, no SDK needed |
| Kraken SDK | ❌ Direct REST API implemented |

### Implemented Without SDK

The system uses direct REST/WebSocket connections with proper authentication:

1. **Coinbase**: HMAC-SHA256 signing in `coinbase-trading/index.ts`
2. **Kraken**: HMAC-SHA512 signing in `kraken-trading/index.ts`
3. **Binance**: WebSocket streams (no auth for public data)

---

## Signal Aggregation Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   LunarCrush    │     │   On-Chain      │     │  TradingView    │
│   (Social)      │     │   (Whale)       │     │   (TA)          │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    intelligence_signals table                    │
│  (instrument, direction, strength, confidence, source_data)     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Signal Aggregation Engine                      │
│  - Source weighting (TradingView: 1.4x, LunarCrush: 1.2x)      │
│  - Time decay (4hr half-life)                                   │
│  - Confidence thresholds                                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      trade_intents table                         │
│  (direction, target_exposure, max_loss, confidence)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### External Signals
```
POST /functions/v1/external-signals
{
  "action": "fetch_all" | "fetch_signals" | "get_aggregated" | "get_status",
  "source": "lunarcrush" | "onchain" | "cryptocompare",
  "instruments": ["BTC-USDT", "ETH-USDT"]
}
```

### Whale Alerts
```
POST /functions/v1/whale-alerts
{
  "action": "simulate_whale_activity" | "generate_signals" | "get_transactions",
  "instruments": ["BTC-USDT", "ETH-USDT"]
}
```

### TradingView Webhook
```
POST /functions/v1/tradingview-webhook
Headers: x-tv-secret: your_secret
Body: { "ticker": "BTCUSDT", "action": "buy", ... }
```

---

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `intelligence_signals` | All signal data from all sources |
| `whale_transactions` | Tracked whale movements |
| `whale_wallets` | Known whale wallet addresses |
| `trade_intents` | Generated trading intentions |
| `market_snapshots` | Price snapshots |
| `onchain_metrics` | On-chain analytics data |
| `social_sentiment` | Social media metrics |
| `derivatives_metrics` | Funding rates, OI, liquidations |

---

## Confidence Levels

| Confidence | Meaning | Action |
|------------|---------|--------|
| < 0.50 | Insufficient data | Monitor only |
| 0.50-0.65 | Weak signal | Watch for confirmation |
| 0.65-0.75 | Moderate signal | Small position OK |
| 0.75-0.85 | Strong signal | Standard position |
| > 0.85 | High conviction | Full position |

---

## Next Steps for Production

1. **Add API Keys** (when ready):
   - `LUNARCRUSH_API_KEY`
   - `TRADINGVIEW_WEBHOOK_SECRET`
   - Exchange keys for live trading

2. **Enable Real Whale Tracking**:
   - Add Moralis or Whale Alert API for real blockchain data
   - Currently using simulated transactions

3. **Price Data Redundancy**:
   - Add CoinGecko as backup price source
   - Consider on-chain DEX prices via The Graph

4. **Monitoring**:
   - Set up signal quality dashboards
   - Alert on signal source failures
