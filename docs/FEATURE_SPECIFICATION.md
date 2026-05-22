# Feature Specification

## Overview

This document specifies the canonical feature set used across all NIDS pipelines (training, serving via sniffer, and batch analysis).

**Feature Count**: 23 features (extracted from network traffic)
**Feature Engineering Class**: `backend/app/services/feature_engineering.py::FeatureEngineer`

## 23 Canonical Features

### 1. Duration & Timing (4 features)
- **duration**: Connection duration in seconds
- **src_bytes**: Bytes transmitted by source
- **dst_bytes**: Bytes transmitted by destination
- **bytes_total**: Total bytes (src_bytes + dst_bytes)

### 2. Connection Statistics (4 features)
- **count**: Number of connections to same destination in history window
- **srv_count**: Number of connections with same service/protocol in history window
- **same_srv_rate**: Fraction of connections with same service (srv_count / count)
- **diff_srv_rate**: Fraction of different services (1.0 - same_srv_rate)

### 3. Error Rates (4 features)
- **serror_rate**: Fraction of connections with SYN errors (S0 flag)
- **srv_serror_rate**: Fraction of SYN errors for same service
- **rerror_rate**: Fraction of connections with RST errors (REJ/RSTO flag)
- **srv_rerror_rate**: Fraction of RST errors for same service

### 4. Protocol & Service Encoding (3 features)
- **protocol_encoded**: Encoded protocol type (TCP=0, UDP=1, ICMP=2, other=3)
- **service_encoded**: Encoded service/port type (http=0, ftp=1, smtp=2, domain_u=3, ssh=4, telnet=5, private=6, other=7)
- **flag_encoded**: Encoded TCP flag (SF=0, S0=1, REJ=2, RSTR=3, SH=4, RST=5, RSTO=6, other=7)

### 5. Advanced Behavioral Features (6 features)
- **unique_services**: Count of unique services in connection history
- **port_diversity**: Normalized port diversity (unique_services / count, clamped to [0, 1])
- **syn_flood_indicator**: Count of S0 (SYN with no ACK) flags indicating potential SYN flood
- **connection_velocity**: Rate of new connections (connections per second)
- **payload_entropy**: Shannon entropy of packet payload (0=low, 1=high randomness)
- **anomaly_score**: Composite anomaly score based on statistical deviation

### 6. Geographic Risk Features (2 features)
- **src_country_risk**: Risk score of source IP country (0=safe, 1=high-risk)
- **dst_country_risk**: Risk score of destination IP country (0=safe, 1=high-risk)

## Feature Extraction Pipelines

### Training Pipeline
- **Dataset**: KDD Cup 99 / NSL-KDD (will be upgraded in Phase 4)
- **Processing**:
  1. Load dataset (41 original KDD features)
  2. Extract 23 canonical features using `FeatureEngineer.extract_features()`
  3. Fit `StandardScaler` on training data
  4. Transform training and test sets
  5. Train XGBoost model
  6. Save model + scaler to shared `MODEL_DIR`
- **Implementation**: `ml-models/nids_training/train.py`
- **Input**: Raw KDD Cup 99 or NSL-KDD CSV files
- **Output**: 
  - Model: `/app/shared-models/nids_xgb.pkl`
  - Metadata: `/app/shared-models/nids_xgb_metadata.json`
  - Scaler: `/app/shared-models/feature_scaler.pkl`

### Live Serving Pipeline (Sniffer)
- **Input**: Live packet stream (Scapy packets)
- **Processing**:
  1. Maintain 200-packet rolling window
  2. Extract 23 canonical features from current packet + window history
  3. Load fitted scaler from `MODEL_DIR`
  4. Transform features using scaler
  5. Predict using loaded model
  6. Send detections to backend API
- **Implementation**: `sniffer/sniffer.py` (uses `FeatureEngineer`)
- **Feature Extraction Method**: `FeatureEngineer.extract(packet, connection_window)`
- **Output**: Threat alerts sent to `http://localhost:8000/api/v1/traffic/log`

### Batch Serving Pipeline (Backend PCAP Analysis)
- **Input**: PCAP files uploaded via `/api/v1/traffic/upload-pcap`
- **Processing**:
  1. Read PCAP file using Scapy
  2. Maintain rolling window of recent packets
  3. Extract 23 canonical features per packet
  4. Load fitted scaler from `MODEL_DIR`
  5. Transform features using scaler
  6. Predict using loaded model
  7. Store alerts in database
- **Implementation**: `backend/app/services/pcap_service.py`
- **Feature Extraction Method**: `FeatureEngineer.extract_features(threat_log, history)`
- **Output**: Threat records stored in `threat_logs` table

## Feature Consistency Requirements

### Dimension Matching
- **Training**: 23 features extracted → StandardScaler fitted
- **Sniffer**: 23 features extracted → StandardScaler applied
- **Backend**: 23 features extracted → StandardScaler applied
- **Model Input**: Expects exactly 23 features

### Scaler Persistence
- Fitted scaler saved during training: `/app/shared-models/feature_scaler.pkl`
- Loaded and applied identically in both sniffer and backend
- Prevents train/serve skew

### Label Encoding
- **Training Labels**: One-hot or class indices (0-4 for 5 threat classes)
  - 0 = Normal
  - 1 = DoS
  - 2 = Probe
  - 3 = R2L
  - 4 = U2R
- **Inference Output**: Same indices (use metadata to decode to class names)

### Categorical Feature Mappings
- **Protocol**: TCP=0, UDP=1, ICMP=2, other=3
- **Service**: http=0, ftp=1, smtp=2, domain_u=3, ssh=4, telnet=5, private=6, other=7
- **Flag**: SF=0, S0=1, REJ=2, RSTR=3, SH=4, RST=5, RSTO=6, other=7
- **Mappings must be identical across all pipelines**

## Verification Checklist

- [ ] `FeatureEngineer.feature_columns` has exactly 23 entries
- [ ] Training pipeline extracts 23 features (verify X_train.shape[1] == 23)
- [ ] Sniffer extracts 23 features (unit test: `len(features) == 23`)
- [ ] Backend extracts 23 features (unit test: `len(features) == 23`)
- [ ] StandardScaler fitted during training (metadata includes mean/scale)
- [ ] StandardScaler applied identically in sniffer and backend
- [ ] Model loaded successfully from MODEL_DIR
- [ ] Predictions work end-to-end (PCAP upload → detection)
- [ ] Label encoding consistent (threat_classes metadata matches training)

## Future Improvements (Phase 4)

- [ ] Upgrade to NSL-KDD dataset (cleaner, modernized)
- [ ] Add more modern attack features (DGA, botnet C2, etc.)
- [ ] Implement cross-validation during training
- [ ] Add early stopping to prevent overfitting
- [ ] Use SMOTE for class imbalance handling
- [ ] Bayesian hyperparameter optimization
- [ ] Separate feature sets for different attack types (LSTM for temporal patterns)

## Implementation References

- Training: `ml-models/nids_training/train.py`
- Feature Engineering: `backend/app/services/feature_engineering.py`
- Sniffer: `sniffer/sniffer.py`
- Backend PCAP: `backend/app/services/pcap_service.py`
- Model Loading: `backend/app/core/model_loader.py`, `sniffer/model_loader.py`
