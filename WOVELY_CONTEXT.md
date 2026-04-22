# WOVELY_CONTEXT.md
**Version:** 99
**Last updated:** Session 58 close
**Next session:** 59

---

## Purpose & context

Adam (adam@terrainnovations.com, primary: adam@wovely.app) is the solo technical founder of **Wovely** (wovely.app), an AI-first crochet pattern management platform. Users save and manage patterns, track rows, validate patterns, and identify stitches via AI-powered features. Adam builds in iterative numbered sessions using Claude.ai for strategy/diagnosis and Claude Code for execution.

Danielle (co-founder, north star user) tests primarily on iPhone Safari. Her account: `danielle2673@me.com`. Trial user `turttlesong@yahoo.com` expires May 3 — active conversion target.

**Core values & constraints:**
- Never push directly to main for code changes — always feature branches, preview verification, then merge
- One complete self-contained Claude Code prompt per task — no split formatting
- Direct communication, no fluff; Claude takes initiative rather than over-asks
- Proactively flag platform limits and upgrade paths before they become blockers
- Cost concerns should not delay recommendations — flag early, cross bridge when needed
- All Dani feedback tagged NEEDS DISCUSSION before any implementation
- No Facebook group posts until import is rock solid across all devices

**Brand:** Mascot is **Bev** — hyper-realistic crochet amigurumi lavender snake, named after Dani's grandmother Beverly. Canonical reference IMG_3968 (no text, navy hexagon frame). The CHARACTER is canonical; the frame is a contextual design element. Character bible locked Session 19.

---

## Current state (end of Session 58)

**Active infrastructure:**
- Stack: React/Vite, Supabase, Vercel Pro, Claude Haiku 4.5 primary on vision endpoints, Gemini 1.5 Flash as fallback
- Anthropic API: Tier 2 (450K input / 90K output TPM, current spend $14.07 / $500 monthly ceiling)
- GitHub repo: `alabare01/yarnhive` (repo name differs from product name)
- Live site: wovely.app
- 16 total active users, 3 paying (Danielle x2, turttlesong trial)

**Recent architectural decisions (Session 58):**
- Claude Haiku 4.5 made PRIMARY on /api/stitch-vision and /api/extract-pattern-vision. Gemini is now the fallback (inversion of previous architecture). Rationale: Gemini Flash was silently failing on vision path for 10+ days; Claude was carrying 100% of successful imports with no observability. Wrong model for precision work.
- Three-dimensional stitch schema adopted based on Dani's domain expertise: stitch_technique ≠ pattern_arrangement ≠ construction_method. Prevents conflation (e.g. "Granny Square" is construction, "Chevron" is arrangement, "Linen Stitch" is technique).
- Reasoning-first prompt schema. Model must output observation_notes and candidate_analysis BEFORE classification. Eliminates post-hoc rationalization.
- Hard IF/THEN rejection rules replace soft guidance.

**Branch status:**
- `test/claude-primary-vision` — all Session 58 code work committed here, NOT merged to main
- Do not merge without Session 59 review. Known overcorrection issue (Rule A) creates false positives on dc and front-post dc.

**Known issues from Session 58 (requires Session 59+):**
1. Rule A overcorrection — prompt biases too heavily toward linen stitch on textured fabrics. Dani confirmed two test images as dc (one as dc with front-post variant), both misclassified as linen stitch in chevron arrangement. Prompt iteration alone has hit diminishing returns without ground-truth data.
2. No front-post / back-post stitch awareness in prompt. Entire stitch category (FPdc, BPdc, Alpine, Suzette, waffle, herringbone) invisible to current classification logic.
3. Pattern import path (/api/extract-pattern-vision) deployed but NOT TESTED on branch. Mandalorian 9-image pattern that started Session 58 still untested against new Claude-primary architecture. **Do this first in Session 59.**

**Open security gaps (unchanged from v98):**
- WEBHOOK_SECRET env var not set in Vercel — financial integrity gap, priority slot 3
- Wildcard CORS headers likely present across serverless functions — needs audit
- RLS policies need full audit; new tables must have RLS applied at creation
- Zero automated test coverage

**Named AI feature suite:** Stitch-O-Vision, BevCheck, with Ask Bev as future third pillar

---

## Session 59 opening priorities

In this order:

