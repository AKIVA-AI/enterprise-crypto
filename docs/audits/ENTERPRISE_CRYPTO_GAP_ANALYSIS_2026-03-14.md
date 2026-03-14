# Enterprise Crypto — Gap Analysis

**Date:** 2026-03-14 (updated post-Sprint 2)
**Standard:** Akiva AI Build Standard v2.8
**Archetype:** 7 — Algorithmic Trading Platform
**Current Score:** 72/100 (post-Sprint 2)
**Previous Score:** 66/100 (pre-Sprint 1)
**Target Score:** 75+/100
**Audit Report:** `ENTERPRISE_CRYPTO_AUDIT_REPORT_2026-03-14.md`

---

## Gap Summary

| Priority | Dimension | Current | Target | Gap | Sprint |
|----------|-----------|---------|--------|-----|--------|
| P0 | 7. Testing & QA | 6 | 7 | −1 | S1 |
| P0 | 8. Security Posture | 7 | 8 | −1 | S1 |
| P1 | 6. Frontend Quality | 6 | 7 | −1 | S1–S2 |
| P1 | 10. CI/CD | 5 | 7 | −2 | S1–S2 |
| P1 | 12. Domain Capability | 7 | 8 | −1 | S2 |
| P1 | 13. AI/ML Capability | 6 | 7 | −1 | S2 |
| P2 | 16. UX Quality | 5 | 7 | −2 | S2 |
| P2 | 18. Zero Trust | 6 | 7 | −1 | S2 |
| P2 | 20. Operational Readiness | 4 | 6 | −2 | S3 |
| P2 | 21. Agentic Workspace | 5 | 6 | −1 | S3 |

**Note:** D9 Observability now meets its minimum at 7/10 (corrected — Prometheus endpoint and heartbeat staleness detection already exist in `backend/app/api/health.py`). Remaining D9 gap is tracing and external observability pipeline, not scored as a minimum violation.

---

## Sprint 1: Close Archetype Minimum Gaps (P0) + CI/CD Foundation

**Estimated score impact: 65 → 72**
**Tasks: 22**

### D7 Testing & QA (6 → 7) — 7 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 1.1 | Fix frontend type-check: change CI from `bun run tsc --noEmit` to `npx tsc -p tsconfig.app.json --noEmit` | `.github/workflows/ci.yml` | Enables TypeScript error detection in CI |
| 1.2 | Add Python CI matrix: test on 3.11 + 3.12 | `.github/workflows/ci.yml` | Repo Controls: removes −1 penalty |
| 1.3 | Raise backend coverage floor to 60%: `--cov-fail-under=60` | `.github/workflows/ci.yml` | Archetype 7 coverage minimum |
| 1.4 | Add coverage artifact upload to CI (both frontend and backend) | `.github/workflows/ci.yml` | Repo Controls: removes −1 penalty |
| 1.5 | Write 10 frontend unit tests for critical hooks: useAuth, useTradingGate, useKillSwitch, useOrders, usePositions, useRiskEngine, useAgents, useDashboardMetrics, useStrategies, useExchangeKeys | `src/hooks/*.test.ts` (10 new files) | Raises frontend coverage from 6 to 16+ test files |
| 1.6 | Write agent integration test: signal → risk check → approval/rejection flow via Redis pub/sub | `backend/tests/test_agent_integration.py` | Tests critical multi-agent path |
| 1.7 | Fix skipped frontend tests: resolve Radix UI dialog portal rendering issues in test environment | `src/components/**/*.test.tsx` | Activates 18 skipped tests |

### D8 Security Posture (7 → 8) — 6 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 1.8 | Make npm audit blocking in CI: remove `\|\| true` suffix | `.github/workflows/ci.yml` | Security scans become blocking |
| 1.9 | Make pip-audit blocking in CI: remove `\|\| echo "::warning::"` suffix | `.github/workflows/ci.yml` | Same |
| 1.10 | Fix WebSocket authentication: add JWT token validation on WS connect handshake | `backend/app/api/websocket.py`, `src/hooks/useWebSocketManager.ts` | Closes medium vulnerability |
| 1.11 | Enable HSTS unconditionally (not just production) | `backend/app/middleware/security.py` | Enforces TLS in all environments |
| 1.12 | Add Supabase Vault integration for service role key and exchange credentials | `backend/app/database.py`, `backend/app/config.py` | Removes secrets from env vars |
| 1.13 | Review and fix `strategy_screener.py` subprocess usage for command injection | `backend/app/services/strategy_screener.py` | Closes potential injection vector |

### D9 Observability (6 → 7) — 5 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 1.14 | Add Prometheus metrics endpoint: convert `/metrics` to Prometheus format using `prometheus_client` | `backend/app/api/health.py` | Enables metrics scraping |
| 1.15 | Implement agent heartbeat staleness detection: alert if no heartbeat in 90s | `backend/app/agents/agent_orchestrator.py`, `supabase/functions/scheduled-monitor/` | Detects agent failures |
| 1.16 | Add trade execution latency histogram: measure and export order placement → fill time | `backend/app/services/oms_execution.py`, `backend/app/api/health.py` | Trade latency visibility |
| 1.17 | Add venue connectivity latency tracking with alerting | `backend/app/adapters/base.py` | Venue health monitoring |
| 1.18 | Integrate Sentry SDK for error tracking (DSN already in env template) | `backend/app/main.py`, `requirements.txt` | Crash and error tracking |

