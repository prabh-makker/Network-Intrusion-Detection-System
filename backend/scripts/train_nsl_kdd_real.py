#!/usr/bin/env python3
"""
Train XGBoost on REAL NSL-KDD dataset (actual network traffic from DARPA 1998/1999).
Downloads from official UNB source and trains on real attack data.
Expected accuracy: 85-95% (realistic, not synthetic magic).
"""

import sys
import os
import numpy as np
import pandas as pd
import urllib.request
import zipfile
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from xgboost import XGBClassifier
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.model_loader import ModelLoader

# NSL-KDD features (41 total, but we use 12 like the training scripts)
FEATURES_41 = [
    "duration", "protocol_type", "service", "flag",
    "src_bytes", "dst_bytes", "land", "wrong_fragment",
    "urgent", "hot", "num_failed_logins", "logged_in",
    "num_compromised", "root_shell", "su_attempted", "num_root",
    "num_file_creations", "num_shells", "num_access_files", "num_outbound_cmds",
    "is_host_login", "is_guest_login", "count", "srv_count",
    "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate",
    "same_srv_rate", "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count",
    "dst_host_same_srv_rate", "dst_host_diff_srv_rate", "dst_host_same_src_port_rate",
    "dst_host_srv_diff_host_rate", "dst_host_serror_rate", "dst_host_srv_serror_rate",
    "dst_host_rerror_rate", "dst_host_srv_rerror_rate", "label"
]

# We'll use the 12-feature subset for consistency with our model
FEATURES_12 = [
    "duration", "protocol_type", "service", "flag",
    "src_bytes", "dst_bytes", "count", "srv_count",
    "serror_rate", "rerror_rate", "same_srv_rate", "diff_srv_rate"
]

PROTOCOL_MAP = {"tcp": 0, "udp": 1, "icmp": 2}
SERVICE_MAP = {
    "http": 0, "ftp": 1, "smtp": 2, "ssh": 3, "telnet": 4, "dns": 5,
    "domain_u": 5, "private": 6, "other": 7
}
FLAG_MAP = {"SF": 0, "S0": 1, "REJ": 2, "RSTR": 3, "SH": 4, "RST": 5, "RSTO": 6, "other": 7}


def download_nsl_kdd():
    """Download NSL-KDD dataset from mirror sources."""
    print("\n[1] Downloading NSL-KDD dataset...")
    data_dir = "C:\\Users\\khalo\\nids\\data"
    os.makedirs(data_dir, exist_ok=True)

    # Try multiple mirror sources
    sources = [
        # GitHub mirrors
        ("https://raw.githubusercontent.com/alvarobartt/NSL-KDD/master/NSL-KDD/KDDTest%2B.txt",
         "https://raw.githubusercontent.com/alvarobartt/NSL-KDD/master/NSL-KDD/KDDTrain%2B.txt"),
        # Alternative mirror
        ("https://mirrors.aliyun.com/ubuntu/pool/main/n/nsl-kdd/KDDTest+.txt",
         "https://mirrors.aliyun.com/ubuntu/pool/main/n/nsl-kdd/KDDTrain+.txt"),
    ]

    filepath_train = None
    filepath_test = None

    for url_test, url_train in sources:
        try:
            filepath_test = os.path.join(data_dir, "KDDTest+.txt")
            filepath_train = os.path.join(data_dir, "KDDTrain+.txt")

            if not os.path.exists(filepath_test):
                print(f"    Downloading test set from mirror...")
                urllib.request.urlretrieve(url_test, filepath_test)
                print(f"    Downloaded: {filepath_test}")

            if not os.path.exists(filepath_train):
                print(f"    Downloading training set from mirror...")
                urllib.request.urlretrieve(url_train, filepath_train)
                print(f"    Downloaded: {filepath_train}")

            if os.path.exists(filepath_train) and os.path.exists(filepath_test):
                return filepath_train, filepath_test

        except Exception as e:
            print(f"    Mirror failed: {e}")
            if os.path.exists(filepath_test):
                os.remove(filepath_test)
            if os.path.exists(filepath_train):
                os.remove(filepath_train)
            continue

    print(f"\n    [MANUAL DOWNLOAD REQUIRED]")
    print(f"    Please download NSL-KDD dataset manually:")
    print(f"    From: https://www.unb.ca/cic/datasets/nsl.html")
    print(f"    Extract to: {data_dir}")
    print(f"    Files needed:")
    print(f"      - KDDTrain+.txt (Training set, ~125K samples)")
    print(f"      - KDDTest+.txt (Test set, ~22K samples)")
    return None, None


