# Hackathon Command Center Design

Date: 2026-06-30

## Goal

Build **Hackathon**, a solo command center for managing one current hackathon. The first shipped version should make it easy to organize every task across the event lifecycle, then leave a clear path to add teams, judges, scoring, and finalist selection.

## Scope

Version 1 is a full-stack web app with a real database. It focuses on one hackathon workspace and a usable Kanban-style task board.

The first screen is the board. Columns:

- Research
- People & Judges
- Campaigns
- Submissions
- First Round
- Finals
- Done

Users can create, edit, delete, and move tasks between columns. Each task can include a title, description, priority, due date, and optional area label such as team, judge, submission, or campaign.

## Product Shape

The app should feel like an operational control panel, not a landing page. Pink and blue are the main colors, balanced with neutral surfaces so the UI stays readable during real use.

The board is the primary workflow:

1. Add a task to any column.
2. Update task details through a focused slide-over editor.
3. Move tasks as work progresses.
4. See counts and priority cues per column.
5. Persist changes to the database.

## Data Model

The initial schema should support the task board and future judging features without overbuilding.

### Entities

- `Hackathon`: the single event workspace for v1.
- `Task`: a board card with title, details, status column, priority, due date, and timestamps.
- `Team`: future-ready entity for submitted teams.
- `Judge`: future-ready entity for judges and contacts.
- `Score`: future-ready entity for first-round and final-round judging.

### Initial Implementation

Only `Hackathon` and `Task` need full CRUD in v1. `Team`, `Judge`, and `Score` stay out of the first schema and are captured as planned follow-up migrations after the board is working.

## Architecture

Use a modern React stack with server-backed persistence.

Recommended stack:

- Next.js app router
- TypeScript
- Tailwind CSS
- SQLite with Prisma for local development speed

The app can run locally with a SQLite database file. This keeps setup simple while still being a real backend architecture that can move to Postgres later.

## Screens

### Board Screen

The board screen contains:

- App header with product name: Hackathon
- Column board for the seven workflow stages
- Task cards with title, priority, due date, and short description
- Add-task control per column
- Slide-over task editor panel

### Future Screens

Planned after the board works:

- Teams table
- Judges table
- First-round judging view
- Finals shortlist view with five finalist slots

## Error Handling

User actions should provide immediate feedback. Failed saves should keep the user's draft visible and show a concise error. Empty states should let the user add the first task directly.

## Testing

Minimum verification for v1:

- Task creation persists after refresh.
- Task editing persists after refresh.
- Moving a task to another column persists after refresh.
- Deleting a task removes it from the board.
- The board remains usable at desktop and mobile widths.

## Non-Goals

- Multi-user collaboration
- Authentication
- Public team submission forms
- Judge login
- Automated scoring rules
- Managing multiple hackathons

These are intentionally outside v1 so the first product can ship quickly.
