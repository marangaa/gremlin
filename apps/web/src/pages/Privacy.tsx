import React from 'react';
import { DocLayout, type DocSection } from '../components/DocLayout';

const sections: DocSection[] = [
  {
    id: 'purpose',
    title: 'Single purpose',
    body: (
      <p>
        Gremlin is a browser focus companion that helps students, creators, writers, and
        professionals stay on track during active study and work sessions. It observes whether
        your active browsing tab aligns with your declared goal and offers gentle, witty
        accountability when you get distracted. That is all it does.
      </p>
    ),
  },
  {
    id: 'data',
    title: 'What we look at — and what we never touch',
    body: (
      <>
        <p>Gremlin only evaluates context while a focus sprint is actively running:</p>
        <ul className="list-none pl-0 space-y-2.5">
          {[
            ['Active tab context', ' domain name, page title, main document headings, and a short text excerpt (~500 characters) used to judge whether the page serves your goal.'],
            ['Dwell time & media state', ' time spent on the active tab, scroll depth, and whether video or audio is currently playing.'],
            ['Visited domains during sprints', ' a rolling list of recently visited domains, so your companion can tell research rabbit holes from focused work.'],
          ].map(([strong, rest]) => (
            <li key={strong} className="flex gap-2.5">
              <span className="text-accent mt-0.5">›</span>
              <span>
                <strong className="text-ink font-medium">{strong}:</strong>
                {rest}
              </span>
            </li>
          ))}
          <li className="flex gap-2.5">
            <span className="text-accent mt-0.5">›</span>
            <span>
              <strong className="text-ink font-medium">Zero form or password access.</strong>{' '}
              Gremlin never touches form fields, keystrokes, password boxes, credit card inputs,
              or private emails.
            </span>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'modes',
    title: 'How your data is handled: Free BYOK vs Cloud',
    body: (
      <div className="space-y-4 not-prose">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line-bright bg-[#10121a] p-5 space-y-2">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
              100% Local BYOK Mode
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              All AI reasoning happens directly on your device inside your browser, using the API key you
              supply. Page context is transmitted only to the provider <em>you</em> choose — Google (Gemini),
              OpenAI, Anthropic, Groq, or a local Ollama instance — and never to Gremlin servers. Zero
              browsing data or URLs ever leave your machine except to that provider.
            </p>
          </div>
          <div className="rounded-xl border border-line-bright bg-[#10121a] p-5 space-y-2">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
              Gremlin Cloud Pro
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">
              Active tab context is evaluated transiently over an encrypted HTTPS connection on our Cloudflare
              Workers backend to deliver companion remarks; excerpts are not permanently stored. Your account
              email and sprint metadata (goal title, duration, timestamps, chosen companion) are stored in our
              managed Postgres database to power cross-device history. No browsing histories are sold or shared
              with advertisers.
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          In both modes, data is transmitted exclusively over modern encrypted connections (HTTPS/WSS), is used
          solely to provide the focus-coaching feature described above, and is never used for advertising or
          credit-worthiness decisions. We do not allow humans to read your page content.
        </p>
      </div>
    ),
  },
  {
    id: 'limited-use',
    title: 'Chrome Web Store Limited Use disclosure',
    body: (
      <p>
        The use of information received from Chrome Web Store users will adhere to the{' '}
        <a
          href="https://developer.chrome.com/docs/webstore/program-policies/limited-use"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline font-mono"
        >
          Chrome Web Store User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>
    ),
  },
  {
    id: 'permissions',
    title: 'Browser permissions explained',
    body: (
      <div className="space-y-2.5">
        {[
          ['tabs', 'Reads the active tab title and domain to check if it matches your focus goal.'],
          ['storage', 'Saves your companion choice, local sprint timer, and settings in your browser.'],
          ['idle', 'Pauses focus checks when you step away from your keyboard to prevent false alarms.'],
          ['alarms', 'Schedules lightweight periodic focus checks without draining battery.'],
          ['scripting', 'Injects the companion widget into tabs that are already open when you install or update the extension.'],
          ['sidePanel', 'Hosts the companion dashboard beside your browsing instead of overlaying pages.'],
        ].map(([perm, why]) => (
          <div key={perm} className="rounded-xl border border-line-bright bg-[#10121a] px-4 py-3 text-sm leading-relaxed">
            <code className="font-mono text-xs text-accent font-semibold">{perm}</code>
            <span className="text-ink-muted"> — {why}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'contact',
    title: 'Questions or feedback?',
    body: (
      <p>
        If you have any questions about how your privacy is protected, or wish to request data deletion,
        please reach out to us at{' '}
        <a href="mailto:rchdmaranga@gmail.com" className="text-accent hover:underline font-mono">
          rchdmaranga@gmail.com
        </a>{' '}
        or on X at{' '}
        <a href="https://x.com/rmarangaa" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-mono">
          @rmarangaa
        </a>.
      </p>
    ),
  },
];

export const Privacy: React.FC = () => (
  <DocLayout
    eyebrow="Privacy"
    title="Privacy policy"
    updated="August 21, 2026"
    sections={sections}
  />
);
