import random
import string
from datetime import datetime, timedelta
from typing import Optional

# In-memory OTP storage: { username: { "code": "123456", "created_at": datetime, "email": "user@example.com" } }
_otp_store: dict[str, dict] = {}

OTP_EXPIRY_MINUTES = 5
OTP_LENGTH = 6


def generate_otp() -> str:
    """Generate a random 6-digit OTP."""
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def store_otp(username: str, email: str) -> str:
    """
    Generate and store an OTP for a user.
    Returns the OTP code.
    """
    otp_code = generate_otp()
    _otp_store[username] = {
        "code": otp_code,
        "email": email,
        "created_at": datetime.utcnow(),
    }
    return otp_code


def verify_otp(username: str, otp_code: str) -> bool:
    """
    Verify an OTP code for a user.
    Returns True if valid and not expired, False otherwise.
    """
    if username not in _otp_store:
        return False

    otp_data = _otp_store[username]
    stored_code = otp_data["code"]
    created_at = otp_data["created_at"]

    # Check if expired
    if datetime.utcnow() - created_at > timedelta(minutes=OTP_EXPIRY_MINUTES):
        _otp_store.pop(username, None)
        return False

    # Check if code matches
    if stored_code != otp_code:
        return False

    # Valid! Delete the OTP so it can't be reused
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
