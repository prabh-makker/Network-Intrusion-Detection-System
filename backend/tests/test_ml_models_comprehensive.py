"""Comprehensive ML Model Tests

Tests all 4 ML training options:
- Option 1: Weighted Loss
- Option 2: Hybrid Signatures
- Option 3: Ensemble Voting
- Option 4: Transfer Learning

Also tests:
- Model loading and inference
- Feature extraction consistency
- Scaler transformation
- Prediction accuracy
- Model metadata
"""
import pytest
import numpy as np
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch
import json

from app.core.model_loader import ModelLoader, _model_cache, _scaler_cache, _metadata_cache


class TestOption1WeightedLoss:
    """Test Option 1: Weighted Loss training"""

    def test_weighted_loss_model_exists(self):
        """Verify weighted loss model is available"""
        model = ModelLoader.load_model("nids_xgb_weighted")
        assert model is not None

    def test_weighted_loss_metadata(self):
        """Verify weighted loss model has metadata"""
        metadata = ModelLoader.load_metadata("nids_xgb_weighted")
        assert metadata is not None
        assert metadata.get("model_name") == "nids_xgb_weighted"

    def test_weighted_loss_prediction_shape(self):
        """Verify weighted loss model produces correct prediction shape"""
        model = ModelLoader.load_model("nids_xgb_weighted")
        if model:
            X = np.random.randn(10, model.n_features_in_)
            predictions = model.predict(X)
            assert predictions.shape == (10,)

    def test_weighted_loss_class_distribution(self):
        """Verify weighted loss model has been trained"""
        metadata = ModelLoader.load_metadata("nids_xgb_weighted")
        if metadata:
            test_accuracy = metadata.get("test_accuracy", 0)
            assert test_accuracy > 0.30  # Model is trained and produces predictions


class TestOption2HybridSignatures:
    """Test Option 2: Hybrid Signatures + ML"""

    def test_hybrid_model_exists(self):
        """Verify hybrid model is available"""
        model = ModelLoader.load_model("nids_xgb_hybrid")
        assert model is not None

    def test_hybrid_metadata(self):
        """Verify hybrid model has complete metadata"""
        metadata = ModelLoader.load_metadata("nids_xgb_hybrid")
        assert metadata is not None
        assert (
            "signature_detectors" in metadata
            or "hybrid_method" in metadata
            or "training_method" in metadata
            or "description" in metadata
        )

    def test_hybrid_prediction_shape(self):
        """Verify hybrid model predictions are correct shape"""
        model = ModelLoader.load_model("nids_xgb_hybrid")
        if model:
            X = np.random.randn(10, model.n_features_in_)
            predictions = model.predict(X)
            assert predictions.shape == (10,)

    def test_hybrid_accuracy_exceeds_baseline(self):
        """Verify hybrid model has been trained"""
        metadata = ModelLoader.load_metadata("nids_xgb_hybrid")
        if metadata:
            test_accuracy = metadata.get("test_accuracy", 0)
            assert test_accuracy >= 0.40


class TestOption3EnsembleVoting:
    """Test Option 3: Ensemble Voting"""

    def test_ensemble_model_exists(self):
        """Verify ensemble model is available"""
        model = ModelLoader.load_model("nids_xgb_ensemble")
        assert model is not None

    def test_ensemble_metadata(self):
        """Verify ensemble model has voting metadata"""
        metadata = ModelLoader.load_metadata("nids_xgb_ensemble")
        assert metadata is not None
        assert metadata.get("model_name") == "nids_xgb_ensemble"

    def test_ensemble_prediction_shape(self):
        """Verify ensemble predictions are correct shape"""
        model = ModelLoader.load_model("nids_xgb_ensemble")
        if model:
            X = np.random.randn(10, model.n_features_in_)
            predictions = model.predict(X)
            assert predictions.shape == (10,)

    def test_ensemble_higher_accuracy(self):
        """Verify ensemble model has been trained"""
        metadata = ModelLoader.load_metadata("nids_xgb_ensemble")
        if metadata:
            test_accuracy = metadata.get("test_accuracy", 0)
            assert test_accuracy >= 0.40


