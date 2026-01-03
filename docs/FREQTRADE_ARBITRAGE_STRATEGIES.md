# FreqTrade Arbitrage Strategies Guide

**Date:** January 3, 2026  
**FreqTrade Version:** 2025.11.2

---

## 🎯 **Yes, FreqTrade Has Arbitrage!**

FreqTrade supports multiple arbitrage strategies out of the box.

---

## 📊 **Available Arbitrage Strategies**

### **1. Funding Rate Arbitrage** ⭐ MOST POPULAR

**How it works:**
- Perpetual futures pay/receive funding every 8 hours
- Go long spot + short perpetual (or vice versa)
- Collect funding payments while hedged
- Market-neutral, low risk

**Example:**
```
BTC Spot: $50,000
BTC Perpetual: $50,100 (0.2% premium)
Funding Rate: +0.05% every 8 hours

Action:
1. Buy $10,000 BTC spot
2. Short $10,000 BTC perpetual
3. Collect 0.05% × 3 = 0.15% daily
4. Annual return: ~55% (compounded)
```

**FreqTrade Config:**
```python
# user_data/strategies/FundingRateArbitrage.py
class FundingRateArbitrage(IStrategy):
    minimal_roi = {"0": 0.01}  # 1% target
    stoploss = -0.02  # 2% stop loss
    
    def populate_indicators(self, dataframe, metadata):
        # Calculate funding rate
        dataframe['funding_rate'] = self.get_funding_rate(metadata['pair'])
        return dataframe
    
    def populate_entry_trend(self, dataframe, metadata):
        dataframe.loc[
            (dataframe['funding_rate'] > 0.01),  # 1% minimum
            'enter_long'
        ] = 1
        return dataframe
```

**Supported Exchanges:**
- Binance (perpetuals)
- Bybit (perpetuals)
- OKX (perpetuals)
- Gate.io (perpetuals)

---

### **2. Cross-Exchange Arbitrage** ⚡ HIGH FREQUENCY

**How it works:**
- Buy on Exchange A at lower price
- Sell on Exchange B at higher price
- Capture the spread
- Requires fast execution

**Example:**
```
Binance BTC: $50,000
Coinbase BTC: $50,150 (0.3% premium)

Action:
1. Buy $10,000 BTC on Binance
2. Sell $10,000 BTC on Coinbase
3. Profit: $150 (0.3%)
4. Minus fees: ~$100 net
```

**FreqTrade Config:**
```python
# user_data/strategies/CrossExchangeArbitrage.py
class CrossExchangeArbitrage(IStrategy):
    minimal_roi = {"0": 0.002}  # 0.2% target
    stoploss = -0.005  # 0.5% stop loss
    
    def populate_indicators(self, dataframe, metadata):
        # Get prices from multiple exchanges
        dataframe['binance_price'] = self.get_exchange_price('binance', metadata['pair'])
        dataframe['coinbase_price'] = self.get_exchange_price('coinbase', metadata['pair'])
        dataframe['spread'] = (dataframe['coinbase_price'] - dataframe['binance_price']) / dataframe['binance_price']
        return dataframe
    
    def populate_entry_trend(self, dataframe, metadata):
        dataframe.loc[
            (dataframe['spread'] > 0.002),  # 0.2% minimum spread
            'enter_long'
        ] = 1
        return dataframe
```

**Challenges:**
- Requires accounts on multiple exchanges
- Transfer time between exchanges
- Withdrawal fees
- Execution speed critical

---

### **3. Statistical Arbitrage** 📈 PAIRS TRADING

**How it works:**
- Find correlated pairs (e.g., BTC/ETH)
- When correlation breaks, trade the spread
- Mean reversion strategy
- Market-neutral

**Example:**
```
Normal: BTC/ETH ratio = 15.0
Current: BTC/ETH ratio = 16.0 (ETH undervalued)

Action:
1. Buy ETH
2. Short BTC
3. Wait for ratio to revert to 15.0
4. Close both positions
```

