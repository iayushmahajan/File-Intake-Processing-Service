# Upgrade checkpoint

## Current async phase — 2026-10-02

The original analytical upgrade was preserved in `db04fb4`, followed by checkpoint commit `85aa613`. The sections below the historical divider describe that earlier synchronous baseline, not the current architecture.

### Implemented

- HTTP 202 upload acceptance with atomic persistence of job, metadata and dispatch intent.
- Redis/Celery execution, a database-backed dispatcher, explicit pending/queued/processing/completed/failed states and worker-owned database sessions.
- Atomic claims, bounded publication/execution retries, queue timeouts, expired-lease recovery, attempt-specific files and guarded result publication.
- Polling and refresh continuity in React, terminal-state analytics and history updates, safe downloads using public basenames.
- Additive migration 0002, PostgreSQL/SQLite compatibility and preserved historical analytics/AI reports.
- Environment-driven Compose broker configuration; corrected async smoke and real-stack verification scripts; added integration CI job.
- Updated README, architecture/lifecycle/troubleshooting documentation and frontend test instructions. README screenshots removed as requested.

### Current verification

- `backend/.venv/bin/python -m pytest backend/tests -q`: **61 passed**, including SQLite migration preservation and ambiguous upload/worker commit and post-commit timeout tests.
- `npm exec --yes --package=pnpm@10.32.1 -- pnpm --dir frontend test`: **10 passed**.
- `npm exec --yes --package=pnpm@10.32.1 -- pnpm --dir frontend build`: **passed**.
- `backend/.venv/bin/python -m pip check`: **passed**.
- Ruff checks on changed Python implementation/test scripts: **passed**.
- `git diff --check`: **passed** at review; repeat after final documentation updates.
- `docker compose config --quiet`: **passed**. The development API, PostgreSQL, Redis, worker and dispatcher all became healthy.
- `DOCKER_CONFIG=/tmp/intake-docker-client npm exec --yes --package=pnpm@10.32.1 -- pnpm --dir frontend test:e2e`: **2 passed** (21.6 seconds), using real Redis/Celery and isolated SQLite/files.
- `DOCKER_CONFIG=/tmp/intake-docker-client backend/.venv/bin/python scripts/verify_async_stack.py`: all assertions **passed**: acceptance, queued state, API restart, broker message loss, duplicate delivery, worker-child SIGKILL recovery, invalid CSV, Redis outage, missing-output 404, PostgreSQL search/history, migration `0002` and the asynchronous API smoke test. Disposable project: `intake-verify-009b4312`; diagnostics: `/tmp/intake-async-verify-0l82nbcm`.
- Docker Desktop was started by the user. Its Windows credential helper still fails under this WSL session; public-image builds used a temporary Docker client config containing `{}` without changing the user's Docker configuration.
- Remote GitHub Actions execution has not been observed; the integration job is configured, not claimed as remotely passed.

### Repeat integration verification

```bash
docker compose config --quiet
backend/.venv/bin/python scripts/verify_async_stack.py
npm exec --yes --package=pnpm@10.32.1 -- pnpm --dir frontend test:e2e
git diff --check
```

These commands use disposable verification resources; do not delete or reset development data. The verifier also runs the standalone asynchronous API smoke test. If the Windows credential helper fails, prefix Docker-dependent commands with `DOCKER_CONFIG=/tmp/intake-docker-client` after creating that directory with an empty JSON `config.json`. Verification records belong here; README remains focused on the project and usage.

### Remaining product limitations

At-least-once delivery with guarded commits is not exactly-once processing. Recovery depends on restored infrastructure and shared storage. Inputs/outputs and the relational database require coordinated backups. Orphan-file cleanup, request-level upload idempotency, authentication, retention, fully streaming analytics and server-side ranged previews remain outside this phase. SQLite is for single-worker development; PostgreSQL is the multi-process configuration. No live AI provider call is required or made by verification.

---

## Upgrade checkpoint — 2026-09-30

This is a verified implementation checkpoint, not a claim that every requested future architecture change is finished. The completed upgrade is preserved in commit `db04fb4` (already present when this continuation began). No external deployment was made. Existing development SQLite data was not used by tests or migrated during verification.

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

## Async phase starting baseline

The working tree and diff were clean on inspection. Reverification before this phase: 36 backend tests, 7 frontend tests, and the TypeScript/Vite build passed. This record preserves the completed upgrade before asynchronous changes; existing commit history is not rewritten.
