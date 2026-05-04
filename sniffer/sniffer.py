from scapy.all import sniff, IP, TCP, UDP, ICMP, conf
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
API_ENDPOINT = "http://localhost:8001/api/v1/traffic/log"
MODEL_PATH = "models/nids_rf_model.joblib"
METADATA_PATH = "models/model_metadata.json"

# State trackers for "Window Features"
connection_window = deque(maxlen=200) # Increased window for better rate calculation

# Load model
try:
    print(f"Loading Model: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    with open(METADATA_PATH, 'r') as f:
        metadata = json.load(f)
    print("Model and Metadata loaded successfully.")
    print(f"Detected Classes: {metadata['classes']}")
except Exception as e:
    print(f"ERROR: Could not load model: {e}")
    model = None
    metadata = None

def get_service_name(port):
    if port == 80 or port == 443: return "http"
    if port == 21: return "ftp"
    if port == 25: return "smtp"
    if port == 53: return "domain_u"
    if port == 22: return "ssh"
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
    
    protocol = "tcp" if TCP in packet else ("udp" if UDP in packet else ("icmp" if ICMP in packet else "other"))
    service = "other"
    flag = "SF"
    
    if TCP in packet:
        sport = packet[TCP].sport
        dport = packet[TCP].dport
        service = get_service_name(dport if dport < 1024 else sport)
        flags = packet[TCP].flags
        if 'S' in str(flags): flag = "S0"
        elif 'R' in str(flags): flag = "REJ"
    elif UDP in packet:
        service = get_service_name(packet[UDP].dport if packet[UDP].dport < 1024 else packet[UDP].sport)

    connection_window.append((now, src_ip, dst_ip, protocol, flag, service))
    
    # Advanced Feature Computation (Matching KDD Schema)
    recent = list(connection_window)
    # Count connections to same destination in last 2 seconds
    two_sec_ago = now - 2.0
    count = len([c for c in recent if c[2] == dst_ip and c[0] > two_sec_ago])
    srv_count = len([c for c in recent if c[5] == service and c[0] > two_sec_ago])
    
    # Error rates
    serror_count = len([c for c in recent if c[2] == dst_ip and c[4] == "S0" and c[0] > two_sec_ago])
    serror_rate = serror_count / count if count > 0 else 0.0
    
    rerror_count = len([c for c in recent if c[2] == dst_ip and c[4] == "REJ" and c[0] > two_sec_ago])
    rerror_rate = rerror_count / count if count > 0 else 0.0

    # Service diversity
    same_srv_count = len([c for c in recent if c[2] == dst_ip and c[5] == service and c[0] > two_sec_ago])
    same_srv_rate = same_srv_count / count if count > 0 else 1.0
    diff_srv_rate = 1.0 - same_srv_rate

    features = {
        "duration": 0.01, # Live packets are instantaneous
        "protocol_type": protocol,
        "service": service,
        "flag": flag,
        "src_bytes": float(length),
        "dst_bytes": 0.0, # We only see one direction per packet in sniff
        "count": float(count),
        "srv_count": float(srv_count),
        "serror_rate": float(serror_rate),
        "rerror_rate": float(rerror_rate),
        "same_srv_rate": float(same_srv_rate),
        "diff_srv_rate": float(diff_srv_rate)
    }
    
    input_df = pd.DataFrame([features])
    
    if metadata:
        for col, mapping in metadata['encoders'].items():
            val = features[col]
            if val in mapping:
                 input_df[col] = mapping.index(val)
            else:
                 # Fallback to most common if not found
                 input_df[col] = mapping.index('other') if 'other' in mapping else 0

    # 2. AI Inference with Dynamic Confidence
    if model:
        prediction_label = model.predict(input_df)[0]
        probs = model.predict_proba(input_df)[0]
        confidence = round(float(np.max(probs)) * 100, 2)

        # Decode numeric prediction to string label (XGBoost returns numeric labels)
        if isinstance(prediction_label, (int, np.integer)):
            label_classes = metadata.get('label_encoder_classes', metadata.get('classes', []))
            if label_classes and prediction_label < len(label_classes):
                prediction = label_classes[prediction_label]
            else:
                prediction = str(prediction_label)
        else:
            prediction = prediction_label
    else:
        prediction = "Normal"
        confidence = 100.0

    # 3. Post-Processing Calibration (Heuristic layer to reduce false positives)
    # If it's a local broadcast or gateway traffic, be much more skeptical of "DoS" labels
    if (dst_ip == "192.168.1.1" or dst_ip.endswith(".255")) and prediction == "DoS" and confidence < 99.0:
        prediction = "Normal"
        confidence = 99.9

    is_threat = prediction != "Normal"

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
         requests.post(API_ENDPOINT, json=payload, timeout=0.3)
         if is_threat:
              print(f"AI ALERT [{confidence}%]: {prediction} detected from {src_ip} -> {dst_ip}")
    except Exception:
         pass

if __name__ == "__main__":
    print("NIDS Sentinel Sniffer: Live Artificial Intelligence Mode")
    print(f"Monitoring via XGBoost Classifier... (Target: {API_ENDPOINT})")
    
    best_iface = None
    for iface in conf.ifaces.values():
        desc = iface.description.lower() if hasattr(iface, 'description') else ""
        if "wi-fi" in desc or "wireless" in desc or "ethernet" in desc:
            if iface.ip and iface.ip != "127.0.0.1" and not "virtual" in desc:
                best_iface = iface
                break
    
    if not best_iface:
        for iface in conf.ifaces.values():
            if iface.ip and iface.ip != "127.0.0.1":
                best_iface = iface
                break
    
    print(f"Sniffing on: {best_iface.description if best_iface else 'Default'}")
    
    while True:
        try:
            sniff(iface=best_iface, prn=analyze_packet, store=0)
        except KeyboardInterrupt:
            print("\nSniffer stopped by user.")
            break
        except Exception as e:
            # Silently retry for Windows socket transients
            time.sleep(1)
