# Wovely Project Context

This file is the single source of truth for Wovely project context, replacing the former api/master-doc.js endpoint workflow. Both Claude.ai and Claude Code read this file at session start.

Last migrated from master doc API: 2026-04-16

---

# WOVELY MASTER DOC v98

## CURRENT PRODUCTION STATE
Live on wovely.app — Session 57 shipped AND merged to main at 7f5871b. Photo import hotfix marathon + Stitch-O-Vision printed-pattern refusal path, four merges in one session. Gemini 2.5 Flash thinking tokens disabled across all 5 server callsites (merge 39da402) — photo import no longer silently returns empty on dense patterns. Claude Haiku 4.5 vision fallback added to /api/extract-pattern-vision, reusing existing ANTHROPIC_API_KEY, 55s timeout, response now includes a "provider" field ("gemini" or "claude") for fallback-rate observability. Claude fallback upgraded from simplePrompt to fullPrompt and max_tokens bumped 8192 → 32768 (Haiku 3.5-era default → Haiku 4.5 actual budget) — merge 612c3ad — extraction quality now matches Gemini (abbreviations map, gauge, finished_size, multiple components, stitch_count all populated on Claude path). Stitch-O-Vision server prompt gained Scenario C for printed patterns; JSON contract gained not_stitch and content_type fields; client renders Bev-toned refusal screen with "Import as a pattern instead" CTA wired to openImageImport() in both desktop and mobile render sites — merge 7f5871b. Guard-order bug fixed pre-merge (74d38d4) so not_stitch evaluates before the generic !stitch_name fallback. Verified on wovely.app.

## FIRST THING NEXT SESSION
1. BUG: Stitch-O-Vision result screens don't reset scroll to top on stage transition — all four variants affected (identified, not_stitch, not_crochet, couldn't_identify). Fix is `window.scrollTo(0,0)` in a useEffect keyed on stage change, but needs iOS Safari testing.
2. BUG: Collection view lands mid-page on first load for new members since free-patterns section was removed. Same class of bug as above, different component — scroll restoration logic or lack thereof is landing users below the fold.
3. Welcome re-engagement email — still pending execution. Add SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY to .env.local, run `node scripts/send-welcome-emails.mjs --test=alabare@gmail.com`, verify iPhone rendering, then `--send`. (Carry from S56; 15 min.)
4. Client-side Gemini key exposure STILL open — VITE_GEMINI_API_KEY bundled in `/assets/index-BODWmizx.js` (stale StitchBox-era key). Move extractPatternFromPDF + callGeminiVision server-side, then delete the Vercel env var. (Carry from S55+.)
5. Activation cohort check: did S56 anonymous-mode signups come back and add a pattern? Set benchmark for anon conversion quality.

## SESSION 58 PRIORITY ORDER
1. Stitch-O-Vision scroll-to-top fix on stage transitions (all 4 result variants, iOS Safari testing) — flagged S57
2. Collection view scroll-restoration fix — lands mid-page on first load since free-patterns section was removed — flagged S57
3. Welcome email blast — `.env.local` keys + --test + --send (carry from S56, script pre-built scripts/send-welcome-emails.mjs)
4. Activation cohort check — did S56 signups come back and add a pattern?
5. Move client-side Gemini to /api/snap-vision server endpoint (carry from S55 — close confirmed key-leak vector)
6. Delete VITE_GEMINI_API_KEY env var from Vercel after server-side move
7. Designer/title watermark filter on photo import — Claude fallback occasionally treats Instagram-style watermarks as designer name (low priority polish; user can edit post-import)
8. Stitch-O-Vision Claude fallback max_tokens audit — PROMPT is short so probably fine, verify
9. Welcome banner 🐍 → bev_neutral.png swap + Profile page 🧶 emoji + stale YarnHive banner replacement (carry from S56)
10. Landing page 🐍 emoji replacement (carry from S56)
11. Facebook follow-up comment on anonymous-mode shipment (carry from S56)
12. Founders dashboard rebuild — prompt written and ready to run
13. Update Stripe support email to support@wovely.app
14. CORS audit — all serverless functions
15. RLS full table audit
16. git config user.name on Adam's machine — current cristhian1989 attribution on all Vercel deployment metadata is harmless but should be corrected (`git config --global user.name "Adam LaBare"`)
17. Background functions + import queue system (with RLS on import_jobs from day one)
18. Collections build — naturally extends queue system
19. Yearly pricing ($9.99)
20. Pattern Share / Trophy Case

## SECURITY AUDIT (from Reddit AI codebase review — Session 50)
Source: Solo founder built SaaS in 6 months with AI. Code review revealed systemic invisible-layer gaps.
Core lesson: AI is consistently good at visible (UI, features, flows) and consistently weak at invisible (security, testing, architecture, vendor lock-in).

Wovely findings mapped:

