"""Build and verify a disposable PostgreSQL/Redis/Celery stack (requires Docker)."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from uuid import uuid4
import httpx

ROOT = Path(__file__).resolve().parents[1]
workspace = Path(tempfile.mkdtemp(prefix="intake-async-verify-"))
project = f"intake-verify-{uuid4().hex[:8]}"
(workspace / "files").mkdir()
# Fault injection belongs to this isolated verification process, never production.
(workspace / "worker_bootstrap.py").write_text("""import os, signal
from pathlib import Path
from app.core.config import DATA_DIR
from app.core.celery_app import celery_app
from app.services import job_processing
original = job_processing.process_csv_file

def crash_once(path, **kwargs):
    marker = DATA_DIR / "crash-injected"
    if path.name.endswith("crash-once.csv") and not marker.exists():
        marker.touch()
        os.kill(os.getpid(), signal.SIGKILL)
    return original(path, **kwargs)
job_processing.process_csv_file = crash_once
celery_app.worker_main(["worker", "--loglevel=INFO", "--concurrency=2", "--hostname=worker@%h"])
""")
override = workspace / "override.yml"
override.write_text(f"""services:
  api:
    ports: !override
      - "127.0.0.1::8000"
    volumes: !override
      - {workspace}/files:/app/data
  redis:
    ports: !override []
  worker:
    command: ["python", "/verify/worker_bootstrap.py"]
    environment:
      PYTHONPATH: /app
    volumes: !override
      - {workspace}/files:/app/data
      - {workspace}:/verify:ro
