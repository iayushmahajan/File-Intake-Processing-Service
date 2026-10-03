"""Run only against a disposable deployment: this creates a processing job."""

import argparse
import time
from pathlib import Path
import httpx

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base-url", required=True)
parser.add_argument(
    "--timeout", type=float, default=90, help="Seconds to wait for processing"
)
args = parser.parse_args()
with httpx.Client(base_url=args.base_url, timeout=30) as client:
    client.get("/health").raise_for_status()
    sample = Path(__file__).resolve().parents[1] / "backend/samples/anomaly_demo.csv"
    response = client.post(
        "/api/v1/uploads",
        files={"file": (sample.name, sample.read_bytes(), "text/csv")},
    )
    response.raise_for_status()
    result = response.json()
    assert response.status_code == 202 and result["status"] == "pending", result
    deadline = time.monotonic() + args.timeout
    while True:
        detail = client.get(f"/api/v1/jobs/{result['job_id']}")
        detail.raise_for_status()
        job = detail.json()
        if job["status"] == "completed":
            break
        assert job["status"] != "failed", job
        assert time.monotonic() < deadline, f"Processing timed out: {job}"
        time.sleep(0.25)
    assert job["analysis"]["anomaly_count"] == 3, job
    assert job["analysis"]["quality"]["score"] == 92.5, job
    assert (
        client.get("/api/v1/jobs?search=ANOMALY&status=completed").json()["total"] >= 1
    )
    assert client.get("/api/v1/jobs?search=" + "9" * 100).json()["total"] == 0
    client.get(f"/api/v1/jobs/{job['id']}/download/clean").raise_for_status()
    print("API smoke passed: upload, persistence, score, anomalies, search, download.")
