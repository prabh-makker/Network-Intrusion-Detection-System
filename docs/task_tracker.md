# NIDS Sentinel — Task Tracker

## ✅ Completed Phases

### Phase 0: Planning & Setup
- [x] Identify project requirements
- [x] Create core architecture and feature list
- [x] Set up Next.js frontend, FastAPI backend, SQLAlchemy (SQLite), and WebSockets
- [x] Initialize GitHub repo and push all code

### Phase 1: Packet Sniffing & Logging
- [x] Create Python packet sniffer using Scapy (`/sniffer/sniffer.py`)
- [x] Mock traffic generator for testing without sudo (`/sniffer/mock_generator.py`)
- [x] ThreatLog SQLAlchemy model with SQLite persistence
- [x] POST `/api/v1/traffic/log` ingestion endpoint
- [x] WebSocket `/api/v1/traffic/stream` real-time broadcast
- [x] Functional pipeline: Sniffer → Backend API → WebSocket → Dashboard

### Phase 2: AI Classification Engine
- [x] Synthetic NSL-KDD dataset generator (10,000 samples)
- [x] XGBoost classifier: 99.97% accuracy, 96.84% macro F1 on deduplicated KDD Cup 99 (train_kdd99.py)
- [x] Model persistence with `.joblib` and `model_metadata.json`
- [x] 5 attack classes: Normal, DoS, DDoS (Ping of Death), Probe, U2R (Root Access)
- [x] AI inference integrated into `sniffer/sniffer.py` with feature extraction
- [x] Model copied to `/sniffer/models/` for runtime loading

### Phase 3: Real-time UI & Alerts
- [x] Glassmorphic React dashboard with Recharts (Traffic & Threat Flow)
- [x] Live Inference panel with WebSocket-powered packet stream
- [x] Dynamic Light/Dark mode toggle with CSS variables
- [x] Alerts page (`/alerts`) with searchable/filterable threat list
- [x] AI Explainability panel (key indicators, severity, mitigation)
- [x] Aggregated threat stats API (`GET /api/v1/alerts/stats`)
- [x] Top Threat Sources leaderboard
- [x] Block threat action (`POST /api/v1/alerts/{id}/block`)
- [x] Navigation between Dashboard ↔ Alerts

---

## 🔲 Future Enhancements

### High Impact
- [ ] **Docker Compose**: Containerize backend, frontend, and database for one-command deployment
- [x] **Real NSL-KDD Dataset**: Train on 125K+ real attack samples from Kaggle
- [x] **Threat Geo-IP Heatmap**: World map visualization of attacker origin locations
- [x] **User Authentication**: JWT-based login/signup with role-based access control

### Medium Impact
- [x] **Email/Discord Webhook Alerts**: Notify on CRITICAL severity threats in real-time
- [x] **Threat Timeline**: Historical attack analysis with time-range filtering
- [x] **PDF Report Export**: Generate downloadable threat intelligence reports
- [x] **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- [x] **Unit & Integration Tests**: pytest for backend, Jest for frontend

### Polish
- [x] **Loading Skeletons**: Smooth transition states while data loads
- [x] **Mobile Responsive**: Dashboard optimized for phones and tablets
- [x] **Architecture Diagrams**: Mermaid diagrams in README for professional docs
### Phase 4: Enterprise Grade Features
- [ ] **PCAP File Upload**: Drag-and-drop Wireshark captures for historical threat analysis
- [x] **Active OS Firewall Blocking**: Real-time IP banning via `iptables` or macOS `pf`
- [ ] **2FA Authentication**: TOTP (Google Authenticator) support for admin logins
- [ ] **ML Ensemble Engine**: Combined Random Forest, XGBoost, and Neural Network voting
- [ ] **Live Settings UI**: In-app configuration for Webhooks and AI sensitivity thresholds
