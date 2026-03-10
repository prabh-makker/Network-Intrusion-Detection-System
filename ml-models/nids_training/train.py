import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
from sklearn.datasets import fetch_kddcup99
import joblib
import json
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

def load_real_kdd_data():
    """
    Downloads and formats the real KDD Cup 99 dataset (predecessor to NSL-KDD ruleset).
    """
    print("⏳ Downloading Real KDD Cup 99 Dataset. This may take a minute...")
    # fetch_kddcup99 downloads the 10% KDD cup dataset by default
    dataset = fetch_kddcup99(percent10=True, as_frame=True)
    df = dataset.frame
    
    # KDD Cup 99 has 41 features. We will map to our 12 NIDS fields to reuse the same frontend logic
    # Our dashboard uses: duration, protocol_type, service, flag, src_bytes, dst_bytes, count, srv_count, serror_rate, rerror_rate, same_srv_rate, diff_srv_rate
    
    # Feature selection matching existing API schema
    selected_features = [
        'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
        'count', 'srv_count', 'serror_rate', 'rerror_rate', 'same_srv_rate', 'diff_srv_rate'
    ]
    
    X = df[selected_features].copy()
    
    # Decode byte strings in sklearn KDD dataset
    for col in ['protocol_type', 'service', 'flag']:
        if X[col].dtype == object:
            X[col] = X[col].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)
            
    # Sub-select a realistic sample (25,000) so local training is fast
    X = X.sample(n=25000, random_state=42)
    y = df.loc[X.index, 'labels'].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)
    
    # Group the massive amount of specific KDD labels into our 5 main threat categories
    def group_labels(label):
        label = label.replace('.', '')
        if label == 'normal': return 'Normal'
        if label in ['neptune', 'smurf', 'pod', 'teardrop', 'land', 'back', 'apache2', 'udpstorm']:
            return 'DoS' if label not in ['pod', 'smurf'] else 'DDoS (Ping of Death)'
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
    print("🚀 Initializing NIDS AI Training Pipeline with Real Data...")
    
    # Step 1: Generate/Load Data
    df = load_real_kdd_data()
    print(f"✅ Loaded {len(df)} real packet samples.")
    print(df['label'].value_counts())
    
    # Step 2: Preprocessing
    # Encode categorical features
    cat_features = ['protocol_type', 'service', 'flag']
    encoders = {}
    
    for col in cat_features:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = list(le.classes_)
        
    X = df.drop('label', axis=1)
    y = df['label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Step 3: Model Training
    print("🧠 Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42)
    model.fit(X_train, y_train)
    
    # Step 4: Evaluation
    y_pred = model.predict(X_test)
    print(f"📊 Model Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
    # print(classification_report(y_test, y_pred))
    
    # Step 5: Persistence
    model_dir = "models"
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "nids_rf_model.joblib")
    joblib.dump(model, model_path)
    
    metadata = {
        "features": list(X.columns),
        "encoders": encoders,
        "classes": list(model.classes_)
    }
    
    metadata_path = os.path.join(model_dir, "model_metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=4)
        
    print(f"💾 Model saved to {model_path}")
    print(f"📄 Metadata saved to {metadata_path}")

if __name__ == "__main__":
    train_nids_model()
