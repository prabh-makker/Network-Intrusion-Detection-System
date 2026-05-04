import joblib
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.datasets import fetch_kddcup99
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import pandas as pd
import numpy as np
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

# Load the trained model
model = joblib.load('models/nids_rf_model.joblib')
with open('models/model_metadata.json') as f:
    meta = json.load(f)

print("Model type:", type(model).__name__)
print("\nFeature Importances:")
importances = {}
for name, imp in zip(meta['features'], model.feature_importances_):
    importances[name] = round(float(imp), 6)
    print(f"  {name}: {importances[name]}")

# Load data and get metrics
print("\nGenerating classification metrics...")
dataset = fetch_kddcup99(percent10=True, as_frame=True)
df = dataset.frame

selected_features = [
    'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
    'count', 'srv_count', 'serror_rate', 'rerror_rate', 'same_srv_rate', 'diff_srv_rate'
]

X = df[selected_features].copy()

# Convert numeric columns to float
numeric_cols = ['duration', 'src_bytes', 'dst_bytes', 'count', 'srv_count', 'serror_rate', 'rerror_rate', 'same_srv_rate', 'diff_srv_rate']
for col in numeric_cols:
    X[col] = pd.to_numeric(X[col], errors='coerce')

# Decode bytes to strings
for col in ['protocol_type', 'service', 'flag']:
    if X[col].dtype == object:
        X[col] = X[col].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)

# Sample data
sample_size = min(100000, len(df))
X = X.sample(n=sample_size, random_state=42)
y_raw = df.loc[X.index, 'labels'].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)

# Encode categorical features
cat_features = ['protocol_type', 'service', 'flag']
for col in cat_features:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col])

# Group labels
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

y = y_raw.apply(group_labels)

# Encode labels
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

# Make predictions
y_pred = model.predict(X_test)

# Get metrics
acc = accuracy_score(y_test, y_pred)
print(f"Overall Accuracy: {acc * 100:.2f}%")

# Classification report
report = classification_report(y_test, y_pred, target_names=meta['classes'], output_dict=True)
print("\nPer-class metrics:")
for class_name in meta['classes']:
    if class_name in report:
        r = report[class_name]
        print(f"  {class_name}: precision={r['precision']*100:.2f}%, recall={r['recall']*100:.2f}%, f1={r['f1-score']*100:.2f}%")

# Confusion matrix
cm = confusion_matrix(y_test, y_pred)
print(f"\nConfusion Matrix:\n{cm}")

# Format output for STATIC_METRICS
metrics_dict = {
    "overall_accuracy": round(acc * 100, 2),
    "by_class": {},
    "confusion_matrix": cm.tolist(),
    "confusion_labels": meta['classes']
}

for i, class_name in enumerate(meta['classes']):
    if class_name in report:
        metrics_dict['by_class'][class_name] = {
            "precision": round(report[class_name]['precision'] * 100, 2),
            "recall": round(report[class_name]['recall'] * 100, 2),
            "f1": round(report[class_name]['f1-score'] * 100, 2),
            "support": int(report[class_name]['support'])
        }

print("\n" + "="*60)
print("STATIC_METRICS for backend/app/api/v1/endpoints/models.py:")
print("="*60)
print(json.dumps(metrics_dict, indent=4))
