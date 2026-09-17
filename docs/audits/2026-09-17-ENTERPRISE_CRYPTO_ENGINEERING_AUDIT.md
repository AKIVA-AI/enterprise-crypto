# Enterprise Crypto engineering audit — 2026-09-17

## Assessment

The repository contains substantial application logic and many passing tests, but the inspected trading paths do not support its claims of consistent, institution-grade execution controls. Local reproductions show incorrect order units, simulated closure of live positions, database-only cancellation, permissive handling of missing control data, unsafe retry identity, and accounting inconsistencies. **Do not rely on the audited implementation for unattended live execution until the affected paths are repaired and validated against venue sandboxes.** This is a software release-readiness conclusion, not investment advice or a cybersecurity assessment.

This report records **20 findings: 14 P1 and 6 P2**. P1 identifies core correctness, recovery, or reproducibility failures that block confidence in the affected capability. P2 identifies narrower integration, analysis, or verification gaps. The priorities are engineering classifications, not vulnerability ratings. The commit contains documentation and evidence, not application remediation.

## Source, scope, and evidence

- Repository: `https://github.com/AKIVA-AI/enterprise-crypto.git`.
- Audited revision: **`e603ddd7bb908d24321a640ba1ac646e5b043600`**. Fetch succeeded; local `main` matched freshly fetched `origin/main`.
- Initial working tree contained 15 pre-existing tracked deletions: `.coverage` and 14 Python bytecode files. They were preserved and excluded from this audit commit. No staged changes existed initially.
- Inspected scope: frontend routes and critical trading controls; edge order lifecycle; backend OMS, sizing, risk, execution planner, reconciliation, numerical backtesting, signal generation, agent/Framework integration; migration reproducibility; packaging and CI. The refreshed [codebase map](../CODEBASE_MAP.md) distinguishes implemented, simulated, and unverified behavior.
- Evidence: [commands, versions, source hashes, logs, coverage data, and runnable probes](evidence/2026-09-17-enterprise-crypto/README.md). Python probes use real repository methods with database/exchange doubles. Node probes transpile repository TypeScript and substitute platform/I/O bindings; they do not certify a deployed Deno runtime.
- No exchanges or live databases were contacted by probes. No orders, migrations, deployments, dependency upgrades, security scans, browser E2E sessions, or load tests were performed. The installed Python environment differs from CI pins. Findings are tied to the inspected source and recorded environment.

This continues the engineering audit series and proposes repairs against the enterprise standards' behavioral verification, traceability, and recovery objectives. It does not assign a new composite score or claim a complete scored standards audit. A visual page-by-page UX sweep, live schema verification, and production-readiness certification were not performed.

## Verification results

| Check | Result | Important qualification |
| --- | --- | --- |
| Frontend tests | **298 passed across 20 files** | Existing mocks include the live price feed. |
| Frontend configured coverage | 74.69% statements, 59.12% branches, 76.86% lines | Only **44 loaded files** are represented. |
| Frontend full-source coverage | **7.97% statements, 6.25% branches, 8.31% lines** across 290 files | Same 298 tests pass, but all four configured 10% coverage thresholds fail; functions are 7.37%. |
| Frontend type-check | Passed | `tsc -p tsconfig.app.json --noEmit`. |
| Frontend lint | Passed, including zero-warning threshold | Current configuration disables several type/hook rules. |
| Frontend build | Passed on Node 22.23.2 | Warnings include large chunks and stale Browserslist data. |
| Backend tests | **1,204 passed, 2 failed, 3 skipped** | Failures are Sentry initialization returning false with `cannot find context for 'fork'` on this Windows environment. |
| Backend coverage | **63.2765% statements**: 9,208/14,552 | Meets 60% floor; branch coverage was not enabled. |
| Backend CI-style Ruff | Passed | `--select E,W,F --ignore E501`. |
| Backend mypy | **1,062 errors in 63 files** | Installed environment; CI uses `continue-on-error: true`. |
| Optional Framework tests | **37 passed separately** | Sibling Framework source at `65d3740a1e2258656e28f426b6b4e5fa3684c7c5`; not installed-package interoperability. |
| Audit probes | 16 core Python, 5 analytics, 9 TypeScript observations | Successful assertions demonstrate the recorded behavior, including defects. |