1. **Test pattern import on test/claude-primary-vision.** Adam needs to verify the Mandalorian 9-image extraction works on the Claude-primary pipeline. This is the bug that started Session 58 and was never validated. Preview URL: https://wovely-git-test-claude-primary-vision-alabare-8435s-projects.vercel.app
2. **Decision point on Stitch-O-Vision branch.** If pattern import works and Dani has time to review the two overcorrection cases, iterate prompt OR soften Rule A. If not, leave branch unmerged and proceed to Collections.
3. **Collections build** — trial user turttlesong expires May 3. Background processing + multi-pattern episodic import. Highest retention priority.
4. **Eval harness** (after Collections). Build labeled test set of 15-20 stitch images with Dani's ground-truth labels. Measure prompt iterations against ground truth instead of flying blind.

---

## On the horizon

### 🆕 Stitch Library (Proposed Session 58, Dani's idea)

**Summary:** A curated, bounded library of all core crochet stitch techniques, pattern arrangements, and construction methods. Serves as source of truth for Stitch-O-Vision, BevCheck, Ask Bev, and pattern extraction normalization.

**Origin:** Dani observed during Session 58 that "there are only so many stitch types in crochet — why not pull them all together as a resource to compare against?" This reframes Stitch-O-Vision from an open-ended generation problem into a bounded retrieval + matching problem.

**Why this matters strategically:**
- Current Stitch-O-Vision failure mode (overcorrection, confident wrong answers) traces to unbounded generation against training-data priors. A library constrains the answer space to real, curated stitches.
- Makes "also known as," tutorial links, and Bev descriptions into authoritative data instead of per-request model guesses
- Every library entry becomes a permanent `/stitches/[slug]` SEO landing page
- Becomes the backbone of Ask Bev (bounded Q&A against real knowledge)
- Makes BevCheck smarter (pattern validation references real definitions)
- Makes pattern extraction smarter (model normalizes stitch naming against known vocabulary)
- Proprietary curated content asset becomes a real moat — competitors would need to rebuild from scratch

**Scope estimate:**
- ~60-120 core stitch techniques cover 95% of what shows up in Facebook groups
- 8-12 pattern arrangements
- 10-15 construction methods
- Total: ~150 entries for MVP

**Proposed schema (Supabase `stitch_library` table):**
- id (uuid)
- slug (string, e.g. "linen-stitch")
- primary_name ("Linen Stitch")
- also_known_as (text[])
- dimension ("stitch_technique" | "pattern_arrangement" | "construction_method")
- difficulty ("Beginner" | "Intermediate" | "Advanced")
- description (Dani-written, short)
- visual_cues (text[], Dani-authored signatures)
- rejection_cues (text[], what rules it OUT)
- common_uses (text)
- tutorial_url (curated YouTube link)
- reference_image_urls (text[], Cloudinary)
- created_by (defaults Dani)

**Proposed build phases:**
- Phase 1 (Sessions 59-60): Seed top 30 stitches covering 80% of real-world uploads. Admin UI for Dani to author entries. Estimated ~3 hours of Dani's authoring time.
- Phase 2 (Session 61): Rewrite Stitch-O-Vision as two-step observe-then-match against library.
- Phase 3 (Session 62): Ship. Launch /stitches/[slug] pages.

**Sequencing decision (Session 58):** Waits behind Collections. Trial user expiration May 3 makes Collections highest retention priority. Library waits until after eval harness confirms current accuracy is bad enough to justify the investment (expected, not assumed).

**Capture Dani's energy:** If Dani is lit up about authoring the library this week, reconsider sequencing. Her authoring time is the single most valuable input — if she volunteers to start writing entries Week of April 21, accept and start the admin UI immediately.

---

### Other horizon items (unchanged from v98 unless noted)

