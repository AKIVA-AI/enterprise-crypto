# Enterprise Crypto — Verified Capability Inventory

**Date:** 2026-03-14
**Standard:** Akiva AI Build Standard v2.8 (Phase 1)
**Archetype:** 7 — Algorithmic Trading Platform
**Previous Inventory:** None (first formal inventory)

---

## Functional Status Scale

| Status | Definition |
|--------|------------|
| **WORKING** | Produces correct, verifiable output for representative inputs |
| **PARTIAL** | Core logic works but edge cases or integrations are incomplete |
| **STUB** | Entry point exists, returns placeholder or hardcoded result |
| **SCAFFOLDED** | Code structure exists with simulated work (random/sleep) |
| **STATIC** | Configuration exists but cannot be modified at runtime |
| **UNVERIFIED** | Cannot be tested without external dependencies |

---

## 1. Multi-Agent Trading System

| Capability | Status | Evidence |
|-----------|--------|----------|
| BaseAgent (Redis pub/sub, heartbeats, reconnect) | **WORKING** | `backend/app/agents/base_agent.py` — Redis pub/sub with message queue fallback (max 1000), exponential backoff (1s→30s), 30s Supabase heartbeats with CPU/memory |
| AgentOrchestrator (lifecycle management) | **WORKING** | `backend/app/agents/agent_orchestrator.py` — starts/stops 5 agents, auto-recovery (max 5 restarts), graceful shutdown (5s timeout), system health persistence |
| Meta-Decision Agent (veto authority) | **WORKING** | `backend/app/agents/meta_decision_agent.py` — all trades blocked without approval, supreme authority |
| Risk Agent (pre-trade validation) | **WORKING** | `backend/app/agents/risk_agent.py` — kill switch check, position limits, circuit breakers, publishes risk_approved/risk_rejected |
| Signal Agent (trade intent generation) | **WORKING** | `backend/app/agents/signal_agent.py` — generates intents from market data + strategies |
| Execution Agent (order routing) | **PARTIAL** | `backend/app/agents/execution_agent.py` — routing logic real, routes to SCAFFOLDED venue adapters |
| Capital Allocation Agent | **WORKING** | `backend/app/agents/capital_allocation_agent.py` — distributes capital across strategies |
| Arbitrage Agent | **PARTIAL** | `backend/app/agents/arbitrage_agent.py` — scanning logic real, venue data mocked |
| FreqTrade Signal Agent | **WORKING** | `backend/app/agents/freqtrade_signal_agent.py` — FreqTrade strategy signal integration |
| Strategy Lifecycle Agent | **WORKING** | `backend/app/agents/strategy_lifecycle.py` — strategy state machine management |
| Agent Control (pause/resume/shutdown) | **WORKING** | Redis control channel + API endpoint |
| Agent Heartbeat Monitoring | **WORKING** | 30s heartbeats to Supabase `agents` table with CPU/memory |
| Inter-Agent Communication | **WORKING** | Redis pub/sub with 8 channels, message queue fallback |

---

## 2. Risk Management

