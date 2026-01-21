# /app/backend/utils/__init__.py
"""Utility functions for BLVX"""
import bcrypt
import secrets
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    except Exception:
        return False


def generate_verification_code() -> str:
    """Generate 6-digit verification code"""
    return str(secrets.randbelow(900000) + 100000)


def generate_session_token() -> str:
    """Generate secure session token"""
    return f"session_{secrets.token_urlsafe(32)}"


def safe_isoformat(dt) -> str:
    """Safely convert datetime to ISO format string"""
    if isinstance(dt, str):
        return dt
    if isinstance(dt, datetime):
        return dt.isoformat()
    return datetime.now(timezone.utc).isoformat()
