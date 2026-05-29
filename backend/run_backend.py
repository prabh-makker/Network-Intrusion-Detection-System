#!/usr/bin/env python3
"""Startup script that sets environment variables and starts the backend."""
import os
import sys
import subprocess

# Set MODEL_DIR before importing anything from the app
os.environ['MODEL_DIR'] = r'C:\Users\khalo\nids\backend\app\shared-models'
os.environ['PYTHONUNBUFFERED'] = '1'

# Start uvicorn
subprocess.run([
    sys.executable, '-m', 'uvicorn',
    'app.main:app',
    '--host', '127.0.0.1',
    '--port', '8001',
    '--reload'
])
