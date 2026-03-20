# Enterprise Crypto Build Specification

**Date:** 2026-03-17
**Standard:** Akiva AI Build Standard v2.10
**System:** Enterprise Crypto - Algorithmic Trading Platform
**Archetype:** 7 - Algorithmic Trading Platform

## Classification

- Product type: Multi-agent algorithmic trading platform with risk management
- Primary interfaces: Web application (React), FastAPI backend, Redis pub/sub agent coordination, multi-channel alerts (Telegram/Discord/Slack)
- Primary users: CIOs, traders, operations staff, research analysts, auditors
- Runtime profile: Autonomous multi-agent trading system with Meta-Decision veto authority and human-governed risk overrides

## Declared Engineering and Runtime Context

| Field | Value |
| ----- | ----- |
| Agentic Engineering Current Level | 4 |
| Agentic Engineering Target Level | 5 |
| Agent Runtime Tier | AT1 (delegated — agents execute within defined scope, Meta-Decision veto for high-risk) |
| Autonomy Boundary | Agents may signal, analyze, score, and recommend. Meta-Decision Agent has veto authority. Human approval required for: kill switch activation, capital reallocation above threshold, strategy lifecycle changes, exchange key management |
| Human Approval Required For | Kill switch activation, capital allocation changes above threshold, new strategy deployment, exchange API key management |
| Kill Switch / Override Path | KillSwitchPanel (web UI), `global_settings` table (DB-level), circuit breaker triggers on fills/positions table, per-agent heartbeat timeout |

## AI Response Quality

- Enabled: Yes (ML signal generation, backtest evaluation, risk scoring)
- Governing standard: `akiva-enterprise-products/standards/AI_RESPONSE_QUALITY_STANDARD.md`

## Core Requirements

1. Multi-agent coordination with fail-closed risk enforcement
2. Real-time market data processing with sub-second latency targets
3. Meta-Decision Agent veto authority on all trade execution
4. Immutable audit trail for all trading decisions and agent actions
5. Kill switch propagation under 5 seconds across all agents

## Quality Gates

1. LINT — ruff check + tsc (zero errors)
2. TEST — pytest --cov=app (backend), vitest (frontend)
3. BUILD — vite build (frontend), imports resolve (backend)
4. SECURITY — exchange keys encrypted (pgcrypto AES-256), no hardcoded secrets
5. AUDIT VERIFY — all agent decisions logged to audit_events table

## Target Scores

| Dimension | Target |
| --------- | ------ |
| 1. Architecture | 7 |
| 7. Code Quality | 7 |
| 9. Performance | 7 |
| 13. AI/ML | 7 |
| 15. Agentic UI/UX | 6 |
| 21. Agentic Workspace | 7 |
| Composite | 72 |

## Current Audit Reference

- Current authoritative audit: `docs/audits/ENTERPRISE_CRYPTO_AUDIT_REPORT_2026-03-14.md`
- Gap analysis: `docs/audits/ENTERPRISE_CRYPTO_GAP_ANALYSIS_2026-03-14.md`

---

## Agent Runtime and Artifact Declarations

> Per `AI_AGENT_RUNTIME_AND_ARTIFACT_STANDARD.md` v1.2 — required artifacts for Archetype 7.

### 1. Protocol Decision Record