def load_nsl_kdd_real(train_file, test_file):
    """Load real NSL-KDD data from files."""
    print("\n[2] Loading real NSL-KDD data...")

    if not os.path.exists(train_file):
        print(f"    ERROR: Training file not found: {train_file}")
        print(f"    Download from: https://www.unb.ca/cic/datasets/nsl.html")
        return None, None, None, None

    # Load training data
    print(f"    Loading training set from {os.path.basename(train_file)}...")
    df_train = pd.read_csv(train_file, header=None, names=FEATURES_41 + ["difficulty"])

    # Load test data
    if os.path.exists(test_file):
        print(f"    Loading test set from {os.path.basename(test_file)}...")
        df_test = pd.read_csv(test_file, header=None, names=FEATURES_41 + ["difficulty"])
    else:
        df_test = None
        print(f"    Test file not found, will use train/test split")

    print(f"    Training samples: {len(df_train)}")
    if df_test is not None:
        print(f"    Test samples: {len(df_test)}")

    # Show attack distribution
    print(f"\n    Attack distribution in training set:")
    for label, count in df_train["label"].value_counts().items():
        pct = count / len(df_train) * 100
        print(f"      {label:15s}: {count:6d} ({pct:5.1f}%)")

    return df_train, df_test, FEATURES_41, "label"


def extract_12_features(df):
    """Extract 12-feature subset from full NSL-KDD data."""
    # For features not directly available, compute from available ones
    X = pd.DataFrame()

    X["duration"] = df["duration"]
    X["protocol_type"] = df["protocol_type"]
    X["service"] = df["service"]
    X["flag"] = df["flag"]
    X["src_bytes"] = df["src_bytes"]
    X["dst_bytes"] = df["dst_bytes"]
    X["count"] = df["count"]
    X["srv_count"] = df["srv_count"]
    X["serror_rate"] = df["serror_rate"]
    X["rerror_rate"] = df["rerror_rate"]
    X["same_srv_rate"] = df["same_srv_rate"]
    X["diff_srv_rate"] = df["srv_diff_host_rate"]  # Use available feature as proxy

    return X


def simplify_labels(labels):
    """Simplify NSL-KDD labels to 5 classes."""
    simplified = []
    for label in labels:
        if label == "normal":
            simplified.append("Normal")
        elif label in ["back", "land", "neptune", "pod", "smurf", "teardrop"]:
            simplified.append("DoS")
        elif label in ["ipsweep", "nmap", "portsweep", "satan"]:
            simplified.append("Probe")
        elif label in ["ftp_write", "guess_passwd", "imap", "phf", "snmpguess", "snmpgetattack", "spy", "warezclient", "warezmaster"]:
            simplified.append("R2L")
        elif label in ["buffer_overflow", "loadmodule", "perl", "rootkit"]:
            simplified.append("U2R")
        else:
            simplified.append("Normal")
    return np.array(simplified)


