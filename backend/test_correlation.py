import os
import sys
import pandas as pd

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from correlation_engine import correlate_entities


def test_standalone_correlation():
    print("=" * 65)
    print("   CYBER FRAUD CORRELATOR - STANDALONE CORRELATION TEST")
    print("=" * 65)

    project_root = os.path.abspath(os.path.join(backend_dir, ".."))
    cdr_path = os.path.join(project_root, "sample-data", "cdr_sample.csv")
    bank_path = os.path.join(project_root, "sample-data", "bank_upi_sample.csv")

    assert os.path.exists(cdr_path), f"CDR sample not found at {cdr_path}"
    assert os.path.exists(bank_path), f"Bank sample not found at {bank_path}"

    print(f"Reading sample files from:\n  - {cdr_path}\n  - {bank_path}\n")

    cdr_df = pd.read_csv(cdr_path, dtype=str).fillna("")
    bank_df = pd.read_csv(bank_path, dtype=str).fillna("")

    # Convert to records with source file metadata
    cdr_records = cdr_df.to_dict(orient="records")
    for r in cdr_records:
        r["_filename"] = "cdr_sample.csv"

    bank_records = bank_df.to_dict(orient="records")
    for r in bank_records:
        r["_filename"] = "bank_upi_sample.csv"

    all_records = cdr_records + bank_records
    print(f"Loaded {len(cdr_records)} CDR rows and {len(bank_records)} Bank UPI rows ({len(all_records)} total records).")

    # Run correlation engine
    result = correlate_entities(all_records)

    nodes = result["nodes"]
    edges = result["edges"]
    summary = result["summary"]

    print("\n--- CORRELATION GRAPH SUMMARY ---")
    print(f"Total Unique Nodes (Identifiers): {summary['total_nodes']}")
    print(f"Total Graph Edges:                {summary['total_edges']}")
    print(f"Cross-File Links Identified:      {summary['number_of_cross_file_links']}")

    print("\n--- IDENTIFIER BREAKDOWN BY TYPE ---")
    for id_type, count in summary["node_types"].items():
        print(f"  - {id_type.upper():<10}: {count}")

    print("\n--- CROSS-FILE SUSPECT ANCHORS ---")
    cross_file_entities = summary.get("cross_file_entities", [])
    if cross_file_entities:
        for idx, entity in enumerate(cross_file_entities, 1):
            node_info = next((n for n in nodes if n["id"] == entity), None)
            files = ", ".join(node_info.get("files", [])) if node_info else "multiple"
            ntype = node_info.get("type", "entity") if node_info else ""
            print(f"  [{idx}] {entity} ({ntype.upper()}) -> Linked across: {files}")
    else:
        print("  None detected.")

    print("\n--- SAMPLE EDGES (CO-OCCURRENCE & CROSS-FILE) ---")
    cross_edges = [e for e in edges if e.get("relationship_type") == "cross-file link"]
    co_edges = [e for e in edges if e.get("relationship_type") != "cross-file link"]

    print(f"Cross-file Link Edges ({len(cross_edges)} found):")
    for e in cross_edges[:5]:
        print(f"  [CROSS-LINK] {e['source']} <===> {e['target']} | {e['evidence']}")

    print(f"\nSample Intra-Record Co-occurrence Edges ({len(co_edges)} total):")
    for e in co_edges[:6]:
        print(f"  [CO-OCCUR] {e['source']} <---> {e['target']} ({e['relationship_type']}) | {e['evidence']}")

    # Validation assertions
    assert summary["total_nodes"] > 0, "No nodes created in graph"
    assert summary["total_edges"] > 0, "No edges created in graph"
    assert summary["number_of_cross_file_links"] > 0, "Expected cross-file links between CDR and Bank UPI samples"

    print("\n--- RISK SCORING ANALYSIS ---")
    print(f"Risk Level Breakdown:")
    for r_level, r_count in summary.get("risk_levels", {}).items():
        print(f"  - {r_level.upper():<8}: {r_count} entities")

    print("\nTop 7 Highest-Risk Suspicious Entities:")
    top_entities = summary.get("top_risk_entities", [])[:7]
    for idx, e in enumerate(top_entities, 1):
        print(f"  {idx}. [{e['risk_level'].upper()}] (Score: {e['risk_score']}/100) {e['id']} ({e['type'].upper()})")
        print(f"     Reason: {e['primary_reason']}")

    for n in nodes:
        assert "risk_score" in n, f"Node {n['id']} missing risk_score"
        assert 0 <= n["risk_score"] <= 100, f"Invalid risk_score {n['risk_score']}"
        assert n["risk_level"] in ("low", "medium", "high"), f"Invalid risk_level {n['risk_level']}"

    assert len([n for n in nodes if n["risk_level"] == "high"]) > 0, "Expected at least 1 high-risk entity"

    print("\n" + "=" * 65)
    print("SUCCESS: Standalone correlation engine & risk scoring passed all verifications!")
    print("=" * 65)


if __name__ == "__main__":
    test_standalone_correlation()