The first frontend test/build attempts were blocked by sandbox ancestor-directory access; identical checks passed when rerun with the necessary local execution permission. An initial Python network guard also blocked Windows asyncio's local socket pair. That harness defect was corrected to allow loopback support while continuing to block external connections and the dummy service port; the initial failure counts are **not** product findings. The measured backend results above are from the corrected run.

## Findings and acceptance criteria

### EC-01 — P1: OMS mixes USD notional with asset quantity and discards order terms

**Source:** [oms_execution.py](../../backend/app/services/oms_execution.py), `execute_intent` and `place_order`; [portfolio_engine.py](../../backend/app/services/portfolio_engine.py), `calculate_position_size`.

Position sizing returns a USD exposure budget, then `execute_intent` assigns it directly to `Order.size`, which adapters treat as base-asset quantity. A $1,000 intent sends size `1000`; at the fixture price $50,000 its intended quantity would be `0.02`. The manual helper also turns a request for two units at a $100 limit into a market order of size 200 with no price. Evidence: `usd_notional_used_as_base_quantity`, `manual_limit_order_contract_lost` in `core-probes.json`.

**Proposed repair:** Use distinct validated fields/types for notional, quantity, price, and currency. Resolve a current executable price, convert exactly once, apply venue precision/minimums, and retain order type/limit through intent execution.

**Acceptance:** Assert the actual adapter payload for market/limit buy/sell across two differently priced assets. Notional must remain within the approved budget after conversion, and a limit instruction must never silently become market execution.

### EC-02 — P1: Closing a live position simulates the trade and overstates closure

**Source:** [live-trading/index.ts](../../supabase/functions/live-trading/index.ts), `close_position`; [useLiveTrading.ts](../../src/hooks/useLiveTrading.ts), `useClosePosition`.

The close action always constructs a `simulated` venue order and calls `simulateFill`, irrespective of live mode. It subtracts requested close size rather than confirmed filled size, and continues after failed safety checks. With a ten-unit position and a five-unit simulated fill, the local probe returns `closedSize=10`, marks the position closed, and makes **zero venue submissions**. Evidence: `live_position_close_only_simulates_and_overstates_fill`.

**Proposed repair:** Route position reduction through the actual execution state machine, with an explicit policy for risk-reducing operations during a halt. Apply confirmed fills only; leave the remainder open and report partial/unknown outcomes accurately.

**Acceptance:** Live close must obtain a venue acknowledgement and reconcile fills. Test partial fill, rejected order, halted venue, percentage boundaries, and uncertain timeout. UI closure must reflect confirmed remaining exposure.

### EC-03 — P1: Cancellation can succeed locally without cancelling at the venue

**Source:** [live-trading/index.ts](../../supabase/functions/live-trading/index.ts), `cancel_order`; [oms_execution.py](../../backend/app/services/oms_execution.py), `_save_order` and `cancel_order`.

The edge action only updates the order table and returns success. In the Python path, `_save_order` omits `venue_order_id`; cancellation treats an absent venue ID as an unsubmitted order and also returns success after a database update. Both behaviors were reproduced with zero venue cancellation calls. Evidence: `cancel_order_only_updates_database`, `oms_drops_venue_order_id`, `oms_cancel_without_persisted_id_skips_venue`.

**Proposed repair:** Persist both client and venue identities and distinguish never-submitted, acknowledged, cancel-requested, cancelled, and unknown states. A local write is not venue confirmation.

**Acceptance:** Cancel an acknowledged order through both public entry paths. Failure/timeouts must retain a pending or unknown cancellation state; a late fill must still be applied and reconciled.

### EC-04 — P1: Missing control data can permit trading and select live mode

**Source:** [live-trading/index.ts](../../supabase/functions/live-trading/index.ts), `runSafetyChecks` and `place_order`; [risk_engine.py](../../backend/app/services/risk_engine.py), `_check_global_kill_switch`.

