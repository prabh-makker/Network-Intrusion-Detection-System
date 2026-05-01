import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.db.session import SessionLocal
from app.models.models import User
from app.core.security import get_password_hash

def reset_admin():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "admin").first()
    if user:
        user.hashed_password = get_password_hash("admin123")
        db.commit()
        print("Admin password reset to 'admin123'.")
    else:
        user = User(
            username="admin",
            email="admin@nids.local",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            is_superuser=True
        )
        db.add(user)
        db.commit()
        print("Admin user created with password 'admin123'.")
    db.close()

if __name__ == "__main__":
    reset_admin()