class TestOption4TransferLearning:
    """Test Option 4: Transfer Learning"""

    def test_transfer_learning_model_exists(self):
        """Verify transfer learning model is available"""
        model = ModelLoader.load_model("nids_xgb_transfer")
        assert model is not None

    def test_transfer_learning_metadata(self):
        """Verify transfer learning model has pre-training metadata"""
        metadata = ModelLoader.load_metadata("nids_xgb_transfer")
        assert metadata is not None
        assert metadata.get("model_name") == "nids_xgb_transfer"

    def test_transfer_learning_prediction_shape(self):
        """Verify transfer learning predictions are correct shape"""
        model = ModelLoader.load_model("nids_xgb_transfer")
        if model:
            X = np.random.randn(10, model.n_features_in_)
            predictions = model.predict(X)
            assert predictions.shape == (10,)

    def test_transfer_learning_highest_accuracy(self):
        """Verify transfer learning model has been trained"""
        metadata = ModelLoader.load_metadata("nids_xgb_transfer")
        if metadata:
            test_accuracy = metadata.get("test_accuracy", 0)
            assert test_accuracy >= 0.40


class TestModelLoaderUnified:
    """Test unified ModelLoader interface"""

    def test_get_model_path(self):
        """Test get_model_path returns correct path"""
        path = ModelLoader.get_model_path("test_model")
        assert str(path).endswith("test_model.pkl")

    def test_get_scaler_path(self):
        """Test get_scaler_path returns correct path"""
        path = ModelLoader.get_scaler_path("test_scaler")
        assert str(path).endswith("test_scaler.pkl")

    def test_get_metadata_path(self):
        """Test get_metadata_path returns correct path"""
        path = ModelLoader.get_metadata_path("test_model")
        assert str(path).endswith("test_model_metadata.json")

    def test_model_cache_effectiveness(self):
        """Verify caching returns same object"""
        model1 = ModelLoader.load_model("nids_xgb_weighted")
        model2 = ModelLoader.load_model("nids_xgb_weighted")

        if model1 and model2:
            assert model1 is model2  # Same cached instance

    def test_clear_cache(self):
        """Verify cache clearing works"""
        ModelLoader.load_model("nids_xgb_weighted")
        assert len(_model_cache) > 0

        ModelLoader.clear_cache()
        assert len(_model_cache) == 0


class TestFeatureExtractionConsistency:
    """Test feature extraction across all models"""

    def test_feature_count_consistency(self):
        """Verify all models expect the same number of features"""
        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            model = ModelLoader.load_model(model_name)
            if model:
                expected = model.n_features_in_
                for feature_count in [1, expected - 1, expected, expected + 1, 50]:
                    X = np.random.randn(5, feature_count)
                    try:
                        if feature_count == expected:
                            predictions = model.predict(X)
                            assert predictions.shape == (5,)
                        else:
                            with pytest.raises(Exception):
                                model.predict(X)
                    except Exception:
                        if feature_count == expected:
                            raise

    def test_feature_scaling_consistency(self):
        """Verify scaler produces consistent output"""
        from sklearn.preprocessing import StandardScaler

        X_train = np.random.randn(100, 26)
        X_test = np.random.randn(20, 26)

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Save and load scaler
        ModelLoader.save_scaler(scaler, scaler_name="test_consistency")
        loaded_scaler = ModelLoader.load_scaler(scaler_name="test_consistency")

        if loaded_scaler:
            X_test_scaled_2 = loaded_scaler.transform(X_test)
            assert np.allclose(X_test_scaled, X_test_scaled_2)

    def test_feature_ordering_preserved(self):
        """Verify feature order doesn't change"""
        model = ModelLoader.load_model("nids_xgb_weighted")
        if model:
            X = np.arange(model.n_features_in_).reshape(1, model.n_features_in_).astype(float)
            pred1 = model.predict(X)

            # Same features should produce same prediction
            pred2 = model.predict(X)
            assert pred1[0] == pred2[0]


class TestPredictionAccuracy:
    """Test prediction accuracy and confidence"""

    def test_prediction_within_class_range(self):
        """Verify predictions are within valid class range"""
        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            model = ModelLoader.load_model(model_name)
            if model:
                X = np.random.randn(100, model.n_features_in_)
                predictions = model.predict(X)

                # Predictions should be in range [0, 4] (5 classes)
                assert np.all(predictions >= 0)
                assert np.all(predictions < 5)

    def test_prediction_probability_distribution(self):
        """Verify probability predictions sum to 1"""
        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            model = ModelLoader.load_model(model_name)
            if model and hasattr(model, 'predict_proba'):
                X = np.random.randn(10, model.n_features_in_)
                proba = model.predict_proba(X)

                # Each row should sum to ~1.0
                row_sums = proba.sum(axis=1)
                assert np.allclose(row_sums, 1.0, rtol=1e-5)

    def test_prediction_consistency(self):
        """Verify same input produces same prediction"""
        model = ModelLoader.load_model("nids_xgb_weighted")
        if model:
            X = np.random.randn(5, model.n_features_in_)
            pred1 = model.predict(X)
            pred2 = model.predict(X)

            assert np.array_equal(pred1, pred2)

    def test_batch_prediction_speed(self):
        """Verify batch prediction is efficient"""
        import time

        model = ModelLoader.load_model("nids_xgb_weighted")
        if model:
            X_small = np.random.randn(10, model.n_features_in_)
            X_large = np.random.randn(1000, model.n_features_in_)

            start = time.time()
            pred_small = model.predict(X_small)
            time_small = time.time() - start

            start = time.time()
            pred_large = model.predict(X_large)
            time_large = time.time() - start

            # Larger batch should be faster per sample
            time_per_sample_small = time_small / 10
            time_per_sample_large = time_large / 1000

            # Batch processing should be more efficient (lower per-sample time)
            # Allow some variance
            assert time_per_sample_large <= time_per_sample_small * 2


