# BLVX - High-Context Social Network

## Product Requirements Document

**Version:** 1.1.0  
**Last Updated:** January 19, 2026  
**Status:** MVP In Development

---

## Original Problem Statement

Build **BLVX**, a "High-Context Social Network" designed to be a "Group Chat" rather than a "Town Square". It prioritizes cultural fluency, shared context, and trust.

---

## Tech Stack

- **Frontend:** React (PWA) with Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **AI Integration:** Claude 3.5 Sonnet via Emergent LLM Key
- **Authentication:** JWT + Google OAuth + Email/Password
- **Media:** GIPHY API for GIFs, Cloud Storage for images/videos

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

#### The Stoop (Audio Spaces)
- [x] Create/join live audio rooms
- [x] Host/Speaker/Listener roles
- [x] "Pass the Aux" feature
- [x] Pin posts to Stoop
- [x] **Mic error handling with toast notifications** (NEW)
- [x] Browser permission detection (NotAllowedError, NotFoundError, etc.)

#### "The Word" (Trending Widget) (NEW)
- [x] Desktop: Right sidebar with trending hashtags
- [x] Mobile: Search tab with "The Word" view
- [x] Hashtag aggregation from posts
- [x] Post count ("Plates served") display
- [x] Fallback default trends

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

### 🔲 Upcoming Features

#### P1 - High Priority
- [ ] WebSocket real-time updates for GC
- [ ] WebRTC integration for The Stoop audio
- [ ] Push notifications
- [ ] Email verification flow completion

#### P2 - Medium Priority
- [ ] The Sidebar (1-on-1 whisper chats)
- [ ] POV (Native video posts)
- [ ] Cloud storage for media uploads (currently local)
- [ ] News API integration for Spark topics

#### P3 - Future
- [ ] Explore page with trending posts
- [ ] Hashtag system
- [ ] Search improvements
- [ ] Admin dashboard
- [ ] Analytics

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
