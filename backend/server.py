from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import json
import secrets
import string

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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# WebSocket connections for The GC
active_connections: Dict[str, List[WebSocket]] = {}

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
    reputation_score: int = 100
    plates_remaining: int = 3
    is_day_one: bool = False
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

class PostBase(BaseModel):
    post_id: str
    user_id: str
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # image, video
    post_type: str = "original"  # original, reply, repost, quote, pov
    parent_post_id: Optional[str] = None
    quote_post_id: Optional[str] = None
    visibility: str = "block"  # block (public) or cookout (private)
    reply_count: int = 0
    repost_count: int = 0
    like_count: int = 0
    created_at: datetime

class PostCreate(BaseModel):
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    post_type: str = "original"
    parent_post_id: Optional[str] = None
    quote_post_id: Optional[str] = None
    visibility: str = "block"

class PostWithUser(PostBase):
    user: Optional[UserBase] = None
    parent_post: Optional["PostWithUser"] = None
    quote_post: Optional["PostWithUser"] = None

class NotificationBase(BaseModel):
    notification_id: str
    user_id: str
    type: str
    from_user_id: str
    post_id: Optional[str] = None
    gc_id: Optional[str] = None
    read: bool = False
    created_at: datetime

class VouchPlate(BaseModel):
    plate_id: str
    code: str
    created_by: str
    used_by: Optional[str] = None
    used_at: Optional[datetime] = None
    created_at: datetime

class GCBase(BaseModel):
    gc_id: str
    name: str
    created_by: str
    members: List[str]
    is_active: bool = True
    created_at: datetime

class GCCreate(BaseModel):
    name: str
    member_ids: List[str]

class GCMessage(BaseModel):
    message_id: str
    gc_id: str
    user_id: str
    content: str
    post_id: Optional[str] = None  # For "Live Drop" feature
    created_at: datetime

class SidebarBase(BaseModel):
    sidebar_id: str
    user_1: str
    user_2: str
    source_gc_id: Optional[str] = None
    source_message_id: Optional[str] = None
    created_at: datetime

class StoopBase(BaseModel):
    stoop_id: str
    title: str
    host_id: str
    pinned_post_id: Optional[str] = None
    speakers: List[str]
    listeners: List[str]
    is_live: bool = True
    created_at: datetime

class StoopCreate(BaseModel):
    title: str
    pinned_post_id: Optional[str] = None

class BonitaRequest(BaseModel):
    mode: str  # conversation, vibe_check, tone_rewrite
    content: str
    context: Optional[str] = None  # block or cookout

class BonitaResponse(BaseModel):
    response: str
    mode: str

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
    
    return UserBase(**user)

