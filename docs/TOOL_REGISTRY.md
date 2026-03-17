# Enterprise Crypto Tool Registry

**Standard:** Akiva AI Agent Runtime and Artifact Standard v1.2 — Tool Access Governance
**System:** Enterprise Crypto — Algorithmic Trading Platform
**Archetype:** 7 — Algorithmic Trading Platform
**Runtime tier:** AT1
**Date:** 2026-03-17
**Source:** `backend/app/agents/` (7 agents) + `backend/app/services/` (45+ services) + `backend/app/enterprise/` (risk, audit, compliance)

---

## Scope

This registry catalogs agent-internal capabilities that perform state mutations, external side effects, and regulated-data operations. Enterprise Crypto's agents are algorithmic decision-making agents (not LLM tool callers). Each agent's method calls to internal services and databases are treated as capability invocations requiring classification.

---

## Tier Definitions

| Tier | Class | Characteristics | Approval Requirement |
|------|-------|-----------------|----------------------|
| **T1** | Read-only | Retrieves market/portfolio data; idempotent; no state change | None |
| **T2** | Bounded mutation | Internal state modifications within limits; reversible | Audit log entry |
| **T3** | Privileged mutation | State mutations with elevated authority; may be irreversible | Per-decision approval (Meta-Decision veto) |
| **T4** | External side-effect | Effects outside system boundary (venue execution, webhooks) | Pre-approval via risk/capital decision chain |
| **T5** | Regulated-data access | Reads/writes compliance-controlled data (audit records, risk decisions) | Immutable log entry; legal hold compatible |

---

## Meta-Decision Agent

**Purpose:** System-wide trading permission authority with VETO power. Decides whether trading is allowed and at what intensity.

| Capability | Class | Permitted Actions | Kill Switch |
|------------|-------|-------------------|------------|
| Evaluate global trading state | T1 | Read market volatility, agent health, stress metrics; compute regime (TRENDING/RANGING/CHOPPY/VOLATILE/CRISIS) | N/A (read-only) |
| Set global trading lock | T3 | Broadcast HALTED/REDUCE_ONLY/NORMAL via `agent:control`; prevents child agents from trading | Operator reset via control channel |
| Classify per-strategy state | T3 | Per-strategy ENABLE/DISABLE/REDUCE_SIZE with size multipliers (0.0-1.0) | Reset multipliers via control channel |
| Fail-safe activation | T5 | On data anomaly: force HALTED, send critical alert, log to audit_events | Admin-only `reset_kill_switch()` |

---

## Capital Allocation Agent

**Purpose:** Manages capital distribution across strategies based on performance, risk, and regime.

| Capability | Class | Permitted Actions | Kill Switch |
|------------|-------|-------------------|------------|
| Rebalance allocations | T2 | Update strategy weights (0.0-1.0) based on performance, correlation, drawdown; rebalance every 60s | Pause agent; allocations reset to zero |
| Quarantine strategy | T3 | Set weight to 0.0 when: drawdown >15%, loss streak >5, negative expectancy, slippage >0.3% | Manual `unquarantine_strategy()` (operator) |
| Track strategy performance | T2 | Aggregate fill events: PnL, trade count, win rate, drawdown, slippage | N/A (internal state) |
| Broadcast allocation decision | T4 | Publish allocation to all agents via `agent:control` (deployed capital, cash reserve %, regime multiplier) | Pause agent to stop publishing |

---

## Risk Agent

**Purpose:** Pre-trade and real-time risk validation. Single source of truth for trade approval.

| Capability | Class | Permitted Actions | Kill Switch |
|------------|-------|-------------------|------------|
| Validate trade intent | T3 | Check confidence, position size, exposure, daily loss, concentration, leverage; approve/reject with reason codes | Pause agent; no approvals until resumed |
| Track portfolio positions | T2 | Aggregate fills: update positions, exposure, daily PnL per instrument | N/A (internal state) |
| Enforce daily loss limit | T3 | Compare daily PnL vs max_daily_loss_usd (~10k); reject trades if breached; trigger kill switch if >1.5x | Admin `reset_kill_switch()` |
| Trigger kill switch | T5 | Set `kill_switch_triggered`, publish PAUSE to all agents, send critical alert, log to audit_events | Admin-only reset; system-wide pause until reset |

---

## Signal Agent

**Purpose:** Generates trading signals from market data (trend-following, mean-reversion, funding-arbitrage). Proposes only; never executes.

| Capability | Class | Permitted Actions | Kill Switch |
|------------|-------|-------------------|------------|
| Generate trend-following signal | T2 | Calculate momentum, check threshold, generate buy/sell with confidence and target size; deduplicate | Pause agent |
| Generate mean-reversion signal | T2 | Compute VWAP deviation, check std threshold, generate signal | Pause agent |
| Generate funding-arbitrage signal | T2 | Monitor funding rates, generate arb signal if spread > threshold | Pause agent |
| Publish signal for approval | T4 | Broadcast via `agent:risk_check` with correlation ID | Pause agent to stop publishing |

---

## Execution Agent

**Purpose:** Routes risk-approved orders to venues, manages order lifecycle, reports fills.