The edge kill-switch check ignores returned database errors. A separate paper-mode read defaults to the live branch when its result is absent (`!settings?.paper_trading_mode`). A fixture settings failure passes safety and reaches a mocked live submission. Additionally, missing health rows cause successful table probes to override an existing `oms: unhealthy` row. The Python risk engine treats an empty global-settings result as an inactive switch. Evidence: `settings_read_error_passes_safety`, `missing_paper_mode_defaults_to_live`, `missing_health_rows_override_known_unhealthy`, and `risk_missing_control_data_is_permissive`.

**Proposed repair:** Require an explicit, fresh, valid control snapshot and an explicit live-mode value before submitting. Keep unknown/degraded state separate from healthy. Fallback probes must not erase known failures.

**Acceptance:** Missing rows, read errors, malformed settings, stale health, partial health inventories, and unknown mode cannot authorize new live exposure. This should be shared across all order-entry paths.

### EC-05 — P1: The daily-loss check excludes closed positions and substitutes zero on errors

**Source:** [risk_engine.py](../../backend/app/services/risk_engine.py), `_get_daily_pnl` and `check_intent`.

The purported daily P&L query filters to `is_open=True` without a date/session boundary. It excludes losses on positions already closed while including accumulated P&L from open positions. A failed read returns `0.0`, which the caller interprets as no loss. Query capture and fault injection reproduce both behaviors in `core-probes.json`.

**Proposed repair:** Derive daily realized P&L from timestamped fills/ledger entries and unrealized change from a defined session opening mark. Propagate unavailable data as a separate risk state.

**Acceptance:** Closing a losing position cannot reset the day's loss. Test midnight/session rollover, historical positions, fees, missing prices, and storage outages against a hand-calculated fixture ledger.

### EC-06 — P1: Retries do not preserve execution identity

**Source:** [oms_execution.py](../../backend/app/services/oms_execution.py), `execute_intent`; [live-trading/index.ts](../../supabase/functions/live-trading/index.ts), `executeOnVenue`/`executeCoinbaseOrder`; [oms-client.ts](../../supabase/functions/_shared/oms-client.ts).

Submitting the same Python intent twice generates two different order IDs and reaches the adapter twice. When the edge probe models a lost response after possible venue acceptance, all three retries generate fresh Coinbase `client_order_id` values. The shared intent helper accepts an idempotency key but does not insert it in its row payload. Evidence: `same_intent_executes_twice`, `uncertain_submission_retried_with_new_client_ids`; the shared-helper omission is source inspection.

**Proposed repair:** Allocate durable intent/attempt identity before the first submission and reuse it on retry. Reconcile uncertain outcomes by that identity before any resubmission. Enforce uniqueness in durable storage and carry keys through every adapter/helper.

**Acceptance:** Simulated response loss after acceptance results in one economic order across retries, restarts, and duplicate message delivery. Distinguish definitive rejection from unknown outcome.

### EC-07 — P1: Post-execution persistence failures are reported as success or rejection

**Source:** [oms_execution.py](../../backend/app/services/oms_execution.py), execution try/except; [live-trading/index.ts](../../supabase/functions/live-trading/index.ts), fill/order/position writes; [order_gateway.py](../../backend/app/services/order_gateway.py).

After a confirmed Python fill, a first save failure changes the same order to `REJECTED` and retries saving it, retaining a positive filled size. The edge handler ignores `{error}` from post-execution writes and returns HTTP 200/success despite failed order, fill, and position writes. The separate OrderGateway also ignores a false write result, although repository search found no production callers for that alternate class. Evidence: `filled_order_relabelled_rejected_after_save_error`, `post_execution_writes_fail_but_response_succeeds`, `alternate_gateway_ignores_persistence_failure`.

**Proposed repair:** Persist submission intent before external execution; durably record accepted/fill/unknown outcomes and reconcile them. Group ledger/order/position updates in short database transactions after external calls, with an outbox for notifications. Do not imply an exchange and database share an atomic transaction. Supabase's [insert contract](https://supabase.com/docs/reference/javascript/insert) exposes errors in the returned result and requires checking them.

**Acceptance:** Fault-inject each write after a fill and restart the process. The system must retain recoverable exposure, never label a known fill as an unexecuted rejection, and never announce fully recorded success on a failed ledger update.

