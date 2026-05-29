import time
import logging
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.otp import store_otp, verify_otp, get_otp_email
from app.core.email import send_otp_email
from app.models.models import User
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

# Rate limits — all in-memory (per-process). Sufficient for single-worker deployments.
_reset_rate: dict[str, list[float]] = {}
RESET_RATE_LIMIT = 5
RESET_RATE_WINDOW = 600  # 10 minutes

_login_rate: dict[str, list[float]] = {}
LOGIN_RATE_LIMIT = 10
LOGIN_RATE_WINDOW = 300  # 5 minutes

_signup_rate: dict[str, list[float]] = {}
SIGNUP_RATE_LIMIT = 5
SIGNUP_RATE_WINDOW = 3600  # 1 hour

_question_rate: dict[str, list[float]] = {}
QUESTION_RATE_LIMIT = 15
QUESTION_RATE_WINDOW = 600  # 10 minutes

SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is your favourite movie?",
]


@router.get("/security-questions")
def get_security_questions() -> Any:
    """Return the list of available security questions."""
    return {"questions": SECURITY_QUESTIONS}


@router.post("/login/access-token")
def login_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """OAuth2 compatible token login, get an access token for future requests"""
    from sqlalchemy import text

    # Rate limiting by IP
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = _login_rate.get(ip, [])
    attempts = [t for t in attempts if now - t < LOGIN_RATE_WINDOW]
    if len(attempts) >= LOGIN_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Try again in {LOGIN_RATE_WINDOW // 60} minutes.",
        )

    # Use raw SQL to bypass ORM UUID conversion issues with SQLite
    logger.warning(f"[LOGIN] Attempting login for: {form_data.username}")
    try:
        result = db.execute(text("SELECT id, username, hashed_password, is_active FROM users WHERE username = :username"),
                           {"username": form_data.username})
        row = result.fetchone()
        logger.warning(f"[LOGIN] Query result: {row is not None}")
    except Exception as e:
        logger.error(f"[LOGIN] Query error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not row:
        logger.warning(f"[LOGIN] User not found")
        attempts.append(now)
        _login_rate[ip] = attempts
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    user_id, username, hashed_password, is_active = row

    if not security.verify_password(form_data.password, hashed_password):
        attempts.append(now)
        _login_rate[ip] = attempts
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not is_active:
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    _login_rate.pop(ip, None)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user_id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/signup")
def create_user_signup(
    request: Request,
    username: str = Body(...),
    password: str = Body(...),
    email: str = Body(...),
    security_question: str = Body(...),
    security_answer: str = Body(...),
    db: Session = Depends(get_db),
) -> Any:
    """Create new user with email (required for password recovery)."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    s_attempts = _signup_rate.get(ip, [])
    s_attempts = [t for t in s_attempts if now - t < SIGNUP_RATE_WINDOW]
    if len(s_attempts) >= SIGNUP_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many signup attempts. Try again later.")
    s_attempts.append(now)
    _signup_rate[ip] = s_attempts

    if not password or len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not security_answer or not security_answer.strip():
        raise HTTPException(status_code=400, detail="Security answer is required.")
    if not security_question or not security_question.strip():
        raise HTTPException(status_code=400, detail="Security question is required.")

    # Email is now required
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="Email is required.")

    email = email.strip().lower()

    user = db.query(User).filter(User.username == username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )

    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="This email is already registered.")

    user = User(
        username=username,
        email=email,
        hashed_password=security.get_password_hash(password),
        security_question=security_question.strip(),
        security_answer_hash=security.get_password_hash(security_answer.strip().lower()),
        is_superuser=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"msg": "User created successfully. Please login."}


@router.post("/forgot/get-question")
def get_user_question(
    request: Request,
    username: str = Body(..., embed=True),
    db: Session = Depends(get_db),
) -> Any:
    """Step 1: Return the security question for a given username."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    q_attempts = _question_rate.get(ip, [])
    q_attempts = [t for t in q_attempts if now - t < QUESTION_RATE_WINDOW]
    if len(q_attempts) >= QUESTION_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Try again later.")
    q_attempts.append(now)
    _question_rate[ip] = q_attempts

    user = db.query(User).filter(User.username == username).first()
    if not user:
        # 400 not 404 — avoids confirming whether the username exists
        raise HTTPException(status_code=400, detail="No account found.")

    if not user.security_question:
        raise HTTPException(status_code=400, detail="No security question set for this account.")

    return {"question": user.security_question}


@router.post("/forgot/reset")
def reset_with_security_answer(
    username: str = Body(...),
    security_answer: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(get_db)
) -> Any:
    """Step 2: Verify security answer and reset password."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=400, detail="No account found.")

    # Rate limiting
    now = time.time()
    attempts = _reset_rate.get(username, [])
    attempts = [t for t in attempts if now - t < RESET_RATE_WINDOW]
    if len(attempts) >= RESET_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {int(RESET_RATE_WINDOW / 60)} minutes.",
        )

    if not user.security_answer_hash:
        raise HTTPException(status_code=400, detail="No security question set for this account.")

    # Verify answer (case-insensitive)
    if not security.verify_password(security_answer.strip().lower(), user.security_answer_hash):
        attempts.append(now)
        _reset_rate[username] = attempts
        remaining = RESET_RATE_LIMIT - len(attempts)
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect answer. {remaining} attempt(s) remaining.",
        )

    # Clear rate limit on success
    _reset_rate.pop(username, None)

    if not new_password or len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    user.hashed_password = security.get_password_hash(new_password)
    db.commit()
    return {"msg": "Password reset successfully. Please login with your new password."}
