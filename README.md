# Nairobi Expat Concierge Platform

> A production-grade digital relocation concierge platform for professionals moving to Nairobi, Kenya.

---

## Overview

Thousands of expatriates arrive in Nairobi every year — UN/UNEP staff, World Bank consultants, NGO country directors, multinational regional managers, and embassy personnel. Each one needs the same things: a vetted home in the right neighbourhood, school shortlists for their children, a reliable car, internet set up, domestic help found and vetted, a local bank account opened, and real orientation about how Nairobi actually works.

This platform is the orchestration layer. It doesn't own the housing or the schools, but it has vetted relationships with the best landlords, school admissions offices, car hire companies, ISPs, and domestic staff agencies — and it coordinates everything through one account manager and one dashboard.

---

## Target Users

| User | Pain Point |
|------|-----------|
| **Incoming expat (individual)** | Weeks of chaotic Google searches, expat Facebook groups, real estate agent chases |
| **Corporate HR team** | Single vendor to manage 20+ relocations/year with real-time tracking |
| **UN/NGO/Embassy HR manager** | Relocation budget exists; no reliable digital platform to deploy it against |

---

## Core Features (Phase Roadmap)

### Phase 1 — Foundation & Architecture
- Monorepo setup (pnpm workspaces, TypeScript, Express 5, Drizzle ORM, PostgreSQL)
- OpenAPI-first contract, code generation (Orval → React Query + Zod)
- CI/CD pipeline, Docker-ready, GitHub Actions

### Phase 2 — Relocation Profile & Intake
- Expat intake form: arrival date, family size, budget, employer, school-age children, neighbourhood preferences
- Profile storage and versioning
- Employer/corporate HR account linking

### Phase 3 — Customised Relocation Plan Engine
- Plan generation from profile: housing, schools, car, internet, domestic help, banking
- Category-by-category vetted option delivery
- Plan PDF export

### Phase 4 — Housing Module
- Vetted property listings (Westlands, Karen, Gigiri, Runda, Lavington, Kilimani)
- Property scoring by expat-relevant criteria (security, proximity to UN/embassy, ISP coverage)
- Landlord relationship CRM

### Phase 5 — Schools Intelligence Module
- Database: Braeburn, ISN, Brookhouse, Banda, Rosslyn Academy, Hillcrest
- Per-school admissions process, waitlist intelligence, curriculum (IB, British, American)
- Age-by-age placement logic, sibling admission rules

### Phase 6 — Corporate HR Dashboard
- Multi-relocation tracking per corporate account
- Real-time status updates per relocation case
- Invoice and billing management
- White-label option for large accounts

### Phase 7 — Account Manager Workspace (Internal CRM)
- Assign relocations to account managers
- Task tracking, deadline management
- Communication log (WhatsApp, email)

### Phase 8 — WhatsApp Integration
- Automated WhatsApp notifications at key relocation milestones
- Two-way messaging channel via WhatsApp Business API
- Pre-arrival onboarding sequence

### Phase 9 — Pre-Arrival Digital Welcome Pack
- Customised by nationality and employer type
- Neighbourhood guide: Gigiri, Karen, Westlands, Kilimani, Runda
- Safety briefing, transport guide, cultural orientation
- "First week in Nairobi" checklist

### Phase 10 — Nairobi Orientation Guide (CMS-Powered)
- Neighbourhood profiles (vibe, security rating, average rent, proximity to schools/UN)
- Transport: matatu routes, boda-boda etiquette, NTSA, importing a car
- Healthcare: Aga Khan, Nairobi Hospital, MP Shah, Karen Hospital
- Culture, tipping, expat etiquette
- Powered by Sanity CMS for easy content updates

### Phase 11 — Vendor & Partner Network
- Vetted vendor directory: car hire, ISPs, domestic agencies, banks, movers
- Vendor onboarding flow, vetting checklist
- Performance tracking and ratings

