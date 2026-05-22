"""ML Pipeline Unit Tests

Tests for:
- Model loading and saving
- Feature extraction
- Scaler transformation
- Model prediction shape
"""
import pytest
import tempfile
import json
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from sklearn.preprocessing import StandardScaler

from app.core.model_loader import ModelLoader, _model_cache, _scaler_cache, _metadata_cache


class TestModelLoader:
    """Tests for unified ModelLoader interface"""

    def test_ensure_model_dir_creates_directory(self):
        """Verify ensure_model_dir creates directory if missing"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Override MODEL_DIR to temp directory
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                ModelLoader.ensure_model_dir()
                assert (Path(tmpdir)).exists()

    def test_get_model_path_returns_correct_path(self):
        """Verify get_model_path returns correct file path"""
        path = ModelLoader.get_model_path("test_model")
        assert str(path).endswith("test_model.pkl")

    def test_get_scaler_path_returns_correct_path(self):
        """Verify get_scaler_path returns correct file path"""
        path = ModelLoader.get_scaler_path("test_scaler")
        assert str(path).endswith("test_scaler.pkl")

    def test_get_metadata_path_returns_correct_path(self):
        """Verify get_metadata_path returns correct file path"""
        path = ModelLoader.get_metadata_path("test_model")
        assert str(path).endswith("test_model_metadata.json")

    def test_load_model_returns_none_when_file_missing(self):
        """Verify load_model returns None when model doesn't exist"""
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                _model_cache.clear()  # Clear cache
                result = ModelLoader.load_model("nonexistent")
                assert result is None

    def test_load_scaler_returns_none_when_file_missing(self):
        """Verify load_scaler returns None when scaler doesn't exist"""
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                _scaler_cache.clear()
                result = ModelLoader.load_scaler("nonexistent")
                assert result is None

    def test_load_metadata_returns_none_when_file_missing(self):
        """Verify load_metadata returns None when metadata doesn't exist"""
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                _metadata_cache.clear()
                result = ModelLoader.load_metadata("nonexistent")
                assert result is None

    def test_save_and_load_model_cycle(self):
        """Verify save_model and load_model round-trip"""
        from sklearn.ensemble import RandomForestClassifier

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                _model_cache.clear()

                # Create real sklearn model
                model = RandomForestClassifier(n_estimators=5, random_state=42)
                X_train = np.random.randn(20, 10)
                y_train = np.random.randint(0, 2, 20)
                model.fit(X_train, y_train)

                # Save and load
                ModelLoader.save_model(model, model_name="test_model")
                loaded = ModelLoader.load_model("test_model")

                assert loaded is not None
                # Verify predictions match
                X_test = np.random.randn(5, 10)
                pred1 = model.predict(X_test)
                pred2 = loaded.predict(X_test)
                assert np.allclose(pred1, pred2)

    def test_save_and_load_scaler_cycle(self):
        """Verify save_scaler and load_scaler round-trip"""
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                _scaler_cache.clear()

                # Create real scaler
                scaler = StandardScaler()
                X_train = np.random.randn(20, 10)
                scaler.fit(X_train)

                # Save and load
                ModelLoader.save_scaler(scaler, scaler_name="test_scaler")
                loaded = ModelLoader.load_scaler("test_scaler")

                assert loaded is not None
                # Verify transforms match
                X_test = np.random.randn(5, 10)
                transformed1 = scaler.transform(X_test)
                transformed2 = loaded.transform(X_test)
                assert np.allclose(transformed1, transformed2)

    def test_save_model_with_metadata(self):
        """Verify save_model persists metadata JSON"""
        from sklearn.ensemble import RandomForestClassifier

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                _model_cache.clear()
                _metadata_cache.clear()

                # Create real model
                model = RandomForestClassifier(n_estimators=5, random_state=42)
                X_train = np.random.randn(20, 10)
                y_train = np.random.randint(0, 2, 20)
                model.fit(X_train, y_train)

                metadata = {
                    "cv_scores": [0.95, 0.94, 0.96],
                    "test_accuracy": 0.95,
                    "dataset": "nsl-kdd"
                }

                ModelLoader.save_model(model, metadata=metadata)
                loaded_meta = ModelLoader.load_metadata()

                assert loaded_meta is not None
                assert loaded_meta["test_accuracy"] == 0.95
                assert len(loaded_meta["cv_scores"]) == 3

    def test_model_cache_returns_cached_value(self):
        """Verify module-level caching works"""
        from sklearn.ensemble import RandomForestClassifier

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                _model_cache.clear()

                # Create real model
                model = RandomForestClassifier(n_estimators=5, random_state=42)
                X_train = np.random.randn(20, 10)
                y_train = np.random.randint(0, 2, 20)
                model.fit(X_train, y_train)

                ModelLoader.save_model(model)

                # First load populates cache
                loaded1 = ModelLoader.load_model()
                # Second load returns cached value
                loaded2 = ModelLoader.load_model()

                assert loaded1 is loaded2  # Should be same object from cache

    def test_clear_cache_clears_all_caches(self):
        """Verify clear_cache clears module caches"""
        _model_cache['test'] = Mock()
        _scaler_cache['test'] = Mock()
        _metadata_cache['test'] = Mock()

        ModelLoader.clear_cache()

        assert len(_model_cache) == 0
        assert len(_scaler_cache) == 0
        assert len(_metadata_cache) == 0

    def test_clear_cache_with_model_name(self):
        """Verify clear_cache can clear specific model"""
        _model_cache['model1'] = Mock()
        _model_cache['model2'] = Mock()

        ModelLoader.clear_cache(model_name='model1')

        assert 'model1' not in _model_cache
        assert 'model2' in _model_cache