| Layer | Choice | Rationale |
| ----- | ------ | --------- |
| **UI transport** | HTTP/REST (`/api/v1/*`, 13 routers) + WebSocket (real-time market data, agent heartbeat subscriptions). No AG-UI. | Trading UI requires real-time tick-by-tick updates via WebSocket. REST for all CRUD operations. AG-UI not applicable — agent outputs are market signals and trade decisions, not conversational UI. |
| **UI rendering** | React components (shadcn/Radix, dark theme). Charts: Recharts v3.8.0 (area, bar, radar) + Lightweight Charts v5.1.0 (professional candlestick, price action). 22 pages, 285 TS source files. Kill switch panel, trade ticket, position management. | Lightweight Charts is the industry standard for trading visualizations. Recharts for analytics dashboards. 147 hardcoded colors identified (AP-4 violation — remediation needed). |
| **Tool access** | Agent-internal with 5-tier classification (T1-T5). 32 capabilities across 7 agents + Strategy Lifecycle Manager. Meta-Decision Agent has VETO authority (T3). Risk Agent has kill switch (T5). Execution Agent performs external side-effects (T4). Full registry: `docs/TOOL_REGISTRY.md`. | Trading agents are algorithmic, not LLM-prompted. Tool access is code-level, not protocol-level. 5-tier classification aligns with Agent Runtime Standard tool classes for governance purposes. |
| **Agent delegation** | Redis pub/sub with 9 typed channels: `agent:signals`, `agent:risk_check`, `agent:risk_approved`, `agent:risk_rejected`, `agent:execution`, `agent:fills`, `agent:control`, `agent:heartbeat`, `agent:alerts`. `AgentChannel` enum + `AgentMessage` dataclass with correlation IDs. Meta-Decision Agent has VETO authority over all trading decisions. | Redis pub/sub provides sub-millisecond message delivery for time-sensitive trading decisions. Typed channels enforce message routing discipline. Meta-Decision veto is fail-closed. |
| **Durable execution** | APScheduler v3.10.4 for periodic jobs (drawdown monitor, market scans, capital reallocation). Local message queue (in-memory, max 1000 items) for Redis disconnect recovery. PostgreSQL triggers for circuit breaker enforcement on fills/positions tables. No Temporal/DBOS. | Single-process scheduler sufficient for current scale. Database-level circuit breakers provide atomic fail-closed enforcement. Formal durable execution engine is an identified gap (see Action I-1). |
| **Observability** | structlog (JSON-structured logging). Supabase `audit_events` (immutable). Agent heartbeats (30s interval) to Supabase `agents` table with CPU/memory/status. Prometheus metrics scaffolded but not fully integrated. | Structured logging for multi-agent debugging. Immutable audit events for compliance. Heartbeat monitoring for 24/7 agent health. |

### 2. Workflow State Model

| Aspect | Declaration |
| ------ | ----------- |
| **What is checkpointed** | Agent health state (heartbeats), trading positions, order history, signal history, risk evaluation outcomes, circuit breaker state |
| **Where** | Supabase PostgreSQL (durable: positions, orders, signals, audit_events). Redis (hot: pub/sub messages, active agent state). In-memory (agent local queue, max 1000 items). |
| **Granularity** | Per-agent-heartbeat (30s), per-signal, per-order, per-risk-evaluation. |
| **Retention** | Trading records: retained per regulatory requirements. Audit events: immutable, no auto-delete. Agent heartbeats: rolling window. |
| **Resume behavior** | Agents auto-restart with exponential backoff (1s→30s, max 5 restarts). Local queue replays buffered messages on Redis reconnection. Circuit breaker state persisted in PostgreSQL — survives restarts. |
| **Idempotency** | Correlation IDs on all agent messages. Order dedup via exchange order IDs. Circuit breaker triggers are idempotent (PostgreSQL trigger checks current state before acting). |
| **Known gaps** | Local message queue is in-memory — lost on pod restart (max 1000 items). Redis pub/sub is best-effort — no persistence for messages during disconnect. No formal workflow checkpoint/resume for multi-step trading strategies. |

### 3. Artifact Taxonomy

| Classification | Enterprise Crypto Examples | Treatment |
| -------------- | ------------------------- | --------- |
| **Ephemeral** | Real-time market data ticks, intermediate signal calculations, agent reasoning steps | In-memory only. No durability. |
| **Session artifact** | Active trading session state, working backtest results, strategy parameter tuning in progress | Persisted for session. Cleared on session close. |
| **Durable artifact** | Executed orders, position history, backtest results, strategy configurations, ML signal model outputs, capital allocation records | Persisted in PostgreSQL. Access-controlled via RBAC (7 roles). Exportable. |
| **Regulated artifact** | Audit events (immutable), risk evaluation records, circuit breaker trigger events, exchange key operations, kill switch activations | Durable + immutable audit trail + correlation IDs. Retained per financial compliance requirements. |

