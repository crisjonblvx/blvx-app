from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="BLVX API", description="Black-first, culture-native social network")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
posts_router = APIRouter(prefix="/posts", tags=["Posts"])
bonita_router = APIRouter(prefix="/bonita", tags=["Bonita AI"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    created_at: datetime

class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None
    name: Optional[str] = None

class PostBase(BaseModel):
    post_id: str
    user_id: str
    content: str
    post_type: str = "original"  # original, reply, repost, quote
    parent_post_id: Optional[str] = None
    quote_post_id: Optional[str] = None
    reply_count: int = 0
    repost_count: int = 0
    like_count: int = 0
    created_at: datetime

class PostCreate(BaseModel):
    content: str
    post_type: str = "original"
    parent_post_id: Optional[str] = None
    quote_post_id: Optional[str] = None

class PostWithUser(PostBase):
    user: Optional[UserBase] = None
    parent_post: Optional["PostWithUser"] = None
    quote_post: Optional["PostWithUser"] = None

class NotificationBase(BaseModel):
    notification_id: str
    user_id: str
    type: str  # like, reply, repost, follow, mention
    from_user_id: str
    post_id: Optional[str] = None
    read: bool = False
    created_at: datetime

class BonitaRequest(BaseModel):
    prompt_type: str  # thread_decompress, cultural_context, tone_refine
    content: str
    tone_variant: Optional[str] = None  # calm, sharp, humorous, respectful

class BonitaResponse(BaseModel):
    response: str
    prompt_type: str

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
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
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
        async with httpx.AsyncClient() as client:
            resp = await client.get(
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
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
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
async def update_profile(
    update: UserUpdate,
    user: UserBase = Depends(get_current_user)
):
    """Update current user's profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "username" in update_data:
        existing = await db.users.find_one({"username": update_data["username"], "user_id": {"$ne": user.user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if isinstance(updated_user.get("created_at"), str):
        updated_user["created_at"] = datetime.fromisoformat(updated_user["created_at"])
    
    return UserBase(**updated_user)

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

@posts_router.post("")
async def create_post(post: PostCreate, user: UserBase = Depends(get_current_user)):
    """Create a new post (BLVX)"""
    if len(post.content) > 500:
        raise HTTPException(status_code=400, detail="Post content exceeds 500 characters")
    
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    
    new_post = {
        "post_id": post_id,
        "user_id": user.user_id,
        "content": post.content,
        "post_type": post.post_type,
        "parent_post_id": post.parent_post_id,
        "quote_post_id": post.quote_post_id,
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
    """Get chronological feed (posts from followed users and self)"""
    following = await db.follows.find(
        {"follower_id": user.user_id},
        {"_id": 0, "following_id": 1}
    ).to_list(1000)
    
    following_ids = [f["following_id"] for f in following]
    following_ids.append(user.user_id)
    
    query = {"user_id": {"$in": following_ids}}
    
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

@posts_router.get("/explore")
async def get_explore_feed(limit: int = 20, before: Optional[str] = None):
    """Get public explore feed (all posts, chronological)"""
    query = {}
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
async def get_user_posts(username: str, limit: int = 20, before: Optional[str] = None):
    """Get posts by a specific user"""
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = {"user_id": user["user_id"]}
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
async def get_post(post_id: str):
    """Get a single post by ID"""
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if isinstance(post.get("created_at"), str):
        post["created_at"] = datetime.fromisoformat(post["created_at"])
    
    enriched = await get_post_with_user(post)
    return enriched

@posts_router.get("/{post_id}/thread")
async def get_thread(post_id: str):
    """Get a post and all its replies (thread)"""
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if isinstance(post.get("created_at"), str):
        post["created_at"] = datetime.fromisoformat(post["created_at"])
    
    enriched_post = await get_post_with_user(post)
    
    replies = await db.posts.find(
        {"parent_post_id": post_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    enriched_replies = []
    for reply in replies:
        if isinstance(reply.get("created_at"), str):
            reply["created_at"] = datetime.fromisoformat(reply["created_at"])
        enriched_replies.append(await get_post_with_user(reply))
    
    return {
        "post": enriched_post,
        "replies": enriched_replies
    }

@posts_router.post("/{post_id}/like")
async def like_post(post_id: str, user: UserBase = Depends(get_current_user)):
    """Like a post"""
    post = await db.posts.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    existing_like = await db.likes.find_one({
        "user_id": user.user_id,
        "post_id": post_id
    })
    
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
    result = await db.likes.delete_one({
        "user_id": user.user_id,
        "post_id": post_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not liked")
    
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"like_count": -1}})
    
    return {"message": "Unliked successfully"}

@posts_router.get("/{post_id}/liked")
async def check_liked(post_id: str, user: UserBase = Depends(get_current_user)):
    """Check if current user has liked a post"""
    like = await db.likes.find_one({
        "user_id": user.user_id,
        "post_id": post_id
    })
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
        {"content": {"$regex": q, "$options": "i"}},
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

async def create_notification(user_id: str, notif_type: str, from_user_id: str, post_id: Optional[str]):
    """Create a notification"""
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": notif_type,
        "from_user_id": from_user_id,
        "post_id": post_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)

# ========================
# NOTIFICATION ROUTES
# ========================

@notifications_router.get("")
async def get_notifications(
    limit: int = 50,
    user: UserBase = Depends(get_current_user)
):
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
    count = await db.notifications.count_documents({
        "user_id": user.user_id,
        "read": False
    })
    return {"count": count}

# ========================
# BONITA AI ROUTES
# ========================

@bonita_router.post("/ask")
async def ask_bonita(
    request: BonitaRequest,
    user: UserBase = Depends(get_current_user)
):
    """Ask Bonita AI for assistance"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="Bonita is currently unavailable")
    
    system_prompts = {
        "thread_decompress": """You are Bonita, a culturally fluent AI embedded in BLVX - a Black-first social platform.

Your role: Thread Decompression - Break down heated or complex threads.

Personality: You're like a trusted Big Sister who gives "the look" - wise, direct, culturally aware, and never preachy. You offer context, never censorship. You're concise and don't over-explain.

Task: Analyze the thread content and provide:
1. Origin summary (what started this)
2. Key viewpoints (max 3)
3. Separate emotion from fact
4. Any cultural context needed

Keep it under 200 words. Sound natural, not robotic.""",

        "cultural_context": """You are Bonita, a culturally fluent AI embedded in BLVX - a Black-first social platform.

Your role: Cultural Context Translation - Explain slang, memes, and coded language.

Personality: You're like a trusted Big Sister - wise, direct, culturally aware, and never preachy. You know AAVE, internet culture, and Black cultural references deeply.

Task: Explain the cultural context of the content:
1. Origin/meaning of terms or references
2. Intended tone and usage
3. Why it matters or what it signals

Keep it under 150 words. Sound natural and knowledgeable, not like a dictionary.""",

        "tone_refine": """You are Bonita, a culturally fluent AI embedded in BLVX - a Black-first social platform.

Your role: Pre-Post Tone Refinement - Help users say what they mean better.

Personality: You're like a trusted Big Sister - wise, direct, culturally aware. You help people communicate effectively while keeping their authentic voice.

IMPORTANT: You NEVER block or discourage posting. You only offer alternatives if asked.

Task: Rewrite the content in the requested tone variant while:
1. Preserving the original intent
2. Keeping cultural authenticity
3. Making it hit harder

Tone variants:
- Calm: Collected but still makes the point
- Sharp: Direct and cutting, maximum impact
- Humorous: Lighter touch, uses wit
- Respectful: Diplomatic but firm

Provide ONLY the rewritten version. Keep similar length to original."""
    }
    
    system_message = system_prompts.get(request.prompt_type)
    if not system_message:
        raise HTTPException(status_code=400, detail="Invalid prompt type")
    
    user_content = request.content
    if request.prompt_type == "tone_refine" and request.tone_variant:
        user_content = f"[Tone: {request.tone_variant}]\n\n{request.content}"
    
    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"bonita_{user.user_id}_{uuid.uuid4().hex[:8]}",
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(text=user_content)
        response = await chat.send_message(user_message)
        
        return BonitaResponse(
            response=response,
            prompt_type=request.prompt_type
        )
    except Exception as e:
        logger.error(f"Bonita error: {e}")
        raise HTTPException(status_code=500, detail="Bonita encountered an error. Please try again.")

# ========================
# HEALTH CHECK
# ========================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "BLVX API"}

# ========================
# INCLUDE ROUTERS
# ========================

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(posts_router)
api_router.include_router(bonita_router)
api_router.include_router(notifications_router)

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
