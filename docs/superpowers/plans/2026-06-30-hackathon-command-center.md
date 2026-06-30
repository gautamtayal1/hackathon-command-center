# Hackathon Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Hackathon command center with a pink/blue task board backed by SQLite.

**Architecture:** Use Next.js App Router for the web app, Prisma for database access, and server actions for task mutations. Keep the first version focused on a single default hackathon and one board screen.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Prisma, SQLite, lucide-react.

---

## File Structure

- `package.json`: scripts and dependencies.
- `prisma/schema.prisma`: SQLite schema for `Hackathon` and `Task`.
- `src/lib/board.ts`: shared board constants and TypeScript types.
- `src/lib/prisma.ts`: Prisma client singleton.
- `src/lib/tasks.ts`: database reads and server actions for task CRUD.
- `src/app/page.tsx`: server-rendered board entry point.
- `src/app/globals.css`: Tailwind and global visual foundation.
- `src/components/board/board.tsx`: client board state and interactions.
- `src/components/board/task-card.tsx`: task card presentation.
- `src/components/board/task-editor.tsx`: slide-over create/edit panel.

## Tasks

### Task 1: Scaffold App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Create the Next.js app shell**

Create the package and configuration files with scripts for development, linting, building, and Prisma.

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install next react react-dom @prisma/client lucide-react
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss prisma eslint eslint-config-next
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Verify the scaffold**

Run:

```bash
npm run lint
```

Expected: no lint errors once source files exist.

### Task 2: Add Database Model

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `src/lib/board.ts`
- Create: `src/lib/tasks.ts`

- [ ] **Step 1: Define Prisma schema**

Create `Hackathon` and `Task`. `Task.status` stores one of the board column ids. `Task.priority` stores `LOW`, `MEDIUM`, or `HIGH`.

- [ ] **Step 2: Add Prisma client helper**

Use a singleton Prisma client to avoid extra clients during Next.js development reloads.

- [ ] **Step 3: Add task reads and server actions**

Implement:

```ts
getBoardTasks()
createTask(input)
updateTask(id, input)
deleteTask(id)
moveTask(id, status)
```

Each mutation calls `revalidatePath("/")`.

- [ ] **Step 4: Create and migrate the database**

Run:

```bash
npx prisma migrate dev --name init
```

Expected: SQLite database and Prisma client are generated.

### Task 3: Build Board UI

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/components/board/board.tsx`
- Create: `src/components/board/task-card.tsx`
- Create: `src/components/board/task-editor.tsx`

- [ ] **Step 1: Render server board page**

`src/app/page.tsx` loads tasks through `getBoardTasks()` and passes them to the client board.

- [ ] **Step 2: Build board client component**

The board displays seven columns: Research, People & Judges, Campaigns, Submissions, First Round, Finals, Done. Each column has an add button, task count, cards, and an empty state.

- [ ] **Step 3: Build slide-over editor**

The editor supports create and edit modes with title, description, priority, due date, area label, and status.

- [ ] **Step 4: Add movement and delete actions**

Cards expose previous/next movement buttons and delete. Movement persists through server actions.

### Task 4: Polish and Verify

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/board/*.tsx`

- [ ] **Step 1: Apply pink/blue visual system**

Use pink and blue as primary accents with neutral surfaces, readable contrast, clear focus states, and responsive board layout.

- [ ] **Step 2: Run verification**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 3: Start local app**

Run:

```bash
npm run dev
```

Expected: app is available at `http://localhost:3000`.

Manual checks:

- Create a task.
- Edit the task.
- Move the task to another column.
- Refresh and confirm it persists.
- Delete the task.
- Check the page at desktop and mobile widths.
