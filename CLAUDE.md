---
name: wovely-patterns
description: "Critical technical and design patterns for the Wovely codebase (wovely.app). Use this skill whenever working on ANY Wovely task — UI changes, API work, CSS, auth, file handling, Supabase queries, or deployment. This skill MUST be consulted before writing any code for the Wovely project. Triggers on mentions of Wovely, wovely.app, YarnHive, Bev, BevCheck, Stitch-O-Vision, patterns app, crochet app, or any reference to the Wovely tech stack (Supabase + Vercel + React/Vite + Gemini)."
---

# Wovely Codebase Patterns

Non-negotiable rules and patterns for the Wovely codebase. Read this before writing a single line of code.

---

## Style Guide (LOCKED — never deviate)

```
Primary (lavender):  #9B7EC8
Navy:                #2D3A7C
White:               #FFFFFF
Surface:             #F8F6FF
Border:              #EDE4F7
Text primary:        #2D2D4E
Text secondary:      #6B6B8A
Danger:              #C0544A
```

**Stitch Check colors:** green `#5B9B6B` (80%+), amber `#C9A84C` (60–79%), red `#C0544A` (<60%)

**Fonts:** Playfair Display (headings), Inter (body)

**NEVER USE:** `#1A1A2E`, terracotta/salmon `#B85A3C` or `#C05A5A`, cream `#FAF7F2`

---

## Glass Card Treatment (the design language)

My Wovely (Dashboard.jsx) is the gold standard. All pages must match it.

```js
// Standard glass card — use everywhere
const CARD = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.45)',
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(45,58,124,0.08)',
};

// Standard page content container — stops wall-to-wall stretch
const PAGE_CONTAINER = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '24px 24px',
};
```

---

## Background CSS (CRITICAL — never break this)

```css
body::before  → background image, position: fixed, 100vw/100vh, z-index: -1
body::after   → gradient overlay, position: fixed, 100vw/100vh, z-index: -1
#root         → position: relative, z-index: 1
index.html    → background: transparent
App.jsx       → NO background-color on any layout wrapper
Content wrappers → min-height: 100vh (desktop AND mobile)
```

**iOS specific:** `background-attachment: fixed` is broken on iOS. Always use fixed pseudo-elements instead.

---

## Z-Index Map

```
FeedbackWidget heart:     z-index 60
Add Pattern tab (right):  z-index 40
Mobile header:            z-index 20
Tooltips:                 z-index 100
Modals/overlays:          z-index 50+
```

---

## Bev Character Rules

- Hyper-realistic crochet amigurumi lavender snake
- Image file: `bev_neutral.png` in `/public`
- ALL loading states: static Bev inside spinning ring
- Sidebar logo mark + BevCorner typewriter companion
- NEVER use 🐍 snake emoji where Bev image can be used
- Character bible locked — do not reinterpret Bev's personality

---

## Supabase Patterns

```js
// CRITICAL: getUser() is SYNCHRONOUS — never await it
const user = supabaseAuth.getUser(); // correct
const user = await supabaseAuth.getUser(); // WRONG

// user_profiles has NO email column — always join through auth.users
SELECT up.*, au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE au.email = '[email]';

// Pattern fetch requires Range header
headers: { Range: '0-499' }

// Pro upgrade pattern
UPDATE user_profiles SET is_pro = true 
WHERE id = (SELECT id FROM auth.users WHERE email = '[email]');

// is_pro caches in localStorage as 'yh_is_pro'
// User must sign out/in to clear stale Pro state after manual upgrade
```

---

## File Routing Rules

```
PDFs         → Supabase Storage (pattern-files bucket) — NEVER Cloudinary
Images       → Cloudinary
Brand assets → /public folder, served via Vercel
```

Cloudinary returns 401 on PDFs. Do not attempt PDF uploads to Cloudinary under any circumstances.

---

## Vercel Serverless Functions

**Current limit: 17 functions deployed. DO NOT add new API files.**
Vercel Hobby plan — upgrade to Pro before Collections build.
10 second function timeout — Gemini calls can approach this limit.

If a task requires a new API endpoint, consolidate into an existing function rather than creating a new file.

---

## Gemini Integration

```js
// Always strip markdown fences before JSON.parse
const clean = response.replace(/```json|```/g, '').trim();
const parsed = JSON.parse(clean);

// Skip thought blocks
const parts = response.parts.filter(p => !p.thought);

// maxOutputTokens too low causes mid-string truncation — set high
```

---

## Post-Login Redirect

```js
// sessionStorage key: wovely_redirect_intent
// Structure: { url: '/pattern/[id]', storedAt: Date.now() }
// Rules:
//   - Only /pattern/:id and /hive/:id paths are stored
//   - 15-minute window — stale intents land on / (My Wovely)
//   - Cleared immediately on manual sign out
//   - Session expires → always land on My Wovely
```

---

## DEFAULT_STARTERS

Exclude from all user stats. Always filter with `is_starter` check.

---

## Pattern Detail (detailOnSave)

Must spread `updated_at` onto local state after save — otherwise On the Hook hero card shows stale data.

```js
setPattern(prev => ({ ...prev, ...savedData, updated_at: savedData.updated_at }));
```

---

## Hero Image Sentinel

Before using `photo` field for hero image, always check for PILL sentinel:

```js
if (pattern.photo && pattern.photo !== 'PILL') {
  // safe to use as hero
}
```

---

## SessionStorage Keys

```
wovely_feedback_draft     → FeedbackWidget draft persistence (survives iOS Safari repaint)
wovely_redirect_intent    → Post-login redirect { url, storedAt }
```

---

## Branch & Deploy Rules

- **Never push direct to main** — always a dev branch
- Branch alias format: `wovely-git-[branch-name]-alabare-8435s-projects.vercel.app`
- One complete Claude Code prompt per task — never split
- Merge only after Adam confirms it works on preview URL
- Vercel env var changes require a fresh deployment (empty git commit if needed)

---

## Key User IDs

```
Adam:             6e1a02d9-c210-4bc4-968e-dde3435565d1
Danielle me.com:  d6b18345-a85e-42bd-b7cb-f20efd4b2fe7
Danielle gmail:   038442a2-b13d-4abb-9960-24a360078f6c
```

---

## Changelog Rule

Only user-facing features in `src/changelog.js`. Internal tools (founders dashboard, analytics) never mentioned. Prepend new session entry at the start of each session.
