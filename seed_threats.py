#!/usr/bin/env python
"""Seed database with test threat data for screenshots"""

import sys
sys.path.insert(0, '/c/Users/khalo/EXAMPLE/backend')

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import ThreatLog
from datetime import datetime, timedelta
import random
import uuid

db = SessionLocal()

threats = [
    ("DoS", random.randint(92, 99)),
    ("Probe", random.randint(85, 96)),
    ("DoS", random.randint(94, 99)),
    ("U2R (Root Access)", random.randint(88, 99)),
    ("Normal", random.randint(75, 99)),
    ("Probe", random.randint(82, 97)),
    ("DDoS (Ping of Death)", random.randint(91, 99)),
    ("DoS", random.randint(95, 99)),
]

src_ips = [
    "192.168.1.100", "10.0.0.50", "172.16.0.25",
    "203.0.113.45", "198.51.100.78", "192.168.1.200"
]

dst_ips = [
    "192.168.1.1", "10.0.0.1", "172.16.0.1",
    "8.8.8.8", "1.1.1.1"
]

protocols = ["TCP", "UDP", "ICMP"]

now = datetime.utcnow()

for i in range(20):
    label, conf = random.choice(threats)
    threat = ThreatLog(
        id=uuid.uuid4(),
        timestamp=now - timedelta(minutes=random.randint(1, 60)),
        src_ip=random.choice(src_ips),
        dst_ip=random.choice(dst_ips),
        protocol=random.choice(protocols),
        label=label,
        confidence=conf,
        is_blocked=False
    )
    db.add(threat)
    print(f"Added: {label} ({conf}%) from {threat.src_ip}")

db.commit()
print(f"\n[OK] {20} threat logs inserted")
db.close()