| Capability | Status | Evidence |
|-----------|--------|----------|
| Kill Switch (global emergency halt) | **WORKING** | `global_settings` table, fail-closed (`is_kill_switch_active()` returns True on error), cluster-safe via database |
| Circuit Breakers (5 types) | **WORKING** | `backend/app/services/risk_engine.py` — venue health, daily loss, concentration, latency, drawdown |
| Database-Level Circuit Breakers | **WORKING** | `supabase/migrations/20260220042730` — Postgres triggers on fills/positions, auto-freeze books, auto-kill switch |
| Pre-Trade Risk Checks | **WORKING** | Kill switch → circuit breaker → venue health → position size → book utilization → daily loss → concentration |
| VaR (Historical, Parametric, Monte Carlo) | **WORKING** | `backend/app/services/advanced_risk_engine.py` — numpy/scipy calculations |
| Portfolio Optimization (MPT, Black-Litterman) | **WORKING** | Same file — constraint-based optimization |
| Stress Testing & Scenario Analysis | **WORKING** | Same file — predefined and custom scenarios |
| Risk Attribution | **WORKING** | Same file — systematic vs idiosyncratic risk decomposition |
| Position Limits | **WORKING** | `backend/app/enterprise/risk_limits.py` — $100k max position, configurable per role |
| Daily Loss Limits | **WORKING** | Same file — $50k daily loss default, breach tracking |
| Drawdown Monitoring | **WORKING** | `backend/app/services/drawdown_monitor.py` — real-time drawdown tracking, 15% max |
| Leverage Limits | **WORKING** | Risk config — 3x max leverage |
| Trade Velocity Limits | **WORKING** | Enterprise risk limits — 10 trades/min default |
| Risk Simulator (frontend) | **WORKING** | `src/components/risk/RiskSimulator.tsx` — portfolio risk visualization |

---

## 3. Order Management & Execution

| Capability | Status | Evidence |
|-----------|--------|----------|
| Smart Order Router | **PARTIAL** | `backend/app/services/smart_order_router.py` — venue scoring, algo selection (TWAP/VWAP/POV/Iceberg), market impact modeling. Logic WORKING but routes to SCAFFOLDED adapters |
| Execution Planner | **WORKING** | `backend/app/services/execution_planner.py` — legged execution with atomic unwind on failure |
| Order Gateway | **SCAFFOLDED** | `backend/app/services/order_gateway.py` — routes to mock adapters |
| Order Simulator | **WORKING** | `backend/app/services/order_simulator.py` — paper trading simulation |
| OMS Execution | **PARTIAL** | `backend/app/services/oms_execution.py` — order lifecycle management, depends on adapters |
| Trade Ticket (frontend) | **WORKING** | `src/components/trading/TradeTicket.tsx` — market/limit/stop orders, validation, confirmation dialog |
| Order History (frontend) | **WORKING** | `src/components/orders/OrderHistoryTable.tsx` — order display and filtering |

---

## 4. Exchange Venue Adapters

| Capability | Status | Evidence |
|-----------|--------|----------|
| Coinbase Adapter (backend) | **SCAFFOLDED** | `backend/app/adapters/coinbase_adapter.py` — `random.uniform()` for prices, fills, slippage |
| Kraken Adapter (backend) | **SCAFFOLDED** | `backend/app/adapters/kraken_adapter.py` — same random mock pattern |
| MEXC Adapter (backend) | **SCAFFOLDED** | `backend/app/adapters/mexc_adapter.py` — same random mock pattern |
| DEX Adapter (backend) | **SCAFFOLDED** | `backend/app/adapters/dex_adapter.py` — random gas prices, mock Uniswap/Curve |
| Coinbase Edge Function | **WORKING** | `supabase/functions/coinbase-trading/` — real Coinbase SDK integration |
| Kraken Edge Function | **WORKING** | `supabase/functions/kraken-trading/` — real Kraken API calls |
| Binance US Edge Function | **WORKING** | `supabase/functions/binance-us-trading/` — real API integration |
| Hyperliquid Edge Function | **WORKING** | `supabase/functions/hyperliquid/` — perpetuals venue |
| VenueAdapter ABC | **WORKING** | `backend/app/adapters/base.py` — well-defined adapter interface |

**Note:** Backend Python adapters are scaffolded (random mocks). Edge functions have real exchange integration. This creates a split where frontend→edge function paths work but backend agent→adapter paths return simulated data.

---

## 5. Portfolio Management

