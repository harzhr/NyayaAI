# NyayaAI - Your AI Legal Advisor

**NyayaAI** is a web platform for Indian legal information and guidance. It combines authenticated user experiences, a lawyer directory, private consultations, and an AI assistant that answers in **English** and **Hindi**—with clear disclaimers that the assistant is not a substitute for professional legal advice.

---

## Features

- **AI legal Q&A** — Conversational assistant powered by [OpenRouter](https://openrouter.ai/), with language-aware prompting.
- **Authentication & profiles** — Email-based auth and user profiles via [Supabase](https://supabase.com/).
- **Lawyer directory** — Browse registered and demo lawyers; start consultation flows.
- **Consultations & messaging** — Private chat-style interactions with lawyers; real-time updates where configured in the schema.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend / data | Supabase (PostgreSQL, Auth, Row Level Security) |
| AI | OpenRouter API (model configurable in app code) |

---

## Repository layout

```
NyayaAI/
├── frontend/          # Vite + React SPA (main application)
├── backend/           # SQL schema and migrations for Supabase
├── ai/                # Reference OpenRouter integration (see frontend for production paths)
├── package.json       # npm workspaces; scripts run the frontend workspace
└── README.md
```

---

## Prerequisites

- **Node.js** 20 LTS or newer (recommended; Supabase JS libraries target Node ≥ 20)
- A **Supabase** project
- An **OpenRouter** API key (for AI responses)

---

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd NyayaAI
npm install
```

This repository uses **npm workspaces**; dependencies for `frontend/` are installed from the root.

### 2. Environment variables

Copy the example env file and fill in your values:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key |

> **Security note:** Variables prefixed with `VITE_` are embedded in the client bundle. For production, consider routing AI calls through a server or Edge Function so secrets are not exposed in the browser.

### 3. Database

In the Supabase dashboard, open the **SQL Editor** and run:

- **New project:** `backend/supabase-schema.sql`
- **Existing project:** apply `backend/supabase-migrate-*.sql` files **in order**, following comments in each file.

See `backend/README.md` for migration details.

### 4. Run locally

From the **repository root**:

```bash
npm run dev
```

The dev server defaults to **http://localhost:8080** (Vite may choose another port if 8080 is in use).

---

## Scripts (root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (once) |

---

## Documentation

- **Frontend:** `frontend/README.md`
- **Database:** `backend/README.md`
- **AI reference:** `ai/README.md`

---

## Contributing

Issues and pull requests are welcome. Please keep changes focused, match existing code style, and avoid committing `.env` files or API keys.

---

## Disclaimer

NyayaAI is an informational tool. It does not constitute legal advice. For matters that affect your rights or obligations, consult a qualified advocate or legal professional in India.
