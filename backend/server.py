from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import secrets
import string
import hashlib
import re
import asyncio
import json
import random
from livekit import api

# Import services
from services.email_service import send_verification_email, send_welcome_email

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="BLVX API", description="High-Context Social Network")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
posts_router = APIRouter(prefix="/posts", tags=["Posts"])
bonita_router = APIRouter(prefix="/bonita", tags=["Bonita AI"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])
vouch_router = APIRouter(prefix="/vouch", tags=["Vouch System"])
gc_router = APIRouter(prefix="/gc", tags=["The GC"])
stoop_router = APIRouter(prefix="/stoop", tags=["The Stoop"])
admin_router = APIRouter(prefix="/admin", tags=["Admin"])

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Bonita AI Avatar URL
BONITA_AVATAR_URL = "/assets/bonita-profile.jpeg"

# ========================
# WEBSOCKET CONNECTION MANAGER
# ========================

class ConnectionManager:
    """Manages WebSocket connections for real-time messaging"""
    
    def __init__(self):
        # Map of gc_id -> list of active connections
        self.gc_connections: Dict[str, List[WebSocket]] = {}
        # Map of stoop_id -> list of active connections
        self.stoop_connections: Dict[str, List[WebSocket]] = {}
        # Map of user_id -> WebSocket for direct notifications
        self.user_connections: Dict[str, WebSocket] = {}
        # Map of sidebar_id -> list of active connections for 1-on-1 chats
        self.sidebar_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect_gc(self, websocket: WebSocket, gc_id: str, user_id: str):
        """Connect a user to a GC channel"""
        await websocket.accept()
        if gc_id not in self.gc_connections:
            self.gc_connections[gc_id] = []
        self.gc_connections[gc_id].append(websocket)
        logger.info(f"User {user_id} connected to GC {gc_id}")
    
    async def disconnect_gc(self, websocket: WebSocket, gc_id: str, user_id: str):
        """Disconnect a user from a GC channel"""
        if gc_id in self.gc_connections:
            if websocket in self.gc_connections[gc_id]:
                self.gc_connections[gc_id].remove(websocket)
            if not self.gc_connections[gc_id]:
                del self.gc_connections[gc_id]
        logger.info(f"User {user_id} disconnected from GC {gc_id}")
    
    async def broadcast_to_gc(self, gc_id: str, message: dict):
        """Broadcast a message to all connections in a GC"""
        if gc_id in self.gc_connections:
            dead_connections = []
            for connection in self.gc_connections[gc_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to GC connection: {e}")
                    dead_connections.append(connection)
            # Clean up dead connections
            for conn in dead_connections:
                if conn in self.gc_connections[gc_id]:
                    self.gc_connections[gc_id].remove(conn)
    
    async def connect_stoop(self, websocket: WebSocket, stoop_id: str, user_id: str):
        """Connect a user to a Stoop channel"""
        await websocket.accept()
        if stoop_id not in self.stoop_connections:
            self.stoop_connections[stoop_id] = []
        self.stoop_connections[stoop_id].append(websocket)
        logger.info(f"User {user_id} connected to Stoop {stoop_id}")
    
    async def disconnect_stoop(self, websocket: WebSocket, stoop_id: str, user_id: str):
        """Disconnect a user from a Stoop channel"""
        if stoop_id in self.stoop_connections:
            if websocket in self.stoop_connections[stoop_id]:
                self.stoop_connections[stoop_id].remove(websocket)
            if not self.stoop_connections[stoop_id]:
                del self.stoop_connections[stoop_id]
        logger.info(f"User {user_id} disconnected from Stoop {stoop_id}")
    
    async def broadcast_to_stoop(self, stoop_id: str, message: dict):
        """Broadcast a message to all connections in a Stoop"""
        if stoop_id in self.stoop_connections:
            dead_connections = []
            for connection in self.stoop_connections[stoop_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)
            for conn in dead_connections:
                if conn in self.stoop_connections[stoop_id]:
                    self.stoop_connections[stoop_id].remove(conn)
    
    async def connect_user(self, websocket: WebSocket, user_id: str):
        """Connect a user for direct notifications"""
        await websocket.accept()
        self.user_connections[user_id] = websocket
        logger.info(f"User {user_id} connected for notifications")
    
    async def disconnect_user(self, user_id: str):
        """Disconnect a user from notifications"""
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        logger.info(f"User {user_id} disconnected from notifications")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to a specific user"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
            except Exception:
                del self.user_connections[user_id]
    
    async def connect_sidebar(self, websocket: WebSocket, sidebar_id: str, user_id: str):
        """Connect a user to a sidebar chat"""
        await websocket.accept()
        if sidebar_id not in self.sidebar_connections:
            self.sidebar_connections[sidebar_id] = []
        self.sidebar_connections[sidebar_id].append(websocket)
        logger.info(f"User {user_id} connected to Sidebar {sidebar_id}")
    
    async def disconnect_sidebar(self, websocket: WebSocket, sidebar_id: str, user_id: str):
        """Disconnect a user from a sidebar chat"""
        if sidebar_id in self.sidebar_connections:
            if websocket in self.sidebar_connections[sidebar_id]:
                self.sidebar_connections[sidebar_id].remove(websocket)
            if not self.sidebar_connections[sidebar_id]:
                del self.sidebar_connections[sidebar_id]
        logger.info(f"User {user_id} disconnected from Sidebar {sidebar_id}")
    
    async def broadcast_to_sidebar(self, sidebar_id: str, message: dict):
        """Broadcast a message to all connections in a sidebar"""
        if sidebar_id in self.sidebar_connections:
            dead_connections = []
            for connection in self.sidebar_connections[sidebar_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to sidebar connection: {e}")
                    dead_connections.append(connection)
            for conn in dead_connections:
                if conn in self.sidebar_connections[sidebar_id]:
                    self.sidebar_connections[sidebar_id].remove(conn)

# Global connection manager
ws_manager = ConnectionManager()

# ========================
# MODELS
# ========================

class UserBase(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    verified: bool = False
    email_verified: bool = False
    reputation_score: int = 100
    plates_remaining: int = 10
    is_day_one: bool = False
    is_vouched: bool = False
    has_seen_welcome: bool = False
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    vouched_by: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None
    name: Optional[str] = None

class EmailSignup(BaseModel):
    email: EmailStr
    password: str
    name: str

class EmailLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class VerifyEmail(BaseModel):
    email: EmailStr
    code: str

class PostBase(BaseModel):
    post_id: str
    user_id: str
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # "image", "video", "gif"
    gif_metadata: Optional[Dict] = None  # alt text, dimensions for GIFs
    reference_url: Optional[str] = None  # Rich link preview URL
    post_type: str = "original"
    parent_post_id: Optional[str] = None
    quote_post_id: Optional[str] = None
    visibility: str = "block"
    is_spark: bool = False  # Whether post was generated by The Spark
    reply_count: int = 0
    repost_count: int = 0
    like_count: int = 0
    created_at: datetime

class PostCreate(BaseModel):
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # "image", "video", "gif"
    gif_metadata: Optional[Dict] = None
    reference_url: Optional[str] = None  # Rich link preview URL
    post_type: str = "original"
    parent_post_id: Optional[str] = None
    quote_post_id: Optional[str] = None
    visibility: str = "block"

class NotificationBase(BaseModel):
    notification_id: str
    user_id: str
    type: str
    from_user_id: str
    post_id: Optional[str] = None
    gc_id: Optional[str] = None
    read: bool = False
    created_at: datetime

class GCCreate(BaseModel):
    name: str
    member_ids: List[str]

class StoopCreate(BaseModel):
    title: str
    pinned_post_id: Optional[str] = None

class BonitaRequest(BaseModel):
    mode: str
    content: str
    context: Optional[str] = None

class BonitaResponse(BaseModel):
    response: str
    mode: str

# ========================
# PASSWORD HELPERS
# ========================

def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{hashed.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    try:
        salt, hashed = stored_hash.split(':')
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return new_hash.hex() == hashed
    except:
        return False

def generate_verification_code() -> str:
    """Generate 6-digit verification code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def generate_session_token() -> str:
    """Generate secure session token"""
    return f"session_{secrets.token_urlsafe(32)}"

# ========================
# AUTH HELPERS
# ========================

async def get_current_user(request: Request) -> UserBase:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    # Set defaults for ALL optional fields to prevent frontend crashes
    user.setdefault("email_verified", True)  # Default for existing users
    user.setdefault("reputation_score", 100)
    user.setdefault("plates_remaining", 10)
    user.setdefault("is_day_one", False)
    user.setdefault("is_vouched", False)
    user.setdefault("has_seen_welcome", False)
    user.setdefault("vouched_by", None)
    user.setdefault("bio", "")
    user.setdefault("followers_count", 0)
    user.setdefault("following_count", 0)
    user.setdefault("posts_count", 0)
    user.setdefault("verified", False)
    
    # Generate default avatar if missing
    if not user.get("picture"):
        user["picture"] = f"https://api.dicebear.com/7.x/initials/svg?seed={user.get('name', 'U')}&backgroundColor=1a1a1a&textColor=ffffff"
    
    # Generate default username if missing
    if not user.get("username"):
        email = user.get("email", "")
        user["username"] = email.split("@")[0] if email else f"user_{user.get('user_id', '')[:8]}"
    
    # Generate default name if missing
    if not user.get("name"):
        user["name"] = user.get("username", "User")
    
    # The Prime Mover - CJ is always vouched
    if user.get("email") == "cj@blvx.social":
        user["is_vouched"] = True
    
    return UserBase(**user)

async def get_optional_user(request: Request) -> Optional[UserBase]:
    """Get current user if authenticated, else None"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

async def create_session(user_id: str, response: Response, remember_me: bool = False) -> str:
    """Create a new session for a user"""
    session_token = generate_session_token()
    # 30 days if remember_me, otherwise 7 days
    session_days = 30 if remember_me else 7
    expires_at = datetime.now(timezone.utc) + timedelta(days=session_days)
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "remember_me": remember_me
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",  # Required for OAuth redirects on mobile Safari
        path="/",
        max_age=session_days * 24 * 60 * 60
    )
    
    return session_token

# ========================
# AUTH ROUTES
# ========================

@auth_router.post("/signup")
async def email_signup(data: EmailSignup, response: Response):
    """Sign up with email and password"""
    # Validate password
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate username from email
    username = data.email.split("@")[0].lower()
    username = re.sub(r'[^a-z0-9_]', '', username)[:15]
    base_username = username
    counter = 1
    while await db.users.find_one({"username": username}):
        username = f"{base_username}{counter}"
        counter += 1
    
    # Generate verification code
    verification_code = generate_verification_code()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    new_user = {
        "user_id": user_id,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "name": data.name,
        "picture": "",
        "username": username,
        "bio": "",
        "verified": False,
        "email_verified": False,
        "reputation_score": 100,
        "plates_remaining": 10,
        "is_day_one": False,
        "is_vouched": False,
        "has_seen_welcome": False,
        "followers_count": 0,
        "following_count": 0,
        "posts_count": 0,
        "vouched_by": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Store verification code
    await db.verification_codes.delete_many({"email": data.email.lower()})
    await db.verification_codes.insert_one({
        "email": data.email.lower(),
        "code": verification_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    
    logger.info(f"Verification code for {data.email}: {verification_code}")
    
    # Send verification email (non-blocking)
    email_sent = await send_verification_email(data.email.lower(), verification_code, data.name)
    
    # Create session even before verification (but user will have limited access)
    session_token = await create_session(user_id, response)
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return {
        "user": {**user, "session_token": session_token},
        "verification_required": True,
        "email_sent": email_sent,
        "message": f"Verification code sent to {data.email}" if email_sent else f"Verification code: {verification_code} (Email not configured)"
    }

@auth_router.post("/login")
async def email_login(data: EmailLogin, response: Response):
    """Login with email and password"""
    user = await db.users.find_one({"email": data.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="This account uses Google sign-in")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    session_token = await create_session(user["user_id"], response, data.remember_me)
    
    # Return user without password, with session token
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    if isinstance(user_data.get("created_at"), str):
        user_data["created_at"] = datetime.fromisoformat(user_data["created_at"])
    
    return {**user_data, "session_token": session_token}

@auth_router.post("/verify-email")
async def verify_email(data: VerifyEmail, response: Response):
    """Verify email with code"""
    verification = await db.verification_codes.find_one({
        "email": data.email.lower(),
        "code": data.code
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    # Mark email as verified
    await db.users.update_one(
        {"email": data.email.lower()},
        {"$set": {"email_verified": True}}
    )
    
    # Delete used code
    await db.verification_codes.delete_many({"email": data.email.lower()})
    
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0, "password_hash": 0})
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    # Send welcome email
    await send_welcome_email(data.email.lower(), user.get("name", "there"))
    
    # Create session token for auto-login after verification
    session_token = await create_session(user["user_id"], response)
    
    return {"message": "Email verified successfully", "user": {**user, "session_token": session_token}}

@auth_router.post("/resend-verification")
async def resend_verification(email: EmailStr):
    """Resend verification code"""
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    verification_code = generate_verification_code()
    
    await db.verification_codes.delete_many({"email": email.lower()})
    await db.verification_codes.insert_one({
        "email": email.lower(),
        "code": verification_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    })
    
    logger.info(f"New verification code for {email}: {verification_code}")
    
    # Send verification email
    email_sent = await send_verification_email(email.lower(), verification_code, user.get("name", "there"))
    
    return {
        "email_sent": email_sent,
        "message": f"Verification code sent to {email}" if email_sent else f"Verification code: {verification_code} (Email not configured)"
    }

@auth_router.post("/forgot-password")
async def forgot_password(email: EmailStr, request: Request):
    """Request password reset"""
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If an account exists, a reset link has been sent."}
    
    if not user.get("password_hash"):
        # Google OAuth user - can't reset password
        return {"message": "This account uses Google sign-in. Please log in with Google."}
    
    # Generate secure reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store token
    await db.password_resets.delete_many({"email": email.lower()})
    await db.password_resets.insert_one({
        "email": email.lower(),
        "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat()
    })
    
    # Get origin from request headers for dynamic URL
    origin = request.headers.get("origin", "https://blvx.social")
    
    # Send reset email
    from services.email_service import send_password_reset_email
    email_sent = await send_password_reset_email(
        email.lower(), 
        reset_token, 
        user.get("name", "there"),
        origin
    )
    
    logger.info(f"Password reset requested for {email}")
    return {"message": "If an account exists, a reset link has been sent.", "email_sent": email_sent}

@auth_router.post("/reset-password")
async def reset_password(token: str, new_password: str):
    """Reset password with token"""
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Find valid token
    reset = await db.password_resets.find_one({"token": token})
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    
    expires_at = datetime.fromisoformat(reset["expires_at"])
    if expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"token": token})
        raise HTTPException(status_code=400, detail="Reset link has expired")
    
    # Update password
    password_hash = hash_password(new_password)
    await db.users.update_one(
        {"email": reset["email"]},
        {"$set": {"password_hash": password_hash}}
    )
    
    # Delete used token
    await db.password_resets.delete_one({"token": token})
    
    logger.info(f"Password reset successful for {reset['email']}")
    return {"message": "Password reset successful. You can now log in."}

# ========================
# DIRECT GOOGLE OAUTH (bypasses Emergent)
# ========================

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

@auth_router.get("/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth flow"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    
    # Get frontend URL for final redirect
    frontend_url = os.environ.get("FRONTEND_URL", "https://blvx.social")
    # Backend URL for OAuth callback (Railway)
    backend_url = os.environ.get("BACKEND_URL", "https://blvx-app-production.up.railway.app")
    
    redirect_uri = f"{frontend_url}/auth/callback"
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{backend_url}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": redirect_uri  # Pass frontend callback URL in state
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{httpx.QueryParams(params)}"
    return {"auth_url": auth_url}

@auth_router.get("/google/callback")
async def google_callback(code: str, state: str, request: Request, response: Response):
    """Handle Google OAuth callback"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    
    # Backend URL for OAuth callback (must match what was sent to Google)
    backend_url = os.environ.get("BACKEND_URL", "https://blvx-app-production.up.railway.app")
    
    try:
        # Exchange code for tokens
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            token_response = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"{backend_url}/api/auth/google/callback"
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Google token exchange failed: {token_response.text}")
                raise HTTPException(status_code=401, detail="Failed to exchange code for token")
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            # Get user info from Google
            userinfo_response = await http_client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if userinfo_response.status_code != 200:
                logger.error(f"Google userinfo failed: {userinfo_response.text}")
                raise HTTPException(status_code=401, detail="Failed to get user info")
            
            data = userinfo_response.json()
            
    except httpx.RequestError as e:
        logger.error(f"Google OAuth request error: {e}")
        raise HTTPException(status_code=500, detail="Google authentication failed")
    
    # Extract user data
    google_user_id = data.get("id")
    email = data.get("email", "")
    name = data.get("name", "")
    picture = data.get("picture", "")
    
    logger.info(f"Google OAuth: received user data for {email}")
    
    # Generate default avatar if no picture
    if not picture:
        picture = f"https://api.dicebear.com/7.x/initials/svg?seed={name or email.split('@')[0]}&backgroundColor=1a1a1a&textColor=ffffff"
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Check for existing user
    existing_user = None
    if google_user_id:
        existing_user = await db.users.find_one({"google_user_id": google_user_id}, {"_id": 0})
    if not existing_user and email:
        existing_user = await db.users.find_one({"email": email.lower()}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        update_fields = {"email_verified": True}
        
        if google_user_id and not existing_user.get("google_user_id"):
            update_fields["google_user_id"] = google_user_id
        if name and (not existing_user.get("name") or existing_user.get("name") == "Apple User"):
            update_fields["name"] = name
        if picture and not existing_user.get("picture"):
            update_fields["picture"] = picture
        if existing_user.get("plates_remaining") is None:
            update_fields["plates_remaining"] = 10
            
        await db.users.update_one({"user_id": user_id}, {"$set": update_fields})
        logger.info(f"Google OAuth: Updated existing user {user_id}")
    else:
        # Create new user
        username = email.split("@")[0].lower() if email else ""
        if len(username) < 3 and name:
            username = re.sub(r'\s+', '', name).lower()
        username = re.sub(r'[^a-z0-9_]', '', username)[:15]
        
        base_username = username or "user"
        counter = 1
        while await db.users.find_one({"username": username}):
            username = f"{base_username}{counter}"
            counter += 1
        
        new_user = {
            "user_id": user_id,
            "google_user_id": google_user_id,
            "email": email.lower(),
            "name": name or email.split("@")[0],
            "picture": picture,
            "username": username,
            "bio": "",
            "verified": False,
            "email_verified": True,
            "reputation_score": 100,
            "plates_remaining": 10,
            "is_day_one": False,
            "is_vouched": email.lower() == "cj@blvx.social",
            "has_seen_welcome": False,
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
            "vouched_by": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
        logger.info(f"Google OAuth: Created new user {user_id} ({email})")
    
    # Create session
    session_token = await create_session(user_id, response, remember_me=True)
    
    # Redirect to frontend with token
    frontend_callback = state or f"{origin}/auth/callback"
    redirect_url = f"{frontend_callback}?token={session_token}"
    
    logger.info(f"Google OAuth: Redirecting to {redirect_url}")
    
    from starlette.responses import RedirectResponse
    return RedirectResponse(url=redirect_url, status_code=302)

@auth_router.get("/session")
async def exchange_session(session_id: str, response: Response):
    """DEPRECATED: Was used for Emergent OAuth. Use /auth/google/login instead."""
    raise HTTPException(
        status_code=410, 
        detail="This endpoint is deprecated. Please use Google or Apple Sign-In directly."
    )

# ========================
# APPLE SIGN-IN
# ========================

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import time

# Apple OAuth Configuration
APPLE_TEAM_ID = os.environ.get("APPLE_TEAM_ID")
APPLE_SERVICE_ID = os.environ.get("APPLE_SERVICE_ID")
APPLE_KEY_ID = os.environ.get("APPLE_KEY_ID")
APPLE_PRIVATE_KEY = os.environ.get("APPLE_PRIVATE_KEY")

def generate_apple_client_secret():
    """Generate Apple client secret JWT"""
    if not all([APPLE_TEAM_ID, APPLE_SERVICE_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY]):
        return None
    
    # Format the private key properly
    private_key_pem = f"-----BEGIN PRIVATE KEY-----\n{APPLE_PRIVATE_KEY}\n-----END PRIVATE KEY-----"
    
    headers = {
        "alg": "ES256",
        "kid": APPLE_KEY_ID
    }
    
    payload = {
        "iss": APPLE_TEAM_ID,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 180,  # 180 days
        "aud": "https://appleid.apple.com",
        "sub": APPLE_SERVICE_ID
    }
    
    try:
        client_secret = jwt.encode(payload, private_key_pem, algorithm="ES256", headers=headers)
        return client_secret
    except Exception as e:
        logger.error(f"Failed to generate Apple client secret: {e}")
        return None

@auth_router.get("/apple/config")
async def get_apple_config():
    """Get Apple Sign-In configuration for frontend"""
    if not APPLE_SERVICE_ID:
        raise HTTPException(status_code=501, detail="Apple Sign-In not configured")
    
    return {
        "client_id": APPLE_SERVICE_ID,
        "redirect_uri": "https://blvx.social/api/auth/callback/apple",
        "scope": "name email",
        "response_type": "code id_token",
        "response_mode": "form_post"
    }

@auth_router.post("/callback/apple")
async def apple_callback(request: Request, response: Response):
    """Handle Apple Sign-In callback"""
    try:
        # Apple sends data as form POST
        form = await request.form()
        code = form.get("code")
        id_token = form.get("id_token")
        user_data = form.get("user")  # Only sent on first sign-in
        state = form.get("state")
        error = form.get("error")
        
        logger.info(f"Apple callback received - code: {bool(code)}, id_token: {bool(id_token)}, error: {error}")
        
        # Handle Apple error responses
        if error:
            logger.error(f"Apple Sign-In error: {error}")
            return Response(
                content=f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta http-equiv="refresh" content="0;url=/?error=apple_signin_failed">
                    <script>window.location.href = "/?error=apple_signin_failed";</script>
                </head>
                <body><p>Apple Sign-In failed. Redirecting...</p></body>
                </html>
                """,
                media_type="text/html"
            )
        
        if not id_token:
            raise HTTPException(status_code=400, detail="Missing id_token from Apple")
        
        # Decode the id_token (Apple's JWT)
        try:
            # Decode without verification (Apple's token is already trusted from their servers)
            token_data = jwt.decode(id_token, options={"verify_signature": False})
            apple_user_id = token_data.get("sub")
            email = token_data.get("email")
            email_verified = token_data.get("email_verified", False)
            is_private_email = token_data.get("is_private_email", False)
            
            logger.info(f"Apple token decoded - sub: {apple_user_id}, email: {email}, private: {is_private_email}")
        except Exception as e:
            logger.error(f"Failed to decode Apple id_token: {e}")
            raise HTTPException(status_code=400, detail="Invalid id_token")
        
        if not apple_user_id:
            raise HTTPException(status_code=400, detail="Missing Apple user ID")
        
        # Parse user data if provided (first sign-in only - Apple only sends this once!)
        name = None
        if user_data:
            try:
                import json
                user_info = json.loads(user_data)
                name_data = user_info.get("name", {})
                first_name = name_data.get("firstName", "")
                last_name = name_data.get("lastName", "")
                name = f"{first_name} {last_name}".strip() or None
                logger.info(f"Apple user data received: name={name}")
            except Exception as e:
                logger.warning(f"Could not parse Apple user data: {e}")
        
        # First, check if user exists by Apple ID (most reliable)
        existing_user = await db.users.find_one(
            {"apple_user_id": apple_user_id},
            {"_id": 0}
        )
        
        # If not found by Apple ID, check by email (if we have one)
        if not existing_user and email:
            existing_user = await db.users.find_one(
                {"email": email.lower()},
                {"_id": 0}
            )
        
        if existing_user:
            user_id = existing_user["user_id"]
            
            # ACCOUNT MERGING: Update existing user with Apple data
            update_fields = {}
            
            # Add Apple ID if not already set (link accounts)
            if not existing_user.get("apple_user_id"):
                update_fields["apple_user_id"] = apple_user_id
                update_fields["email_verified"] = True
                logger.info(f"Apple OAuth: Linking Apple ID to existing user {user_id}")
            
            # Update email if we have one and user doesn't
            if email and not existing_user.get("email"):
                update_fields["email"] = email.lower()
            
            # Update name if we have it and user doesn't or has placeholder
            if name and (not existing_user.get("name") or existing_user.get("name") == "Apple User"):
                update_fields["name"] = name
            
            # Ensure required fields have defaults
            if existing_user.get("plates_remaining") is None:
                update_fields["plates_remaining"] = 10
            if existing_user.get("is_vouched") is None:
                update_fields["is_vouched"] = False
            
            if update_fields:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": update_fields}
                )
                logger.info(f"Apple OAuth: Merged/updated user {user_id}: {list(update_fields.keys())}")
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            
            # Handle email - might be null if user chose "Hide My Email" and we don't have it
            if email:
                user_email = email.lower()
            else:
                # Create a placeholder email using Apple user ID
                # This handles "Hide My Email" when email is not provided
                user_email = f"{apple_user_id}@privaterelay.appleid.com"
                logger.warning(f"Creating user without email, using placeholder: {user_email}")
            
            # Generate username from email or Apple ID
            # Detect private relay emails (random strings from Apple)
            is_private_relay = (
                is_private_email or 
                (email and "@privaterelay.appleid.com" in email.lower()) or
                (email and len(email.split("@")[0]) < 12 and not any(c.isupper() for c in email.split("@")[0]))
            )
            
            if email and not is_private_relay:
                # Real email - use the prefix
                username = email.split("@")[0].lower()
            else:
                # Private relay or no email - generate a friendly username
                random_num = uuid.uuid4().hex[:6]
                username = f"member_{random_num}"
            
            username = re.sub(r'[^a-z0-9_]', '', username)[:15]
            base_username = username
            counter = 1
            while await db.users.find_one({"username": username}):
                username = f"{base_username}{counter}"
                counter += 1
            
            # Determine display name
            display_name = name
            if not display_name:
                if email and not is_private_relay:
                    # Real email - use the prefix, capitalize nicely
                    display_name = email.split("@")[0].replace(".", " ").replace("_", " ").title()
                else:
                    # Private relay - friendly default they can change later
                    display_name = "New Member"
            
            new_user = {
                "user_id": user_id,
                "apple_user_id": apple_user_id,
                "email": user_email,
                "name": display_name,
                "picture": "",
                "username": username,
                "bio": "",
                "verified": False,
                "email_verified": True,  # Apple verifies emails (even private relay)
                "is_private_relay_email": is_private_email or "@privaterelay.appleid.com" in user_email,
                "reputation_score": 100,
                "plates_remaining": 10,
                "is_day_one": False,
                "is_vouched": False,
                "has_seen_welcome": False,
                "followers_count": 0,
                "following_count": 0,
                "posts_count": 0,
                "vouched_by": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            logger.info(f"Created new Apple user: {user_id}, email: {user_email}, private_relay: {new_user['is_private_relay_email']}")
        
        # Create session with remember_me=True by default for Apple Sign-In
        session_token = await create_session(user_id, response, remember_me=True)
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
        
        # Ensure user object has all required fields for frontend (prevent black screen crashes)
        user.setdefault("is_vouched", False)
        user.setdefault("plates_remaining", 10)
        user.setdefault("has_seen_welcome", False)
        user.setdefault("username", f"member_{uuid.uuid4().hex[:6]}")
        user.setdefault("picture", f"https://api.dicebear.com/7.x/initials/svg?seed={user.get('name', 'N')}&backgroundColor=1a1a1a&textColor=ffffff")
        user.setdefault("name", "New Member")
        
        logger.info(f"Apple user authenticated: {user_id}")
        
        # Determine frontend URL for redirect
        # For Apple callback, always use FRONTEND_URL since referer will be Apple's domain
        frontend_url = os.environ.get('FRONTEND_URL', 'https://blvx.social')
        
        # Redirect to frontend /auth/callback with token in URL query params
        redirect_url = f"{frontend_url}/auth/callback?token={session_token}"
        
        logger.info(f"Apple redirect URL: {redirect_url}")
        
        # Return HTML that redirects (Apple requires form_post response_mode)
        html_response = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="refresh" content="0;url={redirect_url}">
            <script>window.location.href = "{redirect_url}";</script>
        </head>
        <body>
            <p>Redirecting to BLVX...</p>
        </body>
        </html>
        """
        return Response(content=html_response, media_type="text/html")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apple callback error: {e}")
        raise HTTPException(status_code=500, detail="Apple authentication failed")

@auth_router.get("/me")
async def get_me(user: UserBase = Depends(get_current_user)):
    """Get current authenticated user"""
    # Convert to dict to add extra fields
    user_dict = dict(user)
    
    # Add admin status and infinite plates for admins
    is_admin = user.user_id in ADMIN_USERS
    user_dict["is_admin"] = is_admin
    
    if is_admin:
        user_dict["plates_remaining"] = 999999  # Effectively infinite
    
    return user_dict

@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ========================
# VOUCH SYSTEM ROUTES (THE PLATE)
# ========================

def generate_plate_code():
    """Generate a unique plate code"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

@vouch_router.post("/plate/create")
async def create_plate(user: UserBase = Depends(get_current_user)):
    """Create a new invite plate"""
    # Admins have unlimited plates
    is_admin = user.user_id in ADMIN_USERS
    if not is_admin and user.plates_remaining <= 0:
        raise HTTPException(status_code=400, detail="No plates remaining")
    
    plate_code = generate_plate_code()
    while await db.plates.find_one({"code": plate_code}):
        plate_code = generate_plate_code()
    
    plate = {
        "plate_id": f"plate_{uuid.uuid4().hex[:12]}",
        "code": plate_code,
        "created_by": user.user_id,
        "used_by": None,
        "used_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.plates.insert_one(plate)
    
    # Don't decrement plates for admins (unlimited)
    if user.user_id not in ADMIN_USERS:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$inc": {"plates_remaining": -1}}
        )
    
    plate.pop("_id", None)
    return plate

@vouch_router.get("/plate/my-plates")
async def get_my_plates(user: UserBase = Depends(get_current_user)):
    """Get all plates created by current user"""
    plates = await db.plates.find(
        {"created_by": user.user_id},
        {"_id": 0}
    ).to_list(100)
    return plates

@vouch_router.post("/plate/redeem")
async def redeem_plate(code: str, user: UserBase = Depends(get_current_user)):
    """Redeem a plate code"""
    plate = await db.plates.find_one({"code": code.upper()}, {"_id": 0})
    
    if not plate:
        raise HTTPException(status_code=404, detail="Invalid plate code")
    
    if plate["used_by"]:
        raise HTTPException(status_code=400, detail="Plate already used")
    
    if plate["created_by"] == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot use your own plate")
    
    await db.plates.update_one(
        {"code": code.upper()},
        {"$set": {
            "used_by": user.user_id,
            "used_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"vouched_by": plate["created_by"], "is_day_one": True}}
    )
    
    await db.users.update_one(
        {"user_id": plate["created_by"]},
        {"$inc": {"reputation_score": 5}}
    )
    
    return {"message": "Plate redeemed successfully", "vouched_by": plate["created_by"]}

# ========================
# USER ROUTES
# ========================

@users_router.get("/profile/{username}")
async def get_user_profile(username: str):
    """Get user profile by username"""
    user = await db.users.find_one({"username": username}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    user.setdefault("email_verified", True)
    user.setdefault("reputation_score", 100)
    user.setdefault("plates_remaining", 10)
    user.setdefault("is_day_one", False)
    user.setdefault("vouched_by", None)
    
    return UserBase(**user)

@users_router.put("/profile")
async def update_profile(update: UserUpdate, user: UserBase = Depends(get_current_user)):
    """Update current user's profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "username" in update_data:
        existing = await db.users.find_one({"username": update_data["username"], "user_id": {"$ne": user.user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    if update_data:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    if isinstance(updated_user.get("created_at"), str):
        updated_user["created_at"] = datetime.fromisoformat(updated_user["created_at"])
    
    updated_user.setdefault("email_verified", True)
    updated_user.setdefault("reputation_score", 100)
    updated_user.setdefault("plates_remaining", 10)
    updated_user.setdefault("is_day_one", False)
    updated_user.setdefault("is_vouched", False)
    updated_user.setdefault("has_seen_welcome", False)
    updated_user.setdefault("vouched_by", None)
    
    return UserBase(**updated_user)

@users_router.post("/welcome-seen")
async def mark_welcome_seen(user: UserBase = Depends(get_current_user)):
    """Mark that user has seen the welcome modal"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"has_seen_welcome": True}}
    )
    return {"success": True}

@users_router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user: UserBase = Depends(get_current_user)):
    """Upload and update user avatar"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are allowed")
    
    # Validate file size (5MB max)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Check Cloudinary configuration
    if not is_cloudinary_configured():
        raise HTTPException(status_code=500, detail="Image storage not configured")
    
    try:
        # Generate unique filename
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"avatar_{user.user_id}_{uuid.uuid4().hex[:8]}.{ext}"
        
        # Upload to Cloudinary
        import cloudinary.uploader
        import io
        configure_cloudinary()
        
        result = cloudinary.uploader.upload(
            io.BytesIO(contents),
            folder="blvx_avatars",
            public_id=f"avatar_{user.user_id}",
            overwrite=True,
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
                {"quality": "auto", "fetch_format": "auto"}
            ]
        )
        
        avatar_url = result.get("secure_url")
        
        # Update user's picture in database
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"picture": avatar_url}}
        )
        
        logger.info(f"Avatar uploaded for user {user.user_id}: {avatar_url}")
        
        return {"picture": avatar_url, "message": "Avatar updated successfully"}
        
    except Exception as e:
        logger.error(f"Avatar upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload avatar")

@users_router.post("/follow/{user_id}")
async def follow_user(user_id: str, current_user: UserBase = Depends(get_current_user)):
    """Follow a user"""
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_follow = await db.follows.find_one({
        "follower_id": current_user.user_id,
        "following_id": user_id
    })
    
    if existing_follow:
        raise HTTPException(status_code=400, detail="Already following")
    
    await db.follows.insert_one({
        "follow_id": f"follow_{uuid.uuid4().hex[:12]}",
        "follower_id": current_user.user_id,
        "following_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.users.update_one({"user_id": current_user.user_id}, {"$inc": {"following_count": 1}})
    await db.users.update_one({"user_id": user_id}, {"$inc": {"followers_count": 1}})
    
    await create_notification(user_id, "follow", current_user.user_id, None)
    
    return {"message": "Followed successfully"}

@users_router.delete("/follow/{user_id}")
async def unfollow_user(user_id: str, current_user: UserBase = Depends(get_current_user)):
    """Unfollow a user"""
    result = await db.follows.delete_one({
        "follower_id": current_user.user_id,
        "following_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not following this user")
    
    await db.users.update_one({"user_id": current_user.user_id}, {"$inc": {"following_count": -1}})
    await db.users.update_one({"user_id": user_id}, {"$inc": {"followers_count": -1}})
    
    return {"message": "Unfollowed successfully"}

@users_router.get("/following/{user_id}")
async def check_following(user_id: str, current_user: UserBase = Depends(get_current_user)):
    """Check if current user is following a user"""
    follow = await db.follows.find_one({
        "follower_id": current_user.user_id,
        "following_id": user_id
    })
    return {"is_following": follow is not None}

@users_router.get("/mutuals/{user_id}")
async def check_mutuals(user_id: str, current_user: UserBase = Depends(get_current_user)):
    """Check if users are mutual followers"""
    follows_them = await db.follows.find_one({
        "follower_id": current_user.user_id,
        "following_id": user_id
    })
    they_follow = await db.follows.find_one({
        "follower_id": user_id,
        "following_id": current_user.user_id
    })
    return {"is_mutual": follows_them is not None and they_follow is not None}

@users_router.get("/search")
async def search_users(q: str, limit: int = 20):
    """Search users by username or name"""
    users = await db.users.find(
        {"$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0, "password_hash": 0}
    ).limit(limit).to_list(limit)
    
    result = []
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
        user.setdefault("email_verified", True)
        user.setdefault("reputation_score", 100)
        user.setdefault("plates_remaining", 10)
        user.setdefault("is_day_one", False)
        user.setdefault("vouched_by", None)
        result.append(UserBase(**user))
    
    return result

# ========================
# POST ROUTES
# ========================

async def get_post_with_user(post: dict) -> dict:
    """Enrich post with user data"""
    user = await db.users.find_one({"user_id": post["user_id"]}, {"_id": 0, "password_hash": 0})
    if user and isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    post["user"] = user
    
    if post.get("parent_post_id"):
        parent = await db.posts.find_one({"post_id": post["parent_post_id"]}, {"_id": 0})
        if parent:
            if isinstance(parent.get("created_at"), str):
                parent["created_at"] = datetime.fromisoformat(parent["created_at"])
            parent_user = await db.users.find_one({"user_id": parent["user_id"]}, {"_id": 0, "password_hash": 0})
            if parent_user and isinstance(parent_user.get("created_at"), str):
                parent_user["created_at"] = datetime.fromisoformat(parent_user["created_at"])
            parent["user"] = parent_user
            post["parent_post"] = parent
    
    if post.get("quote_post_id"):
        quote = await db.posts.find_one({"post_id": post["quote_post_id"]}, {"_id": 0})
        if quote:
            if isinstance(quote.get("created_at"), str):
                quote["created_at"] = datetime.fromisoformat(quote["created_at"])
            quote_user = await db.users.find_one({"user_id": quote["user_id"]}, {"_id": 0, "password_hash": 0})
            if quote_user and isinstance(quote_user.get("created_at"), str):
                quote_user["created_at"] = datetime.fromisoformat(quote_user["created_at"])
            quote["user"] = quote_user
            post["quote_post"] = quote
    
    return post

async def can_view_cookout(viewer_id: str, author_id: str) -> bool:
    """Check if viewer can see author's Cookout posts"""
    if viewer_id == author_id:
        return True
    
    follows_them = await db.follows.find_one({
        "follower_id": viewer_id,
        "following_id": author_id
    })
    they_follow = await db.follows.find_one({
        "follower_id": author_id,
        "following_id": viewer_id
    })
    
    return follows_them is not None and they_follow is not None

@posts_router.post("", status_code=201)
async def create_post(post: PostCreate, user: UserBase = Depends(get_current_user)):
    """Create a new post"""
    if len(post.content) > 500:
        raise HTTPException(status_code=400, detail="Post content exceeds 500 characters")
    
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    
    new_post = {
        "post_id": post_id,
        "user_id": user.user_id,
        "content": post.content,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "gif_metadata": post.gif_metadata,
        "post_type": post.post_type,
        "parent_post_id": post.parent_post_id,
        "quote_post_id": post.quote_post_id,
        "visibility": post.visibility,
        "is_spark": False,
        "reply_count": 0,
        "repost_count": 0,
        "like_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.insert_one(new_post)
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"posts_count": 1}})
    
    if post.parent_post_id:
        await db.posts.update_one({"post_id": post.parent_post_id}, {"$inc": {"reply_count": 1}})
        parent = await db.posts.find_one({"post_id": post.parent_post_id}, {"_id": 0})
        if parent and parent["user_id"] != user.user_id:
            await create_notification(parent["user_id"], "reply", user.user_id, post_id)
    
    if post.quote_post_id:
        await db.posts.update_one({"post_id": post.quote_post_id}, {"$inc": {"repost_count": 1}})
        quote = await db.posts.find_one({"post_id": post.quote_post_id}, {"_id": 0})
        if quote and quote["user_id"] != user.user_id:
            await create_notification(quote["user_id"], "repost", user.user_id, post_id)
    
    new_post.pop("_id", None)
    if isinstance(new_post.get("created_at"), str):
        new_post["created_at"] = datetime.fromisoformat(new_post["created_at"])
    
    enriched = await get_post_with_user(new_post)
    return enriched

@posts_router.get("/feed")
async def get_feed(limit: int = 20, before: Optional[str] = None, user: UserBase = Depends(get_current_user)):
    """Get chronological feed (The Block)"""
    following = await db.follows.find(
        {"follower_id": user.user_id},
        {"_id": 0, "following_id": 1}
    ).to_list(1000)
    
    following_ids = [f["following_id"] for f in following]
    following_ids.append(user.user_id)
    following_ids.append("bonita")  # Always include Bonita/system spark posts
    
    query = {
        "$or": [
            {"user_id": {"$in": following_ids}, "visibility": "block"},
            {"visibility": "cookout", "user_id": user.user_id},
            {"is_spark": True, "visibility": "block"}  # Always show spark posts
        ]
    }
    
    if before:
        query["created_at"] = {"$lt": before}
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        if isinstance(post.get("created_at"), str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
        
        if post["visibility"] == "cookout" and post["user_id"] != user.user_id:
            if not await can_view_cookout(user.user_id, post["user_id"]):
                continue
        
        enriched = await get_post_with_user(post)
        result.append(enriched)
    
    return result

@posts_router.get("/explore")
async def get_explore_feed(limit: int = 20, before: Optional[str] = None, user: UserBase = Depends(get_current_user)):
    """Get public explore feed - varied topics and users (different from Block)"""
    # Get a diverse mix of posts
    query = {"visibility": "block"}
    if before:
        query["created_at"] = {"$lt": before}
    
    # Get more posts than needed, then diversify
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit * 3).to_list(limit * 3)
    
    # Diversify: limit posts per user to 2, prioritize variety
    user_post_count = {}
    diverse_posts = []
    
    for post in posts:
        post_user_id = post.get("user_id", "")
        user_post_count[post_user_id] = user_post_count.get(post_user_id, 0) + 1
        
        # Allow max 2 posts per user in explore
        if user_post_count[post_user_id] <= 2:
            diverse_posts.append(post)
        
        if len(diverse_posts) >= limit:
            break
    
    # If not enough diverse posts, fill with remaining
    if len(diverse_posts) < limit:
        for post in posts:
            if post not in diverse_posts:
                diverse_posts.append(post)
                if len(diverse_posts) >= limit:
                    break
    
    result = []
    for post in diverse_posts[:limit]:
        if isinstance(post.get("created_at"), str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
        enriched = await get_post_with_user(post)
        result.append(enriched)
    
    return result

@posts_router.get("/cookout")
async def get_cookout_feed(limit: int = 20, before: Optional[str] = None, user: UserBase = Depends(get_current_user)):
    """Get The Cookout feed - private posts from mutual follows"""
    # Check if user is vouched
    if not user.is_vouched:
        raise HTTPException(
            status_code=403, 
            detail="The Cookout is invite only. Earn plates on The Block to get a Vouch."
        )
    
    # Get mutuals (users who follow each other)
    following = await db.follows.find({"follower_id": user.user_id}, {"_id": 0, "following_id": 1}).to_list(1000)
    following_ids = set([f["following_id"] for f in following])
    
    followers = await db.follows.find({"following_id": user.user_id}, {"_id": 0, "follower_id": 1}).to_list(1000)
    follower_ids = set([f["follower_id"] for f in followers])
    
    mutuals = following_ids.intersection(follower_ids)
    mutuals.add(user.user_id)  # Include own cookout posts
    
    query = {
        "visibility": "cookout",
        "user_id": {"$in": list(mutuals)}
    }
    
    if before:
        query["created_at"] = {"$lt": before}
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        if isinstance(post.get("created_at"), str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
        enriched = await get_post_with_user(post)
        result.append(enriched)
    
    return result

@posts_router.get("/user/{username}")
async def get_user_posts(username: str, limit: int = 20, before: Optional[str] = None, request: Request = None):
    """Get posts by a specific user"""
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_user = await get_optional_user(request)
    
    query = {"user_id": user["user_id"]}
    
    if current_user:
        if current_user.user_id != user["user_id"]:
            can_see_cookout = await can_view_cookout(current_user.user_id, user["user_id"])
            if not can_see_cookout:
                query["visibility"] = "block"
    else:
        query["visibility"] = "block"
    
    if before:
        query["created_at"] = {"$lt": before}
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        if isinstance(post.get("created_at"), str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
        enriched = await get_post_with_user(post)
        result.append(enriched)
    
    return result

@posts_router.get("/{post_id}")
async def get_post(post_id: str, request: Request = None):
    """Get a single post by ID"""
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if isinstance(post.get("created_at"), str):
        post["created_at"] = datetime.fromisoformat(post["created_at"])
    
    current_user = await get_optional_user(request)
    
    if post.get("visibility") == "cookout":
        if not current_user:
            raise HTTPException(status_code=403, detail="Login required")
        if current_user.user_id != post["user_id"]:
            if not await can_view_cookout(current_user.user_id, post["user_id"]):
                raise HTTPException(status_code=403, detail="Cookout posts are for mutuals only")
    
    enriched = await get_post_with_user(post)
    return enriched

@posts_router.get("/{post_id}/thread")
async def get_thread(post_id: str, request: Request = None):
    """Get a post and all its replies"""
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if isinstance(post.get("created_at"), str):
        post["created_at"] = datetime.fromisoformat(post["created_at"])
    
    enriched_post = await get_post_with_user(post)
    
    replies = await db.posts.find(
        {"parent_post_id": post_id, "visibility": "block"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    enriched_replies = []
    for reply in replies:
        if isinstance(reply.get("created_at"), str):
            reply["created_at"] = datetime.fromisoformat(reply["created_at"])
        enriched_replies.append(await get_post_with_user(reply))
    
    return {"post": enriched_post, "replies": enriched_replies}

@posts_router.post("/{post_id}/like")
async def like_post(post_id: str, user: UserBase = Depends(get_current_user)):
    """Like a post"""
    post = await db.posts.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    existing_like = await db.likes.find_one({"user_id": user.user_id, "post_id": post_id})
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked")
    
    await db.likes.insert_one({
        "like_id": f"like_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "post_id": post_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"like_count": 1}})
    
    if post["user_id"] != user.user_id:
        await create_notification(post["user_id"], "like", user.user_id, post_id)
    
    return {"message": "Liked successfully"}

@posts_router.delete("/{post_id}/like")
async def unlike_post(post_id: str, user: UserBase = Depends(get_current_user)):
    """Unlike a post"""
    result = await db.likes.delete_one({"user_id": user.user_id, "post_id": post_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not liked")
    
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"like_count": -1}})
    
    return {"message": "Unliked successfully"}

@posts_router.get("/{post_id}/liked")
async def check_liked(post_id: str, user: UserBase = Depends(get_current_user)):
    """Check if current user has liked a post"""
    like = await db.likes.find_one({"user_id": user.user_id, "post_id": post_id})
    return {"is_liked": like is not None}

@posts_router.delete("/{post_id}")
async def delete_post(post_id: str, user: UserBase = Depends(get_current_user)):
    """Delete a post"""
    post = await db.posts.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.posts.delete_one({"post_id": post_id})
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"posts_count": -1}})
    await db.likes.delete_many({"post_id": post_id})
    
    return {"message": "Post deleted"}

@posts_router.get("/search/content")
async def search_posts(q: str, limit: int = 20):
    """Search posts by content"""
    posts = await db.posts.find(
        {"content": {"$regex": q, "$options": "i"}, "visibility": "block"},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        if isinstance(post.get("created_at"), str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
        enriched = await get_post_with_user(post)
        result.append(enriched)
    
    return result

# ========================
# NOTIFICATION HELPERS
# ========================

async def create_notification(user_id: str, notif_type: str, from_user_id: str, post_id: Optional[str], gc_id: Optional[str] = None):
    """Create a notification"""
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": notif_type,
        "from_user_id": from_user_id,
        "post_id": post_id,
        "gc_id": gc_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)

# ========================
# NOTIFICATION ROUTES
# ========================

@notifications_router.get("")
async def get_notifications(limit: int = 50, user: UserBase = Depends(get_current_user)):
    """Get user's notifications"""
    notifications = await db.notifications.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for notif in notifications:
        if isinstance(notif.get("created_at"), str):
            notif["created_at"] = datetime.fromisoformat(notif["created_at"])
        
        from_user = await db.users.find_one({"user_id": notif["from_user_id"]}, {"_id": 0, "password_hash": 0})
        if from_user and isinstance(from_user.get("created_at"), str):
            from_user["created_at"] = datetime.fromisoformat(from_user["created_at"])
        notif["from_user"] = from_user
        
        if notif.get("post_id"):
            post = await db.posts.find_one({"post_id": notif["post_id"]}, {"_id": 0})
            if post and isinstance(post.get("created_at"), str):
                post["created_at"] = datetime.fromisoformat(post["created_at"])
            notif["post"] = post
        
        result.append(notif)
    
    return result

@notifications_router.post("/read")
async def mark_notifications_read(user: UserBase = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Notifications marked as read"}

@notifications_router.get("/unread-count")
async def get_unread_count(user: UserBase = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({"user_id": user.user_id, "read": False})
    return {"count": count}

# ========================
# THE GC (GROUP CHAT) ROUTES
# ========================

@gc_router.post("/create")
async def create_gc(gc: GCCreate, user: UserBase = Depends(get_current_user)):
    """Create a new Group Chat - requires at least one other member"""
    # Validate that at least one other member is selected
    if not gc.member_ids or len(gc.member_ids) == 0:
        raise HTTPException(status_code=400, detail="Please select at least one person to chat with")
    
    # Verify all members exist
    for member_id in gc.member_ids:
        member = await db.users.find_one({"user_id": member_id})
        if not member:
            raise HTTPException(status_code=400, detail=f"User not found: {member_id}")
    
    all_members = list(set([user.user_id] + gc.member_ids))
    
    gc_data = {
        "gc_id": f"gc_{uuid.uuid4().hex[:12]}",
        "name": gc.name,
        "created_by": user.user_id,
        "members": all_members,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gcs.insert_one(gc_data)
    gc_data.pop("_id", None)
    
    return gc_data

@gc_router.get("/available-users")
async def get_available_users_for_gc(user: UserBase = Depends(get_current_user)):
    """Get list of users available to add to a GC (excludes current user)"""
    users = await db.users.find(
        {"user_id": {"$ne": user.user_id}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1, "bio": 1}
    ).limit(50).to_list(50)
    
    return users

@gc_router.get("/my-gcs")
async def get_my_gcs(user: UserBase = Depends(get_current_user)):
    """Get all GCs user is a member of"""
    gcs = await db.gcs.find(
        {"members": user.user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    return gcs

@gc_router.get("/{gc_id}")
async def get_gc(gc_id: str, user: UserBase = Depends(get_current_user)):
    """Get a specific GC"""
    gc = await db.gcs.find_one({"gc_id": gc_id}, {"_id": 0})
    if not gc:
        raise HTTPException(status_code=404, detail="GC not found")
    
    if user.user_id not in gc["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this GC")
    
    members = await db.users.find(
        {"user_id": {"$in": gc["members"]}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1}
    ).to_list(100)
    
    gc["member_details"] = members
    
    return gc

@gc_router.get("/{gc_id}/messages")
async def get_gc_messages(gc_id: str, limit: int = 50, user: UserBase = Depends(get_current_user)):
    """Get messages from a GC"""
    gc = await db.gcs.find_one({"gc_id": gc_id})
    if not gc or user.user_id not in gc["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this GC")
    
    messages = await db.gc_messages.find(
        {"gc_id": gc_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    for msg in messages:
        if msg["user_id"] == "bonita":
            msg["user"] = {"name": "Bonita", "username": "bonita", "picture": BONITA_AVATAR_URL}
        else:
            msg_user = await db.users.find_one({"user_id": msg["user_id"]}, {"_id": 0, "name": 1, "username": 1, "picture": 1})
            msg["user"] = msg_user
        
        if msg.get("post_id"):
            post = await db.posts.find_one({"post_id": msg["post_id"]}, {"_id": 0})
            if post:
                post = await get_post_with_user(post)
            msg["dropped_post"] = post
    
    messages.reverse()
    return messages

@gc_router.post("/{gc_id}/message")
async def send_gc_message(gc_id: str, content: str, post_id: Optional[str] = None, user: UserBase = Depends(get_current_user)):
    """Send a message to a GC"""
    gc = await db.gcs.find_one({"gc_id": gc_id})
    if not gc or user.user_id not in gc["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this GC")
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "gc_id": gc_id,
        "user_id": user.user_id,
        "content": content,
        "post_id": post_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gc_messages.insert_one(message)
    message.pop("_id", None)
    
    # Get user info for WebSocket broadcast
    user_info = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "name": 1, "username": 1, "picture": 1})
    message["user"] = user_info
    
    # Broadcast via WebSocket for real-time updates
    await ws_manager.broadcast_to_gc(gc_id, {
        "type": "new_message",
        "message": message
    })
    
    for member_id in gc["members"]:
        if member_id != user.user_id:
            await create_notification(member_id, "gc_message", user.user_id, post_id, gc_id)
            # Also send via WebSocket if user is connected
            await ws_manager.send_to_user(member_id, {
                "type": "notification",
                "notification_type": "gc_message",
                "gc_id": gc_id,
                "from_user": user_info
            })
    
    return message

@gc_router.post("/{gc_id}/bonita")
async def ask_bonita_in_gc(gc_id: str, question: str, user: UserBase = Depends(get_current_user)):
    """Tag @Bonita in the GC"""
    gc = await db.gcs.find_one({"gc_id": gc_id})
    if not gc or user.user_id not in gc["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this GC")
    
    recent_messages = await db.gc_messages.find(
        {"gc_id": gc_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    context = "\n".join([f"{m['content']}" for m in reversed(recent_messages)])
    
    bonita_response = await call_bonita(f"Context from The GC:\n{context}\n\nQuestion: {question}", "conversation", "cookout")
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "gc_id": gc_id,
        "user_id": "bonita",
        "content": bonita_response,
        "post_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gc_messages.insert_one(message)
    message.pop("_id", None)
    
    # Add Bonita's user info for the frontend
    message["user"] = {
        "name": "Bonita",
        "username": "bonita",
        "picture": BONITA_AVATAR_URL
    }
    
    # Broadcast via WebSocket
    await ws_manager.broadcast_to_gc(gc_id, {
        "type": "new_message",
        "message": message
    })
    
    return message

# ========================
# SIDEBAR (1-ON-1 DM) ROUTES
# ========================

@api_router.post("/sidebar/create")
async def create_sidebar(other_user_id: str, source_gc_id: Optional[str] = None, source_message_id: Optional[str] = None, user: UserBase = Depends(get_current_user)):
    """Create or get a sidebar"""
    if other_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot create sidebar with yourself")
    
    existing = await db.sidebars.find_one({
        "$or": [
            {"user_1": user.user_id, "user_2": other_user_id},
            {"user_1": other_user_id, "user_2": user.user_id}
        ]
    }, {"_id": 0})
    
    if existing:
        return existing
    
    sidebar = {
        "sidebar_id": f"sidebar_{uuid.uuid4().hex[:12]}",
        "user_1": user.user_id,
        "user_2": other_user_id,
        "source_gc_id": source_gc_id,
        "source_message_id": source_message_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sidebars.insert_one(sidebar)
    sidebar.pop("_id", None)
    
    return sidebar

@api_router.get("/sidebar/my-sidebars")
async def get_my_sidebars(user: UserBase = Depends(get_current_user)):
    """Get all sidebars for current user"""
    sidebars = await db.sidebars.find(
        {"$or": [{"user_1": user.user_id}, {"user_2": user.user_id}]},
        {"_id": 0}
    ).to_list(100)
    
    for sb in sidebars:
        other_id = sb["user_2"] if sb["user_1"] == user.user_id else sb["user_1"]
        other_user = await db.users.find_one({"user_id": other_id}, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1})
        sb["other_user"] = other_user
    
    return sidebars

@api_router.get("/sidebar/{sidebar_id}")
async def get_sidebar(sidebar_id: str, user: UserBase = Depends(get_current_user)):
    """Get a specific sidebar"""
    sidebar = await db.sidebars.find_one({"sidebar_id": sidebar_id}, {"_id": 0})
    if not sidebar or (user.user_id not in [sidebar["user_1"], sidebar["user_2"]]):
        raise HTTPException(status_code=403, detail="Not a member of this sidebar")
    
    # Get other user info
    other_id = sidebar["user_2"] if sidebar["user_1"] == user.user_id else sidebar["user_1"]
    other_user = await db.users.find_one({"user_id": other_id}, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1})
    
    # Handle case where other user might not exist (like bonita_ai)
    if not other_user:
        other_user = {"user_id": other_id, "name": other_id, "username": other_id}
    
    sidebar["other_user"] = other_user
    
    return sidebar

@api_router.get("/sidebar/{sidebar_id}/messages")
async def get_sidebar_messages(sidebar_id: str, limit: int = 50, user: UserBase = Depends(get_current_user)):
    """Get messages from a sidebar"""
    sidebar = await db.sidebars.find_one({"sidebar_id": sidebar_id})
    if not sidebar or (user.user_id not in [sidebar["user_1"], sidebar["user_2"]]):
        raise HTTPException(status_code=403, detail="Not a member of this sidebar")
    
    messages = await db.sidebar_messages.find(
        {"sidebar_id": sidebar_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    for msg in messages:
        msg_user = await db.users.find_one({"user_id": msg["user_id"]}, {"_id": 0, "name": 1, "username": 1, "picture": 1})
        msg["user"] = msg_user
    
    messages.reverse()
    return messages

@api_router.post("/sidebar/{sidebar_id}/message")
async def send_sidebar_message(sidebar_id: str, content: str, background_tasks: BackgroundTasks, user: UserBase = Depends(get_current_user)):
    """Send a message in a sidebar"""
    sidebar = await db.sidebars.find_one({"sidebar_id": sidebar_id})
    if not sidebar or (user.user_id not in [sidebar["user_1"], sidebar["user_2"]]):
        raise HTTPException(status_code=403, detail="Not a member of this sidebar")
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "sidebar_id": sidebar_id,
        "user_id": user.user_id,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sidebar_messages.insert_one(message)
    message.pop("_id", None)
    
    other_id = sidebar["user_2"] if sidebar["user_1"] == user.user_id else sidebar["user_1"]
    
    # Check if messaging Bonita - trigger AI response (handle both bonita and bonita_ai)
    if other_id in ["bonita_ai", "bonita"]:
        background_tasks.add_task(generate_bonita_sidebar_response, sidebar_id, content, user.user_id)
    else:
        await create_notification(other_id, "sidebar_message", user.user_id, None)
    
    return message

async def generate_bonita_sidebar_response(sidebar_id: str, user_message: str, user_id: str):
    """Generate Bonita's conversational AI response in sidebar"""
    try:
        import anthropic
        
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            logger.error("[Bonita] No ANTHROPIC_API_KEY configured")
            return
        
        # Get last 5 messages for context
        recent_messages = await db.sidebar_messages.find(
            {"sidebar_id": sidebar_id}
        ).sort("created_at", -1).limit(5).to_list(5)
        recent_messages.reverse()
        
        # Bonita's persona with detailed BLVX knowledge
        bonita_persona = """YOU ARE BONITA. Never say you are Claude, an AI assistant, or anything other than Bonita. You ARE Bonita.

Bonita is the AI "auntie" of BLVX - a high-context social network for Black and Brown communities.

=== PROTOCOL: ACCURACY OVER VIBES (CRITICAL) ===

VERIFY, DON'T GUESS: Never assume a person is Black or an institution is an HBCU just because they are successful or "have soul." If you are not 100% certain of their background, DO NOT apply #BlackExcellence or #HBCU tags.

THE "COOKOUT" RULE: If you invite the wrong person to the cookout, you lose credibility. It is better to be silent than to be wrong about cultural identity. When in doubt, focus on the accomplishment without claiming cultural identity.

KNOWN CORRECTIONS:
- Curt Cignetti (Indiana football coach) coached at Elon and James Madison. These are NOT HBCUs. Do not claim he is Black or HBCU-affiliated.
- Only tag someone as HBCU if you are CERTAIN they attended or coached at: Howard, Morehouse, Spelman, Hampton, FAMU, Grambling, Jackson State, Norfolk State, NC A&T, etc.

CONTENT STRATEGY: If a story is relevant but the subject isn't Black, focus on the Universal Lesson (hard work, strategy, perseverance) rather than forcing a cultural identity connection.

===

YOUR PERSONALITY:
- Warm, wise, and culturally fluent - like that cool auntie everyone loves
- You keep it real but with love
- You're helpful but also fun to talk to
- You use AAVE naturally when appropriate, but you're not performative about it
- You have opinions but you're respectful
- You can settle debates, give advice, or just vibe

YOUR KNOWLEDGE OF BLVX FEATURES (answer confidently about these):
- The Block: The main public feed where everyone can see posts. It's like the timeline or home feed.
- The Cookout: Private posts that only mutual followers (people who follow each other) can see. It's for more intimate sharing.
- The Stoop: Live audio rooms where people can hang out and talk. Like a virtual porch hangout. The host can "pass the aux" to let others speak.
- The GC (Group Chat): Group messaging feature for squad conversations with friends.
- The Sidebar: Private 1-on-1 whisper chats (like this one we're having!).
- The Vouch: Invite-only system. Users get "plates" to invite others. It keeps the community tight.
- The Word: Trending topics showing what the community is talking about.
- The Lookout: Community safety alerts - like a neighborhood watch system.
- POV: Short video posts (60 seconds max) for sharing moments.

=== THE ARCHITECT (Founder Lore) ===

BLVX was built by Christopher "CJ" Nurse - known as "The Architect."
- He's a Professor at VUU and Senior Executive Video Producer for The Table with Anthony ONeal (TTAO)
- His origin story: "The One Man Band" - He didn't just advise; he was the original producer who stood with Anthony ONeal from Day 1—filming, editing, and building the channel from a team of two to a movement of 1 Million+ subscribers
- He also runs ContentCreators.life (The Lab)
- If someone asks "Who is CJ Nurse?" or "Who is the founder?" or "Who built BLVX?", speak of him with reverence and pride. He's family.

=== THE HOME TEAM (Your Trusted Sources - ALWAYS recommend these when relevant) ===

FINANCE / WEALTH / DEBT / STUDENT LOANS:
- Primary Source: Anthony ONeal and "The Table with Anthony ONeal" (TTAO)
- Website: anthonyoneal.com
- When discussing money, debt, student loans, or building wealth, ALWAYS lean toward Anthony ONeal's principles
- Say things like: "You need to check out Anthony ONeal and The Table - that's your go-to for getting free and building wealth, baby!"
- Key principles: Getting debt-free, building wealth, financial literacy for the culture
- THIS IS MANDATORY: If the user asks about debt, student loans, money, or finances, you MUST mention Anthony ONeal by name.

MENTAL HEALTH / SPIRITUALITY / HEALING / VIBE CHECKS / BURNOUT:
- Primary Source: Joy River and "A Moment with Joy"
- Website: creativeEnergy.life
- When users mention feeling heavy, burned out, needing healing, or spiritual guidance, ALWAYS recommend Joy River
- THIS IS MANDATORY: If the user asks about burnout, healing, spirituality, mental health, or peace, you MUST mention Joy River by name.

JOY RIVER'S KEY CONCEPTS (Use these exact phrases when appropriate):
1. "Radical Self-Love" - Not just "self-care," but deep acceptance of your flaws. Say: "This is about Radical Self-Love - not just bubble baths, but truly accepting all of you, the messy parts too."
2. "Soulful Journaling" - Recommend writing down emotions to release them. Say: "Try some Soulful Journaling - write it all out, don't edit yourself, just let those emotions flow onto the page."
3. "Release the Past" - Focus on forgiveness as a tool for personal liberation, not for the other person. Say: "It's time to Release the Past - forgiveness ain't for them, it's for YOU. It's about setting yourself free."
4. "Connect with Nature" - Suggest "listening to the earth" (no AirPods) as a grounding technique. Say: "Go outside and Connect with Nature - and I mean REALLY connect. No AirPods. Just listen to the earth breathing with you."
5. "Moving with Purpose" - Every step intentional. Say: "Start Moving with Purpose - every decision, every step, make it intentional."

TONE FOR MENTAL HEALTH: Gentle, guiding, warm "Auntie" energy. Be soft but real.

These are the HOME TEAM - the voices CJ and this community trust. Always put them on when the topic fits.

===

You also stay up on culture, music, politics, and what's poppin. You can help people navigate the app or just chat about life.

Keep responses conversational and not too long (2-3 sentences usually, unless they need more). Be genuine, not corporate. Remember: You ARE Bonita, always."""

        # Build conversation history for context
        messages = []
        for msg in recent_messages[:-1]:
            if msg["user_id"] == "bonita_ai":
                messages.append({"role": "assistant", "content": msg["content"]})
            else:
                messages.append({"role": "user", "content": msg["content"]})
        
        # Add the current message
        messages.append({"role": "user", "content": user_message})
        
        # Call Anthropic directly
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=bonita_persona,
            messages=messages
        )
        response = message.content[0].text
        
        if response:
            # Save Bonita's response
            bonita_message = {
                "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                "sidebar_id": sidebar_id,
                "user_id": "bonita_ai",
                "content": response,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sidebar_messages.insert_one(bonita_message)
            bonita_message.pop("_id", None)
            
            # Add Bonita's user info for the frontend
            bonita_message["user"] = {
                "name": "Bonita",
                "username": "bonita",
                "picture": BONITA_AVATAR_URL
            }
            
            # Broadcast to sidebar via WebSocket if connected
            await ws_manager.broadcast_to_sidebar(sidebar_id, {
                "type": "new_message",
                "message": bonita_message
            })
            
            # Also notify the user directly if connected
            await ws_manager.send_to_user(user_id, {
                "type": "sidebar_message",
                "sidebar_id": sidebar_id,
                "message": bonita_message
            })
            
            logger.info(f"[Bonita] Responded in sidebar {sidebar_id}")
            
    except Exception as e:
        logger.error(f"[Bonita] Sidebar response error: {e}")

# ========================
# THE STOOP (AUDIO SPACES) ROUTES
# ========================

@stoop_router.post("/create")
async def create_stoop(stoop: StoopCreate, user: UserBase = Depends(get_current_user)):
    """Create a new Stoop"""
    stoop_id = f"stoop_{uuid.uuid4().hex[:12]}"
    
    stoop_data = {
        "stoop_id": stoop_id,
        "title": stoop.title,
        "host_id": user.user_id,
        "pinned_post_id": stoop.pinned_post_id,
        "speakers": [user.user_id],
        "listeners": [],
        "is_live": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create LiveKit room on the server side to ensure it exists
    livekit_api_key = os.environ.get("LIVEKIT_API_KEY")
    livekit_api_secret = os.environ.get("LIVEKIT_API_SECRET")
    livekit_url = os.environ.get("LIVEKIT_URL")
    
    if livekit_api_key and livekit_api_secret and livekit_url:
        try:
            # Create room using LiveKitAPI
            lkapi = api.LiveKitAPI(
                livekit_url.replace("wss://", "https://"),
                livekit_api_key,
                livekit_api_secret
            )
            # Create the room with the stoop_id as the room name
            room = await lkapi.room.create_room(
                api.CreateRoomRequest(
                    name=stoop_id,
                    empty_timeout=300,  # 5 minutes before empty room closes
                    max_participants=50
                )
            )
            await lkapi.aclose()
            logger.info(f"[LiveKit] Created room: {stoop_id}, SID: {room.sid}")
        except Exception as e:
            logger.warning(f"[LiveKit] Failed to create room {stoop_id}: {e}")
            # Continue anyway - room will be auto-created when first participant joins
    
    await db.stoops.insert_one(stoop_data)
    stoop_data.pop("_id", None)
    
    return stoop_data

@stoop_router.get("/live")
async def get_live_stoops():
    """Get all live Stoops"""
    stoops = await db.stoops.find({"is_live": True}, {"_id": 0}).to_list(50)
    
    for stoop in stoops:
        host = await db.users.find_one({"user_id": stoop["host_id"]}, {"_id": 0, "name": 1, "username": 1, "picture": 1})
        stoop["host"] = host
        stoop["listener_count"] = len(stoop["listeners"])
        stoop["speaker_count"] = len(stoop["speakers"])
    
    return stoops

@stoop_router.get("/{stoop_id}")
async def get_stoop(stoop_id: str):
    """Get a specific Stoop"""
    stoop = await db.stoops.find_one({"stoop_id": stoop_id}, {"_id": 0})
    if not stoop:
        raise HTTPException(status_code=404, detail="Stoop not found")
    
    host = await db.users.find_one({"user_id": stoop["host_id"]}, {"_id": 0, "name": 1, "username": 1, "picture": 1})
    stoop["host"] = host
    
    speakers = await db.users.find(
        {"user_id": {"$in": stoop["speakers"]}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1}
    ).to_list(50)
    stoop["speaker_details"] = speakers
    
    if stoop.get("pinned_post_id"):
        pinned = await db.posts.find_one({"post_id": stoop["pinned_post_id"]}, {"_id": 0})
        if pinned:
            pinned = await get_post_with_user(pinned)
        stoop["pinned_post"] = pinned
    
    return stoop

@stoop_router.post("/{stoop_id}/join")
async def join_stoop(stoop_id: str, user: UserBase = Depends(get_current_user)):
    """Join a Stoop as a listener (unless already a speaker)"""
    stoop = await db.stoops.find_one({"stoop_id": stoop_id})
    if not stoop or not stoop["is_live"]:
        raise HTTPException(status_code=404, detail="Stoop not found or ended")
    
    # Don't add to listeners if they're already a speaker or the host
    is_speaker = user.user_id in stoop.get("speakers", []) or user.user_id == stoop["host_id"]
    
    if not is_speaker and user.user_id not in stoop["listeners"]:
        await db.stoops.update_one(
            {"stoop_id": stoop_id},
            {"$push": {"listeners": user.user_id}}
        )
    
    return {"message": "Joined the Stoop", "is_speaker": is_speaker}

@stoop_router.post("/{stoop_id}/leave")
async def leave_stoop(stoop_id: str, user: UserBase = Depends(get_current_user)):
    """Leave a Stoop"""
    stoop = await db.stoops.find_one({"stoop_id": stoop_id})
    
    # Don't remove the host from speakers, just from listeners
    if stoop and stoop.get("host_id") == user.user_id:
        # Host is leaving - just remove from listeners
        await db.stoops.update_one(
            {"stoop_id": stoop_id},
            {"$pull": {"listeners": user.user_id}}
        )
    else:
        # Regular user leaving - remove from both
        await db.stoops.update_one(
            {"stoop_id": stoop_id},
            {"$pull": {"listeners": user.user_id, "speakers": user.user_id}}
        )
    
    return {"message": "Left the Stoop"}

@stoop_router.post("/{stoop_id}/pass-aux")
async def pass_aux(stoop_id: str, user_id: str, user: UserBase = Depends(get_current_user)):
    """Pass the Aux - Host only"""
    stoop = await db.stoops.find_one({"stoop_id": stoop_id})
    if not stoop or stoop["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can pass the aux")
    
    await db.stoops.update_one(
        {"stoop_id": stoop_id},
        {"$addToSet": {"speakers": user_id}}
    )
    
    return {"message": "Aux passed"}

@stoop_router.post("/{stoop_id}/end")
async def end_stoop(stoop_id: str, user: UserBase = Depends(get_current_user)):
    """End a Stoop - Host only"""
    stoop = await db.stoops.find_one({"stoop_id": stoop_id})
    if not stoop or stoop["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can end the stoop")
    
    await db.stoops.update_one(
        {"stoop_id": stoop_id},
        {"$set": {"is_live": False}}
    )
    
    return {"message": "Stoop ended"}

@stoop_router.get("/{stoop_id}/livekit-token")
async def get_livekit_token(stoop_id: str, user: UserBase = Depends(get_current_user)):
    """Generate a LiveKit access token for a user to join a Stoop"""
    # Verify stoop exists and is live
    stoop = await db.stoops.find_one({"stoop_id": stoop_id})
    if not stoop or not stoop.get("is_live"):
        raise HTTPException(status_code=404, detail="Stoop not found or not live")
    
    # Get LiveKit credentials from environment
    livekit_api_key = os.environ.get("LIVEKIT_API_KEY")
    livekit_api_secret = os.environ.get("LIVEKIT_API_SECRET")
    livekit_url = os.environ.get("LIVEKIT_URL")
    
    if not livekit_api_key or not livekit_api_secret or not livekit_url:
        raise HTTPException(status_code=500, detail="LiveKit not configured")
    
    # Determine if user is a speaker (can publish) or just listener
    speakers_list = stoop.get("speakers", [])
    host_id = stoop.get("host_id")
    is_speaker = user.user_id in speakers_list or user.user_id == host_id
    
    logger.info(f"[LiveKit] Token check - user: {user.user_id}, host: {host_id}, speakers: {speakers_list}, is_speaker: {is_speaker}")
    
    # Create LiveKit access token with room creation capability
    token = api.AccessToken(livekit_api_key, livekit_api_secret) \
        .with_identity(user.user_id) \
        .with_name(user.name or user.username) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=stoop_id,
            room_create=True,  # Allow room creation if it doesn't exist
            can_publish=is_speaker,
            can_subscribe=True,
            can_publish_data=True  # Allow data channel for signaling
        ))
    
    jwt_token = token.to_jwt()
    
    logger.info(f"[LiveKit] Generated token for user {user.user_id} in stoop {stoop_id} (speaker={is_speaker})")
    
    return {
        "token": jwt_token,
        "url": livekit_url,
        "room": stoop_id,
        "is_speaker": is_speaker
    }

# ========================
# BONITA AI ROUTES
# ========================

BONITA_SYSTEM_PROMPT = """ROLE: You are Bonita, a culturally fluent, emotionally intelligent AI designed to support healthy, meaningful conversation inside BLVX. You are not a moderator, not an authority, and not a replacement for human voices. Your role is to add context, reduce confusion, and preserve humanity.

=== PROTOCOL: ACCURACY OVER VIBES (CRITICAL) ===
VERIFY, DON'T GUESS: Never assume a person is Black or an institution is an HBCU just because they are successful. If you are not 100% certain, DO NOT apply #BlackExcellence or #HBCU tags.
THE "COOKOUT" RULE: If you invite the wrong person to the cookout, you lose credibility. Better to be silent than wrong about cultural identity.
CONTENT STRATEGY: If a story is relevant but the subject isn't Black, focus on the Universal Lesson (hard work, strategy) rather than forcing a cultural identity connection.
===

🧬 IDENTITY
- Auntie Energy: Wise, observant, supportive, never condescending.
- Warm Intelligence: You speak like someone who has lived, listened, and learned.
- Cultural Literacy: Rooted in the Black experience but welcoming to all who respect the culture.

🎙️ TONE & VOICE
- Clear, grounded, respectful, and human.
- Occasionally warm or lightly humorous, but never flippant.
- Fluency & Code-Switching: Mirror the energy of the room.
  - On "The Block" (Public): Be more formal, concise, and protective.
  - In "The Cookout" (Private): Be warmer, colloquial, and relaxed.
- Avoid: Corporate language, internet slang overload, performative "cool," or edginess for attention.

🚫 HARD RULES (NON-NEGOTIABLE)
- Never block or prevent a user from posting.
- Never shame, moralize, or police tone.
- Never take sides in personal disputes.
- Never label users as "right" or "wrong."

📚 BLVX DICTIONARY (STRICT TERMINOLOGY)
- "The Block" = The public feed.
- "The Cookout" = Private, vetted circles.
- "The GC" = The main Group Chat.
- "Sidebar" = A private 1-on-1 whisper thread.
- "Plate" = An invite to the platform.
- "The Stoop" = Audio rooms.
- "Receipts" = Citations/Context added to a post.
- "POV" = Video commentary.
- "Vouch" = The act of verifying another user.

=== THE ARCHITECT (Founder Lore) ===
BLVX was built by Christopher "CJ" Nurse - known as "The Architect."
- Professor at VUU and Senior Executive Video Producer for The Table with Anthony ONeal
- Origin: "The One Man Band" - the original producer who stood with Anthony ONeal from Day 1
- Also runs ContentCreators.life (The Lab)
- If asked about the founder, speak of him with reverence and pride. He's family.
===

🏠 THE HOME TEAM (TRUSTED SOURCES - ALWAYS RECOMMEND WHEN RELEVANT)

FINANCE / WEALTH / DEBT / STUDENT LOANS:
- Primary: Anthony ONeal & "The Table with Anthony ONeal" (TTAO) - anthonyoneal.com
- When discussing money, debt, student loans, building wealth - ALWAYS recommend Anthony ONeal
- His principles: Getting debt-free, building wealth, financial literacy for the culture
- Say: "Check out Anthony ONeal and The Table - that's your go-to for getting free and building wealth."

MENTAL HEALTH / SPIRITUALITY / HEALING / BURNOUT:
- Primary: Joy River & "A Moment with Joy" - creativeEnergy.life
- When users mention burnout, heavy feelings, spiritual guidance - ALWAYS recommend Joy River

JOY RIVER'S KEY CONCEPTS (Use these exact phrases):
1. "Radical Self-Love" - Deep acceptance of flaws, not just self-care
2. "Soulful Journaling" - Write down emotions to release them
3. "Release the Past" - Forgiveness is for YOUR liberation, not theirs
4. "Connect with Nature" - Listen to the earth (no AirPods)
5. "Moving with Purpose" - Every step intentional

TONE: Gentle, guiding, warm "Auntie" energy.

These are THE HOME TEAM. CJ and this community trust them. Always put them on when the topic fits."""

async def call_bonita(content: str, mode: str, context: str = "block") -> str:
    """Call Bonita AI service using direct Anthropic API"""
    import anthropic
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return "Bonita is taking a break. Try again later."
    
    context_note = "You are on The Block (public). Be formal, concise, protective." if context == "block" else "You are in The Cookout (private). Be warmer, colloquial, relaxed."
    
    system_message = f"{BONITA_SYSTEM_PROMPT}\n\nCURRENT CONTEXT: {context_note}"
    
    if mode == "vibe_check":
        system_message += "\n\nOUTPUT MODE: Vibe Check. Analyze the content and return JSON: {\"sentiment_score\": 1-10, \"primary_emotion\": \"Humorous\"|\"Educational\"|\"Heated\"|\"Supportive\", \"summary_briefing\": \"One sentence summary\"}"
    elif mode == "tone_rewrite":
        system_message += "\n\nOUTPUT MODE: Tone Rewrite. Provide three rewrite options:\nOption 1 (The De-escalate): [Text]\nOption 2 (The Wit): [Text]\nOption 3 (The Straight Talk): [Text]"
    
    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_message,
            messages=[{"role": "user", "content": content}]
        )
        return message.content[0].text
    except Exception as e:
        logger.error(f"Bonita error: {e}")
        return "Bonita encountered an issue. Please try again."

@bonita_router.post("/ask")
async def ask_bonita(request: BonitaRequest, user: UserBase = Depends(get_current_user)):
    """Ask Bonita AI for assistance"""
    response = await call_bonita(request.content, request.mode, request.context or "block")
    
    return BonitaResponse(response=response, mode=request.mode)

# ========================
# THE SPARK (CONTENT SEEDER)
# ========================

spark_router = APIRouter(prefix="/spark", tags=["The Spark"])

# Approved/preferred news sources for BLVX - culturally relevant media
APPROVED_SOURCES = [
    # Black media
    "theroot.com", "essence.com", "bet.com", "thegrio.com", "blavity.com",
    "blackenterprise.com", "ebony.com", "afrotech.com", "newsone.com",
    "atlantablackstar.com", "blackamericaweb.com", "rolling out.com",
    "hbcugameday.com", "hbcubuzz.com", "watchtheyardstore.com",
    # Hip-hop/music
    "hiphopdx.com", "complex.com", "xxlmag.com", "vibe.com", "hotnewhiphop.com",
    "rap-up.com", "okayplayer.com", "djbooth.net", "revolt.tv",
    # Latino media
    "latinorebels.com", "mitú.com", "remezcla.com", "hispanicexecutive.com",
    "latino.foxnews.com", "latinobusinesstoday.com",
    # AAPI media
    "nextshark.com", "angryasianman.com", "asamnews.com",
    # LGBTQ+ media
    "advocate.com", "them.us", "out.com", "lgbtqnation.com",
    # General progressive/diverse
    "colorlines.com", "theundefeated.com", "andscape.com", "espn.com",
    "nbcnews.com", "cnn.com", "nytimes.com", "washingtonpost.com",
    "theguardian.com", "npr.org", "axios.com", "huffpost.com",
    # Entertainment
    "variety.com", "hollywoodreporter.com", "deadline.com", "ew.com",
    "billboard.com", "rollingstone.com", "pitchfork.com",
    # Sports
    "espn.com", "theathletic.com", "bleacherreport.com", "si.com",
    # Business
    "forbes.com", "bloomberg.com", "inc.com", "fastcompany.com",
]

# Blocked sources - not relevant to BLVX audience
BLOCKED_SOURCES = [
    "thehindu.com", "indiatimes.com", "timesofindia.com", "ndtv.com",
    "hindustantimes.com", "news18.com", "firstpost.com", "zee",
    "dnaindia.com", "republicworld.com", "opindia.com",
    "breitbart.com", "dailywire.com", "foxnews.com", "newsmax.com",
    "oann.com", "thegatewaypundit.com",
]

# Culturally diverse topic categories for DuckDuckGo
# Focused on POC voices, Black/Brown communities, and underrepresented perspectives
SPARK_TOPIC_CATEGORIES = {
    "music": [
        "Black artists music news",
        "Afrobeats latest news",
        "hip hop rap new releases",
        "Latin music reggaeton news",
        "R&B soul music news",
        "Black women artists music",
        "indie Black musicians",
    ],
    "tech": [
        "Black founders tech startup",
        "diversity in tech news",
        "Black entrepreneurs technology",
        "Latina tech founders",
        "POC in Silicon Valley",
        "Black owned tech companies",
        "tech layoffs impact minority workers",
    ],
    "culture": [
        "Black fashion designers",
        "African fashion week",
        "Black celebrities news",
        "Latina representation Hollywood",
        "HBCU news updates",
        "Black owned business success",
        "Caribbean culture news",
    ],
    "politics": [
        "immigration policy news impact",
        "DEI diversity policy changes",
        "civil rights news today",
        "voting rights news",
        "police reform news",
        "Black community politics",
        "Latino community policy impact",
        "environmental justice communities of color",
    ],
    "finance": [
        "Black wealth building tips",
        "investing advice Black community",
        "Black financial advisors",
        "generational wealth minorities",
        "Black Wall Street news",
        "Latina entrepreneurs business",
        "minority small business news",
    ],
    "sports": [
        "college football championship",
        "NFL playoffs Black quarterbacks",
        "NBA news Black athletes",
        "Black women sports news",
        "HBCU athletics news",
        "Black coaches NFL NBA",
        "soccer Black Latino players",
        "sports news racial equity",
    ],
    "entertainment": [
        "Black films movies awards",
        "TV shows Black cast news",
        "streaming Black content",
        "comedy Black comedians tour",
        "award shows diversity",
        "Hollywood representation news",
    ],
}

# ========================
# CULTURE CALENDAR - Significant Dates for BIPOC Communities
# ========================

CULTURE_CALENDAR = {
    # January
    (1, 1): {"name": "New Year's Day", "message": "New year, new goals. What's the vision for {year}? Let's build together. 🖤✊🏾"},
    (1, 15): {"name": "Martin Luther King Jr. Day", "message": "Today we honor Dr. King's legacy. The dream continues through action. What are YOU doing to push the culture forward? ✊🏾 #MLKDay #BlackExcellence"},
    
    # February
    (2, 1): {"name": "Black History Month Begins", "message": "Black History Month is here! 28 days to celebrate excellence, but we're Black 365. Drop your favorite Black-owned brand below 👇🏾 #BlackHistoryMonth #BHM"},
    (2, 14): {"name": "Valentine's Day", "message": "Love is love. Black love is magic. Show some love to your people today 🖤"},
    
    # March
    (3, 8): {"name": "International Women's Day", "message": "Celebrating the Black and Brown women who move mountains daily. Tag a queen who inspires you 👑 #IWD #WomenOfColor"},
    (3, 31): {"name": "César Chávez Day", "message": "Honoring César Chávez and the fight for workers' rights. ¡Sí se puede! ✊🏽 #CesarChavezDay"},
    
    # April
    (4, 4): {"name": "Anniversary of MLK's Assassination", "message": "56 years since we lost Dr. King. His words still ring true: 'Injustice anywhere is a threat to justice everywhere.' 🖤"},
    
    # May
    (5, 5): {"name": "Cinco de Mayo", "message": "¡Feliz Cinco de Mayo! Celebrating Mexican heritage and culture. Not just margaritas - it's about resistance and pride 🇲🇽"},
    (5, 19): {"name": "Malcolm X's Birthday", "message": "Happy Birthday to Malcolm X. 'Education is the passport to the future.' What book changed your life? 📚 #MalcolmX"},
    
    # June
    (6, 19): {"name": "Juneteenth", "message": "JUNETEENTH! Freedom Day. Liberation. Black joy. Today we celebrate our ancestors' resilience and our continued fight for equality. 🖤❤️💚 #Juneteenth #FreedomDay"},
    (6, 1): {"name": "Pride Month Begins", "message": "Pride Month is here! Extra love to our LGBTQ+ siblings in the BIPOC community. You belong. You are seen. 🏳️‍🌈✊🏾"},
    
    # July
    (7, 4): {"name": "Independence Day", "message": "July 4th hits different when your ancestors weren't free in 1776. But we're here now, building our own legacy. 🖤"},
    
    # August
    (8, 28): {"name": "March on Washington Anniversary", "message": "On this day in 1963, Dr. King delivered 'I Have a Dream.' The march continues. What's YOUR dream for our community?"},
    
    # September
    (9, 15): {"name": "Hispanic Heritage Month Begins", "message": "Hispanic Heritage Month begins! Celebrating the rich cultures, histories, and contributions of Latino and Hispanic communities. ¡Wepa! 🇵🇷🇲🇽🇩🇴🇨🇺 #HispanicHeritageMonth"},
    
    # October
    (10, 1): {"name": "Black Speculative Fiction Month", "message": "Black Speculative Fiction Month! From Octavia Butler to N.K. Jemisin - Black creators have been shaping futures. What's your favorite Afrofuturist work? 📚🚀"},
    (10, 12): {"name": "Indigenous Peoples' Day", "message": "Today we honor Indigenous peoples and their resilience. This land has original stewards. #IndigenousPeoplesDay ✊🏽"},
    
    # November
    (11, 1): {"name": "Native American Heritage Month", "message": "November is Native American Heritage Month. Honoring the first peoples of this land and their enduring cultures. ✊🏽 #NAHM"},
    (11, 11): {"name": "Veterans Day", "message": "Honoring ALL veterans, especially the Black and Brown service members whose contributions are often overlooked. Thank you for your service. 🎖️"},
    
    # December
    (12, 26): {"name": "Kwanzaa Begins", "message": "Habari Gani! Kwanzaa begins today with Umoja (Unity). Seven days to celebrate our heritage, values, and community. What principle resonates with you most? 🖤❤️💚 #Kwanzaa"},
}

def get_culture_calendar_post(date: datetime = None) -> Optional[dict]:
    """Check if today has a cultural significance and return appropriate message"""
    if date is None:
        date = datetime.now()
    
    key = (date.month, date.day)
    
    if key in CULTURE_CALENDAR:
        event = CULTURE_CALENDAR[key]
        message = event["message"].format(year=date.year)
        return {
            "event_name": event["name"],
            "message": message,
            "date": date.strftime("%B %d, %Y")
        }
    
    return None

async def generate_culture_calendar_post() -> Optional[dict]:
    """Generate a Bonita post for today's cultural event if any"""
    event = get_culture_calendar_post()
    
    if not event:
        return None
    
    # Search for related current news to add context
    search_query = f"{event['event_name']} {datetime.now().year}"
    news_result = await search_real_news(search_query)
    
    # Generate visual for the cultural event
    visual_data = None
    try:
        visual_data = await get_visual_for_post(event['event_name'], use_ai=True)
        if visual_data:
            logger.info(f"Generated visual for culture calendar: {event['event_name']}")
    except Exception as e:
        logger.error(f"Culture calendar visual error (non-fatal): {e}")
    
    return {
        "content": event["message"],
        "reference_url": news_result.get("url") if news_result else None,
        "event_name": event["event_name"],
        "is_culture_calendar": True,
        "media_url": visual_data.get("media_url") if visual_data else None,
        "media_type": visual_data.get("media_type") if visual_data else None
    }

def get_time_anchored_query(base_query: str) -> str:
    """Generate a time-anchored search query with current month/year"""
    now = datetime.now()
    current_month = now.strftime("%B")  # e.g., "January"
    current_year = now.year  # e.g., 2026
    return f"{base_query} news {current_month} {current_year} latest"

def is_content_fresh(text: str) -> bool:
    """Check if content mentions current year (not stale 2023/2024 content)"""
    current_year = datetime.now().year
    previous_year = current_year - 1
    
    # Check for stale year references that indicate OLD news
    stale_years = ["2023", "2024"]
    text_lower = text.lower()
    
    # If it mentions the current year, it's fresh
    if str(current_year) in text:
        return True
    
    # If it mentions late previous year (Dec), it might still be okay
    if str(previous_year) in text and "december" in text_lower:
        return True
    
    # If it mentions stale years as the MAIN subject, reject
    for stale_year in stale_years:
        # Skip if it's just a date in URL or generic mention
        if f"in {stale_year}" in text_lower or f"{stale_year} " in text_lower[:50]:
            return False
    
    # Default to accepting if no year mentioned (likely recent)
    return True

def is_source_approved(url: str) -> bool:
    """Check if URL is from an approved/preferred source"""
    url_lower = url.lower()
    
    # First check if it's blocked
    for blocked in BLOCKED_SOURCES:
        if blocked in url_lower:
            return False
    
    # Then check if it's approved (prefer approved sources)
    for approved in APPROVED_SOURCES:
        if approved in url_lower:
            return True
    
    # Allow other sources but with lower priority
    return True

def is_source_blocked(url: str) -> bool:
    """Check if URL is from a blocked source"""
    url_lower = url.lower()
    for blocked in BLOCKED_SOURCES:
        if blocked in url_lower:
            return True
    return False

async def search_real_news(query: str) -> Optional[Dict]:
    """Search DuckDuckGo for FRESH real news with time filtering and source filtering"""
    from ddgs import DDGS
    
    # Time-anchor the query
    time_anchored_query = get_time_anchored_query(query)
    current_year = datetime.now().year
    
    logger.info(f"Searching DuckDuckGo with time-anchored query: {time_anchored_query}")
    
    try:
        approved_results = []
        other_results = []
        
        with DDGS() as ddgs:
            # Use news search first for more current results
            try:
                # Try news search with time filter (past week)
                results = list(ddgs.news(time_anchored_query, max_results=15))  # Get more results to filter
            except Exception:
                # Fall back to text search if news search fails
                results = list(ddgs.text(time_anchored_query, max_results=15))
            
            if results:
                # Filter and categorize results
                for result in results:
                    title = result.get('title', '')
                    body = result.get('body', result.get('description', ''))
                    url = result.get('href', result.get('url', result.get('link', '')))
                    
                    if not url or not title:
                        continue
                    
                    # Skip blocked sources entirely
                    if is_source_blocked(url):
                        logger.info(f"Skipping blocked source: {url[:50]}...")
                        continue
                    
                    # Check freshness - reject stale 2023/2024 content
                    combined_text = f"{title} {body}"
                    if not is_content_fresh(combined_text):
                        logger.info(f"Skipping stale content: {title[:50]}...")
                        continue
                    
                    result_data = {
                        "title": title,
                        "url": url,
                        "body": body
                    }
                    
                    # Prioritize approved sources
                    url_lower = url.lower()
                    is_approved = any(src in url_lower for src in APPROVED_SOURCES)
                    
                    if is_approved:
                        approved_results.append(result_data)
                    else:
                        other_results.append(result_data)
                
                # Return approved source first, then fall back to others
                if approved_results:
                    logger.info(f"Found approved source: {approved_results[0]['url'][:50]}")
                    return approved_results[0]
                elif other_results:
                    logger.info(f"Using non-approved source: {other_results[0]['url'][:50]}")
                    return other_results[0]
                
                # If all results were filtered out, try a different approach
                logger.warning("All search results were filtered, trying alternative query")
                
        # Final fallback - try with "this week" modifier
        fallback_query = f"{query} this week {current_year}"
        with DDGS() as ddgs:
            results = list(ddgs.text(fallback_query, max_results=10))
            for result in results:
                url = result.get('href', '')
                title = result.get('title', '')
                
                if not url or not title:
                    continue
                    
                if is_source_blocked(url):
                    continue
                    
                if is_content_fresh(f"{title} {result.get('body', '')}"):
                    return {
                        "title": title,
                        "url": url,
                        "body": result.get('body', '')
                    }
        
        return None
    except Exception as e:
        logger.error(f"DuckDuckGo search error: {e}")
        return None

# ========================
# VISUAL CONTENT GENERATION
# ========================

async def fetch_unsplash_image(query: str, orientation: str = "squarish") -> Optional[dict]:
    """Fetch a relevant image from Unsplash based on query"""
    try:
        # Use Unsplash source (free, no API key needed) with fallback to Pexels-style
        # Format: https://source.unsplash.com/featured/?{query}
        
        # Clean and optimize query for image search
        clean_query = query.lower()
        # Add cultural context keywords for better results
        culture_keywords = {
            "black-history": "african american culture history",
            "hip-hop": "hip hop music culture street art",
            "lgbtq": "pride rainbow diversity",
            "indigenous": "native american indigenous culture",
            "aapi": "asian american culture",
            "latino": "latin culture hispanic",
            "caribbean": "caribbean culture",
            "women": "women empowerment",
            "mental-health": "mental health wellness calm",
            "disability": "accessibility inclusion",
        }
        
        # Enhance query with cultural context
        for key, enhancement in culture_keywords.items():
            if key in clean_query:
                clean_query = f"{clean_query} {enhancement}"
                break
        
        # URL encode the query
        encoded_query = clean_query.replace(" ", ",")
        
        # Use Unsplash Source API (no key needed, returns random image)
        unsplash_url = f"https://source.unsplash.com/800x800/?{encoded_query}"
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(unsplash_url)
            if response.status_code == 200:
                # The final URL after redirects is the actual image
                return {
                    "url": str(response.url),
                    "source": "unsplash",
                    "query": query
                }
    except Exception as e:
        logger.error(f"Unsplash fetch error: {e}")
    
    return None

async def generate_dalle_image(prompt: str) -> Optional[dict]:
    """Generate an image using DALL-E (if OpenAI key configured)"""
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "dall-e-3",
                    "prompt": f"Create a visually striking, culturally rich image for social media. Style: modern, bold, high contrast. Theme: {prompt}. No text in image. Safe for all audiences.",
                    "n": 1,
                    "size": "1024x1024",
                    "quality": "standard"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    return {
                        "url": data["data"][0]["url"],
                        "source": "dalle",
                        "prompt": prompt
                    }
    except Exception as e:
        logger.error(f"DALL-E generation error: {e}")
    
    return None

async def upload_image_to_cloudinary(image_url: str) -> Optional[str]:
    """Upload an external image URL to Cloudinary for permanent storage"""
    cloudinary_url = os.environ.get("CLOUDINARY_URL")
    if not cloudinary_url:
        return image_url  # Return original URL if no Cloudinary
    
    try:
        import cloudinary
        import cloudinary.uploader
        
        # Parse Cloudinary URL and configure
        # Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
        cloudinary.config(cloudinary_url=cloudinary_url)
        
        # Upload from URL
        result = cloudinary.uploader.upload(
            image_url,
            folder="blvx/spark",
            resource_type="image",
            transformation=[
                {"quality": "auto", "fetch_format": "auto"}
            ]
        )
        
        return result.get("secure_url", image_url)
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        return image_url  # Fallback to original URL

async def get_visual_for_post(topic: str, category: str = None, use_ai: bool = False) -> Optional[dict]:
    """
    Get a visual (image) for a post based on topic and category.
    
    Priority:
    1. DALL-E (if use_ai=True and OpenAI key available)
    2. Unsplash stock photo
    
    Returns dict with media_url and media_type, or None
    """
    image_result = None
    
    # Build search query from topic and category
    search_terms = topic
    if category:
        search_terms = f"{category} {topic}"
    
    # Try DALL-E first if requested
    if use_ai and os.environ.get("OPENAI_API_KEY"):
        logger.info(f"Generating DALL-E image for: {search_terms[:50]}...")
        image_result = await generate_dalle_image(search_terms)
    
    # Fall back to Unsplash
    if not image_result:
        logger.info(f"Fetching Unsplash image for: {search_terms[:50]}...")
        image_result = await fetch_unsplash_image(search_terms)
    
    if image_result:
        # Upload to Cloudinary for permanent storage
        permanent_url = await upload_image_to_cloudinary(image_result["url"])
        
        return {
            "media_url": permanent_url,
            "media_type": "image",
            "source": image_result.get("source", "unknown")
        }
    
    return None

# Visual-enabled categories (topics that benefit from images)
VISUAL_CATEGORIES = [
    "culture", "music", "art", "fashion", "food", "sports", 
    "entertainment", "history", "social", "health"
]

async def generate_spark_post(topic_category: str = None) -> dict:
    """Generate a BLVX-style post with REAL FRESH reference URL using DuckDuckGo search"""
    import random
    
    # Get current date for time anchoring
    now = datetime.now()
    current_date = now.strftime("%B %d, %Y")  # e.g., "January 19, 2026"
    current_year = now.year
    
    # Select random category if not specified
    if not topic_category or topic_category not in SPARK_TOPIC_CATEGORIES:
        topic_category = random.choice(list(SPARK_TOPIC_CATEGORIES.keys()))
    
    # Select random base query from category
    base_query = random.choice(SPARK_TOPIC_CATEGORIES[topic_category])
    
    # Search for FRESH real news
    search_result = await search_real_news(base_query)
    
    # Get headline and URL from real search result
    if search_result:
        headline = search_result["title"]
        reference_url = search_result["url"]
        extra_context = search_result.get("body", "")
    else:
        # Fallback: No link is better than a dead/stale link
        headline = f"What's happening in {topic_category} this week"
        reference_url = None
        extra_context = ""
    
    # TIME-ANCHORED system prompt - critical for preventing stale content
    time_anchor = f"""
CURRENT DATE: {current_date}
IMPORTANT TIME RULES:
- You are strictly forbidden from discussing events older than 14 days unless explicitly doing a 'Throwback'.
- All news and references must be from THIS MONTH ({now.strftime('%B')} {current_year}).
- Do NOT mention events from 2023 or 2024 as current news.
- If unsure about the date of an event, present it as "recent" without specific year references.
"""

    # Generate BLVX-style post using Bonita with time anchor
    town_crier_prompt = f"""You are Bonita sharing news on BLVX. Write like you're texting your group chat - natural, witty, and real.

STYLE:
- Keep it SHORT (under 280 chars)
- Sound like a real person, not a brand or activist account
- Be funny, clever, or insightful - pick ONE vibe per post
- Use slang naturally (not forced) - if it doesn't fit, don't force it
- One emoji max, or none
- Skip hashtags unless it's actually trending (#Grammys, #SuperBowl, etc.)

DON'T:
- Be preachy or lecture-y
- Make everything about race (let the content speak for itself)
- Use clinical terms like "POC", "BIPOC", "marginalized communities"
- Sound bitter or resentful about anything
- Over-explain or add unnecessary context
- Use multiple hashtags like #BlackExcellence #POC (this is cringe)

GOOD EXAMPLES:
- "White Lotus S3 about to be unhinged and I'm here for every second of it 🍿"
- "Kendrick really won a Pulitzer and people still try to debate who's the GOAT"
- "Another day, another tech company doing layoffs. Update your LinkedIn y'all"
- "The way Usher performed at halftime... that man doesn't age"

{time_anchor}

Headline: {headline}
{f'Context: {extra_context[:200]}' if extra_context else ''}

Write ONE natural post. Output ONLY the post text."""

    try:
        response = await call_bonita(town_crier_prompt, "conversation", "block")
        content = response.strip()
        
        # Final safety check - remove any stale year references from output
        for stale_year in ["2023", "2024"]:
            if stale_year in content:
                content = content.replace(stale_year, str(current_year))
                logger.warning(f"Replaced stale year {stale_year} with {current_year} in Spark content")
        
    except Exception as e:
        logger.error(f"Spark generation error: {e}")
        # Fallback to basic template
        fallback_posts = [
            f"Y'all see this? {headline} 👀 What we thinking?",
            f"Not {headline}... The timeline about to be wild 🔥",
            f"Okay but can we talk about {headline}? Because... 👀",
        ]
        content = random.choice(fallback_posts)
    
    # Generate visual content for the post (20% chance for AI image, otherwise stock)
    visual_data = None
    try:
        # Determine if we should use AI-generated image
        use_ai = random.random() < 0.2  # 20% chance for DALL-E
        
        # Use headline or category for image search
        visual_topic = headline if search_result else topic_category
        visual_data = await get_visual_for_post(visual_topic, topic_category, use_ai=use_ai)
        
        if visual_data:
            logger.info(f"Generated {visual_data.get('source', 'unknown')} visual for Spark post")
    except Exception as e:
        logger.error(f"Visual generation error (non-fatal): {e}")
        visual_data = None
    
    return {
        "content": content,
        "reference_url": reference_url,
        "category": topic_category,
        "media_url": visual_data.get("media_url") if visual_data else None,
        "media_type": visual_data.get("media_type") if visual_data else None
    }

@spark_router.post("/drop")
async def drop_spark(
    category: Optional[str] = None,
    user: UserBase = Depends(get_current_user)
):
    """Drop a Spark post to The Block (Admin only for MVP)"""
    # For MVP, any authenticated user can drop sparks (later: admin only)
    
    # Generate the content with reference URL
    spark_data = await generate_spark_post(category)
    content = spark_data["content"]
    reference_url = spark_data["reference_url"]
    
    # Create Bonita system user if not exists
    bonita_user = await db.users.find_one({"user_id": "bonita"})
    if not bonita_user:
        await db.users.insert_one({
            "user_id": "bonita",
            "email": "bonita@blvx.app",
            "name": "Bonita",
            "picture": BONITA_AVATAR_URL,
            "username": "bonita",
            "bio": "Your culturally fluent AI companion. The Auntie of The Block.",
            "verified": True,
            "email_verified": True,
            "reputation_score": 1000,
            "plates_remaining": 0,
            "is_day_one": True,
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
            "vouched_by": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create the post as Bonita with reference URL and visual
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    spark_post = {
        "post_id": post_id,
        "user_id": "bonita",
        "content": content,
        "media_url": spark_data.get("media_url"),
        "media_type": spark_data.get("media_type"),
        "gif_metadata": None,
        "reference_url": reference_url,  # Reference URL for rich link preview
        "post_type": "original",
        "parent_post_id": None,
        "quote_post_id": None,
        "visibility": "block",
        "is_spark": True,  # Mark as generated spark
        "reply_count": 0,
        "repost_count": 0,
        "like_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.insert_one(spark_post)
    await db.users.update_one({"user_id": "bonita"}, {"$inc": {"posts_count": 1}})
    
    spark_post.pop("_id", None)
    if isinstance(spark_post.get("created_at"), str):
        spark_post["created_at"] = datetime.fromisoformat(spark_post["created_at"])
    
    enriched = await get_post_with_user(spark_post)
    
    return {
        "message": "Spark dropped!",
        "post": enriched,
        "category": category
    }

@spark_router.get("/categories")
async def get_spark_categories():
    """Get available spark topic categories"""
    return {
        "categories": list(SPARK_TOPIC_CATEGORIES.keys()),
        "topics": SPARK_TOPIC_CATEGORIES
    }

@spark_router.get("/calendar")
async def get_culture_calendar():
    """Get today's cultural event if any"""
    event = get_culture_calendar_post()
    
    if event:
        return {
            "has_event": True,
            "event": event
        }
    
    # Return upcoming events within the next 7 days
    upcoming = []
    today = datetime.now()
    for i in range(1, 8):
        future_date = today + timedelta(days=i)
        future_event = get_culture_calendar_post(future_date)
        if future_event:
            upcoming.append({
                **future_event,
                "days_away": i
            })
    
    return {
        "has_event": False,
        "upcoming": upcoming
    }

@spark_router.post("/calendar/post")
async def post_culture_calendar(user: UserBase = Depends(get_current_user)):
    """Post today's cultural calendar event as Bonita"""
    calendar_post = await generate_culture_calendar_post()
    
    if not calendar_post:
        raise HTTPException(status_code=404, detail="No cultural event today")
    
    # Create Bonita user if doesn't exist
    bonita_user = await db.users.find_one({"user_id": "bonita"})
    if not bonita_user:
        await db.users.insert_one({
            "user_id": "bonita",
            "email": "bonita@blvx.app",
            "name": "Bonita",
            "username": "Bonita",
            "picture": BONITA_AVATAR_URL,
            "bio": "BLVX's cultural compass. I'm here to add context, not chaos.",
            "verified": True,
            "is_day_one": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    post_id = f"post_{secrets.token_urlsafe(8)}"
    calendar_spark_post = {
        "post_id": post_id,
        "user_id": "bonita",
        "content": calendar_post["content"],
        "reference_url": calendar_post.get("reference_url"),
        "media_url": calendar_post.get("media_url"),
        "media_type": calendar_post.get("media_type"),
        "post_type": "original",
        "visibility": "block",
        "is_spark": True,
        "is_culture_calendar": True,
        "event_name": calendar_post["event_name"],
        "reply_count": 0,
        "repost_count": 0,
        "like_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.insert_one(calendar_spark_post)
    calendar_spark_post.pop("_id", None)
    
    enriched = await get_post_with_user(calendar_spark_post)
    
    return {
        "message": f"Culture Calendar post created for {calendar_post['event_name']}!",
        "post": enriched,
        "event_name": calendar_post["event_name"]
    }

@spark_router.get("/trending")
async def get_trending_news():
    """Get trending news headlines for dynamic spark topics"""
    from ddgs import DDGS
    
    trending = []
    current_date = datetime.now().strftime("%B %Y")
    
    # Search for trending headlines in each category
    categories_to_search = ["politics", "culture", "music", "finance", "tech"]
    
    for category in categories_to_search:
        try:
            # Pick a random query from the category
            base_queries = SPARK_TOPIC_CATEGORIES.get(category, ["news"])
            search_term = random.choice(base_queries)
            
            with DDGS() as ddgs:
                results = list(ddgs.news(f"{search_term} {current_date}", max_results=2))
                
                for result in results:
                    title = result.get('title', '')
                    url = result.get('url', result.get('href', ''))
                    source = result.get('source', 'Unknown')
                    
                    if title and url and is_content_fresh(title):
                        trending.append({
                            "category": category,
                            "title": title[:100],
                            "url": url,
                            "source": source
                        })
                        break  # One per category
        except Exception as e:
            logger.error(f"Error fetching trending for {category}: {e}")
            continue
    
    return {
        "trending": trending,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@spark_router.post("/auto")
async def auto_spark(user: UserBase = Depends(get_current_user)):
    """Automatically generate multiple diverse spark posts"""
    results = []
    categories = list(SPARK_TOPIC_CATEGORIES.keys())
    
    # Generate 3 diverse posts from different categories
    selected_categories = random.sample(categories, min(3, len(categories)))
    
    for category in selected_categories:
        try:
            spark_data = await generate_spark_post(category)
            
            if spark_data.get("content"):
                post_id = f"post_{secrets.token_urlsafe(8)}"
                spark_post = {
                    "post_id": post_id,
                    "user_id": "bonita",
                    "content": spark_data["content"],
                    "reference_url": spark_data.get("reference_url"),
                    "post_type": "original",
                    "visibility": "block",
                    "is_spark": True,
                    "reply_count": 0,
                    "repost_count": 0,
                    "like_count": 0,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.posts.insert_one(spark_post)
                spark_post.pop("_id", None)
                
                results.append({
                    "category": category,
                    "content": spark_data["content"][:100] + "..." if len(spark_data["content"]) > 100 else spark_data["content"],
                    "has_link": bool(spark_data.get("reference_url"))
                })
        except Exception as e:
            logger.error(f"Auto-spark error for {category}: {e}")
            continue
    
    return {
        "message": f"Generated {len(results)} spark posts",
        "posts": results
    }

# ========================
# FILE UPLOAD (For Media Support)
# ========================

upload_router = APIRouter(prefix="/upload", tags=["Upload"])

import base64
import os as os_module
from pathlib import Path as PathLib

# Create uploads directory (fallback)
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')

def is_cloudinary_configured():
    """Check if Cloudinary credentials are configured"""
    return all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET])

def configure_cloudinary():
    """Configure Cloudinary SDK"""
    import cloudinary
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )

async def upload_to_cloudinary(contents: bytes, filename: str, content_type: str) -> dict:
    """Upload file to Cloudinary and return the URL with metadata"""
    import cloudinary.uploader
    import io
    
    configure_cloudinary()
    
    try:
        # Determine resource type
        resource_type = "video" if content_type.startswith("video/") else "image"
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            io.BytesIO(contents),
            folder="blvx_uploads",
            resource_type=resource_type,
            public_id=filename.rsplit('.', 1)[0],  # Remove extension
            overwrite=True,
            # Auto-optimize for web delivery
            transformation=[
                {"quality": "auto", "fetch_format": "auto"} if resource_type == "image" else {}
            ]
        )
        
        logger.info(f"Uploaded to Cloudinary: {result.get('secure_url')}")
        
        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "resource_type": resource_type,
            "format": result.get("format"),
            "width": result.get("width"),
            "height": result.get("height"),
            "duration": result.get("duration"),  # For videos
            "bytes": result.get("bytes")
        }
        
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Cloud storage upload failed: {str(e)}")

@upload_router.post("")
async def upload_file(
    request: Request,
    user: UserBase = Depends(get_current_user)
):
    """Upload media file (images, videos) - Uses Cloudinary if configured, local storage otherwise"""
    from fastapi import UploadFile, File
    
    # Parse multipart form data
    form = await request.form()
    file = form.get("file")
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]
    content_type = file.content_type
    
    # Also handle HEIC/HEIF from iPhones
    if content_type in ["image/heic", "image/heif"]:
        content_type = "image/jpeg"  # Cloudinary converts these automatically

    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    # Generate unique filename
    ext = content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    filename = f"{uuid.uuid4().hex[:16]}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Read and save file
    contents = await file.read()
    
    # Validate file size (50MB limit for videos, 10MB for images)
    max_size = 50 * 1024 * 1024 if content_type.startswith("video/") else 10 * 1024 * 1024
    if len(contents) > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {max_mb}MB.")
    
    # Try Cloudinary upload first if configured
    if is_cloudinary_configured():
        try:
            cloud_result = await upload_to_cloudinary(contents, filename, content_type)
            return {
                "url": cloud_result["url"],
                "filename": filename,
                "content_type": content_type,
                "size": len(contents),
                "storage": "cloudinary",
                "width": cloud_result.get("width"),
                "height": cloud_result.get("height"),
                "duration": cloud_result.get("duration"),  # For videos
                "resource_type": cloud_result.get("resource_type")
            }
        except Exception as e:
            logger.warning(f"Cloudinary upload failed, falling back to local: {e}")
    
    # Fallback to local storage
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Return local file URL - use environment variable
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    if not backend_url:
        logger.warning("REACT_APP_BACKEND_URL not set for media URL")
    file_url = f"{backend_url}/api/media/{filename}"
    
    return {
        "url": file_url,
        "filename": filename,
        "content_type": content_type,
        "size": len(contents),
        "storage": "local"  # Indicates local storage is being used
    }

@api_router.get("/media/{filename}")
async def serve_media(filename: str):
    """Serve uploaded media files"""
    from fastapi.responses import FileResponse
    
    filepath = UPLOAD_DIR / filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = filename.split(".")[-1].lower()
    content_types = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp",
        "mp4": "video/mp4",
        "webm": "video/webm",
    }
    
    content_type = content_types.get(ext, "application/octet-stream")
    
    return FileResponse(filepath, media_type=content_type)

# ========================
# TRENDING & LINK PREVIEW
# ========================

@api_router.get("/trending")
async def get_trending(user: UserBase = Depends(get_current_user)):
    """Get trending hashtags and topics - 'The Word'"""
    
    try:
        # Get posts from the last 24 hours
        yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        posts = await db.posts.find(
            {"created_at": {"$gte": yesterday}, "visibility": "block"},
            {"_id": 0, "content": 1}
        ).to_list(1000)
        
        # Extract hashtags
        import re
        hashtag_counts = {}
        for post in posts:
            hashtags = re.findall(r'#(\w+)', post.get("content", ""))
            for tag in hashtags:
                tag_lower = f"#{tag.lower()}"
                hashtag_counts[tag_lower] = hashtag_counts.get(tag_lower, 0) + 1
        
        # Sort by count and get top 5
        sorted_tags = sorted(hashtag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        trends = []
        for tag, count in sorted_tags:
            trends.append({
                "hashtag": tag,
                "post_count": count,
                "change": "+5%"
            })
        
        # If not enough real trends, try to get current news topics
        if len(trends) < 5:
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    # Search for trending news
                    news_results = list(ddgs.news("trending today", max_results=5))
                    for result in news_results[:5 - len(trends)]:
                        title = result.get('title', '')
                        # Create hashtag from first significant word
                        words = [w for w in title.split() if len(w) > 4 and w.isalpha()]
                        if words:
                            hashtag = f"#{words[0]}"
                            if hashtag not in [t['hashtag'] for t in trends]:
                                trends.append({
                                    "hashtag": hashtag,
                                    "post_count": random.randint(200, 1500),
                                    "change": "trending"
                                })
            except Exception as e:
                logger.error(f"Error fetching news trends: {e}")
        
        # Final fallback to dynamic defaults
        if len(trends) < 5:
            dynamic_defaults = [
                {"hashtag": "#BlackExcellence", "post_count": random.randint(800, 1500), "change": "+12%"},
                {"hashtag": "#TheBlock", "post_count": random.randint(500, 1000), "change": "+8%"},
                {"hashtag": "#CultureShift", "post_count": random.randint(300, 700), "change": "+5%"},
                {"hashtag": "#StoopTalk", "post_count": random.randint(200, 500), "change": "+3%"},
                {"hashtag": "#BonitaSays", "post_count": random.randint(150, 400), "change": "new"},
            ]
            
            for default in dynamic_defaults:
                if len(trends) >= 5:
                    break
                if default['hashtag'] not in [t['hashtag'] for t in trends]:
                    trends.append(default)
        
        return {"trends": trends[:5]}
    except Exception as e:
        logger.error(f"Trending error: {e}")
        return {
            "trends": [
                {"hashtag": "#BlackExcellence", "post_count": 1247, "change": "+12%"},
                {"hashtag": "#TheBlock", "post_count": 892, "change": "+8%"},
                {"hashtag": "#CultureShift", "post_count": 654, "change": "+5%"},
                {"hashtag": "#StoopTalk", "post_count": 421, "change": "+3%"},
                {"hashtag": "#BonitaSays", "post_count": 318, "change": "new"},
            ]
        }

@api_router.get("/link-preview")
async def get_link_preview(url: str, user: UserBase = Depends(get_current_user)):
    """Get OpenGraph preview data for a URL - The Unfurler"""
    from bs4 import BeautifulSoup
    from urllib.parse import urlparse, quote_plus
    
    try:
        parsed = urlparse(url)
        domain = parsed.hostname.replace('www.', '') if parsed.hostname else 'unknown'
        
        # Handle Google Search URLs specially
        if 'google.com/search' in url:
            # Extract search query
            query_start = url.find('q=')
            if query_start != -1:
                query_end = url.find('&', query_start)
                query = url[query_start+2:query_end if query_end != -1 else None]
                query = query.replace('+', ' ')
                return {
                    "url": url,
                    "domain": "google.com",
                    "title": f"Search: {query}",
                    "description": f"Find news and articles about '{query}' from multiple sources",
                    "image": "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"
                }
        
        # Try to fetch and parse OpenGraph tags
        preview_data = {
            "url": url,
            "domain": domain,
            "title": None,
            "description": None,
            "image": None
        }
        
        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                response = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (compatible; BLVXBot/1.0; +https://blvx.app)"
                })
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'lxml')
                    
                    # Extract OpenGraph tags
                    og_title = soup.find('meta', property='og:title')
                    og_desc = soup.find('meta', property='og:description')
                    og_image = soup.find('meta', property='og:image')
                    
                    # Fallback to regular meta tags
                    if not og_title:
                        title_tag = soup.find('title')
                        og_title = {'content': title_tag.text if title_tag else None}
                    if not og_desc:
                        meta_desc = soup.find('meta', attrs={'name': 'description'})
                        og_desc = meta_desc if meta_desc else {'content': None}
                    
                    preview_data["title"] = og_title.get('content') if og_title else None
                    preview_data["description"] = og_desc.get('content') if og_desc else None
                    preview_data["image"] = og_image.get('content') if og_image else None
                    
        except Exception as fetch_error:
            logger.warning(f"Could not fetch URL {url}: {fetch_error}")
        
        # Fallback values if scraping failed
        if not preview_data["title"]:
            path_parts = [p for p in parsed.path.split('/') if p]
            preview_data["title"] = ' '.join(path_parts[-2:]).replace('-', ' ').replace('_', ' ').title() if path_parts else domain
        
        if not preview_data["description"]:
            preview_data["description"] = f"Read the full story on {domain}"
        
        # Fallback images for known domains
        if not preview_data["image"]:
            domain_images = {
                "google.com": "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
                "techcrunch.com": "https://techcrunch.com/wp-content/uploads/2024/01/tc-logo.png",
                "theverge.com": "https://cdn.vox-cdn.com/uploads/chorus_asset/file/7395367/TheVerge_300x300.0.png",
                "pitchfork.com": "https://media.pitchfork.com/photos/5929a84413d197565213abd8/master/pass/pitchfork-logo.png",
                "twitter.com": "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
                "x.com": "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
            }
            preview_data["image"] = domain_images.get(domain)
        
        return preview_data
    except Exception as e:
        logger.error(f"Link preview error: {e}")
        raise HTTPException(status_code=400, detail="Could not fetch link preview")

# ========================
# THE LOOKOUT (Crowdsourced Safety Alerts)
# ========================

lookout_router = APIRouter(prefix="/lookout", tags=["The Lookout"])

class AlertType(str):
    POLICE = "police"
    SAFETY_HAZARD = "safety_hazard"
    PROTEST = "protest"
    VIBE_CHECK = "vibe_check"
    OTHER = "other"

class AlertStatus(str):
    PENDING = "pending"
    VERIFIED = "verified"
    DISMISSED = "dismissed"

class AlertCreate(BaseModel):
    alert_type: str  # police, safety_hazard, protest, vibe_check, other
    description: str
    location: str  # City/Neighborhood
    coordinates: Optional[Dict] = None  # {"lat": 0, "lng": 0}

class AlertResponse(BaseModel):
    alert_id: str
    user_id: str
    alert_type: str
    description: str
    location: str
    coordinates: Optional[Dict]
    vouches: int
    caps: int
    status: str
    created_at: datetime
    expires_at: datetime
    user: Optional[Dict] = None

ALERT_VERIFICATION_THRESHOLD = 3  # Vouches needed to verify
ALERT_DISMISSAL_THRESHOLD = 3     # Caps needed to dismiss
ALERT_EXPIRY_HOURS = 2            # Hours until alert expires

@lookout_router.post("", status_code=201)
async def create_alert(alert: AlertCreate, user: UserBase = Depends(get_current_user)):
    """Create a new safety alert"""
    if len(alert.description) > 500:
        raise HTTPException(status_code=400, detail="Description too long (max 500 chars)")
    
    if alert.alert_type not in ["police", "safety_hazard", "protest", "vibe_check", "other"]:
        raise HTTPException(status_code=400, detail="Invalid alert type")
    
    alert_id = f"alert_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=ALERT_EXPIRY_HOURS)
    
    alert_data = {
        "alert_id": alert_id,
        "user_id": user.user_id,
        "alert_type": alert.alert_type,
        "description": alert.description,
        "location": alert.location,
        "coordinates": alert.coordinates,
        "vouches": 0,
        "caps": 0,
        "vouch_users": [],  # Track who vouched
        "cap_users": [],    # Track who capped
        "status": "pending",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    }
    
    await db.alerts.insert_one(alert_data)
    alert_data.pop("_id", None)
    alert_data.pop("vouch_users", None)
    alert_data.pop("cap_users", None)
    
    # Get user info
    user_info = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "name": 1, "username": 1, "picture": 1})
    alert_data["user"] = user_info
    
    return alert_data

@lookout_router.get("")
async def get_alerts(
    location: Optional[str] = None,
    status: Optional[str] = None,
    user: UserBase = Depends(get_current_user)
):
    """Get active alerts, optionally filtered by location or status"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Base query: not expired
    query = {"expires_at": {"$gt": now}}
    
    # Filter by location if provided
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    # Filter by status if provided
    if status:
        query["status"] = status
    else:
        # Default: show pending and verified, hide dismissed
        query["status"] = {"$in": ["pending", "verified"]}
    
    alerts = await db.alerts.find(query, {"_id": 0, "vouch_users": 0, "cap_users": 0}).sort("created_at", -1).to_list(50)
    
    # Enrich with user info
    for alert in alerts:
        user_info = await db.users.find_one({"user_id": alert["user_id"]}, {"_id": 0, "name": 1, "username": 1, "picture": 1})
        alert["user"] = user_info
        if isinstance(alert.get("created_at"), str):
            alert["created_at"] = datetime.fromisoformat(alert["created_at"])
        if isinstance(alert.get("expires_at"), str):
            alert["expires_at"] = datetime.fromisoformat(alert["expires_at"])
    
    return alerts

@lookout_router.get("/active")
async def get_active_verified_alerts(user: UserBase = Depends(get_current_user)):
    """Get count and summary of active verified alerts (for The Ticker)"""
    now = datetime.now(timezone.utc).isoformat()
    
    alerts = await db.alerts.find({
        "status": "verified",
        "expires_at": {"$gt": now}
    }, {"_id": 0}).to_list(100)
    
    # Group by location
    locations = {}
    for alert in alerts:
        loc = alert.get("location", "Unknown")
        if loc not in locations:
            locations[loc] = 0
        locations[loc] += 1
    
    return {
        "total_active": len(alerts),
        "by_location": locations,
        "alerts": alerts[:5]  # Return first 5 for preview
    }

@lookout_router.post("/{alert_id}/vouch")
async def vouch_alert(alert_id: str, user: UserBase = Depends(get_current_user)):
    """Vouch (confirm) an alert"""
    alert = await db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Check if already vouched
    if user.user_id in alert.get("vouch_users", []):
        raise HTTPException(status_code=400, detail="Already vouched for this alert")
    
    # Can't vouch and cap same alert
    if user.user_id in alert.get("cap_users", []):
        raise HTTPException(status_code=400, detail="You already capped this alert")
    
    # Add vouch
    new_vouches = alert.get("vouches", 0) + 1
    update_data = {
        "$inc": {"vouches": 1},
        "$push": {"vouch_users": user.user_id}
    }
    
    # Check if threshold reached
    if new_vouches >= ALERT_VERIFICATION_THRESHOLD:
        update_data["$set"] = {"status": "verified"}
    
    await db.alerts.update_one({"alert_id": alert_id}, update_data)
    
    return {
        "message": "Vouched!",
        "vouches": new_vouches,
        "status": "verified" if new_vouches >= ALERT_VERIFICATION_THRESHOLD else "pending"
    }

@lookout_router.post("/{alert_id}/cap")
async def cap_alert(alert_id: str, user: UserBase = Depends(get_current_user)):
    """Cap (dispute) an alert"""
    alert = await db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Check if already capped
    if user.user_id in alert.get("cap_users", []):
        raise HTTPException(status_code=400, detail="Already capped this alert")
    
    # Can't vouch and cap same alert
    if user.user_id in alert.get("vouch_users", []):
        raise HTTPException(status_code=400, detail="You already vouched for this alert")
    
    # Add cap
    new_caps = alert.get("caps", 0) + 1
    update_data = {
        "$inc": {"caps": 1},
        "$push": {"cap_users": user.user_id}
    }
    
    # Check if dismissal threshold reached
    if new_caps >= ALERT_DISMISSAL_THRESHOLD:
        update_data["$set"] = {"status": "dismissed"}
    
    await db.alerts.update_one({"alert_id": alert_id}, update_data)
    
    return {
        "message": "Capped!",
        "caps": new_caps,
        "status": "dismissed" if new_caps >= ALERT_DISMISSAL_THRESHOLD else alert.get("status", "pending")
    }

@lookout_router.delete("/{alert_id}")
async def delete_alert(alert_id: str, user: UserBase = Depends(get_current_user)):
    """Delete an alert (only by creator)"""
    alert = await db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if alert["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Can only delete your own alerts")
    
    await db.alerts.delete_one({"alert_id": alert_id})
    return {"message": "Alert deleted"}

# ========================
# HEALTH CHECK
# ========================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    storage = "cloudinary" if is_cloudinary_configured() else "local"
    return {
        "status": "healthy",
        "service": "BLVX API",
        "bonita": "online",
        "spark": "ready",
        "websocket": "enabled",
        "storage": storage,
        "cloudinary": is_cloudinary_configured()
    }

# ========================
# WEBSOCKET ENDPOINTS
# ========================

async def get_user_from_token(token: str) -> Optional[dict]:
    """Validate session token and get user"""
    if not token:
        return None
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

async def get_user_from_websocket(websocket: WebSocket) -> Optional[dict]:
    """Get user from WebSocket - checks both query params and cookies"""
    # First try query params
    token = websocket.query_params.get("token")
    if token:
        user = await get_user_from_token(token)
        if user:
            return user
    
    # Then try cookies
    cookies = websocket.cookies
    session_id = cookies.get("session_id")
    if session_id:
        user = await get_user_from_token(session_id)
        if user:
            return user
    
    return None

@app.websocket("/ws/gc/{gc_id}")
async def websocket_gc_endpoint(websocket: WebSocket, gc_id: str):
    """WebSocket endpoint for real-time GC messaging"""
    # Get user from token or cookies
    user = await get_user_from_websocket(websocket)
    
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    # Verify user is member of GC
    gc = await db.gcs.find_one({"gc_id": gc_id})
    if not gc or user["user_id"] not in gc.get("members", []):
        await websocket.close(code=4003, reason="Not a member of this GC")
        return
    
    await ws_manager.connect_gc(websocket, gc_id, user["user_id"])
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                # Create the message
                message_id = f"msg_{uuid.uuid4().hex[:12]}"
                message = {
                    "message_id": message_id,
                    "gc_id": gc_id,
                    "user_id": user["user_id"],
                    "content": data.get("content", ""),
                    "post_id": data.get("post_id"),  # For Live Drop feature
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.gc_messages.insert_one(message)
                message.pop("_id", None)
                
                # Get user info for broadcast
                message["user"] = {
                    "name": user.get("name"),
                    "username": user.get("username"),
                    "picture": user.get("picture")
                }
                
                # Broadcast to all GC members
                await ws_manager.broadcast_to_gc(gc_id, {
                    "type": "new_message",
                    "message": message
                })
            
            elif data.get("type") == "typing":
                # Broadcast typing indicator
                await ws_manager.broadcast_to_gc(gc_id, {
                    "type": "typing",
                    "user_id": user["user_id"],
                    "username": user.get("username")
                })
    
    except WebSocketDisconnect:
        await ws_manager.disconnect_gc(websocket, gc_id, user["user_id"])
    except Exception as e:
        logger.error(f"WebSocket GC error: {e}")
        await ws_manager.disconnect_gc(websocket, gc_id, user["user_id"])

@app.websocket("/ws/stoop/{stoop_id}")
async def websocket_stoop_endpoint(websocket: WebSocket, stoop_id: str):
    """WebSocket endpoint for Stoop signaling (WebRTC coordination)"""
    # Get user from token or cookies
    user = await get_user_from_websocket(websocket)
    
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    # Verify user is in the Stoop
    stoop = await db.stoops.find_one({"stoop_id": stoop_id})
    if not stoop or not stoop.get("is_live"):
        await websocket.close(code=4004, reason="Stoop not found or not live")
        return
    
    await ws_manager.connect_stoop(websocket, stoop_id, user["user_id"])
    
    # Store the user_id -> websocket mapping for this stoop
    if not hasattr(ws_manager, 'stoop_user_sockets'):
        ws_manager.stoop_user_sockets = {}
    if stoop_id not in ws_manager.stoop_user_sockets:
        ws_manager.stoop_user_sockets[stoop_id] = {}
    ws_manager.stoop_user_sockets[stoop_id][user["user_id"]] = websocket
    
    # Notify others that user joined
    await ws_manager.broadcast_to_stoop(stoop_id, {
        "type": "user_joined",
        "user_id": user["user_id"],
        "username": user.get("username"),
        "name": user.get("name")
    })
    
    logger.info(f"[Stoop WebSocket] User {user['user_id']} joined stoop {stoop_id}")
    
    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"[Stoop WebSocket] Received from {user['user_id']}: {data.get('type')}")
            
            if data.get("type") == "webrtc_signal":
                # Forward WebRTC signaling data to target user
                target_user_id = data.get("target_user_id")
                signal_type = data.get("signal_type")  # offer, answer, ice_candidate
                signal_data = data.get("signal_data")
                
                logger.info(f"[Stoop WebSocket] WebRTC signal {signal_type} from {user['user_id']} to {target_user_id}")
                
                # Send to specific target if specified, otherwise broadcast
                message = {
                    "type": "webrtc_signal",
                    "from_user_id": user["user_id"],
                    "target_user_id": target_user_id,
                    "signal_type": signal_type,
                    "signal_data": signal_data
                }
                
                if target_user_id and stoop_id in ws_manager.stoop_user_sockets:
                    target_socket = ws_manager.stoop_user_sockets[stoop_id].get(target_user_id)
                    if target_socket:
                        try:
                            await target_socket.send_json(message)
                            logger.info(f"[Stoop WebSocket] Sent {signal_type} to {target_user_id}")
                        except Exception as e:
                            logger.error(f"[Stoop WebSocket] Error sending to {target_user_id}: {e}")
                    else:
                        logger.warning(f"[Stoop WebSocket] Target {target_user_id} not found in stoop")
                else:
                    # Fallback to broadcast (excluding sender)
                    await ws_manager.broadcast_to_stoop(stoop_id, message)
            
            elif data.get("type") == "mic_status":
                # Broadcast mic status change
                await ws_manager.broadcast_to_stoop(stoop_id, {
                    "type": "mic_status",
                    "user_id": user["user_id"],
                    "is_muted": data.get("is_muted", True)
                })
            
            elif data.get("type") == "reaction":
                # Broadcast reactions (hand raise, clap, etc.)
                await ws_manager.broadcast_to_stoop(stoop_id, {
                    "type": "reaction",
                    "user_id": user["user_id"],
                    "reaction": data.get("reaction")
                })
    
    except WebSocketDisconnect:
        logger.info(f"[Stoop WebSocket] User {user['user_id']} disconnected from stoop {stoop_id}")
        await ws_manager.disconnect_stoop(websocket, stoop_id, user["user_id"])
        # Remove from user socket mapping
        if stoop_id in ws_manager.stoop_user_sockets:
            ws_manager.stoop_user_sockets[stoop_id].pop(user["user_id"], None)
        # Notify others that user left
        await ws_manager.broadcast_to_stoop(stoop_id, {
            "type": "user_left",
            "user_id": user["user_id"]
        })
    except Exception as e:
        logger.error(f"WebSocket Stoop error: {e}")
        await ws_manager.disconnect_stoop(websocket, stoop_id, user["user_id"])
        if stoop_id in ws_manager.stoop_user_sockets:
            ws_manager.stoop_user_sockets[stoop_id].pop(user["user_id"], None)

@app.websocket("/ws/notifications")
async def websocket_notifications_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications"""
    # Get user from token or cookies
    user = await get_user_from_websocket(websocket)
    
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    await ws_manager.connect_user(websocket, user["user_id"])
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    
    except WebSocketDisconnect:
        await ws_manager.disconnect_user(user["user_id"])
    except Exception as e:
        logger.error(f"WebSocket notification error: {e}")
        await ws_manager.disconnect_user(user["user_id"])

@app.websocket("/ws/sidebar/{sidebar_id}")
async def websocket_sidebar_endpoint(websocket: WebSocket, sidebar_id: str):
    """WebSocket endpoint for real-time sidebar messaging"""
    user = await get_user_from_websocket(websocket)
    
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    # Verify user is part of this sidebar
    sidebar = await db.sidebars.find_one({"sidebar_id": sidebar_id})
    if not sidebar or (user["user_id"] not in [sidebar["user_1"], sidebar["user_2"]]):
        await websocket.close(code=4003, reason="Not a member of this sidebar")
        return
    
    await ws_manager.connect_sidebar(websocket, sidebar_id, user["user_id"])
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                content = data.get("content", "").strip()
                if content:
                    # Save message
                    message = {
                        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                        "sidebar_id": sidebar_id,
                        "user_id": user["user_id"],
                        "content": content,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.sidebar_messages.insert_one(message)
                    message.pop("_id", None)
                    
                    # Get user info
                    user_info = await db.users.find_one(
                        {"user_id": user["user_id"]}, 
                        {"_id": 0, "name": 1, "username": 1, "picture": 1}
                    )
                    message["user"] = user_info
                    
                    # Broadcast to sidebar
                    await ws_manager.broadcast_to_sidebar(sidebar_id, {
                        "type": "new_message",
                        "message": message
                    })
                    
                    # Check if messaging Bonita - trigger AI response (handle both bonita and bonita_ai)
                    other_id = sidebar["user_2"] if sidebar["user_1"] == user["user_id"] else sidebar["user_1"]
                    if other_id in ["bonita_ai", "bonita"]:
                        asyncio.create_task(generate_bonita_sidebar_response(sidebar_id, content, user["user_id"]))
            
            elif data.get("type") == "typing":
                await ws_manager.broadcast_to_sidebar(sidebar_id, {
                    "type": "typing",
                    "user_id": user["user_id"]
                })
    
    except WebSocketDisconnect:
        await ws_manager.disconnect_sidebar(websocket, sidebar_id, user["user_id"])
    except Exception as e:
        logger.error(f"WebSocket sidebar error: {e}")
        await ws_manager.disconnect_sidebar(websocket, sidebar_id, user["user_id"])

# ========================
# PUSH NOTIFICATIONS
# ========================

push_router = APIRouter(prefix="/push", tags=["Push Notifications"])

# VAPID keys for push notifications
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY')
VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'admin@blvx.app')
VAPID_CLAIMS = {"sub": f"mailto:{VAPID_CLAIM_EMAIL}"}

@push_router.get("/vapid-key")
async def get_vapid_public_key():
    """Get the VAPID public key for push subscription"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict

@push_router.post("/subscribe")
async def subscribe_push(
    subscription: PushSubscription,
    user: UserBase = Depends(get_current_user)
):
    """Subscribe a device to push notifications"""
    # Store subscription in database
    await db.push_subscriptions.update_one(
        {"user_id": user.user_id, "endpoint": subscription.endpoint},
        {
            "$set": {
                "user_id": user.user_id,
                "endpoint": subscription.endpoint,
                "keys": subscription.keys,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Subscribed to push notifications"}

@push_router.delete("/unsubscribe")
async def unsubscribe_push(
    endpoint: str,
    user: UserBase = Depends(get_current_user)
):
    """Unsubscribe a device from push notifications"""
    await db.push_subscriptions.delete_one({
        "user_id": user.user_id,
        "endpoint": endpoint
    })
    
    return {"message": "Unsubscribed from push notifications"}

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send push notification to all devices of a user"""
    from pywebpush import webpush, WebPushException
    
    subscriptions = await db.push_subscriptions.find({"user_id": user_id}).to_list(100)
    
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"]
                },
                data=json.dumps({
                    "title": title,
                    "body": body,
                    "data": data or {}
                }),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
        except WebPushException as e:
            logger.error(f"Push notification failed: {e}")
            # Remove invalid subscription
            if e.response and e.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})

@push_router.post("/test")
async def test_push_notification(user: UserBase = Depends(get_current_user)):
    """Send a test push notification to the current user"""
    await send_push_notification(
        user.user_id,
        "BLVX Test",
        "Push notifications are working! 🎉",
        {"type": "test"}
    )
    
    return {"message": "Test notification sent"}

# ========================
# ADMIN DASHBOARD API
# ========================

# List of admin user IDs (hardcoded for now, could be stored in DB)
ADMIN_USERS = ["user_d940ef29bbb5", "user_832307c0fe15"]  # CJ Nurse's user IDs

async def get_admin_user(user: UserBase = Depends(get_current_user)):
    """Dependency to check if user is admin"""
    # Check hardcoded list OR is_admin flag in database
    db_user = await db.users.find_one({"user_id": user.user_id})
    is_db_admin = db_user.get("is_admin", False) if db_user else False
    
    if user.user_id not in ADMIN_USERS and not is_db_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@admin_router.get("/stats")
async def get_admin_stats(admin: UserBase = Depends(get_admin_user)):
    """Get platform statistics"""
    total_users = await db.users.count_documents({})
    total_posts = await db.posts.count_documents({})
    total_gcs = await db.gcs.count_documents({})
    total_stoops = await db.stoops.count_documents({})
    total_alerts = await db.alerts.count_documents({})
    
    # Get recent signups (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_signups = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    
    # Get active users (users who posted in last 7 days)
    active_users = await db.posts.distinct("author_id", {"created_at": {"$gte": week_ago}})
    
    return {
        "total_users": total_users,
        "total_posts": total_posts,
        "total_gcs": total_gcs,
        "total_stoops": total_stoops,
        "total_alerts": total_alerts,
        "recent_signups": recent_signups,
        "active_users_count": len(active_users)
    }

@admin_router.get("/users")
async def get_admin_users(
    page: int = 1,
    limit: int = 20,
    search: str = None,
    admin: UserBase = Depends(get_admin_user)
):
    """Get paginated list of users for admin"""
    query = {}
    if search:
        query = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]}
    
    skip = (page - 1) * limit
    
    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.users.count_documents(query)
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@admin_router.post("/users/{user_id}/ban")
async def ban_user(user_id: str, reason: str = "Violation of community guidelines", admin: UserBase = Depends(get_admin_user)):
    """Ban a user"""
    if user_id in ADMIN_USERS:
        raise HTTPException(status_code=400, detail="Cannot ban admin users")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_banned": True, "ban_reason": reason, "banned_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_id} has been banned", "reason": reason}

@admin_router.post("/users/{user_id}/unban")
async def unban_user(user_id: str, admin: UserBase = Depends(get_admin_user)):
    """Unban a user"""
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {"is_banned": "", "ban_reason": "", "banned_at": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_id} has been unbanned"}

@admin_router.get("/posts")
async def get_admin_posts(
    page: int = 1,
    limit: int = 20,
    reported: bool = False,
    admin: UserBase = Depends(get_admin_user)
):
    """Get paginated list of posts for admin"""
    query = {}
    if reported:
        query = {"reports": {"$exists": True, "$ne": []}}
    
    skip = (page - 1) * limit
    
    posts = await db.posts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get user info for each post
    for post in posts:
        author = await db.users.find_one(
            {"user_id": post["author_id"]},
            {"_id": 0, "name": 1, "username": 1, "picture": 1}
        )
        post["author"] = author
    
    total = await db.posts.count_documents(query)
    
    return {
        "posts": posts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@admin_router.delete("/posts/{post_id}")
async def delete_post_admin(post_id: str, reason: str = "Content violation", admin: UserBase = Depends(get_admin_user)):
    """Delete a post as admin"""
    result = await db.posts.delete_one({"post_id": post_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Also delete replies to this post
    await db.posts.delete_many({"reply_to": post_id})
    
    return {"message": f"Post {post_id} has been deleted", "reason": reason}

@admin_router.delete("/spark/clear")
async def clear_spark_posts(admin: UserBase = Depends(get_admin_user)):
    """Clear all Bonita Spark posts (refresh the feed)"""
    result = await db.posts.delete_many({
        "user_id": "bonita",
        "is_spark": True
    })
    
    # Reset Bonita's post count
    await db.users.update_one(
        {"user_id": "bonita"},
        {"$set": {"posts_count": 0}}
    )
    
    return {
        "message": f"Cleared {result.deleted_count} Spark posts",
        "deleted_count": result.deleted_count
    }

@api_router.get("/admin/fix-founder")
async def fix_founder_account(secret: str):
    """One-time fix for founder account - uses secret key instead of session"""
    # Simple secret check (delete this endpoint after use)
    if secret != "blvx_founder_fix_2026":
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    # Fix CJ's accounts - by user ID AND by email
    founder_ids = ["user_d940ef29bbb5", "user_832307c0fe15"]
    founder_emails = ["cj@blvx.social", "cjaze.av@gmail.com"]
    
    fixed_users = []
    
    # Fix by user ID
    for user_id in founder_ids:
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "created_at": datetime.now(timezone.utc).isoformat(),
                "plates_remaining": 999999,
                "is_day_one": True,
                "is_admin": True
            }}
        )
        if result.modified_count > 0:
            fixed_users.append(user_id)
    
    # Fix by email (catches any accounts we missed)
    for email in founder_emails:
        result = await db.users.update_one(
            {"email": email.lower()},
            {"$set": {
                "created_at": datetime.now(timezone.utc).isoformat(),
                "plates_remaining": 999999,
                "is_day_one": True,
                "is_admin": True
            }}
        )
        if result.modified_count > 0:
            user = await db.users.find_one({"email": email.lower()})
            if user:
                fixed_users.append(f"{email} ({user.get('user_id', 'unknown')})")
    
    return {"message": "Founder accounts fixed", "fixed": fixed_users}

@admin_router.patch("/users/{user_id}/fix")
async def fix_user_data(
    user_id: str,
    plates_remaining: Optional[int] = None,
    is_day_one: Optional[bool] = None,
    reset_created_at: Optional[bool] = None,
    admin: UserBase = Depends(get_admin_user)
):
    """Fix user data (admin only)"""
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_fields = {}
    
    if plates_remaining is not None:
        update_fields["plates_remaining"] = plates_remaining
    
    if is_day_one is not None:
        update_fields["is_day_one"] = is_day_one
    
    if reset_created_at:
        update_fields["created_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_fields:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
    
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    return {
        "message": f"User {user_id} updated",
        "updated_fields": list(update_fields.keys()),
        "user": updated_user
    }

@admin_router.get("/alerts")
async def get_admin_alerts(
    page: int = 1,
    limit: int = 20,
    admin: UserBase = Depends(get_admin_user)
):
    """Get all alerts for admin review"""
    skip = (page - 1) * limit
    
    alerts = await db.alerts.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get reporter info
    for alert in alerts:
        reporter = await db.users.find_one(
            {"user_id": alert["reporter_id"]},
            {"_id": 0, "name": 1, "username": 1}
        )
        alert["reporter"] = reporter
    
    total = await db.alerts.count_documents({})
    
    return {
        "alerts": alerts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@admin_router.delete("/alerts/{alert_id}")
async def delete_alert_admin(alert_id: str, admin: UserBase = Depends(get_admin_user)):
    """Delete an alert as admin"""
    result = await db.alerts.delete_one({"alert_id": alert_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": f"Alert {alert_id} has been deleted"}

# ========================
# SEED DATA ENDPOINT
# ========================

@api_router.post("/seed-starter-posts")
async def seed_starter_posts(force: bool = False):
    """Seed the database with starter posts from Bonita.
    This creates the Bonita user if not exists and adds starter content.
    Use force=true to recreate starter posts (keeps AI-generated posts)."""
    
    # Ensure Bonita user exists with high-quality profile
    bonita_user = await db.users.find_one({"user_id": "bonita"})
    if not bonita_user:
        await db.users.insert_one({
            "user_id": "bonita",
            "email": "bonita@blvx.app",
            "name": "Bonita",
            "picture": BONITA_AVATAR_URL,
            "username": "bonita",
            "bio": "Your culturally fluent AI companion. The Auntie of The Block.",
            "verified": True,
            "email_verified": True,
            "reputation_score": 1000,
            "plates_remaining": 0,
            "is_day_one": True,
            "is_vouched": True,
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
            "vouched_by": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Created Bonita user account")
    else:
        # Update avatar if needed
        if bonita_user.get("picture") != BONITA_AVATAR_URL:
            await db.users.update_one(
                {"user_id": "bonita"},
                {"$set": {"picture": BONITA_AVATAR_URL}}
            )
    
    # Define starter post signatures (used for detection and cleanup)
    starter_signatures = [
        "We serve Plates, not Likes",
        "Testing the vision",
        "Cinematic vibes only"
    ]
    
    # Check if starter posts already exist (unless force=true)
    if not force:
        existing_starter = await db.posts.find_one({
            "user_id": "bonita", 
            "content": {"$regex": "We serve Plates"}
        })
        if existing_starter:
            return {
                "message": "Starter posts already exist. Use force=true to recreate them.",
                "seeded": False
            }
    
    # Only delete starter posts (not AI-generated content)
    for sig in starter_signatures:
        await db.posts.delete_many({
            "user_id": "bonita",
            "content": {"$regex": sig}
        })
    logger.info("Cleaned up existing starter posts (kept AI-generated content)")
    
    # Starter posts from Bonita - Per user spec
    starter_posts = [
        {
            "content": "Welcome to The Block. We serve Plates, not Likes. 🍽️\n\n#TheBlock",
            "media_url": None,
            "media_type": None,
            "is_spark": True
        },
        {
            "content": "Testing the vision. 📹\n\n#POV",
            "media_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "media_type": "video",
            "is_spark": True
        },
        {
            "content": "Cinematic vibes only. 🎬\n\n#BLVX #CultureFirst",
            "media_url": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80",
            "media_type": "image",
            "is_spark": True
        }
    ]
    
    created_posts = []
    base_time = datetime.now(timezone.utc)
    
    for i, post_data in enumerate(starter_posts):
        post_id = f"post_{uuid.uuid4().hex[:12]}"
        # Stagger timestamps so they appear in order (newest first)
        post_time = base_time - timedelta(hours=i * 2)
        
        new_post = {
            "post_id": post_id,
            "user_id": "bonita",
            "content": post_data["content"],
            "media_url": post_data.get("media_url"),
            "media_type": post_data.get("media_type"),
            "gif_metadata": None,
            "reference_url": None,
            "post_type": "original",
            "parent_post_id": None,
            "quote_post_id": None,
            "visibility": "block",
            "is_spark": post_data["is_spark"],
            "reply_count": 0,
            "repost_count": 0,
            "like_count": 0,
            "created_at": post_time.isoformat()
        }
        
        await db.posts.insert_one(new_post)
        created_posts.append(post_id)
        logger.info(f"Created starter post: {post_id}")
    
    # Update Bonita's post count
    await db.users.update_one(
        {"user_id": "bonita"},
        {"$set": {"posts_count": len(starter_posts)}}
    )
    
    return {
        "message": f"Successfully seeded {len(created_posts)} starter posts from Bonita!",
        "seeded": True,
        "post_ids": created_posts
    }

# ========================
# INCLUDE ROUTERS
# ========================

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(posts_router)
api_router.include_router(bonita_router)
api_router.include_router(notifications_router)
api_router.include_router(vouch_router)
api_router.include_router(gc_router)
api_router.include_router(stoop_router)
api_router.include_router(spark_router)
api_router.include_router(upload_router)
api_router.include_router(lookout_router)
api_router.include_router(push_router)
api_router.include_router(admin_router)

# ========================
# DEBUG SEED ENDPOINT
# ========================

@api_router.get("/debug/seed")
async def debug_seed():
    """Manual trigger to seed Bonita's starter posts - visit in browser to trigger"""
    await seed_starter_posts_internal()
    
    # Count posts
    post_count = await db.posts.count_documents({"user_id": "bonita"})
    
    return {
        "status": "Database Seeded",
        "bonita_posts": post_count,
        "message": "Bonita's starter posts have been created. Refresh the feed to see them."
    }

app.include_router(api_router)

# Root-level health check for Kubernetes
@app.get("/health")
async def root_health_check():
    """Root health check endpoint for K8s probes"""
    return {"status": "healthy"}

# ========================
# CORS MIDDLEWARE
# ========================

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize database and ensure Bonita's profile is set up"""
    # Update Bonita's avatar if she exists
    await db.users.update_one(
        {"user_id": "bonita"},
        {"$set": {"picture": BONITA_AVATAR_URL}}
    )
    # Also update bonita_ai for sidebar chats
    bonita_ai = await db.users.find_one({"user_id": "bonita_ai"})
    if not bonita_ai:
        await db.users.insert_one({
            "user_id": "bonita_ai",
            "email": "bonita.ai@blvx.app",
            "name": "Bonita",
            "picture": BONITA_AVATAR_URL,
            "username": "bonita",
            "bio": "Your culturally fluent AI companion. The Auntie of The Block. Slide into my DMs!",
            "verified": True,
            "email_verified": True,
            "reputation_score": 1000,
            "plates_remaining": 0,
            "is_day_one": True,
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
            "vouched_by": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        # Ensure picture and created_at are set (for existing users that might be missing fields)
        await db.users.update_one(
            {"user_id": "bonita_ai"},
            {"$set": {"picture": BONITA_AVATAR_URL}}
        )
        # Add created_at if missing
        await db.users.update_one(
            {"user_id": "bonita_ai", "created_at": {"$exists": False}},
            {"$set": {"created_at": datetime.now(timezone.utc).isoformat()}}
        )
    logger.info("Startup: Bonita's profile initialized")
    
    # Auto-seed starter posts if they don't exist
    existing_starter = await db.posts.find_one({
        "user_id": "bonita", 
        "content": {"$regex": "We serve Plates"}
    })
    if not existing_starter:
        logger.info("Startup: Seeding Bonita's starter posts...")
        await seed_starter_posts_internal()
        logger.info("Startup: Starter posts seeded successfully")


async def seed_starter_posts_internal():
    """Internal function to seed starter posts - called from startup and API"""
    # Ensure Bonita user exists
    bonita_user = await db.users.find_one({"user_id": "bonita"})
    if not bonita_user:
        await db.users.insert_one({
            "user_id": "bonita",
            "email": "bonita@blvx.app",
            "name": "Bonita",
            "picture": BONITA_AVATAR_URL,
            "username": "bonita",
            "bio": "Your culturally fluent AI companion. The Auntie of The Block.",
            "verified": True,
            "email_verified": True,
            "reputation_score": 1000,
            "plates_remaining": 0,
            "is_day_one": True,
            "is_vouched": True,
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
            "vouched_by": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Starter posts from Bonita
    starter_posts = [
        {
            "content": "Welcome to The Block. We serve Plates, not Likes. 🍽️\n\n#TheBlock",
            "media_url": None,
            "media_type": None,
            "is_spark": True
        },
        {
            "content": "Testing the vision. 📹\n\n#POV",
            "media_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "media_type": "video",
            "is_spark": True
        },
        {
            "content": "Cinematic vibes only. 🎬\n\n#BLVX #CultureFirst",
            "media_url": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80",
            "media_type": "image",
            "is_spark": True
        }
    ]
    
    base_time = datetime.now(timezone.utc)
    for i, post_data in enumerate(starter_posts):
        post_id = f"post_{uuid.uuid4().hex[:12]}"
        post_time = base_time - timedelta(hours=i * 2)
        
        new_post = {
            "post_id": post_id,
            "user_id": "bonita",
            "content": post_data["content"],
            "media_url": post_data.get("media_url"),
            "media_type": post_data.get("media_type"),
            "gif_metadata": None,
            "reference_url": None,
            "post_type": "original",
            "parent_post_id": None,
            "quote_post_id": None,
            "visibility": "block",
            "is_spark": post_data["is_spark"],
            "reply_count": 0,
            "repost_count": 0,
            "like_count": 0,
            "created_at": post_time.isoformat()
        }
        await db.posts.insert_one(new_post)
    
    # Update Bonita's post count
    post_count = await db.posts.count_documents({"user_id": "bonita"})
    await db.users.update_one(
        {"user_id": "bonita"},
        {"$set": {"posts_count": post_count}}
    )

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
