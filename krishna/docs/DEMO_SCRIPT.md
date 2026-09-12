# Hackathon Live Demo Script: "The Digital Arrest Syndicate"

> **Elevator Pitch**: *"Cyber fraud investigations stall because telecom call logs and bank transfer ledgers live in completely disconnected silos. Today, we demonstrate how the **Cyber Fraud Correlator** automatically correlates evidence across CDR and UPI records, exposes high-velocity SIM hopping, traces rapid multi-hop mule routing, and generates court-ready seizure orders in seconds."*

---

## 1. The Cast of Characters

| Character / Role | Primary Identifier(s) | Function in Crime Syndicate |
| :--- | :--- | :--- |
| **The Victim: Ramesh Sharma** | Phone: `+919411223344`<br>Account: `771109283411` | Senior citizen targeted in an impersonation / "Digital Arrest" scam. Transfers ₹1,25,000 under duress. |
| **The Caller & Operator: "Vikram"** | Phone: `+919876543210`<br>Handset IMEI: `864209041234567`<br>Shared IP: `103.21.144.68` | Scammer operating a master burner device. Rapidly swaps SIM cards to coordinate fraud layering. |
| **Mule 1 (First Hop): "Deepak"** | Account: `918800112233`<br>UPI: `9876543210@paytm` | Primary collection mule. Holds victim funds for **only 13 minutes** before immediately forwarding to Mule 2. |
| **Mule 2 (Second Hop): "Sanjay"** | Account: `887766554433`<br>UPI: `9988776655@ibl` | Layering mule. Splits incoming ₹1,20,000 into tranches within **14 minutes** to evade AML transaction caps. |
| **Mule 3 (Cash-Out Hub): "Anil"** | Account: `401928374650`<br>UPI: `9123456789@ybl`<br>IP: `49.36.120.45` | Aggregator hub account. Gathers funds from multiple mules and drains money into untraceable endpoints. |
| **Cash-Out Endpoints** | Crypto: `crypto.escrow@axisbank` (`119922883377`)<br>Offshore: `offshore.payout@yesbank` (`990011223344`) | Final exits: P2P cryptocurrency escrow and offshore shell company account. |
| **Control / Merchant Node** | Grocery Account: `223344556677`<br>UPI: `merchant.store@oksbi` | Legitimate corner store payment (₹450). Demonstrates that isolated, normal entities correctly score **low risk**. |

---

## 2. The Timeline & Fraud Narrative

### Act 1: The Phishing Call (09:45 – 10:14)
- **09:45**: Suspect Vikram calls victim Ramesh Sharma from `+919876543210` via Cell Tower `TOW-DL-0104`. He poses as a Law Enforcement Officer, claiming Ramesh's Aadhaar is linked to money laundering.
- **10:02**: Vikram sends an urgent SMS directing Ramesh to transfer funds for "regulatory verification".
- **10:14**: A panicked Ramesh calls back for 7 minutes. Vikram keeps him on the line to ensure he executes the transfer immediately.

### Act 2: The Multi-Hop Mule Relay (10:15 – 11:02)
- **10:15 (Inflow)**: Ramesh transfers **₹1,25,000** from account `771109283411` to Mule 1's UPI `9876543210@paytm` (`918800112233`).
- **10:28 (Hop 1 $\to$ Hop 2)**: **13 minutes later**, Mule 1 forwards **₹1,20,000** to Mule 2 (`887766554433`). 
  > *System detection: Rapid fund routing detected (transit time: 13 min $\le$ 60 min threshold). Mule 1 risk score spikes to High!*
- **10:42 (Hop 2 $\to$ Hop 3)**: **14 minutes later**, Mule 2 splits the money and forwards **₹70,000** and **₹48,000** to Mule 3 (`401928374650`) via UPI `9123456789@ybl`.
  > *System detection: Second mule transit identified. Mule 2 flagged as High Risk.*

### Act 3: SIM Swapping on the Master Handset (10:20 – 12:20)
- In the telecom CDR data, the master handset IMEI `864209041234567` is actively being used by **4 different SIM cards** within 2 hours:
  1. `+919876543210` (Primary calling line)
  2. `+919123456789` (Burner line coordinating Mule 3)
  3. `+919988776655` (Burner line coordinating Mule 2)
  4. `+919555001122` (Backup burner line)
- All calls originate under the exact same cell tower (`TOW-DL-0104` / `TOW-DL-0219`) and IP `103.21.144.68`.
  > *System detection: High-velocity SIM hopping heuristic triggers ($>2$ phone numbers on 1 device). Handset and phones boosted to High Threat!*

### Act 4: The Cash-Out (11:15 – 11:22)
- **11:15**: Mule 3 (`401928374650`) drains **₹1,10,000** to Crypto Escrow `crypto.escrow@axisbank` (`119922883377`).
- **11:22**: Mule 3 drains **₹75,000** to Offshore Wire `offshore.payout@yesbank` (`990011223344`).
  > *Within 67 minutes of the victim being called, the stolen money has moved through 3 accounts and exited into cryptocurrency.*

