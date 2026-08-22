# Privacy Policy for Gremlin

**Last Updated:** August 22, 2026

Gremlin ("we", "our", or "the Extension") is committed to protecting your privacy. This Privacy Policy describes how information is collected, used, and protected when you use the Gremlin browser extension.

---

## 1. Single Purpose & Core Mission
Gremlin is a browser-based focus and pair-programming companion designed to assist users in maintaining concentration during deep work sprints by evaluating browsing distraction trajectories.

---

## 2. Information We Collect and Process

### A. Active Browsing Context (During Active Sprints Only)
When you actively initiate a focus sprint, Gremlin monitors:
- **Active Tab Metadata:** Webpage domain, page title, key headings, and a short text excerpt (approximately 500 characters) used to judge whether the page serves your declared goal.
- **Browsing Behavior:** Dwell time on the active page, approximate scroll depth percentage, and video/audio playback state.
- **Recent Transitions:** A short rolling timeline of recently visited domains (last 10–15 page transitions) used to understand whether you are researching or doomscrolling.

> **Privacy Invariant:** Gremlin **never** logs or reads form inputs, passwords, credit card numbers, personal messages, or private authentication tokens. Nothing is captured while idle or when tracking is disabled.

---

## 3. How Your Data is Processed

Gremlin offers two distinct execution modes:

### Option 1: Air-Gapped / Local BYOK Mode (Default Private Mode)
- In Bring-Your-Own-Key (BYOK) mode, AI reasoning runs **directly on your local device** inside the browser extension's service worker using your personal API key.
- Page context (titles, headings, excerpts, domains) is transmitted **only** to the provider *you* configure — Google (Gemini), OpenAI, Anthropic, Groq, or a locally-hosted Ollama instance — purely to evaluate your focus. It is never sent to Gremlin servers in this mode and is never sold or used for advertising.

### Option 2: Gremlin Cloud Mode (Optional)
- If you choose to use Gremlin Cloud, your active sprint window is transmitted over TLS/HTTPS to our Cloudflare Workers edge API for AI agent reasoning. Browsing breadcrumbs are evaluated transiently in edge memory and are **not sold, rented, or used for advertising**.
- To power cross-device history, we store your **account email** (for authentication) and lightweight **sprint metadata** (goal title, duration, timestamps, chosen companion) in our managed Postgres database. Page excerpts themselves are not permanently stored.

In both modes all transmission occurs over modern encrypted connections (HTTPS/WSS), data is used solely to provide the focus-coaching feature described above, and humans do not read your page content.

---

## 4. Permissions Justification

| Permission | Purpose |
| :--- | :--- |
| `tabs` | Needed to detect the active tab's title and domain during a sprint to evaluate alignment with your goal. |
| `storage` | Stores your local companion settings, sprint goals, and API keys on your device. |
| `idle` | Detects when you are away from the keyboard to pause sprint timers and avoid false distraction triggers. |
| `alarms` | Schedules lightweight focus evaluation intervals without draining CPU or battery. |
| `scripting` | Injects the companion widget into tabs that are already open when you install or update the extension. |
| `sidePanel` | Hosts the companion dashboard beside your browsing instead of overlaying pages. |

---

## 5. Third-Party Sharing & Data Monetization
- We **do not sell** your personal information or browsing history to third parties or data brokers.
- We **do not use** your data for targeted advertising or user profiling.
- We **do not transmit** browsing history outside the scope required for the extension's focus evaluation.

---

## 6. Chrome Web Store Limited Use Disclosure
The use of information received from Chrome Web Store users will adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use), including the **Limited Use** requirements. Specifically, we do not sell user data, do not use it for unrelated purposes or personalized advertising, and do not allow humans to read it except with your explicit consent or where required by law.

---

## 7. Data Retention and Deletion
- **Local Mode:** All data stored via `chrome.storage.local` remains on your machine and is erased upon extension uninstall.
- **Cloud Mode:** You may delete your account and associated sprint history at any time through the extension profile settings.

---

## 8. Contact
If you have any questions about this Privacy Policy, contact us at:
- **Email:** support@gremlin.dev
- **Repository:** https://github.com/your-username/gremlin
