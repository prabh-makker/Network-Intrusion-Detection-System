"""Shared ML preprocessing pipeline.

Consolidates common preprocessing steps used by ml_service.py and ml_aggressive.py.
Eliminates 40+ lines of duplicate code.
"""

import numpy as np
import pandas as pd
from typing import Tuple
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session

from app.services.feature_engineering import FeatureEngineer
from app.services.threat_configs import TEST_SIZE, RANDOM_STATE


def preprocess_training_data(
    db: Session,
    test_size: float = TEST_SIZE,
    random_state: int = RANDOM_STATE
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, LabelEncoder, StandardScaler]:
    """Unified preprocessing pipeline for all training models.

    Steps:
    1. Load data with FeatureEngineer
    2. Extract feature columns
    3. Encode labels
    4. Scale features
    5. Train/test split

    Args:
        db: Database session
        test_size: Test set proportion (default 0.15)
        random_state: Random seed for reproducibility

    Returns:
        Tuple of (X_train, X_test, y_train, y_test, label_encoder, scaler)
    """
    # Load comprehensive features
    fe = FeatureEngineer()
    df = fe.batch_extract(db)

    if len(df) == 0:
        raise ValueError("No training data available in database")

    # Extract feature columns
    feature_cols = [col for col in fe.feature_columns if col in df.columns]
    X = df[feature_cols].fillna(0).values
    y_labels = df["label"].values

    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y_labels)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train/test split with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled,
        y_encoded,
        test_size=test_size,
        random_state=random_state,
        stratify=y_encoded,
    )

    return X_train, X_test, y_train, y_test, le, scaler


def preprocess_for_inference(
    X: np.ndarray,
    scaler: StandardScaler,
) -> np.ndarray:
    """Preprocess data for model inference.

    Args:
        X: Feature array
        scaler: Fitted StandardScaler from training

    Returns:
        Scaled features ready for inference
    """
    return scaler.transform(X)
