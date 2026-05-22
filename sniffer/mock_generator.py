"""Mock traffic generator for NIDS sniffer (Docker-friendly).

Generates realistic threat patterns: 10 threats every 10 minutes + normal traffic every 15s.
Uses canonical threat types matching backend threat_configs.py.
"""

import requests
import time
import random
import os
import sys

API_ENDPOINT = os.getenv("API_ENDPOINT", "http://nids-backend:8001/api/v1/traffic/log")

# Canonical threat types (match backend/app/services/threat_configs.py)
THREAT_TYPES = ["DoS", "DDoS", "Probe", "U2R", "R2L"]
THREAT_WEIGHTS = [0.40, 0.25, 0.20, 0.075, 0.075]
PROTOCOLS = ["TCP", "UDP", "ICMP", "HTTP"]
PUBLIC_IP_BLOCKS = [
    "185.10", "13.210", "114.119", "45.22", "172.67",
    "103.22", "142.250", "20.198", "198.51.100", "203.0.113"
]


def pick_weighted(items, weights):
    r = random.random()
    cum = 0
    for item, w in zip(items, weights):
        cum += w
        if r <= cum:
            return item
    return items[-1]


def make_packet(is_threat: bool) -> dict:
    src_ip = f"{random.choice(PUBLIC_IP_BLOCKS)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
    dst_ip = f"10.0.0.{random.randint(1, 255)}"
    label = pick_weighted(THREAT_TYPES, THREAT_WEIGHTS) if is_threat else "Normal"
    return {
        "timestamp": time.time(),
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "protocol": random.choice(PROTOCOLS),
        "length": random.randint(40, 65535),
        "label": label,
        "confidence": round(random.uniform(92.0, 99.8) if is_threat else 99.9, 2),
        "is_threat": is_threat,
    }


def send(payload: dict) -> bool:
    try:
        r = requests.post(API_ENDPOINT, json=payload, timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def start_mock():
    print(f"[MOCK SNIFFER] API target: {API_ENDPOINT}", flush=True)
    print("[MOCK SNIFFER] Pattern: 1 normal/15s + 10 threats/10min burst", flush=True)
    print("[MOCK SNIFFER] Press Ctrl+C to stop.\n", flush=True)

    last_normal = 0
    last_burst = 0
    NORMAL_INTERVAL = 15      # seconds
    BURST_INTERVAL = 600      # 10 min
    BURST_SIZE = 10
    BURST_SPACING = 3         # spread burst over 30s

    # Send initial burst after 10 seconds to populate dashboard fast
    initial_burst_done = False

    try:
        while True:
            now = time.time()

            # NORMAL traffic — every 15s
            if now - last_normal >= NORMAL_INTERVAL:
                if send(make_packet(False)):
                    print(f"[{time.strftime('%H:%M:%S')}] NORMAL packet sent", flush=True)
                last_normal = now

            # THREAT BURST — initial 10s, then every 10 min
            should_burst = (
                (not initial_burst_done and now - last_burst >= 10)
                or (initial_burst_done and now - last_burst >= BURST_INTERVAL)
            )
            if should_burst:
                print(f"\n[{time.strftime('%H:%M:%S')}] >>> Threat burst: {BURST_SIZE} threats over {BURST_SIZE * BURST_SPACING}s <<<", flush=True)
                for i in range(BURST_SIZE):
                    pkt = make_packet(True)
                    if send(pkt):
                        print(f"  [{i+1}/{BURST_SIZE}] {pkt['label']:6} from {pkt['src_ip']}", flush=True)
                    time.sleep(BURST_SPACING)
                print(f"[{time.strftime('%H:%M:%S')}] <<< Burst complete >>>\n", flush=True)
                last_burst = now
                initial_burst_done = True

            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[MOCK SNIFFER] Stopped.", flush=True)


if __name__ == "__main__":
    start_mock()
