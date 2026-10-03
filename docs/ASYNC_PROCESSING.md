# Background processing design

## Why a worker and a dispatcher?

The API previously held an HTTP request open during parsing, validation and analytics. It now accepts durable work and returns 202. Celery isolates CPU/file work from API request lifetimes; Redis supplies local task transport. Existing processing, scoring, validation, AI and dashboard code remain in use.

Publishing directly after an API database commit leaves a gap: a process can die after saving the job but before notifying Redis. `job_executions` is a small database outbox and execution record created in the same transaction as the job. The dispatcher scans it independently of API requests and publishes due IDs. No broker result backend, beat scheduler, distributed lock service or monitoring platform is required.

## Responsibilities

- **Upload route:** validate basic upload, save file, commit job + file metadata + dispatch intent, return job ID and Location/status URL. Never execute processing or wait on Redis.
- **Dispatcher:** publish due IDs, record successful/failed publication, retry with bounded backoff, republish unclaimed work, expire queue waits and recover expired execution leases.
- **Celery adapter:** validate through the service and retry transient DB connectivity errors twice. JSON messages contain only a job ID.
- **Job processing service:** atomically claim an eligible job, manage worker-owned sessions, call existing CSV services, verify results/files, publish only while owning the current lease.
- **React:** poll active jobs, retain selected ID in the URL, refresh history, stop on terminal states, keep existing analytical views.

## Lifecycle

| State | Meaning |
|---|---|
| pending | Input/job/work intent persisted; awaiting dispatch or retry |
| queued | A publication succeeded; a worker has not claimed the job yet |
| processing | One worker holds a token and finite lease for this attempt |
| completed | Current attempt committed counts, analysis and output references |
| failed | File/processing failure or exhausted publication/execution/wait limit |

Publication and consumption race legitimately: a fast worker may move pending directly to processing before the dispatcher records queued. The dispatcher's conditional update cannot regress processing or completed state. The upload's pending response is an acceptance snapshot; the detail endpoint is authoritative for current state. Active jobs expose `processed_at: null`; final timestamps appear only after termination.

## Claims, duplicates and fencing

A conditional SQL UPDATE acquires the execution row only when it has no owner and attempts remain. The status is verified in the same transaction. Processing happens outside the database transaction. Each worker uses its own short-lived `Session`; Celery prefork children dispose inherited connection pools.

A unique claim token and expiry identify each attempt. Output files go under `output/job-{id}/{token}/`. Final publication conditionally updates the same execution row using its token and lease, then commits job/analysis metadata together. An expired worker cannot publish over another attempt and cannot overwrite its files. Terminal jobs ignore repeated messages. Public API responses return output basenames; internal attempt tokens and directory paths remain in database storage references.

This is guarded result publication under at-least-once delivery, not a general exactly-once system. The database and local files cannot share an atomic commit. If a commit acknowledgement is lost, files are retained to avoid deleting an already committed result. If a worker is killed before cleanup, its unreferenced attempt files may remain. Retention cleanup is a future concern.

## Retry policy

Default values are configurable and shared across services:

- Hard execution limit: 120 seconds; soft limit: 118 seconds.
- Lease: 150 seconds, necessarily at least five seconds longer than the hard limit.
- Execution attempts: at most three.
- Publication: at most eight consecutive failures, exponential delay capped at 30 seconds.
- Unclaimed work: republish every 30 seconds; fail after 600 seconds in the waiting phase. A recovered worker attempt starts a new waiting phase.
- Transient DB connectivity: at most two Celery retries with 2/4-second delay. Retries do not bypass an active claim; the durable dispatcher recovers it after expiry if needed.

Invalid headers/encoding, schema/business outcomes, unexpected processing exceptions, missing files and persistent storage permissions/space errors are not endlessly retried. Selected temporary filesystem errors and soft timeouts release the claim for a bounded retry. Hard worker death leaves its lease for dispatcher recovery. Repeated hard deaths exhaust the attempt limit.

Malformed argument values and unknown IDs are ignored without mutating unrelated jobs. Task envelopes with the wrong argument count are rejected by Celery; the durable intent remains eligible for correct republishing or a queue-timeout failure.

