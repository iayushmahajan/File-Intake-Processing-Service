# Upgrade checkpoint — 2026-09-30

This is a verified implementation checkpoint, not a claim that every requested future architecture change is finished. No Git commit or deployment to an external account was made. Existing development SQLite data was not used by tests or migrated during verification.

## Implemented

- **Frontend:** restrained operations dashboard; selectable historical jobs; metric cards; acceptance donut; category bars; quality dimensions; numeric and categorical profiles; validation search; anomaly table; explicit optional AI generation/export; native accessible file-preview dialog; abortable requests; loading/error/empty states and mobile layout.
- **Backend:** bounded chunked upload saves, sanitized UUID filenames, persisted processing failures, typed analytical responses, server pagination/search/status filtering, constrained file downloads, configuration-driven CORS/storage/database.
- **Database:** persisted analytics/AI table; Alembic additive legacy adoption; history indexes; SQLite compatibility and PostgreSQL Compose support. Existing jobs without analytics remain accessible.
- **Processing:** stronger email and finite-number validation; date consistency; DE/FR currency rules; later duplicate-record rejection without forbidding repeated customers; source-record anomaly numbering; reproducible weighted quality score.
- **AI:** aggregate-only outbound data, strict Pydantic output validation, explicit request, bounded provider timeout/retry, generic safe errors, persisted successful reports.
- **Tests:** isolated backend database AND files; regression coverage for errors, limits, scores, privacy, cache, migration preservation and queries; frontend component/parser tests; real browser upload/history/preview/failure/mobile workflows.
- **Infrastructure:** PostgreSQL volume, health checks, secret-safe Docker build context, configuration examples, CI for backend/frontend tests and production build.
- **Documentation:** rewritten README with real screenshot, Mermaid architecture, score formulas, setup, API contract, limitations and interview discussion; fictional anomaly sample.

## Dependencies and purpose

- Papa Parse + TypeScript types: correct CSV preview parsing, including quoted multiline fields.
- Alembic: versioned additive migrations instead of startup-only table creation.
- Psycopg + PostgreSQL 16 Compose service: locally reproducible relational database deployment.
- Vitest, React Testing Library, jest-dom, jsdom: component and parser regression tests.
- Playwright: real browser workflow and mobile layout verification.
- Ruff and Prettier were used as local formatting tools; they are not new runtime dependencies.
- OpenAI client and dotenv were existing dependencies; their versions are now pinned.

No new hosted accounts, external storage, authentication SaaS or cloud queues were introduced.

## Verification

- `backend/.venv/bin/python -m pytest backend/tests -q`: 36 tests passed.
- `pnpm --dir frontend test`: 7 tests passed.
- `pnpm --dir frontend build`: TypeScript and Vite production build passed.
- `pnpm --dir frontend test:e2e`: 2 browser tests passed (desktop workflow and mobile overflow).
- `backend/.venv/bin/python -m pip check`: no broken requirements.
- `docker compose config --quiet`: passed.
- Temporary PostgreSQL/API Compose stack built and became healthy; `backend/.venv/bin/python scripts/smoke_api.py --base-url http://127.0.0.1:18000` passed (upload, persisted score/profile/anomalies, case-insensitive/oversized-ID search and CSV download). Test containers and their dedicated database volume were removed afterward.
- SQLite adoption migration preserves an existing legacy job and is repeatable.
- `git diff --check`: passed.

The local host's normal Docker credential helper pointed to a Windows executable that could not run in this Linux environment. Verification used an empty Docker client config under `/tmp`, leaving the user's Docker config unchanged. A PostgreSQL first-initialization readiness race was diagnosed and corrected by using a TCP health check and startup grace periods.

No live AI provider calls were made. AI integration was verified with stubs, privacy assertions, schema rejection and report persistence tests.

## Deferred, explicitly

1. **Redis/Celery/durable background processing:** the current request remains synchronous. The persisted states and detail polling do not constitute a queue. A follow-up needs broker publication-failure handling, atomic job claiming, crash recovery, retry/idempotency tests and worker deployment verification.
2. **Fully streaming analytics:** uploads save in chunks, but row collections and duplicate fingerprints remain in memory under a default 10 MiB input cap. Incremental profiles and bounded/error-stream output should be implemented together.
3. **Server-side file/error previews:** current preview fetches the size-limited CSV; error search covers the first 100 persisted rejected rows.
4. **Authentication, retention/deletion, automatic crash recovery:** absent and documented. This remains a single-operator/local portfolio application.
5. **CI browser/PostgreSQL matrix:** local integration verification exists; mandatory CI currently runs unit/API tests and build only.
6. **Historical backfill/database transfer:** new migrations preserve legacy job rows but do not regenerate missing analytics or transfer SQLite rows into PostgreSQL.

## Resume order

1. Read repository status and this checkpoint; preserve these uncommitted changes.
2. Run the documented isolated test/build commands before editing.
3. Extract synchronous processing orchestration from the upload route into a reusable job service.
4. Add durable queued processing with explicit publication/worker failure semantics and verified idempotency.
5. Update upload response/status UI, history polling and real browser tests for queued jobs.
6. Replace in-memory row accumulation with incremental profiling and streamed output; test equivalence and memory behavior.
7. Expand server previews and CI integration coverage as appropriate.

## Portfolio points already supported by code

- Designed a typed FastAPI ingestion API with persisted success/failure history and server-side pagination.
- Built deterministic, explainable data-quality scoring and historical analytical workspaces.
- Implemented relational persistence with PostgreSQL and non-destructive Alembic adoption.
- Developed a responsive React dashboard with accessible visualizations and robust CSV previews.
- Enforced aggregate-only AI inputs and validated/persisted model responses.
- Added isolated API, migration, component and browser regression tests.
- Verified a reproducible Docker Compose deployment and corrected an initialization readiness race.
