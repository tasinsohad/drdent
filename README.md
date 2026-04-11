# Dr. Dent — AI Dental Practice Automation

> **AI-powered front desk for dental practices.** Handle appointment bookings, patient inquiries, and multi-channel conversations (WhatsApp + web chat widget) 24/7 with intelligent AI.

---

## Features

- 🤖 **AI Receptionist** — Powered by OpenAI GPT-4o / Google Gemini
- 💬 **Multi-channel** — WhatsApp Business + website chat widget
- 📅 **Appointment management** — Book, reschedule, cancel with conflict detection
- 👥 **Patient CRM** — Full conversation history, tags, notes
- 📊 **Analytics** — Daily stats, AI vs human reply ratios
- 🔔 **Real-time notifications** — Supabase Realtime push
- 🌙 **Dark / Light mode** — Respects system preference
- 🔒 **Secure** — AES-GCM encrypted API keys, HTTPS-only, CSP headers

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Styling | Tailwind CSS + Radix UI |
| State | Zustand (with localStorage persistence) |
| Payments | Stripe |
| Deployment | Vercel (recommended) |

---

## Prerequisites

- Node.js 18+
- npm or pnpm
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com/api-keys) or [Google AI](https://ai.google.dev/) API key (for the AI receptionist)

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/dr-dent.git
cd dr-dent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Open `.env.local` and populate:

```env
# Required — Supabase project settings (Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Required — app base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Required — 32-character AES-GCM encryption key for stored API keys
ENCRYPTION_KEY=your-32-character-encryption-key!!

# Optional — Stripe integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional — cron job protection
CRON_SECRET=your-cron-secret-token
```

### 4. Set up the database

In your [Supabase SQL Editor](https://supabase.com/dashboard/_/sql), run the migration SQL found in **Settings → Backend → Database Setup** inside the app, or use the full SQL block there.

Alternatively, the app will try to auto-migrate on first boot via the `/api/setup` route.

### 5. Configure Supabase Auth

In your Supabase dashboard:
- **Authentication → Providers → Email**: Disable "Confirm email" for development
- **Authentication → Providers → Google**: Add your Google OAuth credentials if you want Google sign-in

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL of the app (no trailing slash) |
| `ENCRYPTION_KEY` | ✅ | Exactly 32 characters, used to encrypt stored API keys |
| `STRIPE_SECRET_KEY` | ⚪ | Stripe secret key for payment deposits |
| `STRIPE_WEBHOOK_SECRET` | ⚪ | Stripe webhook signing secret |
| `CRON_SECRET` | ⚪ | Bearer token to protect `/api/cron` routes |

---

## Project Structure

```
dr-dent/
├── app/
│   ├── (auth)/          # Login, signup, password reset pages
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── conversations/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── analytics/
│   │   └── settings/
│   ├── admin/           # Admin panel
│   ├── api/             # API routes
│   │   ├── auth/        # Auth helpers (OAuth, clear cookies)
│   │   ├── chat/        # AI chat endpoint
│   │   ├── appointments/
│   │   ├── export/      # GDPR data export
│   │   └── webhook/     # WhatsApp webhook
│   ├── layout.tsx       # Root layout with providers
│   └── not-found.tsx    # Custom 404 page
├── components/
│   ├── ui/              # Reusable UI primitives (Button, Input, Skeleton, Toaster…)
│   ├── error-boundary.tsx
│   ├── global-search.tsx
│   ├── onboarding-wizard.tsx
│   └── theme-toggle.tsx
├── hooks/
│   ├── useOfflineCache.ts
│   └── useSyncManager.ts
├── lib/
│   ├── auth.ts          # Supabase auth helpers
│   ├── db.ts            # Database query helpers
│   ├── encryption.ts    # AES-GCM key encryption
│   ├── store.ts         # Zustand global state
│   └── supabase-client.ts
├── middleware.ts         # Route protection
├── next.config.js        # Security headers + CSP
└── tailwind.config.js
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables in _Project → Settings → Environment Variables_
4. Deploy — Vercel auto-builds on push to `main`

> **Note**: Set `NEXT_PUBLIC_APP_URL` to your Vercel production URL (e.g. `https://dr-dent.vercel.app`).

---

## WhatsApp Integration

1. Create a [Meta Developer App](https://developers.facebook.com/apps/)
2. Add the WhatsApp product
3. Get your **Phone Number ID**, **Business Account ID**, and **Access Token**
4. In Dr. Dent: **Settings → WhatsApp** → enter credentials
5. Configure the webhook URL in Meta: `https://your-app.com/api/webhook?token=YOUR_VERIFY_TOKEN`

---

## License

MIT — see [LICENSE](./LICENSE)
