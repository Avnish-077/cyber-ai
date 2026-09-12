import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
import networkx as nx

# =====================================================================
# TUNABLE HEURISTIC RISK SCORING CONSTANTS
# =====================================================================
BASE_RISK_SCORE = 15                  # Baseline risk score for connected nodes
RAPID_FUND_ROUTING_BOOST = 45         # Boost for receiving and rapidly forwarding funds (mule behavior)
RAPID_ROUTING_WINDOW_MINUTES = 60     # Time window threshold (in minutes) for rapid pass-through
HIGH_VELOCITY_SIM_BOOST = 35          # Boost for phone linked to >2 IMEIs or IMEI linked to >2 phones
SIM_SWITCH_THRESHOLD = 2              # Threshold count of device/SIM associations
CROSS_FILE_LINK_BASE_BOOST = 25       # Boost for appearing in multiple evidence files
CROSS_FILE_EXTRA_PER_FILE = 10        # Incremental boost per additional file beyond 2
HIGH_DEGREE_BOOST = 15                # Boost for highly connected hub entities
HIGH_DEGREE_THRESHOLD = 5             # Degree threshold for hub entity
ISOLATED_NODE_PENALTY = -10           # Penalty for leaf nodes with only 1 connection
ISOLATED_DEGREE_THRESHOLD = 1         # Degree threshold for isolated entity

# Risk Level Classification Thresholds
RISK_LEVEL_LOW_MAX = 33               # 0 - 33: low risk
RISK_LEVEL_MED_MAX = 66               # 34 - 66: medium risk
# 67 - 100: high risk


def normalize_phone(val: str) -> str:
    """Normalize phone numbers to standard format (+91XXXXXXXXXX or standard digits)."""
    s = str(val).strip()
    digits = re.sub(r"\D", "", s)
    if len(digits) == 10:
        return f"+91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return s


def parse_timestamp(ts_val: Any) -> Optional[datetime]:
    """Robustly parse timestamp string or object into datetime."""
    if not ts_val:
        return None
    if isinstance(ts_val, datetime):
        return ts_val
    s = str(ts_val).strip()
    # Common format patterns
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d",
        "%d-%m-%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def extract_row_identifiers(row: Dict[str, Any]) -> List[Tuple[str, str, str]]:
    """
    Extracts key identifiers from a record row:
    Returns list of tuples: (node_id, identifier_type, display_label)
    Types: phone, imei, imsi, upi, ip, account
    """
    identifiers: List[Tuple[str, str, str]] = []
    seen_ids: Set[str] = set()

    def add_id(node_id: str, id_type: str, label: str):
        if not node_id or str(node_id).lower() in ("nan", "none", "null", "", "n/a"):
            return
        if node_id not in seen_ids:
            seen_ids.add(node_id)
            identifiers.append((node_id, id_type, label))

    # 1. Phone number
    raw_phone = row.get("phone_number") or row.get("phone") or row.get("msisdn") or row.get("mobile")
    if raw_phone:
        norm_phone = normalize_phone(raw_phone)
        add_id(norm_phone, "phone", norm_phone)

    # 2. IMEI
    raw_imei = row.get("imei") or row.get("imei_number") or row.get("imei_no")
    if raw_imei:
        s_imei = str(raw_imei).strip()
        add_id(s_imei, "imei", s_imei)

    # 3. IMSI
    raw_imsi = row.get("imsi") or row.get("imsi_number") or row.get("imsi_no")
    if raw_imsi:
        s_imsi = str(raw_imsi).strip()
        add_id(s_imsi, "imsi", s_imsi)

    # 4. UPI Handle
    raw_upi = row.get("upi_handle") or row.get("upi_id") or row.get("vpa") or row.get("upi")
    if raw_upi:
        s_upi = str(raw_upi).strip().lower()
        add_id(s_upi, "upi", s_upi)

        # If UPI handle has 10-digit phone prefix, also link phone identifier
        upi_phone_match = re.match(r"^(\d{10})@", s_upi)
        if upi_phone_match:
            extracted_phone = f"+91{upi_phone_match.group(1)}"
            add_id(extracted_phone, "phone", extracted_phone)

    # 5. IP Address
    raw_ip = row.get("ip_address") or row.get("ip") or row.get("client_ip")
    if raw_ip:
        s_ip = str(raw_ip).strip()
        add_id(s_ip, "ip", s_ip)

    # 6. Account Numbers (Sender and Receiver)
    raw_sender = row.get("sender_account") or row.get("from_account") or row.get("account_number")
    if raw_sender:
        s_sender = str(raw_sender).strip()
        add_id(s_sender, "account", s_sender)

    raw_receiver = row.get("receiver_account") or row.get("to_account")
    if raw_receiver:
        s_receiver = str(raw_receiver).strip()
        add_id(s_receiver, "account", s_receiver)

    return identifiers


