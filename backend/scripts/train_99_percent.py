#!/usr/bin/env python
"""Aggressive 99%+ accuracy training script.

Trains ensemble of models (XGBoost + RandomForest + LightGBM) with
hyperparameter optimization and cross-validation.

Usage:
    cd backend
    python scripts/train_99_percent.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.ml_aggressive import train_ensemble_99_percent

if __name__ == "__main__":
    success = train_ensemble_99_percent()
    sys.exit(0 if success else 1)
