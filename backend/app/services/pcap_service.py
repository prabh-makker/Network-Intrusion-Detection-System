import os
import time
from typing import List, Dict
from scapy.all import rdpcap, IP, TCP, UDP, ICMP
import pandas as pd
import numpy as np
import joblib
import json
import uuid
from sqlalchemy.orm import Session
from app.models.models import ThreatLog
from app.core.config import settings

# Path relative to backend root
MODEL_PATH = os.path.join(os.getcwd(), "..", "sniffer", "models", "nids_rf_model.joblib")
METADATA_PATH = os.path.join(os.getcwd(), "..", "sniffer", "models", "model_metadata.json")

class PCAPAnalyzer:
    def __init__(self):
        self.model = None
        self.metadata = None
        self._load_model()
        
    def _load_model(self):
        try:
            if os.path.exists(MODEL_PATH):
                self.model = joblib.load(MODEL_PATH)
                with open(METADATA_PATH, 'r') as f:
                    self.metadata = json.load(f)
        except Exception as e:
            print(f"PCAP Service: Could not load model - {e}")

    def get_service_name(self, port):
        if port == 80 or port == 443: return "http"
        if port == 21: return "ftp"
        if port == 25: return "smtp"
        if port == 53: return "domain_u"
        if port > 1024: return "private"
        return "other"

    def analyze(self, file_path: str, db: Session) -> Dict:
        if not self.model or not self.metadata:
            return {"error": "AI Model not initialized on server"}

        try:
            packets = rdpcap(file_path)
        except Exception as e:
            return {"error": f"Invalid PCAP file: {e}"}

        summary = {
            "packets_processed": 0,
            "threats_detected": 0,
            "categories": {}
        }

        # Keep a small local window for feature extraction (similar to sniffer.py)
        window = []
        
        for pkt in packets:
            if IP not in pkt:
                continue

            summary["packets_processed"] += 1
            src_ip = pkt[IP].src
            dst_ip = pkt[IP].dst
            protocol = "tcp" if TCP in pkt else ("udp" if UDP in pkt else ("icmp" if ICMP in pkt else "other"))
            
            service = "other"
            flag = "SF"
            if TCP in pkt:
                service = self.get_service_name(pkt[TCP].dport)
                flags = pkt[TCP].flags
                if flags == "S": flag = "S0"
                elif flags == "RA" or flags == "R": flag = "REJ"
            elif UDP in pkt:
                service = self.get_service_name(pkt[UDP].dport)

            # Feature calculation (simplified)
            window.append(flag)
            if len(window) > 100: window.pop(0)
            
            srv_count = window.count(flag)
            serror_rate = 0.8 if flag in ["S0", "REJ"] else 0.05

            features = {
                "duration": 0.1,
                "protocol_type": protocol,
                "service": service,
                "flag": flag,
                "src_bytes": float(len(pkt)),
                "dst_bytes": 0.0,
                "count": 1.0,
                "srv_count": float(srv_count),
                "serror_rate": float(serror_rate),
                "rerror_rate": 0.0,
                "same_srv_rate": 1.0,
                "diff_srv_rate": 0.0
            }

            # Inference
            input_df = pd.DataFrame([features])
            for col, mapping in self.metadata['encoders'].items():
                if features[col] in mapping:
                    input_df[col] = mapping.index(features[col])
                else:
                    input_df[col] = mapping.index('other') if 'other' in mapping else 0
            
            prediction_label = self.model.predict(input_df)[0]

            # Decode numeric prediction to string label
            if isinstance(prediction_label, (int, np.integer)):
                label_classes = self.metadata.get('label_encoder_classes', self.metadata.get('classes', []))
                if label_classes and prediction_label < len(label_classes):
                    prediction = label_classes[prediction_label]
                else:
                    prediction = str(prediction_label)
            else:
                prediction = prediction_label

            if prediction != "Normal":
                summary["threats_detected"] += 1
                summary["categories"][prediction] = summary["categories"].get(prediction, 0) + 1
                
                # Save to database
                log_entry = ThreatLog(
                    src_ip=src_ip,
                    dst_ip=dst_ip,
                    protocol=protocol.upper(),
                    label=prediction,
                    confidence=95.0, # Static confidence for batch processing
                    is_blocked=False
                )
                db.add(log_entry)

        db.commit()
        return summary

pcap_analyzer = PCAPAnalyzer()
