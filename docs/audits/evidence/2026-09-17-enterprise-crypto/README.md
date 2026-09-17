# Enterprise Crypto audit evidence — 2026-09-17

Source: `e603ddd7bb908d24321a640ba1ac646e5b043600`, matching freshly fetched `origin/main`. See the [report](../../2026-09-17-ENTERPRISE_CRYPTO_ENGINEERING_AUDIT.md).

## Inventory

- `initial.json`: initial revision/deletions, installed Python versions, environment notes.
- `provenance.json`: 761 pre-audit tracked-file hashes (excluding bytecode/build-info/coverage artifacts), versions, Framework revision, counts, limits. Hashes describe the old map before this audit updated it.
- `checks.json`, `checks-retry.json`, `frontend-retry.json`, `extra-checks.json`: commands, exit codes, retry context.
- `*.stdout.txt`/`*.stderr.txt`: captured output. Initial backend run failed because the audit guard blocked Windows asyncio socket pairs; **use `backend-tests-retry.*` for measured backend results**. Initial frontend esbuild sandbox failures are separate from successful retries.
- `backend-coverage.json`: corrected run, 63.2765% statements; not branch coverage.
- `frontend-default-coverage.json`: 44 loaded files, 74.6943% statements.
- `frontend-full-coverage.json`: explicit source inclusion, 290 files, 7.9723% statements. Same 298 passing assertions; coverage gates fail.
- `core-probes.json`: 16 observations from real order/risk methods with local venue/DB doubles.
- `analytics-probes.json`: five numerical, reconciliation, provenance, and rolling-window observations.
- `edge-probes.json`: nine observations from transpiled repository edge/client TypeScript with platform/I/O doubles.
- `final-verification.json`: archived replay, scope, references, and evidence-script checks.
- `SHA256SUMS`: hashes of every other file in this directory.

Logs normalize trailing whitespace, line endings, and ANSI color sequences; failing results are not rewritten as passes. Empty streams remain empty. Probe scripts were formatted, then the archived versions replayed. Random IDs/timings/paths can vary.

## Replay

Use recorded versions, from the repository root. Baseline: Windows/Python 3.12.10, Node 22.23.2. This was **not** a clean installation of exact CI pins. Sentry failures are local compatibility observations, not asserted Linux CI failures.

Copy archived `sitecustomize.py` to ignored scratch before replaying outside the original workspace. It blocks external Python sockets but permits Windows asyncio loopback; dummy service port 9 remains blocked. No application credentials are needed.

```powershell
New-Item -ItemType Directory -Force .radar/audit-20260917
Copy-Item docs/audits/evidence/2026-09-17-enterprise-crypto/sitecustomize.py .radar/audit-20260917/sitecustomize.py
python docs/audits/evidence/2026-09-17-enterprise-crypto/run_checks.py --repo .
python docs/audits/evidence/2026-09-17-enterprise-crypto/extra_checks.py
python docs/audits/evidence/2026-09-17-enterprise-crypto/reproduce.py --repo .
python docs/audits/evidence/2026-09-17-enterprise-crypto/analytics_probes.py --repo .
node docs/audits/evidence/2026-09-17-enterprise-crypto/edge_probes.cjs .
```

Check scripts write under `.radar/audit-20260917/` and may overwrite their scratch outputs. `run_checks.py` supports `--only backend-tests --label retry`. It records child failures rather than using its own exit status as an overall quality verdict; inspect JSON child exit codes. `frontend_retry.py` repeats checks when sandbox file access blocks esbuild. Run checks where local esbuild file access is permitted. Scripts do not stage, commit, push, or install dependencies.

`extra_checks.py` measures full-source frontend coverage and separately runs Framework tests using sibling `akiva-ai-framework/packages/execution-contracts/src` and `packages/policy-runtime/src`. The audit used clean package trees at `65d3740a1e2258656e28f426b6b4e5fa3684c7c5`. Its 37 tests are a separate run, not one combined default suite.

Python probes replace persistence, venue calls, and selected unrelated gates to isolate named behavior. Sizing uses the real sizing function with unrelated risk/cost checks allowed. OrderGateway is tested as an isolated class without identified production callers. Walk-forward uses a window-result double to capture real aggregation. Data provenance sets effective live configuration against a mocked empty data source; no engine is started. Probe exit zero means the recorded behavior was reproduced, not that product correctness passed.

The TypeScript probe strips imports through the TS AST and runs transpiled code in a Node VM with local `serve`, Supabase, auth, timers, and fetch bindings plus platform crypto. Authentication is a fixed successful fixture, not the subject of testing. Every fetch is a local double. The client probe replaces `import.meta.env` with an empty fixture object. This establishes implementation logic, not Deno or deployed-schema compatibility.

## Limits and preserved state

No migrations, deployment, trained models, exchange order, cybersecurity assessment, browser E2E, or load test was performed. No live schema was read. Edge probes focus on the trading lifecycle; all 36 functions were not runtime-tested. Frontend checks do not certify accessibility/all page states.

Initial deletions of `.coverage` and 14 `.pyc` files remain outside the commit. Product source/dependencies/tests/migrations/CI are unchanged. Build outputs, caches, and credentials are not committed.
