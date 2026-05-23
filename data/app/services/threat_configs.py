"""Centralized threat and network configuration.

Single source of truth for threat types, protocols, services, flags.
Used by both feature_engineering and mock_data_generator to prevent duplication.
"""

from enum import Enum
from typing import Dict

# Threat type definitions (used by mock data + feature engineering)
THREAT_TYPES = {
    "Normal": {"label": "normal", "probability": 0.80, "category": "benign"},
    "DoS": {"label": "attack", "probability": 0.10, "category": "attack"},
    "DDoS": {"label": "attack", "probability": 0.05, "category": "attack"},
    "Probe": {"label": "attack", "probability": 0.03, "category": "attack"},
    "U2R": {"label": "attack", "probability": 0.01, "category": "attack"},
    "R2L": {"label": "attack", "probability": 0.01, "category": "attack"},
}

# Protocol mappings
PROTOCOLS = {
    "TCP": 0,
    "UDP": 1,
    "ICMP": 2,
    "other": 3,
}

# Service mappings (common network services)
SERVICES = {
    "http": 0,
    "ftp": 1,
    "smtp": 2,
    "domain_u": 3,
    "ssh": 4,
    "telnet": 5,
    "private": 6,
    "other": 7,
}

# TCP flag mappings
FLAGS = {
    "SF": 0,
    "S0": 1,
    "REJ": 2,
    "RSTR": 3,
    "SH": 4,
    "RST": 5,
    "RSTO": 6,
    "other": 7,
}

# Logging constants (avoid magic strings)
LOG_PREFIX_ML = "[ML]"
LOG_PREFIX_DAILY = "[Daily]"
LOG_PREFIX_MOCK = "[Mock]"

# Model storage paths
MODEL_STORAGE_DIR = "app/models"
MODEL_FILENAME = "threat_model.joblib"
METADATA_FILENAME = "model_metadata.json"
SCALER_FILENAME = "scaler.joblib"
LABEL_ENCODER_FILENAME = "label_encoder.joblib"

# Feature engineering constants
MAX_HISTORY_WINDOW = 100  # Limit connection history scans
GEOIP_RISK_THRESHOLD = 0.5

# IP address generation constants (for mock data)
INTERNAL_IP_PROBABILITY = 0.3  # 30% internal IPs
EXTERNAL_IP_PROBABILITY = 0.7  # 70% external IPs

# Training constants
TEST_SIZE = 0.15
RANDOM_STATE = 42
CROSS_VALIDATION_FOLDS = 5
