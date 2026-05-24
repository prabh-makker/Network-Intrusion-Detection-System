"""Unified model loading utilities for NIDS.

Provides single canonical interface for loading/saving ML models and scalers.
Supports centralized model storage with environment-configurable paths.

Module-level caching avoids repeated disk I/O within the same process.
"""
import os
import json
import joblib
from pathlib import Path
from typing import Optional, Any, Dict
import logging

logger = logging.getLogger(__name__)

# Module-level cache (persists across function calls within same process)
_model_cache: Dict[str, Optional[Any]] = {}
_scaler_cache: Dict[str, Optional[Any]] = {}
_metadata_cache: Dict[str, Optional[dict]] = {}


class ModelLoader:
    """Unified interface for loading and saving NIDS models and feature scalers.

    All models and scalers are saved to a single canonical directory (MODEL_DIR env var).
    This prevents train/serve skew from multiple incompatible implementations.

    Usage:
        # Load model and scaler
        model = ModelLoader.load_model()
        scaler = ModelLoader.load_scaler()

        # Train and save
        model = xgb.XGBClassifier(...)
        model.fit(X_train, y_train)
        metadata = {"cv_scores": cv_scores, "test_accuracy": 0.95}
        ModelLoader.save_model(model, metadata=metadata)
    """

    # Single canonical model directory (environment-configurable)
    MODEL_DIR = Path(os.getenv("MODEL_DIR", "/app/shared-models"))

    @classmethod
    def ensure_model_dir(cls) -> None:
        """Ensure model directory exists, creating if necessary."""
        try:
            cls.MODEL_DIR.mkdir(parents=True, exist_ok=True)
            logger.info(f"Model directory ready: {cls.MODEL_DIR}")
        except Exception as e:
            logger.error(f"Failed to create model directory {cls.MODEL_DIR}: {e}")
            raise

    @classmethod
    def get_model_path(cls, model_name: str = "nids_xgb") -> Path:
        """Get path to trained model.

        Args:
            model_name: Name of the model (without extension). Default: nids_xgb

        Returns:
            Path object pointing to model file
        """
        return cls.MODEL_DIR / f"{model_name}.pkl"

    @classmethod
    def get_scaler_path(cls, scaler_name: str = "feature_scaler") -> Path:
        """Get path to fitted StandardScaler.

        Args:
            scaler_name: Name of the scaler (without extension). Default: feature_scaler

        Returns:
            Path object pointing to scaler file
        """
        return cls.MODEL_DIR / f"{scaler_name}_scaler.pkl"

    @classmethod
    def get_metadata_path(cls, model_name: str = "nids_xgb") -> Path:
        """Get path to model metadata JSON.

        Args:
            model_name: Name of the model (without extension). Default: nids_xgb

        Returns:
            Path object pointing to metadata file
        """
        return cls.MODEL_DIR / f"{model_name}_metadata.json"

    @classmethod
    def load_model(cls, model_name: str = "nids_xgb") -> Optional[Any]:
        """Load trained model from disk (cached to avoid repeated I/O).

        Args:
            model_name: Name of the model to load. Default: nids_xgb

        Returns:
            Loaded model object, or None if file doesn't exist or loading fails
        """
        # Return cached value if already loaded
        if model_name in _model_cache:
            return _model_cache[model_name]

        path = cls.get_model_path(model_name)
        if not path.exists():
            logger.warning(f"Model not found at {path}")
            _model_cache[model_name] = None
            return None

        try:
            model = joblib.load(str(path))
            _model_cache[model_name] = model
            logger.info(f"Loaded model from {path}")
            return model
        except Exception as e:
            logger.error(f"Failed to load model from {path}: {e}")
            _model_cache[model_name] = None
            return None

    @classmethod
    def load_scaler(cls, scaler_name: str = "feature_scaler") -> Optional[Any]:
        """Load fitted feature scaler from disk (cached to avoid repeated I/O).

        Args:
            scaler_name: Name of the scaler to load. Default: feature_scaler

        Returns:
            Loaded scaler object, or None if file doesn't exist or loading fails
        """
        # Return cached value if already loaded
        if scaler_name in _scaler_cache:
            return _scaler_cache[scaler_name]

        path = cls.get_scaler_path(scaler_name)
        if not path.exists():
            logger.warning(f"Scaler not found at {path}")
            _scaler_cache[scaler_name] = None
            return None

        try:
            scaler = joblib.load(str(path))
            _scaler_cache[scaler_name] = scaler
            logger.info(f"Loaded scaler from {path}")
            return scaler
        except Exception as e:
            logger.error(f"Failed to load scaler from {path}: {e}")
            _scaler_cache[scaler_name] = None
            return None

    @classmethod
    def load_metadata(cls, model_name: str = "nids_xgb") -> Optional[dict]:
        """Load model metadata JSON from disk (cached to avoid repeated I/O).

        Args:
            model_name: Name of the model. Default: nids_xgb

        Returns:
            Metadata dictionary, or None if file doesn't exist or loading fails
        """
        # Return cached value if already loaded
        if model_name in _metadata_cache:
            return _metadata_cache[model_name]

        path = cls.get_metadata_path(model_name)
        if not path.exists():
            logger.debug(f"Metadata not found at {path}")
            _metadata_cache[model_name] = None
            return None

        try:
            with open(str(path), "r") as f:
                metadata = json.load(f)
            _metadata_cache[model_name] = metadata
            logger.info(f"Loaded metadata from {path}")
            return metadata
        except Exception as e:
            logger.error(f"Failed to load metadata from {path}: {e}")
            _metadata_cache[model_name] = None
            return None

    @classmethod
    def save_model(
        cls,
        model: Any,
        model_name: str = "nids_xgb",
        metadata: Optional[dict] = None
    ) -> None:
        """Save trained model and optional metadata to disk.

        Args:
            model: Trained model object to save
            model_name: Name of the model (without extension). Default: nids_xgb
            metadata: Optional metadata dictionary (will be saved as JSON)

        Raises:
            Exception if save operation fails
        """
        cls.ensure_model_dir()

        # Save model
        model_path = cls.get_model_path(model_name)
        try:
            joblib.dump(model, str(model_path))
            _model_cache[model_name] = model
            logger.info(f"Saved model to {model_path}")
        except Exception as e:
            logger.error(f"Failed to save model to {model_path}: {e}")
            raise

        # Save metadata if provided
        if metadata:
            metadata_path = cls.get_metadata_path(model_name)
            try:
                with open(str(metadata_path), "w") as f:
                    json.dump(metadata, f, indent=2)
                _metadata_cache[model_name] = metadata
                logger.info(f"Saved metadata to {metadata_path}")
            except Exception as e:
                logger.error(f"Failed to save metadata to {metadata_path}: {e}")
                raise

    @classmethod
    def save_scaler(
        cls,
        scaler: Any,
        scaler_name: str = "feature_scaler"
    ) -> None:
        """Save fitted feature scaler to disk.

        Args:
            scaler: Fitted scaler object (e.g., StandardScaler) to save
            scaler_name: Name of the scaler (without extension). Default: feature_scaler

        Raises:
            Exception if save operation fails
        """
        cls.ensure_model_dir()

        scaler_path = cls.get_scaler_path(scaler_name)
        try:
            joblib.dump(scaler, str(scaler_path))
            _scaler_cache[scaler_name] = scaler
            logger.info(f"Saved scaler to {scaler_path}")
        except Exception as e:
            logger.error(f"Failed to save scaler to {scaler_path}: {e}")
            raise

    @classmethod
    def clear_cache(cls, model_name: Optional[str] = None) -> None:
        """Clear in-memory cache (useful for testing or reloading updated models).

        Args:
            model_name: Specific model to clear from cache. If None, clears all caches.
        """
        global _model_cache, _scaler_cache, _metadata_cache

        if model_name:
            # Clear specific model
            _model_cache.pop(model_name, None)
            _metadata_cache.pop(model_name, None)
            logger.info(f"Cleared cache for model: {model_name}")
        else:
            # Clear all caches
            _model_cache.clear()
            _scaler_cache.clear()
            _metadata_cache.clear()
            logger.info("Cleared all model caches")


# Backward compatibility: legacy functions for existing code
def get_model_path() -> str:
    """Legacy function - returns path to default model."""
    return str(ModelLoader.get_model_path())


def get_metadata_path() -> str:
    """Legacy function - returns path to default metadata."""
    return str(ModelLoader.get_metadata_path())


def load_model_and_metadata():
    """Legacy function - loads default model and metadata.

    Returns:
        Tuple of (model, metadata) or (None, None) if loading fails
    """
    model = ModelLoader.load_model()
    metadata = ModelLoader.load_metadata()
    return model, metadata


def clear_model_cache() -> None:
    """Legacy function - clears all model caches."""
    ModelLoader.clear_cache()
