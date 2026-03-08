import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib
import json
import os

def generate_synthetic_nids_data(num_samples=5000):
    """
    Generates synthetic NSL-KDD-style network traffic data for training.
    """
    np.random.seed(42)
    
    # Feature columns based on NSL-KDD simplified
    protocols = ['tcp', 'udp', 'icmp']
    services = ['http', 'private', 'domain_u', 'ftp', 'smtp', 'other']
    flags = ['SF', 'S0', 'REJ', 'RSTR']
    
    # Create random feature distributions
    data = {
        'duration': np.random.exponential(1.5, num_samples),
        'protocol_type': np.random.choice(protocols, num_samples),
        'service': np.random.choice(services, num_samples),
        'flag': np.random.choice(flags, num_samples),
        'src_bytes': np.random.lognormal(8, 2, num_samples),
        'dst_bytes': np.random.lognormal(8, 2, num_samples),
        'count': np.random.randint(1, 512, num_samples),
        'srv_count': np.random.randint(1, 512, num_samples),
        'serror_rate': np.random.random(num_samples),
        'rerror_rate': np.random.random(num_samples),
        'same_srv_rate': np.random.random(num_samples),
        'diff_srv_rate': np.random.random(num_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Target labeling logic (Supervised simulation)
    # 1. Normal: SF flags, http, moderate bytes
    # 2. DoS: high counts, high serror_rate, SF/S0 flags, many same_srv_rate
    # 3. Probe: many diff_srv_rate, small durations, REJ flags
    
    def label_logic(row):
        if row['serror_rate'] > 0.8 and row['count'] > 200:
            return "DoS"
        if row['diff_srv_rate'] > 0.6 and row['count'] > 100:
             return "Probe"
        if row['protocol_type'] == 'icmp' and row['src_bytes'] > 10000:
             return "DDoS (Ping of Death)"
        if row['service'] == 'other' and row['flag'] == 'RSTR':
             return "U2R (Root Access)"
        return "Normal"

    df['label'] = df.apply(label_logic, axis=1)
    
    return df

def train_nids_model():
    print("🚀 Initializing NIDS AI Training Pipeline...")
    
    # Step 1: Generate/Load Data
    df = generate_synthetic_nids_data(10000)
    print(f"✅ Generated {len(df)} synthetic packet samples.")
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