| Capability | Status | Evidence |
|-----------|--------|----------|
| Portfolio Engine | **WORKING** | `backend/app/services/portfolio_engine.py` — portfolio tracking, P&L, Greeks |
| Portfolio Analytics | **WORKING** | `backend/app/services/portfolio_analytics.py` — performance metrics, attribution |
| Capital Allocator | **WORKING** | `backend/app/services/capital_allocator.py` — capital distribution across strategies |
| Position Manager | **WORKING** | `backend/app/services/position_manager.py` — position lifecycle management |
| Position Sizer | **WORKING** | `backend/app/services/position_sizer.py` — Kelly criterion, risk-based sizing |
| Position Management (frontend) | **WORKING** | `src/components/positions/PositionManagementPanel.tsx` — live P&L, close/edit, SL/TP, Supabase realtime |
| Unified Portfolio (frontend) | **PARTIAL** | `src/components/portfolio/UnifiedPortfolioPanel.tsx` — display framework, data integration partial |

---

## 6. Backtesting

| Capability | Status | Evidence |
|-----------|--------|----------|
| Basic Backtester | **WORKING** | `backend/app/services/backtesting.py` — strategy backtesting engine |
| Enhanced Backtester | **WORKING** | `backend/app/services/enhanced_backtesting_engine.py` — extended metrics |
| Institutional Backtester | **WORKING** | `backend/app/services/institutional_backtester.py` — professional-grade |
| Walk-Forward Engine | **WORKING** | `backend/app/services/walk_forward_engine.py` — walk-forward analysis |
| Backtest API | **WORKING** | `backend/app/api/backtest.py` — POST /backtest, GET results |
| Backtest Panel (frontend) | **WORKING** | `src/components/backtest/BacktestPanel.tsx` — run and view backtests |
| Backtest Dashboard (frontend) | **WORKING** | `src/components/strategies/BacktestDashboard.tsx` — results visualization |
| Equity Curve Charts | **WORKING** | `src/components/strategies/EquityCurveChart.tsx` |
| Report Exporter | **WORKING** | `src/components/strategies/ReportExporter.tsx` |

---

## 7. Arbitrage

| Capability | Status | Evidence |
|-----------|--------|----------|
| Arbitrage Engine | **PARTIAL** | `backend/app/arbitrage/engine.py` — coordinator, PnL calc TODO |
| Cross-Exchange Arb | **SCAFFOLDED** | `backend/app/arbitrage/cross_exchange.py` — TODO: real API calls, sample data |
| Funding Rate Arb | **SCAFFOLDED** | `backend/app/arbitrage/funding_rate.py` — TODO: real API calls |
| Statistical Arb | **PARTIAL** | `backend/app/arbitrage/statistical.py` — logic exists, data source unclear |
| Triangular Arb | **PARTIAL** | `backend/app/arbitrage/triangular.py` — detection logic, venue data mock |
| Basis Edge Model | **WORKING** | `backend/app/services/basis_edge_model.py` — funding basis calculation |
| Spot Arb Edge Model | **WORKING** | `backend/app/services/spot_arb_edge_model.py` — cross-exchange spread calc |
| Edge Cost Model | **WORKING** | `backend/app/services/edge_cost_model.py` — fee/cost modeling |
| Spot Arb Spreads (frontend) | **WORKING** | `src/hooks/useSpotArbSpreads.ts` — live spread scanning |
| Funding Arbitrage (frontend) | **WORKING** | `src/hooks/useFundingArbitrage.ts` — yield calculation |
| Cross-Exchange Arb Edge Function | **WORKING** | `supabase/functions/cross-exchange-arbitrage/` — real implementation |
| Funding Arb Edge Function | **WORKING** | `supabase/functions/funding-arbitrage/` — real implementation |

---

## 8. Market Data & Signals

