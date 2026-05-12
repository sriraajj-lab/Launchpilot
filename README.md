# Launch Pilot

**Marketing Launch Automation Tool** - Submit your product to 25+ directories, create social media pages, and automate outreach with one click.

## What It Does

| Category | Automated Tasks |
|----------|----------------|
| **Product Directories** | Product Hunt, BetaList, Indie Hackers, AlternativeTo, SaaSHub, G2, Capterra, GetApp |
| **Social Page Creation** | LinkedIn Company Page, Facebook Business Page, Instagram Business Profile, Twitter/X |
| **Social Posting** | Reddit (15 subreddits), LinkedIn, Twitter/X, Hacker News |
| **Startup Listings** | Crunchbase, AngelList, StartupBase, Launching Next, StartupRanking, StackShare |
| **SEO/Backlinks** | Toolify.ai, Futurepedia, There Is An AI For That, MicroLaunch, DevHunt, Uneed |

## How It Works

```
You fill out ONE form (product name, description, URL, screenshots, target audience)
     |
Tool launches Playwright browser automation
     |
Visits each site -> fills their specific form -> submits
     |
Logs results (submitted / failed / needs CAPTCHA / needs manual click)
```

## Tech Stack

- **Playwright** - Headless browser automation with anti-detection
- **Next.js 14** - Dashboard UI (React + Tailwind CSS)
- **SQLite + Prisma** - Track submissions, campaigns, accounts
- **No external APIs** - Just browser automation (runs locally)

## Features

- **Campaign Builder** - Enter product details once, select which platforms to target
- **Platform Recipes** - Pre-built scripts for 25+ sites with form field mappings
- **Social Page Creator** - Auto-create LinkedIn, Facebook, Instagram, Twitter pages
- **Account Manager** - Store login credentials encrypted (AES-256)
- **Smart Scheduling** - Run submissions with random delays to look natural
- **Status Dashboard** - See which submissions succeeded, failed, or need CAPTCHA
- **Template Library** - Reddit posts, LinkedIn DMs, Twitter threads, directory descriptions
- **Quick Submit** - One-click submit to all fully-automated directories
- **Multi-product** - Launch multiple products, track each separately

## Automation Levels

| Level | Behavior | Platforms |
|-------|----------|-----------|
| **Full Auto** | Fill form + submit automatically | BetaList, SaaSHub, StartupBase, Launching Next, MicroLaunch, Uneed, DevHunt, Toolify, Futurepedia |
| **Semi Auto** | Fill form + attempt submit (may need manual CAPTCHA) | Product Hunt, Indie Hackers, G2, Capterra, Hacker News, Crunchbase |
| **Manual** | Pre-fill content + open browser (user clicks submit) | Reddit, LinkedIn posts, LinkedIn DMs |

## Getting Started

### Prerequisites

- Node.js 18+
- A machine with a browser (runs locally, not in cloud)

### Installation

```bash
# Clone the repo
git clone https://github.com/sriraajj-lab/Launchpilot.git
cd Launchpilot

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Setup database
cp .env.example .env
# Edit .env with your encryption key
npx prisma db push

# Start the dashboard
npm run dev
```

### Quick Launch (CLI)

```typescript
import { quickLaunch } from './src/lib/automation/runner';

const product = {
  name: 'MyApp',
  tagline: 'The simplest way to do X',
  description: 'MyApp helps you...',
  url: 'https://myapp.com',
  category: 'SaaS',
  keywords: 'productivity, automation',
  pricing: 'Freemium',
};

const credentials = {
  betalist: { username: 'you@email.com', password: 'xxx' },
  // ... more platforms
};

const results = await quickLaunch(product, credentials);
console.log(results);
```

## Project Structure

```
src/
├── app/                          # Next.js pages (Dashboard UI)
│   ├── page.tsx                  # Main dashboard
│   ├── campaigns/                # Campaign management
│   │   ├── page.tsx              # Campaign list
│   │   └── new/page.tsx          # Campaign builder (multi-step form)
│   ├── accounts/page.tsx         # Account/credential management
│   ├── quick-submit/page.tsx     # One-click directory submission
│   └── layout.tsx                # App layout with sidebar
├── components/
│   └── layout/sidebar.tsx        # Navigation sidebar
└── lib/
    ├── automation/
    │   ├── browser.ts            # Playwright engine (anti-detection, human-like typing)
    │   ├── linkedin-page.ts      # LinkedIn Company Page creator
    │   ├── facebook-page.ts      # Facebook Business Page creator
    │   ├── instagram-profile.ts  # Instagram Business Profile setup
    │   ├── twitter-profile.ts    # Twitter/X profile setup
    │   ├── reddit-poster.ts      # Reddit posting automation
    │   ├── directory-submitter.ts # Generic directory submission engine
    │   └── runner.ts             # Campaign orchestrator
    ├── platforms/
    │   └── registry.ts           # 25 platform configs with selectors & field mappings
    └── templates/
        └── defaults.ts           # 12 content templates (Reddit, LinkedIn, Twitter, HN, etc.)
```

## Security Notes

- All credentials are encrypted with AES-256 using your `ENCRYPTION_KEY`
- Credentials never leave your machine
- Browser automation runs locally only
- No data sent to external servers (except the platforms you're submitting to)

## Contributing

PRs welcome! Key areas for contribution:
- Adding new platform recipes
- Improving anti-detection measures
- Adding more content templates
- UI/UX improvements

## License

MIT
