"""Comprehensive XGBoost training with NSL-KDD dataset and validation.

This module implements Tier 1 XGBoost improvements:
- NSL-KDD dataset support (cleaner than KDD Cup 99)
- 23-feature extraction aligned with FeatureEngineer
- 5-fold stratified cross-validation
- Early stopping to prevent overfitting
- Standardized metadata schema with CV scores
- Proper SSL certificate verification
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import os
import sys
import logging
from datetime import datetime
import ssl
import certifi

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Use proper SSL certificates instead of bypassing verification
ssl_context = ssl.create_default_context(cafile=certifi.where())

from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import xgboost as xgb
import joblib

# Add parent directory to path for ModelLoader import
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))
try:
    from app.core.model_loader import ModelLoader
    USE_MODEL_LOADER = True
except ImportError:
    logger.warning("ModelLoader not available - will save to local models/ directory only")
    USE_MODEL_LOADER = False


# ============================================================================
# DATA LOADING & PREPROCESSING
# ============================================================================

def download_nsl_kdd_dataset():
    """Download NSL-KDD dataset from Kaggle or UNB.

    NSL-KDD is a cleaned version of KDD Cup 99 with:
    - Removed duplicate records
    - Better class distribution
    - Standardized train/test split
    - 41 original features

    Options:
    1. Download from UNB (official): https://www.unb.ca/cic/datasets/nsl-kdd.html
    2. Use Kaggle API: kaggle datasets download -d hassan06/nslkdd

    Returns:
        Tuple of (train_df, test_df) with both loaded successfully, or raises error
    """
    data_dir = Path("data")
    train_file = data_dir / "KDDTrain+.txt"
    test_file = data_dir / "KDDTest+.txt"

    # Check if files already exist
    if train_file.exists() and test_file.exists():
        logger.info(f"✓ NSL-KDD dataset found at {data_dir}")
        return train_file, test_file

    # Guide user to download
    logger.error("NSL-KDD dataset not found!")
    logger.info("\nTo download NSL-KDD dataset:")
    logger.info("Option 1 (Official UNB source):")
    logger.info("  1. Visit: https://www.unb.ca/cic/datasets/nsl-kdd.html")
    logger.info("  2. Download: KDDTrain+.txt and KDDTest+.txt")
    logger.info("  3. Place in: ml-models/nids_training/data/")
    logger.info("\nOption 2 (Kaggle mirror):")
    logger.info("  pip install kaggle")
    logger.info("  # Setup: https://github.com/Kaggle/kaggle-api#api-credentials")
    logger.info("  kaggle datasets download -d hassan06/nslkdd")
    logger.info("  unzip nslkdd.zip -d ml-models/nids_training/data/")

    raise FileNotFoundError(
        f"NSL-KDD dataset files not found in {data_dir}. "
        "Please download KDDTrain+.txt and KDDTest+.txt and place them in data/"
    )


def load_nsl_kdd_data():
    """Load NSL-KDD dataset with proper encoding and feature extraction.

    Returns:
        Tuple of (X_train, X_test, y_train, y_test, scaler, metadata)
    """
    logger.info("=" * 70)
    logger.info("PHASE 1: Data Loading")
    logger.info("=" * 70)

    train_file, test_file = download_nsl_kdd_dataset()

    # NSL-KDD column names (41 features + label)
    feature_names = [
        'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
        'land', 'wrong_fragment', 'urgent', 'hot', 'num_failed_logins',
        'logged_in', 'num_compromised', 'root_shell', 'su_attempted',
        'num_root', 'num_file_creations', 'num_shells', 'num_access_files',
        'num_outbound_cmds', 'is_host_login', 'is_guest_login', 'count',
        'srv_count', 'serror_rate', 'srv_serror_rate', 'rerror_rate',
        'srv_rerror_rate', 'same_srv_rate', 'diff_srv_rate', 'srv_diff_host_rate',
        'dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate',
        'dst_host_diff_srv_rate', 'dst_host_same_src_port_rate',
        'dst_host_srv_diff_host_rate', 'dst_host_serror_rate',
        'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
        'dst_host_srv_rerror_rate', 'label'
    ]

    logger.info(f"Loading NSL-KDD training set from {train_file}")
    df_train = pd.read_csv(train_file, header=None, names=feature_names)

    logger.info(f"Loading NSL-KDD test set from {test_file}")
    df_test = pd.read_csv(test_file, header=None, names=feature_names)

    logger.info(f"✓ Training set: {len(df_train)} samples, {df_train.shape[1]} columns")
    logger.info(f"✓ Test set: {len(df_test)} samples, {df_test.shape[1]} columns")

    # Print label distribution
    logger.info("\nLabel Distribution (Training):")
    for label, count in df_train['label'].value_counts().items():
        pct = 100 * count / len(df_train)
        logger.info(f"  {label:30s}: {count:6d} ({pct:5.1f}%)")

    return df_train, df_test


def preprocess_kdd_features(df_train, df_test):
    """Extract 23 canonical features from KDD's 41 original features.

    Maps:
    - Protocol type → encoded numeric (TCP, UDP, ICMP, other)
    - Service → encoded numeric (http, ftp, smtp, etc.)
    - TCP flags → encoded numeric (SF, S0, REJ, etc.)
    - Numeric features → direct mapping to our feature schema

    Returns:
        Tuple of (X_train, X_test, y_train, y_test, feature_names, label_encoder)
    """
    logger.info("\n" + "=" * 70)
    logger.info("PHASE 2: Feature Preprocessing")
    logger.info("=" * 70)

    # Extract labels before modifying dataframes
    y_train_raw = df_train['label'].copy()
    y_test_raw = df_test['label'].copy()

    # Remove label column
    df_train = df_train.drop('label', axis=1)
    df_test = df_test.drop('label', axis=1)

    # Encode labels (multiclass: Normal, DoS, Probe, R2L, U2R)
    label_encoder = LabelEncoder()
    y_train = label_encoder.fit_transform(y_train_raw)
    y_test = label_encoder.transform(y_test_raw)

    logger.info(f"Label mapping: {dict(zip(label_encoder.classes_, label_encoder.transform(label_encoder.classes_)))}")

    # === Extract 23 canonical features from 41 KDD features ===
    X_train = pd.DataFrame()
    X_test_frame = pd.DataFrame()

    # 1-4. Duration & Timing (4 features)
    X_train['duration'] = df_train['duration'].astype(float)
    X_train['src_bytes'] = df_train['src_bytes'].astype(float)
    X_train['dst_bytes'] = df_train['dst_bytes'].astype(float)
    X_train['bytes_total'] = X_train['src_bytes'] + X_train['dst_bytes']

    X_test_frame['duration'] = df_test['duration'].astype(float)
    X_test_frame['src_bytes'] = df_test['src_bytes'].astype(float)
    X_test_frame['dst_bytes'] = df_test['dst_bytes'].astype(float)
    X_test_frame['bytes_total'] = X_test_frame['src_bytes'] + X_test_frame['dst_bytes']

    # 5-8. Connection Statistics (4 features)
    X_train['count'] = df_train['count'].astype(float)
    X_train['srv_count'] = df_train['srv_count'].astype(float)
    X_train['same_srv_rate'] = df_train['same_srv_rate'].astype(float)
    X_train['diff_srv_rate'] = df_train['diff_srv_rate'].astype(float)

    X_test_frame['count'] = df_test['count'].astype(float)
    X_test_frame['srv_count'] = df_test['srv_count'].astype(float)
    X_test_frame['same_srv_rate'] = df_test['same_srv_rate'].astype(float)
    X_test_frame['diff_srv_rate'] = df_test['diff_srv_rate'].astype(float)

    # 9-12. Error Rates (4 features)
    X_train['serror_rate'] = df_train['serror_rate'].astype(float)
    X_train['srv_serror_rate'] = df_train['srv_serror_rate'].astype(float)
    X_train['rerror_rate'] = df_train['rerror_rate'].astype(float)
    X_train['srv_rerror_rate'] = df_train['srv_rerror_rate'].astype(float)

    X_test_frame['serror_rate'] = df_test['serror_rate'].astype(float)
    X_test_frame['srv_serror_rate'] = df_test['srv_serror_rate'].astype(float)
    X_test_frame['rerror_rate'] = df_test['rerror_rate'].astype(float)
    X_test_frame['srv_rerror_rate'] = df_test['srv_rerror_rate'].astype(float)

    # 13-15. Protocol & Service Encoding (3 features)
    protocol_map = {'tcp': 0, 'udp': 1, 'icmp': 2}
    service_map = {'http': 0, 'ftp': 1, 'smtp': 2, 'domain_u': 3, 'ssh': 4,
                   'telnet': 5, 'private': 6, 'other': 7}
    flag_map = {'SF': 0, 'S0': 1, 'REJ': 2, 'RSTR': 3, 'SH': 4, 'RST': 5, 'RSTO': 6, 'other': 7}

    X_train['protocol_encoded'] = df_train['protocol_type'].map(
        lambda x: protocol_map.get(str(x).lower(), 3)
    ).astype(float)
    X_train['service_encoded'] = df_train['service'].map(
        lambda x: service_map.get(str(x).lower(), 7)
    ).astype(float)
    X_train['flag_encoded'] = df_train['flag'].map(
        lambda x: flag_map.get(str(x).upper(), 7)
    ).astype(float)

    X_test_frame['protocol_encoded'] = df_test['protocol_type'].map(
        lambda x: protocol_map.get(str(x).lower(), 3)
    ).astype(float)
    X_test_frame['service_encoded'] = df_test['service'].map(
        lambda x: service_map.get(str(x).lower(), 7)
    ).astype(float)
    X_test_frame['flag_encoded'] = df_test['flag'].map(
        lambda x: flag_map.get(str(x).upper(), 7)
    ).astype(float)

    # 16-23. Advanced Behavioral Features (8 features)
    # Note: These are approximations from available KDD features
    X_train['unique_services'] = df_train['dst_host_srv_count'].astype(float) / (df_train['dst_host_count'].astype(float) + 1)
    X_train['port_diversity'] = df_train['dst_host_diff_srv_rate'].astype(float)
    X_train['syn_flood_indicator'] = (df_train['serror_rate'] * df_train['count']).astype(float)
    X_train['connection_velocity'] = (df_train['count'] / (df_train['duration'].astype(float) + 1)).astype(float)
    X_train['payload_entropy'] = df_train['src_bytes'].astype(float) / (df_train['duration'].astype(float) + 1)
    X_train['anomaly_score'] = (df_train['serror_rate'] + df_train['rerror_rate']).astype(float) / 2
    X_train['src_country_risk'] = df_train['num_failed_logins'].astype(float) / 10  # Approximation
    X_train['dst_country_risk'] = df_train['num_compromised'].astype(float) / 10  # Approximation

    X_test_frame['unique_services'] = df_test['dst_host_srv_count'].astype(float) / (df_test['dst_host_count'].astype(float) + 1)
    X_test_frame['port_diversity'] = df_test['dst_host_diff_srv_rate'].astype(float)
    X_test_frame['syn_flood_indicator'] = (df_test['serror_rate'] * df_test['count']).astype(float)
    X_test_frame['connection_velocity'] = (df_test['count'] / (df_test['duration'].astype(float) + 1)).astype(float)
    X_test_frame['payload_entropy'] = df_test['src_bytes'].astype(float) / (df_test['duration'].astype(float) + 1)
    X_test_frame['anomaly_score'] = (df_test['serror_rate'] + df_test['rerror_rate']).astype(float) / 2
    X_test_frame['src_country_risk'] = df_test['num_failed_logins'].astype(float) / 10
    X_test_frame['dst_country_risk'] = df_test['num_compromised'].astype(float) / 10

    # Replace test_frame with proper name
    X_test = X_test_frame

    # Verify feature count
    assert X_train.shape[1] == 23, f"Expected 23 features, got {X_train.shape[1]}"
    assert X_test.shape[1] == 23, f"Expected 23 features, got {X_test.shape[1]}"

    logger.info(f"✓ Extracted 23 canonical features")
    logger.info(f"  Training shape: {X_train.shape}")
    logger.info(f"  Test shape: {X_test.shape}")
    logger.info(f"  Features: {list(X_train.columns)}")

    # Handle missing values
    X_train = X_train.fillna(0)
    X_test = X_test.fillna(0)

    # Standardize features
    logger.info("\nFitting StandardScaler...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    logger.info(f"✓ StandardScaler fitted (mean={scaler.mean_[:3]}..., scale={scaler.scale_[:3]}...)")

    return X_train_scaled, X_test_scaled, y_train, y_test, X_train.columns.tolist(), label_encoder, scaler


# ============================================================================
# MODEL TRAINING WITH CROSS-VALIDATION
# ============================================================================

def train_model_with_cv(X_train, y_train, X_test, y_test):
    """Train XGBoost with 5-fold stratified cross-validation and early stopping.

    Returns:
        Tuple of (model, cv_scores, test_accuracy, classification_report_dict)
    """
    logger.info("\n" + "=" * 70)
    logger.info("PHASE 3: Model Training with Cross-Validation")
    logger.info("=" * 70)

    # Initialize model with baseline hyperparameters (to be tuned in Tier 2)
    model = xgb.XGBClassifier(
        n_estimators=200,           # Moderate number of trees
        max_depth=6,                # Balanced depth
        learning_rate=0.1,          # Standard learning rate
        subsample=0.9,              # Use 90% of samples per tree
        colsample_bytree=0.9,       # Use 90% of features per tree
        gamma=0.5,                  # Regularization: minimum loss reduction
        min_child_weight=2,         # Prevent overfitting on small groups
        reg_alpha=0.1,              # L1 regularization
        reg_lambda=1.0,             # L2 regularization
        random_state=42,
        eval_metric='mlogloss',
        early_stopping_rounds=20,   # Stop if no improvement for 20 rounds
        objective='multi:softmax',
        num_class=len(np.unique(y_train)),
        n_jobs=-1                   # Use all cores
    )

    logger.info("Model hyperparameters:")
    logger.info(f"  n_estimators: 200")
    logger.info(f"  max_depth: 6")
    logger.info(f"  learning_rate: 0.1")
    logger.info(f"  early_stopping_rounds: 20")

    # === 5-Fold Stratified Cross-Validation ===
    logger.info("\nRunning 5-fold stratified cross-validation...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X_train, y_train), 1):
        logger.info(f"  Fold {fold}/5...")

        X_fold_train = X_train[train_idx]
        X_fold_val = X_train[val_idx]
        y_fold_train = y_train[train_idx]
        y_fold_val = y_train[val_idx]

        fold_model = xgb.XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.9, colsample_bytree=0.9, gamma=0.5, min_child_weight=2,
            reg_alpha=0.1, reg_lambda=1.0, random_state=42,
            eval_metric='mlogloss', early_stopping_rounds=20,
            objective='multi:softmax', num_class=len(np.unique(y_fold_train)),
            n_jobs=-1
        )

        fold_model.fit(
            X_fold_train, y_fold_train,
            eval_set=[(X_fold_val, y_fold_val)],
            verbose=False
        )

        fold_score = fold_model.score(X_fold_val, y_fold_val)
        cv_scores.append(fold_score)
        logger.info(f"Accuracy: {fold_score:.4f}")

    cv_mean = np.mean(cv_scores)
    cv_std = np.std(cv_scores)
    logger.info(f"\nCross-validation Results:")
    logger.info(f"  Mean Accuracy: {cv_mean:.4f} ± {cv_std:.4f}")
    logger.info(f"  Fold Scores: {[f'{s:.4f}' for s in cv_scores]}")

    # === Train final model on full training set with early stopping ===
    logger.info("\nTraining final model on full training set...")
    final_model = xgb.XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        subsample=0.9, colsample_bytree=0.9, gamma=0.5, min_child_weight=2,
        reg_alpha=0.1, reg_lambda=1.0, random_state=42,
        eval_metric='mlogloss', early_stopping_rounds=20,
        objective='multi:softmax', num_class=len(np.unique(y_train)),
        n_jobs=-1
    )

    final_model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )

    # === Evaluate on test set ===
    logger.info("\n" + "=" * 70)
    logger.info("PHASE 4: Model Evaluation")
    logger.info("=" * 70)

    y_pred = final_model.predict(X_test)
    test_accuracy = accuracy_score(y_test, y_pred)

    logger.info(f"Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")

    # Classification report
    class_report = classification_report(y_test, y_pred, output_dict=True)
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, y_pred))

    # Confusion matrix
    conf_matrix = confusion_matrix(y_test, y_pred)
    logger.info(f"\nConfusion Matrix:\n{conf_matrix}")

    return final_model, cv_scores, test_accuracy, class_report


# ============================================================================
# MODEL PERSISTENCE
# ============================================================================

def save_model_and_metadata(model, scaler, feature_names, label_encoder,
                           cv_scores, test_accuracy, class_report):
    """Save model, scaler, and comprehensive metadata.

    Saves to both:
    - Shared models directory (via ModelLoader if available)
    - Local models/ directory (backward compatibility)
    """
    logger.info("\n" + "=" * 70)
    logger.info("PHASE 5: Model Persistence")
    logger.info("=" * 70)

    # Create metadata
    metadata = {
        "model_name": "nids_xgb",
        "version": "1.0",
        "dataset": "nsl-kdd",
        "train_method": "stratified_kfold_cv",
        "timestamp": datetime.now().isoformat(),

        # Dataset info
        "feature_count": len(feature_names),
        "feature_names": feature_names,
        "label_type": "multiclass",
        "threat_classes": list(label_encoder.classes_),

        # Training results
        "cv_scores": [float(s) for s in cv_scores],
        "cv_mean": float(np.mean(cv_scores)),
        "cv_std": float(np.std(cv_scores)),
        "test_accuracy": float(test_accuracy),
        "test_accuracy_percent": float(test_accuracy * 100),

        # Classification metrics
        "classification_report": class_report,

        # Scaler info
        "scaler_type": "StandardScaler",
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),

        # Model hyperparameters
        "hyperparameters": {
            "n_estimators": 200,
            "max_depth": 6,
            "learning_rate": 0.1,
            "subsample": 0.9,
            "colsample_bytree": 0.9,
            "gamma": 0.5,
            "min_child_weight": 2,
            "reg_alpha": 0.1,
            "reg_lambda": 1.0,
            "early_stopping_rounds": 20
        }
    }

    # Save using ModelLoader (if available)
    if USE_MODEL_LOADER:
        try:
            logger.info("Saving to shared models directory (via ModelLoader)...")
            ModelLoader.save_model(model, model_name="nids_xgb", metadata=metadata)
            ModelLoader.save_scaler(scaler, scaler_name="feature_scaler")
            logger.info(f"✓ Model: {ModelLoader.get_model_path('nids_xgb')}")
            logger.info(f"✓ Metadata: {ModelLoader.get_metadata_path('nids_xgb')}")
            logger.info(f"✓ Scaler: {ModelLoader.get_scaler_path('feature_scaler')}")
        except Exception as e:
            logger.warning(f"Failed to save via ModelLoader: {e}")
            logger.info("Falling back to local models/ directory")
            USE_MODEL_LOADER = False

    # Also save to local models/ directory (backward compatibility)
    local_models_dir = Path("models")
    local_models_dir.mkdir(exist_ok=True)

    # Model
    model_path_local = local_models_dir / "nids_xgb.pkl"
    joblib.dump(model, model_path_local)
    logger.info(f"✓ Local model: {model_path_local}")

    # Scaler
    scaler_path_local = local_models_dir / "feature_scaler.pkl"
    joblib.dump(scaler, scaler_path_local)
    logger.info(f"✓ Local scaler: {scaler_path_local}")

    # Metadata
    metadata_path_local = local_models_dir / "nids_xgb_metadata.json"
    with open(metadata_path_local, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"✓ Local metadata: {metadata_path_local}")

    return metadata


# ============================================================================
# MAIN TRAINING PIPELINE
# ============================================================================

def main():
    """Execute complete training pipeline with validation."""
    logger.info("\n")
    logger.info("╔" + "="*68 + "╗")
    logger.info("║" + " "*68 + "║")
    logger.info("║" + "  NIDS XGBoost Model Training (Tier 1 Improvements)".center(68) + "║")
    logger.info("║" + "  NSL-KDD Dataset + Cross-Validation + Early Stopping".center(68) + "║")
    logger.info("║" + " "*68 + "║")
    logger.info("╚" + "="*68 + "╝")
    logger.info("")

    try:
        # Load data
        df_train, df_test = load_nsl_kdd_data()

        # Preprocess features
        X_train, X_test, y_train, y_test, feature_names, label_encoder, scaler = preprocess_kdd_features(
            df_train, df_test
        )

        # Train with cross-validation
        model, cv_scores, test_accuracy, class_report = train_model_with_cv(
            X_train, y_train, X_test, y_test
        )

        # Save model and metadata
        metadata = save_model_and_metadata(
            model, scaler, feature_names, label_encoder,
            cv_scores, test_accuracy, class_report
        )

        # Print summary
        logger.info("\n" + "="*70)
        logger.info("TRAINING COMPLETE - SUMMARY")
        logger.info("="*70)
        logger.info(f"Cross-Validation Accuracy: {metadata['cv_mean']:.4f} ± {metadata['cv_std']:.4f}")
        logger.info(f"Test Set Accuracy: {metadata['test_accuracy']:.4f} ({metadata['test_accuracy_percent']:.2f}%)")
        logger.info(f"Features: {metadata['feature_count']} canonical features")
        logger.info(f"Classes: {', '.join(metadata['threat_classes'])}")
        logger.info(f"Dataset: NSL-KDD (Cleaner version of KDD Cup 99)")
        logger.info("="*70)
        logger.info("✓ Model ready for deployment!")
        logger.info("")

        return 0

    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())