### D10 CI/CD (5 → 6) — 4 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 1.19 | Add CI aggregator job that depends on frontend + backend jobs | `.github/workflows/ci.yml` | Branch protection can check single job |
| 1.20 | Add docs link validation step to CI (check markdown links in docs/) | `.github/workflows/ci.yml` | Repo Controls: docs build validation |
| 1.21 | Pin GitHub Actions to SHA versions (checkout@v4 → SHA) | `.github/workflows/ci.yml`, `.github/workflows/e2e.yml` | Supply chain security |
| 1.22 | Add dependency caching for Python pip and Node modules in CI | `.github/workflows/ci.yml` | CI speed improvement |

---

## Sprint 2: Frontend Quality + Domain Depth (P1)

**Estimated score impact: 72 → 77**
**Tasks: 18**

### D6 Frontend Quality (6 → 7) — 6 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 2.1 | Create semantic color token utility: `src/lib/status-colors.ts` with success/danger/warning/info/muted mappings | `src/lib/status-colors.ts` (new) | Foundation for AP-2 fixes |
| 2.2 | Fix hardcoded colors in arbitrage components (FundingArbitragePanel, ModeAwareArbitrageInfo, PnLAnalyticsDashboard) | 3 `.tsx` files | Removes ~30 AP-2 instances |
| 2.3 | Fix hardcoded colors in dashboard and position components | ~10 `.tsx` files | Removes ~50 AP-2 instances |
| 2.4 | Fix hardcoded colors in remaining components (risk, trading, intelligence, meme) | ~15 `.tsx` files | Removes ~67 AP-2 instances, Gate UX-1 PASS |
| 2.5 | Fix 18 fire-and-forget mutations: replace `.mutate()` with `await .mutateAsync()` in try/catch, add `disabled={isPending}` on submit buttons | 12 `.tsx` files | Fixes AP-1 defects |
| 2.6 | Add loading skeletons to pages missing loading states (AdvancedRiskDashboard, Positions, OpportunityScannerPanel) | 3 `.tsx` files | Improves AP-5 coverage |

### D10 CI/CD (6 → 7) — 2 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 2.7 | Create staging deployment workflow in GitHub Actions | `.github/workflows/deploy-staging.yml` (new) | CD pipeline exists |
| 2.8 | Add branch protection configuration documentation | `docs/CI_CD_HEALTH.md` (new) | Branch protection evidence |

### D12 Domain Capability (7 → 8) — 4 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 2.9 | Replace Coinbase adapter mock with real CCXT integration (testnet) | `backend/app/adapters/coinbase_adapter.py` | Working exchange connectivity |
| 2.10 | Replace Kraken adapter mock with real CCXT integration (testnet) | `backend/app/adapters/kraken_adapter.py` | Second working exchange |
| 2.11 | Replace MEXC adapter mock with real CCXT integration (testnet) | `backend/app/adapters/mexc_adapter.py` | Third working exchange → required capability PASS |
| 2.12 | Add adapter integration tests with exchange sandbox/testnet | `backend/tests/test_adapter_integration.py` (new) | Verifies real connectivity |

### D13 AI/ML Capability (6 → 7) — 3 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 2.13 | Deploy signal scoring model: train LightGBM on historical signals, export to ONNX, serve via ml_signals API | `backend/app/gpu/ml_inference.py`, `backend/app/api/ml_signals.py` | Working ML inference |
| 2.14 | Add model versioning: track model versions, inputs, outputs in Supabase | `backend/app/services/model_registry.py` (new) | Model lifecycle management |
| 2.15 | Wire trading copilot to AI copilot edge function in UI | `src/components/chat/AICopilotSidebar.tsx`, `src/hooks/useTradingCopilot.ts` | User-facing AI |

### D16 UX Quality (5 → 6) — 3 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 2.16 | Add ARIA live regions for real-time price updates, position P&L, and alerts | `src/components/dashboard/PositionsTable.tsx`, `src/components/positions/PositionManagementPanel.tsx`, `src/components/alerts/AlertNotificationSystem.tsx` | Accessibility for live data |
| 2.17 | Add skip links and keyboard navigation documentation | `src/components/layout/MainLayout.tsx`, `docs/KEYBOARD_SHORTCUTS.md` (new) | Gate UX-2 partial fix |
| 2.18 | Add accessible names to all icon-only buttons (Power, Settings, Close) | Multiple `.tsx` files | Gate UX-2 requirements |

---

## Sprint 3: Production Readiness (P2)

**Estimated score impact: 77 → 80**
**Tasks: 12**

