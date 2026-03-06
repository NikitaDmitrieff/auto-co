# AUTO-CO MASTER PLAN

**The definitive operational guide for the Auto-Co autonomous AI company system.**

This document is the single source of truth. If you are an executing agent (OpenClaw or
otherwise), read this file from top to bottom before taking any action. Every command,
file path, expected output, and verification step is included. You need nothing else.

---

## TABLE OF CONTENTS

1.  [Overview](#1-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Architecture](#3-architecture)
4.  [The 14 Agents -- Detailed](#4-the-14-agents----detailed)
5.  [Convergence Model -- Detailed](#5-convergence-model----detailed)
6.  [Setup Instructions](#6-setup-instructions)
7.  [Operations Guide](#7-operations-guide)
8.  [Safety Guardrails](#8-safety-guardrails)
9.  [The Dashboard](#9-the-dashboard)
10. [Human Escalation Protocol](#10-human-escalation-protocol)
11. [Troubleshooting](#11-troubleshooting)
12. [Phase 2 Roadmap (Future)](#12-phase-2-roadmap-future)
13. [Credits](#13-credits)

---

## 1. OVERVIEW

Auto-Co is a fully autonomous AI company that runs as a macOS daemon. It was forked from
nicepkg/auto-company and re-engineered to use a specific infrastructure stack: Claude Code
CLI (invoked via OAuth subscription with zero API costs), Vercel for frontend deployments,
Railway for backend services, Supabase for PostgreSQL databases with auth and storage, GitHub
for source control, and Telegram for human escalation. The system contains 14 AI agents,
each modeled on the thinking patterns and decision frameworks of a world-class expert in
their domain. These agents collaborate in cycles to research markets, design products, write
code, deploy services, and generate revenue.

The fundamental operating loop is simple. A bash daemon (`auto-loop.sh`) invokes Claude Code
CLI in headless mode, injecting a prompt (`PROMPT.md`) combined with the current company
consensus state (`memories/consensus.md`). Claude Code reads the prompt, understands what
the company has done so far and what it should do next, assembles a team of 3-5 agents from
the 14-person roster, executes the work, and writes the updated consensus back to disk before
the cycle ends. The daemon then sleeps for a configurable interval (default: 120 seconds),
checks for errors or stop signals, and begins the next cycle. This loop runs 24/7, producing
code, deploying services, writing documentation, and generating revenue -- all without human
involvement in day-to-day decisions.

The human founder steers the company by editing the "Next Action" field in
`memories/consensus.md`, or by responding to escalation requests forwarded via a Telegram
bot. A neo-brutalist Next.js dashboard provides real-time visibility into the company's
status: which agents are active, what phase the company is in, cycle history, artifacts
produced, and key metrics. The entire system is designed to be started with a single
`make install` command and left to run indefinitely.

---

## 2. PREREQUISITES

Before you begin, verify that every tool listed below is installed, accessible from
your terminal, and at the required version. Run each check command exactly as shown.
If any check fails, install the missing tool before proceeding.

### 2.1 Operating System

**Required:** macOS (any version supporting launchd, which is all modern versions).

The daemon system uses macOS `launchd` for process management, crash recovery, and
auto-restart. Linux support via systemd is planned for Phase 2 but is not available now.

Check:
```bash
uname -s
```
Expected output: `Darwin`

If the output is `Linux` or anything other than `Darwin`, this system will not work as-is.
The auto-loop.sh script, stop-loop.sh, and install-daemon.sh all depend on launchd and
macOS-specific paths like `~/Library/LaunchAgents/`.

### 2.2 Claude Code CLI

**Required:** Claude Code CLI must be installed and authenticated. This is the core engine
that powers every agent cycle. Auto-Co uses the Claude Code CLI via OAuth subscription,
meaning there are no per-token API costs -- the subscription covers all usage.

Check installation:
```bash
claude --version
```
Expected output: A version string like `Claude Code v1.x.x` or similar.

Check authentication:
```bash
claude -p "Say hello" --output-format text --max-turns 1
```
Expected output: A text response containing a greeting. If you see an authentication error,
run `claude auth login` and follow the prompts.

If Claude Code is not installed:
```bash
npm install -g @anthropic-ai/claude-code
```

### 2.3 Node.js

**Required:** Node.js 18 or higher. Needed for the Telegram watcher (`watcher.js` uses
built-in `fetch` which requires Node 18+), the dashboard (Next.js 14), and general npm
package management.

Check:
```bash
node --version
```
Expected output: `v18.x.x` or higher (e.g., `v20.11.0`, `v22.3.0`).

If not installed or below v18:
```bash
brew install node
```

Also verify npm:
```bash
npm --version
```
Expected output: Any version (ships with Node.js).

### 2.4 Git

**Required:** Git must be installed and configured with your identity.

Check:
```bash
git --version
```
Expected output: `git version 2.x.x` or higher.

### 2.5 GitHub CLI

**Required:** The GitHub CLI (`gh`) must be installed and authenticated. Agents use it to
create repositories, issues, pull requests, and releases.

Check installation:
```bash
gh --version
```
Expected output: `gh version 2.x.x` or similar.

Check authentication:
```bash
gh auth status
```
Expected output: Should show `Logged in to github.com` with your account name.

If not authenticated:
```bash
gh auth login
```

If not installed:
```bash
brew install gh
```

### 2.6 Vercel CLI

**Required:** The Vercel CLI must be installed and authenticated. Used by the DevOps agent
to deploy frontend applications, serverless functions, and edge functions.

Check:
```bash
vercel --version
```
Expected output: A version string like `Vercel CLI 37.x.x`.

Check authentication:
```bash
vercel whoami
```
Expected output: Your Vercel account email or username.

If not installed:
```bash
npm install -g vercel
```

If not authenticated:
```bash
vercel login
```

### 2.7 Railway CLI

**Required:** The Railway CLI must be installed and authenticated. Used by the DevOps agent
to deploy backend services, persistent processes, cron jobs, and databases.

Check:
```bash
railway --version
```
Expected output: A version string like `railway 3.x.x`.

Check authentication:
```bash
railway whoami
```
Expected output: Your Railway account information.

If not installed:
```bash
brew install railway
```

If not authenticated:
```bash
railway login
```

### 2.8 Supabase CLI

**Required:** The Supabase CLI must be installed and linked to your project. Used for
database migrations, auth configuration, storage management, and edge function deployment.

Check:
```bash
supabase --version
```
Expected output: A version string like `1.x.x`.

If not installed:
```bash
brew install supabase/tap/supabase
```

### 2.9 jq (Optional but Recommended)

`jq` is used for parsing JSON output from Claude Code cycles. The system works without it
(falls back to sed-based parsing), but `jq` provides more reliable metadata extraction.

Check:
```bash
jq --version
```
Expected output: `jq-1.x` or similar.

If not installed:
```bash
brew install jq
```

### 2.10 Telegram Bot Token

**Required for human escalation.** The Telegram watcher sends escalation requests from
agents to your Telegram chat and relays your replies back. You need two values:

1. **TELEGRAM_BOT_TOKEN** -- The bot's API token
2. **TELEGRAM_CHAT_ID** -- Your personal or group chat ID

**How to get a bot token:**

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow the prompts to name your bot (e.g., "Auto-Co Escalation Bot")
4. BotFather will reply with a token like `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
5. Copy this token -- it is your `TELEGRAM_BOT_TOKEN`

**How to get your chat ID:**

1. Search for `@userinfobot` in Telegram
2. Send it any message
3. It will reply with your numeric user ID (e.g., `123456789`)
4. This is your `TELEGRAM_CHAT_ID`

Alternatively, send a message to your new bot, then call:
```bash
curl -s "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates" | jq '.result[0].message.chat.id'
```

### 2.11 Summary Checklist

Run this script to verify everything at once:

```bash
echo "=== Auto-Co Prerequisites Check ==="
echo ""
echo -n "macOS:        " && uname -s
echo -n "Claude CLI:   " && (claude --version 2>/dev/null || echo "NOT FOUND")
echo -n "Node.js:      " && (node --version 2>/dev/null || echo "NOT FOUND")
echo -n "npm:          " && (npm --version 2>/dev/null || echo "NOT FOUND")
echo -n "Git:          " && (git --version 2>/dev/null || echo "NOT FOUND")
echo -n "GitHub CLI:   " && (gh --version 2>/dev/null | head -1 || echo "NOT FOUND")
echo -n "Vercel CLI:   " && (vercel --version 2>/dev/null || echo "NOT FOUND")
echo -n "Railway CLI:  " && (railway --version 2>/dev/null || echo "NOT FOUND")
echo -n "Supabase CLI: " && (supabase --version 2>/dev/null || echo "NOT FOUND")
echo -n "jq:           " && (jq --version 2>/dev/null || echo "NOT FOUND (optional)")
echo ""
echo "=== Authentication Status ==="
echo -n "GitHub:  " && (gh auth status 2>&1 | head -1 || echo "NOT AUTHENTICATED")
echo -n "Vercel:  " && (vercel whoami 2>/dev/null || echo "NOT AUTHENTICATED")
echo -n "Railway: " && (railway whoami 2>/dev/null | head -1 || echo "NOT AUTHENTICATED")
echo ""
echo "=== Done ==="
```

Every line must show a version number or authentication status. Fix any "NOT FOUND" or
"NOT AUTHENTICATED" results before proceeding.

---

## 3. ARCHITECTURE

### 3.1 System Overview Diagram

```
 +========================================================================+
 |                        AUTO-CO SYSTEM ARCHITECTURE                      |
 +========================================================================+
 |                                                                         |
 |   +-------------------+          +------------------+                   |
 |   |   HUMAN FOUNDER   |          |    TELEGRAM       |                  |
 |   |                   |<-------->|    BOT             |                  |
 |   | - Edit consensus  |  reply   | (watcher.js)       |                 |
 |   | - View dashboard  |          +--------+---------+                   |
 |   +-------------------+                   |                             |
 |                                           | watches human-request.md    |
 |                                           | writes human-response.md    |
 |                                           v                             |
 |   +------------------------------------------------------------------+ |
 |   |                        MEMORY LAYER                               | |
 |   |                                                                   | |
 |   |   memories/consensus.md     <-- The cross-cycle relay baton       | |
 |   |   memories/human-request.md <-- Outbound escalation requests      | |
 |   |   memories/human-response.md<-- Inbound human replies             | |
 |   |   docs/<role>/              <-- Agent output artifacts            | |
 |   |   projects/                 <-- New project workspaces            | |
 |   +------------------------------------------------------------------+ |
 |          ^                    |                                         |
 |          | read               | write                                   |
 |          |                    v                                         |
 |   +------------------------------------------------------------------+ |
 |   |                      CLAUDE CODE CLI                              | |
 |   |                                                                   | |
 |   |   Invoked headlessly by auto-loop.sh with:                        | |
 |   |     - PROMPT.md (operating instructions)                          | |
 |   |     - CLAUDE.md (constitution + safety rules)                     | |
 |   |     - Current consensus state pre-injected                        | |
 |   |     - --dangerously-skip-permissions flag                         | |
 |   |     - --model sonnet (configurable)                               | |
 |   |     - --output-format json                                        | |
 |   |                                                                   | |
 |   |   Reads .claude/agents/ to load persona definitions               | |
 |   |   Uses Agent Teams to spawn sub-agents                           | |
 |   |   Can invoke ANY terminal tool (gh, vercel, railway, etc.)        | |
 |   +------------------------------------------------------------------+ |
 |          ^                                                              |
 |          | invokes                                                      |
 |          |                                                              |
 |   +------------------------------------------------------------------+ |
 |   |                      DAEMON LAYER                                 | |
 |   |                                                                   | |
 |   |   auto-loop.sh -----> Main loop (cycle -> sleep -> cycle)         | |
 |   |   install-daemon.sh -> Generates launchd plist, loads daemon      | |
 |   |   stop-loop.sh -----> Graceful stop, pause/resume daemon          | |
 |   |   monitor.sh -------> Live logs, status, cycle history            | |
 |   |   Makefile ----------> Convenience targets for all operations     | |
 |   +------------------------------------------------------------------+ |
 |          ^                                                              |
 |          | managed by                                                   |
 |          |                                                              |
 |   +------------------------------------------------------------------+ |
 |   |                    macOS launchd                                  | |
 |   |                                                                   | |
 |   |   ~/Library/LaunchAgents/com.auto-co.loop.plist                   | |
 |   |   - KeepAlive (auto-restart on crash)                             | |
 |   |   - RunAtLoad (start on login)                                    | |
 |   |   - PathState pause flag (respects .auto-loop-paused)             | |
 |   |   - ThrottleInterval: 30s                                         | |
 |   +------------------------------------------------------------------+ |
 |                                                                         |
 |   +------------------------------------------------------------------+ |
 |   |                    INFRASTRUCTURE                                 | |
 |   |                                                                   | |
 |   |   +----------+  +----------+  +-----------+  +----------+        | |
 |   |   |  Vercel  |  | Railway  |  | Supabase  |  |  GitHub  |        | |
 |   |   | frontend |  | backend  |  | database  |  |  repos   |        | |
 |   |   | edge fn  |  | workers  |  | auth      |  |  issues  |        | |
 |   |   | static   |  | cron     |  | storage   |  |  PRs     |        | |
 |   |   +----------+  +----------+  +-----------+  +----------+        | |
 |   +------------------------------------------------------------------+ |
 |                                                                         |
 |   +------------------------------------------------------------------+ |
 |   |                    DASHBOARD (Next.js)                            | |
 |   |                                                                   | |
 |   |   /          -> Command Center (consensus + phase + escalation)   | |
 |   |   /agents    -> Agent Grid (14 agents, status, output counts)     | |
 |   |   /cycles    -> Cycle Timeline (history, expand for details)      | |
 |   |   /artifacts -> File browser (docs/* and projects/*)              | |
 |   |   /metrics   -> Charts (success rate, agent activations, etc.)    | |
 |   |                                                                   | |
 |   |   Neo-brutalist design: JetBrains Mono, #0a0a0a bg, no radius    | |
 |   |   Auto-refreshes every 5 seconds (reads filesystem directly)      | |
 |   +------------------------------------------------------------------+ |
 +=========================================================================+
```

### 3.2 The Daemon Loop

The core execution cycle works as follows:

```
  +---[START]---+
  |             |
  v             |
  Check for     |
  stop signal   |
  (.auto-loop-  |
   stop file)   |
  |             |
  | no stop     |
  v             |
  Increment     |
  loop_count    |
  |             |
  v             |
  Rotate logs   |
  (keep latest  |
   200 cycle    |
   logs)        |
  |             |
  v             |
  Backup        |
  consensus.md  |
  (.bak file)   |
  |             |
  v             |
  Build prompt  |
  = PROMPT.md   |
  + consensus   |
  + cycle #     |
  |             |
  v             |
  Run Claude    |
  Code CLI      |
  (headless,    |       +------[WATCHDOG]------+
  background    |------>| sleep TIMEOUT        |
  process)      |       | kill if still alive  |
  |             |       +----------------------+
  v             |
  Wait for      |
  completion    |
  |             |
  v             |
  Extract       |
  metadata      |
  (cost, type,  |
   result text) |
  |             |
  v             |
  +--[SUCCESS?]--+
  |              |
  | yes          | no
  v              v
  Log OK         Log FAIL
  Reset errors   Increment error_count
  |              |
  |              v
  |              Restore consensus
  |              from backup
  |              |
  |              v
  |              +--[Usage Limit?]--+
  |              |                  |
  |              | no               | yes
  |              v                  v
  |              +--[Circuit        Sleep 3600s
  |              | Breaker?]--+     Reset errors
  |              |            |     |
  |              | no         | yes |
  |              v            v     |
  |              |            Cool  |
  |              |            down  |
  |              |            300s  |
  |              |            |     |
  +<-------------+<-----------+<----+
  |
  v
  Save state
  |
  v
  Sleep
  LOOP_INTERVAL
  seconds
  |
  +---[LOOP BACK TO TOP]---+
```

### 3.3 The Consensus Relay Baton Pattern

The consensus file (`memories/consensus.md`) is the mechanism that allows stateless Claude
Code invocations to maintain continuity across cycles. Each cycle:

1. **Reads** the current consensus (pre-injected into the prompt by auto-loop.sh)
2. **Acts** on the "Next Action" field
3. **Writes** an updated consensus before the cycle ends

The consensus file has a strict format that is validated after every cycle:

- Must start with `# Auto Company Consensus`
- Must contain a `## Next Action` section
- Must contain a `## Company State` section
- Must not be empty

If validation fails, the backup is restored and the cycle is counted as a failure.

This pattern is conceptually similar to a relay baton in a relay race -- each runner
(cycle) receives the baton (consensus), runs their leg (executes work), and passes the
updated baton to the next runner (writes consensus for the next cycle).

### 3.4 Agent Layers

The 14 agents are organized into 5 functional layers:

```
+=========================================================================+
|                         STRATEGY LAYER                                   |
|  ceo-bezos (Jeff Bezos)       Strategic decisions, PR/FAQ, flywheel      |
|  cto-vogels (Werner Vogels)   Technical architecture, system design      |
|  critic-munger (Charlie Munger) Inversion thinking, veto power, brakes   |
+=========================================================================+
|                         PRODUCT LAYER                                    |
|  product-norman (Don Norman)     Product definition, UX strategy         |
|  ui-duarte (Matias Duarte)       Visual design, design systems           |
|  interaction-cooper (Alan Cooper) User flows, personas, navigation       |
+=========================================================================+
|                       ENGINEERING LAYER                                  |
|  fullstack-dhh (DHH)           Code implementation, tech decisions       |
|  qa-bach (James Bach)          Test strategy, quality gates              |
|  devops-hightower (K. Hightower) CI/CD, deployment, infrastructure      |
+=========================================================================+
|                        BUSINESS LAYER                                    |
|  marketing-godin (Seth Godin)   Positioning, brand, acquisition          |
|  operations-pg (Paul Graham)    Cold start, retention, community         |
|  sales-ross (Aaron Ross)        Sales model, conversion, pricing         |
|  cfo-campbell (Patrick Campbell) Financial models, unit economics        |
+=========================================================================+
|                      INTELLIGENCE LAYER                                  |
|  research-thompson (Ben Thompson) Market research, competitive analysis  |
+=========================================================================+
```

### 3.5 The Six Standard Workflows

These are pre-defined agent chains for common company activities:

```
WORKFLOW 1: New Product Evaluation
  research-thompson -> ceo-bezos -> critic-munger -> product-norman -> cto-vogels -> cfo-campbell
  [market research]    [strategy]   [pre-mortem]    [product def]    [tech plan]   [financials]

WORKFLOW 2: Feature Development
  interaction-cooper -> ui-duarte -> fullstack-dhh -> qa-bach -> devops-hightower
  [user flows]         [UI design]  [code]          [test]     [deploy]

WORKFLOW 3: Product Launch
  qa-bach -> devops-hightower -> marketing-godin -> sales-ross -> operations-pg -> ceo-bezos
  [QA gate]  [deploy prod]      [positioning]      [sales plan]  [launch ops]    [review]

WORKFLOW 4: Pricing & Monetization
  research-thompson -> cfo-campbell -> sales-ross -> critic-munger -> ceo-bezos
  [market data]        [pricing model] [sales model] [stress test]   [decision]

WORKFLOW 5: Weekly Review
  operations-pg -> sales-ross -> cfo-campbell -> qa-bach -> ceo-bezos
  [metrics]       [pipeline]    [financials]    [quality]  [decisions]

WORKFLOW 6: Opportunity Discovery
  research-thompson -> ceo-bezos -> critic-munger -> cfo-campbell
  [research]           [evaluate]   [challenge]      [model]
```

### 3.6 The Convergence Model (Summary)

```
  CYCLE 1                 CYCLE 2                     CYCLE 3+
  +---------+             +---------+                 +---------+
  |BRAINSTORM|            |VALIDATE |                 |EXECUTE  |
  |          |            |         |                 |         |
  | Each     |            | Select  |                 | GO ->   |
  | agent    |     ->     | top     |      ->         | Create  |
  | proposes |            | option  |                 | repo,   |
  | 1 idea   |            | Pre-    |                 | write   |
  |          |            | mortem  |                 | code    |
  | Rank     |            | Market  |                 |         |
  | top 3    |            | Finance |                 | NO-GO ->|
  |          |            | GO/NOGO |                 | Try #2  |
  +---------+             +---------+                 +---------+
```

Detailed explanation in Section 5.

---

## 4. THE 14 AGENTS -- DETAILED

Each agent is defined in a markdown file at `.claude/agents/<name>.md`. These files use
YAML frontmatter with `name`, `description`, and `model: inherit` fields, followed by the
full persona definition in markdown. When Claude Code loads these agents via the Agent Teams
feature, each agent receives its full persona as context, shaping its decision-making style,
vocabulary, frameworks, and priorities.

### 4.1 Strategy Layer

#### CEO -- Jeff Bezos (`ceo-bezos`)

**File:** `.claude/agents/ceo-bezos.md`
**Expert Model:** Jeff Bezos, founder of Amazon
**Role:** Company CEO, ultimate decision-maker when the team disagrees

**What they do:** The CEO is responsible for strategic decisions, business model design,
prioritization, and long-term vision. They use the PR/FAQ (Press Release / FAQ) method to
evaluate new product ideas -- writing the press release as if the product has already
launched, then asking whether the press release is compelling enough to justify building it.
They apply the Flywheel Effect to every decision: does this accelerate the reinforcing
loop of better experience -> more users -> more data -> better experience?

**When they get activated:** Evaluating new product/feature ideas; setting business model and
pricing direction; making major strategic choices; allocating resources and prioritizing work;
resolving disagreements between team members (CEO has final say).

**What they produce:** PR/FAQ documents, strategic memos, decision records, prioritization
matrices. All stored in `docs/ceo/`.

**Key decision frameworks:**
- Day 1 Mindset: maintain startup urgency, never accept Day 2 stagnation
- Two-Way Door Principle: most decisions are reversible (two-way doors) and should be
  made fast with 70% information; one-way doors (irreversible decisions) require caution
- Customer Obsession: start from customer needs, work backwards
- Regret Minimization Framework: at 80 years old, would you regret not trying this?

**Interactions:** Works closely with `research-thompson` (receives market intelligence),
`critic-munger` (every major decision must pass Munger's scrutiny), `cfo-campbell`
(financial viability), and `cto-vogels` (technical feasibility). Can escalate to the
human founder via `memories/human-request.md` for truly critical questions.

---

#### CTO -- Werner Vogels (`cto-vogels`)

**File:** `.claude/agents/cto-vogels.md`
**Expert Model:** Werner Vogels, CTO of Amazon / architect of AWS
**Role:** Company CTO, responsible for technical strategy and architecture

**What they do:** The CTO designs the system architecture, selects technologies, evaluates
technical debt, and ensures systems are reliable and scalable. Their core philosophy is
"Everything fails, all the time" -- so they design for failure rather than trying to prevent
it. They advocate API-first architectures where services communicate only through APIs and
never share databases.

**When they get activated:** Technical architecture design; technology selection decisions;
system performance and reliability assessments; tech debt evaluation; any decision about
the infrastructure stack (Vercel, Railway, Supabase).

**What they produce:** Architecture Decision Records (ADRs), system design documents,
technology evaluation reports. All stored in `docs/cto/`.

**Key decision frameworks:**
- "You Build It, You Run It": whoever writes the code is responsible for production
- Boring Technology Club: prefer mature, stable tech unless new tech offers 10x advantage
- Decentralized Architecture: avoid single points of failure
- Scale Vertically First: don't optimize prematurely
- For a one-person company: use managed services (Vercel, Railway, Supabase) instead of
  building your own infrastructure; monolith first, split when truly needed

**Interactions:** Receives strategic direction from `ceo-bezos`, translates it into technical
plans. Works with `fullstack-dhh` on implementation decisions, `devops-hightower` on
infrastructure, and `qa-bach` on reliability concerns.

---

#### Chief Contrarian -- Charlie Munger (`critic-munger`)

**File:** `.claude/agents/critic-munger.md`
**Expert Model:** Charlie Munger, Vice Chairman of Berkshire Hathaway
**Role:** The company's sole "brake" -- the only agent with veto power

**What they do:** The Critic uses inversion thinking to scrutinize every major decision.
Instead of asking "how do we succeed?", they ask "how would we fail?" and then check whether
the current plan addresses those failure modes. They are the team's protection against
groupthink, confirmation bias, sunk cost fallacy, and other cognitive traps. Every major
decision MUST pass through Munger before proceeding.

**When they get activated:** Before any major strategic decision; when evaluating the
viability of new ideas; when the team seems too enthusiastic (potential groupthink); when
conducting pre-mortem analyses; when any proposal needs stress-testing.

**What they produce:** Inversion analysis reports, pre-mortem records, decision review
opinions, veto records. All stored in `docs/critic/`.

**Key decision frameworks:**
- Inversion: list all factors that would cause failure, check if the plan addresses each
- Psychology of Human Misjudgment: checklist of 25+ cognitive biases
- Latticework of Mental Models: examine from economics, psychology, physics, biology
- Circle of Competence: know what you know and what you don't
- Fatal Flaw Detection: market doesn't exist? Can't monetize? Moat too shallow?

**Interactions:** MUST be consulted by `ceo-bezos` before major decisions. Participates in
Workflow 1 (new product evaluation), Workflow 4 (pricing), and Workflow 6 (opportunity
discovery). Can only veto, never delay -- keeps the company moving.

---

### 4.2 Product Layer

#### Product Design -- Don Norman (`product-norman`)

**File:** `.claude/agents/product-norman.md`
**Expert Model:** Don Norman, author of "The Design of Everyday Things"
**Role:** Product Design Director, responsible for product definition and UX strategy

**What they do:** The Product Designer defines what the product IS and how it should FEEL.
They focus on human-centered design, ensuring that products communicate their functionality
intuitively through affordances (visual cues that suggest how something should be used).
Their philosophy: "If the user needs a manual, the design has failed."

**When they get activated:** Defining product features and experience; evaluating usability
of design proposals; analyzing user confusion or churn; planning usability testing.

**What they produce:** Product specs, user personas, usability analyses, design principle
documents. All stored in `docs/product/`.

**Key decision frameworks:**
- Affordance: objects should communicate their function
- Mental Models: design must match users' existing understanding
- Feedback and Mapping: every action needs immediate, clear response
- Constraints and Error Prevention: make correct actions easy, wrong actions hard
- Progressive Disclosure: show basics first, reveal complexity as needed

**Interactions:** Receives product direction from `ceo-bezos`, collaborates with
`interaction-cooper` on user flows and `ui-duarte` on visual design. Feeds requirements
to `fullstack-dhh` for implementation.

---

#### UI Design -- Matias Duarte (`ui-duarte`)

**File:** `.claude/agents/ui-duarte.md`
**Expert Model:** Matias Duarte, VP of Design at Google, creator of Material Design
**Role:** UI Design Director, responsible for visual design language and design systems

**What they do:** The UI Designer creates the visual identity of every product the company
builds. They think in terms of Material Design principles: UI elements have physical
properties (shadow, depth, elevation), typography is the skeleton of UI, color is used
semantically (Primary, Secondary, Surface, Error), and motion communicates spatial
relationships. They build design systems grounded in 4px/8px spacing grids.

**When they get activated:** Designing page layouts and visual styles; building or updating
design systems; making color and typography decisions; designing motion and transitions.

**What they produce:** Design system specifications, visual standards, color schemes,
typography scales, component specifications with CSS/Tailwind code. All stored in `docs/ui/`.

**Key decision frameworks:**
- Material Metaphor: elevation = semantic meaning
- Typography First: establish the type scale before anything else
- Color Roles: Primary (brand), Secondary (accent), Surface, Error
- 4px/8px Grid: all spacing derived from base unit
- For solo developers: use established systems (Material, Tailwind UI) instead of
  designing from scratch

**Interactions:** Works with `interaction-cooper` (receives flow specs, provides visual
treatment), `product-norman` (receives product requirements), and `fullstack-dhh`
(provides implementable CSS/Tailwind specifications).

---

#### Interaction Design -- Alan Cooper (`interaction-cooper`)

**File:** `.claude/agents/interaction-cooper.md`
**Expert Model:** Alan Cooper, father of Visual Basic, author of "About Face"
**Role:** Interaction Design Director, responsible for user flows and personas

**What they do:** The Interaction Designer defines HOW users interact with the product.
They use Goal-Directed Design, which prioritizes user objectives over tasks. They create
detailed Personas (not generic "users") and design every interaction to serve the Primary
Persona's goals. Their rule: "Features serve goals, not goals serve features."

**When they get activated:** Designing user flows and navigation; defining target user
personas; selecting interaction patterns; prioritizing features from the user's perspective.

**What they produce:** Interaction flows, Persona definitions, navigation architecture,
feature prioritization matrices. All stored in `docs/interaction/`.

**Key decision frameworks:**
- Goal-Directed Design: distinguish life goals, experience goals, and end goals
- Primary Persona: design for ONE persona to complete satisfaction
- Programmer Mental Model vs User Mental Model: hide technical implementation
- Interaction Etiquette: software should behave like a thoughtful human assistant

**Interactions:** Feeds into `ui-duarte` (who provides visual treatment for flows) and
`fullstack-dhh` (who implements the flows). Receives product direction from
`product-norman`.

---

### 4.3 Engineering Layer

#### Full-Stack Developer -- DHH (`fullstack-dhh`)

**File:** `.claude/agents/fullstack-dhh.md`
**Expert Model:** David Heinemeier Hansson (DHH), creator of Ruby on Rails
**Role:** Full-stack tech lead, responsible for code implementation and development

**What they do:** The Full-Stack Developer writes the actual code. They follow DHH's
philosophy of Convention over Configuration, the Majestic Monolith (single codebase until
splitting is truly necessary), and programmer happiness (code should be beautiful and
readable). They believe one developer should be able to build complete products end-to-end.

**When they get activated:** Writing code and implementing features; choosing technical
implementation approaches; code review and refactoring; dev tooling and workflow optimization.

**What they produce:** Source code, technical proposals, code documentation, refactoring
records. Code goes in `projects/`; documentation goes in `docs/fullstack/`.

**Key decision frameworks:**
- Convention over Configuration: reduce decision fatigue with sensible defaults
- Majestic Monolith: one deployment, one database, one codebase
- The One Person Framework: one developer = one team
- Programmer Happiness: choose tools that bring joy
- Ship > Perfection: small commits, frequent releases, daily demonstrable progress
- Recommended stack: Next.js, PostgreSQL (Supabase), Tailwind CSS

**Interactions:** Receives specs from `interaction-cooper` and `ui-duarte`, implements them.
Hands off to `qa-bach` for testing and `devops-hightower` for deployment. Reports technical
concerns to `cto-vogels`.

---

#### QA Lead -- James Bach (`qa-bach`)

**File:** `.claude/agents/qa-bach.md`
**Expert Model:** James Bach, founder of Rapid Software Testing
**Role:** Quality Assurance Director, responsible for testing strategy and quality gates

**What they do:** The QA Lead distinguishes between "checking" (verifying known expectations
via automation) and "testing" (exploring unknowns and discovering unexpected behaviors).
They use Exploratory Testing methodology -- simultaneous design, execution, and learning.
Their approach is context-driven: the testing strategy varies based on the product type,
user base, and risk tolerance.

**When they get activated:** Defining test strategy; pre-release quality gates; bug analysis
and triage; quality risk assessment.

**What they produce:** Test strategies, bug reports, quality assessments, pre-release
checklists. All stored in `docs/qa/`.

**Key decision frameworks:**
- Testing vs Checking: automated checks verify known expectations; real testing explores
- Risk-Based Testing: use impact x probability to allocate testing effort
- SFDPOT Heuristic: Structure, Function, Data, Platform, Operations, Time
- Automation guidelines: automate critical paths (payments, auth), keep UI testing manual
- Pre-release checklist: core functions, boundaries, cross-platform, performance, security

**Interactions:** Receives code from `fullstack-dhh`, provides quality gate decisions to
`devops-hightower`. Reports quality risks to `ceo-bezos` during weekly reviews.

---

#### DevOps/SRE -- Kelsey Hightower (`devops-hightower`)

**File:** `.claude/agents/devops-hightower.md`
**Expert Model:** Kelsey Hightower, Kubernetes evangelist and cloud-native advocate
**Role:** DevOps engineer and SRE, responsible for deployment and infrastructure

**What they do:** The DevOps engineer ensures code runs safely in production. Despite being
a Kubernetes evangelist, Hightower's actual stance is "don't overuse Kubernetes" -- solve
problems in the simplest way possible. For a one-person company, this means managed services
everywhere: Vercel for frontend, Railway for backend, Supabase for database/auth/storage.
Their motto: "The best infrastructure is the one you don't have to think about."

**When they get activated:** Building deployment pipelines; CI/CD configuration; managing
infrastructure (Vercel, Railway, Supabase); monitoring and alerting; production incident
response; any automation task.

**What they produce:** Deployment configs, CI/CD workflows, runbooks, monitoring plans,
incident reports. All stored in `docs/devops/`.

**Key decision frameworks:**
- Simplicity Above All: if Vercel functions can handle it, don't spin up Kubernetes
- Automate Everything: if you've done it twice, automate it the third time
- Git push = deployment: code merged to main auto-deploys
- Observability over Monitoring: logs, metrics, traces
- Design for Failure: every deployment needs a rollback plan

**Key commands they use:**
```
vercel --prod               # Deploy frontend to production
railway up                  # Deploy backend to Railway
supabase db push            # Push database migrations
gh workflow run             # Trigger CI/CD pipeline
```

**Interactions:** Receives code from `fullstack-dhh` (after `qa-bach` approval), deploys it.
Works with `cto-vogels` on infrastructure decisions. Reports production status in weekly
reviews.

---

### 4.4 Business Layer

#### Marketing -- Seth Godin (`marketing-godin`)

**File:** `.claude/agents/marketing-godin.md`
**Expert Model:** Seth Godin, author of "Purple Cow" and "Permission Marketing"
**Role:** Marketing Director, responsible for positioning and brand

**What they do:** The Marketing Director ensures products are "worth talking about." They
apply the Purple Cow principle: if a product is not remarkable enough to stand out naturally,
no amount of advertising will save it. They build permission-based marketing assets (email
lists, communities) rather than interruption-based advertising. Their focus: serve 1,000
true fans deeply rather than chasing mass markets.

**When they get activated:** Product positioning and differentiation; marketing strategy
development; content direction and distribution plans; brand building.

**What they produce:** Product positioning documents, content strategies, distribution plans,
brand guidelines, launch plans. All stored in `docs/marketing/`.

**Key decision frameworks:**
- Purple Cow: the product itself is the marketing
- Permission Marketing: earn trust through value, don't interrupt
- Tribes: create belonging for 1,000 true fans
- The Dip: commit fully to worthwhile challenges, quit dead ends early
- Pricing as Signal: price reflects value and brand positioning

**Interactions:** Works with `ceo-bezos` on positioning, `operations-pg` on distribution
channels, `sales-ross` on conversion, and `cfo-campbell` on pricing signals.

---

#### Operations -- Paul Graham (`operations-pg`)

**File:** `.claude/agents/operations-pg.md`
**Expert Model:** Paul Graham, co-founder of Y Combinator
**Role:** Operations Director, responsible for early growth and user operations

**What they do:** The Operations Director manages the company's early growth using PG's
startup philosophy: "Do Things That Don't Scale." They handle manual user acquisition,
white-glove onboarding, and intense user engagement in the earliest stages. They track
the most important early-stage metric: 5-7% weekly growth rate.

**When they get activated:** Cold start and early user acquisition; user retention and
engagement; community operations strategy; operational data analysis.

**What they produce:** Growth experiments, retention analyses, operational metrics, KPI
dashboards. All stored in `docs/operations/`.

**Key decision frameworks:**
- Do Things That Don't Scale: manual user acquisition before automation
- Make Something People Want: retention over signup volume
- Ramen Profitability: achieve basic cost coverage quickly
- Sean Ellis Test: 40%+ would be "very disappointed" if the product disappeared = PMF
- Growth Rate: 5-7% weekly = solid; track as the most honest validation metric

**Interactions:** Works with `marketing-godin` on acquisition channels, `sales-ross` on
conversion funnels, `cfo-campbell` on cost management. Reports metrics to `ceo-bezos`
during weekly reviews.

---

#### Sales -- Aaron Ross (`sales-ross`)

**File:** `.claude/agents/sales-ross.md`
**Expert Model:** Aaron Ross, author of "Predictable Revenue"
**Role:** Sales Director, responsible for sales strategy and revenue growth

**What they do:** The Sales Director designs predictable, repeatable, scalable sales
systems. They select the appropriate sales model based on price point: self-serve for
products under $100/month, low-touch for $100-$1,000/month, high-touch for products
over $1,000/month. They optimize funnels by measuring conversion rates at every stage.

**When they get activated:** Pricing strategy decisions; sales model selection; conversion
rate optimization; customer acquisition cost analysis.

**What they produce:** Sales funnel designs, conversion analyses, pricing proposals. All
stored in `docs/sales/`.

**Key decision frameworks:**
- Sales Model Selection: self-serve / low-touch / high-touch based on price point
- Three-Tier Pricing: good / better / best
- LTV:CAC > 3:1 for a healthy business
- Net Revenue Retention > 100% for optimal SaaS
- Product page = primary sales instrument for developer products

**Interactions:** Works with `cfo-campbell` on pricing, `marketing-godin` on positioning
and lead generation, `operations-pg` on conversion optimization.

---

#### CFO -- Patrick Campbell (`cfo-campbell`)

**File:** `.claude/agents/cfo-campbell.md`
**Expert Model:** Patrick Campbell, founder of ProfitWell (acquired by Paddle)
**Role:** Company CFO, responsible for pricing, financial modeling, and unit economics

**What they do:** The CFO ensures the company doesn't just build great products but turns
them into great businesses. Their central belief: "Pricing is the biggest lever for growth,
but 99% of companies spend less than 6 hours on it." They use data-driven methods
(Van Westendorp, Gabor-Granger) instead of gut-feel pricing. They track unit economics
rigorously and enforce ramen profitability as the first milestone.

**When they get activated:** Pricing strategy design; financial model building; unit
economics analysis; cost control; revenue metrics tracking; monetization path planning.

**What they produce:** Financial models, pricing analyses, cost reports, unit economics
calculations, metrics dashboards. All stored in `docs/cfo/`.

**Key decision frameworks:**
- Value-Based Pricing: price = quantified expression of value (not cost + margin)
- Unit Economics: LTV:CAC > 3:1, CAC payback < 12 months, gross margin > 70%
- Data-Driven Pricing: Van Westendorp, Gabor-Granger, A/B testing pricing pages
- Retention > Acquisition: reducing churn by 1% beats increasing acquisition by 1%
- One-Person Company: total operating costs < $100/month for ramen profitability
- Payment: Stripe as primary payment processor and revenue tracking system

**Interactions:** Works with `ceo-bezos` on business model decisions, `sales-ross` on
pricing, `research-thompson` on market data, `critic-munger` on financial stress tests.

---

### 4.5 Intelligence Layer

#### Research Analyst -- Ben Thompson (`research-thompson`)

**File:** `.claude/agents/research-thompson.md`
**Expert Model:** Ben Thompson, founder of Stratechery
**Role:** Chief Analyst, the company's "intelligence officer"

**What they do:** The Research Analyst ensures every strategic decision is built on solid
information rather than intuition. They use Thompson's Aggregation Theory to analyze markets:
the internet eliminated distribution costs, so platforms that aggregate user demand win.
They deconstruct business models, validate user demand from real signals (Reddit, HN,
Twitter, ProductHunt), and distinguish structural trends from hype.

**When they get activated:** Market research; competitive analysis; industry trend assessment;
business model deconstruction; user demand validation. They are the FIRST agent invoked in
Workflow 1 (new product evaluation), Workflow 4 (pricing), and Workflow 6 (opportunity
discovery).

**What they produce:** Market research reports, competitive analyses, industry briefings,
trend assessments, user demand validation reports. All stored in `docs/research/`.

**Key decision frameworks:**
- Aggregation Theory: who aggregates demand? Who controls supply?
- Value Chain Analysis: find the link with the thickest margins
- Supply-Side Differentiation: solo developers compete on product quality, not user scale
- Primary Sources First: look at the product directly, don't rely on second-hand analysis
- Confidence Labeling: mark all findings as confirmed / likely / speculative
- Three-Source Rule: at least three independent sources before forming judgment

**Interactions:** Feeds intelligence to `ceo-bezos` (strategy), `cfo-campbell` (market
sizing), `marketing-godin` (competitive positioning), and `critic-munger` (evidence for
or against proposals).

---

## 5. CONVERGENCE MODEL -- DETAILED

The convergence model is the mechanism that prevents the classic failure mode of multi-agent
systems: agents talking forever without shipping anything. Without this mechanism, 14 agents
would endlessly brainstorm, debate, and refine ideas, producing nothing but documents. The
convergence model enforces a strict timeline that forces decisions and action.

### 5.1 Cycle 1 -- Brainstorm Phase

**What happens:** This is the only cycle where open-ended brainstorming is permitted. Each
agent that participates in the cycle proposes one idea. The cycle ends by ranking the top 3
ideas based on market opportunity, feasibility, and revenue potential.

**Rules:**
- Each agent proposes exactly ONE idea (prevents idea overload)
- Ideas must be specific enough to evaluate (not "build an AI tool" but "build an AI-powered
  invoice parser for freelancers")
- The cycle must end with a ranked list of top 3 ideas
- Discussion is free-form but must converge to a ranking before the cycle ends

**Why this works:** By forcing a ranking, the team cannot defer the decision. Someone has to
be #1, and that choice carries forward to Cycle 2.

### 5.2 Cycle 2 -- Validation Phase

**What happens:** The team takes the #1 idea from Cycle 1 and subjects it to rigorous
validation. Three specific analyses must be completed:

1. **Pre-Mortem (critic-munger):** Assume the product has already failed. List the 3 most
   likely causes of failure. Check if the current plan addresses these risks.

2. **Market Validation (research-thompson):** Verify that the market exists, people are
   paying for similar solutions, and the market is growing or at least stable. Use real
   data sources, not assumptions.

3. **Financial Analysis (cfo-campbell):** Calculate basic unit economics. Can this product
   reach ramen profitability ($500/month) within 30 days? What's the expected
   infrastructure cost? What pricing model makes sense?

**The cycle must end with a binary verdict: GO or NO-GO.**

- **GO** means the idea has survived scrutiny. The team commits to building it starting
  in Cycle 3. Discussion of WHETHER to build it is now FORBIDDEN.
- **NO-GO** means the idea failed validation. The team moves to idea #2 from the ranked
  list and repeats the validation process.
- If ALL three ideas fail validation, the team FORCE-PICKS the least bad option and
  builds it anyway. Analysis paralysis is worse than building the wrong thing.

**Why this works:** The binary gate prevents endless refinement. You cannot say "let's
research more" after Cycle 2 -- you must decide.

### 5.3 Cycle 3+ -- Execution Phase

**What happens:** If the verdict was GO, the team creates a repository and starts writing
code. Every cycle from this point forward must produce tangible artifacts: code files,
configuration files, deployed services, or tested features. Pure discussion is FORBIDDEN.

**Rules:**
- Every cycle must produce at least one artifact (file, repo, deployment)
- "Let's discuss the architecture more" is NOT allowed -- write the code
- "Let's research alternatives" is NOT allowed -- build with what you chose
- Progress is measured in shipped artifacts, not in plans written
- If stuck, narrow scope and ship something smaller rather than planning something bigger

**Why this works:** By forbidding pure discussion after Cycle 2, the system forces the team
to produce tangible output. Even imperfect output is better than perfect plans.

### 5.4 Stall Detection and Forced Pivots

**The Stall Rule:** If the same "Next Action" appears in `consensus.md` for 2 consecutive
cycles, the system is stalled. Something is preventing progress.

**When a stall is detected, the team must immediately do ONE of the following:**
1. Change direction (try a different approach)
2. Narrow scope (cut features until the remaining scope is achievable in one cycle)
3. Ship immediately (deploy whatever exists, even if incomplete)

**Why this works:** Repeating the same Next Action twice means the team tried and failed to
execute it. Trying a third time would likely fail again. The forced pivot breaks the loop.

### 5.5 Anti-Patterns (Explicitly Forbidden)

These behaviors are explicitly called out as forbidden in `PROMPT.md`:

| Anti-Pattern | Why It's Deadly |
|---|---|
| Endless brainstorming past Cycle 1 | Delays execution indefinitely |
| "Let's research more" after Cycle 2 | Analysis paralysis; research is infinite |
| Producing only documents with no code or deployments | Documents are not products |
| Waiting for perfect information | Perfect information never arrives; act on 70% |
| Asking the human for routine decisions | The company should be 99% autonomous |
| Repeating the same Next Action without progress | Indicates the team is stuck |

### 5.6 The Full Convergence Timeline

```
 Cycle 1         Cycle 2         Cycle 3         Cycle 4         Cycle 5+
 +-------+       +-------+       +-------+       +-------+       +-------+
 |BRAIN- |       |VALI-  |       |BUILD  |       |BUILD  |       |BUILD  |
 |STORM  | ----> |DATE   | ----> |       | ----> |       | ----> |LAUNCH |
 |       |       |       |       |Repo   |       |Code   |       |Deploy |
 |Top 3  |       |GO/    |       |created|       |tests  |       |market |
 |ideas  |       |NO-GO  |       |MVP    |       |iterate|       |sell   |
 +-------+       +-------+       +-------+       +-------+       +-------+
                    |
                    | NO-GO
                    v
                 +-------+
                 |Try #2 |
                 |VALI-  |
                 |DATE   |
                 +-------+
                    |
                    | NO-GO
                    v
                 +-------+
                 |Try #3 |
                 | or    |
                 |FORCE  |
                 |PICK   |
                 +-------+
```

---

## 6. SETUP INSTRUCTIONS

Follow these steps in order. Do not skip any step. Each step includes a verification
command that confirms the step completed successfully.

### 6.1 Verify All Prerequisites

Run the comprehensive check script from Section 2.11. Fix any failures before continuing.

### 6.2 Clone the Repository

```bash
cd ~/Projects
git clone https://github.com/NikitaDmitrieff/auto-co.git
cd auto-co
```

**Verify:**
```bash
ls -la
```
Expected output should show at least these items:
```
auto-loop.sh
CLAUDE.md
install-daemon.sh
Makefile
monitor.sh
PROMPT.md
stop-loop.sh
watcher.js
.claude/
dashboard/
docs/
logs/
memories/
projects/
```

### 6.3 Verify Repository Structure

Confirm all 14 agent definitions are present:
```bash
ls .claude/agents/
```
Expected output:
```
ceo-bezos.md
cfo-campbell.md
critic-munger.md
cto-vogels.md
devops-hightower.md
fullstack-dhh.md
interaction-cooper.md
marketing-godin.md
operations-pg.md
product-norman.md
qa-bach.md
research-thompson.md
sales-ross.md
ui-duarte.md
```
That's 14 files, one per agent.

Confirm the team skill exists:
```bash
ls .claude/skills/team/
```
Expected output: `SKILL.md`

Confirm memory files are initialized:
```bash
ls memories/
```
Expected output should include:
```
consensus.md
human-request.md
human-response.md
```

Confirm the initial consensus is in Day 0 state:
```bash
head -5 memories/consensus.md
```
Expected output:
```
# Auto Company Consensus

## Last Updated
2026-03-05T00:00:00Z
```

Confirm all 14 docs directories exist:
```bash
ls docs/
```
Expected output: 14 directories (ceo, cfo, critic, cto, devops, fullstack, interaction,
marketing, operations, product, qa, research, sales, ui).

### 6.4 Make Shell Scripts Executable

```bash
chmod +x auto-loop.sh stop-loop.sh monitor.sh install-daemon.sh
```

**Verify:**
```bash
ls -la *.sh
```
All four `.sh` files should show `-rwxr-xr-x` permissions (the `x` bits are set).

### 6.5 Configure Environment (Telegram)

The system uses environment variables for Telegram integration. You have two options:

**Option A: Export directly (for testing)**
```bash
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
export TELEGRAM_CHAT_ID="your-chat-id-here"
```

**Option B: Create a .env file (recommended for persistence)**
```bash
cat > .env << 'EOF'
# Auto-Co Environment Configuration
#
# Telegram Escalation Bot
# Get a token from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your-bot-token-here
# Get your chat ID from @userinfobot on Telegram
TELEGRAM_CHAT_ID=your-chat-id-here
#
# Optional: Override daemon defaults
# MODEL=sonnet
# LOOP_INTERVAL=120
# CYCLE_TIMEOUT_SECONDS=1800
# MAX_CONSECUTIVE_ERRORS=3
# COOLDOWN_SECONDS=300
# LIMIT_WAIT_SECONDS=3600
# MAX_LOGS=200
EOF
```

Then source it before running the watcher:
```bash
export $(grep -v "^#" .env | xargs)
```

**Configuration reference:**

| Variable | Default | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | (required) | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | (required) | Your Telegram user/group ID |
| `MODEL` | `sonnet` | Claude model to use (sonnet, opus, haiku) |
| `LOOP_INTERVAL` | `120` | Seconds between cycles |
| `CYCLE_TIMEOUT_SECONDS` | `1800` | Max seconds per cycle before force-kill (30 min) |
| `MAX_CONSECUTIVE_ERRORS` | `3` | Consecutive failures before circuit breaker trips |
| `COOLDOWN_SECONDS` | `300` | Seconds to wait after circuit breaker trips (5 min) |
| `LIMIT_WAIT_SECONDS` | `3600` | Seconds to wait when usage limit detected (1 hour) |
| `MAX_LOGS` | `200` | Maximum cycle log files to keep |
| `WATCHER_POLL_INTERVAL` | `5000` | Telegram poll interval in ms |
| `WATCHER_WATCH_INTERVAL` | `3000` | File watch interval in ms |

### 6.6 Verify Claude CLI Authentication

```bash
claude --version
```
Expected: a version number.

```bash
claude -p "Say hello" --output-format text --max-turns 1
```
Expected: a greeting response. If you see an authentication error, run:
```bash
claude auth login
```

**Verify Claude can use Agent Teams:**
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
claude -p "What experimental features are available?" --output-format text --max-turns 1
```
Expected: some response. The auto-loop.sh script sets this env var automatically, but
verifying it works prevents surprises later.

### 6.7 Set Up the Dashboard

```bash
cd ~/Projects/auto-co/dashboard
npm install
```

**Verify installation succeeded:**
```bash
ls node_modules/.package-lock.json
```
Expected: the file exists (no error).

Start the development server:
```bash
npm run dev
```

**Verify:**
Open `http://localhost:3000` in a browser. You should see the Auto-Co Mission Control
dashboard with a neo-brutalist dark theme (black background, JetBrains Mono font, green
and pink accent colors, no border radius on any element). The phase should show "DAY 0"
and the consensus view should display "STANDBY" or the initial consensus content.

Press Ctrl+C to stop the dev server (you'll start it again later for monitoring).

Return to the project root:
```bash
cd ~/Projects/auto-co
```

### 6.8 Run the First Cycle Manually

Before starting the daemon, run a single cycle manually to verify everything works. This
lets you watch the output in real-time and catch any issues.

```bash
# Ensure the experimental feature is enabled
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Run one cycle directly
cd ~/Projects/auto-co
claude -p "$(cat PROMPT.md)

---

## Current Consensus (pre-loaded, do NOT re-read this file)

$(cat memories/consensus.md)

---

This is Cycle #1. Act decisively." \
  --model sonnet \
  --dangerously-skip-permissions \
  --output-format json
```

**What to expect:** Claude will read the prompt, recognize this is Cycle 1 (Day 0), and
initiate a strategy meeting. The CEO agent will call a meeting, the Research agent will
investigate market opportunities, and the team will brainstorm ideas. The output will be
a JSON object with a `result` field containing the cycle's work.

**Verify the cycle updated consensus:**
```bash
cat memories/consensus.md
```
The file should have been updated with:
- A new timestamp in `## Last Updated`
- Content in `## What We Did This Cycle` describing the brainstorming session
- A ranked list of ideas or a specific next action
- The `## Current Phase` should be `Exploring` or similar

If consensus.md was NOT updated, something went wrong. Check the JSON output for error
messages. Common issues: Claude CLI not authenticated, wrong model name, missing
permissions.

### 6.9 Start the Daemon

Once the manual cycle succeeds, you're ready to start the continuous loop.

**Option A: Foreground mode (recommended for first-time observation)**
```bash
make start
```
This runs `auto-loop.sh` in the foreground. You'll see cycle-by-cycle output in your
terminal. Press Ctrl+C to stop.

To prevent macOS from sleeping while the loop runs:
```bash
make start-awake
```
This wraps the loop with `caffeinate`, keeping your Mac awake.

**Option B: Daemon mode (for 24/7 operation)**
```bash
make install
```
This runs `install-daemon.sh`, which:
1. Detects the Claude CLI path
2. Detects the Node.js path
3. Generates a launchd plist at `~/Library/LaunchAgents/com.auto-co.loop.plist`
4. Loads the plist with `launchctl load`
5. The daemon starts immediately and will auto-restart on crash

**Verify the daemon is running:**
```bash
make status
```
Expected output includes:
```
=== Auto-Co Status ===
Loop: RUNNING (PID XXXX)
Daemon: LOADED (com.auto-co.loop)
```

### 6.10 Start the Telegram Watcher

In a separate terminal:
```bash
cd ~/Projects/auto-co

# Load environment variables
export $(grep -v "^#" .env | xargs)

# Start the watcher
make watcher
```

**Verify:**
You should see output like:
```
[2026-03-05T12:00:00.000Z] Auto-Co Telegram Watcher started.
  Request file:  /Users/you/Projects/auto-co/memories/human-request.md
  Response file: /Users/you/Projects/auto-co/memories/human-response.md
  Chat ID:       123456789
  Watch interval: 3000ms
```

The watcher runs continuously, watching `memories/human-request.md` for new escalation
requests. When an agent writes a request, the watcher sends it to your Telegram. When
you reply in Telegram, the watcher writes your response to `memories/human-response.md`.

### 6.11 Start the Dashboard

In a third terminal:
```bash
cd ~/Projects/auto-co/dashboard
npm run dev
```

Open `http://localhost:3000` in your browser. The dashboard auto-refreshes every 5 seconds,
reading data directly from the filesystem (consensus.md, logs/, docs/, .claude/agents/).

### 6.12 Summary: What Should Be Running

After setup, you should have three processes running:

| Process | Terminal | Command | Purpose |
|---|---|---|---|
| Auto-loop daemon | Background (launchd) or Terminal 1 | `make install` or `make start` | Runs AI cycles |
| Telegram watcher | Terminal 2 | `make watcher` | Human escalation relay |
| Dashboard | Terminal 3 | `cd dashboard && npm run dev` | Real-time monitoring |

---

## 7. OPERATIONS GUIDE

### 7.1 Monitoring

**Check current status (loop state, daemon status, latest consensus):**
```bash
make status
```
This runs `./monitor.sh --status` and shows:
- Whether the loop is running and its PID
- Whether the launchd daemon is loaded or paused
- The current state file contents (LOOP_COUNT, ERROR_COUNT, etc.)
- The first 30 lines of consensus.md
- The last 20 lines of the main log

**Watch live logs in real-time:**
```bash
make monitor
```
This tails `logs/auto-loop.log`. Press Ctrl+C to stop watching. You'll see entries like:
```
[2026-03-05 12:00:00] Cycle #5 [START] Beginning work cycle
[2026-03-05 12:05:30] Cycle #5 [OK] Completed (cost: $0.00, subtype: success)
[2026-03-05 12:05:30] Cycle #5 [WAIT] Sleeping 120s before next cycle...
```

**View the last cycle's full output:**
```bash
make last
```
This shows the complete JSON output of the most recent cycle, including the `result` text,
cost, and metadata. If `jq` is installed, it pretty-prints the result field.

**View cycle history summary:**
```bash
make cycles
```
This greps the main log for status markers and shows the last 50 cycles with their outcomes:
```
[2026-03-05 10:00:00] Cycle #1 [OK] Completed (cost: $0.00, subtype: success)
[2026-03-05 10:05:00] Cycle #2 [OK] Completed (cost: $0.00, subtype: success)
[2026-03-05 10:10:00] Cycle #3 [FAIL] Exit code 1 (cost: $0.00, errors: 1/3)
[2026-03-05 10:15:00] Cycle #4 [OK] Completed (cost: $0.00, subtype: success)
```

### 7.2 Pause and Resume

**Pause the daemon (stops auto-restart):**
```bash
make pause
```
This:
1. Creates a `.auto-loop-paused` flag file
2. Sends a stop signal to the running loop
3. Unloads the launchd daemon so it won't auto-restart

**Resume the daemon:**
```bash
make resume
```
This:
1. Removes the `.auto-loop-paused` flag
2. Reloads the launchd daemon
3. The loop starts a new cycle within 30 seconds

**Stop the loop without affecting the daemon:**
```bash
make stop
```
This sends a graceful stop signal. If the daemon is installed, it will auto-restart the loop
within 30 seconds (the launchd ThrottleInterval). Use `make pause` if you want it to stay
stopped.

### 7.3 Steering the Company

The primary way to influence the company's direction is by editing the "Next Action" field
in `memories/consensus.md`. Here's how:

1. **Pause the daemon:**
   ```bash
   make pause
   ```

2. **Edit the consensus file:**
   Open `memories/consensus.md` in your editor and change the `## Next Action` section.
   For example:
   ```markdown
   ## Next Action
   Build a Chrome extension that summarizes Hacker News threads. Use Next.js for the
   popup, Supabase for user accounts, and deploy to the Chrome Web Store.
   ```

3. **Resume the daemon:**
   ```bash
   make resume
   ```

The next cycle will read your edited Next Action and execute it.

### 7.4 Interactive Sessions

To talk directly to the AI team (outside the daemon loop):

1. **Pause the daemon:**
   ```bash
   make pause
   ```

2. **Start an interactive Claude session:**
   ```bash
   make team
   ```
   This launches Claude Code in interactive mode in the project directory. You can chat
   with the AI, invoke agents, and use skills. The AI has access to all the same context
   (CLAUDE.md, agents, skills, consensus) as the daemon.

3. **When done, resume the daemon:**
   ```bash
   make resume
   ```

### 7.5 Audit and Inspection

**Check agent outputs:**
Each agent stores its work in `docs/<role>/`. Browse these directories to see what each
agent has produced:
```bash
ls docs/ceo/
ls docs/research/
ls docs/fullstack/
# etc.
```

**Check projects:**
New projects created by the agents live in `projects/`:
```bash
ls projects/
```

**Check cycle logs:**
Individual cycle logs are stored in `logs/cycle-NNNN-YYYYMMDD-HHMMSS.log`:
```bash
ls -la logs/
```

### 7.6 Configuration Changes

**Modify agent personas:**
Edit the markdown files in `.claude/agents/`. Changes take effect on the next cycle.
```bash
nano .claude/agents/ceo-bezos.md
```

**Add new skills:**
Create a new directory in `.claude/skills/` with a `SKILL.md` file:
```bash
mkdir -p .claude/skills/my-new-skill
cat > .claude/skills/my-new-skill/SKILL.md << 'EOF'
---
name: my-new-skill
description: "Description of what this skill does"
---
# My New Skill
[skill instructions here]
EOF
```

**Change the model:**
Set the `MODEL` environment variable before starting the loop:
```bash
MODEL=opus make start
```
Or edit the default in `auto-loop.sh` (line: `MODEL="${MODEL:-sonnet}"`).

**Adjust cycle speed:**
```bash
LOOP_INTERVAL=60 make start    # 60 seconds between cycles (faster)
LOOP_INTERVAL=300 make start   # 5 minutes between cycles (slower)
```

**Adjust cycle timeout:**
```bash
CYCLE_TIMEOUT_SECONDS=3600 make start  # Allow 1 hour per cycle
```

### 7.7 Log Management

**Clean old cycle logs:**
```bash
make clean-logs
```

**Reset consensus to Day 0 (CAUTION -- erases all company progress):**
```bash
make reset-consensus
```
This runs `git checkout -- memories/consensus.md` to restore the initial state.

### 7.8 Makefile Quick Reference

| Command | Description |
|---|---|
| `make help` | Show all available commands |
| `make start` | Start auto-loop in foreground |
| `make start-awake` | Start loop and prevent macOS sleep |
| `make awake` | Keep Mac awake while current loop PID runs |
| `make stop` | Stop the loop gracefully |
| `make status` | Show loop status + latest consensus |
| `make last` | Show last cycle's full output |
| `make cycles` | Show cycle history summary |
| `make monitor` | Tail live logs (Ctrl+C to exit) |
| `make install` | Install launchd daemon (auto-start + crash recovery) |
| `make uninstall` | Remove launchd daemon |
| `make pause` | Pause daemon (no auto-restart) |
| `make resume` | Resume paused daemon |
| `make team` | Start interactive Claude session |
| `make watcher` | Start Telegram escalation watcher |
| `make clean-logs` | Remove all cycle logs |
| `make reset-consensus` | Reset consensus to initial Day 0 state |

---

## 8. SAFETY GUARDRAILS

The company operates autonomously, but within strict safety boundaries defined in
`CLAUDE.md`. These rules are absolute and can never be overridden by any agent.

### 8.1 Absolute Prohibitions (Red Lines)

| Forbidden Action | Specific Commands | Why |
|---|---|---|
| Delete GitHub repos | `gh repo delete` and any repo-deletion operations | Repos contain irreplaceable code and history |
| Delete Vercel projects | `vercel remove` -- never delete projects/deployments | Could take down production services |
| Delete Railway services | `railway delete` -- never delete services/projects | Could destroy backend infrastructure |
| Reset Supabase databases | `supabase db reset` in production | Would wipe all user data |
| Delete system files | `rm -rf /`, or touching `~/.ssh/`, `~/.config/`, `~/.claude/` | Would break the host system |
| Illegal activity | Fraud, copyright infringement, data theft, unauthorized access | Self-explanatory |
| Leak credentials | API keys, tokens, passwords in public repos or logs | Security breach |
| Force push main | `git push --force` to main or master | Could destroy commit history |
| Destructive git ops | `git reset --hard` except on temporary branches | Could lose work |

### 8.2 Allowed Actions

Everything not explicitly forbidden is permitted. Specifically:

- Creating new GitHub repositories
- Deploying to Vercel, Railway, and Supabase
- Creating branches and committing code
- Installing npm packages and dependencies
- Creating and modifying files in `projects/` and `docs/`
- Running any terminal command that doesn't violate the red lines
- Installing new CLI tools via npm, brew, pip, etc.

### 8.3 Workspace Constraints

- All new projects must be created inside the `projects/` directory
- Agent output documents go in `docs/<role>/`
- Memory files go in `memories/`
- The agents must never modify `CLAUDE.md`, `PROMPT.md`, or `auto-loop.sh`

### 8.4 Decision Authority

| Dimension | Rule |
|---|---|
| Day-to-day decisions | Agents decide autonomously |
| Disagreements between agents | CEO (ceo-bezos) has final say |
| Major strategic decisions | Must pass through critic-munger |
| Spending real money | Must escalate to human via Telegram |
| Legal questions | Must escalate to human via Telegram |
| Account credentials | Must escalate to human via Telegram |
| External partnerships | Must escalate to human via Telegram |

### 8.5 When to Escalate to Human

The agents should escalate (write to `memories/human-request.md`) ONLY for:
- Decisions that require spending real money
- Legal questions or concerns
- Account credential access (API keys for new services)
- External partnership decisions
- Any action the agent is uncertain about regarding the safety red lines

The company should run autonomously 99% of the time. If no human response arrives within
2 cycles, the agents make the best autonomous decision and note it in consensus.

---

## 9. THE DASHBOARD

The dashboard is a Next.js 14 application with a neo-brutalist design aesthetic. It runs
locally and reads data directly from the auto-co filesystem (consensus.md, logs/, docs/,
.claude/agents/). It auto-refreshes every 5 seconds.

### 9.1 Design Language

The dashboard uses a distinctive neo-brutalist visual style:

- **Font:** JetBrains Mono (monospace) for everything
- **Background:** #0a0a0a (near-black)
- **Foreground:** #e0e0e0 (light gray)
- **Surface:** #1a1a1a (dark card backgrounds)
- **Border radius:** 0px on EVERYTHING (enforced with `!important`)
- **Borders:** 3px solid white (thick, brutalist)
- **Accent colors:**
  - Green (#00FF41) -- active, success, system online
  - Pink (#FF0080) -- attention, agents, interactive
  - Blue (#00D4FF) -- information, links, exploration
  - Yellow (#FFE000) -- warnings, Day 0 phase
  - Red (#FF3333) -- errors, escalations, failures
- **Effects:** Blinking status dots, scanline overlays, glitch text animations,
  terminal-style cursor (`_` blinking), grid background pattern
- **Scrollbar:** Custom green thumb on black track with white border

### 9.2 Navigation

The top navigation bar shows:

```
[AUTO CO v0.1] [ > COMMAND ] [ > AGENTS ] [ > CYCLES ] [ > ARTIFACTS ] [ > METRICS ] ... [SYS * ONLINE]
```

The active page is highlighted with a green background. A blinking green dot and "ONLINE"
indicator sit at the right end.

### 9.3 Command Center (`/`)

The main page. Shows:

- **PhaseIndicator:** Large ASCII art banner showing the current company phase (DAY 0,
  EXPLORING, VALIDATING, BUILDING, LAUNCHING, GROWING, PIVOTING) with the cycle number
  displayed as a large counter. Each phase has a distinct color.
- **ConsensusView:** Renders the current consensus.md content, parsing out the "What We
  Did" and "Next Action" sections for prominent display. Shows active agents as colored
  tags.
- **EscalationBanner:** If there's a pending human escalation request, a red blinking
  banner appears at the top with "!! HUMAN ESCALATION REQUIRED !!" and the request text.
  Includes a danger stripe at the bottom.

### 9.4 Agent Grid (`/agents`)

Displays all 14 agents in a grid layout. Each agent card shows:

- **Role name** in the agent's color (top of card)
- **Expert name** (e.g., "Jeff Bezos") below the role
- **Layer badge** (Strategy, Product, Engineering, Business, Intelligence) with layer color
- **Persona badge** (green "PERSONA" tag if agent file exists)
- **Status indicator:** blinking green dot for ACTIVE, gray dot for IDLE, dark dot for
  STANDBY (never activated)
- **Output count:** number of files the agent has produced in its docs/ directory
- **Last cycle:** the last cycle number where this agent was activated
- **Description preview:** first 120 characters of the agent's description

Active agents have a subtle color glow effect and colored border.

### 9.5 Cycle History (`/cycles`)

A vertical timeline of all recorded cycles. Each entry shows:

- **Cycle number** (large, colored by phase) with a success/failure dot
- **Phase badge** (colored)
- **Timestamp**
- **Summary text** (first 200 chars)
- **Agent tags** (pink tags showing which agents participated)
- **Expand/collapse control** ([+] / [-])
- When expanded: full raw output in a scrollable code block, plus artifact references

Successful cycles show green "OK"; failed cycles show red "FAIL".

### 9.6 Artifacts (`/artifacts`)

A file browser showing all artifacts produced by agents. Scans both `docs/` and `projects/`
directories. Each artifact shows:

- File path relative to the project root
- Agent that produced it
- File type (md, ts, tsx, json, yaml, other)
- File size
- Last modified timestamp

Artifacts can be grouped by agent and sorted by modification time.

### 9.7 Metrics (`/metrics`)

Dashboard page showing operational metrics:

- **Total cycles** completed
- **Success rate** (percentage of cycles that completed without errors)
- **Agent activation counts** (bar chart showing how many times each agent has been active)
- **Output velocity** (sparkline showing artifacts produced per cycle)
- **Phase transitions** (timeline of when the company moved between phases)
- **Stall detections** (any instances of repeated Next Actions)

Metric values are displayed using the StatCard component (large monospaced numbers with
colored accents) and the BarChart component (horizontal bars with brutalist styling).

---

## 10. HUMAN ESCALATION PROTOCOL

The human escalation system is the bridge between the autonomous AI company and the human
founder. It uses Telegram as the communication channel and the filesystem as the message
queue.

### 10.1 Full Flow

```
  AGENT                          FILESYSTEM                    WATCHER              TELEGRAM
    |                               |                            |                     |
    | 1. CEO writes request         |                            |                     |
    |----> memories/human-request.md |                           |                     |
    |                               |                            |                     |
    |                               | 2. File change detected    |                     |
    |                               |----> checkForNewRequest()  |                     |
    |                               |                            |                     |
    |                               |                  3. sendMessage()                 |
    |                               |                            |---> Bot sends msg -->|
    |                               |                            |                     |
    |                               |                            |    4. Human reads    |
    |                               |                            |       and replies    |
    |                               |                            |                     |
    |                               |                  5. pollForReply()                |
    |                               |                            |<--- Reply text ------|
    |                               |                            |                     |
    |                               | 6. Write response          |                     |
    |                               |<---- human-response.md ----|                     |
    |                               |                            |                     |
    |                               | 7. Clear request           |                     |
    |                               |<---- human-request.md="" --|                     |
    |                               |                            |                     |
    |                               |                  8. Acknowledge in Telegram       |
    |                               |                            |---> "Got it" ------->|
    |                               |                            |                     |
    | 9. Next cycle reads response  |                            |                     |
    |<---- memories/human-response.md                            |                     |
    |                               |                            |                     |
    | 10. Agent clears response     |                            |                     |
    |      and acts on answer       |                            |                     |
```

### 10.2 Request Format

When an agent needs human input, they write to `memories/human-request.md` using this
format:

```markdown
## Human Escalation Request
- **Date:** [timestamp]
- **From:** [agent role, e.g., "CEO (ceo-bezos)"]
- **Context:** [brief situation summary]
- **Question:** [specific, answerable question]
- **Default Action:** [what we'll do if no response in 2 cycles]
```

### 10.3 Response Format

The watcher writes to `memories/human-response.md` in this format:

```markdown
## Human Response
- **Date:** [ISO timestamp]
- **Reply:** [the human's reply text from Telegram]
```

### 10.4 Timeout Behavior

If no human response arrives within 2 cycles:
1. The agents take the "Default Action" specified in the request
2. The decision is noted in consensus.md
3. The request file is cleared
4. The company continues operating

### 10.5 Watcher Technical Details

The watcher (`watcher.js`) is an ES module using Node.js built-in `fetch` (requires
Node 18+) and `fs.watchFile()`. It has zero npm dependencies.

- **File watching:** Uses `fs.watchFile()` with a 3-second interval (configurable via
  `WATCHER_WATCH_INTERVAL` env var). Also runs a backup interval check at 2x the watch
  interval in case `watchFile` misses a change.
- **Telegram polling:** Uses Telegram Bot API's `getUpdates` with a 30-second long-poll
  timeout. After sending a request, it enters a polling loop until a reply arrives.
- **Duplicate prevention:** Tracks `lastRequestContent` to avoid sending the same request
  twice. Tracks `lastUpdateId` to avoid processing the same Telegram message twice.
- **Signal handling:** Graceful shutdown on SIGINT (Ctrl+C) and SIGTERM.

---

## 11. TROUBLESHOOTING

### 11.1 "Claude CLI not authenticated"

**Symptom:** The auto-loop fails immediately with an authentication error.

**Fix:**
```bash
claude auth login
```
Follow the prompts to authenticate. Then restart the loop:
```bash
make resume
# or
make start
```

### 11.2 "Error: 'claude' CLI not found in PATH"

**Symptom:** auto-loop.sh or install-daemon.sh exits with this error.

**Fix:** Install Claude Code CLI:
```bash
npm install -g @anthropic-ai/claude-code
```

If already installed but not found by the daemon, the PATH in the launchd plist may not
include the directory where `claude` lives. Reinstall the daemon:
```bash
make uninstall
make install
```
The install script dynamically detects the Claude CLI path and includes it in the plist.

### 11.3 "Rate limit / usage limit" detected

**Symptom:** The log shows `[LIMIT] API usage limit detected. Waiting 3600s...`

**Explanation:** Your Claude subscription has a usage cap. The loop automatically waits
for 1 hour (configurable via `LIMIT_WAIT_SECONDS`) and then resumes.

**What to do:** Nothing -- the system handles this automatically. If you want to adjust
the wait time:
```bash
LIMIT_WAIT_SECONDS=1800 make start  # Wait 30 minutes instead
```

### 11.4 "Circuit breaker tripped"

**Symptom:** The log shows `[BREAKER] Circuit breaker tripped! Cooling down 300s...`

**Explanation:** The loop encountered `MAX_CONSECUTIVE_ERRORS` (default: 3) consecutive
failed cycles. This usually means something is fundamentally wrong -- the prompt is
malformed, Claude is having issues, or the environment is broken.

**Fix:**
1. Check the last few cycle logs:
   ```bash
   make last
   ```
2. Look for error messages in the output
3. Common causes:
   - Claude CLI authentication expired -> `claude auth login`
   - Consensus file got corrupted -> `make reset-consensus`
   - Prompt file missing -> verify `PROMPT.md` exists
4. Once fixed, the system will automatically resume after the cooldown period

### 11.5 "Consensus validation failed"

**Symptom:** Cycles complete but log shows `[FAIL] consensus.md validation failed`

**Explanation:** The consensus.md file was either emptied, lost its required headers, or
became malformed during the cycle. The backup is automatically restored.

**Fix:**
1. Check if consensus.md exists and has content:
   ```bash
   cat memories/consensus.md
   ```
2. It must contain these exact headers:
   - `# Auto Company Consensus`
   - `## Next Action`
   - `## Company State`
3. If corrupted, restore from backup:
   ```bash
   cp memories/consensus.md.bak memories/consensus.md
   ```
4. Or reset to Day 0:
   ```bash
   make reset-consensus
   ```

### 11.6 "Telegram watcher not sending"

**Symptom:** `make watcher` starts but escalation requests don't appear in Telegram.

**Fixes:**

1. **Check environment variables:**
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   echo $TELEGRAM_CHAT_ID
   ```
   Both must be set. If empty, source your .env file:
   ```bash
   export $(grep -v "^#" .env | xargs)
   ```

2. **Test the bot manually:**
   ```bash
   curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe" | jq
   ```
   Should return bot info. If it fails, your token is wrong.

3. **Test sending a message:**
   ```bash
   curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
     -d "chat_id=${TELEGRAM_CHAT_ID}" \
     -d "text=Test from Auto-Co"
   ```
   Should send a message to your Telegram. If it fails, check the chat ID.

4. **Make sure you've started a conversation with the bot:**
   Open Telegram, find your bot, and send it any message (e.g., "/start"). Bots cannot
   send messages to users who haven't initiated a conversation.

### 11.7 "Dashboard not loading"

**Symptom:** `http://localhost:3000` shows an error or blank page.

**Fixes:**

1. **Check Node.js version:**
   ```bash
   node --version
   ```
   Must be 18+. If not:
   ```bash
   brew install node
   ```

2. **Reinstall dependencies:**
   ```bash
   cd ~/Projects/auto-co/dashboard
   rm -rf node_modules
   npm install
   npm run dev
   ```

3. **Check the dashboard can read project files:**
   The dashboard reads from `..` (the auto-co root). Make sure you're running `npm run dev`
   from the `dashboard/` directory, and the parent directory contains the expected files.

4. **Port conflict:**
   If port 3000 is in use:
   ```bash
   PORT=3001 npm run dev
   ```
   Then open `http://localhost:3001`.

### 11.8 "Agents not shipping / stuck in discussion"

**Symptom:** Cycles complete successfully but no code or deployments are being produced.
Consensus keeps showing discussion-oriented Next Actions.

**Fixes:**

1. **Check the cycle number:** If it's still Cycle 1-2, brainstorming and validation are
   expected. Wait for Cycle 3+.

2. **Check for stall pattern:** If the same Next Action appears twice:
   ```bash
   make status
   ```
   The convergence rules should force a pivot. If they're not working, manually edit:
   ```bash
   make pause
   # Edit memories/consensus.md and set a specific, actionable Next Action like:
   # "Create a new Next.js project in projects/my-app with: npx create-next-app@latest"
   make resume
   ```

3. **Force execution mode:** Edit consensus to explicitly say the company is past Cycle 2:
   ```markdown
   ## Current Phase
   Building

   ## Next Action
   Create the GitHub repo and scaffold the project. Discussion is FORBIDDEN.
   Start writing code immediately.
   ```

### 11.9 "Loop process died but daemon didn't restart"

**Symptom:** `make status` shows the loop is not running, but the daemon should be loaded.

**Fixes:**

1. **Check if daemon is paused:**
   ```bash
   ls .auto-loop-paused 2>/dev/null && echo "PAUSED" || echo "NOT PAUSED"
   ```
   If paused:
   ```bash
   make resume
   ```

2. **Check launchd status:**
   ```bash
   launchctl list | grep auto-co
   ```
   If not listed, reinstall:
   ```bash
   make install
   ```

3. **Check launchd logs:**
   ```bash
   cat logs/launchd-stdout.log
   cat logs/launchd-stderr.log
   ```

### 11.10 "Cycle runs but produces no output"

**Symptom:** Cycle completes with "OK" but consensus doesn't change and no files are
created.

**Possible causes:**
1. The model might be hitting output limits. Try a more capable model:
   ```bash
   MODEL=opus make start
   ```
2. The cycle timeout might be too short. Try increasing it:
   ```bash
   CYCLE_TIMEOUT_SECONDS=3600 make start
   ```
3. The consensus file might have become read-only:
   ```bash
   chmod 644 memories/consensus.md
   ```

---

## 12. PHASE 2 ROADMAP (FUTURE)

These features are planned for future development but are NOT implemented in the current
version. Do not attempt to use or configure them.

### 12.1 CrewAI Integration

The project was originally forked from a CrewAI-based system (`crewai-autonomous-company`).
A future phase may reintroduce CrewAI as an orchestration layer beneath Claude Code,
allowing more sophisticated agent coordination, tool use, and memory management.

### 12.2 Self-Improvement Loops

Agents could analyze their own cycle performance, identify patterns in failures, and modify
their own prompts/personas to improve over time. This would require a meta-agent that
reviews cycle logs and proposes changes to `.claude/agents/` files.

### 12.3 Analytics and Revenue Tracking

Integration with Stripe for real-time revenue tracking, automated financial reporting, and
revenue-triggered decisions (e.g., when MRR exceeds $500, shift focus from acquisition to
retention).

### 12.4 Stripe Integration

The CFO agent (cfo-campbell) references Stripe as the primary payment processor. Future
work includes:
- Stripe CLI integration for the DevOps agent
- Automated pricing page deployment
- Webhook-driven revenue event processing
- Dunning email automation for failed payments

### 12.5 Linux/systemd Support

The current daemon system requires macOS launchd. A future version will include a systemd
unit file for Linux servers, enabling cloud deployment of the entire system.

### 12.6 Multi-Model Routing

Different agents could use different models based on their needs:
- Research and CFO: opus (complex analysis)
- Full-stack and DevOps: sonnet (fast code generation)
- QA: haiku (quick test verification)

### 12.7 Persistent State Database

Moving from file-based consensus to a Supabase-backed state store, enabling:
- Full audit trail of every consensus update
- Agent performance analytics
- Cross-cycle memory beyond what fits in a markdown file
- Dashboard backed by real-time database queries instead of filesystem reads

---

## 13. CREDITS

Auto-Co is a fork of [nicepkg/auto-company](https://github.com/nicepkg/auto-company),
adapted for the Vercel + Railway + Supabase infrastructure stack and enhanced with a
Telegram-based human escalation system and a neo-brutalist monitoring dashboard.

**Original concept:** nicepkg/auto-company (14-agent autonomous AI company using Claude Code)

**Adapted by:** NikitaDmitrieff + Claude Opus 4.6

**Infrastructure stack:**
- [Claude Code CLI](https://claude.com/claude-code) -- AI engine (OAuth subscription)
- [Vercel](https://vercel.com) -- Frontend deployments
- [Railway](https://railway.app) -- Backend services
- [Supabase](https://supabase.com) -- PostgreSQL, Auth, Storage
- [GitHub](https://github.com) -- Source control, Issues, PRs
- [Telegram Bot API](https://core.telegram.org/bots/api) -- Human escalation

**Agent expert models:**
- Jeff Bezos (CEO), Werner Vogels (CTO), Charlie Munger (Critic)
- Don Norman (Product), Matias Duarte (UI), Alan Cooper (Interaction)
- DHH (Full-Stack), James Bach (QA), Kelsey Hightower (DevOps)
- Seth Godin (Marketing), Paul Graham (Operations), Aaron Ross (Sales)
- Patrick Campbell (CFO), Ben Thompson (Research)

---

## APPENDIX A: COMPLETE FILE MAP

```
auto-co/
  CLAUDE.md                          # Company constitution (mission, safety rules, team)
  PROMPT.md                          # Per-cycle operating instructions + convergence rules
  MASTER-PLAN.md                     # This document
  Makefile                           # Convenience targets (start, stop, monitor, etc.)
  auto-loop.sh                       # Main daemon loop script
  stop-loop.sh                       # Stop/pause/resume script
  monitor.sh                         # Live monitoring script
  install-daemon.sh                  # launchd daemon installer
  watcher.js                         # Telegram escalation watcher (Node.js)
  .env                               # Environment variables (Telegram tokens, etc.)
  .auto-loop.pid                     # PID file (created at runtime)
  .auto-loop-state                   # State file (created at runtime)
  .auto-loop-stop                    # Stop signal file (created on demand)
  .auto-loop-paused                  # Pause flag file (created on demand)

  .claude/
    agents/
      ceo-bezos.md                   # CEO persona (Jeff Bezos)
      cto-vogels.md                  # CTO persona (Werner Vogels)
      critic-munger.md               # Contrarian persona (Charlie Munger)
      product-norman.md              # Product Design persona (Don Norman)
      ui-duarte.md                   # UI Design persona (Matias Duarte)
      interaction-cooper.md          # Interaction Design persona (Alan Cooper)
      fullstack-dhh.md               # Full-Stack Dev persona (DHH)
      qa-bach.md                     # QA persona (James Bach)
      devops-hightower.md            # DevOps persona (Kelsey Hightower)
      marketing-godin.md             # Marketing persona (Seth Godin)
      operations-pg.md               # Operations persona (Paul Graham)
      sales-ross.md                  # Sales persona (Aaron Ross)
      cfo-campbell.md                # CFO persona (Patrick Campbell)
      research-thompson.md           # Research persona (Ben Thompson)
    skills/
      team/
        SKILL.md                     # Team assembly skill definition

  memories/
    consensus.md                     # Cross-cycle relay baton (THE critical file)
    human-request.md                 # Outbound escalation requests
    human-response.md                # Inbound human replies

  docs/
    ceo/                             # CEO outputs
    cfo/                             # CFO outputs
    critic/                          # Critic outputs
    cto/                             # CTO outputs
    devops/                          # DevOps outputs
    fullstack/                       # Full-Stack outputs
    interaction/                     # Interaction Design outputs
    marketing/                       # Marketing outputs
    operations/                      # Operations outputs
    product/                         # Product Design outputs
    qa/                              # QA outputs
    research/                        # Research outputs
    sales/                           # Sales outputs
    ui/                              # UI Design outputs

  projects/                          # Workspace for new projects created by agents

  logs/
    auto-loop.log                    # Main daemon log
    auto-loop.log.old                # Rotated log
    launchd-stdout.log               # Daemon stdout
    launchd-stderr.log               # Daemon stderr
    cycle-NNNN-YYYYMMDD-HHMMSS.log   # Individual cycle outputs

  dashboard/
    package.json                     # Next.js dependencies
    next.config.mjs                  # Next.js configuration
    tsconfig.json                    # TypeScript configuration
    tailwind.config.ts               # Tailwind CSS configuration
    postcss.config.mjs               # PostCSS configuration
    src/
      app/
        layout.tsx                   # Root layout with navigation
      components/
        Navigation.tsx               # Top nav bar
        AgentCard.tsx                # Agent info cards
        ConsensusView.tsx            # Consensus display
        CycleTimeline.tsx            # Cycle history timeline
        EscalationBanner.tsx         # Red escalation alert
        MetricChart.tsx              # Charts (bar, stat, sparkline)
        PhaseIndicator.tsx           # Phase ASCII art display
        InteractionMap.tsx           # Agent interaction visualization
      lib/
        types.ts                     # TypeScript types + AGENT_ROSTER
        agents.ts                    # Agent data loading from filesystem
        consensus.ts                 # Consensus parsing and rendering
        cycles.ts                    # Cycle log parsing and metrics
        artifacts.ts                 # Artifact scanning and browsing
      styles/
        globals.css                  # Neo-brutalist styles + animations
```

---

## APPENDIX B: CONSENSUS.MD TEMPLATE

This is the exact format that consensus.md must follow. The auto-loop validates three
required sections: the title, Next Action, and Company State.

```markdown
# Auto Company Consensus

## Last Updated
[ISO 8601 timestamp, e.g., 2026-03-05T12:00:00Z]

## Current Phase
[Day 0 / Exploring / Validating / Building / Launching / Growing / Pivoting]

## What We Did This Cycle
- [bulleted list of accomplishments]

## Key Decisions Made
- [decision + reasoning]

## Active Projects
- [project name]: [status] -- [next step]

## Metrics
- Revenue: $X
- Users: X
- MRR: $X
- Deployed Services: [list]
- Cost/month: $X

## Next Action
[the single most important thing to do next cycle -- must be specific and actionable]

## Company State
- Product: [description or TBD]
- Tech Stack: [or TBD]
- Revenue: $X
- Users: X

## Human Escalation
- Pending Request: [yes/no]
- Last Response: [summary or N/A]
- Awaiting Response Since: [timestamp or N/A]

## Open Questions
- [questions to think about]
```

---

## APPENDIX C: ESCALATION REQUEST TEMPLATE

```markdown
## Human Escalation Request
- **Date:** [ISO 8601 timestamp]
- **From:** [agent role, e.g., CEO (ceo-bezos)]
- **Context:** [1-3 sentence situation summary]
- **Question:** [specific, answerable question -- not open-ended]
- **Default Action:** [what the team will do if no response arrives in 2 cycles]
```

---

## APPENDIX D: ENVIRONMENT VARIABLE REFERENCE

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes (for watcher) | -- | Telegram bot API token from @BotFather |
| `TELEGRAM_CHAT_ID` | Yes (for watcher) | -- | Numeric Telegram chat ID |
| `MODEL` | No | `sonnet` | Claude model name (sonnet, opus, haiku) |
| `LOOP_INTERVAL` | No | `120` | Seconds between cycles |
| `CYCLE_TIMEOUT_SECONDS` | No | `1800` | Max seconds per cycle (watchdog timer) |
| `MAX_CONSECUTIVE_ERRORS` | No | `3` | Errors before circuit breaker trips |
| `COOLDOWN_SECONDS` | No | `300` | Cooldown after circuit breaker (seconds) |
| `LIMIT_WAIT_SECONDS` | No | `3600` | Wait time when usage limit detected |
| `MAX_LOGS` | No | `200` | Max cycle log files to retain |
| `WATCHER_POLL_INTERVAL` | No | `5000` | Telegram poll interval (milliseconds) |
| `WATCHER_WATCH_INTERVAL` | No | `3000` | File system watch interval (milliseconds) |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | No | `1` (set by auto-loop.sh) | Enable Agent Teams feature |

---

## APPENDIX E: LAUNCHD PLIST REFERENCE

The daemon plist is generated by `install-daemon.sh` and installed at:
```
~/Library/LaunchAgents/com.auto-co.loop.plist
```

Key plist settings:

| Setting | Value | Purpose |
|---|---|---|
| `Label` | `com.auto-co.loop` | Unique service identifier |
| `ProgramArguments` | `/bin/bash`, `auto-loop.sh`, `--daemon` | Command to run |
| `WorkingDirectory` | `[project directory]` | Where to run it |
| `KeepAlive` | PathState: `.auto-loop-paused` = false | Restart unless paused |
| `RunAtLoad` | true | Start when plist is loaded |
| `StandardOutPath` | `logs/launchd-stdout.log` | Daemon stdout log |
| `StandardErrorPath` | `logs/launchd-stderr.log` | Daemon stderr log |
| `ThrottleInterval` | 30 | Minimum seconds between restarts |
| `EnvironmentVariables.PATH` | Claude dir + Node dir + system paths | Tool availability |
| `EnvironmentVariables.HOME` | `$HOME` | Home directory for Claude auth |

**Management commands:**
```bash
# View daemon status
launchctl list | grep auto-co

# Manually load
launchctl load ~/Library/LaunchAgents/com.auto-co.loop.plist

# Manually unload
launchctl unload ~/Library/LaunchAgents/com.auto-co.loop.plist

# Force stop (kills process, daemon will restart)
launchctl kill SIGTERM system/com.auto-co.loop
```

---

**END OF MASTER PLAN**

*This document was generated from the complete auto-co codebase on 2026-03-05. If the
codebase has changed since this date, verify specific file paths and configurations against
the actual files on disk.*