[SOLID] Vendor lock-in — Provider router with Gemini + Haiku fallback. We own both keys. Not locked in.
[SOLID] Auth — Supabase handles all auth + crypto. No Math.random() password generation.
[DONE S54] WEBHOOK_SECRET — Set in Vercel, Supabase Database Webhook on auth.users INSERT wired with x-webhook-secret header verification. notify-signup returns 200 end-to-end.
[CONFIRMED S54] Stripe webhook verification — STRIPE_WEBHOOK_SECRET has been set in Vercel since Mar 30. Signature verification has been working all along. Master doc "four-session carry" claim was a Stripe/Supabase conflation error.
[ACTION REQUIRED S57] Client-side Gemini key exposure — VITE_GEMINI_API_KEY bundled in client JS. Old key was in the leak since Mar 20 (confirmed), new key rotated S54 but is still bundled. S55 never ran as a security-focused session (launch day superseded). Move extractPatternFromPDF + callGeminiVision server-side in S57 to close the vector.
[ACTION REQUIRED] CORS — Wildcard Access-Control-Allow-Origin: * likely present on all serverless functions. Audit and restrict to wovely.app origin.
[ACTION REQUIRED] RLS audit — Verify all existing tables have correct policies. New tables (import_jobs, collections) must have RLS from day one — never retroactively.
[ACKNOWLEDGED] Zero automated tests — Defensible at 9 users. Becomes liability at scale. Payment flows and auth paths need coverage before public launch.

## WHAT SHIPPED SESSION 49
- Gemini billing confirmed active — Paid Tier 1, StitchBox project, $28.77 spent Mar 19-Apr 15
- Spend cap set at $50/mo
- Gemini 2.5 Flash restored across all API files (was 1.5 Flash since Session 47)
- Files updated: _providerRouter.js, extract-pattern.js, fetch-pattern.js, stitch-vision.js
- All /v1beta/ paths preserved
- Rollback tag pre-gemini-25 created on main
- Tested: Marina the Manatee (text path, Haiku), Beehive (vision path, Gemini 2.5 Flash), Stitch-O-Vision Waffle Stitch — all passed
- Octopus 87-page timeout is a known client-side issue, server completes but client gives up — separate bug

## WHAT SHIPPED SESSION 52
- DKIM authentication configured end-to-end for wovely.app
- Google Workspace DKIM record generated (2048-bit, selector: google)
- TXT record published via GoDaddy DNS
- Gmail inbox delivery confirmed with DKIM PASS in headers
- Supabase upgraded from Free to Pro tier with spend cap enabled
- Trial retention email sent to turttlesong@yahoo.com ahead of May 3 expiry

## WHAT SHIPPED SESSION 53
- Claude Design system for Wovely created and published (v1.0) with Danielle's direct involvement
- Source of truth wired: github.com/alabare01/wovely repo + style guide + bev_neutral.png
- All design system cards approved: Core palette, Typography, Semantic/Stitch Check, Forbidden colors, Spacing, Components, Bev components, Voice examples, BevCheck gauge
- NEW PASTEL SEMANTIC PALETTE (replaced saturated sage/gold/rust):
  - Pass: dusty teal #A4C2C3
  - Heads-Up: soft buttercup #E2D985
  - Issues: dusty rose #CEA0A4
