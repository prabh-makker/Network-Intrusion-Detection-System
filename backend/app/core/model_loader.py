"""Shared model loading utilities to prevent duplication."""
import os
import json
import joblib
from typing import Tuple, Optional, Any


def get_model_path() -> str:
    """Get the path to the trained NIDS model."""
    return os.path.join(os.getcwd(), "..", "sniffer", "models", "nids_rf_model.joblib")


def get_metadata_path() -> str:
    """Get the path to the model metadata JSON."""
    return os.path.join(os.getcwd(), "..", "sniffer", "models", "model_metadata.json")


def load_model_and_metadata() -> Tuple[Optional[Any], Optional[dict]]:
    """
    Load the trained model and its metadata.

    Returns:
        Tuple of (model, metadata) or (None, None) if loading fails.
    """
    try:
        model_path = get_model_path()
        metadata_path = get_metadata_path()

        if not os.path.exists(model_path):
            return None, None

        model = joblib.load(model_path)

        metadata = None
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                metadata = json.load(f)

        return model, metadata
    except Exception:
        return None, None