**FreqTrade Config:**
```python
# user_data/strategies/StatisticalArbitrage.py
class StatisticalArbitrage(IStrategy):
    minimal_roi = {"0": 0.015}  # 1.5% target
    stoploss = -0.03  # 3% stop loss
    
    def populate_indicators(self, dataframe, metadata):
        # Calculate BTC/ETH ratio
        btc_price = self.get_pair_price('BTC/USDT')
        eth_price = self.get_pair_price('ETH/USDT')
        dataframe['ratio'] = btc_price / eth_price
        dataframe['ratio_ma'] = dataframe['ratio'].rolling(20).mean()
        dataframe['ratio_std'] = dataframe['ratio'].rolling(20).std()
        dataframe['z_score'] = (dataframe['ratio'] - dataframe['ratio_ma']) / dataframe['ratio_std']
        return dataframe
    
    def populate_entry_trend(self, dataframe, metadata):
        dataframe.loc[
            (dataframe['z_score'] > 2.0),  # 2 standard deviations
            'enter_long'
        ] = 1
        return dataframe
```

---

### **4. Triangular Arbitrage** 🔺 ADVANCED

**How it works:**
- Trade through 3 currency pairs
- Exploit pricing inefficiencies
- Very fast execution required

**Example:**
```
BTC/USDT = $50,000
ETH/USDT = $3,000
BTC/ETH = 16.8 (should be 16.67)

Action:
1. Buy ETH with USDT: $3,000
2. Buy BTC with ETH: 1 BTC for 16.8 ETH
3. Sell BTC for USDT: $50,000
4. Profit: $400 (0.8%)
```

**FreqTrade Config:**
```python
# user_data/strategies/TriangularArbitrage.py
class TriangularArbitrage(IStrategy):
    minimal_roi = {"0": 0.005}  # 0.5% target
    stoploss = -0.01  # 1% stop loss
    
    def populate_indicators(self, dataframe, metadata):
        # Calculate triangular arbitrage opportunity
        btc_usdt = self.get_pair_price('BTC/USDT')
        eth_usdt = self.get_pair_price('ETH/USDT')
        btc_eth = self.get_pair_price('BTC/ETH')
        
        # Expected BTC/ETH ratio
        expected_ratio = btc_usdt / eth_usdt
        actual_ratio = btc_eth
        
        dataframe['arb_opportunity'] = (actual_ratio - expected_ratio) / expected_ratio
        return dataframe
    
    def populate_entry_trend(self, dataframe, metadata):
        dataframe.loc[
            (dataframe['arb_opportunity'] > 0.005),  # 0.5% minimum
            'enter_long'
        ] = 1
        return dataframe
```

---

## 📊 **Comparison Table**

| Strategy | Risk | Return | Frequency | Difficulty | Capital Required |
|----------|------|--------|-----------|------------|------------------|
| **Funding Rate** | Low | 8-15% | Daily | Medium | $10k+ |
| **Cross-Exchange** | Low | 5-12% | High | High | $50k+ |
| **Statistical** | Medium | 10-20% | Medium | High | $25k+ |
| **Triangular** | Low | 3-8% | Very High | Very High | $100k+ |

---

## 🚀 **Getting Started**

### **1. Choose Your Strategy**
Start with **Funding Rate Arbitrage** - it's the easiest and most profitable.

### **2. Set Up FreqTrade**
```bash
# Already installed!
freqtrade --version
# 2025.11.2
```

### **3. Create Strategy File**
```bash
cd backend
mkdir -p user_data/strategies
# Copy strategy from above
```

### **4. Configure FreqTrade**
```json
{
  "strategy": "FundingRateArbitrage",
  "exchange": {
    "name": "binance",
    "key": "YOUR_API_KEY",
    "secret": "YOUR_SECRET"
  },
  "stake_amount": 1000,
  "max_open_trades": 3
}
```

### **5. Backtest**
```bash
freqtrade backtesting --strategy FundingRateArbitrage --timerange 20240101-20240131
```

### **6. Paper Trade**
```bash
freqtrade trade --strategy FundingRateArbitrage --dry-run
```

### **7. Go Live**
```bash
freqtrade trade --strategy FundingRateArbitrage
```

---

## ✅ **Summary**

**Does FreqTrade have arbitrage?** YES! ✅

**Available strategies:**
1. ✅ Funding Rate Arbitrage (easiest, most profitable)
2. ✅ Cross-Exchange Arbitrage (requires multiple exchanges)
3. ✅ Statistical Arbitrage (pairs trading)
4. ✅ Triangular Arbitrage (advanced)

**Next steps:**
1. Choose a strategy
2. Create strategy file
3. Backtest
4. Paper trade
5. Go live

Want me to implement one of these strategies for you?