- BevCheck gauge REDESIGNED AND SHIPPED to production (merge commit 6053b87 on main):
  - Hero variant on StitchCheck full report page and Full Report overlay modals
  - Compact variant on inline mini gauges in AddPatternModal + ImageImportModal
  - Glass instrument treatment (specular hotspot, inner rim, outer rim light) on hero
  - Zone-anchored labels outside arc (PASS left, HEADS UP top, ISSUES right)
  - Hero score below arc in Playfair navy
  - Dynamic "Bev spotted {count} {thing|things}" sentence with correct pluralization
  - Bev integrated into arc interior on hero, clipped to small circle on compact
  - Gold needle on hero (#B8944A), lavender needle on compact for small-scale legibility
  - BEVCHECK pill + "Bev's Read" heading absorbed into hero card chrome
- ARCHITECTURE CLEANUP: 4 hand-rolled inline SVG gauges consolidated into single BevGauge component with variant prop
  - Bundle shrank 465k to 459k
  - Single source of truth for palette, angle math, state derivation
  - Future gauge updates are one-line changes
- Danielle approved every design decision via live mockup review in Claude Design (no guessing, no translation layer)
- Production code fully shipped, not mockup-only

## WHAT SHIPPED SESSION 54
- Email confirmation flow live in production (merge commit 806dddc on main)
  - Supabase "Confirm email" toggle ON
  - Custom Bev-branded confirmation template replaced YarnHive-era template
  - handleSignup in src/Auth.jsx now flips pendingConfirmation state and renders "Check your email" screen with Bev instead of attempting password signin
  - Full flow verified end to end: signup → Resend email with DKIM pass → confirmation link click → lands in app signed in
- Signup notification webhook wired end to end (merge commit 0a2d59b on main)
  - WEBHOOK_SECRET env var set in Vercel
  - Supabase Database Webhook created on auth.users INSERT pointing to /api/notify-signup with x-webhook-secret header (created through dashboard UI — vault-layer header storage, not raw SQL)
  - notify-signup.js cleaned: user count query fixed (users → user_profiles), dead signup_notifications upsert block removed
  - Verified: new signup fires webhook → 200 → "🎉 New Wovely signup: {email}" lands in adam@wovely.app inbox, Gmail Primary tab
  - adam@wovely.app mailbox was only set up today mid-session
- Gemini API key rotated after confirmed client-bundle leak since Mar 20
  - New key generated in AI Studio under Stitch Box project, old key deleted
  - Both GEMINI_API_KEY and VITE_GEMINI_API_KEY on Vercel updated to new key
  - App tested working after rotation
  - CLIENT-SIDE EXPOSURE STILL EXISTS with new key — Session 55 server-side move of extractPatternFromPDF + callGeminiVision needed to actually close the vector
- Stripe customer emails armed — all 5 subscription emails turned on
  - Trial ending reminder, upcoming renewals, expiring cards, failed card payments, failed bank debit payments
  - Smart Retry policy confirmed: 8 retries over 2 weeks with cancel-on-exhaust
  - Support email still points to alabare@gmail.com — Session 55 action to update to support@wovely.app via Public details settings
- Broken notify_new_signup trigger dropped
  - Trigger on auth.users was inserting into signup_notifications, which had RLS enabled with zero policies
  - RLS silent-kill: every new signup INSERT blocked at the DB layer, surfaced as generic "Database error saving new user" with no path to the real cause
  - Trigger, function, and signup_notifications table all dropped
  - Had been broken for unknown length of time — discovered during confirmation email testing
  - handle_new_user trigger (user_profiles auto-create) remains intact
- Security audit revision
  - STRIPE_WEBHOOK_SECRET confirmed set in Vercel since Mar 30. Signature verification has been working. Prior master doc's "four-session carry" claim was a Stripe/Supabase conflation error.

## WHAT SHIPPED SESSION 57 (April 20, 2026 — Photo import hotfix marathon + Stitch-O-Vision refusal path)
Session opened late night with photo import returning HTTP 500 on production. Root-caused, shipped three hotfixes to restore and upgrade photo import, then shipped a product-integrity fix for Stitch-O-Vision misclassifying printed pattern pages as stitches. Four merges to main in one session.
- Gemini 2.5 Flash thinking tokens disabled across 5 server callsites (merge 39da402, component commit 24278de on fix-gemini-thinking-tokens)
  - Files touched: api/extract-pattern-vision.js, api/extract-pattern.js (text extract + bevcheck = 2 callsites), api/stitch-vision.js, api/_providerRouter.js (health probe was also silently broken)
  - Root cause: Gemini 2.5 Flash consumes output token budget on internal reasoning before emitting content. Dense pattern image + full prompt returned empty or truncated responses → threw → retry path also failed → HTTP 500. Verified via direct API call that `thinkingConfig: { thinkingBudget: 0 }` produces clean JSON on the same input that previously returned nothing.
- Claude Haiku 4.5 vision fallback added to /api/extract-pattern-vision (same merge 39da402, component 60a9f03)
  - Model: claude-haiku-4-5-20251001. Reuses existing ANTHROPIC_API_KEY (already set for BevCheck). 55s timeout on the Anthropic call. Response now includes a `provider` field ("gemini" or "claude") so we can observe fallback rate in logs.
  - Stitch-O-Vision endpoint already had a Claude Haiku fallback in place from a prior session — no work needed there, just confirmed.
- Claude fallback upgraded from simplePrompt → fullPrompt (merge 612c3ad, component b3b0215 on branch claude-fullprompt)
  - max_tokens bumped 8192 → 32768 (Haiku 3.5-era default → Haiku 4.5 actual budget)
  - Both fallback paths (PDF URL and images-array) now pass fullPrompt instead of simplePrompt
  - Verified on production: extraction quality matches Gemini's — abbreviations map populated, gauge populated, finished_size populated, multiple components detected, stitch_count populated on several rows.
- Stitch-O-Vision refuses printed-pattern inputs and routes users to Photo Import (merge 7f5871b, branch sov-printed-pattern-refusal, key commits a8740bc and 74d38d4)
  - Server prompt gained Scenario C ("Printed pattern or instructional document"). JSON contract gained `not_stitch` and `content_type` fields.
  - Client renders a refusal screen: Bev image, Playfair heading "That looks like a pattern, not a stitch," body copy, primary lavender CTA "Import as a pattern instead," secondary "Try a different photo."
  - Tapping the primary CTA calls `openImageImport()` (wired from App.jsx in both desktop and mobile render sites).
  - Ordering bug fixed as commit 74d38d4 on the same branch before merge — the `not_stitch` guard must evaluate before the generic `!stitch_name` fallback or the specific branch is unreachable.

Production state at session close:
- wovely.app photo import: working, Gemini primary with Claude Haiku 4.5 fallback, fullPrompt on both paths
- wovely.app Stitch-O-Vision: working, correctly refuses printed-pattern inputs, routes to Photo Import on refusal
- All four session merges verified live via direct curl to /api/extract-pattern-vision and /api/stitch-vision

## WHAT SHIPPED SESSION 56 (April 19-20, 2026 — Launch day + anonymous mode)
- Apple OAuth sign-in button removed (provider not enabled in Supabase, Facebook in-app browser triggered Unsupported provider validation_failed errors)
- Email confirmation disabled entirely in Supabase dashboard
  - "Check your email" screen removed from Auth.jsx signup flow
  - EmailConfirmBanner component + all plumbing (state, polling effect, resend handlers, sessionStorage dismissal key) ripped from App.jsx and ProfileSettingsView
  - Hash-token parser at App.jsx:33 kept intact for future re-enablement
- Starter patterns removed from default app state (DEFAULT_STARTERS now empty array client-side; read as AI filler on first impression, wrong vibe for a crochet community hostile to AI slop)
- Anonymous mode — full try-before-signup pivot shipped in 7 commits (3 prompts + 4 cleanup)
  - New component src/AuthWallModal.jsx with contextual signup gating, confirm-password field, session-hydration retry loop (0/200/400ms), posthog signed_up_from_wall capture
  - Central gateAction helper in App.jsx — hierarchy: !authed → AuthWall, authed && requiresPro && !isPro → Pro paywall, else proceed
  - openProGate wrapper for Pro CTAs (locked nav, StitchVision upgrade, BevCheck preview, profile upgrade pill) — every direct setShowProModal call retired except DeleteConfirmModal (unreachable for anon)
  - 15+ action points gated with intent strings: import_pattern, import_pattern_url, import_pattern_image, add_stash, add_shopping, profile_edit, change_password, bevcheck, stitch_vision, stitch_vision_limit, locked_nav, nav_sign_in, bevcheck_preview
  - "Try it free — no signup required" CTA on landing; sessionStorage wovely_anonymous_mode flag persists across refresh within tab
  - SidebarNav + NavPanel accept isAnonymous + onOpenAuthWall — Sign out becomes "Sign in / Create account", profile sub becomes "Sign in to save", Pro upgrade card shows "Get started free", Pro padlocks hidden for anon
  - Welcome banner copy refreshed: "Welcome to Wovely. 🐍 Bev's got a space ready for your first pattern." (emoji flagged as design-system violation for S57 fix)
  - Empty states polished for /stash, /shopping, /builds
  - PostHog events wired: anonymous_mode_entered, auth_wall_shown (with intent + requires_pro), signed_up_from_wall, pro_paywall_shown
  - Stitch-O-Vision rate-limit scaffolding added (sessionStorage wovely_sov_anon_scan_used flag + onRequireAccount(limitReached) hook) — anon users currently hit AuthWall on first scan attempt because the scan pipeline requires a Supabase session for storage upload; the "allow 1 anon scan then wall" UX requires a backend endpoint change deferred to later session
- BevCheck preview "Upgrade to Pro" button rewired — was `setProUpgradeBanner(true)` dead-end tooltip in both AddPatternModal.jsx and ImageImportModal.jsx, now routes through openProGate. Dead proUpgradeBanner state + inline banner render deleted from both files.
- AuthWallModal onSuccess made async, now prefetches is_pro via user_profiles before invoking proceedCallback — returning Pro users signing in via the wall no longer flash as free
- Supabase signup response shape normalization — supabase.js signUp now handles both nested (`data.session`) and flat (`data.access_token`) shapes. Fixes false-positive "Signup succeeded but session setup failed" error introduced by the session-hydration check when Supabase returns the flat shape.
- gateAction resume delay bumped from 100ms → 300ms to let session + React state + profile prefetch all settle before the resumed action fires
- Database cleanup — 19 test accounts deleted from auth.users (all alabare+* plus 1 typo albare+testanon@gmail.com). Cascaded cleanup: 1 test pattern row, 1 orphan stitch_result. Real-user count: 16 (Dani x2, Adam, 13 legitimate signups spanning pre-launch + Facebook launch day).
- Welcome re-engagement email script built at scripts/send-welcome-emails.mjs (gitignored). Three modes (--dry-run, --test=<email>, --send). Three segments (pre_launch_engaged 4, pre_launch_dormant 2, facebook_today 7) with tailored subject lines. Per-user Supabase magic link via auth.admin.generateLink, Resend delivery, 500ms rate-limit between sends, self-deletes after successful --send. Script not run this session — deferred to S57 morning after Adam adds SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY to .env.local.

Launch day metrics (PostHog, April 19):
- 974 events from 78 unique users — ~7x baseline
- 8 entered anonymous mode, 14 auth_wall_shown, 3 signed_up_from_wall
- 5 pattern uploads from 3 users, 6 pro_paywall_shown, 1 upgrade click
- 7 new Facebook signups in the single day window
- Anonymous mode shipped ~2 hours into launch day, so early bouncers pre-dated the fix

## KEY LEARNINGS SESSION 57
- Gemini 2.5 Flash thinking tokens are now a known gotcha. Any server call to gemini-2.5-flash that matters must include `thinkingConfig: { thinkingBudget: 0 }` in generationConfig, otherwise short maxOutputTokens budgets get consumed by invisible reasoning and responses come back empty. The silent-fail mode is especially insidious — the health probe in _providerRouter.js was also broken for the same reason without anyone noticing.
- Claude Haiku 4.5 supports up to 64K output tokens. Do not leave max_tokens at the 8192 Haiku-3.5-era default — dense pattern extractions need the full budget to return complete JSON.
- Claude Haiku 4.5 vision accepts base64 image blocks (`type: "image"`, `source: { type: "base64", media_type, data }`) for images and document content blocks for PDFs. The same PROMPT that works for Gemini works for Claude with no modification.
- Render-order matters for React refusal branches. If a generic "couldn't identify" fallback checks `!result.stitch_name` and a new refusal branch (like `not_stitch`) sets stitch_name to null, the generic fallback catches first and the new branch is unreachable. Order specific refusal cases before generic ones.
- Branch name + Vercel alias slug together must stay under 63 characters (DNS label limit) or the branch alias URL won't resolve. Use short branch names like "claude-fullprompt" not "upgrade-claude-fallback-prompt-with-full-extraction-prompt."

## KEY LEARNINGS SESSION 56
- Supabase signup endpoint returns session in TWO shapes — nested `{ session: { access_token, ... } }` when email confirmation is ON, flat `{ access_token, refresh_token, ... }` when OFF. The client must normalize both or session never lands in localStorage on signup. This bit us immediately after disabling email confirmation because the signUp handler checked only `data.session`.
- Anonymous-mode gate hierarchy MUST put AuthWall before Pro paywall. The reverse order (Pro paywall shown to anon users clicking BevCheck) reads as "sign up and you still can't have this" and kills conversion motivation. Central gateAction helper enforces invariant: `if (!authed) AuthWall; else if (requiresPro && !isPro) Pro paywall; else proceed`.
- Session hydration after signup is NOT instantaneous — supabaseAuth.getUser() can return null briefly while localStorage write and JWT parse race each other. Retry loop at 0ms / 200ms / 400ms (3 attempts, ~600ms total) covers the long tail without flashing false-positive errors on fast machines.
- When extracting inline handlers in render sites, async is load-bearing. AuthWallModal's onSuccess prop in App.jsx had to become async specifically so the is_pro prefetch could await before the gated action fired — otherwise returning Pro users flash as free for the duration of the profile fetch.
- Dead plumbing dies in layers. Disabling Supabase email confirmation meant EmailConfirmBanner, its state, its polling effect, its resend handlers, its dismiss session key, the "Email confirmed" pill in ProfileSettingsView, and the `onEmailConfirmed` prop chain all became dead code. Grep for every symbol before one commit — removing just the banner render still leaves three zombie useEffects polling /auth/v1/user every 10s.
- "Upgrade to Pro" buttons that do nothing are worse than Pro buttons that lock. The AddPatternModal + ImageImportModal BevCheck preview had `setProUpgradeBanner(true)` that toggled an inline reassuring tooltip instead of opening the paywall. Users read the non-response as "button broken" and bounce. Every lavender Upgrade button must route through openProGate.
- Canonical Bev image URL for external surfaces: https://wovely.app/bev_neutral.png (500x500 PNG, transparent background, public path). Use this URL in emails, Open Graph, partner embeds — never the Cloudinary variant.
- Facebook posts drove real traffic (78 unique, ~7x baseline) but anonymous mode wasn't live when the posts went up — the first ~2 hours of bouncers hit the old signup wall. Launch-day sequencing matters: ship the pivot, THEN post.
- Landing page signup banner emoji 🐍 is a design-system violation (CLAUDE.md explicitly forbids snake emoji where Bev image can be used). Got shipped because user-provided copy contained the emoji and the rule wasn't re-checked at edit time. Fix in S57.

## KEY LEARNINGS SESSION 49
- Gemini 2.5 Flash 503s were free tier problem, not model problem — paid tier held up clean
- Vision path (avgText/page <1200) uses Gemini. Text path (>1200) uses Haiku chunking. These are separate pipelines.
- Client timeout fires before server finishes on large chunked jobs — client needs better waiting UX
- Supabase API calls are unlimited on all plans — upgrading Supabase is about uptime/reliability not rate limits
- Vercel Pro already active — background functions available, just need to be built

## KEY LEARNINGS SESSION 53
- Claude Design handoff to Claude Code is a real workflow unlock — mockup → Danielle feedback → Code, not mockup → Code → Danielle feedback
- Danielle's design instinct in the loop DURING design (not after) collapsed iteration cycles from hours to minutes
- Internal shorthand ("AI-first infrastructure") must not leak into brand positioning inputs — "AI" is banned in all user-facing surfaces AND brand descriptions
- Pastel semantic palette (washed, cool-toned, sidewalk-chalk) feels more Wovely than saturated traffic-light colors
- When scoping component refactors, grep the ACTUAL RENDER PATH (SVG paths, CSS classes, distinctive strings) not just import statements — hand-rolled inline duplicates hide from import-based searches
- When absorbing card chrome into a component, check every callsite for existing chrome that might duplicate — and for surfaces that render the component in a different context (modal vs page)
- "The same component in different contexts is often not the same component" — compact summary vs hero hero-treatment need different visual weights even when they share an underlying component
- Variant prop pattern is cleaner than two separate components when shared palette/math/state logic outweighs divergence
- Claude Design preview canvas colors are not production colors — system-level surface decisions must be made against live site, not preview renders

## KEY LEARNINGS SESSION 54
- Code review before action matters. Four sessions of "WEBHOOK_SECRET pending" referred to two different secrets (Stripe vs Supabase). The Stripe one was already set since Mar 30. One grep against env vars before the first entry would have caught the conflation and saved three session carries.
- RLS silent-kill rule proven again: signup_notifications had RLS enabled with zero policies, which blocks every INSERT at the database layer and surfaces only as generic "Database error saving new user" with no path to the real cause. The master doc's existing rule ("RLS must be applied to ALL new tables at creation time — never retroactively") predicted this exact failure mode.
- Supabase Database Webhook creation must go through the dashboard UI, not SQL — the x-webhook-secret header storage runs through a vault layer the dashboard handles cleanly. Do not try to create webhooks via pg_cron or raw SQL.
- Supabase signup response behavior: even when "Confirm Email" is OFF, anon-key POST to /auth/v1/signup returns no session for new signups. The prior client code assumed session always returned and failed silently. Never assume session presence on signup response — always branch on !data.session.
- Resend emails are hitting Gmail Primary tab on first attempt. Session 52 DKIM work is paying dividends on deliverability.
- Rotating an exposed API key does not close the exposure — it only resets the blast radius. If the key is still bundled client-side, the new key is leaking too. Rotation + code move are two separate actions and must both ship to actually close the vector.

## BACKGROUND FUNCTIONS + QUEUE SYSTEM SPEC (build Session 50+)
Problem: Large PDFs (87+ pages, text path) take 150s+ of Haiku chunking. Client times out. User sees failure even when server succeeds.
Solution: Async import queue with background processing and real-time UI feedback.

Architecture:
- Supabase table: import_jobs (id, user_id, status, pdf_url, result, created_at, updated_at)
- RLS REQUIRED FROM DAY ONE: user can only read/write their own rows (auth.uid() = user_id)
- Client submits job -> gets job_id back immediately
- Vercel background function processes job async, updates import_jobs row on completion
- Client polls import_jobs every 3s for status updates
- UI shows Bev loading state with progress messaging while job runs
- On completion, flows into normal pattern review UI

UI vision:
- Queue dashboard showing active/pending/completed imports
- Bev animated waiting state with fun copy (not just a spinner)
- Progress indicator showing which chunk is being processed
- Naturally extends into Collections — queue multiple patterns, process as a batch

This is the foundation Collections needs anyway. Build queue first, Collections becomes a UI wrapper on top.

## OPEN BUGS (priority order)
1. Client timeout fires on large PDFs before server finishes — needs better waiting UX + queue system
2. BevCheck UI — gauge typography, zone labels, full report unfinished. Needs Danielle feedback first
3. Modal layering bug — desktop import modal stacked background layers
4. Stitch-O-Vision complex geometric prompts
5. StitchResultPage favicon missing
6. Bev Notes nav icon — blue shield needs personality
7. PDF cover intelligence — text-heavy first pages as hero
8. /hive fossil route — YarnHive remnant
9. Pages not scrolling to top on load

## GEMINI STATUS
Gemini 2.5 Flash: ACTIVE. Restored Session 49. Model string: gemini-2.5-flash. API path: /v1beta/
Gemini 1.5 Flash: RETIRED. Was stable fallback, now replaced.
Rollback: git checkout pre-gemini-25 if 2.5 Flash shows instability on production.
KEY ROTATION S54: API key rotated after confirmed client-bundle leak since Mar 20. New key live in GEMINI_API_KEY and VITE_GEMINI_API_KEY on Vercel. Old key deleted in AI Studio (Stitch Box project). Client-side exposure still exists until Session 55 server-side move of extractPatternFromPDF + callGeminiVision into /api/snap-vision.

## ANTHROPIC API STATUS
Tier 1 — 90K OTPM, 1K RPM. $40 credit added Apr 14 2026.
Haiku: claude-haiku-4-5-20251001
max_tokens BevCheck: 2000. max_tokens extract: 32000

## EXTRACT PIPELINE ARCHITECTURE (as of Session 49)
Client detects avgText/page:
- <300 or 300-1200 (mixed) = vision path = POST /api/extract-pattern-vision with pdfUrl — GEMINI 2.5 FLASH
- >1200 = text path = POST /api/extract-pattern with full pdfText, 270s client timeout — HAIKU CHUNKED

Server extract-pattern.js:
- <14k chars = single pass: Gemini fast-path (4s) then Haiku fallback (55s)
- >14k chars = chunked: splitIntoChunks(14k, 500 overlap) then sequential callClaudeChunk then mergeChunkResults
- 250s budget guard stops chunking early
- maxDuration: 300

BevCheck cascade: Gemini 2.5 Flash v1beta (8s) then Haiku 55s (2000 max_tokens) then bev_tangled

## COLLECTIONS SPEC (ready to build Session 50+)
Naturally extends import queue system. Build queue first, Collections is the UI wrapper.
Schema ready to write. 4 Claude Code prompts needed. 2 sessions to ship v1.
v1: collections table + collection_patterns join + UI list + detail page + import wiring.
MCAL import already works as components. Collections is the grouping wrapper.
Monetization: gate behind Craft tier (~$14.99/mo).
RLS REQUIRED FROM DAY ONE on collections and collection_patterns tables.

## DANIELLE FEEDBACK LOG
- [LOVES IT] My Wovely redesign — confirmed iMessage Apr 6
- [SHIPPED S40] Instructions/Rows tab rename
- [SHIPPED S40] Import spinner clears on failed upload
- [SHIPPED S40] Nav guard modal removed
- [SHIPPED S40] Email capture popup removed
- [SHIPPED S40] iPad scroll bounce fix — needs Danielle confirmation
- [NEEDS DISCUSSION] Floating import banner covers side nav while processing
- [NEEDS DISCUSSION] No warning when user refreshes during import
- [NEEDS DISCUSSION] Stash + button should add yarn not upload pattern
- [NEEDS DISCUSSION] Color palette — Danielle finds pure white cold
- [SHIPPED S53] BevCheck gauge redesign — pastel palette, zone-anchored labels, hero score below arc, glass instrument treatment, Bev integrated into arc, dynamic pluralization. Full approval from Danielle via Claude Design mockup review.
- [NEEDS DISCUSSION] Wovely surface color — Danielle flagged the lavender canvas in Claude Design preview. Decision deferred: evaluate on live site on her phone before any style guide change.
- [QUEUED] Compact BevGauge variant could benefit from subtle glass treatment to unify visually with hero. Session 55+ refinement.
- [QUEUED] State label on compact gauge — consider dusty rose color for "issues" state to amplify signal (blocked: #CEA0A4 fails AA contrast against #F8F6FF at 18px bold, ratio 2.13:1). Try darker rose like #B8837A that passes AA.

## SESSION 53 INSIGHT — BEVCHECK METER COLOR LOGIC (SHIPPED)
Surfaced during Claude Design setup. Previous BevCheck gauge rendered lavender regardless of result band — aesthetically pleasant but semantically inert. Redesigned with pastel semantic palette:
- 80%+ PASS → dusty teal #A4C2C3
- 60-79% HEADS-UP → soft buttercup #E2D985
- <60% ISSUES → dusty rose #CEA0A4
Zone-anchored labels (PASS left, HEADS UP top, ISSUES right) outside the arc on hero. Score in large navy below arc. Glass instrument treatment. Bev integrated into arc interior, needle on foreground layer. Dynamic "Bev spotted {count} {thing|things}" copy template.
Status: SHIPPED to production Session 53 (merge commit 6053b87 on main).

## ACTIVE USERS (16 — all 19 test accounts purged S56)
Core:
- danielle2673@me.com — Pro — 17 patterns — Active (north star)
- alabare@gmail.com — Pro — 4 patterns — Active
- danielle2673@gmail.com — Pro — 2 patterns — Drifting

Pre-launch engaged (segment A in S56 welcome blast):
- steffaniembrown@gmail.com — Pro — 5 patterns — Active
- turttlesong@yahoo.com — Pro — 2 patterns — Trial
- ronsrit@hotmail.com — Pro — 3 patterns — At risk
- andersonkerrie70@gmail.com — Free — 0 patterns — New (pre-launch)

Pre-launch dormant (segment B):
- tbrightjax@gmail.com — Pro — 0 patterns — Ghosted
- stinkyswife@gmail.com — Pro — 0 patterns — Ghosted

Facebook launch-day signups April 19 2026 (segment C — 7):
- fionaprevett@icloud.com
- nancycasso@gmail.com
- andersonchrisp@gmail.com
- shelby.feinberg@gmail.com
- mallory@transitionsbehaviorservices.com
- mackay.amanda@gmail.com
- tjwinger75@gmail.com

## USER IDS
Adam: 6e1a02d9-c210-4bc4-968e-dde3435565d1
Danielle me.com: d6b18345-a85e-42bd-b7cb-f20efd4b2fe7
Danielle gmail: 038442a2-b13d-4abb-9960-24a360078f6c

## INFRASTRUCTURE
Live: wovely.app
GitHub: github.com/alabare01/wovely
Local: C:/Users/adam/wovely
Supabase: vbtsdyxvqqwxjzpuseaf — PRO (upgraded Session 52, spend cap enabled)
Vercel: prj_SZYwLGH5V7kCZYryr4MSy3US3bfz / team_mRQaDsQzhF6HFGU5Ka7hi5OM — PRO
Stripe: acct_1TDQ1WGbX5hxxc0T (LIVE) $8.99/mo Pro
Cloudinary: dmaupzhcx
PostHog: Project 363175 — 157 unique visitors since Jan 1 2026
Current session:

## EMAIL STACK
Google Workspace: adam@wovely.app, support@wovely.app
Resend: RESEND_API_KEY in Vercel
DNS: GoDaddy. MX records fine. SPF chained. DKIM LIVE — verified at google._domainkey.wovely.app (Session 52). Gmail delivery confirmed with DKIM PASS.

## LEGAL
Wovely LLC — filed March 30 2026, doc L26000181882, Florida
Annual report due Jan 1 to May 1 2027

## TECH STACK
React/Vite, Supabase, Vercel PRO, Gemini 2.5 Flash, Claude Haiku fallback, Stripe $8.99/mo, Cloudinary, Resend, PostHog

## STYLE GUIDE v1.0 (LOCKED)
Primary: #9B7EC8, Navy: #2D3A7C, White: #FFFFFF, Surface: #F8F6FF, Border: #EDE4F7
Text primary: #2D2D4E, Text secondary: #6B6B8A, Danger: #C0544A
Fonts: Playfair Display (headings), Inter (body)
NEVER USE: #1A1A2E, terracotta #B85A3C or #C05A5A, cream #FAF7F2

## BEV
Hyper-realistic crochet amigurumi lavender snake, named after Danielles grandmother Beverly.
bev_neutral.png in /public.
ALL loading states: static Bev inside spinning ring.
NEVER snake emoji where Bev image can be used.
NEVER use AI in user-facing copy — Bev owns all intelligence.
Future: bev_happy.png, bev_warning.png, bev_concerned.png
BevCorner message pool includes turttlesong shoutout as of Session 48.

## BACKGROUND CSS (CRITICAL)
body::before: image, position fixed, z-index -1
body::after: gradient overlay, position fixed, z-index -1
#root: position relative, z-index 1
App.jsx: NO background-color on any layout wrapper

## Z-INDEX MAP
FeedbackWidget: 60, Add Pattern tab: 40, Mobile header: 20, Tooltips: 100, Modals: 50+

## PENDING ADAM ACTIONS
1. Add SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY to .env.local, then run the S56 welcome email script (scripts/send-welcome-emails.mjs) → --test=alabare@gmail.com → verify on iPhone → --send. Script self-deletes on clean finish. 15 min.
2. Move client-side Gemini calls to server — extractPatternFromPDF (AddPatternModal.jsx) + callGeminiVision (HiveVisionForm) → new /api/snap-vision endpoint. New rotated key is still bundled. Not urgent because $50/mo spend cap caps blast radius, but next focused security session.
3. Update Stripe support email from alabare@gmail.com to support@wovely.app via Stripe Public details settings
4. Delete VITE_GEMINI_API_KEY env var from Vercel once client-side Gemini calls are moved server-side
5. Replace cover image on First Sunrise Blanket Pattern
6. Claim @wovely on Instagram + TikTok
7. Post Facebook follow-up comment announcing anonymous mode shipped (give early-launch bouncers a reason to come back)
8. File annual report Wovely LLC at sunbiz.org (L26000181882) Jan 1 to May 1 2027
9. Try Recraft.ai for Bev vector logo
10. Create bev_happy.png, bev_warning.png, bev_concerned.png
11. Delete feature/turttlesong-shoutout: git push origin --delete feature/turttlesong-shoutout
12. Migrate Claude account from adam@terrainnovations.com to adam@wovely.app at a natural breakpoint (requires cancel + rebuild, estimated 2-4 hours, not urgent)
13. Upload licensed Playfair Display + Inter WOFF2 files to Claude Design to resolve "substitute web fonts" warning

## TECHNICAL GOTCHAS
supabaseAuth.getUser() is SYNCHRONOUS — never await
Pattern fetch needs Range: 0-499 header
DEFAULT_STARTERS excluded from stats
detailOnSave must spread updated_at onto local state
Hero image: PILL sentinel check before using photo field
Vercel Pro: maxDuration 300 on extract-pattern.js and extract-pattern-vision.js
iOS: background-attachment fixed broken — use fixed pseudo-elements
Gemini: strip markdown fences before JSON.parse
Gemini responses: skip parts where part.thought === true
Gemini 2.5 Flash: ACTIVE — model string gemini-2.5-flash, API path /v1beta/
Claude Haiku model: MUST use claude-haiku-4-5-20251001
BevCheck max_tokens: 2000
Missing await on async = silent 500. Check this first.
Mobile background fetch: start fetch before UI transition
user_profiles has NO email column — join through auth.users
PDFs -> Supabase Storage. Images -> Cloudinary. Brand assets -> /public
SessionStorage: wovely_feedback_draft, wovely_redirect_intent
useBlocker requires createBrowserRouter — Wovely uses BrowserRouter, do NOT use
iPad Safari scroll bounce: never overflow-y scroll on inner containers
BevCheck calls never go direct to Gemini from browser
Provider router: probes gemini-2.5-flash on /v1beta/ — must match actual call model and path
Large PDF chunking: SHIPPED S48
Smart PDF routing: SHIPPED S48 — avgText/page threshold 300/1200
Fixed position banners in Dashboard.jsx: DO NOT USE — causes layout issues
App.jsx fragment wrapping: DO NOT wrap App return in React fragments — breaks render
Client timeout fires before server finishes on large jobs — queue system needed
RLS must be applied to ALL new tables at creation time — never retroactively
CORS: audit all serverless functions — wildcard origin likely present, restrict to wovely.app
Stripe webhook: must verify stripe-signature header before processing any event

## STITCH-O-VISION
Gemini 2.5 Flash — no Haiku fallback. Complex geometric patterns: ongoing prompt refinement needed.

## CHANGELOG RULE
Only user-facing features. Never mention AI — Bev language only. Prepend each session.

## CLAUDE CODE DESKTOP APP WORKFLOW
Adopted Session 50. Desktop app replaces CLI terminal + browser alt-tab workflow.

Two-window setup:
- Claude.ai in browser = strategy conversations with Claude (this instance). Master doc context lives here.
- Claude Code desktop app = code execution. Opus 4.7 xhigh default.
- Alt-tab between them. Do NOT try to unify in one window.

Panel usage:
- Chat panel = where Claude Code executes tasks. Paste Claude.ai prompts here. 95% of work happens here.
- Terminal panel = for manual commands Adam runs himself (git status, git push, npm run dev). Skip Claude turn when command is known.
- Preview panel = for UI work. Runs local dev server inside desktop. Essential for landing page, BevCheck UI, queue dashboard, anything Danielle-facing.
- Diff viewer = mandatory before every merge. Replaces git diff in terminal. Catches mistakes before shipping.
- Plan panel = for big tasks. Turn on for queue system build, Collections. Skip for small fixes.
- Tasks panel = for multi-step work tracking. Queue system build is ideal use case.

Session management:
- New session per feature branch. Do not reuse old sessions for new tasks.
- Each session gets isolated git worktree. Changes in one session do not affect others until committed.
- Parallel sessions for independent tasks (CORS audit + queue build can run simultaneously).

Permission modes:
- Ask permissions (default) = approve every edit. Use for Stripe, auth, production hotfixes.
- Auto mode = Claude handles permissions via classifiers. Use for queue system build, CORS fixes, RLS additions, Collections build.
- Plan mode = Claude maps approach without touching files. Use before large refactors.

Model:
- Opus 4.7 xhigh default. Current Adam setting: High. Bump to xhigh for queue system and Collections.

Routines (later, not now):
- After Collections ships: weekly security audit, nightly pattern import health, PostHog digest, changelog generator.

Ultrareview budget:
- 3 free remaining. Spend on: post-queue-system pre-merge, post-Stripe-verification pre-merge, first Craft tier feature.

Master doc status:
- External API workflow still in use as of Session 50.
- Evaluating Project knowledge migration in Session 51 as parallel test.
- Do not deprecate until replacement is proven across at least one session.

## CLAUDE RULES
Fetch master doc first, no exceptions
Next session = 58
Danielle feedback overrides everything
ONE complete Claude Code prompt per task
Never push direct to main
Match Adam energy
ALWAYS query vercel_logs first when debugging
Model swap first when provider is flaky
Proactively flag platform limits and upgrade paths
Never use em dashes in copy or emails written for Adam
