"""Reproducible NIDS baseline on the real KDD Cup 99 (10%) data from scikit-learn.

Maps the 23 attack names to Normal / DoS / Probe / R2L / U2R, trains XGBoost and
reports accuracy plus macro F1 (U2R/R2L are rare, so accuracy alone flatters).
KDD99 contains many duplicate rows, so scores are optimistic versus live traffic.
Run: python train_kdd99.py
"""
import numpy as np, pandas as pd
from sklearn.datasets import fetch_kddcup99
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

GROUP = {}
for g, names in {
    "DoS": "back land neptune pod smurf teardrop",
    "Probe": "ipsweep nmap portsweep satan",
    "R2L": "ftp_write guess_passwd imap multihop phf spy warezclient warezmaster",
    "U2R": "buffer_overflow loadmodule perl rootkit",
    "Normal": "normal",
}.items():
    GROUP.update({n: g for n in names.split()})

X, y = fetch_kddcup99(percent10=True, as_frame=True, return_X_y=True)
y = y.astype(str).str.strip(".").map(GROUP)
X = X.copy()
for c in ("protocol_type", "service", "flag"):
    X[c] = X[c].astype(str).astype("category").cat.codes
X = X.astype(float)

# Drop duplicate rows first so the test set has no copies of training rows.
keep = ~X.duplicated()
X, y = X[keep], y[keep]
le = LabelEncoder().fit(y)
Xtr, Xte, ytr, yte = train_test_split(X, le.transform(y), test_size=0.2, stratify=le.transform(y), random_state=42)

model = XGBClassifier(n_estimators=150, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=-1)
model.fit(Xtr, ytr)
pred = model.predict(Xte)
print(f"Unique rows: {len(X)}  (train {len(Xtr)}, test {len(Xte)})")
print(f"Accuracy: {accuracy_score(yte, pred)*100:.2f}%   Macro F1: {f1_score(yte, pred, average='macro')*100:.2f}%")
print(classification_report(yte, pred, target_names=le.classes_, digits=3, zero_division=0))