def detect_multi_hop_fund_routing(records: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Detects accounts or UPI handles that both receive funds and rapidly forward them
    within RAPID_ROUTING_WINDOW_MINUTES (characteristic mule behavior).
    Returns mapping of entity_id -> explanation reason.
    """
    # Track inflows and outflows per account/UPI: { entity_id: {"inflows": [dt], "outflows": [dt]} }
    activity: Dict[str, Dict[str, List[datetime]]] = {}

    for row in records:
        ts = parse_timestamp(row.get("timestamp"))
        if not ts:
            continue

        sender = row.get("sender_account") or row.get("from_account")
        receiver = row.get("receiver_account") or row.get("to_account")
        upi = row.get("upi_handle") or row.get("upi_id")

        # Sender account outflow
        if sender:
            s_acc = str(sender).strip()
            activity.setdefault(s_acc, {"inflows": [], "outflows": []})["outflows"].append(ts)

        # Receiver account inflow
        if receiver:
            r_acc = str(receiver).strip()
            activity.setdefault(r_acc, {"inflows": [], "outflows": []})["inflows"].append(ts)

        # UPI handle activity
        if upi:
            u_val = str(upi).strip().lower()
            activity.setdefault(u_val, {"inflows": [], "outflows": []})
            # If sender exists, upi is typically receiver/payee
            if sender:
                activity[u_val]["inflows"].append(ts)
            else:
                activity[u_val]["outflows"].append(ts)

    flagged_entities: Dict[str, str] = {}

    for entity_id, acts in activity.items():
        inflows = sorted(acts["inflows"])
        outflows = sorted(acts["outflows"])

        if not inflows or not outflows:
            continue

        # Check if any inflow is followed by an outflow within RAPID_ROUTING_WINDOW_MINUTES
        rapid_match_found = False
        min_diff_minutes = 999999.0

        for t_in in inflows:
            for t_out in outflows:
                diff_sec = (t_out - t_in).total_seconds()
                diff_min = diff_sec / 60.0
                if 0 <= diff_min <= RAPID_ROUTING_WINDOW_MINUTES:
                    rapid_match_found = True
                    min_diff_minutes = min(min_diff_minutes, diff_min)

        if rapid_match_found:
            flagged_entities[entity_id] = (
                f"Rapid multi-hop routing detected: funds received & forwarded within {int(min_diff_minutes)} min"
            )

    return flagged_entities


def calculate_node_risk_scores(G: nx.Graph, records: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Computes heuristic risk scores (0-100) and risk levels ('low', 'medium', 'high')
    for each node in the correlation graph.
    """
    mule_flags = detect_multi_hop_fund_routing(records)
    results: Dict[str, Dict[str, Any]] = {}

    for node_id, data in G.nodes(data=True):
        score = BASE_RISK_SCORE
        reasons: List[str] = []
        ntype = data.get("type", "unknown")
        files_seen = data.get("files", set())
        files_count = len(files_seen)
        is_cross_file = data.get("cross_file", False) or files_count >= 2

        # 1. Multi-hop fund routing heuristic
        if node_id in mule_flags:
            score += RAPID_FUND_ROUTING_BOOST
            reasons.append(mule_flags[node_id])

        # 2. High-velocity SIM / device switching heuristic
        if ntype == "phone":
            connected_devices = set()
            for neighbor in G.neighbors(node_id):
                if neighbor != node_id and G.nodes[neighbor].get("type") in ("imei", "imsi"):
                    connected_devices.add(neighbor)
            if len(connected_devices) > SIM_SWITCH_THRESHOLD:
                score += HIGH_VELOCITY_SIM_BOOST
                reasons.append(f"High-velocity device switching ({len(connected_devices)} distinct IMEIs/SIMs)")

        elif ntype in ("imei", "imsi"):
            connected_phones = set()
            for neighbor in G.neighbors(node_id):
                if neighbor != node_id and G.nodes[neighbor].get("type") == "phone":
                    connected_phones.add(neighbor)
            if len(connected_phones) > SIM_SWITCH_THRESHOLD:
                score += HIGH_VELOCITY_SIM_BOOST
                reasons.append(f"High-velocity SIM hopping ({len(connected_phones)} distinct phone numbers)")

        # 3. Cross-file link heuristic
        if is_cross_file:
            boost = CROSS_FILE_LINK_BASE_BOOST + max(0, files_count - 2) * CROSS_FILE_EXTRA_PER_FILE
            score += boost
            reasons.append(f"Cross-file nexus: entity appears across {files_count} separate evidence files")

        # 4. Degree analysis (Hub vs. Isolated Leaf)
        # Degree excluding self-loops
        degree = len([nbr for nbr in G.neighbors(node_id) if nbr != node_id])

        if degree >= HIGH_DEGREE_THRESHOLD:
            score += HIGH_DEGREE_BOOST
            reasons.append(f"High-connectivity hub ({degree} direct linkages)")
        elif degree <= ISOLATED_DEGREE_THRESHOLD and not is_cross_file:
            score += ISOLATED_NODE_PENALTY
            reasons.append("Isolated entity with single connection")

        # Clamp score between 0 and 100
        final_score = int(min(100, max(0, score)))

        # Derive risk level
        if final_score <= RISK_LEVEL_LOW_MAX:
            risk_level = "low"
        elif final_score <= RISK_LEVEL_MED_MAX:
            risk_level = "medium"
        else:
            risk_level = "high"

        primary_reason = reasons[0] if reasons else "Standard baseline activity"

        results[node_id] = {
            "risk_score": final_score,
            "risk_level": risk_level,
            "risk_reasons": reasons,
            "primary_reason": primary_reason,
        }

    return results


def correlate_entities(records_data: Any) -> Dict[str, Any]:
    """
    Correlates entities across uploaded records:
    1. Extracts key identifiers (phone, imei, imsi, upi, ip, account).
    2. Builds a NetworkX graph with unique identifiers as nodes and co-occurrence edges.
    3. Detects identifiers appearing across multiple uploaded files and adds 'cross-file link' edges.
    4. Calculates tunable heuristic risk scores (0-100) and risk levels ('low', 'medium', 'high').
    5. Returns dictionary with nodes, edges, and summary.
    """
    # Flatten records from various input structures
    all_records: List[Dict[str, Any]] = []
    if isinstance(records_data, dict):
        if "records" in records_data:
            rec_dict = records_data["records"]
            for r_list in rec_dict.values():
                all_records.extend(r_list)
        else:
            for val in records_data.values():
                if isinstance(val, list):
                    all_records.extend(val)
    elif isinstance(records_data, list):
        all_records = records_data

    G = nx.Graph()
    type_counts: Dict[str, int] = {
        "phone": 0, "imei": 0, "imsi": 0, "upi": 0, "ip": 0, "account": 0
    }

    # Process all rows to build nodes and intra-row co-occurrence edges
    for row_idx, row in enumerate(all_records):
        filename = row.get("_filename") or "unknown_file"
        row_identifiers = extract_row_identifiers(row)

        # 1. Add/update nodes
        for node_id, id_type, label in row_identifiers:
            if not G.has_node(node_id):
                G.add_node(
                    node_id,
                    id=node_id,
                    type=id_type,
                    label=label,
                    files=set(),
                    occurrences=0,
                )
                type_counts[id_type] = type_counts.get(id_type, 0) + 1

            G.nodes[node_id]["files"].add(filename)
            G.nodes[node_id]["occurrences"] += 1

        # 2. Add edges between co-occurring identifiers in the same row
        n_ids = len(row_identifiers)
        for i in range(n_ids):
            for j in range(i + 1, n_ids):
                id1, type1, _ = row_identifiers[i]
                id2, type2, _ = row_identifiers[j]

                evidence_str = f"{filename}:row_{row_idx + 1}"

                if G.has_edge(id1, id2):
                    edge_data = G[id1][id2]
                    edge_data["weight"] = edge_data.get("weight", 1) + 1
                    evidence_list = edge_data.get("evidence_list", [])
                    if evidence_str not in evidence_list:
                        evidence_list.append(evidence_str)
                    edge_data["evidence"] = ", ".join(evidence_list[:3]) + (f" (+{len(evidence_list)-3} more)" if len(evidence_list) > 3 else "")
                else:
                    rel_type = f"{type1}_{type2}_co_occurrence"
                    G.add_edge(
                        id1,
                        id2,
                        relationship_type=rel_type,
                        evidence=evidence_str,
                        evidence_list=[evidence_str],
                        weight=1,
                    )

    # 3. Create cross-file link edges for any identifier appearing across >= 2 different files
    cross_file_count = 0
    cross_file_nodes = []

    for node_id in list(G.nodes()):
        files_seen = G.nodes[node_id].get("files", set())
        if len(files_seen) >= 2:
            cross_file_count += 1
            cross_file_nodes.append(node_id)
            G.nodes[node_id]["cross_file"] = True
            files_str = ", ".join(sorted(list(files_seen)))
            G.add_edge(
                node_id,
                node_id,
                relationship_type="cross-file link",
                evidence=f"Cross-file match across: {files_str}",
                weight=len(files_seen),
            )
        else:
            G.nodes[node_id]["cross_file"] = False

    # 4. Calculate Risk Scores for all nodes
    risk_data = calculate_node_risk_scores(G, all_records)

    # Risk level distribution counters
    risk_levels = {"low": 0, "medium": 0, "high": 0}

    # Format nodes list
    nodes_output = []
    for n, d in G.nodes(data=True):
        r_info = risk_data.get(n, {
            "risk_score": BASE_RISK_SCORE,
            "risk_level": "low",
            "risk_reasons": [],
            "primary_reason": "Standard baseline activity",
        })

        level = r_info["risk_level"]
        risk_levels[level] = risk_levels.get(level, 0) + 1

        nodes_output.append({
            "id": d.get("id", n),
            "type": d.get("type", "unknown"),
            "label": d.get("label", n),
            "files": sorted(list(d.get("files", []))),
            "cross_file": d.get("cross_file", False),
            "occurrences": d.get("occurrences", 1),
            "risk_score": r_info["risk_score"],
            "risk_level": r_info["risk_level"],
            "risk_reasons": r_info["risk_reasons"],
            "primary_reason": r_info["primary_reason"],
        })

    # Sort nodes by risk_score descending for top risk entity identification
    top_risk_entities = sorted(
        nodes_output,
        key=lambda x: (x["risk_score"], x["occurrences"]),
        reverse=True
    )[:10]

    # Format edges list
    edges_output = []
    for u, v, d in G.edges(data=True):
        edges_output.append({
            "source": u,
            "target": v,
            "relationship_type": d.get("relationship_type", "co_occurrence"),
            "evidence": d.get("evidence", ""),
            "weight": d.get("weight", 1),
        })

    return {
        "nodes": nodes_output,
        "edges": edges_output,
        "summary": {
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges(),
            "number_of_cross_file_links": cross_file_count,
            "cross_file_entities": cross_file_nodes,
            "node_types": type_counts,
            "risk_levels": risk_levels,
            "top_risk_entities": top_risk_entities,
        },
    }
