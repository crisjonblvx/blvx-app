# BLVX - Product Requirements Document

## Original Problem Statement
BLVX is the world's first High-Context Social Network. While legacy platforms are "Town Squares" (noisy, chaotic, low-trust), BLVX is the "Group Chat" (high-trust, shared language, culturally fluent). Culture-Native. Built for users who speak the language of culture without needing to explain it.

## Architecture
- **Frontend:** React PWA with Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI with Motor (async MongoDB driver)
- **Database:** MongoDB
- **Authentication:** Emergent Google OAuth + JWT session management
- **AI:** Claude Sonnet 4.5 via Emergent LLM Key for Bonita AI

## User Personas
1. **Culture Creators** - Want authentic expression in a high-trust environment
2. **Day Ones** - Vouched members with Cookout access
3. **New Members** - Invited via Plates, building reputation

## Core Requirements (BLVX Dictionary)
- **The Block** - Public feed, chronological, no algorithm
- **The Cookout** - Private vetted circles (mutuals only)
- **The GC** - Persistent group messaging with Bonita integration
- **The Sidebar** - 1-on-1 whisper threads
- **The Stoop** - Live audio rooms
- **Plates** - Invite system with accountability
- **Bonita** - Culturally fluent AI companion

## What's Been Implemented (December 2025)

### Backend APIs
- [x] Authentication (Google OAuth via Emergent, JWT sessions)
- [x] User profiles with reputation score and plates
- [x] Posts with visibility toggle (Block/Cookout)
- [x] The Vouch system (Plates creation, redemption)
- [x] The GC (Group Chat with Bonita concierge)
- [x] The Stoop (Live audio rooms)
- [x] The Sidebar (1-on-1 DMs)
- [x] Feed (following + explore, chronological)
- [x] Notifications system
- [x] Bonita AI (3 modes: conversation, vibe_check, tone_rewrite)

### Frontend Pages
- [x] Landing page with BLVX branding
- [x] Home (The Block with Following/Explore tabs)
- [x] The Stoop (Audio rooms listing)
- [x] Search (People/Posts)
- [x] The GC (Group messaging)
- [x] Bonita (AI companion interface)
- [x] Profile with reputation display
- [x] Settings

### Design
- [x] A24 Film Studio meets Minimalist Streetwear aesthetic
- [x] High-contrast black & white
- [x] Inter (body) + Oswald (headings) fonts
- [x] Mobile-first PWA architecture
- [x] Noise overlay for film grain effect

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- [ ] WebRTC for The Stoop audio
- [ ] Push notifications
- [ ] Image/video uploads

### P1 (High Priority)
- [ ] Swipe-to-Sidebar from GC messages
- [ ] Live Drop (drag posts into GC)
- [ ] POV (video commentary)
- [ ] Reputation decay for vouching trolls

### P2 (Medium Priority)
- [ ] Pass the Aux UI for Stoop speakers
- [ ] Auto-captions by Bonita for videos
- [ ] Vibe Check heat map on posts

## Next Tasks
1. Implement WebRTC for real-time audio in The Stoop
2. Add image/video upload service
3. Build Swipe-to-Sidebar gesture
4. Implement reputation decay system
