import { useEffect, useState } from 'react';
import { storage } from '#imports';
import {
  configStorage,
  sprintStorage,
  organismStateStorage,
  onboardedStorage,
  goalsStorage,
  type OrganismConfig,
  type FocusSprint,
  type OrganismStateData,
  type DecomposedGoal,
} from '@/lib/storage';
import {
  ORGANISM_MODELS,
  type OrganismId,
} from '@/lib/personalities/types';
import { CHARACTER_SKINS } from '@/lib/personalities/skins';
import { sendMessage } from '@/lib/messaging';
import { soundSynth } from '@/lib/audio/soundEngine';
import { SUPPORTED_PROVIDERS, type SupportedAiProvider } from '@/lib/ai/providers';
import { AnimatedSprite } from './components/AnimatedSprite';
import { GoalStack } from './components/GoalStack';
import {
  Volume2,
  VolumeX,
  Timer,
  SlidersHorizontal,
  KeyRound,
  Play,
  Square,
  Sparkles,
  Shield,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import './App.css';

const ALL_COMPANIONS: OrganismId[] = ['Sarge', 'waifu', 'sherlock', 'kuro', 'sensei', 'byte', 'pixel', 'ufo'];

const TABS = [
  { id: 'focus', label: 'Focus', Icon: Timer },
  { id: 'preferences', label: 'Preferences', Icon: SlidersHorizontal },
  { id: 'settings', label: 'Model & keys', Icon: KeyRound },
] as const;

type TabId = (typeof TABS)[number]['id'];

const PROVIDER_META: Record<SupportedAiProvider, { blurb: string }> = {
  google: { blurb: 'Gemini · free tier' },
  anthropic: { blurb: 'Claude' },
  openai: { blurb: 'GPT models' },
  groq: { blurb: 'Absurdly fast' },
  ollama: { blurb: 'Local · no key' },
  custom: { blurb: 'OpenAI-compatible' },
};

const PROVIDER_ORDER: SupportedAiProvider[] = ['google', 'anthropic', 'openai', 'groq', 'ollama'];

const DEFAULT_CONFIG: OrganismConfig = {
  mode: 'self-hosted',
  organismId: 'Sarge',
  name: 'Sarge',
  enabled: true,
  provider: 'google',
  selfHostedEndpoint: 'http://localhost:11434/v1',
  selfHostedApiKey: '',
  selfHostedModel: 'gemini-2.5-flash',
  xFrac: 0.9,
  yFrac: 0.82,
  soundEnabled: true,
  volume: 0.6,
  effectsEnabled: true,
};

const DEFAULT_SPRINT: FocusSprint = {
  goal: '',
  targetMinutes: 25,
  startedAt: 0,
  status: 'idle',
  isContinuousFlow: false,
};

const DEFAULT_ORGANISM_STATE: OrganismStateData = {
  state: 'idle',
  lastRemark: undefined,
  lastRemarkAt: 0,
  focusMinutesToday: 0,
  divergenceCountToday: 0,
  lastObservationAt: 0,
};

export default function App() {
  const [config, setConfig] = useState<OrganismConfig>(DEFAULT_CONFIG);
  const [sprint, setSprint] = useState<FocusSprint>(DEFAULT_SPRINT);
  const [organismState, setOrganismState] = useState<OrganismStateData>(DEFAULT_ORGANISM_STATE);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(true);

  const [goals, setGoals] = useState<DecomposedGoal[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('focus');
  const [goalInput, setGoalInput] = useState('');
  const [duration, setDuration] = useState<number | 'flow'>(25);
  const [isDecomposing, setIsDecomposing] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<SupportedAiProvider>('google');
  const [endpointInput, setEndpointInput] = useState('http://localhost:11434/v1');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('gemini-2.5-flash');
  const [testStatus, setTestStatus] = useState<{ loading: boolean; ok?: boolean; message?: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;

    void storage.getItems([
      configStorage,
      sprintStorage,
      organismStateStorage,
      onboardedStorage,
      goalsStorage,
    ]).then(([c, s, st, o, g]) => {
      if (!alive || !c || !s || !st || !o || !g) return;
      const cfg = c.value as OrganismConfig;
      setConfig(cfg);
      setSelectedProvider(cfg.provider || 'google');
      setEndpointInput(cfg.selfHostedEndpoint || 'http://localhost:11434/v1');
      setApiKeyInput(cfg.selfHostedApiKey || '');
      setModelInput(cfg.selfHostedModel || SUPPORTED_PROVIDERS[cfg.provider || 'google']?.defaultModel || 'gemini-2.5-flash');
      soundSynth.setVolume(cfg.volume ?? 0.6);
      soundSynth.setMuted(!cfg.soundEnabled);
      setSprint(s.value as FocusSprint);
      setOrganismState(st.value as OrganismStateData);
      setHasOnboarded(o.value as boolean);
      setGoals(g.value as DecomposedGoal[]);
    });

    const unwatchConfig = configStorage.watch((c: OrganismConfig | null) => c && setConfig(c));
    const unwatchSprint = sprintStorage.watch((s: FocusSprint | null) => s && setSprint(s));
    const unwatchState = organismStateStorage.watch((st: OrganismStateData | null) => st && setOrganismState(st));
    const unwatchOnboard = onboardedStorage.watch((o: boolean | null) => o !== null && setHasOnboarded(o));
    const unwatchGoals = goalsStorage.watch((g: DecomposedGoal[] | null) => g && setGoals(g));

    return () => {
      alive = false;
      unwatchConfig();
      unwatchSprint();
      unwatchState();
      unwatchOnboard();
      unwatchGoals();
    };
  }, []);

  useEffect(() => {
    if (sprint.status !== 'active') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [sprint.status]);

  const skin = CHARACTER_SKINS[config.organismId] || CHARACTER_SKINS.Sarge;
  const currentProviderConfig = SUPPORTED_PROVIDERS[selectedProvider] || SUPPORTED_PROVIDERS.google;

  const isConfigured =
    Boolean(config.selfHostedApiKey?.trim()) ||
    (config.provider === 'ollama' && Boolean(config.selfHostedEndpoint?.trim()));

  const handleOrganismChange = async (id: OrganismId) => {
    const next = { ...config, organismId: id, name: ORGANISM_MODELS[id].name };
    setConfig(next);
    await configStorage.setValue(next);
    soundSynth.playChime('poke');
  };

  const handleToggleEnabled = async () => {
    const next = { ...config, enabled: !config.enabled };
    setConfig(next);
    await configStorage.setValue(next);
    if (!next.enabled) {
      soundSynth.playAlert();
    } else {
      soundSynth.playChime('poke');
    }
  };

  const handleToggleSound = async () => {
    const next = { ...config, soundEnabled: !config.soundEnabled };
    setConfig(next);
    await configStorage.setValue(next);
    soundSynth.setMuted(!next.soundEnabled);
  };

  const handleStartSprint = async () => {
    const targetMins = duration === 'flow' ? 0 : duration;
    const g = goalInput.trim() || (goals.find((m) => !m.completed)?.title ?? 'Deep Focus Block');
    await sendMessage('startSprint', { goal: g, targetMinutes: targetMins });
    soundSynth.playChime('start');
  };

  const handleStopSprint = async () => {
    await sendMessage('stopSprint', undefined);
    soundSynth.playChime('complete');
  };

  const handleDecomposeCurrentGoal = async () => {
    const textToDecompose = goalInput.trim();
    if (!textToDecompose || isDecomposing) return;
    setIsDecomposing(true);
    try {
      const res = await sendMessage('decomposeGoals', { intent: textToDecompose });
      if (res?.goals) {
        setGoals(res.goals);
        soundSynth.playChime('poke');
      }
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleToggleGoal = async (id: string, completed?: boolean, isActive?: boolean) => {
    await sendMessage('toggleGoal', { id, completed, isActive });
    if (completed) soundSynth.playChime('complete');
  };

  const handleDeleteGoal = async (id: string) => {
    await sendMessage('deleteGoal', { id });
  };

  const handleAddGoal = async (title: string, category: string) => {
    await sendMessage('addGoal', { title, category });
    soundSynth.playChime('poke');
  };

  const handleProviderSelect = (p: SupportedAiProvider) => {
    setSelectedProvider(p);
    const prov = SUPPORTED_PROVIDERS[p];
    if (prov) {
      setModelInput(prov.defaultModel);
      if (prov.defaultEndpoint) {
        setEndpointInput(prov.defaultEndpoint);
      }
    }
    setTestStatus(null);
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    const { testAiConnection: testConnection } = await import('@/lib/ai/engine');
    const res = await testConnection({
      provider: selectedProvider,
      apiKey: apiKeyInput.trim() || undefined,
      endpoint: endpointInput.trim() || undefined,
      model: modelInput.trim() || undefined,
    });
    setTestStatus({ loading: false, ok: res.ok, message: res.message });
  };

  const handleSaveSettings = async () => {
    const next: OrganismConfig = {
      ...config,
      mode: 'self-hosted',
      provider: selectedProvider,
      selfHostedEndpoint: endpointInput.trim() || 'http://localhost:11434/v1',
      selfHostedApiKey: apiKeyInput.trim(),
      selfHostedModel: modelInput.trim() || currentProviderConfig.defaultModel,
    };
    setConfig(next);
    await configStorage.setValue(next);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleCompleteOnboarding = async () => {
    const nextConfig: OrganismConfig = {
      ...config,
      mode: apiKeyInput.trim() ? 'self-hosted' : config.mode,
      selfHostedApiKey: apiKeyInput.trim(),
      provider: selectedProvider,
    };
    await configStorage.setValue(nextConfig);
    await onboardedStorage.setValue(true);
    setHasOnboarded(true);
  };

  const handleOpenSidePanel = async () => {
    try {
      const win = await browser.windows.getCurrent();
      if (win?.id) {
        await browser.sidePanel?.open({ windowId: win.id });
        window.close();
      }
    } catch {
      await sendMessage('openSidePanel', undefined);
    }
  };

  const isSprintActive = sprint.status === 'active';
  const isFlow = sprint.targetMinutes === 0;
  const elapsedSecs = isSprintActive ? Math.max(0, Math.floor((now - sprint.startedAt) / 1000)) : 0;
  const targetSecs = Math.max(1, (sprint.targetMinutes || 25) * 60);
  const clockSecs = isFlow ? elapsedSecs : Math.max(0, targetSecs - elapsedSecs);
  const progressPct = isSprintActive && !isFlow ? Math.min(100, Math.round((elapsedSecs / targetSecs) * 100)) : 0;
  const clockLabel = isFlow
    ? `${Math.floor(elapsedSecs / 60)}:${String(elapsedSecs % 60).padStart(2, '0')}`
    : `${Math.floor(clockSecs / 60)}:${String(clockSecs % 60).padStart(2, '0')}`;

  // ================= FIRST-RUN CONSENT =================
  if (!hasOnboarded) {
    return (
      <div className="w-[380px] bg-paper p-5 pb-4 flex flex-col text-paper-ink">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 shrink-0 bg-accent border-2 border-coal shadow-[2px_2px_0_0_#12151A]" />
          <h1 className="font-display font-bold text-lg tracking-tight">Welcome to Gremlin</h1>
        </div>
        <p className="mt-2 text-xs text-paper-muted leading-relaxed">The legal bit, in plain English:</p>

        <div className="mt-4 flex flex-col gap-3 text-[13px] leading-relaxed">
          <div className="flex gap-2.5 pb-3 border-b border-dashed border-paper-line">
            <Shield size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              <strong>During sprints only</strong>, Gremlin reads light page context from the current tab:
              title, headings, a short excerpt, domains visited.
            </p>
          </div>
          <div className="flex gap-2.5 pb-3 border-b border-dashed border-paper-line">
            <Sparkles size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              It goes to the <strong>AI provider you configure</strong> — or Gremlin Cloud if signed in — only
              to judge whether you're on task. Never sold, never used for ads.
            </p>
          </div>
          <div className="flex gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              Goals, notes, and stats stay <strong>on your device</strong>. Nothing is captured while idle.
            </p>
          </div>
        </div>

        <a
          href="https://gremlin.fasihi.xyz/privacy"
          target="_blank"
          rel="noreferrer"
          className="mt-4 text-xs underline text-paper-muted hover:text-paper-ink"
        >
          Full privacy policy →
        </a>

        <button
          onClick={handleCompleteOnboarding}
          className="mt-5 w-full py-2.5 text-sm font-bold bg-accent text-coal border-2 border-coal shadow-brut transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          Got it — enable companion
        </button>
        <button
          onClick={() => window.close()}
          className="w-full py-1.5 mt-1.5 text-xs font-mono font-bold text-paper-faint hover:text-paper-muted transition-colors cursor-pointer"
        >
          NOT NOW
        </button>
      </div>
    );
  }

  // ================= MAIN INTERFACE =================
  return (
    <div
      className="w-[380px] min-h-[520px] bg-paper p-4 flex flex-col gap-3.5 relative overflow-hidden text-paper-ink"
      style={{
        '--skin-accent': skin.colors.step9,
        '--skin-accent-hover': skin.colors.step10,
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0 gm-dots-bg" />

      {/* Header */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 shrink-0 border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--skin-accent)' }}
          >
            <AnimatedSprite id={config.organismId} size={33} state={organismState.state} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-tight text-paper-ink">
                {skin.name}
              </span>
              <span className={`w-2 h-2 shrink-0 ${config.enabled ? 'animate-pulse-dot' : ''}`} style={{ backgroundColor: config.enabled ? 'var(--skin-accent)' : '#C9CEB8' }} title={config.enabled ? 'Awake' : 'Asleep'} />
            </div>
            <span className="font-mono text-[10px] font-bold text-paper-muted block truncate max-w-[190px]">
              {skin.tagline}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleOpenSidePanel}
            className="text-paper-muted hover:text-coal transition-colors cursor-pointer"
            title="Diary (Ctrl+Shift+E)"
          >
            <BookOpen size={17} />
          </button>
          <button
            onClick={handleToggleSound}
            className={`transition-colors cursor-pointer ${config.soundEnabled ? 'text-coal' : 'text-paper-faint'}`}
            title={config.soundEnabled ? 'Mute' : 'Unmute'}
          >
            {config.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            className={`w-9 h-5 rounded-full border-2 relative cursor-pointer transition-colors ${config.enabled ? 'border-coal' : 'border-line'}`}
            style={config.enabled ? { backgroundColor: 'var(--skin-accent)' } : { backgroundColor: '#E4E7DE' }}
            onClick={handleToggleEnabled}
            title={config.enabled ? 'Sleep' : 'Wake'}
            role="switch"
            aria-checked={config.enabled}
          >
            <span className={`absolute top-[-1px] w-3.5 h-3.5 rounded-full bg-white border-2 transition-transform ${config.enabled ? 'border-coal left-[16px]' : 'border-line left-[-1px]'}`} />
          </button>
        </div>
      </header>

      {/* Companion strip — bare sprites */}
      <div className="grid grid-cols-8 gap-0.5 z-10 pt-1">
        {ALL_COMPANIONS.map((cid) => {
          const comp = CHARACTER_SKINS[cid];
          const isSelected = config.organismId === cid;
          return (
            <button
              key={cid}
              className={`flex flex-col items-center gap-0.5 pb-1.5 pt-1 cursor-pointer transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-75'}`}
              onClick={() => handleOrganismChange(cid)}
              title={`${comp.name} · ${comp.tagline}`}
            >
              <AnimatedSprite id={cid} size={19} state="idle" animated={isSelected} />
              <span className="font-mono text-[8px] font-bold text-paper-muted truncate max-w-full">{comp.name}</span>
              <span
                className="w-5 h-[3px] transition-colors"
                style={{ backgroundColor: isSelected ? 'var(--skin-accent)' : 'transparent' }}
              />
            </button>
          );
        })}
      </div>

      {/* Icon tabs */}
      <nav className="grid grid-cols-3 border-b-2 border-coal z-10" aria-label="Sections">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              className={`relative flex items-center justify-center h-9 pb-1 -mb-[2px] transition-colors cursor-pointer ${isActive ? 'text-paper-ink' : 'text-paper-faint hover:text-paper-muted'}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} strokeWidth={2.25} />
              <span
                className="absolute inset-x-3 -bottom-[2px] h-[3px] transition-colors"
                style={{ backgroundColor: isActive ? 'var(--skin-accent)' : 'transparent' }}
              />
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <main className="z-10 flex-1 flex flex-col">
        {/* ============ FOCUS ============ */}
        {activeTab === 'focus' && (
          <div className="flex-1 flex flex-col gap-4 pt-1">
            {!isConfigured && (
              <button
                onClick={() => setActiveTab('settings')}
                className="text-left font-mono font-bold text-[10px] uppercase tracking-wider text-red-600 hover:text-red-700 cursor-pointer"
              >
                ⚠ Not configured — fix →
              </button>
            )}

            {!isSprintActive ? (
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div>
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
                      Goal
                    </span>
                    <button
                      type="button"
                      onClick={handleDecomposeCurrentGoal}
                      disabled={!goalInput.trim() || isDecomposing}
                      className="font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ color: 'var(--skin-accent)' }}
                    >
                      <Sparkles size={11} />
                      <span>{isDecomposing ? '…' : 'Decompose'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="mt-1 w-full bg-transparent border-0 border-b-2 border-coal pb-1.5 text-paper-ink font-mono text-sm placeholder:text-paper-faint focus:outline-none"
                    placeholder="What are we working on?"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1">
                  {[15, 25, 45, 'flow' as const].map((d) => (
                    <button
                      key={String(d)}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer ${duration === d ? 'text-white' : 'text-paper-muted hover:text-paper-ink'}`}
                      style={duration === d ? { backgroundColor: 'var(--skin-accent)' } : {}}
                    >
                      {d === 'flow' ? '∞ flow' : `${d} min`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleStartSprint}
                  className="w-full p-3 flex justify-center items-center gap-2 font-display font-bold text-base text-white shadow-brut transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  style={{ backgroundColor: 'var(--skin-accent)', border: '2px solid #12151A' }}
                >
                  <Play size={17} fill="currentColor" />
                  <span>Start sprint</span>
                </button>

                <div className="flex-1 min-h-0 flex flex-col border-t-2 border-dashed border-line pt-2">
                  <GoalStack
                    goals={goals}
                    accentColor="var(--skin-accent)"
                    onDecompose={async (intent) => {
                      const res = await sendMessage('decomposeGoals', { intent });
                      if (res?.goals) setGoals(res.goals);
                    }}
                    onToggleGoal={handleToggleGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onAddGoal={handleAddGoal}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Live mission — flat, no card */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider truncate">
                    {sprint.goal || 'Focus sprint'}
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: 'var(--skin-accent)' }}>
                    {isFlow ? '∞ flow' : `${sprint.targetMinutes} min`}
                  </span>
                </div>

                <div className="font-display font-bold text-6xl tracking-tighter text-paper-ink text-center tabular-nums leading-none py-2">
                  {clockLabel}
                </div>

                <div>
                  <div className="relative h-1.5 w-full bg-paper-line overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
                    {isFlow ? (
                      <div className="absolute inset-y-0 w-1/4 animate-sprint-flow" style={{ backgroundColor: 'var(--skin-accent)' }} />
                    ) : (
                      <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${progressPct}%`, backgroundColor: 'var(--skin-accent)' }} />
                    )}
                  </div>
                  <div className="flex justify-between mt-1 font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">
                    <span>{isFlow ? 'no fixed end' : `${progressPct}%`}</span>
                    <span>{organismState.focusMinutesToday}m today · {organismState.divergenceCountToday} off-track</span>
                  </div>
                </div>

                {organismState.lastRemark && (
                  <p className="border-l-[3px] pl-2.5 font-mono text-[11px] font-bold italic text-paper-muted leading-relaxed" style={{ borderColor: 'var(--skin-accent)' }}>
                    “{organismState.lastRemark}”
                  </p>
                )}

                <button
                  onClick={handleStopSprint}
                  className="mt-auto w-full bg-coal text-paper px-4 py-2.5 font-display font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-85 cursor-pointer"
                >
                  <Square size={12} fill="currentColor" /> Finish
                </button>

                <div className="min-h-0 flex border-t-2 border-dashed border-line pt-2">
                  <GoalStack
                    goals={goals}
                    accentColor="var(--skin-accent)"
                    onDecompose={async (intent) => {
                      const res = await sendMessage('decomposeGoals', { intent });
                      if (res?.goals) setGoals(res.goals);
                    }}
                    onToggleGoal={handleToggleGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onAddGoal={handleAddGoal}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ PREFERENCES ============ */}
        {activeTab === 'preferences' && (
          <div className="flex-1 flex flex-col pt-1 divide-y divide-dashed divide-line">
            <button
              onClick={handleOpenSidePanel}
              className="group flex items-center justify-between py-3.5 text-left cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <BookOpen size={16} className="text-paper-muted group-hover:text-coal transition-colors" />
                <span>
                  <span className="block font-display font-semibold text-sm text-paper-ink">Daily diary</span>
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">Ctrl+Shift+E</span>
                </span>
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--skin-accent)' }}>Open →</span>
            </button>

            <div className="flex items-center justify-between py-3.5">
              <span className="font-display font-semibold text-sm text-paper-ink">Chirps & speech</span>
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={async (e) => {
                  const next = { ...config, soundEnabled: e.target.checked };
                  setConfig(next);
                  await configStorage.setValue(next);
                  soundSynth.setMuted(!e.target.checked);
                }}
                className="w-5 h-5 accent-[#A3E635] cursor-pointer"
              />
            </div>

            {config.soundEnabled && (
              <div className="flex items-center gap-3 py-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-faint w-10 shrink-0">{Math.round(config.volume * 100)}%</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.volume}
                  onChange={async (e) => {
                    const vol = parseFloat(e.target.value);
                    const next = { ...config, volume: vol };
                    setConfig(next);
                    await configStorage.setValue(next);
                    soundSynth.setVolume(vol);
                  }}
                  className="flex-1 cursor-pointer accent-[#A3E635] h-1.5 bg-paper-line appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-coal"
                />
              </div>
            )}

            <div className="py-3.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-sm text-paper-ink">Screen FX</span>
                <input
                  type="checkbox"
                  checked={config.effectsEnabled}
                  onChange={async (e) => {
                    const next = { ...config, effectsEnabled: e.target.checked };
                    setConfig(next);
                    await configStorage.setValue(next);
                  }}
                  className="w-5 h-5 accent-[#A3E635] cursor-pointer"
                />
              </div>
              {config.effectsEnabled && (
                <div className="flex items-center gap-3 mt-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-faint w-12 shrink-0">Chaos</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round((config.effectsIntensity ?? 0.45) * 100)}
                    onChange={async (e) => {
                      const intensity = parseInt(e.target.value, 10) / 100;
                      const next = { ...config, effectsIntensity: intensity };
                      setConfig(next);
                      await configStorage.setValue(next);
                    }}
                    className="flex-1 cursor-pointer accent-[#A3E635] h-1.5 bg-paper-line appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-coal"
                  />
                  <span className="font-mono text-[10px] font-bold text-paper-muted w-9 shrink-0 text-right">
                    {Math.round((config.effectsIntensity ?? 0.45) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ MODEL ============ */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col pt-1 min-h-0 overflow-y-auto">
            {!isConfigured && (
              <p className="pb-2 font-mono font-bold text-[10px] uppercase tracking-wider text-red-600">
                ⚠ Pick a provider & save
              </p>
            )}
            <div className="divide-y divide-dashed divide-line">
              {PROVIDER_ORDER.map((p) => {
                const prov = SUPPORTED_PROVIDERS[p];
                const isSelected = selectedProvider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderSelect(p)}
                    aria-pressed={isSelected}
                    className="w-full text-left py-2 flex items-center gap-2.5 cursor-pointer group"
                  >
                    <span
                      className="w-3.5 h-3.5 shrink-0 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: isSelected ? 'var(--skin-accent)' : '#C9CEB8' }}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--skin-accent)' }} />}
                    </span>
                    <span className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                      <span className={`font-display font-semibold text-[13px] leading-tight truncate transition-colors ${isSelected ? 'text-paper-ink' : 'text-paper-muted group-hover:text-paper-ink'}`}>
                        {prov.name}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">
                        {PROVIDER_META[p].blurb}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 space-y-3.5">
              {currentProviderConfig.requiresKey && (
                <div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">Key</span>
                  <input
                    type="password"
                    placeholder={currentProviderConfig.placeholderKey}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="mt-0.5 w-full bg-transparent border-0 border-b-2 border-line focus:border-coal pb-1 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none transition-colors"
                  />
                </div>
              )}

              {(selectedProvider === 'ollama' || selectedProvider === 'custom') && (
                <div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">Endpoint</span>
                  <input
                    type="text"
                    placeholder={currentProviderConfig.defaultEndpoint || 'http://localhost:8000/v1'}
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    className="mt-0.5 w-full bg-transparent border-0 border-b-2 border-line focus:border-coal pb-1 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">Model ID</span>
                <input
                  type="text"
                  placeholder={currentProviderConfig.defaultModel}
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="mt-0.5 w-full bg-transparent border-0 border-b-2 border-line focus:border-coal pb-1 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none transition-colors"
                />
                <p className="pt-0.5 font-mono text-[9px] text-paper-faint">
                  Defaults to {currentProviderConfig.defaultModel} — check your provider's docs for current IDs.
                </p>
              </div>

              <div className="flex items-center gap-3 pb-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="border-2 border-coal px-5 py-1.5 font-display font-bold text-xs text-white shadow-brut-sm transition-all hover:-translate-y-0.5 hover:shadow-brut active:translate-y-0 active:shadow-none cursor-pointer"
                  style={{ backgroundColor: 'var(--skin-accent)' }}
                >
                  {saveFeedback ? 'Saved ✓' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus?.loading}
                  className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted hover:text-paper-ink transition-colors cursor-pointer disabled:opacity-40"
                >
                  {testStatus?.loading ? 'Testing…' : 'Test connection'}
                </button>
                {testStatus && !testStatus.loading && (
                  <span className={`font-mono text-[10px] font-bold ${testStatus.ok ? 'text-green-700' : 'text-red-600'}`}>
                    {testStatus.ok ? '✓ OK' : '✕ failed'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
