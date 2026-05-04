import time
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.otp import store_otp, verify_otp, get_otp_email
from app.core.email import send_otp_email
from app.models.models import User
from app.db.session import get_db

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Rate limit for reset attempts: { username: [timestamp, ...] }
_reset_rate: dict[str, list[float]] = {}
RESET_RATE_LIMIT = 5  # max attempts per window
RESET_RATE_WINDOW = 600  # 10 minutes

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
@limiter.limit("20/minute")
def login_access_token(
    request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """OAuth2 compatible token login, get an access token for future requests"""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/signup")
@limiter.limit("10/minute")
def create_user_signup(
    request: Request,
    username: str = Body(...),
    password: str = Body(...),
    email: str = Body(...),
    security_question: str = Body(...),
    security_answer: str = Body(...),
    db: Session = Depends(get_db)
) -> Any:
    """Create new user with email (required for password recovery)."""
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
@limiter.limit("15/minute")
def get_user_question(
    request: Request,
    username: str = Body(..., embed=True),
    db: Session = Depends(get_db)
) -> Any:
    """Step 1: Return the security question for a given username."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this username.")

    if not user.security_question:
        raise HTTPException(status_code=400, detail="No security question set for this account.")

    return {"question": user.security_question}


@router.post("/forgot/reset")
@limiter.limit("10/minute")
def reset_with_security_answer(
    request: Request,
    username: str = Body(...),
    security_answer: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(get_db)
) -> Any:
    """Step 2: Verify security answer and reset password."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this username.")

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

    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")

    user.hashed_password = security.get_password_hash(new_password)
    db.commit()
    return {"msg": "Password reset successfully. Please login with your new password."}
