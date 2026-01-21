# /app/backend/services/email_service.py
"""Email service for BLVX using Resend"""
import os
import asyncio
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")


async def send_verification_email(to_email: str, code: str, name: str = "there") -> bool:
    """Send verification code email to user"""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not configured - skipping email send")
        return False
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px; background-color: #000000; border: 1px solid #333;">
                                <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 4px;">
                                    BLVX
                                </h1>
                                <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                                    Built for the culture
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px; background-color: #111; border: 1px solid #333; border-top: none;">
                                <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 16px;">
                                    Hey {name},
                                </p>
                                <p style="margin: 0 0 30px 0; color: #aaa; font-size: 14px; line-height: 1.6;">
                                    Welcome to the neighborhood! Use this code to verify your email and join the block:
                                </p>
                                
                                <!-- Verification Code -->
                                <div style="background-color: #000; border: 2px solid #f59e0b; padding: 20px; text-align: center; margin: 0 0 30px 0;">
                                    <span style="font-size: 32px; font-weight: 700; color: #f59e0b; letter-spacing: 8px;">
                                        {code}
                                    </span>
                                </div>
                                
                                <p style="margin: 0; color: #666; font-size: 12px;">
                                    This code expires in 10 minutes. If you didn't sign up for BLVX, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 30px; background-color: #000; border: 1px solid #333; border-top: none; text-align: center;">
                                <p style="margin: 0; color: #444; font-size: 11px;">
                                    BLVX • Built for the culture. Owned by the people.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": f"Your BLVX Verification Code: {code}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Verification email sent to {to_email}, ID: {email.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")
        return False


async def send_welcome_email(to_email: str, name: str) -> bool:
    """Send welcome email after verification"""
    if not resend.api_key:
        return False
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 30px; background-color: #000; border: 1px solid #333;">
                                <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 4px;">
                                    BLVX
                                </h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 30px; background-color: #111; border: 1px solid #333; border-top: none;">
                                <p style="margin: 0 0 20px 0; color: #f59e0b; font-size: 20px; font-weight: 600;">
                                    Welcome to the Block, {name}! 🎉
                                </p>
                                <p style="margin: 0 0 20px 0; color: #aaa; font-size: 14px; line-height: 1.6;">
                                    You're officially part of the neighborhood. Here's how to get started:
                                </p>
                                <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #888; font-size: 14px; line-height: 2;">
                                    <li><strong style="color: #fff;">The Block</strong> - Share your thoughts with everyone</li>
                                    <li><strong style="color: #fff;">The Cookout</strong> - Private posts for your close circle</li>
                                    <li><strong style="color: #fff;">The Stoop</strong> - Jump into live audio rooms</li>
                                    <li><strong style="color: #fff;">Bonita</strong> - Your AI auntie is always here to chat</li>
                                </ul>
                                <p style="margin: 0; color: #666; font-size: 13px;">
                                    Got 10 plates to share? Invite your people. Let's build this together.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 30px; background-color: #000; border: 1px solid #333; border-top: none; text-align: center;">
                                <p style="margin: 0; color: #444; font-size: 11px;">
                                    BLVX • Built for the culture. Owned by the people.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": f"Welcome to BLVX, {name}! 🏠",
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
        return False