### EC-08 — P1: Multi-leg recovery can create exposure or lose track of fills

**Source:** [execution_planner.py](../../backend/app/services/execution_planner.py), `execute_plan` and `_unwind_if_needed`.

Three distinct boundary failures share the planner's incomplete fill-state tracking: a rejected zero-fill leg is appended and later unwound using `filled_size or size`, causing a new reverse order; a filled leg whose save fails is never appended, so no unwind is attempted; and a partial first fill does not reduce the next leg's quantity. Local doubles reproduce each. Evidence: `unwind_submits_reverse_order_for_rejected_zero_fill`, `planner_loses_filled_leg_when_persistence_fails`, `next_leg_ignores_partial_fill_size`.

**Proposed repair:** Track confirmed fills separately from requested quantities and persistence status. Cancel unresolved remainder before compensation; hedge only actual net filled exposure. Persist and escalate failed compensation instead of returning an empty list as the whole outcome.

**Acceptance:** Exercise zero fill, partial fill, late fill, rejected second leg, save failure, and failed unwind. Net exposure and recovery status must remain calculable after every transition. Cross-venue unwind is compensating execution, not atomic rollback.

### EC-09 — P1: Reduce-only logic allows flips, and cached books can retain an active state

**Source:** [oms_execution.py](../../backend/app/services/oms_execution.py), `_is_reducing_order`/`set_reduce_only`; [portfolio_engine.py](../../backend/app/services/portfolio_engine.py), `_books_cache`/`get_book`.

Python reduce-only classification checks opposite direction without limiting size. A $10,000 opposite intent against a $500 position is classified as reducing. Book records are cached without expiry/version validation, and external freezes or the OMS's direct reduce-only update do not invalidate that cache. The cache probe still reads `active` after the database update. Evidence: `reduce_only_accepts_position_flip`, `book_cache_does_not_observe_external_freeze`.

**Proposed repair:** Evaluate signed post-trade exposure using consistent units and bound reductions to existing size. Treat book control state as fresh/versioned decision data and revalidate immediately before submission.

**Acceptance:** An order cannot flip a position in reduce-only mode. A cached active book must observe another process's freeze before the next order; test concurrent control changes and fills.

### EC-10 — P1: Coinbase order acceptance is misread, and request contracts are stale

**Source:** [coinbase_adapter.py](../../backend/app/adapters/coinbase_adapter.py), `_place_live_order`/`_authenticated_request`; [live-trading/index.ts](../../supabase/functions/live-trading/index.ts), `executeCoinbaseOrder`.

The backend reads a top-level `order_id` while the documented response nests it under `success_response`. It also values a market buy using a hardcoded $50,000 when no price is supplied: a fixture two-unit ETH request sends quote size $100,000. The edge code assumes requested size is filled when the acknowledgement has no fill information; the probe returns a full two-unit fill at price zero from an order-ID-only acknowledgement. Both implementations use HMAC `CB-ACCESS-*` headers for the Advanced Trade endpoint, whose current [Create Order reference](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/create-order) specifies bearer authentication and the nested acknowledgement. No real credentials or exchange calls were used.

**Proposed repair:** Use a supported venue client or verified protocol adapter, preserve the nested venue ID, and obtain actual fill events/order status before accounting. Remove guessed prices and reject unavailable valuation.

**Acceptance:** Contract tests using current official response fixtures must distinguish accepted/unfilled, partial, filled, rejected, and unknown. Sandbox validation must confirm request authentication, quantity precision, lifecycle, and cancellation before enabling live routing.

### EC-11 — P1: Backtest cash, trade P&L, and final equity disagree

**Source:** [institutional_backtester.py](../../backend/app/services/institutional_backtester.py), `_open_position`, `_close_position`, `_record_equity`, `_run_single_backtest`.

A one-unit short entered at 100 and closed at 90 reports +10 trade P&L, but cash falls from 1,000 to 990 instead of increasing to 1,010. Short closing uses the long-sale cash formula. Separate flat-price fee fixtures show trade P&L omitting the entry fee, while the last equity point precedes forced final liquidation and omits its exit fee. Evidence: the first two observations in `analytics-probes.json`.

