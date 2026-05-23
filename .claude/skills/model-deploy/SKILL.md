---
name: model-deploy
description: Train, validate, version, and deploy XGBoost ML models for NIDS
user-invocable: true
disable-model-invocation: false
context: fork
---

# Model Deployment Skill

Automates the complete ML model lifecycle: training, validation, versioning, and deployment.

## Usage

```
/model-deploy option=<1-4> min_accuracy=0.97 environment=<dev|staging|prod>
```

## Parameters

- **option** (required): Training approach
  - `1` = Weighted Loss (96.8% → 97.5%, 30 min)
  - `2` = Hybrid Detection (96.8% → 98.0%, 45 min)
  - `3` = Ensemble Methods (96.8% → 98.5%, 2 hours)
  - `4` = Transfer Learning (96.8% → 99%+, 4-6 hours)

- **min_accuracy** (default: 0.97): Minimum acceptable accuracy
  - If model accuracy < this, deployment is blocked
  - Set to 0.965 for experimental, 0.98 for production-ready

- **environment** (default: dev): Deployment target
  - `dev` = Local testing
  - `staging` = Docker staging environment
  - `prod` = Production deployment

## Workflow

### Step 1: Train Model
```bash
cd ml-models/nids_training
python train_[weighted|hybrid|ensemble|transfer].py
```

### Step 2: Validate Accuracy
- Check test accuracy meets `min_accuracy` threshold
- Verify rare attack detection (U2R, R2L) improved
- Confirm no regression on normal traffic classification

### Step 3: Version Model
```bash
# Create semantic version tag
VERSION=$(date +%Y%m%d-%H%M%S)
git tag -a "model-v${OPTION}-${VERSION}" -m "NIDS Model v${OPTION} - Accuracy: ${ACCURACY}"
```

### Step 4: Store Model Metadata
```json
{
  "model_name": "nids_xgb_[option]",
  "version": "YYYYMMDD-HHMMSS",
  "option": 1-4,
  "accuracy": 0.XXX,
  "training_method": "weighted|hybrid|ensemble|transfer",
  "dataset": "nsl-kdd",
  "features": 26,
  "classes": 5,
  "rare_attack_recall": {
    "u2r": 0.XX,
    "r2l": 0.XX
  },
  "deployment_timestamp": "2026-05-21T17:34:51Z"
}
```

### Step 5: Deploy to Environment
- **dev**: Copy to `ml-models/nids_training/models/`
- **staging**: Push to Docker volume `nids-models`
- **prod**: Push to production shared volume `/app/shared-models/`

### Step 6: Verify Deployment
```bash
# Check model loads correctly
python -c "
import joblib
model = joblib.load('nids_xgb_[option].pkl')
print(f'Model loaded: {type(model).__name__}')
print(f'Predict shape: {model.predict([[...]*26]).shape}')
"
```

### Step 7: Update Backend Config
Ensure backend uses correct model:
```python
# backend/app/api/v1/endpoints/traffic.py
from backend.app.core.model_loader import ModelLoader

model = ModelLoader.load_model("nids_xgb_[option]")
scaler = ModelLoader.load_scaler("nids_xgb_[option]_scaler")
```

### Step 8: Run Integration Tests
```bash
# Test model predictions work in API
pytest backend/tests/test_integration.py -k "test_end_to_end" -v
```

## Success Criteria

✅ Model accuracy >= min_accuracy  
✅ Rare attack recall (U2R, R2L) improved from baseline  
✅ Model loads without errors  
✅ Integration tests pass  
✅ No regression on normal traffic detection  

## Rollback

If deployment fails or accuracy is insufficient:

```bash
# Revert to previous model
git checkout HEAD~1 -- ml-models/nids_training/models/

# Restart services with previous model
docker-compose up -d backend sniffer
```

## Example Commands

```
# Deploy Option 1 (quick, dev testing)
/model-deploy option=1 min_accuracy=0.965 environment=dev

# Deploy Option 2 (recommended, staging)
/model-deploy option=2 min_accuracy=0.97 environment=staging

# Deploy Option 4 (production-ready, strict)
/model-deploy option=4 min_accuracy=0.985 environment=prod
```

## Automation Hooks

This skill is automatically invoked when:
- New training script completes (with `auto-deploy=true`)
- Model accuracy improves significantly
- Scheduled nightly model retraining

Set in `.claude/settings.json`:
```json
{
  "automations": {
    "model-deploy": {
      "trigger": "on_training_complete",
      "environment": "staging",
      "min_accuracy": 0.97
    }
  }
}
```

## Related Skills

- `security-review` - Validates model doesn't have backdoors
- `test-coverage-analyzer` - Ensures training tests are comprehensive

## Support

For model training questions: See `ml-models/nids_training/QUICK_START_TRAINING.md`  
For API integration: See `backend/tests/test_integration.py`  
For versioning: See `docs/COMPLETE_IMPLEMENTATION_SUMMARY.md`
