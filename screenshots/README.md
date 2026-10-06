# NIDS Sentinel - 8 Component Screenshots

## System Overview
- **Backend**: FastAPI + XGBoost (benchmark: 99.97% accuracy, 96.8% macro F1 on KDD Cup 99)
- **Frontend**: Next.js React App
- **ML Model**: XGBoost Classifier (150 trees, 8 max depth)
- **Database**: PostgreSQL (ThreatLog table)
- **Real-time**: WebSocket streaming

---

## Screenshots Index

### 1️⃣ LOGIN PAGE (`1_login.png`)
Frontend authentication interface:
- Username/Password input
- Security question selection dropdown
- Sign-in button
- Theme toggle (Light/Dark mode)

---

### 2️⃣ DASHBOARD - TOP (`2_dashboard.png`)
Real-time threat monitoring dashboard:
- **Threat Level Meter**: Current threat assessment
- **Live Alert Count**: Total detected threats
- **Attack Distribution**: DoS vs Normal vs Probe breakdown
- **WebSocket Status**: Connected indicator
- **Real-time Chart**: Recharts bar chart showing threat distribution
- **Theme Toggle**: Dark/Light mode button
- **Collapse Button**: Sidebar toggle

**Features**:
- Live threat level animation
- Real-time packet streaming via WebSocket
- Animated bars showing attack percentages
- Color-coded threat indicators

---

### 3️⃣ DASHBOARD - SCROLLED (`2b_dashboard_scroll.png`)
Extended dashboard view after scrolling:
- Alert feed table (timestamp, src/dst IP, protocol, threat label, confidence)
- Recent threats: DoS, Probe, Normal traffic entries
- Confidence scores for each detection
- Block/Allow status indicators

---

### 4️⃣ ALERTS PAGE - TOP (`3_alerts.png`)
Detected intrusions database:
- **Table Headers**: Time, Source IP, Destination IP, Protocol, Threat Type, Confidence
- **Alert Entries**: 
  - Timestamp (ISO 8601 format)
  - Source/Destination IP addresses
  - Protocol (TCP/UDP/ICMP)
  - Threat classification (DoS, Normal, Probe, R2L, U2R)
  - Confidence percentage (95-100%)
- **Pagination**: Skip/Limit controls
- **Total Count**: Number of stored alerts

---

### 5️⃣ ALERTS PAGE - SCROLLED (`3b_alerts_scroll.png`)
Additional alert entries:
- Scrollable threat history
- Multiple threat types visible
- Attack source diversity shown
- Database query results in real-time

---

### 6️⃣ ML ANALYTICS

Old ML-page screenshots were removed because they showed placeholder metrics. Real benchmark
(`ml-models/nids_training/train_kdd99.py`, held-out 20% of deduplicated KDD Cup 99, 29,117 rows):

- Accuracy 99.97%, macro F1 96.84%

| Class | Precision | Recall | F1 | Test rows |
|---|---|---|---|---|
| DoS | 100.00 | 100.00 | 100.00 | 10,914 |
| Normal | 99.96 | 99.99 | 99.97 | 17,567 |
| Probe | 100.00 | 99.06 | 99.53 | 426 |
| R2L | 99.49 | 98.50 | 98.99 | 200 |
| U2R | 81.82 | 90.00 | 85.71 | 10 |

The live dashboard itself runs a demo model trained on synthetic data, on simulated traffic.

---

### 9️⃣ GEO-IP MAP PAGE (`5_map.png`)
Network threat visualization:
- **Map Display**: Geographic distribution of attacks
- **Source/Destination Markers**: IP geolocation points
- **Threat Indicators**: Color-coded by threat severity
- **Interactive Features**: Zoom, pan, hover tooltips
- **Legend**: Red (Critical), Orange (Warning), Green (Safe)

---

## 8 SYSTEM COMPONENTS CAPTURED ✅

| # | Component | Visible In | Status |
|---|-----------|-----------|--------|
| 1 | Raw Network Traffic Capture | Dashboard, Alerts | ✅ Scapy sniffer / simulated traffic |
| 2 | Traffic Distribution Graph | Dashboard (chart) | ✅ Real-time Recharts |
| 3 | Real-Time Dashboard UI | Dashboard page | ✅ WebSocket streaming |
| 4 | Detection Results Table | ML page (confusion matrix) | ✅ XGBoost metrics (benchmark) |
| 5 | Database Logs | Alerts page (table) | ✅ SQLite ThreatLog |
| 6 | Alert Notifications | Dashboard (live feed) | ✅ Toast + table alerts |
| 7 | WebSocket Real-Time Updates | Dashboard | ✅ ws://localhost:8001/ws |
| 8 | API Response Examples | ML page (metrics display) | ✅ /api/v1/models/* |

---

## API Endpoints Shown

### GET /api/v1/models/metrics
Returns XGBoost model info, feature importances, and accuracy metrics

```json
{
  "model": {
    "type": "XGBoost Classifier",
    "n_estimators": 150,
    "max_depth": 8,
    "learning_rate": 0.1,
    "n_features": 12,
    "n_classes": 5,
    "classes": ["DoS", "Normal", "Probe", "R2L (Unauthorized Access)", "U2R (Root Access)"],
    "feature_importances": {...}
  },
  "accuracy": {
    "overall_accuracy": 99.97,
    "by_class": {...},
    "confusion_matrix": [...]
  }
}
```

### GET /api/v1/models/preprocessed?limit=20
Returns recent alerts formatted as ML feature vectors with 12 features

### GET /api/v1/alerts?skip=0&limit=100
Returns stored threat logs from database

---

## System Statistics

**ML Model Performance** (KDD Cup 99 benchmark, see section 6):
- Overall Accuracy: 99.97%, macro F1: 96.84%
- Recall: DoS 100%, Normal 99.99%, Probe 99.06%, R2L 98.50%, U2R 90.00% (10 test rows)

**System Capacity**:
- Benchmark test set: 29,117 connections
- Live demo model: 12 network traffic features, 5 classes
- Inference Speed: <1ms per packet

**Database**:
- Backend: SQLite (PostgreSQL-ready)
- Table: ThreatLog (src_ip, dst_ip, protocol, label, confidence, timestamp)
- Demo data: simulated alerts

---

## Technology Stack

```
Frontend:     React/Next.js 16.1.6
              Framer Motion (animations)
              Recharts (data visualization)
              Tailwind CSS (styling)

Backend:      FastAPI 0.109.0
              SQLAlchemy (ORM)
              PostgreSQL (database)
              Pydantic (validation)

ML Model:     XGBoost 3.2.0
              Scikit-learn (preprocessing)
              Joblib (model serialization)

Networking:   Scapy (packet capture)
              WebSocket (real-time streaming)
              slowapi (rate limiting)

Monitoring:   uvicorn (ASGI server)
              Next.js dev server (frontend)
```

---

**Generated**: May 4, 2026  
**System Status**: All components operational  
**Servers Running**: Backend (8001) + Frontend (3002)
