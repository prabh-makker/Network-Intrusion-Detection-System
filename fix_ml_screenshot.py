#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Fix ML page screenshot - navigate properly with waits"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import os
import sys

# Fix output encoding
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

chrome_options = Options()
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_argument("--disable-popup-blocking")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

base_url = "http://localhost:3002"
screenshots_dir = "C:\\Users\\khalo\\EXAMPLE\\screenshots"

try:
    print("[ML] Capturing ML page...")

    # Navigate to ML page
    driver.get(f"{base_url}/ml")
    print("  Navigated to /ml")

    # Wait for page to load - look for ML-specific elements
    wait = WebDriverWait(driver, 10)

    # Wait for ML page content (look for "XGBoost" or "Confusion Matrix" text)
    try:
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'XGBoost') or contains(text(), 'Confusion') or contains(text(), 'Feature')]")))
        print("  Page loaded, waiting for render...")
    except:
        print("  Warning: ML elements not found, waiting anyway...")

    time.sleep(5)

    # Take screenshots at different scroll positions
    print("  Taking screenshot 1 (top)...")
    driver.save_screenshot(f"{screenshots_dir}/4_ml_top_FIXED.png")

    print("  Scrolling to middle...")
    driver.execute_script("window.scrollBy(0, 800)")
    time.sleep(2)
    driver.save_screenshot(f"{screenshots_dir}/4b_ml_middle_FIXED.png")

    print("  Scrolling to bottom...")
    driver.execute_script("window.scrollBy(0, 800)")
    time.sleep(2)
    driver.save_screenshot(f"{screenshots_dir}/4c_ml_bottom_FIXED.png")

    print("\n[SUCCESS] ML page screenshots fixed!")
    print("Files:")
    print("  - 4_ml_top_FIXED.png")
    print("  - 4b_ml_middle_FIXED.png")
    print("  - 4c_ml_bottom_FIXED.png")

    # Get page title to confirm we're on ML page
    title = driver.title
    print(f"\nPage title: {title}")

    # Check for ML-specific content
    try:
        accuracy = driver.find_element(By.XPATH, "//*[contains(text(), '99.97')]")
        print("Found accuracy metric: 99.97% - CONFIRMED ML PAGE")
    except:
        print("Note: Could not find accuracy metric")

except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
finally:
    driver.quit()
