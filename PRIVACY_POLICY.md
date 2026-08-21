# Privacy Policy for Gremlin

**Last Updated:** August 20, 2026

Gremlin ("we", "our", or "the Extension") is committed to protecting your privacy. This Privacy Policy describes how information is collected, used, and protected when you use the Gremlin browser extension.

---

## 1. Single Purpose & Core Mission
Gremlin is a browser-based focus and pair-programming companion designed to assist users in maintaining concentration during deep work sprints by evaluating browsing distraction trajectories.

---

## 2. Information We Collect and Process

### A. Active Browsing Context (During Active Sprints Only)
When you actively initiate a focus sprint, Gremlin monitors:
- **Active Tab Metadata:** Webpage domain, page title, and key headings.
- **Browsing Behavior:** Dwell time on the active page, approximate scroll depth percentage, and video/audio playback state.
- **Recent Transitions:** A short rolling timeline (last 10–15 page transitions) used to understand whether you are researching or doomscrolling.

> **Privacy Invariant:** Gremlin **never** logs or reads form inputs, passwords, credit card numbers, personal messages, or private authentication tokens.

---

## 3. How Your Data is Processed

Gremlin offers two distinct execution modes:

### Option 1: Air-Gapped / Local BYOK Mode (Default Private Mode)
- In Bring-Your-Own-Key (BYOK) mode, all AI reasoning runs **directly on your local device** inside the browser extension's service worker using your personal API key (e.g. Gemini, OpenAI, Claude, Groq, or local Ollama).
- **Zero browsing data or telemetry leaves your computer.**

### Option 2: Gremlin Cloud Mode (Optional)
- If you choose to use Gremlin Cloud, your active sprint window is transmitted over TLS/HTTPS to our Cloudflare Workers edge API for AI agent reasoning and saved to your account via Better Auth.
- Browsing breadcrumbs are evaluated transiently in edge memory and are **not sold, rented, or used for advertising**.

---

## 4. Permissions Justification

| Permission | Purpose |
| :--- | :--- |
| `tabs` | Needed to detect the active tab's title and domain during a sprint to evaluate alignment with your goal. |
| `storage` | Needed to store your local companion settings, sprint goals, and API keys securely on your device. |
| `idle` | Needed to detect when you are away from the keyboard to pause sprint timers and avoid false distraction triggers. |
| `alarms` | Needed to schedule lightweight focus evaluation intervals without draining CPU or battery. |

---

## 5. Third-Party Sharing & Data Monetization
- We **do not sell** your personal information or browsing history to third parties or data brokers.
- We **do not use** your data for targeted advertising or user profiling.
- We **do not transmit** browsing history outside the scope required for the extension's focus evaluation.

---

## 6. Data Retention and Deletion
- **Local Mode:** All data stored via `chrome.storage.local` remains on your machine and is erased upon extension uninstall.
- **Cloud Mode:** You may delete your account and associated sprint history at any time through the extension profile settings.

---

## 7. Contact
If you have any questions about this Privacy Policy, contact us at:
- **Email:** support@gremlin.dev
- **Repository:** https://github.com/your-username/gremlin
