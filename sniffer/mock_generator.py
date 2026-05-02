import requests
import time
import random

API_ENDPOINT = "http://localhost:8002/api/v1/traffic/log"

def start_mock():
    print(f"AI MOCK GENERATOR: Simulating Network Attacks for React Dashboard\nTargeting {API_ENDPOINT}...\nPress Ctrl+C to stop.")
    
    protocols = ["TCP", "UDP", "ICMP", "HTTP"]
    threat_classes = ["DDoS (Ping of Death)", "DoS", "Probe", "U2R (Root Access)"]

    try:
        while True:
            # Simulate a continuous stream of normal traffic mixed with occasional threats
            time.sleep(random.uniform(0.1, 1.5))
            
            # Use public IPs for realistic Geo-IP mapping in our React dashboard Heatmap
            public_ip_blocks = ["185.10", "13.210", "114.119", "45.22", "172.67", "103.22", "142.250", "20.198"]
            src_ip = f"{random.choice(public_ip_blocks)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            
            dst_ip = f"10.0.0.{random.randint(1, 255)}"
            
            is_threat = random.random() < 0.2  # 20% chance of being a threat
            label = random.choice(threat_classes) if is_threat else "Normal"
            
            payload = {
                "timestamp": time.time(),
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "protocol": random.choice(protocols),
                "length": random.randint(40, 65535),
                "label": label,
                "confidence": round(random.uniform(92.0, 99.8) if is_threat else 99.9, 2),
                "is_threat": is_threat
            }
            
            try:
                # Post data
                requests.post(API_ENDPOINT, json=payload, timeout=1)
                if is_threat:
                    print(f"Sent AI ALERT: {label} detected via Random Forest model!")
            except Exception as e:
                # print("Failed to send, is backend running?")
                pass
                
    except KeyboardInterrupt:
        print("\nStopped mock traffic generation.")

if __name__ == "__main__":
    start_mock()
