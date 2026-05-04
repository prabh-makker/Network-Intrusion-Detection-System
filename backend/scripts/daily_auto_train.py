#!/usr/bin/env python
"""Daily automated training with mock data.

Runs daily cycle:
1. Generate mock threat data (80% Normal, 20% attacks)
2. Clean up old data (>30 days)
3. Train model on updated dataset
4. Validate accuracy
5. Report metrics

Usage:
    python scripts/daily_auto_train.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import SessionLocal
from app.services.mock_data_generator import generate_and_train_daily

if __name__ == "__main__":
    db = SessionLocal()

    try:
        success = generate_and_train_daily(db, n_samples=2000)
        sys.exit(0 if success else 1)
    finally:
        db.close()