---

## 3. Step-by-Step Live Demo Presentation Script

### Step 1: Evidence Ingestion (Upload Page)
- **What to say**:
  > *"When an officer receives a cyber fraud complaint, they get raw CSVs or Excel exports from telecom operators (CDR) and banks (UPI/IMPS logs). Look how different the column names are. Our ingestion engine auto-detects the schema, standardizes the columns, and normalizes phone numbers and UPI IDs instantly."*
- **Action**:
  1. Navigate to **Upload Evidence**.
  2. Drag and drop `cdr_sample.csv` and `bank_upi_sample.csv` (or click **Quick Load Sample Evidence**).
  3. Show the interactive summary table:
     - `cdr_sample.csv` detected as **Telecom / CDR** (18 rows).
     - `bank_upi_sample.csv` detected as **Bank / UPI Transaction** (18 rows).
     - Zero configuration or manual mapping required.

---

### Step 2: Cross-Entity Correlation & Network Graph (Graph Page)
- **What to say**:
  > *"Now, let's correlate telecom and banking data. Watch how the graph immediately exposes the fraud ring."*
- **Action**:
  1. Click the **Graph** tab in the sidebar (or **Run Correlation**).
  2. Point out visual cues on the 2D canvas:
     - **Node Size & Border Thickness**: Show how higher risk nodes are **larger with thick glowing red borders**, while innocent nodes are small and subtle.
     - **Golden Dashed Lines with Particles**: Highlight the **Cross-File Links** bridging phone numbers and IPs between telecom and bank databases.
     - **The Top Risk Entities Panel**: Point to the right-hand panel:
       - Show `#1` Phone `+919876543210` (Score: 90/100, High Risk) — *"High-velocity device switching (4 distinct IMEIs/SIMs)"*.
       - Show `#2` Account `918800112233` (Score: 75/100, High Risk) — *"Rapid multi-hop routing detected: funds forwarded within 7 min"*.
       - Show `#3` Account `401928374650` (Score: 75/100, High Risk) — *"Cash-out aggregator hub"*.
  3. Toggle between **Table View** and **Cards View** in the Top Risk panel.
  4. Click on `918800112233` in the table to show the camera smoothly zooming in and centering on that mule node!

---

### Step 3: Forensic Intelligence Dossier & One-Page PDF (Report Page)
- **What to say**:
  > *"An analysis is useless if an officer cannot take immediate legal action. Police officers don't have time to inspect raw node graphs — they need statutory seizure notices ready to send to banks and telecom operators right now."*
- **Action**:
  1. Navigate to the **Report** tab.
  2. Click **Generate Investigative Brief**.
  3. Walk through the on-screen dossier:
     - **Case Reference**: `CFC-INTEL-...` with official classification stamp (`CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE`).
     - **Immediate Seizure Directives (Section 91 & 102 CrPC)**:
       - Directives with action tags (`FREEZE ACCOUNT`, `BLOCK UPI VPA`, `BLACKLIST IMEI`, `TSP NOTICE`).
       - Click **Copy Notice** on Mule Account `918800112233` to show that the notice text is ready to paste into an official police memo.
     - **Identified Syndicate Clusters**: Show `RING-01` grouping 34 linked entities (Phones, IMEIs, Mule Accounts, and UPI VPAs) into a single organized fraud ring.
  4. Click **Download PDF Dossier**.
  5. Open the downloaded PDF:
     - Point out the **exact 1-page layout** cleanly formatted with ReportLab: Header bar, Executive Metrics, Top Suspects Table, Discovered Syndicates, and Statutory Seizure Directives.
     - Emphasize: *"This single sheet is court-admissible and ready to be signed by an Investigating Officer and dispatched to the bank manager within 60 seconds of FIR registration."*

---

## 4. Quick Q&A Cheat Sheet for Judges

- **Q: Are the risk scores hardcoded or dynamic?**
  - **A**: *"They are 100% dynamic and calculated in NetworkX using tunable named constants. The engine analyzes actual transit timestamps for rapid forwarding ($\le 60$ min), graph degree for hub vs isolated nodes, multi-SIM handset co-occurrences ($> 2$ devices), and cross-dataset recurrence."*
- **Q: How does this scale to millions of records?**
  - **A**: *"Our schema normalizer streams CSV/XLSX into canonical columnar memory, and our NetworkX correlation runs in near-linear time relative to co-occurrence pairs. For enterprise production, the same graph schema maps 1-to-1 to Neo4j or Amazon Neptune."*
- **Q: Why does having both CDR and Bank logs matter?**
  - **A**: *"Bank data only shows where the money went; CDR only shows who was talking. By fusing both, we reveal that the person operating the burner phone is the exact same suspect receiving the OTP and logging into the mule account from the same IP and cell tower."*
