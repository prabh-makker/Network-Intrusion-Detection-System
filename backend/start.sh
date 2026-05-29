#!/bin/bash
export MODEL_DIR="C:\Users\khalo\nids\backend\app\shared-models"
export PYTHONUNBUFFERED=1
cd "C:\Users\khalo\nids\backend"
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
