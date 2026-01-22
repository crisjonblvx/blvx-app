# BLVX - High-Context Social Network

## Product Requirements Document

**Version:** 2.0.0  
**Last Updated:** January 22, 2026  
**Status:** MVP Complete + V1 Launch Ready

---

## Original Problem Statement

Build **BLVX**, a "High-Context Social Network" designed to be a "Group Chat" rather than a "Town Square". It prioritizes cultural fluency, shared context, and trust.

---

## Tech Stack

- **Frontend:** React (PWA) with Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI (Python) - Modularized structure
- **Database:** MongoDB
- **AI Integration:** Claude 3.5 Sonnet via Emergent LLM Key
- **Authentication:** JWT + Google OAuth + Email/Password (Token-first for mobile)
- **Media:** GIPHY API for GIFs, Cloudinary for images/videos
- **Real-time Audio:** LiveKit (wss://blvx-2j4i3fsu.livekit.cloud)
- **Push Notifications:** Web Push API with VAPID keys
- **Email Service:** Resend (optional, falls back to console logging)

---

## User Personas

1. **The Culture Curator** - Creates and shares high-context content
2. **The Lurker** - Consumes content, occasionally engages
3. **The Connector** - Vouches for new members, builds networks
4. **The Host** - Creates Stoop sessions, leads conversations

---

## Core Features

### ✅ Implemented

#### Authentication System
- [x] Google OAuth integration (via Emergent)
- [x] Email/Password signup with verification
- [x] JWT session management
- [x] Session persistence across page refreshes
- [x] Email verification with code (Resend integration ready)
- [x] **Password Reset Flow** - Forgot password with branded email, reset page
- [x] **Remember Me (30 days)** - Extended session option on login
- [x] **Token-Based Authentication** (COMPLETED Jan 22, 2026)
  - [x] Bearer token in Authorization header
  - [x] Token stored in localStorage (mobile Safari/ITP compatible)
  - [x] Axios interceptor for automatic token injection
  - [x] Cookie fallback for backwards compatibility
  - [x] Auto-login after email verification

#### The Block (Public Feed)
- [x] Chronological feed of posts
- [x] Post composition with 500 character limit
- [x] Like, Reply, Quote, Share actions
- [x] Visibility toggle (Block vs Cookout)

#### The Cookout (Private Posts)
- [x] Privacy filter for vetted circles
- [x] Visibility toggle in composer

#### Media & GIF Support (NEW)
- [x] **"Receipts"** - Image upload button
- [x] **"The Reaction"** - GIF picker with GIPHY integration
- [x] GIF search with trending and quick tags
- [x] Media preview in composer
- [x] Media display in feed posts

#### The Spark (Content Seeder) (NEW)
- [x] AI-generated conversation starters
- [x] Bonita "Town Crier" mode
- [x] Admin tooling in Settings
- [x] Topic categories: Music, Tech, Culture
- [x] Posts appear in main feed as @bonita

#### Branding & Theme (NEW)
- [x] BLVX logo assets integrated
- [x] **Cinema Mode (Dark)** - Default, immersive
- [x] **Editorial Mode (Light)** - Magazine aesthetic
- [x] Theme toggle in Settings
- [x] Theme-aware logo swapping
- [x] Theme persistence in localStorage

#### Bonita AI Integration
- [x] Backend service with Claude 3.5 Sonnet
- [x] Thread Decompression mode
- [x] Vibe Check mode
- [x] Tone Rewrite mode
- [x] Cultural context awareness

#### The GC (Group Chat)
- [x] Create/join group chats
- [x] Real-time messaging UI
- [x] Live Drop feature (drop posts into chat)
- [x] **WebSocket real-time messaging** (NEW)
- [x] **Typing indicators** (NEW)
- [x] **Live connection status** (NEW)

#### The Stoop (Audio Spaces)
- [x] Create/join live audio rooms
- [x] Host/Speaker/Listener roles
- [x] "Pass the Aux" feature
- [x] Pin posts to Stoop
- [x] **Mic error handling with toast notifications**
- [x] Browser permission detection (NotAllowedError, NotFoundError, etc.)
- [x] **LiveKit Integration** (NEW - Jan 20, 2026)
  - [x] Backend token generation endpoint (/api/stoop/{id}/livekit-token)
  - [x] LiveKit client SDK integration (livekit-client, @livekit/components-react)
  - [x] Real-time audio streaming via LiveKit cloud
  - [x] Speaker/Listener permissions in JWT tokens
  - [x] Connection state management (connecting, connected, reconnecting)
  - [x] Participant tracking and active speaker detection
  - [x] Audio track attachment/detachment
- [x] **Live speaker indicators** (GREEN)
- [x] Debug panel showing connection status

#### "The Word" (Trending Widget) (NEW)
- [x] Desktop: Right sidebar with trending hashtags
- [x] Mobile: Search tab with "The Word" view
- [x] Hashtag aggregation from posts
- [x] Post count ("Plates served") display
- [x] Fallback default trends

#### "The Lookout" (Safety Alerts) (NEW)
- [x] Alert types: Police, Safety Hazard, Protest, Vibe Check, Other
- [x] Location-based alerts with city/neighborhood
- [x] Vouch (confirm) / Cap (dispute) verification mechanic
- [x] Status: Pending → Verified (3+ vouches) or Dismissed (3+ caps)
- [x] Auto-expiry (2 hours)
- [x] Ticker bar at top of feed for verified alerts
- [x] Full alert panel with create modal and filter tabs
- [x] Color-coded alert types with icons

#### Rich Link Previews (NEW)
- [x] BeautifulSoup OG tag scraping
- [x] Graceful fallbacks for domains
- [x] Special handling for Google Search URLs
- [x] Spark posts use non-404 Google Search links

#### Bonita "Time Synchronization" (CRITICAL FIX - Jan 19, 2026)
- [x] **Time-anchored search queries** - Queries include current month/year
- [x] **Stale content filter** - Rejects 2023/2024 content as current news
- [x] **Dynamic system prompt** - Injects CURRENT_DATE into Bonita prompts
- [x] **DuckDuckGo news search** - Uses ddgs.news() for fresher results
- [x] **Final safety check** - Replaces any stale years in output

#### Bonita's "Receipts" (Rich Media) (NEW)
- [x] Spark posts include reference_url field
- [x] Link preview cards (OpenGraph-style)
- [x] Domain-specific mock images for known sources
- [x] Title, description, and domain display

#### User Profiles
- [x] Profile page with posts
- [x] Follow/Unfollow system
- [x] Plates (invite credits) display
- [x] Bio and profile picture

#### The Vouch System
- [x] Plate creation (invite generation)
- [x] Plate redemption (invite acceptance)
- [x] Vouch tracking
- [x] **The Vouch page UI** (NEW - Jan 19, 2026)
- [x] Plates balance display with Create Plate button
- [x] Code redemption input
- [x] Active/Redeemed plates list
- [x] "How The Vouch Works" explanation

#### The Sidebar (1-on-1 Whispers) (NEW - Jan 19, 2026)
- [x] Backend API for creating/managing sidebars
- [x] Message sending and retrieval
- [x] Sidebar list page at /sidebar
- [x] Chat view with message history
- [x] Whisper button on user profiles
- [x] Real-time-ready architecture

#### Bonita Conversational AI in Sidebar (COMPLETED - Jan 20, 2026)
- [x] 1-on-1 chat with Bonita in The Sidebar
- [x] Claude claude-sonnet-4-20250514 integration via Emergent LLM Key
- [x] Bonita's new avatar (red headwrap lady photo)
- [x] Real-time polling (1.5s) for Bonita's responses
- [x] Amber/gold styled messages for Bonita
- [x] Typing indicator while waiting for Bonita
- [x] Multi-turn conversation support
- [x] Detailed BLVX feature knowledge in system prompt
- [x] "Chat with Bonita" CTA card on Sidebar page
- [x] WebSocket endpoint for sidebar chats (/ws/sidebar/{id})
- [x] @Bonita in Group Chats (sparkle button)

#### Dynamic Spark Topics (NEW - Jan 19, 2026)
- [x] Culturally diverse content categories (Music, Tech, Culture, Politics, Finance)
- [x] POC/BIPOC focused search queries
- [x] Time-anchored search (current month/year)
- [x] Stale content filter (rejects 2023/2024 news)
- [x] /api/spark/trending endpoint for live news
- [x] /api/spark/auto endpoint for batch post generation
- [x] Hashtags: #BlackExcellence, #POC, #LatinoCommunity, #BIPOC

#### Cloud Media Storage - Cloudinary (COMPLETED - Jan 19, 2026)
- [x] Cloudinary integration (Cloud Name: dtr9wu1fw)
- [x] Image upload with auto-optimization
- [x] Video upload (50MB limit) with transcoding
- [x] CDN delivery worldwide
- [x] Storage status in /api/health endpoint
- [x] Fallback to local storage if needed

#### POV - Native Video Posts (COMPLETED - Jan 19, 2026)
- [x] Video upload button in composer ("POV")
- [x] 50MB file size limit for videos
- [x] Video player in PostCard with controls
- [x] Upload progress indicator
- [x] Cloudinary video transcoding

#### Culture Calendar (COMPLETED - Jan 19, 2026)
- [x] BIPOC-focused significant dates database
- [x] MLK Day, Juneteenth, Black History Month
- [x] Hispanic Heritage Month, Cinco de Mayo
- [x] Kwanzaa, Indigenous Peoples' Day
- [x] Native American Heritage Month
- [x] API endpoints: /api/spark/calendar, /api/spark/calendar/post
- [x] Settings page "Post Today's Event" button
- [x] Bonita auto-posts for cultural events

#### Push Notifications (COMPLETED - Jan 19, 2026)
- [x] VAPID key generation and storage
- [x] Service worker for push handling (sw-push.js)
- [x] Subscribe/Unsubscribe endpoints
- [x] usePushNotifications hook
- [x] Settings page toggle for notifications
- [x] Test notification endpoint
- [x] VAPID keys configured

### 🔲 Upcoming Features

#### P1 - High Priority
- [ ] Add RESEND_API_KEY for production email sending
- [ ] Browser push notification permission testing in production

#### P2 - Medium Priority
- [ ] News API integration for more dynamic Spark topics
- [ ] Full WebRTC testing in deployed environment

#### P3 - Future
- [ ] Explore page with trending posts
- [ ] Hashtag system
- [ ] Search improvements
- [ ] Analytics
- [ ] Voice messages for Bonita chats

#### ✅ Recently Completed (Jan 21, 2026)
- [x] **Backend Modularization Started**
  - Created /backend/models/ for Pydantic schemas
  - Created /backend/services/ for email service
  - Created /backend/utils/ for helper functions
- [x] **Email Verification Flow**
  - Resend email service integration
  - Beautiful HTML email templates (BLVX branded)
  - Verification code emails
  - Welcome emails on successful verification
  - Fallback to console logging if RESEND_API_KEY not set
- [x] **Push Notifications Production Ready**
  - VAPID keys generated and configured
  - /api/push/vapid-key endpoint working
  - Service worker (sw-push.js) configured
  - Frontend hook (usePushNotifications) ready

#### ✅ Previously Completed (Jan 20, 2026)
- [x] Admin Dashboard
  - Platform stats overview (users, posts, GCs, stoops, alerts)
  - User management (search, ban/unban)
  - Post moderation (view, delete)
  - Alert management
  - Admin-only access via hardcoded user IDs
  - Settings integration for admin link

---

## UI/UX Design Guidelines

### Theme: "A24 Film Studio meets Minimalist Streetwear"

#### Cinema Mode (Dark) - Default
- Background: Deep Black (#000000)
- Text: Stark White (#FFFFFF)
- Vibe: Immersive, focus on content

#### Editorial Mode (Light)
- Background: Stark White (#FFFFFF)
- Text: Deep Black (#000000)
- Vibe: Sharp, high-fashion magazine

### Typography
- **Display Font:** Oswald (headings, labels)
- **Body Font:** Inter (content, UI)
- **Mono Font:** JetBrains Mono (timestamps, counts)

### Logo Assets
- `/assets/logo-white.png` - Header logo (dark mode)
- `/assets/logo-dark.png` - Header logo (light mode)
- `/assets/icon-white.png` - App icon (dark mode)
- `/assets/icon-dark.png` - App icon (light mode)

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Email registration
- `POST /api/auth/verify` - Email verification
- `POST /api/auth/login` - Email login
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/session` - Session token exchange
- `GET /api/auth/me` - Current user info

### Posts
- `GET /api/posts/feed` - User feed (includes Spark posts)
- `GET /api/posts/explore` - Public explore feed
- `POST /api/posts` - Create post (supports media)
- `GET /api/posts/{id}` - Get single post
- `DELETE /api/posts/{id}` - Delete post
- `POST /api/posts/{id}/like` - Like post
- `DELETE /api/posts/{id}/like` - Unlike post
- `GET /api/posts/{id}/replies` - Get replies

### Trending & Link Preview
- `GET /api/trending` - Get trending hashtags ("The Word")
- `GET /api/link-preview` - Get OpenGraph preview for URL

### The Spark
- `POST /api/spark/drop` - Generate AI conversation starter
- `GET /api/spark/categories` - Available topic categories

### Media
- `POST /api/upload` - Upload media file
- `GET /api/media/{filename}` - Serve uploaded media

### Users
- `GET /api/users/search` - Search users
- `GET /api/users/{username}` - User profile
- `POST /api/users/{id}/follow` - Follow user
- `DELETE /api/users/{id}/follow` - Unfollow user

### Bonita AI
- `POST /api/bonita/ask` - Ask Bonita

### GC (Group Chat)
- `GET /api/gc` - List user's GCs
- `POST /api/gc` - Create GC
- `GET /api/gc/{id}/messages` - Get messages
- `POST /api/gc/{id}/messages` - Send message

### Stoop (Audio)
- `GET /api/stoop/live` - Live stoops
- `POST /api/stoop` - Create stoop
- `GET /api/stoop/{id}` - Get stoop details
- `POST /api/stoop/{id}/join` - Join stoop
- `POST /api/stoop/{id}/leave` - Leave stoop

### Vouch System
- `POST /api/vouch/plate` - Create plate
- `POST /api/vouch/redeem` - Redeem plate

---

## Database Schema

### User
```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "username": "string",
  "picture": "string",
  "bio": "string",
  "password_hash": "string (optional)",
  "email_verified": "boolean",
  "plates_remaining": "number",
  "reputation_score": "number",
  "is_day_one": "boolean",
  "followers_count": "number",
  "following_count": "number",
  "posts_count": "number",
  "vouched_by": "string",
  "created_at": "datetime"
}
```

### Post
```json
{
  "post_id": "string",
  "user_id": "string",
  "content": "string",
  "media_url": "string (optional)",
  "media_type": "string (image|video|gif)",
  "gif_metadata": "object (optional)",
  "post_type": "string (original|reply|quote)",
  "parent_post_id": "string (optional)",
  "quote_post_id": "string (optional)",
  "visibility": "string (block|cookout)",
  "is_spark": "boolean",
  "reply_count": "number",
  "repost_count": "number",
  "like_count": "number",
  "created_at": "datetime"
}
```

---

## Test Credentials

- **Email:** testuser@blvx.app
- **Password:** testpassword123

---

## File Structure

```
/app
├── backend/
│   ├── server.py          # Main FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── AppShell.jsx
│   │   │   ├── ComposerModal.jsx
│   │   │   ├── GifPicker.jsx      # NEW
│   │   │   ├── Header.jsx
│   │   │   ├── MediaToolbar.jsx   # NEW
│   │   │   ├── PostCard.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── ThemeContext.js    # NEW
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── App.js
│   ├── public/
│   │   └── assets/        # Logo files
│   └── package.json
├── tests/
│   └── test_blvx_backend.py
└── memory/
    └── PRD.md
```

---

## Known Issues

1. **Stoop endpoint naming** - `/api/stoop/live` exists but tests expected `/api/stoop/active` (minor test issue)
2. **Light mode sidebar** - Sidebar remains dark in Editorial mode (design consideration)

---

## Changelog

### v1.5.0 (January 20, 2026)
- **Bonita Conversational AI in Sidebar**: Complete 1-on-1 chat with AI auntie
  - Claude claude-sonnet-4-20250514 integration via Emergent LLM Key
  - Real-time polling for responses (1.5 second intervals)
  - Amber/gold styled messages with typing indicator
  - Multi-turn conversation with context awareness
  - Detailed BLVX feature knowledge in system prompt
- **Bonita's New Avatar**: Updated profile picture (red headwrap photo)
- **WebSocket Sidebar Endpoint**: `/ws/sidebar/{sidebar_id}` for real-time messaging
- **Enhanced @Bonita in GC**: Added avatar to GC Bonita responses
- **"Chat with Bonita" CTA**: Prominent card on Sidebar page to start Bonita chat

### v1.4.0 (January 19, 2026)
- **WebSocket Real-Time Messaging**: Added WebSocket endpoints for GC and Stoop
  - `/ws/gc/{gc_id}` - Real-time GC messaging with typing indicators
  - `/ws/stoop/{stoop_id}` - WebRTC signaling for audio streaming
  - `/ws/notifications` - Real-time user notifications
- **Connection Manager**: Backend tracks active WebSocket connections
- **GC Page Updates**: Live connection status, typing indicators, real-time message delivery
- **Stoop WebRTC Signaling**: Infrastructure for peer-to-peer audio connections

### v1.3.0 (January 19, 2026)
- **Link Preview Fix ("The Unfurler")**: Added BeautifulSoup OG tag scraping with graceful fallbacks
- **Fixed Bonita's Hallucinated Links**: Spark posts now use Google Search URLs that never 404
- **Light Mode (Editorial) Fix**: CSS properly updates body class and inverts colors
- **The Lookout**: Crowdsourced safety alerts with Waze-like verification
  - Alert types: Police, Safety Hazard, Protest, Vibe Check, Other
  - Vouch/Cap verification mechanic (3 vouches = verified, 3 caps = dismissed)
  - Auto-expiry after 2 hours
  - Ticker at top of feed shows verified alert count
  - Full alert panel with filter tabs

### v1.2.0 (January 19, 2026)
- **Stoop Mic Fix**: Added proper WebRTC error handling with toast notifications for microphone access failures
- **Bonita's Receipts**: Spark posts now include reference URLs with rich link preview cards (OpenGraph-style)
- **The Word (Trending)**: Added trending topics widget to desktop right sidebar and mobile search tab
- Added /api/trending endpoint for hashtag aggregation
- Added /api/link-preview endpoint for URL metadata
- Updated Post schema with reference_url field
- Enhanced Search page with "The Word" tab for mobile users

### v1.1.0 (January 19, 2026)
- Added The Spark (AI content seeder)
- Added Media & GIF Support
- Added Theme Toggle (Cinema/Editorial modes)
- Integrated BLVX logo assets
- Fixed authentication flow (CORS configuration)
- Updated feed to include Bonita spark posts
- Created comprehensive test suite (96% pass rate)

### v1.0.0 (Initial)
- Core authentication (Google OAuth + Email)
- The Block feed
- The Cookout privacy
- Bonita AI integration
- Basic GC and Stoop UI
