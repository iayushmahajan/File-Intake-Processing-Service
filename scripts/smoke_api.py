"""Run only against a disposable deployment: this creates a processing job."""

import argparse
from pathlib import Path
import httpx

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base-url", required=True)
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
    assert result["status"] == "completed", result
    detail = client.get(f"/api/v1/jobs/{result['job_id']}")
    detail.raise_for_status()
    job = detail.json()
    assert job["analysis"]["anomaly_count"] == 3, job
    assert job["analysis"]["quality"]["score"] == 92.5, job
    assert (
        client.get("/api/v1/jobs?search=ANOMALY&status=completed").json()["total"] >= 1
    )
    assert client.get("/api/v1/jobs?search=" + "9" * 100).json()["total"] == 0
    client.get(f"/api/v1/jobs/{job['id']}/download/clean").raise_for_status()
    print("API smoke passed: upload, persistence, score, anomalies, search, download.")
