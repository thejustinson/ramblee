# RAMBLEE — Product Specification
### *The Live Quiz Platform Built for Real Rooms and Real Stakes*

---

## Overview

**Ramblee** is a real-time, multiplayer quiz platform designed for group play in physical and virtual spaces — churches, classrooms, corporate events, community gatherings, and competitive leagues. It combines AI-powered question generation with live game mechanics, a social layer, and a tournament-bracket system that lets any room go from crowd to champion in minutes.

> Think Kahoot meets a proper tournament. But cleaner. And smarter.

---

## Branding

### Name
**Ramblee** — playful but sharp. The double-e ending gives it energy and distinctiveness; "ramble" carries the idea of open discourse, debate, and movement — redirected here into competitive speed and knowledge.

### Tagline
*"The fastest mind wins."*

### Color Palette

| Role | Color | Hex |
|---|---|---|
| Background | Pure Black | `#0A0A0A` |
| Surface | Off-Black | `#111111` |
| Card | Dark Gray | `#1A1A1A` |
| Border | Subtle | `#2A2A2A` |
| Primary Text | Pure White | `#FFFFFF` |
| Secondary Text | Muted White | `#A0A0A0` |
| Accent / CTA | Electric Lime | `#C8FF00` |
| Accent Alt | Warm White | `#F5F5F0` |
| Correct | Soft Green | `#4ADE80` |
| Wrong | Soft Red | `#F87171` |
| Warning / Timer | Amber | `#FBBF24` |

The visual identity is **monochromatic tension** — black and white as the foundation with a single electric accent (lime green) that functions as the "live" signal. Used sparingly, it creates high-contrast moments that feel urgent.

### Typography

| Role | Font | Style |
|---|---|---|
| Display / Hero | **Clash Display** (Variable) | Bold, wide-tracked, uppercase for scores/questions |
| Body / UI | **DM Sans** | Clean, legible, neutral weight for answers, labels |
| Mono / Codes | **JetBrains Mono** | Room codes, join links, stats |

Import via Fontshare (Clash Display, DM Sans) and Google Fonts (JetBrains Mono).

### Visual Language
- **Fullscreen takeover** for active questions — the screen IS the game.
- **Hard-edge geometry**: sharp cards, thin 1px borders, no excessive rounding.
- **Motion**: fast entry animations (50–80ms), slow-fade exits. Timer pressure communicated through color shifts (green → amber → red) and subtle screen pulse.
- **Grid-breaking layouts**: question text punches at large scale; answer options sit in a clean 2×2 or 4-column grid at bottom half of screen.

---

## Core Features

### 1. Authentication
- **Google OAuth** via NextAuth.js (primary method)
- Email/password fallback (optional v2)
- User profiles: display name, avatar, handle (`@name`), game history, stats

---

### 2. Room Modes

#### Mode A — Open Elimination (Mass Play → Finals)
Designed for large groups (e.g. 100+ people in a church hall).

**Flow:**
1. Organiser creates a room, sets question set, and projects a **join code** / **QR code** on screen.
2. All participants join via phone/laptop — no download needed (PWA auto-prompt on join).
3. **Qualifying Round**: A question appears on all screens simultaneously. Everyone answers. Top N fastest correct answers advance.
4. **Finalist Reveal**: The N finalists are shown on the main display. They are called up or remain on devices for the Final Round.
5. **Final Round**: Finalist-only game — remaining questions played head-to-head until one winner.

#### Mode B — Standard Quiz (Everyone Plays)
All participants compete through all questions. Points accumulate by speed + accuracy. Leaderboard shown after each question.

#### Mode C — Team Mode *(v2)*
Groups compete as teams. Fastest team member to answer earns points for the team.

---

### 3. Organiser Dashboard

- **Create Game**: Set room name, mode, max finalists (for Mode A), time per question, number of rounds.
- **Upload Notes**: PDF, DOCX, plain text — AI processes the content and generates questions.
- **AI Question Generator**:
  - Set number of questions to generate (e.g. 20)
  - Set difficulty distribution (e.g. 40% Easy / 40% Medium / 20% Hard)
  - Review, edit, reorder, or discard AI-generated questions before publishing
  - Option to add manual questions
- **Game Controls**: Start, Pause, Next Question, Skip, End Game — all from organiser view.
- **Room Code / Link**: Auto-generated, shareable, can be set to expire.
- **Live View**: Real-time view of participants, response counts, leaderboard.

---

### 4. Player Experience

#### Joining
- Visit link or enter room code at `ramblee.fun/join`
- Enter display name (or use profile if logged in)
- Waiting room with live participant count and ambient animation

