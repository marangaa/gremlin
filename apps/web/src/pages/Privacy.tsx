import React from 'react';
import {
  ShieldCheck,
  Check,
  X,
  HardDrive,
  Cloud,
  Lock,
  Trash2,
} from 'lucide-react';
import { DocLayout, type DocSection } from '../components/DocLayout';

/* ---------- shared bits ---------- */

const cardCls = 'border-2 border-coal bg-white p-5 shadow-brut-sm';

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="font-mono text-[11px] font-semibold tracking-wider text-accent">
    {children}
  </div>
);

const YesRow: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <li className="flex gap-2.5">
    <Check size={15} className="mt-0.5 shrink-0 text-accent-bright" />
    <span className="text-sm leading-relaxed">
      <strong className="font-medium text-coal">{title}:</strong>{' '}
      <span className="text-paper-muted">{body}</span>
    </span>
  </li>
);

const NoRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex gap-2.5">
    <X size={15} className="mt-0.5 shrink-0 text-red-400" />
    <span className="text-sm leading-relaxed text-paper-muted">{children}</span>
  </li>
);

/* ---------- sections ---------- */

const sections: DocSection[] = [
  {
    id: 'at-a-glance',
    title: 'At a glance',
    body: (
      <div className="grid grid-cols-2 gap-3 not-prose sm:grid-cols-4">
        {[
          { icon: HardDrive, label: 'Local-first', sub: 'BYOK default' },
          { icon: ShieldCheck, label: 'Never sold', sub: 'No data brokers' },
          { icon: X, label: 'No ads', sub: 'Ever' },
          { icon: Trash2, label: 'Deletable', sub: 'Anytime' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className={`${cardCls} flex flex-col items-center gap-1 py-4 text-center`}>
            <Icon size={18} className="text-accent" />
            <div className="font-display text-sm font-semibold text-coal">{label}</div>
            <div className="font-mono text-[10px] tracking-wider text-paper-faint">{sub}</div>
          </div>
        ))}
      </div>
    ),
  },
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
    title: 'What we capture — and what we never touch',
    body: (
      <>
        <p>
          Gremlin only evaluates context <strong className="text-coal">while a focus sprint is actively
          running</strong>. Nothing is read while you are idle or when tracking is disabled.
        </p>
        <ul className="list-none space-y-2.5 pl-0">
          <YesRow
            title="Active tab context"
            body="domain name, page title, main document headings, and a short text excerpt (~500 characters) used to judge whether the page serves your goal."
          />
          <YesRow
            title="Reading behavior"
            body="time spent on the active tab, scroll depth, and whether video or audio is currently playing."
          />
          <YesRow
            title="Visited domains during sprints"
            body="a rolling list of recently visited domains, so your companion can tell research rabbit holes from focused work."
          />
          <YesRow
            title="Cloud sign-in email"
            body="only if you opt into Gremlin Cloud; used exclusively for authentication and cross-device history."
          />
        </ul>

        <div className={`${cardCls} mt-5`}>
          <Label>Never touched</Label>
          <ul className="mt-2.5 list-none space-y-1.5 pl-0">
            <NoRow>Form fields, keystrokes, or password boxes</NoRow>
            <NoRow>Payment or credit card inputs</NoRow>
            <NoRow>Private messages or emails</NoRow>
            <NoRow>Browsing activity outside active sprints</NoRow>
            <NoRow>Full-page screenshots or session recordings</NoRow>
          </ul>
        </div>
      </>
    ),
  },
  {
    id: 'modes',
    title: 'Where your data goes',
    body: (
      <div className="space-y-4 not-prose">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={cardCls}>
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-accent" />
              <Label>100% Local BYOK Mode</Label>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-paper-muted">
              All AI reasoning happens directly on your device inside your browser, using the API key
              you supply. Page context is transmitted only to the provider <em>you</em> choose — Google
              (Gemini), OpenAI, Anthropic, Groq, or a local Ollama instance — and never to Gremlin
              servers.
            </p>
          </div>
          <div className={cardCls}>
            <div className="flex items-center gap-2">
              <Cloud size={14} className="text-accent" />
              <Label>Gremlin Cloud Pro</Label>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-paper-muted">
              Active tab context is evaluated transiently over an encrypted HTTPS connection on our
              Cloudflare Workers backend to deliver companion remarks; excerpts are not permanently
              stored. Your account email and sprint metadata (goal title, duration, timestamps,
              chosen companion) are stored in our managed Postgres database to power cross-device
              history.
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-paper-muted">
          In both modes, data is transmitted exclusively over modern encrypted connections
          (HTTPS/WSS), is used solely to provide the focus-coaching feature described above, and is
          never used for advertising or credit-worthiness decisions. We do not allow humans to read
          your page content.
        </p>
      </div>
    ),
  },
  {
    id: 'limited-use',
    title: 'Chrome Web Store Limited Use disclosure',
    body: (
      <div className="not-prose rounded-none border-2 border-coal bg-base-deep p-5 shadow-brut">
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-accent" />
          <Label>Limited use commitment</Label>
        </div>
        <p className="mt-2 text-[15px] leading-[1.75] text-coal">
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
      </div>
    ),
  },
  {
    id: 'permissions',
    title: 'Browser permissions explained',
    body: (
      <div className="grid gap-2.5 not-prose sm:grid-cols-2">
        {[
          ['tabs', 'Reads the active tab title and domain to check if it matches your focus goal.'],
          ['storage', 'Saves your companion choice, local sprint timer, and settings in your browser.'],
          ['idle', 'Pauses focus checks when you step away from your keyboard to prevent false alarms.'],
          ['alarms', 'Schedules lightweight periodic focus checks without draining battery.'],
          ['scripting', 'Injects the companion widget into tabs that are already open when you install or update the extension.'],
          ['sidePanel', 'Hosts the companion dashboard beside your browsing instead of overlaying pages.'],
        ].map(([perm, why]) => (
          <div key={perm} className={`${cardCls} px-4 py-3`}>
            <code className="font-mono text-xs font-semibold text-accent">{perm}</code>
            <p className="mt-1 text-xs leading-relaxed text-paper-muted">{why}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'retention',
    title: 'Retention & deletion',
    body: (
      <>
        <ul className="list-none space-y-2.5 pl-0">
          <YesRow
            title="Local mode"
            body="everything lives in your browser's local storage and is erased automatically when you uninstall the extension."
          />
          <YesRow
            title="Cloud mode"
            body="delete your account and associated sprint history at any time through the extension profile settings, or by contacting us directly."
          />
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-paper-muted">
          Transient page excerpts used during evaluation exist only for the seconds it takes your
          companion to respond, then they are gone.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we change what we collect or how we handle it, we will update this page, bump the
        "Last updated" date above, and — for any material change — ask for your consent again inside
        the extension before the new practices take effect.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Questions or feedback?',
    body: (
      <p>
        If you have any questions about how your privacy is protected, or wish to request data
        deletion, please reach out to us at{' '}
        <a href="mailto:rchdmaranga@gmail.com" className="font-mono text-accent hover:underline">
          rchdmaranga@gmail.com
        </a>{' '}
        or on X at{' '}
        <a
          href="https://x.com/rmarangaa"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-accent hover:underline"
        >
          @rmarangaa
        </a>
        .
      </p>
    ),
  },
];

export const Privacy: React.FC = () => (
  <DocLayout eyebrow="Privacy" title="Privacy policy" updated="August 22, 2026" sections={sections} />
);
