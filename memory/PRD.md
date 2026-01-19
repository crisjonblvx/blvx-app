# BLVX - Product Requirements Document

## Original Problem Statement
BLVX is a Black-first, culture-native social network inspired by Black Twitter but designed to reduce chaos, preserve context, and support community without policing speech. Mobile-first PWA with React, FastAPI, MongoDB.

## Architecture
- **Frontend:** React PWA with Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI with Motor (async MongoDB driver)
- **Database:** MongoDB
- **Authentication:** Emergent Google OAuth + JWT session management
- **AI:** Claude Sonnet 4.5 via Emergent LLM Key for Bonita AI

## User Personas
1. **Culture Creators** - Want authentic Black expression without over-moderation
2. **Community Members** - Seeking meaningful conversations over viral content
3. **Newcomers** - Need cultural context to participate meaningfully

## Core Requirements (Static)
- Mobile-first PWA architecture
- High-contrast black & white cinematic aesthetic
- Strict reverse-chronological feed (no algorithm)
- Bonita AI for cultural context, thread decompression, and tone refinement
- JWT + Google OAuth authentication
- Posts up to 500 characters ("BLVXes")
- Replies, reposts, and quote posts

## What's Been Implemented (December 2025)

### Backend APIs
- [x] Authentication (Google OAuth via Emergent, session management)
- [x] User profiles (CRUD, follow/unfollow)
- [x] Posts (create, read, like, delete)
- [x] Feed (following + explore, chronological)
- [x] Thread views with replies
- [x] Notifications system
- [x] Search (users and posts)
- [x] Bonita AI integration (Claude Sonnet 4.5)

### Frontend Pages
- [x] Landing page with Google OAuth
- [x] Home feed (Following/Explore tabs)
- [x] Search page (People/Posts tabs)
- [x] Bonita page (Context/Decompress/Tone Lab)
- [x] Notifications page
- [x] Profile page with edit functionality
- [x] Thread/Post detail page
- [x] Settings page

### UI Components
- [x] Mobile bottom navigation
- [x] Desktop left sidebar
- [x] Desktop right Bonita panel
- [x] FAB for new post
- [x] Post composer with Bonita integration
- [x] Noise overlay texture

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- [ ] Push notifications
- [ ] Image uploads for posts
- [ ] Media attachments

### P1 (High Priority)
- [ ] Direct messages
- [ ] Hashtag support
- [ ] Trending topics
- [ ] User verification system

### P2 (Medium Priority)
- [ ] Lists/Groups
- [ ] Bookmarks
- [ ] Post analytics
- [ ] Dark/Light theme toggle

## Next Tasks
1. Implement image upload service (consider cloud storage integration)
2. Add push notification support
3. Build direct messaging feature
4. Implement hashtag parsing and trending algorithm
