# NyayaAI Frontend

Web app for Indian legal information: AI Q&A (OpenRouter), user accounts (Supabase), and a separate flow to message lawyers.

## Stack

- Vite, React, TypeScript, Tailwind, shadcn/ui
- Supabase (Auth, Postgres, RLS)
- OpenRouter for the assistant model (set `VITE_OPENROUTER_API_KEY`)

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and add your Supabase and OpenRouter keys.

Apply the SQL in `../backend/supabase-schema.sql` (new project) or the `../backend/supabase-migrate-*.sql` files in order (existing project). See comments in those files.

```bash
npm run dev
npm run build
```
