import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
from sklearn.datasets import fetch_kddcup99
from sklearn.utils.class_weight import compute_sample_weight
import xgboost as xgb
import joblib
import json
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

def load_real_kdd_data():
    print("Downloading High-Resolution KDD Cup 99 Dataset (10% subset)...")
    dataset = fetch_kddcup99(percent10=True, as_frame=True)
    df = dataset.frame
    
    selected_features = [
        'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
        'count', 'srv_count', 'serror_rate', 'rerror_rate', 'same_srv_rate', 'diff_srv_rate'
    ]

    X = df[selected_features].copy()

    # Convert numeric columns to float (they may be loaded as object type)
    numeric_cols = ['duration', 'src_bytes', 'dst_bytes', 'count', 'srv_count', 'serror_rate', 'rerror_rate', 'same_srv_rate', 'diff_srv_rate']
    for col in numeric_cols:
        X[col] = pd.to_numeric(X[col], errors='coerce')

    # Decode bytes to strings for categorical features
    for col in ['protocol_type', 'service', 'flag']:
        if X[col].dtype == object:
            X[col] = X[col].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)
            
    sample_size = min(100000, len(df))
    X = X.sample(n=sample_size, random_state=42)
    y = df.loc[X.index, 'labels'].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)
    
    def group_labels(label):
        label = label.replace('.', '')
        if label == 'normal': return 'Normal'
        if label in ['neptune', 'smurf', 'pod', 'teardrop', 'land', 'back', 'apache2', 'udpstorm']:
            return 'DoS'
        if label in ['satan', 'ipsweep', 'nmap', 'portsweep', 'mscan', 'saint']:
            return 'Probe'
        if label in ['guess_passwd', 'ftp_write', 'imap', 'phf', 'multihop', 'warezmaster', 'warezclient', 'spy', 'sendmail', 'named', 'snmpgetattack', 'snmpguess', 'xlock', 'xsanop', 'worm']:
            return 'R2L (Unauthorized Access)'
        if label in ['buffer_overflow', 'loadmodule', 'perl', 'rootkit', 'xterm', 'ps', 'httptunnel', 'sqlattack']:
            return 'U2R (Root Access)'
        return 'Normal'
        
    y = y.apply(group_labels)
    X['label'] = y
    
    return X

def train_nids_model():
    print("Initializing Ultra-Precision NIDS Training...")
    
    df = load_real_kdd_data()
    print(f"Loaded {len(df)} packet samples for high-resolution training.")
    print(df['label'].value_counts())
    
    cat_features = ['protocol_type', 'service', 'flag']
    encoders = {}
    
    for col in cat_features:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        classes = list(le.classes_)
        if 'other' not in classes:
            classes.append('other')
        encoders[col] = classes
        
    X = df.drop('label', axis=1)
    y_raw = df['label']

    # Encode threat labels to numeric for XGBoost
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training XGBoost Classifier with Class Balancing...")

    import warnings
    warnings.filterwarnings('ignore', category=UserWarning)

    # Compute sample weights for class imbalance handling
    sample_weights = compute_sample_weight('balanced', y_train)

    # Train XGBoost with optimized hyperparameters for this dataset
    best_model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=8,
        learning_rate=0.1,
        subsample=0.9,
        colsample_bytree=0.9,
        objective='multi:softmax',
        num_class=5,
        random_state=42,
        n_jobs=-1,
        verbosity=1
    )

    print("Training XGBoost...")
    best_model.fit(X_train, y_train, sample_weight=sample_weights, verbose=False)
    y_pred = best_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"[XGBoost] Final Model Accuracy: {acc * 100:.4f}%")

    best_model_name = "XGBoost Classifier"
    print(f"\nSelected Model for Deployment: {best_model_name}")
    
    model_dir = "models"
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "nids_rf_model.joblib")
    joblib.dump(best_model, model_path)
    
    metadata = {
        "features": list(X.columns),
        "encoders": encoders,
        "classes": list(label_encoder.classes_),  # String labels: ['DoS', 'Normal', 'Probe', 'R2L (Unauthorized Access)', 'U2R (Root Access)']
        "label_encoder_classes": list(label_encoder.classes_)
    }
    
    metadata_path = os.path.join(model_dir, "model_metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Ultra-Precision Model saved to {model_path}")

if __name__ == "__main__":
    train_nids_model()
