"""Generate realistic mock threat data for training.

Creates diverse threat scenarios using threat_configs for consistency
with feature_engineering module.
"""

import random
import numpy as np
from datetime import datetime, timedelta
from typing import Tuple, Dict, Callable
from sqlalchemy.orm import Session
from app.models.models import ThreatLog
from uuid import uuid4

from app.services.threat_configs import (
    THREAT_TYPES,
    PROTOCOLS,
    SERVICES,
    FLAGS,
    INTERNAL_IP_PROBABILITY,
    LOG_PREFIX_MOCK,
    LOG_PREFIX_DAILY,
)


class MockDataGenerator:
    """Generate realistic mock threat data."""

    # Import from threat_configs (single source of truth)
    THREAT_TYPES_WITH_PROBS = THREAT_TYPES
    PROTOCOLS = list(PROTOCOLS.keys())
    SERVICES = list(SERVICES.keys())
    FLAGS = list(FLAGS.keys())

    def __init__(self, seed=None):
        if seed:
            random.seed(seed)
            np.random.seed(seed)

        # Dispatch dict for threat type generation (replaces if/elif chain)
        self.threat_generators: Dict[str, Callable[[], dict]] = {
            "Normal": self.generate_normal_traffic,
            "DoS": self.generate_dos_attack,
            "DDoS": self.generate_ddos_attack,
            "Probe": self.generate_probe_attack,
            "U2R": self.generate_u2r_attack,
            "R2L": self.generate_r2l_attack,
        }

    def generate_ip(self, is_internal=False) -> str:
        """Generate realistic IP address."""
        if is_internal or random.random() < INTERNAL_IP_PROBABILITY:
            # Internal IPs (10.x.x.x)
            return f"10.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        else:
            # External IPs
            return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"

    def generate_normal_traffic(self) -> dict:
        """Generate normal, benign traffic."""
        return {
            "duration": random.gauss(50, 20),
            "src_bytes": random.gauss(500, 200),
            "dst_bytes": random.gauss(300, 150),
            "count": random.gauss(10, 3),
            "srv_count": random.gauss(8, 2),
            "serror_rate": random.gauss(0.01, 0.01),
            "srv_serror_rate": random.gauss(0.01, 0.01),
            "rerror_rate": 0.0,
            "same_srv_rate": random.gauss(0.9, 0.05),
            "diff_srv_rate": random.gauss(0.1, 0.05),
            "flag": random.choice(["SF"]),
            "confidence": random.gauss(0.1, 0.05),
        }

    def generate_dos_attack(self) -> dict:
        """Generate DoS attack traffic."""
        return {
            "duration": random.gauss(200, 50),  # Longer duration
            "src_bytes": random.gauss(1500, 500),  # More data
            "dst_bytes": random.gauss(50, 20),  # Minimal response
            "count": random.gauss(500, 100),  # Many connections
            "srv_count": random.gauss(450, 80),  # Same service
            "serror_rate": random.gauss(0.8, 0.1),  # High error rate
            "srv_serror_rate": random.gauss(0.8, 0.1),
            "rerror_rate": random.gauss(0.5, 0.1),
            "same_srv_rate": random.gauss(0.95, 0.02),
            "diff_srv_rate": random.gauss(0.05, 0.02),
            "flag": random.choice(["S0", "REJ"]),
            "confidence": random.gauss(0.95, 0.02),
        }

    def generate_ddos_attack(self) -> dict:
        """Generate DDoS attack traffic."""
        return {
            "duration": random.gauss(500, 100),  # Very long
            "src_bytes": random.gauss(5000, 1000),  # Massive data
            "dst_bytes": random.gauss(20, 10),  # Almost no response
            "count": random.gauss(2000, 300),  # Huge volume
            "srv_count": random.gauss(1800, 250),
            "serror_rate": random.gauss(0.9, 0.05),
            "srv_serror_rate": random.gauss(0.9, 0.05),
            "rerror_rate": random.gauss(0.8, 0.1),
            "same_srv_rate": random.gauss(0.99, 0.01),
            "diff_srv_rate": random.gauss(0.01, 0.005),
            "flag": random.choice(["S0", "RSTR"]),
            "confidence": random.gauss(0.98, 0.01),
        }

    def generate_probe_attack(self) -> dict:
        """Generate port scanning/probe attack."""
        return {
            "duration": random.gauss(100, 30),
            "src_bytes": random.gauss(200, 50),
            "dst_bytes": random.gauss(100, 30),
            "count": random.gauss(100, 20),
            "srv_count": random.gauss(20, 10),  # Many different services
            "serror_rate": random.gauss(0.6, 0.1),
            "srv_serror_rate": random.gauss(0.4, 0.1),
            "rerror_rate": random.gauss(0.3, 0.1),
            "same_srv_rate": random.gauss(0.3, 0.1),
            "diff_srv_rate": random.gauss(0.7, 0.1),  # High service diversity
            "flag": random.choice(["REJ", "S0"]),
            "confidence": random.gauss(0.92, 0.03),
        }

    def generate_u2r_attack(self) -> dict:
        """Generate user-to-root privilege escalation."""
        return {
            "duration": random.gauss(150, 40),
            "src_bytes": random.gauss(800, 200),
            "dst_bytes": random.gauss(600, 150),
            "count": random.gauss(50, 15),
            "srv_count": random.gauss(45, 12),
            "serror_rate": random.gauss(0.4, 0.1),
            "srv_serror_rate": random.gauss(0.35, 0.1),
            "rerror_rate": random.gauss(0.2, 0.1),
            "same_srv_rate": random.gauss(0.85, 0.05),
            "diff_srv_rate": random.gauss(0.15, 0.05),
            "flag": random.choice(["SH", "RSTO"]),
            "confidence": random.gauss(0.88, 0.05),
        }

    def generate_r2l_attack(self) -> dict:
        """Generate remote-to-local attack."""
        return {
            "duration": random.gauss(300, 60),
            "src_bytes": random.gauss(1200, 300),
            "dst_bytes": random.gauss(800, 200),
            "count": random.gauss(200, 50),
            "srv_count": random.gauss(180, 40),
            "serror_rate": random.gauss(0.5, 0.1),
            "srv_serror_rate": random.gauss(0.45, 0.1),
            "rerror_rate": random.gauss(0.3, 0.1),
            "same_srv_rate": random.gauss(0.9, 0.03),
            "diff_srv_rate": random.gauss(0.1, 0.03),
            "flag": random.choice(["SF", "RST"]),
            "confidence": random.gauss(0.90, 0.04),
        }

    def generate_threat(self) -> Tuple[dict, str]:
        """Generate single threat record based on distribution.

        Uses dispatch dict instead of if/elif chain for maintainability.

        Returns:
            Tuple of (feature_dict, threat_label)
        """
        threat_type = random.choices(
            list(self.THREAT_TYPES_WITH_PROBS.keys()),
            weights=[self.THREAT_TYPES_WITH_PROBS[t]["probability"] for t in self.THREAT_TYPES_WITH_PROBS.keys()]
        )[0]

        # Dispatch to appropriate generator (clean, extensible)
        generator = self.threat_generators[threat_type]
        features = generator()

        return features, threat_type

    def generate_dataset(self, db: Session, n_samples: int = 1000) -> int:
        """Generate and insert mock threat data.

        Args:
            db: Database session
            n_samples: Number of samples to generate

        Returns:
            Number of records inserted
        """
        print(f"{LOG_PREFIX_MOCK} Generating {n_samples} threat samples...")

        records = []
        base_time = datetime.utcnow() - timedelta(days=7)

        for i in range(n_samples):
            features, threat_label = self.generate_threat()

            # Create timestamp (spread over last 7 days)
            timestamp = base_time + timedelta(
                seconds=random.randint(0, 7 * 24 * 3600)
            )

            record = ThreatLog(
                id=uuid4(),
                timestamp=timestamp,
                src_ip=self.generate_ip(is_internal=random.random() < 0.5),
                dst_ip=self.generate_ip(is_internal=random.random() < 0.7),
                protocol=random.choice(self.PROTOCOLS),
                label=threat_label,
                confidence=max(0.1, min(1.0, features.get("confidence", 0.5))),
                is_blocked=(threat_label != "Normal"),
            )
            records.append(record)

            if (i + 1) % 100 == 0:
                print(f"  Generated {i + 1}/{n_samples}")

        # Bulk insert
        print(f"{LOG_PREFIX_MOCK} Inserting {len(records)} records into database...")
        db.bulk_save_objects(records)
        db.commit()

        print(f"{LOG_PREFIX_MOCK} ✓ Inserted {len(records)} mock threat samples")
        return len(records)


