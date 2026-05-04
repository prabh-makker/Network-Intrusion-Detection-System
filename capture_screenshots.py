#!/usr/bin/env python
"""Capture screenshots of all 8 NIDS components"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
import os

# Setup
options = webdriver.ChromeOptions()
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
base_url = "http://localhost:3002"
screenshots_dir = "C:\\Users\\khalo\\EXAMPLE\\screenshots"
os.makedirs(screenshots_dir, exist_ok=True)

try:
    # Login first
    print("Logging in...")
    driver.get(f"{base_url}/login")
    time.sleep(4)

    # Wait for page to load and find login form
    try:
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        wait = WebDriverWait(driver, 10)

        # Try to find username input by various selectors
        try:
            username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text']")))
            password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        except:
            username_field = driver.find_element(By.CSS_SELECTOR, "input")
            password_field = driver.find_element(By.CSS_SELECTOR, "input:nth-of-type(2)")

        username_field.clear()
        username_field.send_keys("testuser")
        password_field.clear()
        password_field.send_keys("password123")

        # Try to find and click login button
        try:
            login_btn = driver.find_element(By.XPATH, "//button[text()='Sign In']")
        except:
            login_btn = driver.find_element(By.XPATH, "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sign') or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'login')]")

        login_btn.click()
        time.sleep(5)
    except Exception as e:
        print(f"Login failed: {e}. Continuing without authentication...")

    # 1. Dashboard (Real-Time UI, Traffic Distribution, WebSocket)
    print("1. Capturing Dashboard...")
    driver.get(f"{base_url}/dashboard")
    time.sleep(3)
    driver.save_screenshot(f"{screenshots_dir}/1_dashboard.png")
    print("   ✓ Saved: 1_dashboard.png")

    # 2. Alerts (Database Logs / Detected Intrusions)
    print("2. Capturing Alerts Page...")
    driver.get(f"{base_url}/alerts")
    time.sleep(2)
    driver.save_screenshot(f"{screenshots_dir}/2_alerts.png")
    print("   ✓ Saved: 2_alerts.png")

    # 3. ML Page (Detection Results Table)
    print("3. Capturing ML Analytics...")
    driver.get(f"{base_url}/ml")
    time.sleep(3)
    driver.save_screenshot(f"{screenshots_dir}/3_ml_metrics.png")
    print("   ✓ Saved: 3_ml_metrics.png")

    # Scroll down to see confusion matrix
    driver.execute_script("window.scrollBy(0, 500)")
    time.sleep(1)
    driver.save_screenshot(f"{screenshots_dir}/3b_ml_confusion_matrix.png")
    print("   ✓ Saved: 3b_ml_confusion_matrix.png")

    # Scroll more for feature importance
    driver.execute_script("window.scrollBy(0, 500)")
    time.sleep(1)
    driver.save_screenshot(f"{screenshots_dir}/3c_ml_features.png")
    print("   ✓ Saved: 3c_ml_features.png")

    # 4. Map Page (Geo-IP visualization if available)
    print("4. Capturing Map Page...")
    driver.get(f"{base_url}/map")
    time.sleep(2)
    driver.save_screenshot(f"{screenshots_dir}/4_map.png")
    print("   ✓ Saved: 4_map.png")

    print("\n✅ All screenshots captured successfully!")
    print(f"📁 Location: {screenshots_dir}")

finally:
    driver.quit()