Celery uses late acknowledgements, rejection on worker loss, prefetch one and JSON-only accepted content. Redis AOF reduces broker loss; republishing repairs lost queued messages while the database intent survives. See [Celery task semantics](https://docs.celeryq.dev/en/v5.5.3/userguide/tasks.html) and [Redis transport behavior](https://docs.celeryq.dev/en/v5.5.3/getting-started/backends-and-brokers/redis.html).

## Storage and deployment

The API and worker must share input/output files. In Compose they mount the same `backend/data` directory and use PostgreSQL. The dispatcher does not read files. All backend processes use the same image and database/queue configuration. Root `.env.example` uses the Compose Redis hostname; `backend/.env.example` uses localhost for Python processes outside Docker. An existing root `.env` with localhost Redis must be updated before starting the full Compose stack.

Use the default prefork pool for hard/soft task limits. SQLite is retained for single-worker local development and tests; write serialization and shared-file access prevent it from being the scaling path. Run migrations once (the API startup does this in Compose) before starting workers/dispatcher. Migration 0002 preserves completed jobs and analytics and marks legacy interrupted synchronous jobs failed rather than guessing whether to rerun them.

Keep clocks reasonably aligned; leases use UTC timestamps. Do not lower a lease below the hard execution limit. More concurrency increases CPU and in-memory dataset pressure; it does not eliminate the per-upload memory cost.

## Troubleshooting

```bash
docker compose ps
docker compose logs --tail=100 api worker dispatcher redis
docker compose exec redis redis-cli ping
docker compose exec worker celery -A app.core.celery_app:celery_app inspect ping
docker compose exec api alembic current
```

- **Pending stays pending:** check dispatcher and Redis. Retry messages explain publication failures; a stopped dispatcher cannot update state until it restarts.
- **Queued stays queued:** check worker health and matching `CELERY_QUEUE`, database and broker URLs. Queue timeout ultimately marks the job failed.
- **Processing after worker death:** allow the configured lease to expire; the dispatcher recovers or fails the attempt. A stopped dispatcher must be restarted for recovery.
- **Database outage:** workers and dispatcher cannot persist state during the outage. Recovery resumes once the database is reachable; it is not a guarantee against database loss.
- **Missing input/output:** ensure API/worker mount the same persistent directory. Missing inputs fail jobs; deleted published outputs return 404 without discarding historical analytics.
- **Repeated timeouts:** inspect input complexity and memory, then adjust hard limit and lease together. Re-upload a terminal failed job after correcting the cause.
- **Docker command/socket missing in WSL:** start Docker Desktop on Windows and enable integration for this distro. This is required for the stack and browser verification.
- **Docker credential-helper error in WSL:** repair your Docker client helper configuration. Verification in this workspace used an isolated temporary Docker config for public image pulls rather than editing the user's configuration.

No user-facing task IDs are needed; use the application's job ID in API requests and logs. No automatic terminal-job retry button is introduced in this phase. Lost upload responses can lead clients to submit the same file twice; task idempotency does not provide upload-request idempotency.

## Verification commands

```bash
backend/.venv/bin/python -m pytest backend/tests -q
npm exec --yes --package=pnpm@10.32.1 -- pnpm --dir frontend test
npm exec --yes --package=pnpm@10.32.1 -- pnpm --dir frontend build
npm exec --yes --package=pnpm@10.32.1 -- pnpm --dir frontend test:e2e
backend/.venv/bin/python scripts/verify_async_stack.py
docker compose config --quiet
git diff --check
```

API/unit tests create temporary database/files and use an isolated memory transport while explicitly calling tasks. Browser tests use a real disposable Redis container and separate API/worker/dispatcher processes with temporary SQLite. The stack verifier creates a unique Compose project, fresh PostgreSQL/Redis volumes and temporary storage; only that stack is subjected to message deletion, restarts and worker-child SIGKILL. It removes its containers/volumes afterward and leaves logs under the printed `/tmp` directory for diagnosis. AI calls remain mocked or disabled.


The real-stack verifier removes a generated artifact inside its owning container, so the missing-output check does not assume matching host/container UIDs. It then invokes `scripts/smoke_api.py`, which asserts HTTP 202 acceptance and polls until completion with a bounded timeout. GitHub Actions includes this verifier as a separate integration job; browser verification remains local.
