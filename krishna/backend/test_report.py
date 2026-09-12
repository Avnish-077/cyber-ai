import io
import os
import re
import sys
import pandas as pd
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app, IN_MEMORY_STORE

client = TestClient(app)


def test_investigative_brief_flow():
    print("=" * 65)
    print("   TESTING INVESTIGATIVE INTELLIGENCE BRIEF API & PDF EXPORT")
    print("=" * 65)

    project_root = os.path.abspath(os.path.join(backend_dir, ".."))
    cdr_path = os.path.join(project_root, "sample-data", "cdr_sample.csv")
    bank_path = os.path.join(project_root, "sample-data", "bank_upi_sample.csv")

    assert os.path.exists(cdr_path), f"CDR sample not found at {cdr_path}"
    assert os.path.exists(bank_path), f"Bank sample not found at {bank_path}"

    # 1. Ingest evidence files
    print("\n1. Ingesting sample evidence files...")
    with open(cdr_path, "rb") as f1, open(bank_path, "rb") as f2:
        files = [
            ("files", ("cdr_sample.csv", f1, "text/csv")),
            ("files", ("bank_upi_sample.csv", f2, "text/csv")),
        ]
        res_upload = client.post("/api/upload", files=files)
        assert res_upload.status_code == 200, f"Upload failed: {res_upload.text}"
        print(f"   [PASS] Uploaded {res_upload.json()['total_rows_ingested']} evidence records.")

    # 2. Test POST /api/report
    print("\n2. Calling POST /api/report to generate investigative brief...")
    res_report = client.post("/api/report")
    assert res_report.status_code == 200, f"Report generation failed: {res_report.text}"
    brief = res_report.json()

    print(f"   [PASS] Case Reference: {brief['case_id']}")
    print(f"   [PASS] Classification: {brief['classification']}")
    print(f"   [PASS] Metrics: {brief['metrics']}")

    assert "prime_suspects" in brief, "Missing prime_suspects in report JSON"
    assert "clusters" in brief, "Missing clusters in report JSON"
    assert "seizure_recommendations" in brief, "Missing seizure_recommendations in report JSON"
    assert len(brief["prime_suspects"]) > 0, "Expected at least 1 prime suspect"
    assert len(brief["seizure_recommendations"]) > 0, "Expected at least 1 seizure directive"

    print(f"\n   Prime Suspects ({len(brief['prime_suspects'])}):")
    for idx, s in enumerate(brief["prime_suspects"][:5], 1):
        print(f"     {idx}. {s['id']} ({s['type'].upper()}) - Score: {s['risk_score']}/100 [{s['risk_level'].upper()}]")
        print(f"        Reason: {s['primary_reason']}")

    print(f"\n   Syndicate Clusters ({len(brief['clusters'])}):")
    for c in brief["clusters"]:
        print(f"     [{c['cluster_id']}] {c['title']} - Members: {c['total_nodes']} (Max Score: {c['max_risk_score']})")
        print(f"        Synopsis: {c['synopsis']}")

    print(f"\n   Immediate Seizure Directives ({len(brief['seizure_recommendations'])}):")
    for r in brief["seizure_recommendations"][:5]:
        print(f"     - [{r['action']}] (Priority: {r['priority']})")
        print(f"       Directive: {r['directive']}")
        print(f"       Statutory: {r['statutory_provision']}")

    # 3. Test GET /api/report (inspection without regeneration)
    print("\n3. Calling GET /api/report (cache inspection)...")
    res_get = client.get("/api/report")
    assert res_get.status_code == 200
    assert res_get.json()["case_id"] == brief["case_id"]
    print(f"   [PASS] GET /api/report delivered matching brief: {res_get.json()['case_id']}")

    # 4. Test GET /api/report/download (PDF Download)
    print("\n4. Calling GET /api/report/download (PDF download stream)...")
    res_pdf = client.get("/api/report/download")
    assert res_pdf.status_code == 200, f"PDF download failed: {res_pdf.status_code}"
    assert "application/pdf" in res_pdf.headers.get("content-type", "")
    assert "attachment" in res_pdf.headers.get("content-disposition", "")
    assert ".pdf" in res_pdf.headers.get("content-disposition", "")

    pdf_bytes = res_pdf.content
    print(f"   [PASS] Received PDF file ({len(pdf_bytes)} bytes)")
    assert pdf_bytes.startswith(b"%PDF-"), "Invalid PDF binary signature"

    # Verify single-page PDF requirement
    page_matches = re.findall(rb"/Type\s*/Page\b", pdf_bytes)
    print(f"   [PASS] PDF Page Count: {len(page_matches)} page(s)")
    assert len(page_matches) == 1, f"Expected strictly 1-page PDF, got {len(page_matches)}"

    print("\n" + "=" * 65)
    print("SUCCESS: Investigative Brief & Single-Page PDF Passed All Tests!")
    print("=" * 65)


if __name__ == "__main__":
    test_investigative_brief_flow()
