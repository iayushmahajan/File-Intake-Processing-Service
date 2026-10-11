"""Run against disposable infrastructure: creates templates and linked jobs."""

import argparse
import csv
import io
import time

import httpx

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base-url", required=True)
args = parser.parse_args()
fields = "customer_id,email,country,signup_date,order_amount,currency,payment_method,order_status,product_category,quantity,discount_percent,last_login_date".split(
    ","
)
headers = [name.replace("_", " ").title() for name in fields]
row = (
    "C1,alice@example.com,DE,2026-04-01,125.50,EUR,card,completed,books,2,10,2026-04-10"
)
source = "\n".join(
    [
        ",".join(headers),
        row,
        row.replace("C1,", "C2,").replace("alice@example.com", "bad-email"),
    ]
).encode()
options = {"mapping": dict(zip(fields, headers)), "rules": {}}


def finished(client, job_id):
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/jobs/{job_id}")
        response.raise_for_status()
        job = response.json()
        assert job["status"] != "failed", job
        if job["status"] == "completed":
            return job
        time.sleep(0.2)
    raise AssertionError("Worker did not complete the import")


with httpx.Client(base_url=args.base_url, timeout=20) as client:
    import json

    response = client.post(
        "/api/v1/imports/templates",
        json={"name": "Verification partner", "options": options},
    )
    response.raise_for_status()
    template = response.json()
    chosen = dict(
        options, template_id=template["id"], template_version=template["version"]
    )
    response = client.post(
        "/api/v1/uploads",
        files={"file": ("partner.csv", source, "text/csv")},
        data={"import_options": json.dumps(chosen)},
    )
    assert response.status_code == 202, response.text
    parent = finished(client, response.json()["job_id"])
    assert parent["valid_rows"] == 1 and parent["invalid_rows"] == 1
    url = f"/api/v1/jobs/{parent['id']}"
    # JSON field sorting and escaped search work on PostgreSQL, not just SQLite.
    response = client.get(
        url + "/records?status=rejected&category=Email&sort=email&search=bad-email"
    )
    response.raise_for_status()
    assert response.json()["total"] == 1
    assert response.json()["records"][0]["row_number"] == 3
    filtered = client.get(url + "/records/export?status=rejected&category=Email")
    filtered.raise_for_status()
    assert len(list(csv.DictReader(io.StringIO(filtered.text)))) == 1
    patches = {"patches": {"3": {"email": "bob@example.com"}}}
    response = client.post(url + "/corrections/validate", json=patches)
    response.raise_for_status()
    assert response.json()["valid"]
    response = client.post(url + "/corrections", json=patches)
    assert response.status_code == 202, response.text
    child = finished(client, response.json()["job_id"])
    assert child["parent_job_id"] == parent["id"]
    assert child["valid_rows"] == 2 and child["invalid_rows"] == 0
    assert child["corrections"]["3"]["email"]["before"] == "bad-email"
    assert client.get(url + "/download/input").content == source
    assert client.get(url).json()["invalid_rows"] == 1
    updated = client.put(
        f"/api/v1/imports/templates/{template['id']}",
        json={
            "name": "Verification partner",
            "options": dict(options, rules={"order_amount": {"maximum": 100}}),
            "expected_version": 1,
        },
    )
    assert updated.status_code == 200 and updated.json()["version"] == 2
    assert client.get(url).json()["import_options"]["template_version"] == 1
    print(
        "PASS: PostgreSQL record filtering/export, mapped import, versioned template snapshot, worker correction and immutable original"
    )