- **BevCheck UI polish** — requires Dani's written feedback first
- **Chunked PDF extraction** — queued
- **Collections** — multi-pattern/MKAL/MCAL episodic import with background processing; schema built, Claude Code prompts written; urgent before trial user expires May 3. RLS must be applied at table creation
- **Find Patterns page** — replace gradient card headers with real site logos or site og:images. Targets: AllFreeCrochet, Drops Design, Yarnspirations, Sarah Maker, Hopeful Honey, The Woobles, Ravelry, LoveCrafts
- **Bev's Read** — Gemini-powered visual chart translation with per-row trust meter (🟢/🟡/🔴)
- **Amazon Associates** — affiliate link generation from extracted materials
- **Three-tier pricing** — Free / Pro / Craft (decided); yearly not yet shipped
- **AI logo generation** — Recraft.ai flagged; deferred
- **Home Feed / Carousel** — Bev's Corner, From the Loop, What's Trending (specced, not built)
- **Ask Bev** — future AI tool completing named suite; depends on stitch library
- **VS Code tunnel** — mobile dev access queued
- **Apple Sign-In** — queued as Adam action item
- **🆕 Debug reasoning as Pro feature** — "Bev's reasoning" trace (observation_notes + candidate_analysis) could be gated behind Pro tier. Adds transparency as differentiator. Not urgent.

---

## Key learnings & principles

