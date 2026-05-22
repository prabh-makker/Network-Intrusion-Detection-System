"""Minimal model loader for sniffer service.

Works with shared Docker volume to load models trained by backend.
"""
import os
import json
import joblib
from pathlib import Path
from typing import Optional, Tuple, Any


def get_model_path(model_name: str = "nids_xgb") -> Path:
    """Get path to trained model in shared models directory."""
    model_dir = Path(os.getenv("MODEL_DIR", "/app/shared-models"))
    return model_dir / f"{model_name}.pkl"


def get_metadata_path(model_name: str = "nids_xgb") -> Path:
    """Get path to model metadata in shared models directory."""
    model_dir = Path(os.getenv("MODEL_DIR", "/app/shared-models"))
    return model_dir / f"{model_name}_metadata.json"


def load_model_and_metadata(model_name: str = "nids_xgb") -> Tuple[Optional[Any], Optional[dict]]:
    """Load model and metadata from shared volume.

    Args:
        model_name: Name of the model to load. Default: nids_xgb

    Returns:
        Tuple of (model, metadata) or (None, None) if loading fails
    """
    model_path = get_model_path(model_name)
    metadata_path = get_metadata_path(model_name)

    try:
        if not model_path.exists():
            print(f"[Sniffer] Model not found at {model_path}")
            return None, None

        # Load model
        model = joblib.load(str(model_path))
        print(f"[Sniffer] Model loaded from {model_path}")

        # Load metadata
        metadata = None
        if metadata_path.exists():
            with open(str(metadata_path), 'r') as f:
                metadata = json.load(f)
            print(f"[Sniffer] Metadata loaded from {metadata_path}")
        else:
            print(f"[Sniffer] Metadata not found at {metadata_path}")

        return model, metadata

    except Exception as e:
        print(f"[Sniffer] ERROR loading model: {e}")
        return None, None
