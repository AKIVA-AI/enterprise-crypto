# Enterprise Crypto

> **Open-source, multi-agent crypto trading system** — autonomous agents coordinate risk management, strategy execution, capital allocation, and market intelligence across multiple exchanges.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://img.shields.io/badge/CI-passing-brightgreen.svg)](.github/workflows/ci.yml)
[![Paper Trading](https://img.shields.io/badge/Default-Paper%20Mode-yellow.svg)](#safety-first)

---

## Why This Exists

Most crypto trading tools are either:
- **Too simple** — no risk controls, no audit trail, no multi-exchange support
- **Too expensive** — institutional platforms cost $50k+/year
- **Black boxes** — you can't see why trades were blocked or executed

Enterprise Crypto bridges this gap: **a coordinated multi-agent system with institutional-grade controls, open-source transparency, and zero cost.**

## Multi-Agent Architecture

The system is built around **10 specialized agents** that collaborate through a strict hierarchy. No single agent can act alone — every trade requires consensus across multiple agents with independent mandates.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRADING GATE                                │
│                  (The Constitution — Cannot Be Bypassed)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  👑 Meta-Decision Agent          SUPREME AUTHORITY                  │
│  │  Decides WHETHER trading is allowed at all.                      │
│  │  Has VETO POWER over all strategy agents.                        │
│  │                                                                  │
│  ├──▶ 💰 Capital Allocation Agent                                   │
│  │    Manages HOW MUCH capital each strategy receives.              │
│  │                                                                  │
│  ├──▶ 🧠 Strategy Agents (multiple)                                 │
│  │    Propose trade intents ONLY — never execute directly.          │
│  │    Must include edge estimate, confidence, worst-case loss.      │
│  │                                                                  │
│  ├──▶ 🛡️ Risk Agent                                                 │
│  │    Pre-trade and real-time risk checks. CANNOT be overridden.    │
│  │                                                                  │
│  ├──▶ ⚡ Execution Agent                                             │
│  │    Smart order routing, TWAP/VWAP algos, fill quality tracking.  │
│  │                                                                  │
│  ├──▶ 📊 Market Data Agent                                           │
│  │    Aggregates and normalizes real-time data from all venues.     │
│  │                                                                  │
│  ├──▶ 🔮 Intelligence Agent                                          │
│  │    On-chain analytics, sentiment, whale tracking, alpha signals. │
│  │                                                                  │
│  ├──▶ 🏦 Treasury Agent                                              │
│  │    Multi-venue balance management, rebalancing, NAV reporting.   │
│  │                                                                  │
│  ├──▶ 📋 Reconciliation Agent                                        │
│  │    Ensures consistency between internal records and venue data.  │
│  │                                                                  │
│  └──▶ 🔧 Operations Agent                                            │
│       System health, deployments, alerting, disaster recovery.      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent Hierarchy

| Agent | Role | Authority |
|-------|------|-----------|
| **Meta-Decision** 👑 | Decides if trading is allowed at all | Supreme — veto power over everything |
| **Risk** 🛡️ | Validates all trades against hard limits | Cannot be overridden by any agent |
| **Capital Allocation** 💰 | Assigns risk budget per strategy | Binding on all strategy agents |
| **Strategy** 🧠 | Proposes trade intents with edge estimates | Advisory only — cannot execute |
| **Execution** ⚡ | Routes and executes approved orders | Executes precisely, or not at all |
| **Market Data** 📊 | Real-time data aggregation and normalization | Feeds all downstream agents |
| **Intelligence** 🔮 | Alpha signals from on-chain, sentiment, news | Feeds strategy agents |
| **Treasury** 🏦 | Capital rebalancing across venues | Reports to Risk Agent |
| **Reconciliation** 📋 | Position and fill verification | Can trigger protective actions |
| **Operations** 🔧 | System health and infrastructure | Monitors all agents |

### Trade Intent Lifecycle

```
1. Intelligence Agent detects opportunity signals
   └─▶ Feeds alpha to Strategy Agents

2. Strategy Agent generates trade intent
   └─▶ Includes edge estimate, confidence, max loss

3. Meta-Decision Agent evaluates regime
   └─▶ Approves/rejects based on market conditions

4. Capital Allocation Agent assigns budget
   └─▶ Adjusts size based on strategy allocation

5. Risk Agent validates hard limits
   └─▶ Kill switch, position limits, exposure, daily loss

6. Execution Cost Gate checks profitability
   └─▶ Expected Edge > (Spread + Slippage + Fees + Buffer)

7. Execution Agent routes to optimal venue
   └─▶ TWAP/VWAP/iceberg execution

8. Reconciliation Agent verifies fills
   └─▶ Cross-checks internal vs. venue records

9. Decision Trace recorded
   └─▶ Full audit trail with human-readable explanation
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Fail-closed** | If any safety check fails, trading halts — never fails open |
| **Agents propose, gates decide** | Strategy agents cannot execute — only propose intents |
| **Paper mode default** | `paper_trading_mode = true` on fresh install |
| **Database-level risk** | Circuit breakers are Postgres triggers — can't be bypassed by app bugs |
| **RLS everywhere** | Every table has Row-Level Security; roles enforced at DB layer |
| **Inter-agent communication** | Redis pub/sub for low-latency agent coordination |

## Features

### Risk Management (Automated)
- **Kill Switch** — emergency halt all trading, one click
- **Circuit Breakers** — auto-freeze books when daily loss exceeds limits
- **Reduce-Only Mode** — 80% loss threshold triggers position-only-close mode
- **Position Limits** — max leverage, concentration, and exposure checks
- **Strategy Lifecycle** — quarantine, cooldown, and disable states

### Multi-Exchange Trading
- **Binance.US** — spot trading with full order book
- **Coinbase** — Advanced Trade API integration
- **Kraken** — spot trading with signed requests
- **Cross-Exchange Arbitrage** — automated spread detection
- **Retry Logic** — exponential backoff (3 attempts) on venue failures

### Intelligence & Signals
- **Market Pulse** — real-time sentiment and momentum indicators
- **Signal Scoring** — multi-factor composite scoring
- **Whale Alerts** — large transaction monitoring
- **Funding Rate Arbitrage** — perp vs spot spread detection
- **Macro Indicators** — FRED data integration

### Operations
- **Full Audit Trail** — every state change logged with before/after
- **RBAC** — admin, CIO, trader, ops, research, auditor, viewer roles
- **Telegram Alerts** — real-time notifications for critical events
- **Agent Health Monitoring** — heartbeat, CPU, memory per agent
- **Decision Traces** — see exactly why each trade was blocked or executed

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- A [Supabase](https://supabase.com/) project (free tier works)
- Exchange API keys (optional — paper mode works without them)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_ORG/enterprise-crypto.git
cd enterprise-crypto
bun install
```

### 2. Configure Supabase

```bash
# Copy environment template
cp .env.example .env

# Edit with your Supabase credentials
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
```

Update `supabase/config.toml` with your project ID:
```toml
project_id = "your-supabase-project-id"
```

### 3. Run Migrations

Apply the database schema via the Supabase dashboard SQL editor or CLI:
```bash
# Using Supabase CLI
supabase db push
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy --project-ref your-project-id
```

### 5. Start the Frontend

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign up to create your first account.

### 6. (Optional) Add Exchange Keys

Add API keys as Supabase secrets via the dashboard:
- `BINANCE_US_API_KEY` / `BINANCE_US_API_SECRET`
- `COINBASE_API_KEY` / `COINBASE_API_SECRET`
- `KRAKEN_API_KEY` / `KRAKEN_API_SECRET`
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`

## Safety First

⚠️ **This platform defaults to paper trading mode.** Live trading requires:

1. Explicitly setting `paper_trading_mode = false` in `global_settings`
2. Configuring exchange API keys with trade permissions
3. An admin-role user to disable paper mode

**Never skip the paper validation period.** Run for at least 1 week in paper mode before considering live trading.

## Project Structure

```
enterprise-crypto/
├── src/                          # React frontend
│   ├── components/               # UI components (shadcn/ui + custom)
│   │   ├── dashboard/            # Control center widgets
│   │   ├── trading/              # Order entry, P&L tracking
│   │   ├── intelligence/         # Market signals, scanners
│   │   ├── risk/                 # Risk management panels
│   │   ├── arbitrage/            # Cross-exchange arbitrage
│   │   ├── agents/               # Agent monitoring and control
│   │   └── layout/               # Navigation, sidebars
│   ├── hooks/                    # React hooks (metrics, realtime, shortcuts)
│   ├── lib/                      # Agent roles, trading gate, decision trace
│   ├── pages/                    # Route pages
│   └── integrations/supabase/    # Generated Supabase types & client
├── backend/
│   └── app/
│       ├── agents/               # Multi-agent system (Python)
│       │   ├── base_agent.py     # Base agent with Redis pub/sub
│       │   ├── meta_decision_agent.py
│       │   ├── capital_allocation_agent.py
│       │   ├── signal_agent.py   # Strategy agent
│       │   ├── risk_agent.py
│       │   ├── execution_agent.py
│       │   ├── arbitrage_agent.py
│       │   └── agent_orchestrator.py
│       ├── enterprise/           # RBAC, audit, compliance, risk limits
│       └── services/             # OMS, risk engine, portfolio engine
├── supabase/
│   ├── functions/                # Edge functions (Deno)
│   ├── migrations/               # Database schema migrations
│   └── config.toml               # Function configuration
├── docs/                         # Architecture, guides, runbooks
└── .env.example                  # Environment template
```

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

**We welcome:**
- Bug fixes (especially safety-related)
- New agent implementations
- Documentation improvements
- New exchange integrations (must follow adapter pattern)
- Test coverage improvements
- UI/UX enhancements

**We reject anything that weakens risk controls or bypasses agent hierarchy.**

## Security

See [SECURITY.md](SECURITY.md) for our security policy and vulnerability reporting.

## License

[MIT License](LICENSE) — see the trading disclaimer in the license file.

## Disclaimer

**Trading cryptocurrency involves substantial risk of loss.** This software is provided as-is, without warranty of any kind. The authors are not financial advisors and this platform is not financial advice. Always use paper/dry-run mode first. Never trade with funds you cannot afford to lose.

---

*Enterprise Crypto — Multi-agent trading infrastructure, open source.*
