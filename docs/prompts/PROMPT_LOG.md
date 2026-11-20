# CricEngine — Product Creation Prompt Log

This document compiles the chronological sequence of human prompts used to conceive, architect, design, build, test, and deploy **CricEngine** (Real-Time Cricket Scoring, Spatial Telemetry & Analytics Platform).

---

## Chronological Prompts

### Prompt 1
- **Date & Time**: 2026-08-20 07:13:26 UTC (12:43:26 IST)
- **Purpose**: Master engineering specification for event-sourced cricket scoring platform

```text
Engineering Specification & Implementation Manual: CricEngine (Real-Time Cricket Scoring, Spatial Telemetry & Analytics Platform)
This document is an implementation blueprint designed to be passed directly to an AI coding agent or development team. It specifies the architecture, data schemas, real-time fan-out mechanics, spatial wagon-wheel telemetry, and UI components for a real-time cricket scoring engine.

1. System Architecture & Component Topology
The system uses an Event-Sourced Architecture rather than mutating relational match records in place. Every ball bowled is an immutable event appended to a stream. Undo operations, scorecard rendering, and player stats are computed deterministically from this event log.

 [ Offline-First Scoring Client ]             [ Live Spectator Clients ]
    (Next.js PWA + IndexedDB)                    (Next.js + WebGL Canvas)
               │                                            ▲
               │ HTTPS / WSS (Auth: Scorer)                 │ SSE / WSS (Spectator)
               ▼                                            │
   ┌────────────────────────────────────────────────────────┴─────────┐
   │             Edge Gateway / API Router (FastAPI / Go)            │
   └───────────────────┬────────────────────────────┬─────────────────┘
                       │ Validated Delivery Event   │ Delta Broadcast
                       ▼                            │
   ┌─────────────────────────────────────────┐      │
   │       Ball-State Transition Worker      │      │
   │    • Atomic Event Validation Engine     │      │
   │    • Strike Rotation & Extra Handling   │      │
   │    • Dynamic In-Memory Aggregations     │      │
   └───────────────────┬─────────────────────┘      │
                       ▼                            │
      ┌─────────────────────────────────┐           │
      │   PostgreSQL / CockroachDB      │           │
      │   (Append-Only Event Store)     │           │
      └─────────────────────────────────┘           │
                       │                            │
                       ▼                            │
             [ Redis Pub/Sub Stream ] ──────────────┘

Core Domain Entities:
- Match, Player, Team, Tournament
- BallDeliveryEvent: match_id, innings_no, over_number, ball_in_over, sequence_no, bowler_id, striker_id, non_striker_id, runs_off_bat, extras, extra_type, is_legal_delivery, is_wicket, wicket_type, dismissed_player_id, fielder_id, shot_x, shot_y, shot_zone, pitch_line, pitch_length, is_undone, created_at.

Implementation Phases:
Phase 1: Deterministic Cricket State Transition Engine & Rules Validator
Phase 2: Ingestion API & Edge Streaming Gateway
Phase 3: Scorer Keypad & Spatial UI Canvas (Wagon Wheel, Live Scorecard, Worm Chart, Partnership Breakdown)
Phase 4: Career Analytics & Search (/player/[id] route, Wagon Wheel heatmaps, match summaries)

This is an instruction overview. Build from scratch such that it looks very clean, and the end product should be hosted on a repo and live site, along with an Android app that can be downloaded and actually used while playing and recording matches. Start thinking and when you are extremely clear, start building.
```

---

### Prompt 2
- **Date & Time**: 2026-08-20 07:20:27 UTC (12:50:27 IST)
- **Purpose**: Tech stack decisions on database, mobile wrapper, and auth

```text
Database: Start with SQLite for dev + PostgreSQL for prod, or PostgreSQL everywhere from day one?
Android: Capacitor.js wrapping the PWA — acceptable?
Auth: Simple credentials-based JWT auth for v1?
Hosting target: Vercel, Railway, or self-hosted? For all these, choose whichever is free. And auth is needed for what exactly?
```

---

### Prompt 3
- **Date & Time**: 2026-08-20 07:22:45 UTC (12:52:45 IST)
- **Purpose**: Scorer authorization design using lightweight PIN access control

```text
Yes, something like the scorer knows some PIN or code, so whoever knows that PIN/code can become the scorer. Multiple scorers should be allowed.
```

---

### Prompt 4
- **Date & Time**: 2026-08-20 07:32:43 UTC (13:02:43 IST)
- **Purpose**: Workflow checkpoint to verify high-level architecture before coding

