"""Unified model I/O utilities (save/load).

Consolidates model persistence logic used by ml_service.py and ml_aggressive.py.
Ensures consistent metadata format across all training pipelines.
"""

import os
import json
import joblib
from typing import Any, Dict, Optional, Tuple
from sklearn.preprocessing import StandardScaler, LabelEncoder

from app.services.threat_configs import (
    MODEL_STORAGE_DIR,
    MODEL_FILENAME,
    METADATA_FILENAME,
    SCALER_FILENAME,
    LABEL_ENCODER_FILENAME,
)


def get_model_dir() -> str:
    """Get model storage directory (create if not exists)."""
    os.makedirs(MODEL_STORAGE_DIR, exist_ok=True)
    return MODEL_STORAGE_DIR


def save_model(
    model: Any,
    metadata: Dict,
    model_name: str = MODEL_FILENAME,
) -> None:
    """Save trained model and metadata.

    Args:
        model: Trained XGBoost/RandomForest model
        metadata: Model metadata dict (hyperparameters, accuracy, etc.)
        model_name: Custom model filename (default: threat_model.joblib)
    """
    model_dir = get_model_dir()
    model_path = os.path.join(model_dir, model_name)
    metadata_path = os.path.join(model_dir, METADATA_FILENAME)

    # Save model
    joblib.dump(model, model_path, compress=3)

    # Save metadata
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"✓ Model saved: {model_path}")
    print(f"✓ Metadata saved: {metadata_path}")


def save_scaler(scaler: StandardScaler, scaler_name: str = SCALER_FILENAME) -> None:
    """Save fitted feature scaler.

    Args:
        scaler: Fitted StandardScaler
        scaler_name: Custom scaler filename
    """
    model_dir = get_model_dir()
    scaler_path = os.path.join(model_dir, scaler_name)
    joblib.dump(scaler, scaler_path, compress=3)
    print(f"✓ Scaler saved: {scaler_path}")


def save_label_encoder(
    label_encoder: LabelEncoder,
    encoder_name: str = LABEL_ENCODER_FILENAME,
) -> None:
    """Save label encoder for threat classes.

    Args:
        label_encoder: Fitted LabelEncoder
        encoder_name: Custom encoder filename
    """
    model_dir = get_model_dir()
    encoder_path = os.path.join(model_dir, encoder_name)
    joblib.dump(label_encoder, encoder_path, compress=3)
    print(f"✓ Label encoder saved: {encoder_path}")


def load_model(model_name: str = MODEL_FILENAME) -> Optional[Any]:
    """Load trained model from disk.

    Args:
        model_name: Model filename

    Returns:
        Loaded model or None if not found
    """
    model_dir = get_model_dir()
    model_path = os.path.join(model_dir, model_name)

    if not os.path.exists(model_path):
        return None

    return joblib.load(model_path)


def load_metadata(metadata_name: str = METADATA_FILENAME) -> Optional[Dict]:
    """Load model metadata from disk.

    Args:
        metadata_name: Metadata filename

    Returns:
        Metadata dict or None if not found
    """
    model_dir = get_model_dir()
    metadata_path = os.path.join(model_dir, metadata_name)

    if not os.path.exists(metadata_path):
        return None

    with open(metadata_path, 'r') as f:
        return json.load(f)


def load_scaler(scaler_name: str = SCALER_FILENAME) -> Optional[StandardScaler]:
    """Load fitted scaler from disk.

    Args:
        scaler_name: Scaler filename

    Returns:
        Loaded StandardScaler or None if not found
    """
    model_dir = get_model_dir()
    scaler_path = os.path.join(model_dir, scaler_name)

    if not os.path.exists(scaler_path):
        return None

    return joblib.load(scaler_path)


def load_label_encoder(
    encoder_name: str = LABEL_ENCODER_FILENAME,
) -> Optional[LabelEncoder]:
    """Load label encoder from disk.

    Args:
        encoder_name: Encoder filename

    Returns:
        Loaded LabelEncoder or None if not found
    """
    model_dir = get_model_dir()
    encoder_path = os.path.join(model_dir, encoder_name)

    if not os.path.exists(encoder_path):
        return None

    return joblib.load(encoder_path)


def load_all_artifacts() -> Tuple[Optional[Any], Optional[Dict], Optional[StandardScaler], Optional[LabelEncoder]]:
    """Load all model artifacts at once.

    Returns:
        Tuple of (model, metadata, scaler, label_encoder)
    """
    return (
        load_model(),
        load_metadata(),
        load_scaler(),
        load_label_encoder(),
    )
