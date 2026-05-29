"""
Auto-correct predictions for testing continuous learning workflow.

This script:
1. Fetches uncorrected predictions
2. Auto-marks them as correct (uses model's high confidence as proxy)
3. Submits corrections via API
4. Populates correction stats and triggers retraining
"""

import requests
import json
from typing import Optional
import time
import sys
import io

# Fix encoding on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_BASE = "http://localhost:8002/api/v1"
AUTH_BASE = "http://localhost:8002"

THREAT_CLASSES = ["DoS", "Malware", "Normal", "Probe", "R2L", "U2R"]

def get_auth_token() -> Optional[str]:
    """Get JWT token via login."""
    try:
        login_url = f"{AUTH_BASE}/api/v1/login/access-token"

        # Try with default test credentials
        data = {
            "username": "admin",
            "password": "admin"
        }

        response = requests.post(login_url, data=data, timeout=10)
        if response.ok:
            token = response.json().get("access_token")
            if token:
                print(f"[AUTH] Got token: {token[:30]}...")
                return token
        else:
            print(f"[AUTH] Login failed: {response.status_code}")
            print(f"[AUTH] Response: {response.text}")
            return None
    except Exception as e:
        print(f"[AUTH] Error getting token: {e}")
        return None

def get_predictions_awaiting_review(token: str, limit: int = 100) -> list:
    """Fetch uncorrected predictions."""
    url = f"{API_BASE}/retrain/predictions/awaiting-review?limit={limit}"

    headers = {}
    if DEMO_USER_TOKEN:
        headers["Authorization"] = f"Bearer {DEMO_USER_TOKEN}"

    try:
        headers["Authorization"] = f"Bearer {token}"
        response = requests.get(url, headers=headers, timeout=10)
        if response.ok:
            data = response.json()
            return data.get("predictions", [])
        else:
            print(f"Failed to fetch predictions: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error fetching predictions: {e}")
        return []

def submit_correction(
    token: str,
    prediction_id: str,
    actual_label: str,
    is_correct: bool,
    notes: str = ""
) -> bool:
    """Submit a correction for a prediction."""
    url = f"{API_BASE}/retrain/correct/{prediction_id}"

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

    payload = {
        "actual_label": actual_label,
        "is_correct": is_correct,
        "notes": notes or f"Auto-corrected (confidence-based)"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.ok:
            return True
        else:
            print(f"Failed to submit correction: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Error submitting correction: {e}")
        return False

def auto_correct_batch(token: str, batch_size: int = 50, confidence_threshold: float = 0.90):
    """
    Auto-correct predictions in batches.

    Strategy:
    - If model confidence > threshold: mark as CORRECT (use model's prediction as ground truth)
    - Otherwise: mark as INCORRECT and suggest the predicted label (for retraining)
    """

    print(f"\n[AUTO] Starting auto-correction (batch size: {batch_size}, threshold: {confidence_threshold})")

    corrections_made = 0

    while True:
        predictions = get_predictions_awaiting_review(token, limit=batch_size)

        if not predictions:
            print(f"[AUTO] No more predictions to correct!")
            break

        print(f"\n[BATCH] Processing {len(predictions)} predictions...")

        for pred in predictions:
            pred_id = pred["id"]
            model_predicted = pred["model_predicted"]
            confidence = pred["model_confidence"]
            timestamp = pred["timestamp"]

            # Decision logic:
            # If high confidence, mark as correct
            # Otherwise, mark as incorrect (stimulate retraining)
            is_correct = confidence >= confidence_threshold

            # For ground truth, use the model's prediction (since we don't have actual labels)
            actual_label = model_predicted

            notes = f"Auto-corrected | Confidence: {confidence:.1f}% | {'HIGH_CONFIDENCE' if is_correct else 'LOW_CONFIDENCE'}"

            if submit_correction(token, pred_id, actual_label, is_correct, notes):
                corrections_made += 1
                status = "[CORRECT]" if is_correct else "[INCORRECT]"
                print(f"  {status} | {model_predicted} ({confidence:.1f}%) | {timestamp}")
            else:
                print(f"  [FAILED] | {model_predicted}")

            # Small delay to avoid overwhelming API
            time.sleep(0.1)

        print(f"[BATCH] Batch complete! Corrections made this batch: {len(predictions)}")

    print(f"\n[DONE] Auto-correction complete! Total corrections: {corrections_made}")
    return corrections_made

if __name__ == "__main__":
    print("=" * 60)
    print("NIDS Continuous Learning - Auto Correction Script")
    print("=" * 60)
    print(f"API Base: {API_BASE}")

    try:
        # Get authentication token
        print("\n[SETUP] Getting authentication token...")
        token = get_auth_token()

        if not token:
            print("[ERROR] Failed to get authentication token!")
            sys.exit(1)

        # Auto-correct 100 predictions to populate the stats
        auto_correct_batch(token, batch_size=100, confidence_threshold=0.85)

        print("\n" + "=" * 60)
        print("[SUCCESS] Corrections submitted! Check the ML Analytics page.")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n\n[INTERRUPT] Stopped by user")
    except Exception as e:
        print(f"\n\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