| Capability | Class | Permitted Actions | Kill Switch | Consequence Trace |
|------------|-------|-------------------|------------|-------------------|
| Retrieve market data for execution | T1 | Read current price, spread, volume for instrument | N/A (read-only) | None required |
| Analyze signal quality | T1 | Evaluate signal confidence, strategy parameters | N/A (read-only) | None required |
| Select optimal venue | T2 | Choose venue based on health, fees, order book depth | N/A (venue selection) | None required |
| Create order from signal | T3 | Convert signal to order: calculate size, set type, stop-loss, take-profit; set position modification parameters | Pause agent; cancel pending | **Required** — precondition (market state, portfolio state), expected_effect (position change, P&L impact), rollback_path (cancel if unfilled) |
| Modify stop-loss / take-profit | T3 | Adjust stop-loss or take-profit on existing order or position | Pause agent | **Required** — precondition (current SL/TP, position size), expected_effect (new risk parameters), rollback_path (revert to previous SL/TP) |
| Execute order on venue | T4 | Call venue adapter (Coinbase, Kraken, etc.); submit order to exchange | Pause agent; pending orders await resumption | **Required** — precondition (order details, venue health), expected_effect (fill at target price, expected slippage), rollback_path (cancel if unfilled, close position if filled, or IRREVERSIBLE if market order executed). Risk engine approval gate required for IRREVERSIBLE actions |
| Retry failed order | T4 | Retry up to 3 times with 100ms delays | Pause agent to prevent retries | Inherits parent order trace |
| Report fill | T4 | Publish fill via `agent:fills` with price, size, slippage, latency, PnL | Fills are immutable once reported | Post-execution trace appended to audit |

---

## Arbitrage Agent

**Purpose:** Monitors arbitrage engine for opportunities (funding, cross-exchange, statistical, triangular).

| Capability | Class | Permitted Actions | Kill Switch |
|------------|-------|-------------------|------------|
| Detect opportunities | T2 | Query arbitrage engine; filter by profit threshold (min 5 bps) | N/A (read-only query) |
| Rank opportunities | T2 | Sort by profitability; apply 60s cooldown per opportunity | N/A (internal ranking) |
| Publish opportunity | T4 | Broadcast to `agent:signals` with type, profit, exchanges, confidence | Pause agent |

---

## FreqTrade Signal Agent

**Purpose:** Runs FreqTrade-compatible strategies and publishes signals. Proposes only; never executes.

| Capability | Class | Permitted Actions | Kill Switch |
|------------|-------|-------------------|------------|
| Load FreqTrade strategy | T1 | Read strategy files from `data/freqtrade/strategies/` | N/A (file read-only) |
| Evaluate strategy on candles | T2 | Feed OHLCV data; generate buy/sell decisions | Pause agent |
| Publish signal for approval | T4 | Broadcast to `agent:signals` | Pause agent |

---

## Strategy Lifecycle Manager

**Purpose:** Manages strategy state transitions and quarantine decisions.

| Capability | Class | Permitted Actions | Kill Switch |
|------------|-------|-------------------|------------|
| Evaluate lifecycle transition | T3 | Check edge decay, performance, drawdown, execution quality against thresholds | Manual operator intervention |
| Quarantine strategy (auto) | T3 | Set QUARANTINED for 4+ hours on threshold breach | Manual unquarantine |
| Transition to DISABLED | T3 | Disable if quarantined 3+ times in 30 days | Manual enable required |
| Log transition history | T5 | Record transitions with reason, timestamp in audit trail | Immutable once logged |

---

## Agent-Capability Summary

| Agent | T1 | T2 | T3 | T4 | T5 | Total |
|-------|----|----|----|----|----|----|
| Meta-Decision | 1 | 0 | 2 | 0 | 1 | 4 |
| Capital Allocation | 0 | 2 | 1 | 1 | 0 | 4 |
| Risk | 0 | 1 | 3 | 0 | 1 | 5 |
| Signal | 0 | 3 | 0 | 1 | 0 | 4 |
| Execution | 2 | 1 | 2 | 3 | 0 | 8 |
| Arbitrage | 0 | 2 | 0 | 1 | 0 | 3 |
| FreqTrade Signal | 1 | 1 | 0 | 1 | 0 | 3 |
| Strategy Lifecycle | 0 | 0 | 3 | 0 | 1 | 4 |
| **Total** | **4** | **10** | **11** | **7** | **3** | **35** |

---

## Kill Switch Mechanisms

### Operator-Level

| Switch | Endpoint | Effect | Reset |
|--------|----------|--------|-------|
| Pause all agents | `/api/v1/agents/pause` | All agents `_paused = True` | CONTROL:resume or `/api/v1/agents/resume` |
| Global kill switch | `global_settings.kill_switch = true` | Risk Agent rejects all new trades | `reset_kill_switch()` or UI button |
| Strategy disable | `strategies.enabled = false` | Strategy removed from active list | Config update + restart |
| Venue disable | `venues.enabled = false` | Execution Agent skips venue | Config update + restart |

### System-Level (Automatic)

**Trigger:** Daily PnL < -1.5x limit, OR critical agent offline, OR >3 critical alerts in 5min.
**Effect:** Risk Agent triggers T5 kill switch → PAUSE broadcast → critical alert → audit log.
**Reset:** Admin investigates → `POST /api/v1/risk/kill-switch/reset` with reason → logged.

---

## Recommendation-Decision Trace Chain

| Step | Agent | Role | Traced Field |
|------|-------|------|-------------|
| 1 | Signal Agent | Recommendation | signal_id, confidence, direction, target_size |
| 2 | Risk Agent | Decision | approve/reject + reason_codes |
| 3 | Meta-Decision Agent | Veto/Allow | global_state, per_strategy_state |
| 4 | Execution Agent | Execution | order_id, filled_price, slippage, latency |

Full chain tracked via correlation IDs across Redis pub/sub channels.

---

## Change Control

1. Update this registry under affected agent
2. Add entry to `docs/AGENT_RELEASES.md`
3. Run evaluation suite (backtest, stress test, simulation)
4. Operator approval via code review
5. Deploy with CI/CD (no manual hotfixes)
6. Log in audit trail after deployment

---

**Registry version:** 1.0
**Last updated:** 2026-03-17
**Review cadence:** Every sprint or when agent capabilities change
