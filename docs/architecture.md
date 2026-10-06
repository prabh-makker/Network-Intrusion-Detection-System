# NIDS Sentinel — Architecture & Design Document

## 1. Overview

NIDS Sentinel is an AI-powered Network Intrusion Detection System that captures, classifies, and visualizes network traffic in real-time. It uses machine learning to identify malicious traffic patterns and provides a premium glassmorphic dashboard for security analysts.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NIDS Sentinel                            │
├─────────────┬──────────────────┬────────────────────────────────┤
│   SNIFFER   │    BACKEND API   │         FRONTEND               │
│  (Python)   │    (FastAPI)     │         (Next.js)              │
│             │                  │                                │
│  Scapy      │  POST /traffic   │  Dashboard (/)                │
│  Packet  ──►│  /log            │  ├─ Stats Cards               │
│  Capture    │       │          │  ├─ Traffic Flow Chart         │
│             │       ▼          │  └─ Live Inference Panel       │
│  Feature    │  SQLite DB       │                                │
│  Extraction │  (ThreatLog)     │  Alerts (/alerts)             │
│             │       │          │  ├─ Threat List + Search       │
│  ML Model   │       ▼          │  ├─ AI Explainability         │
│  Inference  │  WebSocket       │  ├─ Top Threat Sources        │
│  (joblib)   │  Broadcast ─────►│  └─ Block Actions             │
│             │                  │                                │
│  Mock Gen   │  GET /alerts/*   │  Light/Dark Mode Toggle       │
│  (testing)  │  GET /explain/*  │                                │
└─────────────┴──────────────────┴────────────────────────────────┘
```

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, React, TypeScript | Dashboard & Alerts UI |
| Styling | Tailwind CSS, CSS Variables | Glassmorphic theming, Light/Dark mode |
| Charts | Recharts | Traffic & Threat flow visualization |
| Animations | Framer Motion | Smooth packet card transitions |
| Icons | Lucide React | UI iconography |
| Backend | FastAPI (Python) | REST API + WebSocket server |
| Database | SQLite + SQLAlchemy | Threat log persistence |
| Migrations | Alembic | Database schema versioning |
| ML Training | Scikit-learn (RandomForest) | Attack classification model |
| ML Serving | Joblib | Model serialization & inference |
| Sniffer | Scapy | Raw network packet capture |
| Data | Synthetic NSL-KDD | Training dataset generation |

## 4. Directory Structure

```
network-intrusion-detection/
├── README.md                    # Project overview
├── .gitignore                   # Git ignore rules
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── core/
│   │   │   └── config.py        # App settings (DB URL, etc.)
│   │   ├── api/v1/
│   │   │   ├── api.py           # Router aggregator
│   │   │   └── endpoints/
│   │   │       ├── traffic.py   # Packet ingestion + WebSocket
│   │   │       └── alerts.py    # Alerts, stats, explainability
│   │   ├── db/
│   │   │   ├── base.py          # Import all models
│   │   │   ├── base_class.py    # SQLAlchemy Base
│   │   │   └── session.py       # DB session factory
│   │   └── models/
│   │       └── models.py        # ThreatLog model
│   ├── alembic/                 # DB migrations
│   └── requirements.txt         # Python dependencies
├── frontend/                    # Next.js frontend
│   └── src/app/
│       ├── globals.css          # Theme variables (dark/light)
│       ├── layout.tsx           # Root layout
│       ├── page.tsx             # Redirect to /dashboard
│       ├── dashboard/
│       │   └── page.tsx         # Main monitoring dashboard
│       └── alerts/
│           └── page.tsx         # Threat alerts + AI explainability
├── sniffer/                     # Network packet capture engine
│   ├── sniffer.py               # Live Scapy sniffer + ML inference
│   ├── mock_generator.py        # Mock traffic for testing
│   ├── models/                  # Trained ML model files
│   │   ├── nids_rf_model.joblib
│   │   └── model_metadata.json
│   └── requirements.txt
├── ml-models/                   # ML training pipeline
│   └── nids_training/
│       ├── train.py             # Dataset generation + model training
│       ├── models/              # Output trained models
│       └── requirements.txt
└── docs/                        # Documentation
    ├── task_tracker.md           # Project progress
    ├── architecture.md           # This file
    └── implementation_plan.md    # Original plan
```

## 5. API Endpoints

### Traffic API (`/api/v1/traffic`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/log` | Ingest a classified packet from the sniffer |
| WS | `/stream` | WebSocket stream for real-time dashboard updates |

### Alerts API (`/api/v1/alerts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recent?limit=50&label=DoS` | Fetch recent threats, optional filter |
| GET | `/stats` | Aggregated threat counts, top sources |
| GET | `/explain/{label}` | AI explainability for a threat type |
| POST | `/{alert_id}/block` | Mark a threat as blocked |

## 6. ML Model Details

| Property | Value |
|----------|-------|
| Algorithm | Random Forest Classifier |
| Training Samples | 10,000 (synthetic NSL-KDD) |
| Accuracy | 99.97% (macro F1 96.84%, KDD Cup 99 benchmark) |
| Features | 12 (duration, protocol, service, flag, bytes, counts, rates) |
| Classes | Normal, DoS, DDoS (Ping of Death), Probe, U2R (Root Access) |
| Serialization | Joblib (.joblib) |

### Feature Vector
| Feature | Type | Description |
|---------|------|-------------|
| duration | float | Connection duration |
| protocol_type | categorical | TCP, UDP, ICMP |
| service | categorical | http, ftp, smtp, private, other |
| flag | categorical | SF, S0, REJ, RSTR |
| src_bytes | float | Source → destination bytes |
| dst_bytes | float | Destination → source bytes |
| count | int | Connections from same host in window |
| srv_count | int | Connections to same service in window |
| serror_rate | float | SYN error rate (0-1) |
| rerror_rate | float | REJ error rate (0-1) |
| same_srv_rate | float | Same service connection rate |
| diff_srv_rate | float | Different service connection rate |

## 7. How to Run

### Prerequisites
- Python 3.12+
- Node.js 18+
- Git

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- --port 3001
```

### Sniffer (Mock Mode — no sudo required)
```bash
cd sniffer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python mock_generator.py
```

### Sniffer (Live Mode — requires sudo)
```bash
cd sniffer
sudo python sniffer.py
```

### Train ML Model
```bash
cd ml-models/nids_training
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python train.py
```

## 8. Key Design Decisions

1. **SQLite over InfluxDB**: Simpler setup for development; PostgreSQL-ready via config change.
2. **Synthetic NSL-KDD**: Enables reproducible training without external dataset downloads.
3. **WebSocket broadcast**: POST endpoint receives from sniffer, broadcasts to all dashboard clients.
4. **CSS Variables for theming**: Single source of truth for Light/Dark mode across all components.
5. **Feature-based explainability**: Maps ML feature importance to human-readable threat descriptions.