**Proposed repair:** Define one cash/position/fee ledger for long and short accounting. Calculate trade P&L from both entry and exit costs, and record terminal equity after all liquidation effects.

**Acceptance:** Hand-calculated long/short win/loss and flat-price round trips must reconcile cash change, realized P&L, fees, and terminal equity exactly within the chosen numeric tolerance.

### EC-12 — P1: Missing market data becomes unlabelled synthetic input in live configuration

**Source:** [enhanced_signal_engine.py](../../backend/app/services/enhanced_signal_engine.py), `fetch_market_data`; [opportunity_scanner.py](../../backend/app/services/opportunity_scanner.py), `_build_signal_stack`.

Empty/failed market queries return generated OHLCV without checking paper mode or marking data quality. Even populated snapshots have randomized highs/lows rather than measured candles. The probe sets the effective backend paper mode to false, requests `5m` data, and receives 30 synthetic hourly rows with no quality column. The scanner uses this function for its fast/medium/slow stack and reports the requested timeframe labels. Evidence: `live_mode_market_gap_yields_untagged_hourly_synthetic_data`.

**Proposed repair:** Carry provenance, freshness, and interval through market data and signals. Restrict synthetic generation to an explicit simulation interface; aggregate real timestamped observations to the requested interval and block live decisions on unavailable data.

**Acceptance:** Live configuration plus missing/stale data produces no executable signal. Timeframe fixtures verify real resampling, and all simulation outputs remain visibly tagged through UI, intent, and audit records.

### EC-13 — P2: Reconciliation joins on the wrong order identity

**Source:** [live_reconciliation.py](../../backend/app/services/live_reconciliation.py), `_reconcile_single_order` and venue-order map construction.

Reconciliation looks up `internal_order['id']` in a map of venue order IDs, ignoring the stored `venue_order_id`. A fixture containing the correct venue order is reported `not_found`. The method accepts recent fills but does not use them to resolve this mismatch. Evidence: `reconciliation_matches_local_id_instead_of_venue_id`.

**Proposed repair:** Normalize venue-specific identifiers and join by persisted venue/client identity. Apply fill reconciliation idempotently; missing open-order records alone must not determine a terminal state.

**Acceptance:** Local and venue IDs deliberately differ in tests. Cover open orders, completed orders visible only through fills, partial fills, and repeated reconciliation.

### EC-14 — P1: Non-finite intent values can pass risk approval

**Source:** [domain.py](../../backend/app/models/domain.py), `TradeIntent`/`Order`; [risk_engine.py](../../backend/app/services/risk_engine.py), numeric comparisons.

Exposure and loss fields have no finite/positive constraints. A real `TradeIntent` with NaN exposure and NaN maximum loss passes `RiskEngine.check_intent` when unrelated controls are healthy, because its threshold comparisons evaluate false. Evidence: `nonfinite_intent_approved`.

**Proposed repair:** Validate finite, meaningful numeric domains at model boundaries and again before venue serialization. Keep invalid/unknown values out of all approval, sizing, and accounting calculations.

**Acceptance:** NaN, infinity, negative/zero quantities where invalid, invalid prices, and zero-capital books produce explicit errors or non-approval, never a passing risk result or ambiguous arithmetic failure.

### EC-15 — P1: The current migration chain cannot reconstruct the application schema

**Source:** [baseline migration](../../supabase/migrations/20260330230000_baseline.sql) and the two later timestamped migrations.

The 204-byte baseline contains comments only and states that schema is managed remotely. Later files alter existing function permissions but do not create the tables, enums, or functions they reference. There is no executable schema baseline in the active migration chain. Thus a fresh checkout cannot reproduce the application database from those files alone. This is a source-confirmed deployment/recovery gap; no remote schema was queried and no migration was applied.

**Proposed repair:** Capture and review a complete reproducible baseline or a documented equivalent schema artifact, then validate it in an isolated database. Version required extensions, functions, tables, triggers, grants, and required seed/control records together.