**Persistence layers:**

- Structured metadata: Supabase PostgreSQL (orders, positions, signals, strategies, audit_events)
- Binary assets: Not significant (no document/file storage)
- Semantic index: Not applicable (no RAG)
- Knowledge graph: Not applicable

### 4. Channel Authorization Matrix

| Tier | Channel | Auth Mechanism | Permitted Actions |
| ---- | ------- | -------------- | ----------------- |
| *(Internal coordination — outside channel authorization scope)* | Redis pub/sub (agent coordination, 9 typed channels) | None (internal only, not externally accessible) | Agent-to-agent signals, risk checks, execution commands, heartbeats. This is an internal coordination layer, not a user-facing channel. Included here for completeness but not subject to channel authorization tiers. |
| **Tier 1: Read-only** | Telegram alerts | `TELEGRAM_BOT_TOKEN` + Chat ID | Severity-filtered notifications (whale, signal, trigger, risk, custom). Emoji-coded. No trading actions. |
| **Tier 1: Read-only** | Discord alerts | `DISCORD_WEBHOOK_URL` | Embedded format with color coding by severity. Notification-only. |
| **Tier 1: Read-only** | Slack alerts | `SLACK_WEBHOOK_URL` | Attachment format with color-coded blocks. Notification-only. |
| **Tier 1: Read-only** | Generic webhooks | Custom URL per integration | Outbound notification delivery. Configurable per alert type. |
| **Tier 2: Authenticated** | TradingView webhook (inbound) | API key validation | Receives signal webhooks. Queues to signal agent. No direct trade execution. |
| **Tier 3: Privileged** | Web app (primary) | Supabase JWT + RBAC (7 roles: admin, cio, trader, ops, research, auditor, viewer). Rate limits: 30/min trading, 100/min read, 10/min auth. | Full platform access per role. Kill switch, capital allocation, strategy management, exchange key management. |
| **Tier 3: Privileged** | Exchange API keys | Supabase JWT + SECURITY DEFINER encryption (pgcrypto AES-256) | Encrypted storage. Admin-only management. Keys never exposed in API responses. |

**Multi-channel alert routing:** Alert severity (info/warning/critical) filters which channels receive notifications. `notification_channels` table + `notification_logs` for delivery tracking. Rate limit: 20 alerts/min per user.

### 5. Trace and Provenance Contract

| Field | Implementation |
| ----- | -------------- |
| **Run ID** | Correlation IDs on all `AgentMessage` instances. Order IDs from exchanges. |
| **Tool evidence** | Agent heartbeats with CPU/memory/status (30s interval). Signal generation logged with model metadata. |
| **Approval evidence** | Meta-Decision Agent veto/approve logged in `audit_events`. Kill switch activations logged with operator ID + timestamp. |
| **Model metadata** | ML signal models tracked per strategy. Backtest parameters and walk-forward validation results stored. |
| **Recommendation-decision pairs** | Signal → Risk evaluation → Meta-Decision approve/veto → Execution outcome. Full chain tracked via correlation IDs. This is the strongest recommendation-decision tracking in the portfolio. |
| **Retention** | `audit_events`: immutable, no auto-delete. Trading records: per regulatory/compliance requirements. |

### AI SLO Declarations

> Per `AI_AGENT_RUNTIME_AND_ARTIFACT_STANDARD.md` v1.2 Section 7. Archetype 7 requires delayed-outcome domain metrics.

