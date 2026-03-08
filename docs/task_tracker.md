# Task: Network Intrusion Detection System (NIDS) Implementation

- [x] **Planning Phase & Setup**
    - [x] Identify project requirements
    - [x] Create core architecture and feature list
    - [x] Set up Next.js frontend, FastAPI backend, SQLAlchemy (SQLite), and WebSockets
- [/] **Phase 1: Packet Sniffing & Logging**
    - [ ] Create Python packet sniffer using Scapy (under `/sniffer`)
    - [x] Implemented ThreatLog model in SQLite (replacing InfluxDB for standard relations)
    - [ ] Connect Sniffer to Backend API
- [ ] **Phase 2: AI Classification Engine**
    - [ ] Preprocess NSL-KDD dataset
    - [ ] Train Random Forest/XGBoost models
    - [ ] Implement inference service with FastAPI
- [/] **Phase 3: Real-time UI & Alerts**
    - [x] Build React dashboard with Recharts (under `/frontend`)
    - [x] Establish WebSocket communication (mocked in backend)
    - [ ] Implement threat alert system and connect real data
