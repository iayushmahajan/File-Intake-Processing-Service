from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_jobs_returns_jobs() -> None:
    upload_response = client.post(
        "/api/v1/uploads",
        files={
            "file": (
                "jobs_sample.csv",
                (
                    b"customer_id,email,country,signup_date,order_amount\n"
                    b"CUST-101,alice@example.com,DE,2026-04-01,125.50\n"
                ),
                "text/csv",
            )
        },
    )
    assert upload_response.status_code == 200

    response = client.get("/api/v1/jobs")

    assert response.status_code == 200
    data = response.json()

    assert "jobs" in data
    assert isinstance(data["jobs"], list)
    assert len(data["jobs"]) >= 1


def test_get_job_by_id() -> None:
    upload_response = client.post(
        "/api/v1/uploads",
        files={
            "file": (
                "single_job.csv",
                (
                    b"customer_id,email,country,signup_date,order_amount\n"
                    b"CUST-102,bob@example.com,US,2026-04-02,99.99\n"
                ),
                "text/csv",
            )
        },
    )
    assert upload_response.status_code == 200

    job_id = upload_response.json()["job_id"]

    response = client.get(f"/api/v1/jobs/{job_id}")

    assert response.status_code == 200
    data = response.json()

    assert data["id"] == job_id
    assert data["filename_original"] == "single_job.csv"
    assert data["total_rows"] == 1
    assert data["valid_rows"] == 1
    assert data["invalid_rows"] == 0


def test_get_job_not_found() -> None:
    response = client.get("/api/v1/jobs/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found."}


def test_download_cleaned_file() -> None:
    upload_response = client.post(
        "/api/v1/uploads",
        files={
            "file": (
                "clean_download.csv",
                (
                    b"customer_id,email,country,signup_date,order_amount\n"
                    b"CUST-103,alice@example.com,DE,2026-04-01,125.50\n"
                ),
                "text/csv",
            )
        },
    )
    assert upload_response.status_code == 200

    job_id = upload_response.json()["job_id"]

    response = client.get(f"/api/v1/jobs/{job_id}/download/clean")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert "alice@example.com" in response.text


def test_download_error_file() -> None:
    upload_response = client.post(
        "/api/v1/uploads",
        files={
            "file": (
                "error_download.csv",
                (
                    b"customer_id,email,country,signup_date,order_amount\n"
                    b",wrong-email,ZZ,01-04-2026,-20\n"
                ),
                "text/csv",
            )
        },
    )
    assert upload_response.status_code == 200

    job_id = upload_response.json()["job_id"]

    response = client.get(f"/api/v1/jobs/{job_id}/download/errors")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert "customer_id is required" in response.text


def test_download_cleaned_file_job_not_found() -> None:
    response = client.get("/api/v1/jobs/999999/download/clean")

    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found."}


def test_download_error_file_job_not_found() -> None:
    response = client.get("/api/v1/jobs/999999/download/errors")

    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found."}