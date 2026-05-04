#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Simple screenshot capture - just navigate and screenshot"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import os
import sys

# Fix output encoding
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Setup
chrome_options = Options()
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-blink-features=AutomationControlled")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

base_url = "http://localhost:3002"
screenshots_dir = "C:\\Users\\khalo\\EXAMPLE\\screenshots"
os.makedirs(screenshots_dir, exist_ok=True)

try:
    # 1. Login page
    print("[1] Capturing Login page...")
    driver.get(f"{base_url}/login")
    time.sleep(3)
    driver.save_screenshot(f"{screenshots_dir}/1_login.png")
    print("    [OK] 1_login.png")

    # Try to login
    print("    Attempting to login...")
    driver.get(f"{base_url}/dashboard")
    time.sleep(4)

    # 2. Dashboard
    print("[2] Capturing Dashboard...")
    driver.save_screenshot(f"{screenshots_dir}/2_dashboard.png")
    print("    [OK] 2_dashboard.png")

    # Scroll for full dashboard
    driver.execute_script("window.scrollBy(0, 800)")
    time.sleep(1)
    driver.save_screenshot(f"{screenshots_dir}/2b_dashboard_scroll.png")
    print("    [OK] 2b_dashboard_scroll.png")

    # 3. Alerts
    print("[3] Capturing Alerts...")
    driver.get(f"{base_url}/alerts")
    time.sleep(3)
    driver.save_screenshot(f"{screenshots_dir}/3_alerts.png")
    print("    [OK] 3_alerts.png")

    # Scroll alerts
    driver.execute_script("window.scrollBy(0, 500)")
    time.sleep(1)
    driver.save_screenshot(f"{screenshots_dir}/3b_alerts_scroll.png")
    print("    [OK] 3b_alerts_scroll.png")

    # 4. ML Page
    print("[4] Capturing ML Analytics...")
    driver.get(f"{base_url}/ml")
    time.sleep(4)
    driver.save_screenshot(f"{screenshots_dir}/4_ml_top.png")
    print("    [OK] 4_ml_top.png")

    # Scroll ML page
    driver.execute_script("window.scrollBy(0, 800)")
    time.sleep(1)
    driver.save_screenshot(f"{screenshots_dir}/4b_ml_middle.png")
    print("    [OK] 4b_ml_middle.png")

    driver.execute_script("window.scrollBy(0, 800)")
    time.sleep(1)
    driver.save_screenshot(f"{screenshots_dir}/4c_ml_bottom.png")
    print("    [OK] 4c_ml_bottom.png")

    # 5. Map
    print("[5] Capturing Map...")
    driver.get(f"{base_url}/map")
    time.sleep(3)
    driver.save_screenshot(f"{screenshots_dir}/5_map.png")
    print("    [OK] 5_map.png")

    print("\n[SUCCESS] Screenshots saved!")
    print(f"Location: {screenshots_dir}")
    print("\nFiles created:")
    for f in sorted(os.listdir(screenshots_dir)):
        print(f"  - {f}")

except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
finally:
    driver.quit()
