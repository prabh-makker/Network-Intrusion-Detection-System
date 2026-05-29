#!/usr/bin/env python3
"""Seed initial database users"""

import sqlite3
import uuid
from passlib.context import CryptContext

DATABASE_URL = "nids.db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

conn = sqlite3.connect(DATABASE_URL)
cursor = conn.cursor()

# Check if admin exists
cursor.execute("SELECT COUNT(*) FROM users WHERE username='admin'")
if cursor.fetchone()[0] == 0:
    admin_id = str(uuid.uuid4())
    hashed = pwd_context.hash("admin123")

    cursor.execute("""
      INSERT INTO users (id, username, email, hashed_password, is_active, is_superuser)
      VALUES (?, ?, ?, ?, ?, ?)
    """, (admin_id, "admin", "admin@nids.local", hashed, 1, 1))

    conn.commit()
    print(f"[SEED] Created admin user (ID: {admin_id})")
else:
    print("[SEED] Admin user already exists")

conn.close()
