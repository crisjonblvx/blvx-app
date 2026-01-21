# /app/backend/models/__init__.py
"""Pydantic models and schemas for BLVX"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    user_id: str
    email: str
    name: str = ""
    picture: str = ""
    username: str = ""
    bio: str = ""
    verified: bool = False
    email_verified: bool = False
    reputation_score: int = 100
    plates_remaining: int = 10
    is_day_one: bool = False
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    vouched_by: Optional[str] = None
    created_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None


class EmailSignup(BaseModel):
    email: EmailStr
    password: str
    name: str


class EmailLogin(BaseModel):
    email: EmailStr
    password: str


class VerifyEmail(BaseModel):
    email: EmailStr
    code: str


class PostBase(BaseModel):
    post_id: str
    author_id: str
    content: str = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # 'image' | 'video' | 'gif'
    media_thumbnail: Optional[str] = None
    cookout_only: bool = False
    reply_to: Optional[str] = None
    quote_of: Optional[str] = None
    reference_url: Optional[str] = None
    link_preview: Optional[dict] = None
    likes: List[str] = []
    reposts: List[str] = []
    replies_count: int = 0
    views: int = 0
    created_at: Optional[datetime] = None


class PostCreate(BaseModel):
    content: str = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    media_thumbnail: Optional[str] = None
    cookout_only: bool = False
    reply_to: Optional[str] = None
    quote_of: Optional[str] = None


class NotificationBase(BaseModel):
    notification_id: str
    user_id: str
    type: str  # 'like' | 'reply' | 'follow' | 'mention' | 'repost' | 'vouch'
    from_user_id: str
    post_id: Optional[str] = None
    read: bool = False
    created_at: Optional[datetime] = None


class GCCreate(BaseModel):
    name: str


class StoopCreate(BaseModel):
    title: str


class BonitaRequest(BaseModel):
    content: str
    mode: str = "conversation"  # 'conversation' | 'vibe_check' | 'tone_rewrite'
    context: Optional[str] = None


class BonitaResponse(BaseModel):
    response: str
    mode: str


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict


class AlertCreate(BaseModel):
    alert_type: str  # 'police', 'safety', 'protest', 'vibe', 'other'
    description: str
    location: Optional[str] = None