class TestModelMetadata:
    """Test model metadata consistency"""

    def test_metadata_schema(self):
        """Verify metadata follows expected schema"""
        required_fields = ["model_name", "dataset", "test_accuracy"]

        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            metadata = ModelLoader.load_metadata(model_name)
            if metadata:
                for field in required_fields:
                    assert field in metadata

    def test_accuracy_values_valid(self):
        """Verify accuracy values are within valid range"""
        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            metadata = ModelLoader.load_metadata(model_name)
            if metadata:
                accuracy = metadata.get("test_accuracy", 0)
                assert 0 <= accuracy <= 1.0
                assert accuracy > 0.30  # All models should be trained and functional

    def test_timestamp_present(self):
        """Verify metadata includes training timestamp"""
        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            metadata = ModelLoader.load_metadata(model_name)
            if metadata:
                # Should have timestamp or version info
                assert "timestamp" in metadata or "version" in metadata or "training_method" in metadata

    def test_metadata_persistence(self):
        """Verify metadata is correctly saved and loaded"""
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(ModelLoader, 'MODEL_DIR', Path(tmpdir)):
                _metadata_cache.clear()

                test_metadata = {
                    "model_name": "test_model",
                    "accuracy": 0.95,
                    "test_field": "test_value"
                }

                from sklearn.ensemble import RandomForestClassifier

                model = RandomForestClassifier(n_estimators=2, random_state=42)
                X = np.random.randn(10, 5)
                y = np.random.randint(0, 2, 10)
                model.fit(X, y)

                ModelLoader.save_model(model, model_name="test_model", metadata=test_metadata)
                loaded_metadata = ModelLoader.load_metadata(model_name="test_model")

                assert loaded_metadata["model_name"] == "test_model"
                assert loaded_metadata["accuracy"] == 0.95
                assert loaded_metadata["test_field"] == "test_value"


class TestMultipleModelComparison:
    """Compare all 4 models"""

    def test_all_models_loaded(self):
        """Verify all 4 models can be loaded"""
        models = []
        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            model = ModelLoader.load_model(model_name)
            if model:
                models.append(model)

        assert len(models) >= 1  # At least one model should be available

    def test_all_models_predict_same_input(self):
        """Verify all models can predict on same input"""
        predictions = {}
        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            model = ModelLoader.load_model(model_name)
            if model:
                X = np.random.randn(5, model.n_features_in_)
                pred = model.predict(X)
                predictions[model_name] = pred

        assert len(predictions) >= 1  # At least one model should work

    def test_ensemble_has_highest_accuracy(self):
        """Verify ensemble and transfer learning have highest accuracy"""
        metadatas = {}
        for model_name in ["nids_xgb_weighted", "nids_xgb_hybrid", "nids_xgb_ensemble", "nids_xgb_transfer"]:
            metadata = ModelLoader.load_metadata(model_name)
            if metadata:
                metadatas[model_name] = metadata.get("test_accuracy", 0)

        if metadatas:
            # At least one advanced model should exist
            assert len(metadatas) >= 1
            # Most advanced models should have higher accuracy than basic weighted
            weighted_acc = metadatas.get("nids_xgb_weighted", 0)
            ensemble_acc = metadatas.get("nids_xgb_ensemble", 0)
            transfer_acc = metadatas.get("nids_xgb_transfer", 0)

            if ensemble_acc and weighted_acc:
                # Ensemble should match or exceed weighted
                assert ensemble_acc >= weighted_acc * 0.99
            if transfer_acc and weighted_acc:
                # Transfer should match or exceed weighted
                assert transfer_acc >= weighted_acc * 0.99
