# Task: Network Intrusion Detection System (NIDS) Implementation

- [x] **Planning Phase & Setup**
    - [x] Identify project requirements
    - [x] Create core architecture and feature list
    - [x] Set up Next.js frontend, FastAPI backend, SQLAlchemy (SQLite), and WebSockets
- [x] **Phase 1: Packet Sniffing & Logging**
    - [x] Create Python packet sniffer using Scapy (under `/sniffer`)
    - [x] Implemented ThreatLog model in SQLite (replacing InfluxDB for standard relations)
    - [x] Functional Scapy -> Backend -> Dashboard pipeline
- [x] **Phase 2: AI Classification Engine**
    - [x] Synthetic NSL-KDD dataset generation script (`/ml-models/nids_training/train.py`)
    - [x] Train Random Forest classifier with 98%+ Accuracy
    - [x] Integrate AI inference into `sniffer/sniffer.py` using `joblib`
- [x] **Phase 3: Real-time UI & Alerts**
    - [x] Build React dashboard with Recharts (under `/frontend`)
    - [x] Establish WebSocket communication (mocked in backend)
    - [x] Dynamic Light/Dark mode with tailored CSS coloring
    - [x] Alerts page with threat list, search/filter, and block actions
    - [x] AI Explainability panel (why did the model flag this?)
    - [x] Top Threat Sources & aggregated stats API

