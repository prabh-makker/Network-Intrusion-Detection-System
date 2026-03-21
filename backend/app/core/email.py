import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import Optional


def send_otp_email(email: str, otp_code: str, username: str) -> bool:
    """
    Send OTP via email using SMTP (Gmail or custom SMTP).
    Returns True if sent successfully, False otherwise.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    # If SMTP is not configured, return False
    if not smtp_host or not smtp_user or not smtp_password:
        print(f"⚠️  SMTP not configured. OTP for {username}: {otp_code}")
        return False

    try:
        # Create email message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "NIDS Sentinel - Password Reset OTP"
        msg["From"] = smtp_from
        msg["To"] = email

        # HTML email content
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #0f0a1a 0%, #1a0a2e 100%); padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 40px; text-align: center;">
                    <h2 style="color: #a78bfa; margin-bottom: 10px;">NIDS Sentinel</h2>
                    <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 30px;">Network Intrusion Detection System</p>

                    <h3 style="color: #f1f5f9; margin-bottom: 20px;">Password Reset OTP</h3>

                    <p style="color: #cbd5e1; margin-bottom: 20px;">Hi <strong>{username}</strong>,</p>

                    <p style="color: #cbd5e1; margin-bottom: 30px;">Your one-time password (OTP) for account recovery is:</p>

                    <div style="background: rgba(139, 92, 246, 0.2); border: 2px solid rgba(139, 92, 246, 0.5); padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                        <h1 style="color: #8b5cf6; letter-spacing: 5px; margin: 0; font-family: monospace;">{otp_code}</h1>
                    </div>

                    <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 20px;">
                        This OTP will expire in <strong>5 minutes</strong>. If you did not request this, please ignore this email.
                    </p>

                    <hr style="border: none; border-top: 1px solid rgba(139, 92, 246, 0.3); margin: 30px 0;">

                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                        © 2024 NIDS Sentinel. Do not share this OTP with anyone.
                    </p>
                </div>
            </body>
        </html>
        """

        part = MIMEText(html, "html")
        msg.attach(part)

        # Send email via SMTP
        if smtp_port == 465:
            # Use SSL for port 465
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            # Use TLS for port 587 and others
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.starttls()

        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, email, msg.as_string())
        server.quit()

        print(f"✅ OTP email sent to {email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send OTP email: {str(e)}")
        # Fallback: print OTP to console
        print(f"⚠️  OTP for {username} ({email}): {otp_code}")
        return False
