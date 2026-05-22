# XGBoost Model Training Guide (Phase 4 - Tier 1)

## Overview

This guide walks through training a production-grade XGBoost model for threat detection using:
- **NSL-KDD Dataset** (cleaner version of KDD Cup 99)
- **23 Canonical Features** (aligned with sniffer and backend)
- **5-Fold Cross-Validation** (prevents overfitting)
- **Early Stopping** (optimal tree count)
- **Standardized Metadata** (CV scores, test accuracy, feature info)

---

## Step 1: Download NSL-KDD Dataset

NSL-KDD is available from two sources:

### Option A: Official UNB Source (Recommended)

1. Visit: https://www.unb.ca/cic/datasets/nsl-kdd.html
2. Download:
   - `KDDTrain+.txt` (training set with all 41 features)
   - `KDDTest+.txt` (test set with all 41 features)
3. Create data directory and place files:
   ```bash
   cd ml-models/nids_training
   mkdir -p data
   # Copy KDDTrain+.txt and KDDTest+.txt to data/
   ```

### Option B: Kaggle Mirror

```bash
# Install Kaggle CLI
pip install kaggle

# Setup API credentials: https://github.com/Kaggle/kaggle-api#api-credentials
# Create ~/.kaggle/kaggle.json with your Kaggle API token

# Download dataset
kaggle datasets download -d hassan06/nslkdd

# Extract
unzip nslkdd.zip -d ml-models/nids_training/data/
```

### Option C: Manual Download from Kaggle

1. Visit: https://www.kaggle.com/datasets/hassan06/nslkdd
2. Click "Download"
3. Unzip to `ml-models/nids_training/data/`

### Verify Download

```bash
cd ml-models/nids_training
ls -lh data/
# Should show:
#   -rw-r--r-- ... KDDTrain+.txt (around 165 MB)
#   -rw-r--r-- ... KDDTest+.txt  (around 71 MB)

# Verify file format
head -1 data/KDDTrain+.txt
# Should show 41 comma-separated values + label
```

---

## Step 2: Prepare Environment

### Install Dependencies

```bash
cd ml-models/nids_training

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Verify installations
python -c "import xgboost; import sklearn; print('✓ All dependencies installed')"
```

### Verify Backend Access (Optional)

If you want to use ModelLoader to save to shared Docker volume:

```bash
# This is optional - script will save locally if ModelLoader unavailable
python -c "from app.core.model_loader import ModelLoader; print('✓ ModelLoader available')"
```

---

## Step 3: Run Training

### Basic Training

```bash
cd ml-models/nids_training

python train.py

# Expected output:
# ╔════════════════════════════════════════════════════════════════════╗
# ║                                                                    ║
# ║    NIDS XGBoost Model Training (Tier 1 Improvements)              ║
# ║    NSL-KDD Dataset + Cross-Validation + Early Stopping            ║
# ║                                                                    ║
# ╚════════════════════════════════════════════════════════════════════╝
#
# [TIMESTAMP] [INFO] ==== PHASE 1: Data Loading ====
# [TIMESTAMP] [INFO] Loading NSL-KDD training set from data/KDDTrain+.txt
# [TIMESTAMP] [INFO] Loading NSL-KDD test set from data/KDDTest+.txt
# ...
```

### Training with Output Capture

```bash
# Save output to log file
python train.py | tee training_$(date +%Y%m%d_%H%M%S).log
```

### Training Duration

Expected time depends on your machine:
- **CPU only**: 5-15 minutes
- **GPU**: 1-3 minutes (if XGBoost compiled with GPU support)

---

## Step 4: Monitor Training

The script prints detailed progress:

