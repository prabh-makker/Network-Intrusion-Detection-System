import time
import random
import requests
from datetime import datetime, timezone
import json

# Import threat config to maintain consistency
try:
    from app.services.threat_configs import THREAT_TYPES, PROTOCOLS
    USE_THREAT_CONFIG = True
except ImportError:
    # Fallback if running standalone
    USE_THREAT_CONFIG = False
    THREAT_TYPES = {
        "Normal": {"probability": 0.80},
        "DoS": {"probability": 0.10},
        "DDoS": {"probability": 0.05},
        "Probe": {"probability": 0.03},
        "U2R": {"probability": 0.01},
        "R2L": {"probability": 0.01},
    }
    PROTOCOLS = {
        "TCP": 0,
        "UDP": 1,
        "ICMP": 2,
        "other": 3,
    }

def seed_mock_data():
    protocols = list(PROTOCOLS.keys())
    threat_types = list(THREAT_TYPES.keys())
    threat_weights = [THREAT_TYPES[t]["probability"] for t in threat_types]

    print("Starting mock data seeder via API (using threat config)... Press Ctrl+C to stop.", flush=True)

    # Use port 8000 (matches docker-compose backend port)
    API_URL = "http://localhost:8000/api/v1/traffic/log"

    try:
        while True:
            # Generate mock data
            src_ip = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            dst_ip = f"192.168.1.{random.randint(1, 255)}"
            protocol = random.choice(protocols)

            # Use weighted distribution from threat_configs
            label = random.choices(threat_types, weights=threat_weights)[0]

            # Adjust confidence based on threat type
            if label == 'Normal':
                confidence = random.uniform(80.0, 99.0)
            else:
                confidence = random.uniform(85.0, 99.0)  # Higher confidence for detected threats

            is_threat = label != 'Normal'

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
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Logged: {label:6s} from {src_ip} to {dst_ip} ({protocol:5s}) confidence={confidence:.1f}%", flush=True)
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Failed to log. Status: {response.status_code}", flush=True)
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] API connection error: {str(e)[:50]}. Is backend running on port 8000?", flush=True)

            # Sleep for a random interval between 0.5 and 2 seconds for a lively dashboard
            time.sleep(random.uniform(0.5, 2.0))
            
    except KeyboardInterrupt:
        print("\nStopping mock data seeder.", flush=True)

if __name__ == "__main__":
    seed_mock_data()
