"""ML model training and retraining pipeline."""

import os
import json
from typing import Tuple, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import ThreatLog


MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "threat_model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")


def get_training_data(db: Session, limit: Optional[int] = None) -> Tuple[pd.DataFrame, np.ndarray]:
    """Load threat data from database for training.

    Args:
        db: Database session
        limit: Optional limit on number of samples

    Returns:
        Tuple of (features DataFrame, labels array)
    """
    query = db.query(ThreatLog)
    if limit:
        query = query.limit(limit)

    rows = query.all()

    if not rows:
        raise ValueError("No training data available in database")

    data = []
    for row in rows:
        data.append({
            "duration": getattr(row, "duration", 0),
            "src_bytes": getattr(row, "src_bytes", 0),
            "dst_bytes": getattr(row, "dst_bytes", 0),
            "count": getattr(row, "count", 1),
            "srv_count": getattr(row, "srv_count", 1),
            "serror_rate": getattr(row, "serror_rate", 0.0),
            "srv_serror_rate": getattr(row, "srv_serror_rate", 0.0),
            "label": getattr(row, "label", "Normal"),
        })

    df = pd.DataFrame(data)

    # Extract features and labels
    features = df.drop("label", axis=1).fillna(0)
    labels = df["label"].values

    return features, labels


def train_model(features: pd.DataFrame, labels: np.ndarray) -> Tuple[XGBClassifier, dict]:
    """Train XGBoost threat detection model.

    Args:
        features: Feature DataFrame
        labels: Threat labels (Normal, DoS, Probe, etc.)

    Returns:
        Tuple of (trained model, metadata dict)
    """
    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(labels)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        features, y_encoded, test_size=0.2, random_state=42
    )

    # Train XGBoost
    model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric="mlogloss"
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    # Compute accuracy
    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)

    # Metadata
    metadata = {
        "model_type": "XGBoost",
        "algorithm": "XGBClassifier",
        "n_estimators": 100,
        "max_depth": 6,
        "train_accuracy": float(train_acc),
        "test_accuracy": float(test_acc),
        "n_samples": len(features),
        "n_features": features.shape[1],
        "feature_names": features.columns.tolist(),
        "threat_classes": le.classes_.tolist(),
        "label_encoder": {
            "classes": le.classes_.tolist(),
            "mapping": {int(i): label for i, label in enumerate(le.classes_)}
        }
    }

    return model, metadata


def train_and_save_model() -> bool:
    """Full training pipeline: load data → train → validate → save.

    Returns:
        True if successful, False otherwise
    """
    try:
        print("[ML] Starting model retraining...")
        db = SessionLocal()

        # Load training data
        print("[ML] Loading training data from database...")
        features, labels = get_training_data(db, limit=10000)
        print(f"[ML] Loaded {len(features)} samples")

        # Train model
        print("[ML] Training XGBoost model...")
        model, metadata = train_model(features, labels)
        print(f"[ML] Training accuracy: {metadata['train_accuracy']:.3f}")
        print(f"[ML] Test accuracy: {metadata['test_accuracy']:.3f}")

        # Save model
        print(f"[ML] Saving to {MODEL_PATH}")
        joblib.dump(model, MODEL_PATH, compress=3)

        # Save metadata
        with open(METADATA_PATH, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"[ML] Metadata saved to {METADATA_PATH}")

        print("[ML] ✓ Retraining complete")
        db.close()
        return True

    except Exception as e:
        print(f"[ML] ✗ Retraining failed: {e}")
        return False


def load_model() -> Optional[XGBClassifier]:
    """Load trained model from disk.

    Returns:
        Loaded model or None if not found
    """
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


def load_metadata() -> Optional[dict]:
    """Load model metadata from disk.

    Returns:
        Metadata dict or None if not found
    """
    if os.path.exists(METADATA_PATH):
        with open(METADATA_PATH, 'r') as f:
            return json.load(f)
    return None


if __name__ == "__main__":
    # Test: python backend/app/services/ml_service.py
    success = train_and_save_model()
    if success:
        model = load_model()
        meta = load_metadata()
        print(f"Model classes: {meta['threat_classes']}")
