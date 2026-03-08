# 🛡️ NIDS Sentinel — Network Intrusion Detection System

> AI-Powered Real-Time Network Intrusion Detection and Threat Analysis

## ✨ Features

- **🔍 Real-Time Packet Sniffing** — Scapy-based network packet capture with live traffic analysis
- **🧠 AI-Powered Classification** — Random Forest ML model (98.95% accuracy) detecting DoS, DDoS, Probe, and Privilege Escalation attacks
- **📊 Live Dashboard** — Glassmorphic React dashboard with real-time traffic flow charts and threat monitoring
- **🚨 Threat Alerts** — Searchable/filterable alert system with block actions
- **🤖 AI Explainability** — Understand *why* the model flagged each threat (key features, severity, mitigation)
- **🌗 Light/Dark Mode** — Dynamic theme toggle with CSS variables
- **📈 Analytics** — Aggregated threat stats, top attacker IPs, attack type distribution

## 🏗️ Architecture

```
Scapy Sniffer → Feature Extraction → ML Inference (Random Forest)
       ↓                                       ↓
  Raw Packets                          Classified Packets
                                               ↓
                                    FastAPI Backend (POST /log)
                                         ↓           ↓
                                    SQLite DB    WebSocket Broadcast
                                                       ↓
                                              Next.js Dashboard
                                           (Real-Time Visualization)
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS, Recharts, Framer Motion |
| Backend | FastAPI (Python), SQLAlchemy, WebSockets |
| Database | SQLite (PostgreSQL-ready) |
| ML Model | Scikit-learn (Random Forest), Joblib |
| Sniffer | Scapy |
| Dataset | Synthetic NSL-KDD |

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev -- --port 3001
```

### 3. Start Traffic (Mock Mode)
```bash
cd sniffer
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python mock_generator.py
```

### 4. Open Dashboard
Navigate to **http://localhost:3001**

## 📁 Project Structure

```
├── backend/          # FastAPI API + WebSocket server
├── frontend/         # Next.js dashboard + alerts UI
├── sniffer/          # Scapy packet capture + ML inference
├── ml-models/        # ML training pipeline
└── docs/             # Architecture, tasks, enhancements
```

## 📊 ML Model

- **Algorithm:** Random Forest Classifier (100 trees, max_depth=15)
- **Accuracy:** 98.95%
- **Attack Classes:** Normal, DoS, DDoS (Ping of Death), Probe, U2R (Root Access)
- **Features:** 12 network traffic features (protocol, flags, byte counts, error rates, connection counts)

## 📖 Documentation

- [Architecture & Design](docs/architecture.md)
- [Task Tracker](docs/task_tracker.md)
- [Future Enhancements](docs/enhancements.md)

## 📝 License

MIT License
