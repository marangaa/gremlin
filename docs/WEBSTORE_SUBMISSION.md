# Chrome Web Store Submission Playbook (Gremlin)

> Distilled from the official CWS docs (developer.chrome.com/docs/webstore, fetched 2026-08): registration, packaging, listing, privacy disclosures, distribution, review process, and program policies — mapped to our exact extension.

**Our manifest today:** MV3 · permissions `storage, tabs, idle, alarms, scripting, sidePanel` · `host_permissions: <all_urls>` · content script `<all_urls>` · side panel · commands.
⚠️ This permission combo (`<all_urls>` + tabs + content scripts) matches Google's explicit deep-review triggers line-for-line. Budget extra review time and make justifications airtight.

---

## 1. Developer Account Setup

| Requirement | Detail |
|---|---|
| Registration fee | One-time $5 USD, paid in the dashboard during registration |
| Email | Use a dedicated, frequently-checked address — **locked forever after account creation**; deleted-account emails cannot be reused |
| Email verification | Required: Account page → "Add email" → click verification link |
| Publisher name | Required; shown under the extension title |
| Physical address | **Required because Gremlin plans paid subscriptions** (Pro tier) |
| **2-Step Verification** | **Mandatory for ALL developer accounts before publishing/updating** (Program Policies → Technical Requirements) |
| Publishing cap | New publishers limited to **2 published items** until engagement/tenure earns more |

## 2. Package Prep

- Build + zip: `pnpm --filter @gremlin/extension build` then `wxt zip` (or zip `.output/chrome-mv3` contents). **manifest.json must be at the zip root**, not inside a folder.
- Max package size 2 GB (we're ~2 MB — fine).
- Version numbers must strictly increase per upload. Manifest metadata is **frozen after upload** — a typo means fix → bump version → re-zip → re-upload.
- Our current manifest checks out: name ≤132 chars? (description is 78 chars ✓), icons 16–128 present ✓.
- No comments in manifest JSON (parse errors).
- Code readability policy: minification allowed, **obfuscation prohibited**. Vite/WXT output is compliant minification.

## 3. Store Listing Assets

| Asset | Spec | Status |
|---|---|---|
| Store icon | 128×128 PNG; artwork ~96×96 centered w/ transparent padding; circle ≈112px dia; legible on light AND dark | ⬜ audit existing icon against padding rules |
| Screenshots | 1280×800, min 1 / max 5, square corners, full bleed, real UX | ⬜ produce 3–5 |
| Small promo tile | **440×280 — required** (listings without it rank lower); saturated colors, no text-heavy design, fills canvas | ⬜ |
| Marquee tile | 1400×560, optional (required to be featured in marquee) | ⬜ optional |
| Promo video | YouTube URL, optional | ⬜ |

Copy rules: category (Productivity), keyword-spam ban (no site lists, no >5× repeated keywords), no unattributed testimonials, description must accurately state functionality.

## 4. Privacy Tab — The Critical One

### 4.1 Single purpose (draft)
> "AI-powered focus coach that watches your browsing **during active focus sprints**, detects doomscrolling through an on-screen pixel companion, and saves in-page notes."

Narrow + easy to understand. Everything we do must trace back to this sentence.

### 4.2 Permission justifications (drafts)
- `storage` — persist local settings, sprint goals, diary/stats on-device.
- `tabs` — read active tab title/URL during active sprints to detect distraction vs. focus.
- `idle` — pause tracking when the user is away so sprints reflect real work time.
- `alarms` — resume periodic sprint evaluation when the service worker sleeps (MV3 has no persistent background).
- `scripting` — inject the companion widget into already-open tabs on install/update.
- `sidePanel` — host the companion dashboard UI without injecting into pages.
- `host_permissions <all_urls>` + content script — the companion must observe pages wherever deep work happens (docs sites, StackOverflow, YouTube); extraction is privacy-filtered and runs only during sprints.

### 4.3 Remote code
Answer **"No remote code."** Calling LLM APIs transmits *data*; it is not remotely-hosted code execution (explicitly permitted under MV3 policy §3 "performing server-side operations with data"). All logic ships in-package ✓.

### 4.4 Data usage disclosure (honest answers)
Check these data types:
- **Website content** — titles/headings/text excerpts captured during sprints
- **User activity / web browsing activity** — domains visited during active sprints
- **Personally identifiable info** — email address (only if cloud sign-in is shipped in v1)

Certifications we can truthfully make: not sold; not used for unrelated purposes; no ads; no human review; transfer to LLM providers **only** as necessary for the disclosed single purpose. Any contradiction between dashboard ↔ privacy policy ↔ behavior risks removal of all items + publisher ban.

### 4.5 Privacy policy URL — MANDATORY
Handling any user data (even local-only) requires a hosted policy. We have `/privacy` route in apps/web — before submission it must:
1. Be live at a public URL (gremlin.dev/privacy or workers URL)
2. Cover BOTH modes: BYOK (which providers receive excerpts) and cloud proxy (what our server stores/retains)
3. Include the **Limited Use affirmative statement**: *"The use of information received from Chrome Web Store users adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements."* (must be on homepage or one click away)

### 4.6 Prominent disclosure + consent — GAP IN OUR PRODUCT
Policy requires prominent disclosure of what's collected + affirmative informed consent **before collection begins** (a store-page mention doesn't satisfy this; it must be in-product). **We need a first-run consent screen** in the popup/sidepanel describing page-content capture + LLM transmission before enabling sprint tracking. `onboardedStorage` flag already exists as the hook point.

