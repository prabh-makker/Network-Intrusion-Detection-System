#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Final fix for ML screenshots with proper scroll timing"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

options = Options()
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

dir = "C:\\Users\\khalo\\EXAMPLE\\screenshots"
base_url = "http://localhost:3002"

try:
    print("[ML] Navigating to ML page...")
    driver.get(f"{base_url}/ml")
    time.sleep(7)

    # Reset scroll to top
    driver.execute_script("window.scrollTo(0, 0)")
    time.sleep(2)

    print("[1] Screenshot: ML TOP...")
    driver.save_screenshot(f"{dir}/4_ml_top.png")

    # Scroll 1000px
    print("[2] Scrolling 1000px...")
    driver.execute_script("window.scrollBy(0, 1000)")
    time.sleep(3)

    print("[3] Screenshot: ML MIDDLE...")
    driver.save_screenshot(f"{dir}/4b_ml_middle.png")

    # Scroll another 1000px
    print("[4] Scrolling another 1000px...")
    driver.execute_script("window.scrollBy(0, 1000)")
    time.sleep(3)

    print("[5] Screenshot: ML BOTTOM...")
    driver.save_screenshot(f"{dir}/4c_ml_bottom.png")

    print("\n[SUCCESS] ML screenshots created with proper scroll intervals!")

except Exception as e:
    print(f"[ERROR] {e}")
finally:
    driver.quit()