""")
env = {
    **os.environ,
    "JOB_TIME_LIMIT_SECONDS": "5",
    "JOB_LEASE_SECONDS": "10",
    "DISPATCH_INTERVAL_SECONDS": "0.25",
    "JOB_REDISPATCH_SECONDS": "2",
    "JOB_QUEUE_TIMEOUT_SECONDS": "90",
    "PUBLISH_MAX_FAILURES": "20",
    "OPENAI_API_KEY": "",
    "CELERY_BROKER_URL": "redis://redis:6379/0",
    "CELERY_QUEUE": "verification-csv",
    "JOB_MAX_ATTEMPTS": "3",
    "POSTGRES_PASSWORD": "verification_local_only",
    "MAX_UPLOAD_BYTES": "10485760",
}
command = [
    "docker",
    "compose",
    "-p",
    project,
    "-f",
    str(ROOT / "docker-compose.yml"),
    "-f",
    str(override),
]


def compose(*args, capture=False):
    return subprocess.run(
        [*command, *args],
        env=env,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
    ).stdout


def wait_for(client, job_id, statuses, timeout=45):
    deadline = time.monotonic() + timeout
    latest = None
    while time.monotonic() < deadline:
        try:
            response = client.get(f"/api/v1/jobs/{job_id}")
        except httpx.RequestError:
            time.sleep(0.2)
            continue
        response.raise_for_status()
        latest = response.json()
        if latest["status"] in statuses:
            return latest
        if latest["status"] == "failed" and "failed" not in statuses:
            raise AssertionError(latest)
        time.sleep(0.2)
    raise AssertionError(f"Timed out: {latest}")


try:
    print(
        f"Isolated verification project: {project}; logs/workspace: {workspace}",
        flush=True,
    )
    with (workspace / "build.log").open("w") as output:
        subprocess.run(
            [*command, "up", "--build", "-d", "--wait", "--wait-timeout", "180"],
            env=env,
            stdout=output,
            stderr=subprocess.STDOUT,
            check=True,
        )
    address = compose("port", "api", "8000", capture=True).strip()
    sample = (ROOT / "backend/samples/anomaly_demo.csv").read_bytes()
    with httpx.Client(base_url=f"http://{address}", timeout=15) as client:

        def upload(name="async.csv", content=sample):
            started = time.monotonic()
            response = client.post(
                "/api/v1/uploads", files={"file": (name, content, "text/csv")}
            )
            assert response.status_code == 202, response.text
            result = response.json()
            assert result["status"] == "pending" and "task_id" not in result
            assert time.monotonic() - started < 5
            return result["job_id"]

        compose("stop", "worker")
        job_id = upload()
        wait_for(client, job_id, {"queued"})
        compose("restart", "api")
        # Docker may assign a different ephemeral host port on restart.
        address = compose("port", "api", "8000", capture=True).strip()
        client.base_url = f"http://{address}"
        # Wait for API readiness after restart.
        for _ in range(100):
            try:
                if client.get("/health").status_code == 200:
                    break
            except httpx.HTTPError:
                pass
            time.sleep(0.2)
        else:
            raise AssertionError("API did not become ready after restart")
        assert wait_for(client, job_id, {"queued"})["processed_at"] is None
        # Lose a queued message in this disposable Redis. Outbox must republish.
        compose("exec", "-T", "redis", "redis-cli", "FLUSHDB")
        compose("start", "worker")
        job = wait_for(client, job_id, {"completed"})
        assert job["analysis"]["quality"]["score"] == 92.5
        assert job["analysis"]["anomaly_count"] == 3
        assert job["attempts"] == 1
        print(
            "PASS: immediate acceptance, queued state, API restart, message loss recovery, real Celery results",
            flush=True,
        )
        # Duplicate messages must not rewrite completed files or metrics.
        compose(
            "exec",
            "-T",
            "worker",
            "python",
            "-c",
            f"from app.tasks import process_job_task; process_job_task.delay({job_id}); process_job_task.delay({job_id})",
        )
        time.sleep(1)
        assert client.get(f"/api/v1/jobs/{job_id}").json() == job
        crash_id = upload("crash-once.csv")
        crashed = wait_for(client, crash_id, {"completed"})
        assert crashed["attempts"] == 2, crashed
        print(
            "PASS: duplicate delivery and SIGKILL worker-child recovery with a fenced second attempt",
            flush=True,
        )
        bad = upload("bad.csv", b"email\ninvalid")
        failed = wait_for(client, bad, {"failed"})
        assert (
            failed["attempts"] == 1
            and "Missing required columns" in failed["error_message"]
        )
        compose("stop", "redis")
        outage = upload("redis-outage.csv")
        time.sleep(4)
        assert client.get(f"/api/v1/jobs/{outage}").json()["status"] == "pending"
        compose("start", "redis")
        wait_for(client, outage, {"completed"})
        print(
            "PASS: deterministic invalid-data failure and acceptance/recovery through Redis outage",
            flush=True,
        )
        # Delete through the container that owns the artifact, rather than
        # assuming Docker and the host use the same filesystem UID.
        compose(
            "exec",
            "-T",
            "worker",
            "python",
            "-c",
            "from sqlmodel import Session; "
            "from app.core.db import engine; "
            "from app.core.config import OUTPUT_DIR; "
            "from app.models.processing_job import ProcessingJob; "
            f"session = Session(engine); job = session.get(ProcessingJob, {job_id}); "
            "path = (OUTPUT_DIR / job.filename_cleaned).resolve(); "
            "assert path.is_relative_to(OUTPUT_DIR.resolve()); "
            "path.unlink(); session.close()",
        )
        assert client.get(f"/api/v1/jobs/{job_id}/download/clean").status_code == 404
        assert (
            client.get("/api/v1/jobs?status=completed&search=ASYNC").json()["total"]
            == 1
        )
        compose("exec", "-T", "api", "alembic", "current")
        print(
            "PASS: missing output response, PostgreSQL history/search, and migrations",
            flush=True,
        )
        subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts/smoke_api.py"),
                "--base-url",
                str(client.base_url),
            ],
            check=True,
        )
        (workspace / "verification.json").write_text(
            json.dumps({"project": project, "passed": True})
        )
except Exception:
    with (workspace / "failure.log").open("w") as output:
        subprocess.run(
            [*command, "logs", "--tail=200"],
            env=env,
            stdout=output,
            stderr=subprocess.STDOUT,
        )
    print(
        f"Verification failed; inspect {workspace}/build.log and failure.log",
        flush=True,
    )
    raise
finally:
    compose("down", "--volumes", "--remove-orphans")
