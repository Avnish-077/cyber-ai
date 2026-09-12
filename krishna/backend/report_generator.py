import io
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import networkx as nx

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def generate_investigative_brief(
    correlation_data: Dict[str, Any],
    files_meta: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Synthesizes current correlation & risk-scoring results into an actionable
    investigative intelligence brief:
    1. Prime suspects (top risk nodes)
    2. Linked phone/account clusters (connected components from the graph)
    3. Plain-English immediate seizure recommendations for investigating officers
    """
    nodes = correlation_data.get("nodes", [])
    edges = correlation_data.get("edges", [])
    summary = correlation_data.get("summary", {})

    files_analyzed = []
    if files_meta:
        files_analyzed = [f.get("filename", "unknown") for f in files_meta if f.get("filename")]
    else:
        all_files = set()
        for n in nodes:
            all_files.update(n.get("files", []))
        files_analyzed = sorted(list(all_files))

    case_id = f"CFC-INTEL-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # 1. Prime Suspects (Nodes sorted by risk_score desc)
    sorted_nodes = sorted(
        nodes,
        key=lambda x: (x.get("risk_score", 0), x.get("occurrences", 1)),
        reverse=True,
    )
    prime_suspects = sorted_nodes[:10]

    # 2. Linked Phone / Account / Device Clusters (Connected components)
    G = nx.Graph()
    for n in nodes:
        G.add_node(n["id"], **n)
    for e in edges:
        if e.get("source") != e.get("target"):
            G.add_edge(e["source"], e["target"], relationship=e.get("relationship_type"))

    components = list(nx.connected_components(G))
    clusters: List[Dict[str, Any]] = []

    component_data = []
    for idx, comp in enumerate(components, 1):
        comp_nodes = [G.nodes[n_id] for n_id in comp if n_id in G.nodes]
        if not comp_nodes:
            continue
        max_score = max(n.get("risk_score", 0) for n in comp_nodes)
        component_data.append((comp_nodes, max_score, len(comp_nodes)))

    # Sort clusters by highest risk score first, then component size
    component_data.sort(key=lambda x: (x[1], x[2]), reverse=True)

    for c_idx, (comp_nodes, max_score, size) in enumerate(component_data, 1):
        type_counts: Dict[str, int] = {}
        for cn in comp_nodes:
            t = cn.get("type", "unknown")
            type_counts[t] = type_counts.get(t, 0) + 1

        lead_suspect = max(comp_nodes, key=lambda x: x.get("risk_score", 0))
        has_cross_file = any(cn.get("cross_file", False) for cn in comp_nodes)

        # Generate cluster synopsis
        phones = [cn.get("id") for cn in comp_nodes if cn.get("type") == "phone"]
        accounts = [cn.get("id") for cn in comp_nodes if cn.get("type") == "account"]
        imeis = [cn.get("id") for cn in comp_nodes if cn.get("type") == "imei"]
        upis = [cn.get("id") for cn in comp_nodes if cn.get("type") == "upi"]

        synopsis_parts = []
        if accounts:
            synopsis_parts.append(f"{len(accounts)} Account(s) [{', '.join(accounts[:2])}]")
        if upis:
            synopsis_parts.append(f"{len(upis)} UPI VPA(s) [{', '.join(upis[:2])}]")
        if phones:
            synopsis_parts.append(f"{len(phones)} Phone(s) [{', '.join(phones[:2])}]")
        if imeis:
            synopsis_parts.append(f"{len(imeis)} IMEI(s)")

        synopsis = "Linked: " + " <==> ".join(synopsis_parts) if synopsis_parts else "Linked identifier nexus"

        clusters.append({
            "cluster_id": f"RING-{c_idx:02d}",
            "title": f"Syndicate Cluster {c_idx:02d} (Lead: {lead_suspect.get('label') or lead_suspect.get('id')})",
            "total_nodes": size,
            "max_risk_score": max_score,
            "lead_suspect": {
                "id": lead_suspect.get("id"),
                "type": lead_suspect.get("type"),
                "risk_score": lead_suspect.get("risk_score"),
                "risk_level": lead_suspect.get("risk_level"),
                "reason": lead_suspect.get("primary_reason"),
            },
            "has_cross_file_links": has_cross_file,
            "node_type_counts": type_counts,
            "synopsis": synopsis,
            "members": [
                {
                    "id": cn.get("id"),
                    "type": cn.get("type"),
                    "label": cn.get("label", cn.get("id")),
                    "risk_score": cn.get("risk_score", 0),
                    "risk_level": cn.get("risk_level", "low"),
                    "primary_reason": cn.get("primary_reason", ""),
                }
                for cn in sorted(comp_nodes, key=lambda x: x.get("risk_score", 0), reverse=True)
            ],
        })

    # 3. Plain-English Immediate Seizure Recommendations
    recommendations: List[Dict[str, str]] = []
    seen_rec_targets = set()

    high_threat_candidates = [n for n in sorted_nodes if n.get("risk_score", 0) >= 34]
    if not high_threat_candidates and sorted_nodes:
        high_threat_candidates = sorted_nodes[:5]

    for entity in high_threat_candidates:
        eid = entity.get("id")
        etype = entity.get("type")
        score = entity.get("risk_score", 0)
        reason = entity.get("primary_reason", "Identified in fraudulent activity records")
        cross_file = entity.get("cross_file", False)
        files_cnt = len(entity.get("files", []))

        if eid in seen_rec_targets:
            continue
        seen_rec_targets.add(eid)

        if etype == "account":
            rec_text = (
                f"Freeze Bank Account {eid} immediately -- flagged as high-risk mule routing node ({reason}). "
                f"Request emergency debit freeze & balance lien under Section 102 CrPC."
            )
            recommendations.append({
                "target": eid,
                "type": "account",
                "action": "FREEZE ACCOUNT",
                "priority": "HIGH" if score >= 67 else "MEDIUM",
                "statutory_provision": "Section 102 CrPC (Bank Debit Freeze)",
                "directive": rec_text,
            })

        elif etype == "upi":
            rec_text = (
                f"Block UPI Handle {eid} immediately -- flagged as active transit destination linked to "
                f"{f'{files_cnt} cross-file evidence records' if cross_file else 'mule transaction network'}. "
                f"Issue urgent blocking directive to NPCI and beneficiary Payment Aggregator."
            )
            recommendations.append({
                "target": eid,
                "type": "upi",
                "action": "BLOCK UPI VPA",
                "priority": "HIGH" if score >= 67 else "MEDIUM",
                "statutory_provision": "NPCI / Payment Aggregator Urgent Block",
                "directive": rec_text,
            })

        elif etype == "imei":
            rec_text = (
                f"Blacklist Handset IMEI {eid} on DoT CEIR portal -- device identified in high-velocity "
                f"SIM hopping syndicate ({reason}). Restrict device from registering on national cellular networks."
            )
            recommendations.append({
                "target": eid,
                "type": "imei",
                "action": "BLACKLIST IMEI",
                "priority": "HIGH" if score >= 67 else "MEDIUM",
                "statutory_provision": "DoT CEIR Device Blocking Request",
                "directive": rec_text,
            })

        elif etype == "phone":
            rec_text = (
                f"Issue Section 91 CrPC notice to Telecom Service Provider for MSISDN {eid} -- "
                f"demand immediate preservation of CAF, live location, SDR, and incoming/outgoing call detail records."
            )
            recommendations.append({
                "target": eid,
                "type": "phone",
                "action": "TSP NOTICE & CDR PRESERVATION",
                "priority": "HIGH" if score >= 67 else "MEDIUM",
                "statutory_provision": "Section 91 CrPC (Telecom Service Provider Notice)",
                "directive": rec_text,
            })

        elif etype == "ip":
            rec_text = (
                f"Issue Section 79A / Rule 3(2) IT Act log preservation notice for IP {eid} -- "
                f"gateway utilized across multiple fraudulent banking sessions. Demand NAT connection logs and subscriber mapping."
            )
            recommendations.append({
                "target": eid,
                "type": "ip",
                "action": "ISP LOG PRESERVATION",
                "priority": "MEDIUM",
                "statutory_provision": "Section 79A IT Act / Rule 3(2) IT Rules",
                "directive": rec_text,
            })

        if len(recommendations) >= 8:
            break

    risk_breakdown = summary.get("risk_levels", {"high": 0, "medium": 0, "low": 0})
    if not risk_breakdown or sum(risk_breakdown.values()) == 0:
        risk_breakdown = {
            "high": len([n for n in nodes if n.get("risk_level") == "high"]),
            "medium": len([n for n in nodes if n.get("risk_level") == "medium"]),
            "low": len([n for n in nodes if n.get("risk_level") == "low"]),
        }

    return {
        "status": "success",
        "case_id": case_id,
        "classification": "CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE",
        "title": "INVESTIGATIVE INTELLIGENCE BRIEF",
        "subtitle": "Cross-Entity Correlation & Incident Seizure Directives",
        "generated_at": generated_at,
        "evidence_files": files_analyzed,
        "metrics": {
            "total_entities_analyzed": len(nodes),
            "total_correlations": len(edges),
            "cross_file_anchors": summary.get("number_of_cross_file_links", 0),
            "high_risk_suspects": risk_breakdown.get("high", 0),
            "medium_risk_suspects": risk_breakdown.get("medium", 0),
            "low_risk_suspects": risk_breakdown.get("low", 0),
            "syndicate_clusters_count": len(clusters),
            "immediate_seizure_actions": len(recommendations),
        },
        "prime_suspects": prime_suspects,
        "clusters": clusters[:6],
        "seizure_recommendations": recommendations,
    }


def build_investigative_brief_pdf(brief: Dict[str, Any]) -> bytes:
    """
    Generates a clean, officer-ready, single-page PDF document of the investigative brief.
    Strictly sized and styled to guarantee an exact 1-page fit on standard A4.
    """
    buffer = io.BytesIO()

    # A4: 595.27 x 841.89 pt. Tight 26pt margins maximize usable single-page real estate.
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=26,
        rightMargin=26,
        topMargin=22,
        bottomMargin=20,
    )

    styles = getSampleStyleSheet()

    header_title_style = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=14.5,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_LEFT,
    )
    header_sub_style = ParagraphStyle(
        "HeaderSub",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0369a1"),
        alignment=TA_LEFT,
    )
    badge_style = ParagraphStyle(
        "ClassificationBadge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=8.5,
        textColor=colors.HexColor("#dc2626"),
        alignment=TA_RIGHT,
    )
    meta_text_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#475569"),
        alignment=TA_RIGHT,
    )
    section_title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=10.5,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
    )
    body_style = ParagraphStyle(
        "BodySmall",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#1e293b"),
    )
    bold_style = ParagraphStyle(
        "BodySmallBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#0f172a"),
    )
    reason_style = ParagraphStyle(
        "ReasonStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.2,
        leading=7.8,
        textColor=colors.HexColor("#334155"),
    )
    rec_style = ParagraphStyle(
        "RecStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.5,
        leading=8.2,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # 1. OFFICIAL HEADER BAR
    left_header = [
        Paragraph("INVESTIGATIVE INTELLIGENCE BRIEF", header_title_style),
        Paragraph("CYBER FRAUD ANALYSIS &amp; INCIDENT SEIZURE DIRECTIVES", header_sub_style),
    ]
    right_header = [
        Paragraph(f"CLASSIFICATION: {brief.get('classification', 'CONFIDENTIAL')}", badge_style),
        Paragraph(f"CASE REF: <b>{brief.get('case_id', 'CFC-INTEL-001')}</b> | DATE: {brief.get('generated_at', '')}", meta_text_style),
        Paragraph(f"EVIDENCE SOURCES: {', '.join(brief.get('evidence_files', [])[:3])}", meta_text_style),
    ]

    header_table = Table(
        [[left_header, right_header]],
        colWidths=[290, 253],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f172a"), spaceBefore=2, spaceAfter=4))

    # 2. EXECUTIVE METRICS STRIP (4 Columns)
    metrics = brief.get("metrics", {})
    metrics_data = [
        [
            Paragraph("TOTAL IDENTIFIERS", ParagraphStyle("StatH", fontName="Helvetica-Bold", fontSize=6, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER)),
            Paragraph("HIGH-RISK SUSPECTS", ParagraphStyle("StatH", fontName="Helvetica-Bold", fontSize=6, textColor=colors.HexColor("#dc2626"), alignment=TA_CENTER)),
            Paragraph("CROSS-FILE ANCHORS", ParagraphStyle("StatH", fontName="Helvetica-Bold", fontSize=6, textColor=colors.HexColor("#d97706"), alignment=TA_CENTER)),
            Paragraph("SEIZURE ACTIONS", ParagraphStyle("StatH", fontName="Helvetica-Bold", fontSize=6, textColor=colors.HexColor("#0284c7"), alignment=TA_CENTER)),
        ],
        [
            Paragraph(f"<b>{metrics.get('total_entities_analyzed', 0)}</b>", ParagraphStyle("StatV", fontName="Helvetica-Bold", fontSize=11, leading=12, textColor=colors.HexColor("#0f172a"), alignment=TA_CENTER)),
            Paragraph(f"<b>{metrics.get('high_risk_suspects', 0)}</b>", ParagraphStyle("StatV", fontName="Helvetica-Bold", fontSize=11, leading=12, textColor=colors.HexColor("#dc2626"), alignment=TA_CENTER)),
            Paragraph(f"<b>{metrics.get('cross_file_anchors', 0)}</b>", ParagraphStyle("StatV", fontName="Helvetica-Bold", fontSize=11, leading=12, textColor=colors.HexColor("#d97706"), alignment=TA_CENTER)),
            Paragraph(f"<b>{metrics.get('immediate_seizure_actions', 0)}</b>", ParagraphStyle("StatV", fontName="Helvetica-Bold", fontSize=11, leading=12, textColor=colors.HexColor("#0284c7"), alignment=TA_CENTER)),
        ],
    ]
    metrics_table = Table(metrics_data, colWidths=[135.7, 135.7, 135.7, 135.7])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 2),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 3),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 6))

    # 3. TOP RISK SUSPECTS TABLE (Top 4 to strictly fit 1 page)
    story.append(Paragraph("1. PRIME SUSPECTS &amp; THREAT ENTITIES (HEURISTIC RANKING)", section_title_style))

    table_data = [
        [
            Paragraph("<b>#</b>", ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=6.5, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph("<b>IDENTIFIER</b>", ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=6.5, textColor=colors.white)),
            Paragraph("<b>TYPE</b>", ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=6.5, textColor=colors.white)),
            Paragraph("<b>RISK</b>", ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=6.5, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph("<b>PRIMARY THREAT VECTOR / DETECTION BASIS</b>", ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=6.5, textColor=colors.white)),
        ]
    ]

    top_suspects = brief.get("prime_suspects", [])[:4]
    for idx, s in enumerate(top_suspects, 1):
        score = s.get("risk_score", 0)
        level = s.get("risk_level", "low").upper()
        score_color = "#dc2626" if score >= 67 else ("#d97706" if score >= 34 else "#16a34a")

        table_data.append([
            Paragraph(f"<b>{idx}</b>", ParagraphStyle("TC", fontName="Helvetica-Bold", fontSize=6.5, alignment=TA_CENTER)),
            Paragraph(f"<b>{s.get('label') or s.get('id')}</b>", bold_style),
            Paragraph(f"<b>{s.get('type', '').upper()}</b>", body_style),
            Paragraph(f"<font color='{score_color}'><b>{score}/100</b> ({level})</font>", ParagraphStyle("Score", fontName="Helvetica-Bold", fontSize=6, alignment=TA_CENTER)),
            Paragraph(s.get("primary_reason", ""), reason_style),
        ])

    suspects_table = Table(table_data, colWidths=[20, 140, 58, 65, 260])
    suspects_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(suspects_table)
    story.append(Spacer(1, 6))

    # 4. DISCOVERED FRAUD RING CLUSTERS (Top 2 Multi-Node Syndicates)
    story.append(Paragraph("2. IDENTIFIED FRAUD SYNDICATE CLUSTERS (NETWORK LINKAGES)", section_title_style))

    clusters = brief.get("clusters", [])[:2]
    cluster_rows = []
    if clusters:
        for c in clusters:
            lead = c.get("lead_suspect", {})
            lead_name = lead.get("id", "Unknown")
            synopsis = c.get("synopsis", "")
            cluster_rows.append([
                Paragraph(f"<b>{c.get('cluster_id')}</b>", ParagraphStyle("CId", fontName="Helvetica-Bold", fontSize=6.5, textColor=colors.HexColor("#0f172a"))),
                Paragraph(
                    f"Lead Suspect: <b>{lead_name}</b> ({lead.get('type', '').upper()} &bull; Score {lead.get('risk_score')}/100)<br/>"
                    f"<font color='#475569'>{synopsis}</font>",
                    body_style
                ),
            ])
    else:
        cluster_rows.append([
            Paragraph("RING-01", bold_style),
            Paragraph("No multi-node clusters identified in current evidence dataset.", body_style),
        ])

    clusters_table = Table(cluster_rows, colWidths=[65, 478])
    clusters_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(clusters_table)
    story.append(Spacer(1, 6))

    # 5. IMMEDIATE SEIZURE & PRESERVATION DIRECTIVES (Top 4 Actions)
    story.append(Paragraph("3. IMMEDIATE SEIZURE &amp; PRESERVATION RECOMMENDATIONS", section_title_style))

    recs = brief.get("seizure_recommendations", [])[:4]
    rec_rows = []
    for idx, r in enumerate(recs, 1):
        action_name = r.get("action", "ACTION")
        statute = r.get("statutory_provision", "")
        directive = r.get("directive", "")

        action_color = "#dc2626" if "FREEZE" in action_name or "BLOCK" in action_name else "#0284c7"

        rec_rows.append([
            Paragraph(f"<b>[{idx}]</b>", ParagraphStyle("RNum", fontName="Helvetica-Bold", fontSize=6.5, textColor=colors.HexColor("#0f172a"), alignment=TA_CENTER)),
            Paragraph(f"<font color='{action_color}'><b>{action_name}</b></font><br/><font color='#64748b'>{statute}</font>", ParagraphStyle("RAct", fontName="Helvetica", fontSize=6, leading=7.5)),
            Paragraph(directive, rec_style),
        ])

    recs_table = Table(rec_rows, colWidths=[18, 125, 400])
    recs_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(recs_table)
    story.append(Spacer(1, 6))

    # 6. SIGN-OFF / AUTHORIZATION FOOTER
    footer_data = [
        [
            Paragraph(
                "<b>NOTICE</b>: Generated by Cyber Fraud Correlator v0.2.0. "
                "Court admissible preliminary intelligence dossier. Actionable under Sec 91 / 102 CrPC.",
                ParagraphStyle("FootL", fontName="Helvetica", fontSize=5.5, leading=7, textColor=colors.HexColor("#64748b"))
            ),
            Paragraph(
                "<b>INVESTIGATING OFFICER ACTION REQUIRED</b><br/>"
                "Sign &amp; Dispatch to Bank / Payment Aggregator / TSP",
                ParagraphStyle("FootR", fontName="Helvetica-Bold", fontSize=5.5, leading=7, textColor=colors.HexColor("#0f172a"), alignment=TA_RIGHT)
            ),
        ]
    ]
    footer_table = Table(footer_data, colWidths=[380, 163])
    footer_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), 0.8, colors.HexColor("#94a3b8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
