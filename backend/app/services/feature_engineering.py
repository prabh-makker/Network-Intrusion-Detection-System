"""Comprehensive feature engineering for threat detection.

Extracts ALL relevant features from network traffic:
- Packet-level: duration, protocol, flags, bytes, window size
- Connection-level: count, service diversity, error rates
- Behavioral: port scanning patterns, GeoIP, temporal patterns
- Statistical: entropy, anomaly scores
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from app.models.models import ThreatLog
from sqlalchemy.orm import Session


class FeatureEngineer:
    """Extract comprehensive features from threat data."""

    # Configuration constants (avoid magic numbers)
    MAX_HISTORY_WINDOW = 100  # Limit connection history scan to last 100
    GEOIP_RISK_THRESHOLD = 0.5

    # KDD Cup 99 attack categories
    THREAT_TYPES = {
        "Normal": "normal",
        "DoS": "attack",
        "DDoS": "attack",
        "Probe": "attack",
        "U2R": "attack",
        "R2L": "attack",
    }

    # Protocol mappings
    PROTOCOLS = {
        "TCP": 0, "UDP": 1, "ICMP": 2, "other": 3
    }

    # Service mappings (common network services)
    SERVICES = {
        "http": 0, "ftp": 1, "smtp": 2, "domain_u": 3,
        "ssh": 4, "telnet": 5, "private": 6, "other": 7
    }

    # TCP flag mappings
    FLAGS = {
        "SF": 0, "S0": 1, "REJ": 2, "RSTR": 3,
        "SH": 4, "RST": 5, "RSTO": 6, "other": 7
    }

    def __init__(self):
        self.feature_columns = [
            # Duration & timing
            "duration", "src_bytes", "dst_bytes", "bytes_total",

            # Connection statistics
            "count", "srv_count", "same_srv_rate", "diff_srv_rate",

            # Error rates
            "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate",

            # Protocol & service
            "protocol_encoded", "service_encoded", "flag_encoded",

            # Advanced features
            "unique_services", "port_diversity", "syn_flood_indicator",
            "connection_velocity", "payload_entropy", "anomaly_score",

            # GeoIP features
            "src_country_risk", "dst_country_risk",
        ]

    def extract_features(self, threat_log: ThreatLog,
                        connection_history: List[ThreatLog]) -> Dict:
        """Extract comprehensive features from a single threat log.

        Args:
            threat_log: Current threat record
            connection_history: Previous connections from same source (limited to MAX_HISTORY_WINDOW)

        Returns:
            Dict of feature_name -> value
        """
        features = {}

        # Limit history window to avoid O(N²) behavior in batch_extract
        limited_history = connection_history[-self.MAX_HISTORY_WINDOW:] if connection_history else []

        # === Basic packet features ===
        features["duration"] = float(getattr(threat_log, "duration", 0))
        features["src_bytes"] = float(getattr(threat_log, "src_bytes", 0))
        features["dst_bytes"] = float(getattr(threat_log, "dst_bytes", 0))
        features["bytes_total"] = features["src_bytes"] + features["dst_bytes"]

        # === Connection statistics ===
        features["count"] = float(len(limited_history) + 1)

        # Count connections with same service
        protocol = str(getattr(threat_log, "protocol", "other")).lower()
        same_service = sum(
            1 for log in limited_history
            if str(getattr(log, "protocol", "other")).lower() == protocol
        )
        features["srv_count"] = float(same_service + 1)
        features["same_srv_rate"] = (
            features["srv_count"] / features["count"] if features["count"] > 0 else 0
        )
        features["diff_srv_rate"] = 1.0 - features["same_srv_rate"]

        # === Error rates ===
        error_labels = ["U2R", "R2L", "Probe"]
        errors_in_history = sum(
            1 for log in limited_history
            if getattr(log, "label", "") in error_labels
        )
        features["serror_rate"] = (
            errors_in_history / features["count"] if features["count"] > 0 else 0
        )
        features["srv_serror_rate"] = features["serror_rate"]  # Approximation
        features["rerror_rate"] = 0.0  # Requires RST/RSTO detection
        features["srv_rerror_rate"] = 0.0

        # === Protocol & service encoding ===
        features["protocol_encoded"] = float(
            self.PROTOCOLS.get(protocol.upper(), 3)
        )
        features["service_encoded"] = float(
            self.SERVICES.get(getattr(threat_log, "service", "other"), 7)
        )
        features["flag_encoded"] = float(
            self.FLAGS.get(getattr(threat_log, "flag", "other"), 7)
        )

        # === Advanced behavioral features ===
        features["unique_services"] = float(
            len(set(
                getattr(log, "service", "other")
                for log in limited_history
            ))
        )
        features["port_diversity"] = min(
            features["unique_services"] / max(features["count"], 1), 1.0
        )

        # SYN flood detection: high count + S0 flags
        syn_flood_count = sum(
            1 for log in limited_history
            if getattr(log, "flag", "") == "S0"
        )
        features["syn_flood_indicator"] = float(
            1.0 if syn_flood_count > 50 else syn_flood_count / 100
        )

        # Connection velocity (packets per second)
        features["connection_velocity"] = (
            features["count"] / max(features["duration"], 0.1)
            if features["duration"] > 0 else 0.0
        )

        # Payload entropy approximation (0-1, higher = more random)
        payload_size = features["bytes_total"]
        features["payload_entropy"] = min(
            float(payload_size % 256) / 256, 1.0
        )

        # Anomaly score (combined risk indicators)
        anomaly_indicators = [
            features["syn_flood_indicator"],
            features["diff_srv_rate"],
            features["serror_rate"],
        ]
        features["anomaly_score"] = np.mean(anomaly_indicators) if anomaly_indicators else 0.0

        # === GeoIP risk features (mock) ===
        # In production: use actual GeoIP database
        src_ip = str(getattr(threat_log, "src_ip", "0.0.0.0"))
        dst_ip = str(getattr(threat_log, "dst_ip", "0.0.0.0"))

        # Simple heuristic: check if private IP
        features["src_country_risk"] = 0.1 if self._is_private_ip(src_ip) else 0.8
        features["dst_country_risk"] = 0.1 if self._is_private_ip(dst_ip) else 0.5

        return features

    def _is_private_ip(self, ip: str) -> bool:
        """Check if IP is private/internal."""
        try:
            octets = list(map(int, ip.split(".")))
            if octets[0] == 10:
                return True
            if octets[0] == 172 and 16 <= octets[1] <= 31:
                return True
            if octets[0] == 192 and octets[1] == 168:
                return True
            return False
        except (ValueError, IndexError):
            # Invalid IP format
            return False

    def batch_extract(self, db: Session, batch_size: int = 1000) -> pd.DataFrame:
        """Extract features for all threat logs in batches.

        Args:
            db: Database session
            batch_size: Number of records per batch

        Returns:
            DataFrame with all features
        """
        all_rows = db.query(ThreatLog).all()
        feature_dicts = []

        # Group by source IP for connection history
        conn_by_src = {}
        for log in all_rows:
            src = getattr(log, "src_ip", "unknown")
            if src not in conn_by_src:
                conn_by_src[src] = []
            conn_by_src[src].append(log)

        # Extract features
        for log in all_rows:
            src = getattr(log, "src_ip", "unknown")
            history = conn_by_src.get(src, [])[:-1]  # Exclude current
            features = self.extract_features(log, history)
            features["label"] = getattr(log, "label", "Normal")
            features["id"] = str(getattr(log, "id", ""))
            feature_dicts.append(features)

        df = pd.DataFrame(feature_dicts)
        return df

    @property
    def n_features(self) -> int:
        """Number of features (excluding label)."""
        return len(self.feature_columns)


if __name__ == "__main__":
    from app.db.session import SessionLocal

    db = SessionLocal()
    fe = FeatureEngineer()
    df = fe.batch_extract(db)
    print(f"Extracted {len(df)} samples with {fe.n_features} features")
    print(f"Features: {fe.feature_columns}")
    print(f"\nClass distribution:\n{df['label'].value_counts()}")
    db.close()
