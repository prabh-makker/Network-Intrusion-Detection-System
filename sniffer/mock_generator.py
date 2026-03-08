import requests
import time
import random

API_ENDPOINT = "http://localhost:8000/api/v1/traffic/log"

def start_mock():
    print(f"📡 Generating mock traffic and sending to {API_ENDPOINT}...\nPress Ctrl+C to stop.")
    
    protocols = ["TCP", "UDP", "ICMP", "HTTP"]
    threat_labels = ["DDoS (Syn Flood)", "Port Scan (Nmap)", "SQL Injection", "XSS Attempt", "Brute Force SSH"]

    try:
        while True:
            # Simulate a continuous stream of normal traffic mixed with occasional threats
            time.sleep(random.uniform(0.1, 1.5))
            
            src_ip = f"192.168.1.{random.randint(1, 20)}"
            dst_ip = f"10.0.0.{random.randint(1, 255)}"
            
            is_threat = random.random() < 0.2  # 20% chance of being a threat
            
            payload = {
                "timestamp": time.time(),
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "protocol": random.choice(protocols),
                "length": random.randint(40, 1500),
                "label": random.choice(threat_labels) if is_threat else "Normal",
                "confidence": round(random.uniform(0.7, 0.99), 2) if is_threat else 0.99,
                "is_threat": is_threat
            }
            
            try:
                # Post data
                requests.post(API_ENDPOINT, json=payload, timeout=1)
                if is_threat:
                    print(f"🚨 Sent THREAT: {payload['label']} - {src_ip} -> {dst_ip}")
            except Exception as e:
                # print("Failed to send, is backend running?")
                pass
                
    except KeyboardInterrupt:
        print("\n⏹️ Stopped mock traffic generation.")

if __name__ == "__main__":
    start_mock()
