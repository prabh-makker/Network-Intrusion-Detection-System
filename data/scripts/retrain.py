#!/usr/bin/env python
"""Manual model retraining script.

Usage:
    cd backend
    python scripts/retrain.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.ml_service import train_and_save_model

if __name__ == "__main__":
    print("=" * 60)
    print("NIDS Sentinel — Model Retraining")
    print("=" * 60)

    success = train_and_save_model()

    if success:
        print("\n" + "=" * 60)
        print("✓ Model retraining successful")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("✗ Model retraining failed — check logs above")
        print("=" * 60)
        sys.exit(1)