**Acceptance:** A clean ephemeral database can apply the committed chain, start the application, and run core order/risk/ledger contract tests without manual dashboard work or undeclared historical files. Do not assume old map counts describe the current remote schema.

### EC-16 — P2: Frontend backend clients disagree with route and session contracts

**Source:** [apiClient.ts](../../src/lib/apiClient.ts); [main.py](../../backend/app/main.py), router registration; [arbitrage.py](../../backend/app/api/arbitrage.py) and [strategies.py](../../backend/app/api/strategies.py), prefixes.

The shared frontend client defaults to `/api` and adds `/arbitrage/status`, while the composed backend route is `/api/v1/api/arbitrage/status`. The request helper does not obtain or attach the signed-in session token required by backend dependencies. Hooks for arbitrage and FreqTrade strategies use this client. The local TypeScript probe captures the default URL and absence of an Authorization header; source inspection confirms the composed route. Production example values also omit a common route contract.

**Proposed repair:** Publish one API prefix and schema, generate or contract-test the client, and centralize session-aware HTTP/WebSocket setup with token refresh. Align environment examples and build-time configuration.

**Acceptance:** A signed-in frontend can load these features against the actual FastAPI router using documented defaults, with expired/missing-session behavior surfaced clearly. Validate both default and production base URLs.

### EC-17 — P2: Walk-forward aggregate mixes overlapping training and test periods

**Source:** [walk_forward_engine.py](../../backend/app/services/walk_forward_engine.py), `run`; [institutional_backtester.py](../../backend/app/services/institutional_backtester.py), combined results; [performance_metrics.py](../../backend/app/services/performance_metrics.py), equity conversion.

Each window's returned equity includes training and test segments, with capital reset between splits. Walk-forward aggregation concatenates every window's entire series and trades. A boundary probe using a simple backtester double captures 18 points over 10 unique timestamps for three four-train/two-test windows; six test-period points would be the intended non-overlapping OOS observations in that fixture. The metrics converter keeps the last value per timestamp while trades remain concatenated. This is not a coherent compounded out-of-sample curve.

**Proposed repair:** Separate training, validation, and held-out results structurally. Aggregate only the specified OOS intervals with an explicit capital/reset convention; validate chronological order and overlap. Make annualization depend on the actual bar interval and market calendar rather than a fixed daily factor for hourly returns.

**Acceptance:** A hand-labelled rolling-window fixture yields exactly the intended OOS timestamps/trades without training leakage or duplicates. Equity and aggregate return reconcile under the documented capital convention.

### EC-18 — P2: Agent/control-plane capability claims exceed runtime wiring

**Source:** [agent_orchestrator.py](../../backend/app/agents/agent_orchestrator.py); [execution_agent.py](../../backend/app/agents/execution_agent.py); [order_gateway.py](../../backend/app/services/order_gateway.py); README.

The orchestrator constructs optional Framework risk/evidence adapters and logs them as active, but the module never evaluates that policy engine or emits through the evidence adapter. Authority boundaries are read for registration/status. ExecutionAgent's execution method remains an unconditional random-fill simulation. Separately, OrderGateway and OMS both describe themselves as the sole order writer, while the edge function writes orders directly; repository search finds no production imports of OrderGateway. The earlier map's claim that all venue adapters are merely random stubs is also obsolete: some now contain HTTP live paths, albeit with the defects above.

**Proposed repair:** Establish one canonical execution boundary; label other paths as simulations, adapters, or deprecated code. Wire policy/evidence checks at the actual execution boundary before claiming enforcement. Distinguish “adapter tests pass” from “every runtime submission is governed.”

**Acceptance:** Trace a real local request/message to the chosen execution boundary and its durable evidence. Fault-injected policy denial blocks every relevant caller. Live configuration cannot use random simulated fills without an explicit simulation classification.

### EC-19 — P2: Verification gates conceal broad untested or non-blocking behavior

**Source:** [vitest.config.ts](../../vitest.config.ts), [CI workflow](../../.github/workflows/ci.yml), type/test logs, and repository instructions.

