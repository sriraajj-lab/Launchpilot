# Launch Pilot

**Web-Based Marketing Launch Automation Tool** - Submit your product to 25+ directories, create social media pages, and automate outreach - all from a web dashboard.

## What It Does

| Category | Automated Tasks |
|----------|----------------|
| **Product Directories** | Product Hunt, BetaList, Indie Hackers, AlternativeTo, SaaSHub, G2, Capterra, GetApp |
| **Social Page Creation** | LinkedIn Company Page, Facebook Business Page, Instagram Business Profile, Twitter/X |
| **Social Posting** | Reddit (15 subreddits), LinkedIn, Twitter/X, Hacker News |
| **Startup Listings** | Crunchbase, AngelList, StartupBase, Launching Next, StartupRanking, StackShare |
| **SEO/Backlinks** | Toolify.ai, Futurepedia, There Is An AI For That, MicroLaunch, DevHunt, Uneed |

## Architecture (Web-Based SaaS)

```
[Browser / User]
      |
[Next.js Frontend] -- Dashboard, Campaign Builder, Account Manager
      |
[Next.js API Routes] -- Authentication, CRUD, Queue management
      |
[PostgreSQL + Prisma] -- Products, Campaigns, Submissions, Credentials (encrypted)
      |
[Background Worker] -- Polls job queue, runs Playwright headless on server
      |
[Playwright Browser] -- Visits sites, fills forms, submits, takes screenshots
```

## Tech Stack

- **Next.js 14** - Full-stack React framework (frontend + API)
- **NextAuth.js** - Authentication (email/password + OAuth)
- **Prisma + PostgreSQL** - Database ORM (user data, campaigns, encrypted credentials)
- **Playwright** - Server-side headless browser automation
- **Tailwind CSS** - Dashboard UI styling
- **SWR** - Real-time data fetching with auto-refresh
- **AES-256-GCM** - Encryption for stored platform credentials

## Features

- **Multi-user SaaS** - User accounts with isolated data
- **Campaign Builder** - 4-step wizard: Product -> Platforms -> Schedule -> Launch
- **25 Platform Configs** - Pre-built form field mappings and selectors
- **Quick Submit** - One-click submit to all fully-automated directories
- **Social Page Creator** - Auto-create LinkedIn, Facebook, Instagram, Twitter pages
- **Account Manager** - Encrypted credential storage (AES-256-GCM)
- **Background Worker** - Server-side job queue processes submissions sequentially
- **Real-time Dashboard** - Live stats, submission progress, recent activity (auto-refreshes)
- **Template Library** - 12 content templates for Reddit, LinkedIn, Twitter, HN, directories
- **Smart Timing** - Random delays between submissions to look natural
- **CAPTCHA Detection** - Automatically flags submissions needing manual intervention
- **Screenshots** - Captures page state on success/failure for debugging

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or use SQLite for local dev)
- Redis (optional, for BullMQ - falls back to DB polling)

### Installation

```bash
git clone https://github.com/sriraajj-lab/Launchpilot.git
cd Launchpilot

# Install dependencies
npm install

# Install Playwright browsers (for the worker)
npx playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env with your database URL, NEXTAUTH_SECRET, ENCRYPTION_KEY

# Setup database
npx prisma db push

# Start the web app
npm run dev

# In a separate terminal - start the background worker
npm run worker
```

### Deploy to Production

Works with any Node.js hosting that supports:
- Long-running processes (for the worker)
- PostgreSQL database
- Headless browser (Docker with Playwright recommended)

**Recommended:** Deploy on a VPS (Railway, Render, DigitalOcean) with Docker:
```dockerfile
FROM mcr.microsoft.com/playwright:v1.44.0-jammy
WORKDIR /app
COPY . .
RUN npm install
RUN npx prisma generate
CMD ["npm", "start"]
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard (real-time stats & activity)
│   ├── login/page.tsx              # Sign in
│   ├── register/page.tsx           # Create account
│   ├── campaigns/
│   │   ├── page.tsx                # Campaign list (live status)
│   │   └── new/page.tsx            # 4-step campaign builder
│   ├── accounts/page.tsx           # Encrypted credential management
│   ├── social-pages/page.tsx       # Social page creation UI
│   ├── templates/page.tsx          # Template library & editor
│   ├── quick-submit/page.tsx       # One-click directory submission
│   └── api/
│       ├── auth/[...nextauth]/     # NextAuth endpoints
│       ├── auth/register/          # User registration
│       ├── dashboard/              # Stats & activity feed
│       ├── products/               # CRUD
│       ├── campaigns/              # CRUD + launch
│       ├── accounts/               # CRUD (encrypted)
│       ├── templates/              # List + create
│       └── social-pages/           # Create & manage
├── components/
│   ├── layout/sidebar.tsx          # Navigation with auth state
│   └── providers.tsx               # NextAuth SessionProvider
└── lib/
    ├── db.ts                       # Prisma client singleton
    ├── auth.ts                     # NextAuth config
    ├── auth-helpers.ts             # Server auth utilities
    ├── encryption.ts               # AES-256-GCM encrypt/decrypt
    ├── hooks.ts                    # SWR data fetching hooks
    ├── queue/
    │   ├── producer.ts             # Creates jobs in the DB
    │   └── worker.ts               # Background job processor
    ├── automation/
    │   ├── browser.ts              # Core Playwright engine
    │   ├── server-engine.ts        # Server-side submission engine
    │   ├── linkedin-page.ts        # LinkedIn page creator
    │   ├── facebook-page.ts        # Facebook page creator
    │   ├── instagram-profile.ts    # Instagram profile setup
    │   ├── twitter-profile.ts      # Twitter/X profile setup
    │   ├── reddit-poster.ts        # Reddit posting
    │   ├── directory-submitter.ts  # Generic directory engine
    │   └── runner.ts               # Campaign orchestrator
    ├── platforms/
    │   └── registry.ts             # 25 platform configs
    └── templates/
        └── defaults.ts             # 12 default content templates
```

## How It Works

1. **Sign up** at the web dashboard
2. **Add your product** (name, URL, description, logo)
3. **Store platform credentials** (encrypted with AES-256-GCM)
4. **Create a campaign** - select platforms, set timing
5. **Launch** - the server worker processes submissions in the background
6. **Monitor** - dashboard shows real-time progress, screenshots on failure

## Security

- All credentials encrypted at rest (AES-256-GCM)
- Passwords hashed with bcrypt (12 rounds)
- JWT sessions with NextAuth
- User data fully isolated (multi-tenant)
- Browser automation runs server-side only

## License

MIT
