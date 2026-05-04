"""Shared model loading utilities with module-level caching.

Caches loaded models/metadata to avoid repeated disk I/O.
"""
import os
import json
import joblib
from typing import Tuple, Optional, Any

# Module-level cache (persists across function calls within same process)
_model_cache = None
_metadata_cache = None
_cache_initialized = False


def get_model_path() -> str:
    """Get the path to the trained NIDS model."""
    return os.path.join(os.getcwd(), "..", "sniffer", "models", "nids_rf_model.joblib")


def get_metadata_path() -> str:
    """Get the path to the model metadata JSON."""
    return os.path.join(os.getcwd(), "..", "sniffer", "models", "model_metadata.json")


def load_model_and_metadata() -> Tuple[Optional[Any], Optional[dict]]:
    """Load trained model and metadata (cached to avoid repeated disk I/O).

    Returns:
        Tuple of (model, metadata) or (None, None) if loading fails.
        Results are cached in module memory after first load.
    """
    global _model_cache, _metadata_cache, _cache_initialized

    # Return cached values if already loaded
    if _cache_initialized:
        return _model_cache, _metadata_cache

    try:
        model_path = get_model_path()
        metadata_path = get_metadata_path()

        if not os.path.exists(model_path):
            _cache_initialized = True
            return None, None

        # Load from disk (only once)
        _model_cache = joblib.load(model_path)

        _metadata_cache = None
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                _metadata_cache = json.load(f)

        _cache_initialized = True
        return _model_cache, _metadata_cache

    except Exception:
        _cache_initialized = True
        return None, None


def clear_model_cache() -> None:
    """Clear the model cache (useful for testing or reloading updated models)."""
    global _model_cache, _metadata_cache, _cache_initialized
    _model_cache = None
    _metadata_cache = None
    _cache_initialized = False