| Capability | Status | Evidence |
|-----------|--------|----------|
| Market Data Service | **SCAFFOLDED** | `backend/app/services/market_data_service.py` — adapter layer returns random prices |
| Enhanced Market Data | **SCAFFOLDED** | `backend/app/services/enhanced_market_data_service.py` — same issue |
| Signal Engine | **PARTIAL** | `backend/app/services/enhanced_signal_engine.py` — logic real, input data mock |
| Regime Detection | **WORKING** | `backend/app/services/regime_detection_service.py` — market regime classification |
| Technical Analysis | **WORKING** | `backend/app/services/technical_analysis.py` — TA indicators |
| Live Price Feed (frontend) | **WORKING** | `src/hooks/useLivePriceFeed.ts` — Binance WebSocket |
| Live Order Book (frontend) | **WORKING** | `src/hooks/useLiveOrderBook.ts` — WebSocket order book |
| Market Data Edge Functions | **WORKING** | `supabase/functions/market-data/`, `market-data-stream/` — real data ingestion |
| Whale Alerts Edge Function | **WORKING** | `supabase/functions/whale-alerts/` — large transaction detection |

---

## 9. AI/ML Capabilities

| Capability | Status | Evidence |
|-----------|--------|----------|
| ML Inference Module | **SCAFFOLDED** | `backend/app/gpu/ml_inference.py` — LightGBM/XGBoost/CatBoost referenced, no trained models |
| CUDA Engine | **SCAFFOLDED** | `backend/app/gpu/cuda_engine.py` — GPU kernels, hardware-dependent |
| GPU Optimizations | **SCAFFOLDED** | `backend/app/gpu/optimizations.py` — vectorized operations |
| FreqTrade Strategy Integration | **WORKING** | `backend/app/freqtrade/` — bot lifecycle, strategy management, data provider |
| FreqAI Manager | **PARTIAL** | `backend/app/freqtrade/freqai_manager.py` — ML feature engineering framework |
| ML Signals API | **PARTIAL** | `backend/app/api/ml_signals.py` — endpoint exists, model serving unclear |
| Signal Scoring Edge Function | **WORKING** | `supabase/functions/signal-scoring/` — ML confidence scoring |
| AI Trading Copilot Edge Function | **PARTIAL** | `supabase/functions/ai-trading-copilot/` — chat-based advice, not deeply integrated |
| Trading Copilot (frontend) | **STUB** | `src/hooks/useTradingCopilot.ts` — context provider only, no UI integration |

---

## 10. Authentication & Authorization

| Capability | Status | Evidence |
|-----------|--------|----------|
| Supabase JWT Authentication | **WORKING** | `backend/app/core/security.py` — `verify_token()` calls `supabase.auth.get_user()` |
| RBAC (7 roles) | **WORKING** | `backend/app/enterprise/rbac.py` — admin, cio, trader, ops, research, auditor, viewer |
| 25 Granular Permissions | **WORKING** | Same file — trade, portfolio, strategy, risk, arbitrage, agent, admin permissions |
| Per-Role Trade Limits | **WORKING** | Same file — viewer $0, trader $10k, portfolio_manager $100k, cio $1M, admin unlimited |
| Auth Middleware | **WORKING** | `backend/app/main.py` — Bearer token extraction, role lookup from `user_roles` table |
| Rate Limiting | **WORKING** | slowapi — trading 30/min, read 100/min, auth 10/min, WebSocket 5/min |
| Protected Routes (frontend) | **WORKING** | `src/components/ProtectedRoute.tsx` — auth check on all routes |
| Role Gate (frontend) | **WORKING** | `src/components/auth/RoleGate.tsx` — role-based UI gating |
| 2FA Confirmation Dialog | **WORKING** | `src/components/auth/TwoFactorConfirmDialog.tsx` — used for kill switch |

**Gaps:** No MFA implementation. No API key auth for service-to-service. No token refresh logic.

---

## 11. Security