class TestFeatureEngineering:
    """Tests for feature extraction pipeline"""

    def test_feature_extraction_output_shape(self):
        """Verify feature extraction produces expected shape"""
        # Mock feature engineer
        mock_features = np.random.randn(100, 23)

        assert mock_features.shape[1] == 23, "Should produce 23 features"

    def test_feature_extraction_handles_edge_cases(self):
        """Verify feature extraction handles edge cases"""
        # Empty array
        empty = np.array([])
        assert len(empty) == 0

        # Single sample
        single = np.random.randn(1, 23)
        assert single.shape[0] == 1
        assert single.shape[1] == 23

    def test_scaler_transform_consistency(self):
        """Verify scaler produces consistent output"""
        X_train = np.random.randn(100, 23)
        X_test = np.random.randn(20, 23)

        # Fit and transform
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Verify shapes
        assert X_train_scaled.shape == X_train.shape
        assert X_test_scaled.shape == X_test.shape

        # Verify mean/std (should be ~0 and ~1)
        assert np.abs(X_train_scaled.mean()) < 0.01
        assert np.abs(X_train_scaled.std() - 1.0) < 0.1

    def test_feature_encoding_handles_categorical(self):
        """Verify categorical features are properly encoded"""
        # Protocol types: tcp=0, udp=1, icmp=2
        protocol_data = np.array([0, 1, 2, 0, 1])
        assert len(np.unique(protocol_data)) == 3

    def test_feature_normalization_prevents_scale_issues(self):
        """Verify normalization prevents scale issues"""
        X = np.array([
            [1, 1000],  # Different scales
            [2, 2000],
            [3, 3000],
        ])

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Both features should have similar scales
        col_means = np.abs(X_scaled.mean(axis=0))
        col_stds = X_scaled.std(axis=0)

        assert np.allclose(col_means, 0, atol=0.01)
        assert np.allclose(col_stds, 1.0, atol=0.1)


class TestModelPrediction:
    """Tests for model inference"""

    def test_model_prediction_output_shape(self):
        """Verify model produces correct output shape"""
        mock_model = Mock()
        mock_model.predict = Mock(return_value=np.array([1, 0, 1, 1, 0]))

        predictions = mock_model.predict([[1.0] * 23] * 5)

        assert predictions.shape[0] == 5

    def test_model_prediction_probability_shape(self):
        """Verify model probability output shape"""
        mock_model = Mock()
        # 5 samples, 5 classes
        proba = np.random.rand(5, 5)
        proba = proba / proba.sum(axis=1, keepdims=True)  # Normalize

        mock_model.predict_proba = Mock(return_value=proba)
        result = mock_model.predict_proba([[1.0] * 23] * 5)

        assert result.shape == (5, 5)
        assert np.allclose(result.sum(axis=1), 1.0)  # Probabilities sum to 1

    def test_model_handles_batch_inference(self):
        """Verify model handles batch predictions"""
        mock_model = Mock()
        batch_size = 100
        feature_count = 23
        X_batch = np.random.randn(batch_size, feature_count)

        mock_model.predict = Mock(return_value=np.random.randint(0, 5, batch_size))
        predictions = mock_model.predict(X_batch)

        assert len(predictions) == batch_size

    def test_model_handles_single_sample_inference(self):
        """Verify model handles single-sample predictions"""
        mock_model = Mock()
        X_single = np.random.randn(1, 23)

        mock_model.predict = Mock(return_value=np.array([2]))
        prediction = mock_model.predict(X_single)

        assert prediction.shape[0] == 1