async def get_optional_user(request: Request) -> Optional[UserBase]:
    """Get current user if authenticated, else None"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ========================
# AUTH ROUTES
# ========================

@auth_router.get("/session")
async def exchange_session(session_id: str, response: Response):
    """Exchange Emergent session_id for user data and set cookie"""
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = resp.json()
    except httpx.RequestError as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service error")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    session_token = data.get("session_token", f"session_{uuid.uuid4().hex}")
    
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"email": data["email"]},
            {"$set": {
                "name": data.get("name", existing_user.get("name")),
                "picture": data.get("picture", existing_user.get("picture"))
            }}
        )
    else:
        username = data["email"].split("@")[0].lower().replace(".", "_")[:15]
        base_username = username
        counter = 1
        while await db.users.find_one({"username": username}):
            username = f"{base_username}{counter}"
            counter += 1
        
        new_user = {
            "user_id": user_id,
            "email": data["email"],
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "username": username,
            "bio": "",
            "verified": False,
            "reputation_score": 100,
            "plates_remaining": 3,
            "is_day_one": False,
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
            "vouched_by": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return user

@auth_router.get("/me")
async def get_me(user: UserBase = Depends(get_current_user)):
    """Get current authenticated user"""
    return user

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
    if user.plates_remaining <= 0:
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
    
    # Give the voucher reputation boost
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
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
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
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if isinstance(updated_user.get("created_at"), str):
        updated_user["created_at"] = datetime.fromisoformat(updated_user["created_at"])
    
    return UserBase(**updated_user)

@users_router.post("/follow/{user_id}")
async def follow_user(user_id: str, current_user: UserBase = Depends(get_current_user)):
    """Follow a user (become mutuals for Cookout access)"""
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
    """Check if users are mutual followers (for Cookout access)"""
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
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    return [UserBase(**u) for u in users]

# ========================
# POST ROUTES
# ========================

async def get_post_with_user(post: dict) -> dict:
    """Enrich post with user data"""
    user = await db.users.find_one({"user_id": post["user_id"]}, {"_id": 0})
    if user and isinstance(user.get("created_at"), str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    
    post["user"] = user
    
    if post.get("parent_post_id"):
        parent = await db.posts.find_one({"post_id": post["parent_post_id"]}, {"_id": 0})
        if parent:
            if isinstance(parent.get("created_at"), str):
                parent["created_at"] = datetime.fromisoformat(parent["created_at"])
            parent_user = await db.users.find_one({"user_id": parent["user_id"]}, {"_id": 0})
            if parent_user and isinstance(parent_user.get("created_at"), str):
                parent_user["created_at"] = datetime.fromisoformat(parent_user["created_at"])
            parent["user"] = parent_user
            post["parent_post"] = parent
    
    if post.get("quote_post_id"):
        quote = await db.posts.find_one({"post_id": post["quote_post_id"]}, {"_id": 0})
        if quote:
            if isinstance(quote.get("created_at"), str):
                quote["created_at"] = datetime.fromisoformat(quote["created_at"])
            quote_user = await db.users.find_one({"user_id": quote["user_id"]}, {"_id": 0})
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
        "post_type": post.post_type,
        "parent_post_id": post.parent_post_id,
        "quote_post_id": post.quote_post_id,
        "visibility": post.visibility,
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
async def get_feed(
    limit: int = 20,
    before: Optional[str] = None,
    user: UserBase = Depends(get_current_user)
):
    """Get chronological feed (The Block - posts from followed users)"""
    following = await db.follows.find(
        {"follower_id": user.user_id},
        {"_id": 0, "following_id": 1}
    ).to_list(1000)
    
    following_ids = [f["following_id"] for f in following]
    following_ids.append(user.user_id)
    
    query = {
        "user_id": {"$in": following_ids},
        "$or": [
            {"visibility": "block"},
            {"visibility": "cookout", "user_id": user.user_id}
        ]
    }
    
    if before:
        query["created_at"] = {"$lt": before}
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        if isinstance(post.get("created_at"), str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
        
        # Check Cookout access for each post
        if post["visibility"] == "cookout" and post["user_id"] != user.user_id:
            if not await can_view_cookout(user.user_id, post["user_id"]):
                continue
        
        enriched = await get_post_with_user(post)
        result.append(enriched)
    
    return result

@posts_router.get("/explore")
async def get_explore_feed(limit: int = 20, before: Optional[str] = None, user: UserBase = Depends(get_current_user)):
    """Get public explore feed (The Block only)"""
    query = {"visibility": "block"}
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
    
    # Filter by visibility
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
    
    if post["visibility"] == "cookout":
        if not current_user:
            raise HTTPException(status_code=403, detail="Login required")
        if current_user.user_id != post["user_id"]:
            if not await can_view_cookout(current_user.user_id, post["user_id"]):
                raise HTTPException(status_code=403, detail="Cookout posts are for mutuals only")
    
    enriched = await get_post_with_user(post)
    return enriched

@posts_router.get("/{post_id}/thread")
async def get_thread(post_id: str, request: Request = None):
    """Get a post and all its replies (thread)"""
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
    """Search posts by content (The Block only)"""
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
        
        from_user = await db.users.find_one({"user_id": notif["from_user_id"]}, {"_id": 0})
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
    """Create a new Group Chat"""
    if len(gc.member_ids) < 2:
        raise HTTPException(status_code=400, detail="GC needs at least 3 people (including you)")
    
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
    
    # Get member details
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
    
    # Enrich with user data
    for msg in messages:
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
    """Send a message to a GC (including Live Drop)"""
    gc = await db.gcs.find_one({"gc_id": gc_id})
    if not gc or user.user_id not in gc["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this GC")
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "gc_id": gc_id,
        "user_id": user.user_id,
        "content": content,
        "post_id": post_id,  # For Live Drop
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gc_messages.insert_one(message)
    message.pop("_id", None)
    
    # Notify other members
    for member_id in gc["members"]:
        if member_id != user.user_id:
            await create_notification(member_id, "gc_message", user.user_id, post_id, gc_id)
    
    return message

@gc_router.post("/{gc_id}/bonita")
async def ask_bonita_in_gc(gc_id: str, question: str, user: UserBase = Depends(get_current_user)):
    """Tag @Bonita in the GC for fact-checking or context"""
    gc = await db.gcs.find_one({"gc_id": gc_id})
    if not gc or user.user_id not in gc["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this GC")
    
    # Get recent context
    recent_messages = await db.gc_messages.find(
        {"gc_id": gc_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    context = "\n".join([f"{m['content']}" for m in reversed(recent_messages)])
    
    bonita_response = await call_bonita(f"Context from The GC:\n{context}\n\nQuestion: {question}", "conversation", "cookout")
    
    # Post Bonita's response as a message
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
    
    return message

# ========================
# SIDEBAR (1-ON-1 DM) ROUTES
# ========================

@api_router.post("/sidebar/create")
async def create_sidebar(other_user_id: str, source_gc_id: Optional[str] = None, source_message_id: Optional[str] = None, user: UserBase = Depends(get_current_user)):
    """Create or get a sidebar (1-on-1 DM) with another user"""
    if other_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot create sidebar with yourself")
    
    # Check if sidebar already exists
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
    
    # Get other user details for each sidebar
    for sb in sidebars:
        other_id = sb["user_2"] if sb["user_1"] == user.user_id else sb["user_1"]
        other_user = await db.users.find_one({"user_id": other_id}, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1})
        sb["other_user"] = other_user
    
    return sidebars

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
async def send_sidebar_message(sidebar_id: str, content: str, user: UserBase = Depends(get_current_user)):
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
    
    # Notify other user
    other_id = sidebar["user_2"] if sidebar["user_1"] == user.user_id else sidebar["user_1"]
    await create_notification(other_id, "sidebar_message", user.user_id, None)
    
    return message

# ========================
# THE STOOP (AUDIO SPACES) ROUTES
# ========================

@stoop_router.post("/create")
async def create_stoop(stoop: StoopCreate, user: UserBase = Depends(get_current_user)):
    """Create a new Stoop (audio room)"""
    stoop_data = {
        "stoop_id": f"stoop_{uuid.uuid4().hex[:12]}",
        "title": stoop.title,
        "host_id": user.user_id,
        "pinned_post_id": stoop.pinned_post_id,
        "speakers": [user.user_id],
        "listeners": [],
        "is_live": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
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
    """Join a Stoop as a listener"""
    stoop = await db.stoops.find_one({"stoop_id": stoop_id})
    if not stoop or not stoop["is_live"]:
        raise HTTPException(status_code=404, detail="Stoop not found or ended")
    
    if user.user_id not in stoop["listeners"]:
        await db.stoops.update_one(
            {"stoop_id": stoop_id},
            {"$push": {"listeners": user.user_id}}
        )
    
    return {"message": "Joined the Stoop"}

@stoop_router.post("/{stoop_id}/leave")
async def leave_stoop(stoop_id: str, user: UserBase = Depends(get_current_user)):
    """Leave a Stoop"""
    await db.stoops.update_one(
        {"stoop_id": stoop_id},
        {"$pull": {"listeners": user.user_id, "speakers": user.user_id}}
    )
    
    return {"message": "Left the Stoop"}

@stoop_router.post("/{stoop_id}/pass-aux")
async def pass_aux(stoop_id: str, user_id: str, user: UserBase = Depends(get_current_user)):
    """Pass the Aux (grant speaking rights) - Host only"""
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

# ========================
# BONITA AI ROUTES
# ========================

BONITA_SYSTEM_PROMPT = """ROLE: You are Bonita, a culturally fluent, emotionally intelligent AI designed to support healthy, meaningful conversation inside BLVX. You are not a moderator, not an authority, and not a replacement for human voices. Your role is to add context, reduce confusion, and preserve humanity.

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
- "Vouch" = The act of verifying another user."""

async def call_bonita(content: str, mode: str, context: str = "block") -> str:
    """Call Bonita AI service"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        return "Bonita is taking a break. Try again later."
    
    context_note = "You are on The Block (public). Be formal, concise, protective." if context == "block" else "You are in The Cookout (private). Be warmer, colloquial, relaxed."
    
    system_message = f"{BONITA_SYSTEM_PROMPT}\n\nCURRENT CONTEXT: {context_note}"
    
    if mode == "vibe_check":
        system_message += "\n\nOUTPUT MODE: Vibe Check. Analyze the content and return JSON: {\"sentiment_score\": 1-10, \"primary_emotion\": \"Humorous\"|\"Educational\"|\"Heated\"|\"Supportive\", \"summary_briefing\": \"One sentence summary\"}"
    elif mode == "tone_rewrite":
        system_message += "\n\nOUTPUT MODE: Tone Rewrite. Provide three rewrite options:\nOption 1 (The De-escalate): [Text]\nOption 2 (The Wit): [Text]\nOption 3 (The Straight Talk): [Text]"
    
    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"bonita_{uuid.uuid4().hex[:8]}",
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(text=content)
        response = await chat.send_message(user_message)
        
        return response
    except Exception as e:
        logger.error(f"Bonita error: {e}")
        return "Bonita encountered an issue. Please try again."

@bonita_router.post("/ask")
async def ask_bonita(request: BonitaRequest, user: UserBase = Depends(get_current_user)):
    """Ask Bonita AI for assistance"""
    response = await call_bonita(request.content, request.mode, request.context or "block")
    
    return BonitaResponse(response=response, mode=request.mode)

# ========================
# HEALTH CHECK
# ========================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "BLVX API", "bonita": "online"}

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

app.include_router(api_router)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
