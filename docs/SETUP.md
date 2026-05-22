# NIDS Setup Guide

This guide walks through setting up and running the Network Intrusion Detection System locally or with Docker.

## Prerequisites

- **Local Development**: Python 3.11+, Node.js 22+, npm
- **Docker**: Docker Desktop (includes Docker Compose)
- Git

## Quick Start (Docker)

### 1. Clone & Configure

```bash
git clone https://github.com/prabh-makker/Network-Intrusion-Detection-System nids
cd nids

# Copy environment template
cp .env.example .env

# Generate a secure SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Edit .env and paste the generated key
nano .env  # or use your editor
```

### 2. Build & Start Containers

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up

# In another terminal, verify services are healthy
docker ps | grep nids

# Expected output: 3 healthy containers
# - nids-backend
# - nids-frontend  
# - nids-sniffer
```

### 3. Verify Setup

**Backend API**: `curl http://localhost:8000/docs` (OpenAPI documentation)

**Frontend**: Open `http://localhost:3000` in browser

**Health Check**:
```bash
# Backend
curl http://localhost:8000/

# Frontend
curl http://localhost:3000

# Both should respond with 200 status
```

## Manual Setup (Local Development)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env in backend directory
cp ../.env.example .env

# Initialize database
python -c "from app.db.session import SessionLocal; SessionLocal().execute('SELECT 1')"

# Start backend
uvicorn app.main:app --reload --port 8001

# Should see: Uvicorn running on http://127.0.0.1:8001
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev

# Should see: ▲ Next.js 16.0.0
#            Local: http://localhost:3000
```

### 3. Sniffer Setup (requires elevated privileges)

```bash
cd sniffer

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run sniffer (requires root/admin)
sudo python sniffer.py

# Should see: [Sniffer] Loading model...
```

## Environment Variables

Required variables (can be set in `.env` or docker-compose):

```bash
# Security
SECRET_KEY=<your-secure-random-key>  # Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
ENVIRONMENT=development              # or 'production'

# Database
DATABASE_URL=sqlite:///./nids.db      # Or postgresql://user:pass@localhost/nids_db

# Network
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:8000

# API Endpoints
API_ENDPOINT=http://localhost:8000/api/v1/traffic/log

# ML Models
MODEL_DIR=/app/shared-models  # Docker path, or local path for development
```

## Training a New Model

The system comes with a pre-trained model, but you can train your own:

### Prerequisites for Training

```bash
# Download NSL-KDD dataset from UNB
# https://www.unb.ca/cic/datasets/nsl-kdd.html
# OR use Kaggle mirror:

pip install kaggle
# Setup: https://github.com/Kaggle/kaggle-api#api-credentials
kaggle datasets download -d hassan06/nslkdd
unzip nslkdd.zip -d ml-models/nids_training/data/
```

### Run Training

```bash
cd ml-models/nids_training

# Install training dependencies
pip install -r requirements.txt

# Run training
python train.py

# Expected output:
# [ML] Loading KDD Cup 99 Dataset...
# [ML] Training XGBoost...
# [ML] Model saved to /app/shared-models/nids_xgb.pkl
# [ML] Metadata saved to /app/shared-models/nids_xgb_metadata.json
```

### Verify Model

```bash
# Check model files
ls -lh /app/shared-models/nids_xgb.pkl
ls -lh /app/shared-models/nids_xgb_metadata.json

# View metadata
cat /app/shared-models/nids_xgb_metadata.json | jq '.'
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_firewall_service.py -v

# Expected: All tests pass (≥38 firewall tests)
```

### Frontend Tests (future)

```bash
cd frontend

# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests
npm run test

# Expected: Component tests pass
```

## Troubleshooting

### Docker Issues

**Port already in use**:
```bash
# Find process on port
lsof -i :8000    # Backend
lsof -i :3000    # Frontend
lsof -i :8001    # Backend container

# Kill process
kill -9 <PID>
```

**Container won't start**:
```bash
# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs sniffer

# Rebuild images
docker-compose build --no-cache
```

**Model not found**:
```bash
# Check volume mount
docker inspect nids-backend | grep -A 5 "Mounts"

# Check MODEL_DIR
docker exec nids-backend ls -la /app/shared-models/
```

### Backend Issues

**Database errors**:
```bash
# Reset database
rm backend/nids.db
python backend/app/main.py

# Should auto-initialize schema
```

**Import errors**:
```bash
# Verify Python path
echo $PYTHONPATH
cd backend && python -m app.main

# Should run without errors
```

### Frontend Issues

**Cannot connect to API**:
```bash
# Check CORS settings in .env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Check backend is running
curl http://localhost:8000/docs