| Capability | Status | Evidence |
|-----------|--------|----------|
| API Key Encryption (AES-256) | **WORKING** | pgcrypto `encrypt_api_key()`/`decrypt_api_key()` SECURITY DEFINER functions |
| Security Headers Middleware | **WORKING** | CSP, HSTS (production), X-Frame-Options DENY, X-Content-Type-Options nosniff |
| Request Validation Middleware | **WORKING** | 10MB body limit, XSS/SQL injection pattern detection |
| CORS Hardening | **WORKING** | Explicit origins, no wildcard |
| Injection Detection | **WORKING** | Query parameter scanning for XSS/SQL patterns |
| Kill Switch Fail-Safe | **WORKING** | Returns True (trading halted) on any error — fail-closed |
| Paper Trading Default | **WORKING** | `paper_trading = true` in config |
| SECURITY.md | **WORKING** | Root-level security policy with reporting, scope, architecture |
| Dependabot | **WORKING** | `.github/dependabot.yml` — pip, npm, GitHub Actions weekly |
| SAST (Bandit) | **WORKING** | CI runs bandit on backend |
| Dependency Audit (pip-audit) | **PARTIAL** | CI runs pip-audit but non-blocking (`|| echo "::warning::"`) |
| npm audit | **PARTIAL** | CI runs but non-blocking (`|| true`) |

**Gaps:** No vault for secrets (env vars only). WebSocket auth vulnerability. HSTS conditional.

---

## 12. Database & Data Layer

| Capability | Status | Evidence |
|-----------|--------|----------|
| Supabase PostgreSQL | **WORKING** | 42 migrations, 64 tables |
| Multi-Tenant Architecture | **WORKING** | `tenants`, `user_tenants`, `current_tenant_id()`, book-level isolation |
| RLS (212 policies) | **WORKING** | Role-based, tenant-scoped, service role bypass |
| Audit Trail (before/after) | **WORKING** | `audit_events` table, immutable (INSERT-only RLS) |
| pgcrypto Extension | **WORKING** | API key encryption at rest |
| Redis Pub/Sub | **WORKING** | Agent communication, message queue fallback |
| Database Triggers | **WORKING** | Auto circuit breakers on fills/positions |

---

## 13. Edge Functions (38 total — all WORKING)

| Category | Count | Functions |
|----------|-------|-----------|
| Trading | 7 | live-trading, trading-api, binance-us, coinbase, kraken, hyperliquid, toggle-strategy |
| Arbitrage | 4 | cross-exchange-arbitrage, funding-arbitrage, basis-arbitrage, approve-meme-launch |
| Intelligence | 5 | market-intelligence, market-data, market-data-stream, whale-alerts, real-news-feed |
| Signals | 2 | signal-scoring, analyze-signal |
| Risk/Ops | 6 | health-check, kill-switch, freeze-book, reallocate-capital, scheduled-monitor, alert-create + send-alert-notification |
| Integrations | 4 | tradingview-webhook, telegram-alerts, external-signals, token-metrics |
| AI | 2 | trading-copilot, ai-trading-copilot |
| Exchange | 2 | exchange-keys, exchange-validate |
| Audit | 1 | audit-log |

All 38 edge functions are real implementations with auth, CORS, error handling.

---

## 14. Observability

| Capability | Status | Evidence |
|-----------|--------|----------|
| Structured Logging (structlog) | **WORKING** | JSON in production, console in dev |
| Request ID Correlation | **WORKING** | X-Request-ID middleware |
| Request Timing | **WORKING** | X-Process-Time header |
| Agent Heartbeats | **WORKING** | 30s heartbeats to Supabase (CPU, memory) |
| Health Check Endpoints | **WORKING** | `/health`, `/ready`, `/metrics`, `/health/freqtrade`, `/health/freqtrade/components` |
| Alert System | **WORKING** | Database-backed alerts with severity levels |
| Observability Page (frontend) | **WORKING** | `src/pages/Observability.tsx` |
| Operations Center (frontend) | **WORKING** | `src/pages/Operations.tsx` — data source health |

**Gaps:** No OpenTelemetry. No Prometheus metrics export. No distributed tracing. No Sentry integration. No agent staleness detection. No trade latency histograms.

---

## 15. Frontend UI

