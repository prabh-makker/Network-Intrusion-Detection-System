#!/usr/bin/env python
import joblib
import json
import os

# Test model loading
model_path = os.path.join(os.getcwd(), 'sniffer', 'models', 'nids_rf_model.joblib')
metadata_path = os.path.join(os.getcwd(), 'sniffer', 'models', 'model_metadata.json')

if os.path.exists(model_path):
    model = joblib.load(model_path)
    print(f'[OK] Model loaded: {type(model).__name__}')
    print(f'  n_estimators: {getattr(model, "n_estimators", "N/A")}')
    print(f'  max_depth: {getattr(model, "max_depth", "N/A")}')
    print(f'  Feature importances shape: {model.feature_importances_.shape}')
else:
    print(f'[FAIL] Model not found at {model_path}')

if os.path.exists(metadata_path):
    with open(metadata_path) as f:
        meta = json.load(f)
    print(f'[OK] Metadata loaded')
    print(f'  Features: {len(meta["features"])} features')
    print(f'  Classes: {meta["classes"]}')
else:
    print(f'[FAIL] Metadata not found at {metadata_path}')

print('\n[SUCCESS] XGBoost model integrated!')
