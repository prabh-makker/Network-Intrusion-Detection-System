# NIDS Project — Session Handoff Context

**Last Session Commit:** `8658432` — feat: Complete NIDS dashboard overhaul + production fixes
**Pushed to:** `prabh-makker/Network-Intrusion-Detection-System` main branch
**Date:** 2026-05-22

---

## Project Layout

```
C:\Users\khalo\nids\
├── backend/         FastAPI + SQLite + XGBoost ML
├── frontend/        Next.js 16 + React 19 + Tailwind + Recharts
├── sniffer/         Mock packet generator (Docker-friendly)
├── ml-models/       XGBoost training pipelines (NSL-KDD)
├── data/            Bind-mounted /app/data inside backend container
└── docker-compose.yml
```

---

## What Works (Verified)

### Backend (port 8000 → container 8001)
- `GET /docs` — Swagger UI
- `POST /api/v1/login/access-token` — JWT auth
- `POST /api/v1/signup` — User creation
- `GET /api/v1/alerts/stats` — Returns `{total_threats, active_threats, blocked_threats, by_label, top_sources}`
- `GET /api/v1/alerts/recent?limit=N` — Latest alerts
- `GET /api/v1/alerts/timeline?range=24h|7d|30d` — Time-series data
- `POST /api/v1/alerts/{id}/block` — Block single threat
- `POST /api/v1/alerts/bulk-block` — Body: `{alert_ids: [...]}` blocks multiple
- `POST /api/v1/alerts/block-all-active` — Blocks every unblocked threat
- `POST /api/v1/traffic/log` — Receives sniffer packets (Public — no auth)
- WebSocket `/api/v1/traffic/stream?token=...` — Live packet stream

### Frontend (port 3000)
- `/startup` — Manual boot screen (click BOOT SYSTEM button)
- `/dashboard` — Main dashboard
- `/analytics` — Time-filtered analytics (1h/6h/24h/7d/30d) **NEW**
- `/connections` — Active connections monitor **NEW**
- `/alerts` — All threat alerts
- `/ml` — ML model analytics
- `/map` — Geo-IP world map
- `/performance` — Performance metrics
- `/settings` — System config

### Dashboard Features
- 4 state cards: Packets Analyzed, Active Threats (with `X blocked` trend), Active Connections, Detection Rate. **All clickable → route to respective page**.
- 3 threat orb indicators (radar/gauge/pulse) showing top 3 threat types with real % of total.
- "LIVE • WARNING/CRITICAL/SECURE • AI ANALYSIS" smart button (color changes with threat count).
- "SECURE NOW" red button (blocks top 5 active threats).
- AI ANALYSIS modal: shows ML insights, threat landscape, prioritized recommendations.
- Live Traffic Flow chart + "View Analytics" button.
- Threat Breakdown pie chart.
- Attack Distribution Over Time with DoS/Probe/U2R real counts.
- Recent Alerts table with checkboxes, "Select All", "Block Selected", "Block All Active" buttons.

### Sniffer (Docker-friendly mock mode)
- Sends to `nids-backend:8001/api/v1/traffic/log` via internal docker network.
- Pattern: 1 normal packet every 15s + threat burst of 10 every 10 min.
- Threat types match backend config: `DoS, DDoS, Probe, U2R, R2L`.
- Set `SNIFFER_MODE=real` to switch to scapy (Linux + host network only).

---

## Known Gotchas (Important for next session!)

### 1. Bind Mount Quirk
`docker-compose.yml` mounts `./data:/app/data` (was `:/app` — fixed).
- Backend DB persists at `/app/data/nids.db` inside container.
- `.env` has `DATABASE_URL=sqlite:////app/data/nids.db` (note 4 slashes — absolute path).
- **Future code edits**: just `docker-compose build backend && docker-compose up -d backend`. No more manual file copy needed.

### 2. Next.js HOSTNAME Override
Docker auto-sets `HOSTNAME=<container-id>` which Next.js binds to. Healthcheck `curl localhost:3000` fails.
- Fix: `HOSTNAME=0.0.0.0` env in docker-compose (already set).
- If you bump Next.js version, verify this still works.

### 3. Sniffer Cannot Use scapy on Win/Mac Docker
Mock mode is default. Don't try to enable real packet capture unless on Linux + host network.

### 4. Auth Token in localStorage
Frontend stores JWT at `localStorage.nids_token`. Login at `/login`. Test user already exists: `testuser_e2e_2` / `Test12345!`.

### 5. Old Threat Types in DB
DB has legacy labels mixed: `"DDoS (Ping of Death)"`, `"U2R (Root Access)"`, `"Port Scan"`, `"Brute Force"`, `"Malware"`, `"SQL Injection"` (from old seed_mock_data.py). Dashboard aggregates them into DoS/DDoS/Probe/U2R/R2L buckets.

---

## Container Health (As of handoff)

```
nids-backend:   healthy
nids-frontend:  healthy
nids-sniffer:   healthy
```

DB size: ~2900+ threats. Active threats grow as sniffer keeps adding (10 per burst every 10min).

---

## Quick Restart Cmd

```bash
cd C:\Users\khalo\nids
docker-compose down
docker-compose up -d
# Wait ~30s for all healthchecks to pass
docker ps
```

---

## Known Outstanding Items (Maybe pick up next)

1. **Frontend tests** — `frontend/__tests__/` has scaffolding but no real coverage.
2. **Backend tests** — Many test files exist; need to verify all pass with new endpoints.
3. **Settings page** — Not deeply verified.
4. **Performance page** — Not deeply verified.
5. **Geo-IP map** — Verified API works; UI not deep-tested end-to-end.
6. **ML training real run** — `train.py` exists but not retrained recently.
7. **Light mode polish** — Some areas (modal, charts) might need more contrast tuning.
8. **Sniffer real mode for Linux** — `SNIFFER_MODE=real` path untested.

---

## Stack Versions

- Backend: Python 3.11, FastAPI, SQLAlchemy, XGBoost, scapy
- Frontend: Next.js 16, React 19, Tailwind v4, Recharts, Framer Motion, Lucide icons
- DB: SQLite (file at `./data/nids.db`)
- Container: Docker + docker-compose

---

## To Resume in New Session

Start session with:
```
Read C:\Users\khalo\nids\.claude\SESSION_HANDOFF.md
```

Then ask the user what they want to work on next.
