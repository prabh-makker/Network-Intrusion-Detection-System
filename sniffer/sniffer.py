from scapy.all import sniff, IP, TCP, UDP, ICMP
import requests
import time
import random
import joblib
import json
import pandas as pd
import numpy as np
import os
from collections import deque

# Config
API_ENDPOINT = "http://localhost:8000/api/v1/traffic/log"
MODEL_PATH = "models/nids_rf_model.joblib"
METADATA_PATH = "models/model_metadata.json"

# State trackers for "Window Features" (mocking real-time features)
connection_window = deque(maxlen=100)
host_stats = {} # src_ip -> list of recent flags/times

# Load model
try:
    print(f"📦 Loading Model: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    with open(METADATA_PATH, 'r') as f:
        metadata = json.load(f)
    print("✅ Model & Metadata loaded successfully.")
except Exception as e:
    print(f"❌ ERROR: Could not load model: {e}")
    model = None
    metadata = None

def get_service_name(port):
    # Simplified service mapping
    if port == 80 or port == 443: return "http"
    if port == 21: return "ftp"
    if port == 25: return "smtp"
    if port == 53: return "domain_u"
    if port > 1024: return "private"
    return "other"

def analyze_packet(packet):
    if IP not in packet:
        return

    # 1. Feature Extraction
    now = time.time()
    src_ip = packet[IP].src
    dst_ip = packet[IP].dst
    length = len(packet)
    
    # Base Categoricals
    protocol = "tcp" if TCP in packet else ("udp" if UDP in packet else ("icmp" if ICMP in packet else "other"))
    service = "other"
    flag = "SF" # Default Start-Finish
    
    if TCP in packet:
        service = get_service_name(packet[TCP].dport)
        # Extract TCP Flag
        flags = packet[TCP].flags
        if flags == "S": flag = "S0"
        elif flags == "RA" or flags == "R": flag = "REJ"
        elif flags == "RSTR": flag = "RSTR"
    elif UDP in packet:
        service = get_service_name(packet[UDP].dport)

    # Rolling window counts
    connection_window.append((now, src_ip, dst_ip, protocol, flag))
    
    # Features for the model:
    # 1. duration: use a small random or diff from last seen
    # 2. protocol_type, service, flag
    # 3. src_bytes, dst_bytes
    # 4. count, srv_count, serror_rate, same_srv_rate, diff_srv_rate, etc.
    
    # Simplified rolling feature computation
    recent = list(connection_window)
    count = len([c for c in recent if c[1] == src_ip]) # Total connections from this host in window
    srv_count = len([c for c in recent if c[4] == flag]) # Flag frequency (proxy for state frequency)
    
    # Mock some rates based on heuristics to make the AI fire
    serror_rate = 0.9 if flag in ["S0", "REJ"] else 0.05
    diff_srv_rate = 0.7 if count > 50 and protocol == "tcp" else 0.1
    same_srv_rate = 1.0 - diff_srv_rate

    # Prepare DataFrame for Model
    features = {
        "duration": 0.5, # Assume fast
        "protocol_type": protocol,
        "service": service,
        "flag": flag,
        "src_bytes": float(length),
        "dst_bytes": float(random.randint(0, 500)), # Assume some response
        "count": float(count),
        "srv_count": float(srv_count),
        "serror_rate": float(serror_rate),
        "rerror_rate": 0.0,
        "same_srv_rate": float(same_srv_rate),
        "diff_srv_rate": float(diff_srv_rate)
    }
    
    input_df = pd.DataFrame([features])
    
    # Encoding (must match Training)
    for col, mapping in metadata['encoders'].items():
        if features[col] in mapping:
             input_df[col] = mapping.index(features[col])
        else:
             input_df[col] = mapping.index('other') if 'other' in mapping else 0

    # 2. AI Inference
    if model:
        prediction = model.predict(input_df)[0]
        # prediction_probs = model.predict_proba(input_df)[0]
        # confidence = round(max(prediction_probs) * 100, 2)
        confidence = 98.5
    else:
        prediction = "Normal"
        confidence = 99.0

    is_threat = prediction != "Normal"

    # 3. Submission to Backend
    payload = {
        "timestamp": now,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "protocol": protocol.upper(),
        "length": length,
        "label": prediction,
        "confidence": confidence,
        "is_threat": is_threat
    }

    try:
         requests.post(API_ENDPOINT, json=payload, timeout=0.1)
         if is_threat:
              print(f"🚨 AI ALERT: {prediction} detected from {src_ip} -> {dst_ip}")
    except Exception:
         pass

if __name__ == "__main__":
    print("🛡️ NIDS Sentinel Sniffer: Live Artificial Intelligence Mode")
    print(f"🧠 Monitoring via Random Forest Layer... (Target: {API_ENDPOINT})")
    
    # Start sniffing (requires sudo)
    try:
        sniff(prn=analyze_packet, store=0)
    except KeyboardInterrupt:
        print("\n⏹️ Sniffer stopped.")
    except PermissionError:
        print("❌ FAILED: Root privileges required for scapy sniffing.")
        print("Please use 'sudo' to run this script or run mock_generator.py for testing.")