## 5. Distribution Tab

- Visibility: Public / Unlisted (direct URL only) / Private (tester emails; groups NOT supported — use Private visibility for team testing instead).
- Regions: default All regions.
- Payments: CWS payments fully deprecated (2021) — external processors (Stripe/Polar/LemonSqueezy) are the sanctioned path. Nothing to declare there, BUT "Accepting Payment" policy: if basic functionality requires payment, that must be clear in the listing description.
- Beta builds: parallel item names must end "BETA"/"DEVELOPMENT BUILD" with matching description, else spam-policy risk.

## 6. Review Process Reality Check

- **April 2026 banner: submission surge — reviews taking longer than usual.** Typical is days-to-weeks; >3 weeks pending → support ticket.
- Deep-review triggers (we hit several): new developer account, first extension, **broad host permissions, `tabs`, significant code volume**.
- Optional but recommended: fill Test Instructions with a demo API key / test account so reviewers can exercise AI features (they won't test behind keys otherwise).
- Deferred publish: uncheck auto-publish → after approval you have **30 days** to manually publish, else reverts to draft + re-review.
- Rejected mid-review? Use **Cancel review** to immediately re-upload a fixed zip.
- Appeals: one appeal per violation. Enforcement ladder: rejection (pre-publish) → warning (7–30 days to fix) → takedown → silent removal for malware-class issues.

## 7. Policy Red Flags Specific to Gremlin

| Risk | Policy | Mitigation |
|---|---|---|
| Browsing-activity collection is prohibited EXCEPT for a prominently-described user-facing feature | Limited Use §4 | Sprint-watching IS our feature — describe it prominently on the store listing AND in-product UI before first sprint |
| Persistent overlay injected into every site | Quality Guidelines §2 | Persistent UI must "actively enhance the user's current task while causing minimal distractions." We're draggable + have an enable/disable toggle + hide — say so in the listing |
| **"Goggins" persona = real public figure** (quotes "carry the boats", "stay hard") | Impersonation & IP | Genuine risk. Consider renaming the persona (e.g. "Coach") or being ready to justify parody; do NOT use his name/likeness in listing art |
| BYOK API key stored plaintext in `storage.local` | Handling Requirements (secure handling) | Acceptable for v1 (key never leaves device except to provider), but consider chrome.storage.Session or encryption; document key handling in privacy policy |
| Excerpts sent to third-party LLMs | Limited Use transfers | Allowed only as necessary-for-single-purpose — name every provider in the privacy policy |
| No dedicated Gen-AI policy exists in CWS docs (verified 2025-05-22 policy revision) | — | General honesty/misleading-behavior rules apply; no special AI label currently required |

## 8. Pre-Submission TODO

- [ ] Register developer account ($5), verify email, enable 2SV, add publisher name + address
- [ ] Host privacy policy incl. both data modes + Limited Use statement
- [ ] Build first-run consent screen (onboardedStorage hook) describing capture + transmission
- [ ] Draft final single-purpose + 7 permission justifications (§4 drafts above)
- [ ] Produce assets: icon audit, 3–5 screenshots @1280×800, 440×280 promo, optional 1400×560 marquee
- [ ] Decide Goggins persona naming
- [ ] Write listing description (accurate, no keyword stuffing) + test instructions w/ demo credentials
- [ ] Zip `.output/chrome-mv3` at root, submit with deferred publish OFF (first release), Public visibility