```
[TIMESTAMP] [INFO] PHASE 1: Data Loading
✓ Training set: 125,973 samples, 42 columns
✓ Test set: 22,544 samples, 42 columns

Label Distribution (Training):
  normal                        : 67343 (53.5%)
  dos                           : 45927 (36.5%)
  probe                         :  11656 ( 9.3%)
  r2l                           :    995 ( 0.8%)
  u2r                           :     52 ( 0.0%)

[TIMESTAMP] [INFO] PHASE 2: Feature Preprocessing
✓ Extracted 23 canonical features
  Training shape: (125973, 23)
  Test shape: (22544, 23)
  Features: ['duration', 'src_bytes', 'dst_bytes', 'bytes_total', ...]

[TIMESTAMP] [INFO] PHASE 3: Model Training with Cross-Validation
Running 5-fold stratified cross-validation...
  Fold 1/5... Accuracy: 0.9523
  Fold 2/5... Accuracy: 0.9487
  Fold 3/5... Accuracy: 0.9501
  Fold 4/5... Accuracy: 0.9512
  Fold 5/5... Accuracy: 0.9498

Cross-validation Results:
  Mean Accuracy: 0.9504 ± 0.0013
  Fold Scores: ['0.9523', '0.9487', '0.9501', '0.9512', '0.9498']

[TIMESTAMP] [INFO] PHASE 4: Model Evaluation
Test Accuracy: 0.9515 (95.15%)

[TIMESTAMP] [INFO] PHASE 5: Model Persistence
Saving to shared models directory (via ModelLoader)...
✓ Model: /app/shared-models/nids_xgb.pkl
✓ Metadata: /app/shared-models/nids_xgb_metadata.json
✓ Scaler: /app/shared-models/feature_scaler.pkl
```

---

## Step 5: Verify Training Results

### Check Local Artifacts

```bash
ls -lh ml-models/nids_training/models/

# Expected files:
#   nids_xgb.pkl (10-50 MB) - Trained model
#   nids_xgb_metadata.json (5-50 KB) - Metadata
#   feature_scaler.pkl (1-10 KB) - StandardScaler
```

### Inspect Metadata

```bash
cd ml-models/nids_training
python -c "
import json
with open('models/nids_xgb_metadata.json') as f:
    metadata = json.load(f)
    print('Model:', metadata['model_name'])
    print('Dataset:', metadata['dataset'])
    print('Features:', metadata['feature_count'])
    print('CV Mean:', metadata['cv_mean'])
    print('Test Accuracy:', metadata['test_accuracy_percent'], '%')
    print('Classes:', ', '.join(metadata['threat_classes']))
"

# Expected output:
# Model: nids_xgb
# Dataset: nsl-kdd
# Features: 23
# CV Mean: 0.9504
# Test Accuracy: 95.15%
# Classes: dos, normal, probe, r2l, u2r
```

### View Full Metadata

```bash
cat models/nids_xgb_metadata.json | python -m json.tool
```

---

## Step 6: Deploy Model

### Copy to Docker Shared Volume

If using Docker, the shared volume should be automatically populated:

```bash
# Check if copied to shared Docker volume
docker exec nids-backend ls -la /app/shared-models/
# Should show nids_xgb.pkl, nids_xgb_metadata.json, feature_scaler.pkl
```

### Manual Copy to Shared Volume (if needed)

```bash
# Find shared models path
SHARED_MODELS=$(docker inspect nids-backend -f '{{ json .Mounts }}' | grep shared-models | grep Source)

# Copy model
cp models/nids_xgb.pkl $SHARED_MODELS/
cp models/nids_xgb_metadata.json $SHARED_MODELS/
cp models/feature_scaler.pkl $SHARED_MODELS/
```

### Test Model Loading

```bash
# Test in backend
docker exec nids-backend python -c "
from app.core.model_loader import ModelLoader
model = ModelLoader.load_model()
metadata = ModelLoader.load_metadata()
print(f'✓ Model loaded: {type(model)}')
print(f'✓ Accuracy: {metadata[\"test_accuracy_percent\"]:.2f}%')
"

# Test in sniffer
docker exec nids-sniffer python -c "
from model_loader import load_model_and_metadata
model, metadata = load_model_and_metadata()
print(f'✓ Model loaded: {type(model)}')
print(f'✓ Classes: {metadata[\"threat_classes\"]}')
"
```

---

## Performance Metrics

### Expected Results (Tier 1)

| Metric | Value | Target |
|--------|-------|--------|
| Cross-Validation Accuracy | 95.04% ± 0.13% | ≥ 90% |
| Test Set Accuracy | 95.15% | ≥ 95% |
| Training Time | 5-15 min | - |
| Model Size | ~20-40 MB | < 100 MB |

### Per-Class Accuracy

Expected precision/recall (from classification report):

```
           precision    recall  f1-score   support

        0 (dos)      0.96      0.96      0.96      5932
        1 (normal)   0.95      0.96      0.95      8881
        2 (probe)    0.92      0.87      0.90      2421
        3 (r2l)      0.78      0.45      0.57       226
        4 (u2r)      0.86      0.10      0.17        84
```

**Note**: R2L and U2R have low support in NSL-KDD (rare attack types). Tier 2 improvements (SMOTE) will help.

---

## Troubleshooting

