from scapy.all import sniff, IP, TCP, UDP, ICMP
import requests
import time
import random

API_ENDPOINT = "http://localhost:8000/api/v1/traffic/log"

def analyze_packet(packet):
    # Extract packet info
    if IP in packet:
        src_ip = packet[IP].src
        dst_ip = packet[IP].dst
        length = len(packet)
        protocol = "Other"

        # Check Protocol
        if TCP in packet:
            protocol = "TCP"
        elif UDP in packet:
            protocol = "UDP"
        elif ICMP in packet:
            protocol = "ICMP"

        # Primitive Heuristics (Pre-ML)
        # In the future, this part will be replaced by our Machine Learning Model inference
        label = "Normal"
        confidence = 0.99
        is_threat = False

        if protocol == "ICMP" and length > 1000:
            label = "Ping of Death (DDoS)"
            confidence = round(random.uniform(0.85, 0.99), 2)
            is_threat = True
        elif protocol == "TCP" and length < 60:  # Very suspicious small TCP commonly used for scanning
            # Let's randomly mark some small TCP as Port Scans to simulate attacks for the UI
            if random.random() < 0.1:
                label = "Port Scan"
                confidence = round(random.uniform(0.70, 0.95), 2)
                is_threat = True
        elif random.random() < 0.05: # Random noise anomalies
             label = "Protocol Anomaly"
             confidence = round(random.uniform(0.60, 0.90), 2)
             is_threat = True

        data = {
            "timestamp": time.time(),
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "protocol": protocol,
            "length": length,
            "label": label,
            "confidence": confidence,
            "is_threat": is_threat
        }

        try:
             # Make a quick non-blocking request
             # Note: in a production setting you'd batch these or use asyncio to prevent blocking the sniffer
             requests.post(API_ENDPOINT, json=data, timeout=0.1)
             if is_threat:
                  print(f"🚨 Threat detected: {label} from {src_ip} -> {dst_ip}")
        except Exception as e:
             # Fast fail if backend is down
             pass

if __name__ == "__main__":
    print("🛡️ Starting Network Sniffer & ML Heuristics Engine...")
    print(f"📡 Forwarding data to: {API_ENDPOINT}")
    # Start sniffing
    # Adjust `count` or filter if it generates too much traffic
    sniff(prn=analyze_packet, store=0)
