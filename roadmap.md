# Ramblee Project Roadmap

This document tracks the entire development process of Ramblee, breaking down all features, pages, components, and database structures as outlined in the original product specification.

## Core Infrastructure & Database

- `[x]` Next.js 14+ App Router Setup
- `[x]` Tailwind CSS & Framer Motion Setup
- `[x]` Custom Typography (Clash Display, DM Sans, JetBrains Mono)
- `[x]` Supabase SSR Integration & Middleware
- `[x]` **Table**: `profiles`
- `[x]` **Table**: `games`
- `[x]` **Table**: `questions`
- `[ ]` **Table**: `participants` *(Next phase)*
- `[ ]` **Table**: `answers`
- `[ ]` **Table**: `game_results`
- `[ ]` **Table**: `follows`

---

## Phase 1 — Core Authentication & Dashboard

### Pages & Routes
- `[x]` **Landing Page** (`/`) - High-impact, interactive quiz demo, animated headers.
- `[x]` **Login Page** (`/login`) - High-contrast Google OAuth entry.
- `[x]` **Onboarding** (`/onboarding`) - Claim unique `@handle` and display name.
- `[x]` **Organizer Dashboard** (`/dashboard`) - Stats overview and recent games.

### Logic & Features
- `[x]` Google OAuth flow via NextAuth / Supabase
- `[x]` Route protection middleware (Redirect unauthenticated from `/dashboard`)
- `[x]` First-time login onboarding flow
- `[ ]` Complete real data fetching for Dashboard Stats (currently static structure)

---

## Phase 2 — Game Creation & AI Intelligence

### Pages & Routes
- `[x]` **Create Game** (`/create`) - Form for Game Title, Mode selection, and Topic input.
- `[x]` **Game Control Room** (`/dashboard/game/[id]`) - Organizer view of the generated questions and live room stats.

### Logic & Features
- `[x]` **AI Question Generator** - Gemini integration to ingest notes and output JSON questions.
- `[x]` Save generated questions to Supabase associated with the game.
- `[x]` Generate 6-character random Join Code.
- `[ ]` Allow organizers to edit/reorder AI questions before launching.
- `[ ]` File Upload support for AI context (PDF/DOCX).

---

## Phase 3 — Player Join & Live Game Screen

### Pages & Routes
- `[ ]` **Join Game** (`/join`) - Simple code entry screen.
- `[ ]` **Player Waiting Room** (`/play/[gameId]`) - Standby screen before the organizer starts the game.
- `[ ]` **Active Player Screen** (`/play/[gameId]`) - Fullscreen question display with 4 answer cards and countdown timer.
- `[ ]` **Live Leaderboard** - Intermediate screen shown between questions.

### Logic & Features
- `[ ]` **Participant Registration** - Validate join code and insert player into `participants` table.
- `[ ]` **Supabase Realtime (WebSockets)** - Sync game state between organizer and all players.
- `[ ]` Calculate points based on speed and accuracy.
- `[ ]` **Animations**: Question entry blur-in, card stagger, correct/wrong color pulsing.
- `[ ]` Time-out handling logic.

---

## Phase 4 — Social & Profiles

### Pages & Routes
- `[ ]` **Public Profile** (`/profile/[handle]`) - View another player's stats.
- `[ ]` **Personal Profile** (`/profile/me`) - View own full history.
- `[ ]` **Global Leaderboards** (`/leaderboard`).

### Logic & Features
- `[ ]` Game history logging.
- `[ ]` Follow system logic (`follower_id`, `following_id`).
- `[ ]` Player search by handle.

---

## Phase 5 — PWA & Polish

- `[ ]` Service Worker + Offline Shell caching.
- `[ ]` Mobile Install Prompt (PWA).
- `[ ]` Push notifications for scheduled games.
- `[ ]` Advanced Game Modes (Team Mode, Open Elimination).
- `[ ]` Branded rooms support.