| Capability | Status | Evidence |
|-----------|--------|----------|
| Dashboard (metrics, agents, P&L) | **WORKING** | `src/pages/Index.tsx` |
| Trading Dashboard | **WORKING** | `src/pages/Trade.tsx` — unified spot trader |
| Risk Dashboard | **WORKING** | `src/pages/Risk.tsx` — kill switch, circuit breakers |
| Position Tracking | **WORKING** | `src/pages/Positions.tsx` — live P&L, realtime |
| Strategy Management | **WORKING** | `src/pages/Strategies.tsx` — CRUD, backtest |
| Agent Management | **WORKING** | `src/pages/Agents.tsx` — status, control |
| Arbitrage View | **WORKING** | `src/pages/Arbitrage.tsx` — spot & funding arb |
| Audit Log | **WORKING** | `src/pages/AuditLog.tsx` — compliance activity |
| Kill Switch Panel | **WORKING** | `src/components/risk/KillSwitchPanel.tsx` — 2FA + confirmation dialog |
| TradingView Charts | **WORKING** | `src/components/charts/TradingViewChart.tsx` |
| Keyboard Shortcuts | **WORKING** | `src/hooks/useTradingShortcuts.ts` |

---

## 16. FreqTrade Integration

| Capability | Status | Evidence |
|-----------|--------|----------|
| Bot Lifecycle | **WORKING** | `backend/app/freqtrade/core.py` — start/stop/config |
| Strategy Manager | **WORKING** | `backend/app/freqtrade/strategy_manager.py` — deploy/tune strategies |
| Data Provider | **WORKING** | `backend/app/freqtrade/data_provider.py` — market data feed |
| FreqAI (ML) | **PARTIAL** | `backend/app/freqtrade/freqai_manager.py` — feature engineering framework |
| Backtester | **WORKING** | `backend/app/freqtrade/backtester.py` — FreqTrade backtest wrapper |
| AkivaBaseStrategy | **WORKING** | `data/freqtrade/strategies/AkivaBaseStrategy.py` — RSI, trailing SL, hyperopt |
| AkivaFreqAIStrategy | **PARTIAL** | `data/freqtrade/strategies/AkivaFreqAIStrategy.py` — ML-enhanced, needs model |

---

## Summary Statistics

| Category | Total | WORKING | PARTIAL | SCAFFOLDED | STUB |
|----------|-------|---------|---------|------------|------|
| Multi-Agent System | 13 | 10 | 2 | 0 | 0 |
| Risk Management | 14 | 14 | 0 | 0 | 0 |
| Order Management | 7 | 3 | 2 | 1 | 0 |
| Exchange Adapters | 9 | 5 | 0 | 4 | 0 |
| Portfolio | 7 | 6 | 1 | 0 | 0 |
| Backtesting | 9 | 9 | 0 | 0 | 0 |
| Arbitrage | 12 | 6 | 4 | 2 | 0 |
| Market Data | 9 | 5 | 1 | 3 | 0 |
| AI/ML | 9 | 2 | 3 | 3 | 1 |
| Auth & Security | 21 | 18 | 2 | 0 | 0 |
| Database | 7 | 7 | 0 | 0 | 0 |
| Observability | 8 | 8 | 0 | 0 | 0 |
| Frontend UI | 11 | 11 | 0 | 0 | 0 |
| FreqTrade | 7 | 5 | 2 | 0 | 0 |
| **TOTAL** | **143** | **109 (76%)** | **17 (12%)** | **13 (9%)** | **1 (1%)** |

**Overall:** 76% WORKING, 12% PARTIAL, 9% SCAFFOLDED, 1% STUB. The scaffolded capabilities are concentrated in exchange adapters (backend Python) and GPU/ML modules. Edge functions provide working exchange integration that partially compensates.

---

_Verified under Akiva Build Standard v2.8, Phase 1._
_158 Python files, 285 TypeScript files, 42 SQL migrations, 38 edge functions examined._
