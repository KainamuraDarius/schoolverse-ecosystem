# iSchoolVerse

iSchoolVerse is a React + Supabase school operating system prototype with a unified dashboard for learning, planning, and assessment.

## Current modules

- `Overview`: dashboard landing page with module navigation.
- `Notes`: Supabase-backed note taking with autosave, search, pinning, and color themes.
- `Calendar`: month-view scheduling for lessons, assignments, exams, meetings, and other events.
- `Reports`: subjects, assessments, weighted averages, and simple report-card summaries.
- `iSchoolBook`, `Monitor`, `Timetables`, `Whiteboard`: placeholder module shells ready for implementation.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase Auth + Postgres
- TanStack Query

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

3. Run the app:

```bash
npm run dev
```

## Database

The Supabase migrations in [`supabase/migrations`](/home/kainamura/StudioProjects/schoolverse-ecosystem/supabase/migrations) currently create:

- `profiles`
- `user_roles`
- `notes`
- `events`
- `subjects`
- `assessments`

Row-level security is enabled so users can only access their own data.

## Status

This repo has been moved forward from an earlier Lovable-generated starting point. The main app flow now uses native Supabase auth directly, and the remaining unfinished work is mostly feature depth rather than initial scaffolding.
