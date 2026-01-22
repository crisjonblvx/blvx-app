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
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "cj@blvx.social")

# Logo URL (hosted on the frontend)
LOGO_URL = "https://high-context-1.preview.emergentagent.com/assets/logo-white.png"


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
                        <!-- Header with Logo -->
                        <tr>
                            <td align="center" style="padding: 30px; background-color: #000000; border: 1px solid #333; border-bottom: none;">
                                <img 
                                    src="{LOGO_URL}" 
                                    alt="BLVX - High Context Social" 
                                    width="120" 
                                    style="display: block; max-width: 120px; height: auto;"
                                />
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px; background-color: #111; border: 1px solid #333;">
                                <h2 style="margin: 0 0 24px 0; color: #f59e0b; font-size: 22px; font-weight: 600;">
                                    The Block is Open.
                                </h2>
                                
                                <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 16px; line-height: 1.6;">
                                    What's good, {name}?
                                </p>
                                
                                <p style="margin: 0 0 20px 0; color: #aaa; font-size: 14px; line-height: 1.7;">
                                    You made it. We built this platform because the timeline was getting too noisy and we needed a place that spoke our language.
                                </p>
                                
                                <p style="margin: 0 0 30px 0; color: #aaa; font-size: 14px; line-height: 1.7;">
                                    You are now part of the ecosystem. To secure your spot on the stoop, verify your email below.
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
                                <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
                                    <a href="https://blvx.social" style="color: #888; text-decoration: none;">BLVX</a>. Built for the culture. Owned by the people.
                                </p>
                                <p style="margin: 0; color: #444; font-size: 10px;">
                                    <a href="https://blvx.social" style="color: #555; text-decoration: none;">blvx.social</a>
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
        "from": f"BLVX <{SENDER_EMAIL}>",
        "to": [to_email],
        "subject": "Welcome home. 🧱",
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
                        <!-- Header with Logo -->
                        <tr>
                            <td align="center" style="padding: 30px; background-color: #000; border: 1px solid #333; border-bottom: none;">
                                <img 
                                    src="{LOGO_URL}" 
                                    alt="BLVX - High Context Social" 
                                    width="120" 
                                    style="display: block; max-width: 120px; height: auto;"
                                />
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px; background-color: #111; border: 1px solid #333;">
                                <h2 style="margin: 0 0 24px 0; color: #f59e0b; font-size: 22px; font-weight: 600;">
                                    You're in. 🏠
                                </h2>
                                
                                <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 16px; line-height: 1.6;">
                                    {name}, welcome to the neighborhood.
                                </p>
                                
                                <p style="margin: 0 0 24px 0; color: #aaa; font-size: 14px; line-height: 1.7;">
                                    Your email is verified. You now have full access to the ecosystem. Here's where to start:
                                </p>
                                
                                <table style="width: 100%; margin: 0 0 24px 0;">
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #222;">
                                            <span style="color: #f59e0b; font-weight: 600;">The Block</span>
                                            <span style="color: #888; font-size: 13px;"> — Share your thoughts with everyone</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #222;">
                                            <span style="color: #f59e0b; font-weight: 600;">The Cookout</span>
                                            <span style="color: #888; font-size: 13px;"> — Private posts for your circle</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #222;">
                                            <span style="color: #f59e0b; font-weight: 600;">The Stoop</span>
                                            <span style="color: #888; font-size: 13px;"> — Live audio rooms</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0;">
                                            <span style="color: #f59e0b; font-weight: 600;">Bonita</span>
                                            <span style="color: #888; font-size: 13px;"> — Your AI auntie, always here to chat</span>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 0; color: #666; font-size: 13px;">
                                    You've got 10 plates to share. Invite your people. Let's build this together.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 30px; background-color: #000; border: 1px solid #333; border-top: none; text-align: center;">
                                <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
                                    <a href="https://blvx.social" style="color: #888; text-decoration: none;">BLVX</a>. Built for the culture. Owned by the people.
                                </p>
                                <p style="margin: 0; color: #444; font-size: 10px;">
                                    <a href="https://blvx.social" style="color: #555; text-decoration: none;">blvx.social</a>
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
        "from": f"BLVX <{SENDER_EMAIL}>",
        "to": [to_email],
        "subject": f"You're in, {name}. 🏠",
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
        return False


async def send_password_reset_email(to_email: str, token: str, name: str = "there", origin: str = "https://blvx.social") -> bool:
    """Send password reset email"""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not configured - skipping email send")
        return False
    
    # Build reset URL from origin
    reset_url = f"{origin}/reset-password?token={token}"
    
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
                        <!-- Header with Logo -->
                        <tr>
                            <td align="center" style="padding: 30px; background-color: #000000; border: 1px solid #333; border-bottom: none;">
                                <img 
                                    src="{LOGO_URL}" 
                                    alt="BLVX - High Context Social" 
                                    width="120" 
                                    style="display: block; max-width: 120px; height: auto;"
                                />
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px; background-color: #111; border: 1px solid #333;">
                                <h2 style="margin: 0 0 24px 0; color: #f59e0b; font-size: 22px; font-weight: 600;">
                                    Locked out?
                                </h2>
                                
                                <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 16px; line-height: 1.6;">
                                    No stress, {name}. It happens to the best of us.
                                </p>
                                
                                <p style="margin: 0 0 30px 0; color: #aaa; font-size: 14px; line-height: 1.7;">
                                    Click the button below to secure your account and get back on The Block.
                                </p>
                                
                                <!-- Reset Button -->
                                <div style="text-align: center; margin: 0 0 30px 0;">
                                    <a href="{reset_url}" style="display: inline-block; background-color: #f59e0b; color: #000; font-weight: 600; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 0;">
                                        Reset Password
                                    </a>
                                </div>
                                
                                <p style="margin: 0 0 16px 0; color: #666; font-size: 12px;">
                                    This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
                                </p>
                                
                                <p style="margin: 0; color: #444; font-size: 11px; word-break: break-all;">
                                    Or copy this link: {reset_url}
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 30px; background-color: #000; border: 1px solid #333; border-top: none; text-align: center;">
                                <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
                                    <a href="https://blvx.social" style="color: #888; text-decoration: none;">BLVX</a>. Built for the culture. Owned by the people.
                                </p>
                                <p style="margin: 0; color: #444; font-size: 10px;">
                                    <a href="https://blvx.social" style="color: #555; text-decoration: none;">blvx.social</a>
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
        "from": f"BLVX <{SENDER_EMAIL}>",
        "to": [to_email],
        "subject": "Let's get you back in. 🔑",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Password reset email sent to {to_email}, ID: {email.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        return False
