---
name: ml-model-audit
description: Security and performance audit of ML model files and inference pipeline
user-invocable: false
---

# ML Model Audit

Automated security and performance verification for NIDS Sentinel ML models before deployment.

## Responsibilities

### Security Checks

1. **Model Integrity**
   - Verify `.joblib` file hasn't been modified outside code
   - Check file size is reasonable (not bloated with secrets)
   - Validate model type matches expected (RandomForest/XGBoost)

2. **Hardcoded Confidence Risks**
   - Scan `pcap_service.py` for hardcoded confidence values
   - Flag any confidence=95.0 that bypasses model prediction
   - Verify confidence comes from `model.predict_proba()`

3. **Metadata Leakage**
   - Check `model_metadata.json` for exposed feature names
   - Verify training data paths aren't embedded
   - Validate class labels match threat types

4. **Feature Preprocessing**
   - Verify feature scaling is deterministic (no data leakage)
   - Check for training data in preprocessing pipeline
   - Validate feature order matches training

### Performance Checks

1. **Inference Bottlenecks**
   - Measure inference time (model.predict() + predict_proba())
   - Flag latency >100ms (impacts real-time streaming)
   - Check for N+1 model loads (should be singleton)

2. **Memory Usage**
   - Verify model singleton caching works
   - Check for memory leaks on repeated predictions
   - Monitor feature extraction memory cost

3. **Batch Processing**
   - Recommend batch prediction for traffic_log endpoint
   - Validate batch size (50-100 packets)

## Triggers

- Before model deployment (`git push` to main)
- On `python -m pytest backend/tests/`
- On backend service startup

## Output

Report format: `AUDIT_PASS` or `AUDIT_FAIL` with specific issues blocking deployment
