import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

# In-memory OTP storage: { username: { "code": "123456", "created_at": datetime, "email": "...", "attempts": 0 } }
_otp_store: dict[str, dict] = {}

OTP_EXPIRY_MINUTES = 5
OTP_LENGTH = 6
OTP_MAX_ATTEMPTS = 5


def generate_otp() -> str:
    """Generate a cryptographically secure random 6-digit OTP."""
    return "".join(secrets.choice(string.digits) for _ in range(OTP_LENGTH))


def store_otp(username: str, email: str) -> str:
    otp_code = generate_otp()
    _otp_store[username] = {
        "code": otp_code,
        "email": email,
        "created_at": datetime.utcnow(),
        "attempts": 0,
    }
    return otp_code


def verify_otp(username: str, otp_code: str) -> bool:
    if username not in _otp_store:
        return False

    otp_data = _otp_store[username]
    created_at = otp_data["created_at"]

    if datetime.utcnow() - created_at > timedelta(minutes=OTP_EXPIRY_MINUTES):
        _otp_store.pop(username, None)
        return False

    otp_data["attempts"] += 1
    if otp_data["attempts"] > OTP_MAX_ATTEMPTS:
        _otp_store.pop(username, None)
        return False

    if otp_data["code"] != otp_code:
        return False

    _otp_store.pop(username, None)
    return True


def get_otp_email(username: str) -> Optional[str]:
    """Get the email associated with an OTP request."""
    if username in _otp_store:
        return _otp_store[username]["email"]
    return None


def clear_otp(username: str) -> None:
    """Clear the OTP for a user."""
    _otp_store.pop(username, None)