### New learnings (Session 58)
- **Prompt engineering has a ceiling without ground-truth eval data.** Three prompt iterations in one night swung model output dramatically in both directions. Each "fix" created a new failure mode. You cannot calibrate a classifier against a sample size of 1-2 images. Build the eval harness before the next prompt iteration.
- **Model choice > model behavior tuning.** Gemini Flash was silently broken for 10+ days on vision; switching the primary to Claude Haiku 4.5 solved reliability problem that weeks of Gemini prompt tuning could not. Always validate model reliability as first-order debugging step.
- **Confidence without reasoning is dangerous.** Post-hoc rationalization ("Why Bev thinks this") generated confident justifications for wrong answers in Dani's own voice. Reasoning-first schema (observation_notes → candidate_analysis → classification) is the architectural fix.
- **Three-dimensional schema > flat classification.** stitch_technique, pattern_arrangement, construction_method are independent axes. Conflating them (e.g. calling a chevron blanket "Double Crochet Chevron" when it's linen stitch in chevron arrangement) is the single biggest source of incorrect identification.
- **Domain expertise encoded into prompts > LLM capability.** Dani's 5-step decision tree turned Claude from a confident-wrong model into one that correctly identified linen stitch in chevron. Product accuracy is now gated on domain expertise, not LLM capability. That's a more scalable problem.
- **Overcorrection is the price of aggressive prompt fixes.** Rule A ("default assumption must be linen stitch for colorful chevron") fixed the Dani-chevron case but created false positives on dc and front-post dc. Prompt rules need to be weighted, not absolute.

### Retained learnings (from prior sessions)
- **RLS at creation, never retroactively** — new Supabase tables must have RLS at moment of creation
- **Vercel log truncation is structural** — get_runtime_logs truncates to one line per request; query vercel_logs Supabase table directly for full errors
- **Silent failures are the hardest bugs** — missing await, max_tokens over-reservation, detached async IIFE on mobile
- **Custom supabase.js is NOT the Supabase SDK** — async SDK patterns don't apply
- **iOS Safari distinct failure modes** — momentum scroll false triggers, file attachment race conditions, PWA cache, background tab killing fetches
- **Cloudinary cannot accept local paths or base64 from Claude.ai** — brand assets in /public, Cloudinary uploads route through Claude Code
- **Supabase user_profiles has no email column** — always join through auth.users
- **Vercel env var changes require fresh deployment** — empty git commit fastest trigger
- **Stitch-O-Vision share links = primary viral acquisition loop** for Facebook crochet communities; treat as growth-critical infrastructure

---

## Approach & patterns

- **Session structure:** Open with master doc fetch + audit. Execute prioritized work. Close with master doc update (version increment, change summary, full content replacement).
- **Branching discipline:** Every code change on feature branch → preview URL verification → merge to main. Master doc updates commit direct to main (no code involved).
- **Debugging protocol:** Check vercel_logs Supabase table first (full error strings); curl API endpoints for actual response bodies; curl -s https://raw.githubusercontent.com/alabare01/wovely/[branch]/[path] to inspect deployed source before writing fix prompts
- **Claude Code prompt format:** Single unbroken copyable block. No exceptions.
- **Design authority:** Dani's feedback canonical on UX/design; queued as NEEDS DISCUSSION before code
- **Mobile-first:** Adam often on iPhone; prompts copy-pasteable on mobile
- **Master doc as persistent memory:** Versioned JSON maintained across sessions
- **🆕 Eval before iterate:** For any feature with classification/accuracy stakes, build the labeled test set FIRST. Don't prompt-iterate against a sample of 1.

---

## Tools & resources

**Infrastructure:**
- Supabase project ID: `vbtsdyxvqqwxjzpuseaf`
- Vercel project ID: `prj_SZYwLGH5V7kCZYryr4MSy3US3bfz` | team ID: `team_mRQaDsQzhF6HFGU5Ka7hi5OM`
- Vercel dashboard: https://vercel.com/alabare-8435s-projects/wovely
- GitHub: `alabare01/yarnhive`
- PostHog project ID: `363175` | Personal API key: stored in Vercel env as POSTHOG_PERSONAL_API_KEY and in Adam's 1Password (NOT in this doc — public repo)
- Stripe: $8.99/mo Pro tier (live mode active)
- Email: adam@wovely.app (primary), support@wovely.app (users), Resend as SMTP

**Master doc API:**
- Fetch: curl -s -X POST https://wovely.app/api/master-doc -H "Content-Type: application/json" -d '{"password":"Dani2673!@#"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['content'])"
- Update: POST to https://wovely.app/api/update-master-doc with password, version, change_summary, content (full replacement)
- Reddit short links do not resolve via web fetch — paste content directly

**Supabase patterns:**
- User pro upgrade: UPDATE user_profiles SET is_pro = true WHERE id = (SELECT id FROM auth.users WHERE email = '[email]')
- Logs: SELECT message, level, timestamp FROM vercel_logs WHERE timestamp > '[recent-time]' ORDER BY timestamp ASC
- vercel_logs RLS requires explicit service role policy; direct SQL via execute_sql bypasses RLS

**Vercel patterns:**
- list_deployments with since in epoch ms to confirm branch deployment
- Preview URL: https://wovely-git-[branch-name]-alabare-8435s-projects.vercel.app
- iOS Safari background CSS: position: fixed on body::before and body::after, both width: 100vw; height: 100vh

**PostHog:**
- API: POST to https://us.posthog.com/api/projects/363175/query/ with Authorization: Bearer [POSTHOG_PERSONAL_API_KEY], body {"query": {"kind": "HogQLQuery", "query": "[sql]"}}
- Production filter: properties.$current_url LIKE '%wovely.app%'

**Design system:**
- Colors: white canvas, lavender #9B7EC8 (primary), navy #2D3A7C (structural)
- Typography: Playfair Display (headings), Inter (body)
- Glass card treatment with max-width 960px containers on desktop

---

## Session 58 handoff state

**Untested but deployed on branch test/claude-primary-vision:**
- Pattern import Claude-primary path (api/extract-pattern-vision)

**Tested and working on branch:**
- Dani's chevron blanket → correctly identified as Linen Stitch in Chevron Arrangement
- Debug reasoning trace via ?debug=1
- Confidence pills (high/medium/low) rendering correctly
- Step 0 content gate preserved

**Tested and FAILING on branch:**
- Solid green dc swatch (Jessie At Home) → misidentified as Linen Stitch in Chevron. Dani confirms: double crochet.
- Teal textured swatch → misidentified as Linen Stitch solid. Dani confirms: double crochet with front post variant.

**Adam's psychological state at session close:** Productive night despite not clearing the final accuracy gate. Architecture wins (Claude primary, three-dimensional schema, reasoning-first prompt) are real. Dani's stitch library idea is a category shift, not an iteration — captured above. Session ended on strategic clarity, not code despair.

**First thing in Session 59:** Fetch this doc. Verify v99. Resume with pattern import test on test/claude-primary-vision (the untested Mandalorian case). Then decide on branch merge based on Dani's review of overcorrection.

**⚠️ Action items for Adam (Session 59 open):**
- Rotate PostHog Personal API Key. Previous key (prefix `phx_ExuBKg…`, suffix `…rKYnw`, full value in v98 git history on public repo) — assume compromised. Generate new key at https://us.posthog.com/settings/user-api-keys, store in 1Password, add to Vercel env as POSTHOG_PERSONAL_API_KEY. Remove the old key from PostHog once new key confirmed working.
- Audit WOVELY_CONTEXT.md v98 and earlier for other secrets (master doc password `Dani2673!@#` is also in git history — consider rotating and moving reference to 1Password only).
- Repeat pattern going forward: no live credentials in the master doc. Reference by name + storage location only.
