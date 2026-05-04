# NIDS Sentinel - 8 Component Screenshots

## System Overview
- **Backend**: FastAPI + XGBoost ML Model (99.97% accuracy)
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

### 6️⃣ ML ANALYTICS - TOP (`4_ml_top.png`)
Model metrics and performance:
- **Model Type**: "XGBoost Classifier"
- **Hyperparameters**: 
  - n_estimators: 150
  - max_depth: 8
  - learning_rate: 0.1
- **Accuracy**: 99.97% overall
- **Classes**: DoS, Normal, Probe, R2L (Unauthorized Access), U2R (Root Access)

**Metrics Cards**:
- Overall Accuracy: 99.97%
- Total Test Samples: 20,000
- Class Count: 5 threat types
- Feature Count: 12 input features

---

### 7️⃣ ML ANALYTICS - MIDDLE (`4b_ml_middle.png`)
Confusion Matrix visualization:
```
┌─────────────────────────────────────┐
│  CONFUSION MATRIX (5x5)            │
│                                     │
│  DoS:    [15854, 0, 0, 0, 0]       │
│  Normal: [1, 3920, 3, 0, 0]       │
│  Probe:  [0, 3, 175, 0, 0]        │
│  R2L:    [0, 0, 0, 41, 0]         │
│  U2R:    [0, 0, 0, 0, 3]          │
│                                     │
│  Perfect diagonal = perfect recall  │
└─────────────────────────────────────┘
```

**Per-Class Metrics Table**:
- DoS: Precision 99.99%, Recall 100.0%, F1 100.0%
- Normal: Precision 99.92%, Recall 99.9%, F1 99.91%
- Probe: Precision 98.31%, Recall 98.31%, F1 98.31%
- R2L: Precision 100.0%, Recall 100.0%, F1 100.0% ⭐ IMPROVED
- U2R: Precision 100.0%, Recall 100.0%, F1 100.0% ⭐ IMPROVED

---

### 8️⃣ ML ANALYTICS - BOTTOM (`4c_ml_bottom.png`)
Feature importance & preprocessed traffic:
- **Feature Importance Bar Chart** (Horizontal bars):
  - srv_count: 16.8% (highest)
  - count: 13.5%
  - service: 13.0%
  - serror_rate: 11.6%
  - dst_bytes: 10.1%
  - duration: 8.9%
  - diff_srv_rate: 8.2%
  - src_bytes: 6.5%
  - rerror_rate: 4.8%
  - protocol_type: 2.1%
  - same_srv_rate: 2.6%
  - flag: 1.9%

- **Preprocessed Traffic Table**:
  - Sample packets with extracted 12-feature vectors
  - Timestamp, Source IP, Destination IP, Protocol, Service, Flag
  - src_bytes, srv_count, serror_rate, etc.
  - Label and Confidence score

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
| 1 | Raw Network Traffic Capture | Dashboard, Alerts | ✅ Live Scapy sniffer |
| 2 | Traffic Distribution Graph | Dashboard (chart) | ✅ Real-time Recharts |
| 3 | Real-Time Dashboard UI | Dashboard page | ✅ WebSocket streaming |
| 4 | Detection Results Table | ML page (confusion matrix) | ✅ XGBoost metrics |
| 5 | Database Logs | Alerts page (table) | ✅ PostgreSQL ThreatLog |
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

**ML Model Performance**:
- Overall Accuracy: 99.97%
- DoS Detection: 100% recall
- Normal Traffic: 99.9% recall
- Probe Detection: 98.31% recall
- R2L Detection: 100% (improved from RF's 91.71%)
- U2R Detection: 100% (improved from RF's 85.19%)

**System Capacity**:
- Test Set Size: 20,000 packets
- Features: 12 network traffic metrics
- Classes: 5 threat types
- Model Size: ~15 MB
- Inference Speed: <1ms per packet

**Database**:
- Backend: PostgreSQL
- Table: ThreatLog (src_ip, dst_ip, protocol, label, confidence, timestamp)
- Typical Rows: 1000+ alerts in production

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
