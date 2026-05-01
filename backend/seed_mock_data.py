import time
import random
import requests
from datetime import datetime, timezone
import json

def seed_mock_data():
    protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS']
    labels = ['Benign', 'DDoS', 'Port Scan', 'SQL Injection', 'Malware', 'Brute Force', 'U2R (Root Access)', 'DDoS (Ping of Death)']
    
    print("Starting mock data seeder via API... Press Ctrl+C to stop.", flush=True)
    
    API_URL = "http://localhost:8001/api/v1/traffic/log"
    
    try:
        while True:
            # Generate mock data
            src_ip = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            dst_ip = f"192.168.1.{random.randint(1, 255)}"
            protocol = random.choice(protocols)
            label = random.choice(labels)
            
            # If Benign, confidence is usually high, otherwise random
            if label == 'Benign':
                confidence = random.uniform(80.0, 99.0)
            else:
                confidence = random.uniform(60.0, 99.0)
                
            is_threat = label != 'Benign'
                
            packet_data = {
                "timestamp": time.time(),
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "protocol": protocol,
                "length": random.randint(40, 1500),
                "label": label,
                "confidence": confidence,
                "is_threat": is_threat
            }
            
            try:
                response = requests.post(API_URL, json=packet_data)
                if response.status_code == 200:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Broadcasted mock log: {label} from {src_ip} via {protocol}", flush=True)
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Failed to broadcast. Status: {response.status_code}", flush=True)
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] API connection error: {e}. Is backend running on port 8001?", flush=True)
            
            # Sleep for a random interval between 0.5 and 2 seconds for a lively dashboard
            time.sleep(random.uniform(0.5, 2.0))
            
    except KeyboardInterrupt:
        print("\nStopping mock data seeder.", flush=True)

if __name__ == "__main__":
    seed_mock_data()