# Check frontend API URL
grep NEXT_PUBLIC_API_URL .env.local  # or .env
```

**npm install fails**:
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## File Structure

```
nids/
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── api/v1/endpoints/        # API routes (alerts, traffic, auth, etc.)
│   │   ├── core/                    # Config, model loader, security
│   │   ├── services/                # Feature engineering, PCAP analysis, ML training
│   │   ├── models/                  # SQLAlchemy models
│   │   └── main.py                  # FastAPI app initialization
│   ├── tests/                       # Unit and integration tests
│   └── Dockerfile                   # Multi-stage Docker build
│
├── frontend/                         # Next.js React app
│   ├── app/                         # Next.js app directory
│   ├── components/                  # React components
│   ├── pages/                       # Old-style pages (if any)
│   └── Dockerfile                   # Multi-stage build
│
├── sniffer/                         # Live packet capture service
│   ├── sniffer.py                  # Main packet sniffer
│   ├── model_loader.py             # Model loading utilities
│   └── Dockerfile                  # Sniffer container
│
├── ml-models/nids_training/         # Model training pipeline
│   ├── train.py                    # Training script
│   ├── data/                        # Datasets (NSL-KDD, etc.)
│   └── requirements.txt            # Training dependencies
│
├── docs/                            # Documentation
│   ├── SETUP.md                    # This file
│   ├── FEATURE_SPECIFICATION.md    # Feature engineering spec
│   └── ARCHITECTURE.md             # System architecture
│
├── docker-compose.yml               # Multi-container orchestration
└── .env.example                     # Environment template
```

## Architecture Overview

### Components

1. **Backend (FastAPI)**: Port 8001 (mapped to 8000)
   - REST API for alerts, traffic logs, authentication
   - Model training and inference
   - PCAP file analysis
   - WebSocket for real-time alerts

2. **Frontend (Next.js)**: Port 3001 (mapped to 3000)
   - Dashboard with threat timeline
   - Alert management
   - GeoIP visualization
   - Real-time updates via WebSocket

3. **Sniffer (Python)**: Host network
   - Live packet capture using Scapy
   - Real-time feature extraction
   - Model-based threat detection
   - API submission to backend

4. **Database (SQLite/PostgreSQL)**:
   - Threat logs and alerts
   - User authentication data
   - Model metadata

5. **Shared Models Volume (Docker)**:
   - Trained XGBoost model
   - Feature scaler (StandardScaler)
   - Model metadata JSON

### Data Flow

```
Packet Capture (Sniffer)
    ↓
Feature Extraction (FeatureEngineer)
    ↓
Model Inference (XGBoost)
    ↓
Threat Detection
    ↓
Backend API (/api/v1/traffic/log)
    ↓
Database Storage (ThreatLog)
    ↓
Frontend Display (Real-time WebSocket)
```

## Performance Tips

### Optimize Sniffer
- Reduce packet window size if memory is constrained
- Filter traffic using BPF (tcpdump syntax)
- Batch API submissions to reduce network overhead

### Optimize Backend
- Use PostgreSQL for production (SQLite for dev only)
- Enable model caching (already implemented in ModelLoader)
- Add database indexes on frequently queried columns

### Optimize Frontend
- Enable code splitting for lazy loading
- Use React.memo for components that don't need frequent updates
- Cache API responses locally

## Next Steps

1. **Train Custom Model**: Follow "Training a New Model" section above
2. **Add More Features**: Extend `FeatureEngineer` class
3. **Integrate SIEM**: Send alerts to Splunk, ELK, etc.
4. **Implement Active Response**: Block detected IPs automatically
5. **Deploy to Production**: Use multi-region deployment with kubernetes
6. **Improve Accuracy**: Implement Tier 2 improvements (SMOTE, Bayesian tuning)

## Security Considerations

### Production Deployment

- ✅ Use strong SECRET_KEY (generated via secrets module)
- ✅ Configure CORS_ORIGINS to specific domains only
- ✅ Use PostgreSQL with encrypted passwords
- ✅ Run sniffer with minimal privileges (setuid if possible)
- ✅ Enable TLS for API endpoints
- ✅ Implement rate limiting (already enabled via slowapi)
- ✅ Add authentication and authorization checks
- ⚠️  Validate all IP addresses (implemented in Phase 1)
- ⚠️  Remove any hardcoded credentials (using .env)
- ⚠️  Scan dependencies for vulnerabilities

### Container Security

- Use minimal base images (alpine, slim variants)
- Don't run containers as root
- Mount volumes read-only when possible
- Set resource limits (memory, CPU)
- Use private registries for production images

## Support & Contribution

- GitHub Issues: https://github.com/prabh-makker/Network-Intrusion-Detection-System/issues
- Pull Requests: https://github.com/prabh-makker/Network-Intrusion-Detection-System/pulls
- Documentation: See `/docs` directory

## License

See LICENSE file in repository root.
