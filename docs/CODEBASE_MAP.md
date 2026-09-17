# Enterprise Crypto — Codebase Map

Verified 2026-09-17 at `e603ddd7bb908d24321a640ba1ac646e5b043600`, matching freshly fetched `origin/main`. This replaces the outdated April inventory. See the [engineering audit](audits/2026-09-17-ENTERPRISE_CRYPTO_ENGINEERING_AUDIT.md) and [reproduction evidence](audits/evidence/2026-09-17-enterprise-crypto/README.md).

## Scope and stack

Enterprise Crypto combines a React trading frontend, Supabase edge functions, a FastAPI backend, exchange adapters, analytical/backtesting services, and Redis-based agents. Some paths execute substantive logic, some simulate, and some optional integrations are only partially wired. Core trading correctness findings remain unresolved; this map is not a production-readiness certification.

- Frontend: React 19.2.4, TypeScript 5.8.3, Vite 7.3.2, TanStack Query, shadcn/Radix components, Supabase JS 2.89.0 in the audited installation.
- Backend: Python/FastAPI, Pydantic, Supabase, Redis, numerical libraries, optional FreqTrade and Framework packages.
- Source inventory: **134 Python files under `backend/app/`**, **312 TS/TSX files under `src/`** including tests/declarations, **25 page files**, **36 edge-function entry points**.
- Database: three timestamped migration files. The first is a comment-only baseline; the other two change function permissions. The active chain does not contain a reconstructable application schema. Remote table/policy counts were not verified.

## Main paths

| Path | Role and current qualification |
| --- | --- |
| `src/App.tsx` | Route composition: auth, onboarding, dashboard, trading, agents, risk, analytics, markets, positions, and settings. |
| `src/components/trading/TradeTicket.tsx` | Main order ticket invokes `live-trading`. |
| `src/hooks/useLiveTrading.ts` | Place/cancel/close mutations; success messages depend on edge results. |
| `src/components/risk/KillSwitchPanel.tsx` | Direct settings updates and audit/alert invocations. |
| `src/lib/apiClient.ts` | FastAPI client used by arbitrage/FreqTrade hooks; route/session integration gaps remain. |
| `supabase/functions/live-trading/index.ts` | Separate execution path with checks, exchange requests, simulation, and DB writes; close/cancel/fill recovery defects are documented. |
| `supabase/functions/_shared/oms-client.ts` | Intent helpers; accepted idempotency key is not persisted in insert payload. |
| `backend/app/main.py` | FastAPI/lifespan, DB/market data, FreqTrade hub, router/risk/arbitrage initialization. |
| `backend/app/api/routes.py` | Router composition mounted under `/api/v1`; some child routers already include `/api`. |
| `backend/app/config.py` | Backend mode requires production environment plus disabled paper flag for live execution. Edge functions separately use DB mode settings. |
| `backend/app/database.py` | Supabase client, control helpers, alert/audit helpers. |
| `backend/app/services/oms_execution.py` | Intent routing/persistence; unit conversion, identity, and recovery findings. |
| `backend/app/services/order_gateway.py` | Alternative class with tests but no production import found; not the sole writer its documentation claims. |
| `backend/app/services/execution_planner.py` | Multi-leg execution/compensation; partial/rejected/persistence-failure handling defects. |
| `backend/app/services/portfolio_engine.py` | Capital sizing and book cache; returns USD sizing and can retain stale controls. |
| `backend/app/services/risk_engine.py` | Pre-trade comparisons, daily-loss queries, circuit breakers; missing/invalid-data and P&L findings. |
| `backend/app/services/live_reconciliation.py` | Venue/internal comparison; identity mismatch reproduced. |
| `backend/app/adapters/` | Mixed paper/live paths. Coinbase has HTTP execution, not only random stubs; protocol/ledger behavior needs repair and venue validation. |
| `backend/app/services/enhanced_signal_engine.py` | Synthetic fallback/randomized candle fields; timeframe/provenance checks incomplete. |
| `backend/app/services/opportunity_scanner.py` | Builds timeframe stacks and intents using that input. |
| `backend/app/services/engine_runner.py` | Scanner/FreqTrade/basis/spot-arbitrage cycle, capital allocation, risk, OMS. |
| `backend/app/services/institutional_backtester.py` | Local numerical logic; short accounting, fee, and terminal-equity defects. |
| `backend/app/services/walk_forward_engine.py` | Rolling windows; aggregate includes overlapping train/test series. |
| `backend/app/agents/` | Redis agents/orchestrator; ExecutionAgent execution remains simulated. |
| `backend/app/control_plane/` | Optional Framework authority/risk/evidence adapters; construction/status tests do not establish runtime enforcement. |
| `backend/app/core/observability.py` | Sentry/OpenTelemetry integration; Sentry tests expose a local Windows compatibility limitation. |

## Execution boundaries

```text
Trading UI -> live-trading edge function -> exchange request or simulation
                                      -> separate order/fill/position writes

Backend scanner/engine -> risk + sizing -> OMS -> venue adapter
                                             -> database persistence
                                             -> multi-leg planner when configured

Redis approved signal -> ExecutionAgent -> simulated execution/fill events

Framework adapters -> constructed by orchestrator; authority metadata queried
                   -> risk/evidence enforcement not wired into submissions there
```

These paths are not one consistent execution state machine. Mode selection, units, controls, idempotency, fills, and recovery should converge at a canonical boundary. No live exchange or deployed agent operation was exercised.

## Tests and measured checks

- Backend: **69 test modules**. Corrected local run: **1,204 passed, 2 failed, 3 skipped**; **63.2765% statement coverage**, above the 60% floor. No branch measurement. Two Sentry tests fail with a Windows `fork` initialization error in the installed environment.
- Framework: **37 passed separately** with sibling source dependencies; default run skips the module without them.
- Frontend: **20 modules, 298 passing tests**. Default coverage represents 44 loaded files and reports 74.69% statements. Full-source inclusion represents 290 files and reports **7.97% statements**, failing all configured 10% thresholds.
- Frontend type-check, zero-warning ESLint, and Node 22 build passed. Backend CI-style Ruff passed. Mypy: **1,062 errors in 63 files**, non-blocking in CI.
- Audit probes reproduce **30 observations** using local I/O doubles; archived evidence, not normal regression tests.
- Python installed versions differ from CI pins. No browser E2E sweep, Docker build, live DB/exchange sandbox, or load test was run.

## CI and deployment

CI includes targeted frontend types, lint, tests/coverage, a Python 3.11/3.12 matrix, backend coverage enforcement, and uploads. Mypy uses `continue-on-error: true`. Staging deploy/health steps are placeholders. Remote CI results were not verified.

The frontend image uses Node 18 despite Vite 7's newer engine requirement. The backend install shell chain can suppress dependency failure through trailing `|| true`. Local application build success does not certify either image.

Schema reconstruction requires a reviewed baseline and migration replay. Earlier remote table/policy counts cannot be inferred from this checkout.

## Audit state

The September report records **20 findings (14 P1, 6 P2)** with proposed repairs and acceptance criteria. Product source, tests, dependencies, migrations, and CI remain unchanged. Pre-existing tracked coverage/bytecode deletions remain outside the audit commit.
