# Phase 3 Output — Sprint 3: Research, Integration, CI/CD & UI Completion

**Sprint window:** 2026-09-01 → 2026-09-28 (present Sep 29)
**Status:** Complete
**Tracker mapping:** Research (AWS, SpecKit, New Relic, PagerDuty), Integration (GitHub Actions CI/CD, Nginx reverse proxy), SignalR (Real-time events), Frontend (UI Completion, Kanban, Settings, Webhooks), MediatR CQRS, AI integration.

## Goal (from plan)

Merged Phase 3 (Research) and Phase 4 (Integration + CI/CD + UI completion) into a unified final sprint. CI green on push; research deliverables documented; full interactive demo works end to end.

## How to demo it (end result)

```powershell
cd src
docker compose --profile full up -d --build
```

- **UI**: `http://localhost:5173` — interactive room calendar, direct booking flow, drag-and-drop maintenance Kanban board, team directory, and dynamic system preferences.
- **Api**: `http://localhost:8080` (with Nginx reverse proxy routing `/api/*` and `/hubs/*` to it).
- **Live Sync**: Open the UI in two tabs. Book a room, cancel a booking, or chat with the AI assistant, and watch the availability update live across both tabs via SignalR.
- **CI/CD**: Push to any branch to trigger the green `.github/workflows/ci.yml` pipeline.

Or the non-dockerized flow: `docker compose up -d postgres redis moto moto-init splunk fluent-bit`, then `dotnet run --project Booking.Api` / `--project Booking.Worker` / `npm run dev` in `ui/Booking.UI` separately.

---

## Task-by-task breakdown

### 1. Research & Documentation (Domain-Agnostic)

**What:** Comprehensive reading and documentation for required topics that were not applied in the codebase.
**Details:**
- Documented the **New Relic + PagerDuty** detect-to-escalate pipeline (`doc/notes/phase-3/new-relic.md`, `doc/notes/phase-3/pagerduty.md`).
- Explored **Spec Kit & AI Workflows** (`doc/notes/phase-3/spec-kit.md`).
- Read up on **AWS Infrastructure** including ECS, Parameter Store, CloudWatch, EC2, and VPC.

### 2. MediatR CQRS & Backend Refactor

**What:** Major refactoring of the backend application layer for better separation of concerns and caching.
**Details:**
- **MediatR Migration:** Refactored `RoomService` to utilize the MediatR CQRS (Command Query Responsibility Segregation) pattern.
- **Caching Pipeline:** Introduced a MediatR Caching Pipeline to automatically cache queries and improve read performance.
- **Resilience & Fixes:** Added resilience to Hangfire distributed lock acquisition on startup, fixed AWS configurations (cleared hardcoded regions/URLs, added environment variable fallbacks), and improved email sending reliability (SMTP IPv4 forcing).

### 3. UI Completion & Real-Time Sync (React + SignalR)

**What:** Polished the React frontend, adding remaining core views and real-time data sync.
**Details:**
- **SignalR Integration:** Built a SignalR hub backed by Redis. Integrated it with the React UI so booking creation/cancellation pushes live availability changes and notifications instantly.
- **Kanban Board:** Added a drag-and-drop Kanban board for managing facility maintenance issues.
- **Team Directory:** Added a team directory view showing user real-time availability.
- **Settings & Audit Logs:** Built UI for managing dynamic system preferences and a modal viewer for inspecting detailed JSON audit logs.
- **UI Refactor:** Extensive consistency pass across the UI, standardizing headers, fixing pagination, fixing check-in visibility, and applying global theme tweaks.
- **Nginx Reverse Proxy:** The UI's Nginx container now proxies `/api/*` and `/hubs/*` to the API container, providing a single origin.

### 4. AI Chatbot Integration

**What:** Enhanced the AI assistant's capabilities for conversational booking management.
**Details:**
- **Conversational Cancellation:** Added the ability to cancel bookings conversationally through the chatbot.
- **Fixes:** Addressed bugs with LLM-parsed DateTime parameters by forcing UTC conversion, providing explicit timezone conversion instructions to the model, and resolving encoding artifacts.

### 5. CI/CD (GitHub Actions)

**What:** Automated build and integration testing pipeline.
**Details:**
- Added `.github/workflows/ci.yml`. On push, it restores/builds the solution, runs unit tests, spins up the dockerized infrastructure (`docker compose up -d`), executes integration tests against the live mocked AWS/DB stack, and tears it all down.

### 6. Final Polish & Bug Fixes

**What:** Comprehensive bug hunting and final system hardening.
**Details:**
- **UI Bug Fixes:** Fixed a massive right-side whitespace gap in the React timeline calendar (RoomCalendar.tsx) caused by CSS grid calculations in infinite scroll containers, and handled out-of-bounds reservations gracefully. Also fixed Recharts tooltip rendering issues caused by Tailwind v4 OKLCH color variables.
- **Error Handling:** Enhanced error visibility on HomePage and MyBookingsPage by rendering clear, inline red banners within the BookingDetailModal instead of generic browser alerts.
- **Double-Booking Prevention:** Fixed a critical backend logic flaw in BookingRuleEngine and ReservationService where users could double-book themselves into two different rooms simultaneously. Added new repository queries and validation rules to cross-reference user schedules.
- **CI/CD Flakiness:** Eliminated a race condition in the GitHub Actions integration test pipeline by disabling xUnit parallelization, preventing concurrent WebApplicationFactory instances from trying to apply EF Core database migrations at the exact same time.
- **Documentation:** Added the AuditLogs table to the system ERD in HLD.md to accurately reflect the Entity Framework Core interceptor logging system.