def generate_and_train_daily(db: Session, n_samples: int = 2000) -> bool:
    """Daily training cycle with mock data.

    1. Clear old mock data (older than 30 days)
    2. Generate new mock data
    3. Train model on all data
    4. Validate accuracy

    Args:
        db: Database session
        n_samples: Number of new samples to generate

    Returns:
        True if successful
    """
    try:
        print("\n" + "="*70)
        print(f"{LOG_PREFIX_DAILY} Automated Mock Data Training Cycle")
        print("="*70)

        # Clear old data
        print(f"\n{LOG_PREFIX_DAILY} Step 1: Cleanup old mock data (>30 days)")
        cutoff = datetime.utcnow() - timedelta(days=30)
        old_count = db.query(ThreatLog).filter(ThreatLog.timestamp < cutoff).count()
        if old_count > 0:
            db.query(ThreatLog).filter(ThreatLog.timestamp < cutoff).delete()
            db.commit()
            print(f"  Deleted {old_count} old records")
        else:
            print("  No old records to delete")

        # Generate mock data
        print(f"\n{LOG_PREFIX_DAILY} Step 2: Generate mock threat data")
        generator = MockDataGenerator(seed=None)  # Different seed each day
        generated = generator.generate_dataset(db, n_samples=n_samples)

        # Train model
        print(f"\n{LOG_PREFIX_DAILY} Step 3: Train model on updated data")
        from app.services.ml_service import train_and_save_model
        success = train_and_save_model()

        if success:
            print("\n" + "="*70)
            print(f"{LOG_PREFIX_DAILY} ✓ Daily training cycle complete")
            print("="*70 + "\n")
            return True
        else:
            return False

    except Exception as e:
        print(f"\n{LOG_PREFIX_DAILY} ✗ Daily cycle failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    from app.db.session import SessionLocal

    db = SessionLocal()
    generator = MockDataGenerator()

    # Generate 1000 samples
    count = generator.generate_dataset(db, n_samples=1000)
    print(f"\n✓ Generated {count} mock threat samples")

    db.close()
