import logging
import httpx
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("conferly.email")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

async def send_otp_email(to_email: str, recipient_name: str, otp_code: str, purpose: str = "verification") -> bool:
    """
    Dispatches a transactional OTP email using the Brevo API.
    Does not log or expose the API key or raw credentials.
    """
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not configured. Cannot dispatch transactional email.")
        return False

    sender_email = settings.BREVO_SENDER_EMAIL or "infosysspringboard13@gmail.com"
    subject = (
        "Your Conferly Password Reset Code"
        if purpose == "forgot_password"
        else "Your Conferly Security Verification Code"
    )

    action_label = (
        "reset your account password"
        if purpose == "forgot_password"
        else "change your account password"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f1f5f9; margin: 0; padding: 24px; }}
            .container {{ max-width: 520px; margin: 0 auto; background-color: #131a26; border: 1px solid #243042; border-radius: 16px; padding: 32px; }}
            .logo {{ font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 24px; text-transform: uppercase; }}
            .title {{ font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }}
            .otp-box {{ background-color: #06090e; border: 1px solid #38bdf8; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; }}
            .expiry {{ font-size: 12px; color: #f59e0b; margin-top: 8px; font-weight: 600; }}
            .footer {{ font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">Conferly</div>
            <div class="title">Security Verification Code</div>
            <div class="text">
                Hello <strong>{recipient_name}</strong>,<br><br>
                We received a request to {action_label} for your Conferly account. Please use the one-time verification code below to proceed:
            </div>
            <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
                <div class="expiry">Valid for 10 minutes &bull; Single-use only</div>
            </div>
            <div class="text">
                If you did not request this verification code, please ignore this email or notify your system administrator immediately.
            </div>
            <div class="footer">
                This is an automated security notification dispatched from Conferly Conference Management Portal.<br>
                Do not reply to this email.
            </div>
        </div>
    </body>
    </html>
    """

    payload = {
        "sender": {
            "name": "Conferly Security",
            "email": sender_email
        },
        "to": [
            {
                "email": to_email,
                "name": recipient_name or "Conferly User"
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(BREVO_API_URL, json=payload, headers=headers)
            if response.status_code in [200, 201, 202]:
                logger.info(f"Successfully sent OTP email to {to_email} via Brevo")
                return True
            else:
                logger.error(f"Brevo API error ({response.status_code}): {response.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to deliver email through Brevo: {e}")
        return False