| SLO Class | Metric | Target | Measurement |
| --------- | ------ | ------ | ----------- |
| **Availability** | % of agent heartbeats received on schedule (30s interval) | 99.5% | `agents` table heartbeat timestamp freshness |
| **Latency** | p95 signal-to-execution latency (signal → risk check → Meta-Decision → order) | < 500ms | Correlation ID timestamp chain across Redis pub/sub |
| **Latency** | p95 kill switch propagation | < 5s | Kill switch activation timestamp → all agents paused delta |
| **Tool success** | % of trade orders successfully submitted to exchange | > 99% | Exchange API response codes in `audit_events` |
| **Task success** | % of approved signals resulting in successful order placement | > 98% | Signal→risk_approved→execution→fill chain completion rate |
| **Grounding/safety** | % of Meta-Decision veto decisions consistent with risk parameters | 100% | Veto audit log vs declared risk limits |
| **Cost efficiency** | Infrastructure cost per trading day | Track baseline | Compute + Redis + Supabase costs |

**Delayed-outcome domain metrics (Archetype 7 obligation):**

- **Session-time proxy metrics:** Override rate (human manual intervention frequency), recommendation acceptance rate (Meta-Decision approve vs veto ratio), time-to-decision per signal.
- **Periodic outcome-correlated metrics (weekly):** Correlation between signal quality scores and realized P&L. Strategy Sharpe ratio trends. Drawdown frequency vs risk parameter settings. Measured via backtest harness + live trading comparison.

### 6. Deletion and Retention Policy

| Data Type | Retention | Deletion Path |
| --------- | --------- | ------------- |
| Trading orders/positions | Per financial regulatory requirements | No auto-delete. Admin archive path. |
| Audit events | Immutable. No deletion. | INSERT-only by design. |
| Agent heartbeats | Rolling window (configurable) | Auto-expire old heartbeats |
| Strategy configurations | Retained until explicitly archived | Admin-initiated with audit trail |
| Exchange API keys | Until revoked by admin | Admin revocation with encrypted deletion |
| Backtest results | Retained for strategy evaluation history | Admin archive with audit trail |

### 7. Action-Level Autonomy Boundaries

| Action Category | Autonomy Level | Justification |
| --------------- | -------------- | ------------- |
| **Market data collection** | Autonomous | Read-only. No state change. |
| **Signal generation** (ML models) | Autonomous | Computational analysis. Produces recommendations, not actions. |
| **Risk evaluation** | Autonomous | Evaluates signal against risk parameters. Produces approve/reject, not execution. |
| **Trade execution** | Meta-Decision veto required | All trades must pass Meta-Decision Agent. Fail-closed: no trade without approval. |
| **Capital allocation** | Human approval above threshold | Low-value rebalancing autonomous. Significant allocation changes require human. |
| **Strategy deployment** | Human approval required | New strategies require operator deployment and configuration. |
| **Kill switch activation** | Human-initiated or circuit breaker (autonomous, fail-closed) | Manual: KillSwitchPanel. Automatic: PostgreSQL trigger on drawdown/position limits. |
| **Exchange key management** | Admin-only | Encrypted storage. Never autonomous. |

### 8. Retrieval Architecture Declaration

| Field | Declaration |
| ----- | ----------- |
| **Corpus boundary** | Not applicable. Enterprise Crypto does not use RAG. Intelligence is algorithmic (ML signals, technical analysis), not retrieval-augmented. |
| **Chunking policy** | N/A |
| **Retrieval topology** | N/A. Market data retrieved via exchange APIs (CCXT). Historical data stored in PostgreSQL. |
| **Retrieval eval set** | N/A. Model evaluation via backtest harness + walk-forward validation. |
| **Reindex migration plan** | N/A |
| **Retrieval provenance** | N/A |

---

## Immediate Remediation Priorities

1. Resolve 147 hardcoded color tokens (AP-4 violation) — migrate to semantic design token system.
2. Complete Prometheus metrics integration for agent observability.
3. Add formal durable execution for multi-step trading strategies.
4. Create agent release log and quality baselines per Agent Runtime Standard.
