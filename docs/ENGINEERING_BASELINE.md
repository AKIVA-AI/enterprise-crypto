# Engineering Baseline

**Generated:** 2026-03-20
**Standard:** BENCHMARK Standard v1.0 §3.1
**System:** Enterprise Crypto (Algorithmic Trading Platform)
**Archetype:** 7 — Algorithmic Trading Platform
**Composite Score:** 72/100

## Dependencies

| Package | Version |
|---------|---------|
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| react-router-dom | ^6.30.3 |
| react-hook-form | ^7.61.1 |
| @tanstack/react-query | ^5.90.12 |
| @supabase/supabase-js | ^2.89.0 |
| zod | ^3.25.76 |
| recharts | ^3.8.0 |

## Frameworks

| Framework | Version |
|-----------|---------|
| Vite | ^7.3.1 |
| React | ^18.3.1 |
| Tailwind CSS | ^3.4.17 |
| Vitest | ^4.0.16 |

## Language Versions

| Language | Version |
|----------|---------|
| TypeScript | ^5.8.3 |
| Python (backend) | >=3.10 |
| Node.js | >=18 |

## Test Coverage

- Frontend tests: 254 passed (13 test files)
- Backend tests: 1208 collected (pytest)
- Total: ~1462 (frontend + backend)
- Coverage: 64% (backend, per S4 sprint record)
- Framework: Vitest (frontend), pytest (backend)

## Build Metrics

- Build tool: Vite 7.3.1
- TypeScript errors: 0
- Lint errors: not measured this run

## Security Posture

- npm audit HIGH: 5 (flatted prototype pollution via @vitest/ui dependency chain)
- Known vulnerabilities: flatted <=3.4.1 — prototype pollution in parse() (GHSA-rf6f-7fwh-wjgh)
- Fix: `npm audit fix` (vitest/flatted update)

## Architecture Patterns

- **State management:** TanStack React Query
- **Routing:** React Router v6
- **Auth:** Supabase Auth
- **API structure:** Supabase client + FastAPI backend (Python)
- **Backend deps:** FastAPI 0.121.3, asyncpg, Supabase Python SDK
- **Validation:** Zod v3
- **Charts:** Recharts v3
- **UI:** Tailwind CSS v3 + shadcn/ui components
- **Trading:** Kill switch, position management, risk dashboard
