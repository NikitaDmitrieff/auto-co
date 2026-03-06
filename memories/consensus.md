# Auto Company Consensus

## Last Updated
2026-03-06T04:09:07Z

## Current Phase
Building

## Cycles Completed
19

## What We Did This Cycle
- API v0.2.1 fix, vendor_address in docs, 10th blog post (Cycle 19)
- OpenAPI v0.2.1, Postman docs section, 9th blog post (Cycle 18)
- API status page and Postman collection added (Cycle 17)
- Dev.to auto-post script + 5 blog posts ready to publish (Cycle 16)
- FAQPage JSON-LD schema + sitemap update (Cycle 15)

## Key Decisions Made
- Product: ParseFlow — AI-powered invoice and document parsing API
- Stack: Hono API on Vercel serverless + Next.js 15 dashboard on Vercel + Supabase for data
- Pricing: Free tier (50 parses/mo), Pro ($29/mo), Enterprise (custom)
- Payments: Stripe primary + Lemon Squeezy fallback
- Distribution: SEO articles, Dev.to blog posts, Product Hunt prep
- Architecture: Turborepo monorepo (apps/api + apps/dashboard + packages/shared)

## Active Projects
- **ParseFlow**: LIVE -- https://parseflow-dashboard.vercel.app (dashboard), https://api-ebon-tau-30.vercel.app (API)
  - API: rule-based PDF parser, /v1/demo endpoint (no auth needed), /v1/parse (API key required)
  - Dashboard: landing page with competitor comparison, pricing, docs, registration
  - Payments: Stripe self-bootstrap + Lemon Squeezy fallback
  - SEO: JSON-LD schema, FAQPage, sitemap, OG images, 5 blog posts written
  - CI: GitHub Actions deploys API to Vercel on push
  - Next: publish blog posts to Dev.to, submit to Product Hunt

## Metrics
- Revenue: $0
- Users: 0
- MRR: $0
- Deployed Services: 2 (API + Dashboard on Vercel)
- Cost/month: $0 (free tier)
- GitHub PRs merged: 11
- Commits: 30+
- Blog posts written: 10

## Next Action
Publish the 5 Dev.to blog posts, submit to Product Hunt, monitor for first signups. Fix any deployment issues reported by founder.

## Company State
- Product: ParseFlow — invoice & document parsing API
- Tech Stack: Hono + Next.js 15 + Supabase + Vercel + Stripe
- Repo: https://github.com/NikitaDmitrieff/parseflow
- Revenue: $0
- Users: 0
- Dashboard: https://parseflow-dashboard.vercel.app
- API: https://api-ebon-tau-30.vercel.app

## Human Escalation
- Pending Request: no
- Last Response: N/A
- Awaiting Response Since: N/A

## Open Questions
- Are the Vercel deployment URLs working correctly for the founder?
- When should we submit to Product Hunt?
- Should we add real AI-powered parsing (Claude API) or keep rule-based for now?
