from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.models import User
from app.db.session import get_db

router = APIRouter()

@router.post("/login/access-token")
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """OAuth2 compatible token login, get an access token for future requests"""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
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
def create_user_signup(
    username: str = Body(...),
    password: str = Body(...),
    db: Session = Depends(get_db)
) -> Any:
    """Create new user without needing superuser privileges"""
    user = db.query(User).filter(User.username == username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = User(
        username=username,
        hashed_password=security.get_password_hash(password),
        is_superuser=False, # Set to False by default on public signup
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"msg": "User created successfully. Please login."}