### Phase 12 — Community Layer
- Recently-arrived expat community (forum / groups)
- "Ask a local expat" feature
- Event listings (expat meetups, networking)
- Moderation tools

### Phase 13 — Payments & Billing
- Tiered pricing: Corporate ($300–800/relocation), Individual self-serve
- Stripe integration
- Corporate invoicing (Net 30, purchase order support)
- Annual concierge subscription ("Concierge on Demand")

### Phase 14 — Departure Service
- End-of-lease management checklist
- Shipping coordination partners
- Security deposit dispute support
- "Goodbye Nairobi" offboarding pack

### Phase 15 — Concierge on Demand (Annual Subscription)
- Post-relocation concierge: mechanic, dentist, holiday villa on the coast
- Request ticketing system
- Trusted vendor recommendations, always fresh
- Subscriber-only deals and rates

### Phase 16 — Global Relocation Partner Integrations
- Cartus, Crown World Mobility, BGRS white-label API
- Inbound relocation referral pipeline
- SLA tracking for partner accounts

### Phase 17 — Analytics & Reporting
- Relocation success metrics (time-to-settled, NPS, category completion rates)
- HR dashboard: relocation ROI reporting
- Internal ops: AM workload, vendor performance

### Phase 18 — Mobile App (React Native / Expo)
- Expat-facing mobile app: plan tracking, vendor contacts, orientation guide
- Push notifications for relocation milestones
- Offline-capable orientation content

### Phase 19 — AI Relocation Assistant
- LLM-powered chat: "What neighbourhood should I live in on a $3,000/month budget with two school-age kids?"
- Answers grounded in platform's vetted data
- Contextual to user's relocation profile

### Phase 20 — Marketplace & Network Effects
- Landlords and schools list directly on platform
- Verified reviews from past expats
- Network effect: more expats → better vendor data → better recommendations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + Vite (TypeScript) |
| **Backend** | Express 5 (TypeScript, Node 24) |
| **Database** | PostgreSQL + Drizzle ORM |
| **Validation** | Zod (v4) + drizzle-zod |
| **API Contract** | OpenAPI 3.1 → Orval codegen (React Query hooks + Zod schemas) |
| **Monorepo** | pnpm workspaces |
| **Build** | esbuild (CJS bundle) |
| **CMS** | Sanity (neighbourhood & school guide content) |
| **Payments** | Stripe |
| **Messaging** | WhatsApp Business API |
| **Auth** | Clerk |

---

## Repository Structure

```
nairobi-expat-concierge/
├── artifacts/
│   ├── api-server/          # Express 5 API (routes, middleware, business logic)
│   └── mockup-sandbox/      # UI component prototyping canvas
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 spec (source of truth)
│   ├── api-client-react/    # Generated React Query hooks (do not edit)
│   ├── api-zod/             # Generated Zod schemas (do not edit)
│   └── db/                  # Drizzle ORM schema + migrations
├── scripts/                 # Utility scripts (post-merge, git push, etc.)
├── replit.md                # Developer notes and key commands
├── pnpm-workspace.yaml      # Workspace config, catalog pins
└── tsconfig.base.json       # Shared TypeScript strict defaults
```

---

## Getting Started

### Prerequisites
- Node.js 24+
- pnpm 9+
- PostgreSQL (or use the Replit-provisioned DB)

### Install
```bash
pnpm install
```

### Development
```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Run codegen after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Full typecheck
pnpm run typecheck

# Push DB schema (dev only)
pnpm --filter @workspace/db run push
```

### Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `GITHUB_TOKEN` | GitHub PAT for automated pushes |

---

## Automated GitHub Sync

A push script at `scripts/git-push.sh` runs on a schedule to keep this repo up to date. To trigger manually:

```bash
bash scripts/git-push.sh
```

---

## Contributing

This is an active build. Each phase is tracked in the project's task board. PRs should target feature branches; the `main` branch represents the latest stable build.

---

## License

MIT — see `LICENSE` for details.

---

*Built on Replit · Targeting production deployment on Vercel + Railway*