```text
Once you have done the high-level work, and only simple execution and code-writing part remains, tell me and stop. I will change model so that I don't hit the limits.
```

---

### Prompt 5
- **Date & Time**: 2026-08-20 07:34:06 UTC (13:04:06 IST)
- **Purpose**: Workspace environment configuration on secondary disk drive

```text
If hitting space restrictions, migrate the files anywhere on the D: drive; plenty of space is available there.
```

---

### Prompt 6
- **Date & Time**: 2026-08-20 07:52:20 UTC (13:22:20 IST)
- **Purpose**: Project implementation kickoff based on execution blueprint

```text
Read the execution_blueprint.md artifact and execute Steps 2-7. All code is specified — create the files as documented.
```

---

### Prompt 7
- **Date & Time**: 2026-08-20 09:23:32 UTC (14:53:32 IST)
- **Purpose**: Bug report regarding error during demo match data seeding

```text
What is this error on demo filling?
```

---

### Prompt 8
- **Date & Time**: 2026-08-20 09:23:41 UTC (14:53:41 IST)
- **Purpose**: Continuation instruction to proceed with demo error investigation

```text
Continue
```

---

### Prompt 9
- **Date & Time**: 2026-08-20 09:23:43 UTC (14:53:43 IST)
- **Purpose**: Continuation instruction to proceed with code generation

```text
Continue
```

---

### Prompt 10
- **Date & Time**: 2026-08-20 09:24:28 UTC (14:54:28 IST)
- **Purpose**: Bug fix request to correct demo match state ingestion

```text
What is this error on demo filling? Correct it.
```

---

### Prompt 11
- **Date & Time**: 2026-08-20 09:24:33 UTC (14:54:33 IST)
- **Purpose**: Continuation instruction for automated debugging process

```text
Continue
```

---

### Prompt 12
- **Date & Time**: 2026-08-20 09:27:33 UTC (14:57:33 IST)
- **Purpose**: Critical bug escalation on demo match state initialization

```text
What is this error on demo filling? Correct it, something is seriously wrong.
```

---

### Prompt 13
- **Date & Time**: 2026-08-20 09:29:32 UTC (14:59:32 IST)
- **Purpose**: Autonomy authorization granting all tool and command permissions

```text
All permissions allowed. No need to ask for anything, all approvals granted.
```

---

### Prompt 14
- **Date & Time**: 2026-08-20 09:36:32 UTC (15:06:32 IST)
- **Purpose**: Correction order for broken match scoring implementation

```text
What is this nonsense, how did you implement it? Correct it.
```

---

### Prompt 15
- **Date & Time**: 2026-08-20 10:10:32 UTC (15:40:32 IST)
- **Purpose**: Enforcement of official cricket rules for wicket transitions

```text
Learn and implement all the rules of cricket. If the batsman is out, how is he still batting? We need to choose the new incoming batsman when a wicket falls.
```

---

### Prompt 16
- **Date & Time**: 2026-08-20 10:22:59 UTC (15:52:59 IST)
- **Purpose**: Build verification request demanding live local preview links

```text
Okay, so if everything is done, why are these tasks still running? Finish everything and give me the working links.
```

---

### Prompt 17
- **Date & Time**: 2026-08-20 10:34:58 UTC (16:04:58 IST)
- **Purpose**: UI overhaul based on live score Figma design kit

```text
Okay, now onto its UI: https://www.figma.com/community/file/1282961554302744980/cricket-live-score-and-streaming-app-ui-kit. See this Figma and try to take inspiration from it for the live scoring layout.
```

---

### Prompt 18
- **Date & Time**: 2026-08-20 10:46:30 UTC (16:16:30 IST)
- **Purpose**: Visual styling request for clean white background and typography

```text
Use Futura font and invert the color scheme — not inverted, but use a clean white background with black text, and accordingly modify all other components to give it a clean look.
```

---

### Prompt 19
- **Date & Time**: 2026-08-20 12:08:33 UTC (17:38:33 IST)
- **Purpose**: Brand color palette specification and text weight refinement

```text
The UI looks too bad right now. Don't make all fonts/text in bold, they look harsh. Use colors like simple white and blue: #001838, #0066CC, #EBF2FA, #FFFFFF, #990000. Review and modify accordingly.
```

---

### Prompt 20
- **Date & Time**: 2026-08-20 12:38:38 UTC (18:08:38 IST)
- **Purpose**: Continuation instruction to apply refined styling theme

```text
Continue
```

---