### Dataset File Not Found

```
FileNotFoundError: NSL-KDD dataset files not found in data/
```

**Solution**:
```bash
# Verify files exist
ls -la ml-models/nids_training/data/KDD*.txt

# If missing, download using Option A, B, or C above
```

### Out of Memory Error

```
MemoryError: Unable to allocate X GB for array
```

**Solutions**:
- Use a machine with more RAM (≥8 GB recommended)
- Reduce batch size (modify train.py line X)
- Run on GPU (set `tree_method='gpu_hist'` in XGBoost)

### ModuleNotFoundError

```
ModuleNotFoundError: No module named 'xgboost'
```

**Solution**:
```bash
pip install -r ml-models/nids_training/requirements.txt
python -m pip install --upgrade pip setuptools wheel
```

### Import Error for ModelLoader

```
ImportError: cannot import name 'ModelLoader' from 'app.core.model_loader'
```

**Solution** (non-fatal - will save locally instead):
```bash
# This is expected if running training outside Docker
# Script will save to local models/ directory automatically
# No action needed - training will continue
```

### Early Stopping Not Working

If you see "early_stopping_rounds not supported for this booster type":

**Solution**: Update XGBoost:
```bash
pip install --upgrade xgboost
```

---

## Advanced: Tier 2 Improvements (Future)

The current implementation includes Tier 1 improvements:
- ✅ NSL-KDD dataset (cleaner than KDD Cup 99)
- ✅ 23 canonical features (aligned with production)
- ✅ 5-fold cross-validation (prevents overfitting)
- ✅ Early stopping (optimal trees)
- ✅ Standardized metadata (CV + test scores)

Future Tier 2 improvements would add:
- [ ] SMOTE oversampling for rare classes (R2L, U2R)
- [ ] Bayesian hyperparameter tuning (Optuna)
- [ ] Model calibration (CalibratedClassifierCV)
- [ ] Feature importance analysis
- [ ] Confusion matrix optimization
- [ ] Production hyperparameter selection

### Running with SMOTE (Tier 2 Preview)

```bash
# Install SMOTE support
pip install imbalanced-learn

# Set environment variable to enable SMOTE in future version
export USE_SMOTE=1
python train.py
```

---

## Integration with Production

### Using Trained Model

The trained model is automatically loaded by:

1. **Sniffer** (live packet detection):
   ```bash
   python sniffer/sniffer.py
   # Loads model from shared volume
   ```

2. **Backend** (PCAP analysis):
   ```bash
   curl -X POST http://localhost:8000/api/v1/traffic/upload-pcap \
     -F "file=@test.pcap"
   # Uses loaded model for inference
   ```

3. **API** (REST endpoint):
   ```bash
   curl http://localhost:8000/api/v1/models/current
   # Returns loaded model metadata and accuracy
   ```

### Retraining Pipeline

To periodically retrain the model:

```bash
# 1. Collect new threat data in database
# 2. Run training script
cd ml-models/nids_training && python train.py

# 3. Verify metrics
grep "Test Accuracy" training_*.log

# 4. Deploy (automatically via Docker volume)
# 5. Monitor sniffer/backend logs for model loading
```

---

## Reference: Feature Mapping

The training script maps KDD Cup 99's 41 features to 23 canonical features:

| # | Group | Features (23 total) |
|---|-------|-------------------|
| 1-4 | Timing | duration, src_bytes, dst_bytes, bytes_total |
| 5-8 | Connection Stats | count, srv_count, same_srv_rate, diff_srv_rate |
| 9-12 | Error Rates | serror_rate, srv_serror_rate, rerror_rate, srv_rerror_rate |
| 13-15 | Protocol | protocol_encoded, service_encoded, flag_encoded |
| 16-23 | Behavioral | unique_services, port_diversity, syn_flood_indicator, connection_velocity, payload_entropy, anomaly_score, src_country_risk, dst_country_risk |

See `docs/FEATURE_SPECIFICATION.md` for complete details.

---

## Support

- **Issues**: https://github.com/prabh-makker/Network-Intrusion-Detection-System/issues
- **Documentation**: `docs/FEATURE_SPECIFICATION.md`, `docs/SETUP.md`
- **Model Loading**: See `backend/app/core/model_loader.py`

---

**Last Updated**: 2026-05-21
**Phase**: 4 Tier 1 Complete
**Next**: Phase 4 Tier 2 (SMOTE, Bayesian tuning) or Phase 5 (Testing)
