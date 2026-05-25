# Phase 2: The "Beast" Recommendation Engine Architecture

You asked a brilliant question: **"Will inserting a Gemini API key hit rate limits fast? Why don't other music apps do this?"**

You are 100% correct. If we ping the Gemini API every time a user opens the app, we would hit rate limits instantly, the app would take 5 seconds to load (unacceptable latency), and it would cost a fortune. That is why basic projects fail in production.

To build a true **production-grade** Beast Engine that outclasses the market, we must separate **Intelligence** from **Execution**.

## Core Architecture: The "Cached Vibe Graph"

Instead of using Gemini to recommend songs per user, we will use Gemini to generate highly complex "Vibe Matrices", cache them globally using Upstash Redis, and then execute local graph traversals on the client side.

### 1. Global Daily Curation (The LLM Layer)
- We will create a Vercel Serverless Function (e.g., `api/oracle.ts`) that runs **once a day** (or once every 6 hours).
- This function uses the Gemini API to analyze current global trends, weather patterns, and musical shifts to generate 10-15 hyper-specific search prompts (e.g., `"Mellow Indie Acoustic for Rainy Afternoons"`, `"High BPM Delhi Phonk"`).
- These generated prompts and their resulting `ytmusic` tracks are saved to **Upstash Redis** globally.
- **Result:** Gemini is called only 4 times a day, costing $0, zero rate limits, but the app gets fresh, AI-curated playlists constantly.

### 2. The Local Context Engine (The User Layer)
- When the user opens the Home Page, the app instantly reads their **Local IndexedDB**:
  - Time of day
  - Weather (via our weather context)
  - Top 3 most listened genres (Gamification stats)
  - Last 5 played artists
- The app uses a fast, local **Weighted Scoring Algorithm** (which we already started in `recommendEngine.ts`) to cross-reference the user's local context with the globally cached AI playlists and the `ytmusic.getUpNext` graph.

### 3. Infinite "Radio" Graph Traversal
- When a user plays a song from the recommendation engine, we don't just queue a static list.
- We aggressively pre-fetch `ytmusic.getUpNext()` for that specific song in the background and blend it with the user's historical `skippedIds`. If a song has been skipped before, the Beast Engine instantly purges it from the queue and fetches a new node.

## User Review Required

Does this architecture make sense? By using Gemini globally (cached) and a mathematical scoring engine locally (instant), we achieve:
1. **0ms Latency** for the user.
2. **Infinite Scale** (handles 1 user or 1 million users with the same API load).
3. **No Rate Limiting** on Gemini.

## Proposed Code Changes

### `api/oracle.ts` [NEW]
- A Vercel API route that fetches curated daily themes.
- If the cache is stale, it optionally pings Gemini (if an API key is provided) or uses a deterministic rotation of 50 complex query templates to fetch fresh tracks from `ytmusic-api`.
- Caches the payload in Redis for 6 hours.

### `src/services/recommendEngine.ts` [MODIFY]
- Upgrade the `scoreCandidate` math.
- Introduce `weightMatrix`:
  - `TimeWeight`: Boosts acoustic in mornings, heavy bass at night.
  - `WeatherWeight`: Boosts minor keys/lofi when raining.
  - `TasteWeight`: Boosts tracks matching the user's top 2 gamification genres.

### `src/pages/HomePage.tsx` [MODIFY]
- Wire the Home Page to fetch from `api/oracle` for the "AI Curated" section.
- Feed the current weather and time into `recommendEngine.ts` to dynamically sort the user's "Made For You" lanes on the fly.

## Verification
- We will monitor the Network tab to ensure the Home Page loads in < 500ms.
- We will verify that changing the local time or weather (via mock) instantly resorts the track recommendations without making an external LLM call.
