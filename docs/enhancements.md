# NIDS Sentinel — Future Enhancements Roadmap

This document lists all planned enhancements for the Network Intrusion Detection System, prioritized by impact and effort.

---

## 🔴 High Priority

### 1. Docker Compose Deployment
**Impact:** High | **Effort:** ~15 min

Containerize the entire stack for one-command deployment.
- Dockerfile for backend (FastAPI + Uvicorn)
- Dockerfile for frontend (Next.js production build)
- docker-compose.yml tying them together with SQLite volume mount
- Enables `docker-compose up` to spin up the whole system

### 2. Real NSL-KDD Dataset Training
**Impact:** High | **Effort:** ~10 min

Replace synthetic data with the actual industry-standard NSL-KDD dataset.
- Download `KDDTrain+.csv` from the [NSL-KDD repo](https://www.unb.ca/cic/datasets/nsl.html)
- Retrain with 125,973 real labeled records (23 attack types across 4 categories)
- Significantly more realistic and credible model performance
- Update model metadata and sniffer accordingly

### 3. Threat Geo-IP Heatmap
**Impact:** High | **Effort:** ~15 min

Add a world map visualization showing attacker origin locations.
- Use a free Geo-IP API (ip-api.com) to resolve IP → lat/lng
- Render a world heatmap with threat density using Leaflet.js or react-simple-maps
- Color-code by severity (red = critical, yellow = warning)
- Add as a new `/map` route on the frontend

### 4. User Authentication (JWT)
**Impact:** High | **Effort:** ~20 min

Protect the dashboard behind login.
- FastAPI JWT authentication with `python-jose` and `passlib`
- Login/Signup pages on frontend
- Protected API routes (middleware)
- Role-based access: Admin (can block threats) vs Viewer (read-only)
- Store users in SQLite with hashed passwords

---

## 🟡 Medium Priority

### 5. Email/Discord Webhook Notifications
**Impact:** Medium | **Effort:** ~10 min

Send real-time alerts when CRITICAL threats are detected.
- Integrate `smtplib` for email notifications or
- Discord webhook POST for instant channel alerts
- Configurable thresholds (e.g., only alert on CRITICAL)
- Add notification settings page on frontend

### 6. Threat Timeline & History
**Impact:** Medium | **Effort:** ~15 min

Historical view of attack patterns over time.
- Time-range selector (last 1h, 24h, 7d, 30d)
- Line chart showing threat volume trends
- Attack pattern recognition (recurring IPs, time-of-day analysis)
- New `/history` route on frontend

### 7. PDF Threat Intelligence Report
**Impact:** Medium | **Effort:** ~15 min

Generate downloadable threat analysis reports.
- Summary of threats detected in a time period
- Top attack types, top sources, severity distribution
- AI explainability summaries for each category
- Use `jsPDF` or `react-pdf` for generation
- Export button on the Alerts page

### 8. CI/CD Pipeline (GitHub Actions)
**Impact:** Medium | **Effort:** ~10 min

Automated testing and deployment.
- `.github/workflows/ci.yml`
- Run backend pytest on every push
- Run frontend build check
- Optional: auto-deploy to a cloud provider

### 9. Comprehensive Test Suite
**Impact:** Medium | **Effort:** ~15 min

Unit and integration tests for reliability.
- Backend: pytest for API endpoints (traffic/log, alerts/recent, alerts/explain)
- Backend: Test model loading and inference pipeline
- Frontend: Jest + React Testing Library for dashboard components
- Sniffer: Test feature extraction logic

---

## 🟢 Low Priority (Polish)

### 10. Loading Skeletons & Animations
**Impact:** Low | **Effort:** ~5 min

Better UX during data loading.
- Skeleton shimmer effects on stats cards and alert list
- Smooth fade-in transitions for chart data
- Connection retry UI when WebSocket disconnects

### 11. Mobile Responsive Design
**Impact:** Low | **Effort:** ~10 min

Dashboard works on phones and tablets.
- Responsive grid breakpoints for stats cards
- Collapsible sidebar navigation
- Touch-friendly alert list interactions
- Swipe gestures for alert actions

### 12. Professional README with Diagrams
**Impact:** Low | **Effort:** ~10 min

Polished documentation for GitHub.
- Mermaid architecture diagrams
- GIF/video demo of the dashboard in action
- Badges (build status, license, tech stack)
- Contributing guidelines and code of conduct

### 13. Rate Limiting & IP Blacklist
**Impact:** Low | **Effort:** ~10 min

Production security hardening.
- FastAPI rate limiting middleware
- Persistent IP blacklist stored in database
- Auto-block after N threats from same source
- Whitelist for trusted internal IPs

### 14. Multi-Model Ensemble
**Impact:** Low | **Effort:** ~20 min

Improve detection accuracy with multiple models.
- Add Isolation Forest for anomaly detection (zero-day attacks)
- Add XGBoost as alternative classifier
- Ensemble voting for final prediction
- Model comparison dashboard showing per-model accuracy
