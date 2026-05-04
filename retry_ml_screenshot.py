#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Retry ML screenshot with better error handling"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import os

chrome_options = Options()
# Remove headless to see what's happening
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
# chrome_options.add_argument("--headless")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

screenshots_dir = "C:\\Users\\khalo\\EXAMPLE\\screenshots"
base_url = "http://localhost:3002"

try:
    print("[1] Opening ML page...")
    driver.get(f"{base_url}/ml")
    print(f"    URL: {driver.current_url}")
    print(f"    Title: {driver.title}")

    print("[2] Waiting for page to fully load...")
    time.sleep(6)

    # Try different screenshot methods
    print("[3] Taking screenshot...")

    # Method 1: Standard screenshot
    try:
        result = driver.save_screenshot(f"{screenshots_dir}/4_ml_top_RETRY.png")
        print(f"    [OK] Screenshot saved")
    except Exception as e:
        print(f"    [ERROR] {e}")
        # Method 2: Alternative
        import base64
        png = driver.get_screenshot_as_base64()
        if png:
            with open(f"{screenshots_dir}/4_ml_top_RETRY.png", "wb") as f:
                f.write(base64.b64decode(png))
            print(f"    [OK] Screenshot saved (method 2)")
        else:
            print(f"    [ERROR] Could not get screenshot")

    print("[4] Page content check...")
    page_source = driver.page_source
    if "XGBoost" in page_source:
        print("    [OK] Found 'XGBoost' in page")
    if "Confusion" in page_source:
        print("    [OK] Found 'Confusion' in page")
    if "99.97" in page_source:
        print("    [OK] Found '99.97' accuracy in page")

    print("[5] Scrolling and retaking screenshot...")
    driver.execute_script("window.scrollBy(0, 600)")
    time.sleep(2)
    driver.save_screenshot(f"{screenshots_dir}/4b_ml_middle_RETRY.png")
    print("    [OK] Middle screenshot saved")

    driver.execute_script("window.scrollBy(0, 600)")
    time.sleep(2)
    driver.save_screenshot(f"{screenshots_dir}/4c_ml_bottom_RETRY.png")
    print("    [OK] Bottom screenshot saved")

    print("\n[SUCCESS] ML screenshots retried!")

except Exception as e:
    print(f"[FATAL ERROR] {e}")
    import traceback
    traceback.print_exc()
finally:
    time.sleep(2)
    driver.quit()
    print("\nBrowser closed.")