Default frontend coverage represents only 44 files; explicitly including source expands it to 290 files and fails the existing 10% thresholds. Backend mypy emits 1,062 errors in this environment and is non-blocking in CI, contrary to the repo instruction's “CI-blocking” claim. Optional Framework tests skip without dependencies. Edge functions are excluded from frontend ESLint and the frontend TypeScript project; the current CI does not establish their runtime contracts. Repo instructions also point to nonexistent `apps/backend/` instead of `backend/`.

**Proposed repair:** Include all intended source in coverage; make skipped/optional boundaries visible; add edge-function contract/type checks; baseline and progressively enforce meaningful typing. Correct instruction paths and replace static “CI passing” badges with actual workflow status. Preserve the separate Windows Sentry limitation until reproduced in the pinned supported environment.

**Acceptance:** Untested files remain in coverage denominators; required feature jobs cannot pass by skipping whole modules; type gates are explicit and enforceable. A clean documented environment reproduces test results without relying on workspace-wide packages.

### EC-20 — P2: Container build definitions do not match the validated toolchain

**Source:** [Dockerfile.frontend](../../Dockerfile.frontend), [backend Dockerfile](../../backend/Dockerfile), installed package engine metadata, and staging CI job.

The frontend image uses Node 18, while installed Vite 7.3.2 declares Node `^20.19.0 || >=22.12.0`; the successful audit build used Node 22.23.2. The image also uses `npm install` rather than the CI lockfile installation command. The backend dependency-install shell chain ends with `|| true`, allowing an earlier pip failure in that chain to be masked. CI's staging job only echoes placeholder deployment/health messages. These are source/metadata findings; Docker images and remote CI were not run.

**Proposed repair:** Align supported Node/Python images and deterministic dependency installation with CI. Restrict tolerated cleanup failures to cleanup commands so dependency installation cannot pass silently. Label placeholder deployment jobs as such until a real deploy/health/rollback workflow exists.

**Acceptance:** Build both images from a clean context and run local startup/health checks with explicit test configuration. A forced dependency-install failure must fail the build. Deployment success must depend on an actual target health check.

## Prioritized engineering proposal

| Sequence | Work | Required proof |
| --- | --- | --- |
| 1 | Canonical order model and lifecycle; explicit modes and fresh controls | One unit/currency contract; unknown control state cannot authorize live exposure. |
| 2 | Stable identity, durable submission journal, fill accounting, reconciliation | Lost acknowledgements and persistence failures recover to one economic order and a consistent ledger. |
| 3 | True close/cancel and multi-leg compensation | Venue-confirmed outcomes, partial-fill accounting, bounded compensation, and explicit unresolved exposure. |
| 4 | Numerical and data provenance correctness | Hand-calculated accounting fixtures; tagged simulation; timeframe-correct data; uncontaminated OOS metrics. |
| 5 | Reproducible schema/toolchain and executable integration contracts | Clean database/image replay, frontend-to-backend tests, Deno/venue fixtures, meaningful full-source coverage. |

Use short database transactions for internal state and ledger changes; never hold database locks while waiting on an exchange. Preserve an append-only event identity and versioned control snapshots so replay can explain exactly what was authorized and executed. The Supabase Postgres guidance informed this recommendation; it does not imply that a local transaction can roll back a venue fill.

Further optimization should follow correctness: reduce repeated synchronous database calls in async paths, profile polling/subscription churn, split large frontend bundles, and add measured queue/backpressure and decision-latency budgets. Add agent loop tests for lost/duplicate messages, stale approvals, cancellation, restart, and bounded retries. These are proposed improvements, not measured performance claims.

## Comparison with prior documentation and limits

The April report/map is historical evidence, not current verification. Frontend type-checking is now correctly targeted; backend coverage is enforced at 60%, CI includes a Python matrix and coverage uploads, and observability integrations exist. Conversely, “all adapters are mocked,” “no tracing,” “one complete baseline,” and “blocking mypy” are inaccurate descriptions of this checkout. The new map corrects those categories without restating unverified remote table/policy counts.

No live exchange interoperability, profits, deployed schema, database isolation, cryptographic controls, regulatory compliance, production load, accessibility conformance, or deployment health was certified. The passing tests and bounded probes establish the behaviors described here within their stated substitutions. Application repairs remain outstanding.