### Prompt 21
- **Date & Time**: 2026-08-20 13:14:07 UTC (18:44:07 IST)
- **Purpose**: Design polish using Impeccable Style anti-AI aesthetic guidelines

```text
It still gives a very AI-ish feel. See this and use it: https://impeccable.style/ to remove the AI-ish parts and revamp its design and feel.
```

---

### Prompt 22
- **Date & Time**: 2026-08-20 13:17:08 UTC (18:47:08 IST)
- **Purpose**: Copywriting cleanup removing technical jargon for clean branding

```text
Also remove all useless words and headings like telemetry nonsense. Keep it simple: 'CricEngine — Cricket Match Scorer Tool' or something like that. Keep it clean.
```

---

### Prompt 23
- **Date & Time**: 2026-08-20 13:27:52 UTC (18:57:52 IST)
- **Purpose**: Feature benchmarking against Stumps cricket scoring mobile app

```text
See this app: https://stumpsapp.com/. Check this app's features and verify if you have added all the relevant features here too.
```

---

### Prompt 24
- **Date & Time**: 2026-08-20 13:33:20 UTC (19:03:20 IST)
- **Purpose**: Scorecard typography and metric readability enhancements

```text
These numbers and stats feel too small and thin against the white background. Make them legible and easy to read without cluttering the screen.
```

---

### Prompt 25
- **Date & Time**: 2026-08-20 13:45:21 UTC (19:15:21 IST)
- **Purpose**: Uniform font pairing adoption using Raleway and Montserrat

```text
Make the font uniform across all places. Right now it looks inconsistent. Use Raleway or Alegreya Sans, and Montserrat for numbers and headings.
```

---

### Prompt 26
- **Date & Time**: 2026-08-20 16:37:18 UTC (22:07:18 IST)
- **Purpose**: Production deployment to GitHub, Vercel, and Android APK

```text
Now push this to GitHub as a repo called cricengine, host it on Vercel or whatever works best, and make a Capacitor Android app too.
```

---

### Prompt 27
- **Date & Time**: 2026-08-20 16:43:12 UTC (22:13:12 IST)
- **Purpose**: Hosting configuration verification for one-click Vercel deployment

```text
Vercel Hosting Guide: You can deploy the repository to Vercel in 1 click: Visit vercel.com/new, import Git Repository, configure environment variables, and deploy.
```

---

### Prompt 28
- **Date & Time**: 2026-08-21 09:51:44 UTC (15:21:44 IST)
- **Purpose**: Technical documentation request for comprehensive README and diagrams

```text
Write a complete, detailed README file for the project. No nonsense, minimal use of emojis, and maximum use of architecture diagrams, state flow diagrams, system benchmarks, and installation guides.
```

---

### Prompt 29
- **Date & Time**: 2026-11-19 05:09:52 UTC (10:39:52 IST)
- **Purpose**: Local server recreation and state restoration after machine reboot

```text
Host the CricEngine app again. I restarted my laptop so lost the progress in between. Run it exactly as was asked in the middle of the game with the same scoreboard and everything, and give me the localhost link.
```

---

## Unsure

These prompts occurred during historical tournament data seeding / fixture generation or follow-ups, kept here for full visibility:

### Unsure 1
- **Date & Time**: 2026-11-20 12:49:34 UTC (18:19:34 IST)
- **Purpose**: Tournament PR merge and historical scoresheet generation kickoff

```text
You are working in my repo github.com/WaqarMoid/cricengine (Next.js 16 + Prisma 7 + embedded PGlite). The default branch is master.

GOAL
1. Merge PR #1 (branch feat/tournaments-and-records) into master.
2. Generate the historical ball-by-ball records for the Hall 12 Phatta League and 3 one-off matches, validate them, and push.

STEP 1 — merge and set up
- git fetch origin && git checkout master && git pull
- Merge PR #1: gh pr merge 1 --merge (or merge feat/tournaments-and-records into master locally and push).
- npm install
- npm test (must pass)
- npm run build (must pass)
- npm run seed:check (should say "✔ no errors"; scoresheets are empty for now)

STEP 2 — read before writing anything
Read these files fully; they are the spec:
- docs/prompts/gemini-scoresheets.md
- docs/SEED_DATA.md
- src/data/seed/setup.json
- src/lib/seed/compile.ts

STEP 3 — write the scoresheets, one batch at a time
...
```

### Unsure 2
- **Date & Time**: 2026-11-20 14:07:02 UTC (19:37:02 IST)
- **Purpose**: Status inquiry on the tournament seed check execution

```text
What happened bro, tell finally all done or not?
```