def train_real():
    """Train on real NSL-KDD dataset."""
    print("\n" + "="*70)
    print("TRAINING XGBOOST ON REAL NSL-KDD DATA")
    print("="*70)

    # Download dataset
    train_file, test_file = download_nsl_kdd()
    if train_file is None:
        return None, None, None

    # Load data
    df_train, df_test, features, label_col = load_nsl_kdd_real(train_file, test_file)
    if df_train is None:
        return None, None, None

    # Extract 12-feature subset
    print("\n[3] Extracting 12-feature subset...")
    X_train = extract_12_features(df_train)
    y_train = simplify_labels(df_train["label"].values)

    if df_test is not None:
        X_test = extract_12_features(df_test)
        y_test = simplify_labels(df_test["label"].values)
    else:
        X_test = None
        y_test = None

    print(f"    Training features: {X_train.shape}")
    print(f"    Training labels: {len(y_train)}")
    print(f"    Attack distribution:")
    for label, count in zip(*np.unique(y_train, return_counts=True)):
        pct = count / len(y_train) * 100
        print(f"      {label:15s}: {count:6d} ({pct:5.1f}%)")

    # Encode
    print("\n[4] Encoding categorical features...")
    X_enc = X_train.copy()
    X_enc["protocol_type"] = X_train["protocol_type"].map(PROTOCOL_MAP).fillna(3)
    X_enc["service"] = X_train["service"].map(SERVICE_MAP).fillna(7)
    X_enc["flag"] = X_train["flag"].map(FLAG_MAP).fillna(7)
    X_enc = X_enc[FEATURES_12]

    le = LabelEncoder()
    y_enc = le.fit_transform(y_train)
    print(f"    Classes: {list(le.classes_)}")

    # Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_enc)

    # Split if we don't have separate test set
    if X_test is None:
        X_train_split, X_test_split, y_train_split, y_test_split = train_test_split(
            X_scaled, y_enc, test_size=0.2, random_state=42, stratify=y_enc
        )
    else:
        # Encode and scale test set
        X_test_enc = X_test.copy()
        X_test_enc["protocol_type"] = X_test["protocol_type"].map(PROTOCOL_MAP).fillna(3)
        X_test_enc["service"] = X_test["service"].map(SERVICE_MAP).fillna(7)
        X_test_enc["flag"] = X_test["flag"].map(FLAG_MAP).fillna(7)
        X_test_enc = X_test_enc[FEATURES_12]

        X_test_scaled = scaler.transform(X_test_enc)
        y_test_enc = le.transform(y_test)

        X_train_split, X_test_split = X_scaled, X_test_scaled
        y_train_split, y_test_split = y_enc, y_test_enc

    print(f"\n[5] Train/Test split:")
    print(f"    Train: {len(X_train_split)} samples")
    print(f"    Test:  {len(X_test_split)} samples")

    # Train
    print(f"\n[6] Training XGBoost (max_depth=6, n_estimators=150)...")
    model = XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.15,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="mlogloss",
        n_jobs=-1,
    )
    model.fit(X_train_split, y_train_split, verbose=0)

    # Evaluate
    print(f"\n[7] REAL ACCURACY (on real NSL-KDD data):")
    y_pred = model.predict(X_test_split)
    accuracy = accuracy_score(y_test_split, y_pred)

    print(f"\n    Test Accuracy: {accuracy*100:.2f}%")
    print(f"\n    Classification Report:")
    print(classification_report(y_test_split, y_pred, target_names=le.classes_, digits=3))

    print(f"\n    Confusion Matrix:")
    cm = confusion_matrix(y_test_split, y_pred)
    print(cm)

    # Cross-validation
    print(f"\n[8] Cross-validation (5-fold):")
    cv_scores = cross_val_score(model, X_scaled, y_enc, cv=5, scoring='accuracy')
    print(f"    Scores: {[f'{s*100:.1f}%' for s in cv_scores]}")
    print(f"    Mean:   {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")

    # Feature importance
    print(f"\n[9] Feature Importances:")
    for i, (feat, imp) in enumerate(sorted(
        zip(FEATURES_12, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True
    )[:8]):
        print(f"    {i+1}. {feat:15s}: {imp*100:6.2f}%")

    # Save
    print(f"\n[10] Saving model...")
    ModelLoader.ensure_model_dir()

    model_path = ModelLoader.get_model_path("nids_xgb_real_nsl_kdd")
    scaler_path = ModelLoader.get_scaler_path("nids_xgb_real_nsl_kdd")

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"     Model:  {model_path}")
    print(f"     Scaler: {scaler_path}")

    # Metadata
    metadata = {
        "model_name": "nids_xgb_real_nsl_kdd",
        "description": "XGBoost trained on real NSL-KDD dataset (DARPA 1998/1999)",
        "dataset": "nsl-kdd-real",
        "data_source": "https://www.unb.ca/cic/datasets/nsl.html",
        "test_accuracy": float(accuracy),
        "cv_mean": float(cv_scores.mean()),
        "cv_std": float(cv_scores.std()),
        "n_estimators": 150,
        "max_depth": 6,
        "learning_rate": 0.15,
        "n_features": 12,
        "features": FEATURES_12,
        "classes": le.classes_.tolist(),
        "feature_importances": {
            name: float(val)
            for name, val in zip(FEATURES_12, model.feature_importances_)
        },
    }

    metadata_path = ModelLoader.get_metadata_path("nids_xgb_real_nsl_kdd")
    import json
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"     Metadata: {metadata_path}")

    print("\n" + "="*70)
    print(f"TRAINING COMPLETE")
    print(f"Real NSL-KDD Accuracy: {accuracy*100:.2f}%")
    print(f"Cross-validation: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")
    print("="*70 + "\n")

    return model, scaler, le


if __name__ == "__main__":
    train_real()
