# BLVX Changelog

## v1.6.0 (January 20, 2026)
### Admin Dashboard
- **Platform Statistics**: Overview of total users, posts, GCs, stoops, alerts
- **Recent Activity**: Track signups and active users (last 7 days)
- **User Management**: Search users, view details, ban/unban functionality
- **Content Moderation**: View all posts, delete violations
- **Alert Management**: Review and remove safety alerts
- **Admin Access Control**: Hardcoded admin user IDs for security
- **Settings Integration**: Admin link appears only for admin users

### Bug Fixes
- **Bonita Chat Fix**: Now handles both `bonita` and `bonita_ai` user IDs
- **Sidebar Polling**: Fixed message detection for both Bonita identifiers

## v1.5.0 (January 20, 2026)
### Bonita Conversational AI in Sidebar
- **1-on-1 Chat with Bonita**: Complete conversational AI experience in The Sidebar
- **Claude claude-sonnet-4-20250514 Integration**: Via Emergent LLM Key for culturally fluent responses
- **Real-time Polling**: Frontend polls every 1.5 seconds for Bonita's responses
- **Typing Indicator**: Animated dots while waiting for Bonita
- **Amber/Gold Styled Messages**: Distinct visual style for Bonita's messages
- **Multi-turn Conversation**: Context-aware responses with conversation history
- **Detailed BLVX Knowledge**: System prompt includes all BLVX features
- **"Chat with Bonita" CTA**: Prominent card on Sidebar page to start Bonita chat

### Bonita Profile Updates
- **New Avatar**: Updated profile picture (red headwrap lady photo)
- **User ID**: Both `bonita` and `bonita_ai` users have updated avatars
- **Startup Initialization**: Avatar is set on server startup

### WebSocket Enhancements
- **Sidebar WebSocket Endpoint**: `/ws/sidebar/{sidebar_id}` for real-time messaging
- **Connection Manager Updates**: Added sidebar connection tracking
- **Broadcast to Sidebar**: New method for real-time message delivery

### Group Chat Enhancements
- **@Bonita Avatar**: Bonita's responses in GC now include her avatar
- **WebSocket Broadcast**: Bonita's GC responses are broadcast via WebSocket

---

## v1.4.0 (January 19, 2026)
### WebSocket Real-Time Messaging
- `/ws/gc/{gc_id}` - Real-time GC messaging with typing indicators
- `/ws/stoop/{stoop_id}` - WebRTC signaling for audio streaming
- `/ws/notifications` - Real-time user notifications
- Connection Manager for tracking active WebSocket connections
- GC Page: Live connection status, typing indicators, real-time message delivery
- Stoop WebRTC Signaling infrastructure

---

## v1.3.0 (January 19, 2026)
### Link Preview Fix ("The Unfurler")
- BeautifulSoup OG tag scraping with graceful fallbacks
- Fixed Bonita's hallucinated links using Google Search URLs

### Light Mode Fix
- CSS properly updates body class and inverts colors

### The Lookout
- Crowdsourced safety alerts with Waze-like verification
- Alert types: Police, Safety Hazard, Protest, Vibe Check, Other
- Vouch/Cap verification mechanic (3 vouches = verified, 3 caps = dismissed)
- Auto-expiry after 2 hours
- Ticker at top of feed shows verified alert count
- Full alert panel with filter tabs

---

## v1.2.0 (January 19, 2026)
### Stoop Mic Fix
- Proper WebRTC error handling with toast notifications for microphone access failures

### Bonita's Receipts
- Spark posts now include reference URLs with rich link preview cards

### The Word (Trending)
- Trending topics widget in desktop right sidebar and mobile search tab
- /api/trending endpoint for hashtag aggregation
- /api/link-preview endpoint for URL metadata
- Updated Post schema with reference_url field
- Enhanced Search page with "The Word" tab for mobile users

---

## v1.1.0 (January 19, 2026)
- Added The Spark (AI content seeder)
- Added Media & GIF Support
- Added Theme Toggle (Cinema/Editorial modes)
- Integrated BLVX logo assets
- Fixed authentication flow (CORS configuration)
- Updated feed to include Bonita spark posts
- Created comprehensive test suite (96% pass rate)

---

## v1.0.0 (January 18, 2026)
- Initial release with core features
- Authentication (JWT + Google OAuth)
- The Block (public feed)
- The Cookout (mutual-only posts)
- The GC (group messaging)
- The Vouch (invite system)
- The Stoop (audio rooms with LiveKit)
- POV (video posts)
- Push Notifications infrastructure