#### In-Game
- **Fullscreen question display**: Large, readable question text occupies top 55% of screen.
- **Answer options**: 4 options (A/B/C/D) in bold cards — 2×2 grid on mobile, 4 columns on desktop.
- **Timer**: Circular or linear countdown. Color shifts from white → amber → red as time expires.
- **Instant feedback**: Correct/wrong reveal with subtle animation after submission or time-out.
- **Running score**: Personal score shown between questions.

#### Animations (fullscreen transitions)
- **Question Entry**: Blur-in + slide-up from bottom (~60ms ease-out)
- **Options Stagger**: Cards fly in sequentially (50ms delay between each)
- **Correct Answer**: Green pulse + confetti fragment (lightweight canvas)
- **Wrong Answer**: Red flash + subtle shake
- **Question Exit**: Fade-to-black before next question loads
- **Leaderboard In**: Cards stack-animate into position from bottom

---

### 5. Social Layer

- **Player Profiles**: Handle, avatar, game stats (games played, win rate, average response time, accuracy %)
- **Play History**: Full log of games played — score, position, accuracy per game
- **Discover Players**: Search by name/handle
- **Follow System**: Follow other players, see their recent activity on a lightweight feed
- **Achievements** *(v2)*: Badges for milestones (First Win, Speed Demon, etc.)

---

### 6. AI Question Generation

**Input**: Organiser uploads notes/documents (PDF, DOCX, TXT, paste text).

**Process**:
1. Document is chunked and passed to Claude API with a structured prompt.
2. Model returns N questions in JSON format with: `question`, `options (A-D)`, `correct_answer`, `difficulty`, `source_reference`.
3. Questions appear in an editable table in the dashboard — organiser can tweak before saving.

**Difficulty logic**:
- Easy: factual recall
- Medium: application/inference
- Hard: edge cases, synthesis, multi-step logic

---

### 7. PWA (Progressive Web App)

After web stabilization:
- **Manifest.json**: App name, icons (192px, 512px), theme color, display: `standalone`.
- **Service Worker**: Offline shell caching (waiting room, join page), background sync for score submissions.
- **Install Prompt**: Triggered on join page for first-time visitors.
- **Push Notifications**: "Your game is starting" reminders for scheduled games *(v2)*.
- **Feels native**: No browser chrome during game. Smooth gestures. Fast.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js (Google OAuth) |
| Database | Supabase (Postgres + Realtime) |
| Real-time | Supabase Realtime (WebSockets) |
| AI | Anthropic Claude API (question gen) |
| File Handling | Supabase Storage |
| Hosting | Vercel |
| PWA | next-pwa or custom service worker |

---

## Data Models (Simplified)

```
User
  id, email, name, handle, avatar_url, created_at

Game
  id, organiser_id, title, mode, status, join_code, created_at

Question
  id, game_id, text, options (JSON), correct_answer, difficulty, order

Participant
  id, game_id, user_id (nullable), display_name, joined_at

Answer
  id, participant_id, question_id, answer, is_correct, response_time_ms, points_earned

GameResult
  id, game_id, participant_id, total_score, rank, accuracy, avg_response_time

Follow
  follower_id, following_id, created_at
```

---

## Screen Map

```
/ (Landing)
/join → Join by code
/join/[code] → Direct link join
/play/[gameId] → Active game (player view)
/dashboard → Organiser home
/dashboard/create → Create game
/dashboard/game/[id] → Game control room
/profile/[handle] → Public profile
/profile/me → Own profile + history
/leaderboard → Global/weekly boards (v2)
```

---

## Phased Roadmap

### Phase 1 — Core
- Auth (Google)
- Create/join game
- Mode B (standard quiz)
- Live play with real-time scoring
- Organiser controls

### Phase 2 — Intelligence + Mode A
- AI question generation from uploaded notes
- Mode A (Open Elimination)
- Finalist reveal screen
- Fullscreen animations

### Phase 3 — Social
- Player profiles
- Play history
- Follow system
- Player search

### Phase 4 — PWA + Polish
- Service worker + offline shell
- Install prompt
- Push notifications
- Performance hardening

### Phase 5 — Scale *(future)*
- Team mode
- Scheduled games
- Branded rooms (org logos)
- Analytics dashboard for organisers
- Public leaderboards

---

## Design Principles

1. **The game is everything.** When a game is live, nothing else competes for attention.
2. **Pressure is the feature.** Timer, animations, and sound design should create genuine urgency without anxiety.
3. **Stupid simple to join.** Phone out, code in, playing — in under 20 seconds.
4. **Organisers should feel powerful.** The control interface should feel like a live production board, not a settings menu.
5. **White and black hold it together.** The accent color (`#C8FF00`) is used only on moments that matter — CTAs, live indicators, correct answers.

---

*Spec version: 1.0 — April 2026*
*Author: Justin | The Build School*