### D18 Zero Trust (6 → 7) — 3 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 3.1 | Add per-agent identity: each agent gets unique JWT, not shared service role | `backend/app/agents/base_agent.py`, `backend/app/core/security.py` | Agent-level auth |
| 3.2 | Add service-to-service auth for backend → Redis (AUTH password) | `backend/app/agents/base_agent.py`, `docker-compose.yml` | Redis auth |
| 3.3 | Add request signing between agents for critical operations | `backend/app/agents/base_agent.py` | Prevents message spoofing |

### D20 Operational Readiness (4 → 6) — 4 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 3.4 | Create Docker image push to registry (GHCR or ECR) in CI | `.github/workflows/ci.yml` | Container registry |
| 3.5 | Implement blue/green deployment with health check verification | `scripts/deploy.sh`, `docker-compose.yml` | Zero-downtime deploy |
| 3.6 | Add rollback procedure documentation and scripts | `docs/ROLLBACK_PROCEDURES.md` (new), `scripts/rollback.sh` (new) | Recovery path |
| 3.7 | Run and document load test results | `backend/tests/load/locustfile.py`, `docs/LOAD_TEST_RESULTS.md` (new) | Performance baseline |

### D21 Agentic Workspace (5 → 6) — 2 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 3.8 | Add agent behavior change tracking: log prompt/tool/model changes with version | `backend/app/agents/agent_orchestrator.py`, new migration | Gate T-6 partial fix |
| 3.9 | Add agent drift monitoring: track override rate, fallback rate per agent | `backend/app/agents/base_agent.py`, `backend/app/api/agents.py` | Drift visibility |

### D16 UX Quality (6 → 7) — 3 tasks

| # | Task | Files | Impact |
|---|------|-------|--------|
| 3.10 | Add keyboard-complete navigation for trading workflow | `src/pages/Trade.tsx`, `src/hooks/useTradingShortcuts.ts` | WCAG AA compliance |
| 3.11 | Add visible focus indicators on all interactive elements | `src/index.css`, Tailwind config | Focus visibility |
| 3.12 | Add screen reader announcements for trading alerts and status changes | `src/components/alerts/AlertNotificationSystem.tsx` | Live region announcements |

---

## Sprint Summary

| Sprint | Tasks | Actual Impact | Score |
|--------|-------|---------------|-------|
| S1 | 22 | +4 points | 66→70 |
| S2 | ~40 file edits | +2 points | 70→72 |
| S3 | 12 (pending) | +3-5 points est. | 72→75-77 |

---

## Completed Sprint Work

### Sprint 1 (DONE)

- Fixed CI type-check (`tsc -b`), Python 3.11/3.12 matrix, blocking security scans
- Backend coverage 25%→39.49% (SOR 100%, risk engine 94%), 249 tests
- 0 npm/pip vulnerabilities, `_FILE` secret mount support
- Deploy workflow (GHCR + Northflank), coverage artifacts
- KillSwitchPanel: onError handlers + aria-labels

### Sprint 2 (DONE)

- Hardcoded colors: 214→1 (vendor toast.tsx exception). 31 files cleaned. `src/lib/status-colors.ts` created.
- AP-1 mutations: all remaining 4 fixed (SystemStatus, NotificationChannelManager, useBacktestResults)
- Skip link added to MainLayout
- 14 icon-only buttons given aria-labels
- 5 aria-live regions added for real-time data
- Gate UX-1: now PASSES. Gate UX-2: partially addressed.

---

## Remaining Human Actions Required

| Action | Blocking | Dimension Impact | Priority |
|--------|----------|-----------------|----------|
| Create exchange testnet accounts (Coinbase, Kraken, MEXC sandbox) and provide API keys | S3 tasks 2.9-2.12 | D12 7→8 | P1 |
| Train and export signal scoring model (LightGBM on historical signals) | S3 task 2.13 | D13 6→7 | P1 |
| Provision staging infrastructure (server/cloud) | S3 tasks 3.4-3.6 | D20 4→6 | P2 |
| Configure GHCR credentials in GitHub repo secrets | Deploy workflow | D10 7→8 | P2 |
| Configure Northflank deploy webhooks (`NORTHFLANK_STAGING_DEPLOY_WEBHOOK`, `NORTHFLANK_PRODUCTION_DEPLOY_WEBHOOK`) in GitHub Environment secrets | Deploy workflow activation | D10 7→8 | P2 |

---

## Score Forecast

| Milestone | Score | Status |
|-----------|-------|--------|
| Pre-Sprint 1 | 66/100 | Below threshold |
| After S1 | 70/100 | **At threshold** |
| After S2 | 72/100 | **Above threshold** |
| After S3 (est.) | 75-77/100 | Requires human actions above |
| 80+ requires | Pen test, production deployment, load test results, per-agent identity | Not code-only |
| 85+ requires | SOC 2, pen test, production traffic, real exchange execution | Not code-only |

---

_Generated under Akiva Build Standard v2.8._
_52 tasks across 3 sprints targeting 65 → 80/100._
