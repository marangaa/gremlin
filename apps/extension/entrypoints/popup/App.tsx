import { useEffect, useState } from 'react';
import { storage } from '#imports';
import {
  configStorage,
  sprintStorage,
  organismStateStorage,
  userSessionStorage,
  onboardedStorage,
  goalsStorage,
  type OrganismConfig,
  type FocusSprint,
  type OrganismStateData,
  type UserSession,
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
  Sliders,
  Cpu,
  Play,
  Square,
  Sparkles,
  Shield,
  BookOpen,
  CheckCircle2,
  Flame,
  Clock,
  Zap,
} from 'lucide-react';
import './App.css';

const ALL_COMPANIONS: OrganismId[] = ['Sarge', 'waifu', 'sherlock', 'kuro', 'sensei'];

const TABS = [
  { id: 'focus', label: 'Focus', Icon: Timer },
  { id: 'preferences', label: 'Prefs', Icon: Sliders },
  { id: 'settings', label: 'Model', Icon: Cpu },
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
  const [session, setSession] = useState<UserSession>({ plan: 'free', isLoggedIn: false });
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
      userSessionStorage,
      onboardedStorage,
      goalsStorage,
    ]).then(([c, s, st, u, o, g]) => {
      if (!alive || !c || !s || !st || !u || !o || !g) return;
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
      setSession(u.value as UserSession);
      setHasOnboarded(o.value as boolean);
      setGoals(g.value as DecomposedGoal[]);
    });

    const unwatchConfig = configStorage.watch((c: OrganismConfig | null) => c && setConfig(c));
    const unwatchSprint = sprintStorage.watch((s: FocusSprint | null) => s && setSprint(s));
    const unwatchState = organismStateStorage.watch((st: OrganismStateData | null) => st && setOrganismState(st));
    const unwatchSession = userSessionStorage.watch((u: UserSession | null) => u && setSession(u));
    const unwatchOnboard = onboardedStorage.watch((o: boolean | null) => o !== null && setHasOnboarded(o));
    const unwatchGoals = goalsStorage.watch((g: DecomposedGoal[] | null) => g && setGoals(g));

    return () => {
      alive = false;
      unwatchConfig();
      unwatchSprint();
      unwatchState();
      unwatchSession();
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
    (config.provider === 'ollama' && Boolean(config.selfHostedEndpoint?.trim())) ||
    (config.mode === 'cloud' && session.isLoggedIn);

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

  const handlePreviewEffect = async (cid: OrganismId) => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await sendMessage('testScreenEffect', { organismId: cid }, tabs[0].id);
      }
    } catch (err) {
      console.warn('Could not send testScreenEffect to active tab:', err);
    }
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
      const win = await chrome.windows.getCurrent();
      if (win?.id) {
        await chrome.sidePanel?.open({ windowId: win.id });
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

        <div className="mt-4 flex flex-col gap-3 text-[13px] leading-relaxed bg-white p-4 rounded-none border-2 border-coal shadow-brut">
          <div className="flex gap-2">
            <Shield size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              <strong>During sprints only</strong>, Gremlin reads light page context from the current tab:
              title, headings, a short excerpt, domains visited.
            </p>
          </div>
          <div className="flex gap-2">
            <Sparkles size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              It goes to the <strong>AI provider you configure</strong> — or Gremlin Cloud if signed in — only
              to judge whether you're on task. Never sold, never used for ads.
            </p>
          </div>
          <div className="flex gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              Goals, notes, and stats stay <strong>on your device</strong>. Nothing is captured while idle.
            </p>
          </div>
          <a
            href="https://gremlin.fasihi.xyz/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-xs underline text-paper-muted hover:text-paper-ink"
          >
            Full privacy policy →
          </a>
        </div>

        <button
          onClick={handleCompleteOnboarding}
          className="mt-6 w-full py-2.5 text-sm font-bold bg-accent text-coal border-2 border-coal shadow-brut transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
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
      className="w-[380px] min-h-[520px] bg-paper p-4 flex flex-col gap-4 relative overflow-hidden text-paper-ink"
      style={{
        '--skin-accent': skin.colors.step9,
        '--skin-accent-hover': skin.colors.step10,
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0 gm-dots-bg" />

      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b-2 border-dashed border-line z-10">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--skin-accent)' }}
          >
            <AnimatedSprite id={config.organismId} size={36} state={organismState.state} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-tight text-paper-ink">
                {skin.name}
              </span>
              <span className={`w-2 h-2 ${config.enabled ? 'animate-pulse-dot' : ''}`} style={{ backgroundColor: config.enabled ? 'var(--skin-accent)' : '#C9CEB8' }} title={config.enabled ? 'Awake' : 'Asleep'} />
            </div>
            <span className="font-mono text-[10px] font-bold text-paper-muted block truncate max-w-[170px]">
              "{organismState.lastRemark || skin.tagline}"
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className="w-8 h-8 bg-white border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center text-coal transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer"
            onClick={handleOpenSidePanel}
            title="Diary sidepanel (Ctrl+Shift+E)"
          >
            <BookOpen size={15} />
          </button>
          <button
            className={`w-8 h-8 border-2 border-coal flex items-center justify-center transition-all cursor-pointer ${config.soundEnabled ? 'text-white shadow-[2px_2px_0_0_#12151A]' : 'bg-white text-paper-faint shadow-[2px_2px_0_0_#12151A]'}`}
            style={config.soundEnabled ? { backgroundColor: 'var(--skin-accent)' } : {}}
            onClick={handleToggleSound}
            title={config.soundEnabled ? 'Mute' : 'Unmute'}
          >
            {config.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button
            className={`w-10 h-6 rounded-full border-2 border-coal relative cursor-pointer transition-colors ${config.enabled ? '' : 'bg-white'}`}
            style={config.enabled ? { backgroundColor: 'var(--skin-accent)' } : {}}
            onClick={handleToggleEnabled}
            title={config.enabled ? 'Sleep' : 'Wake'}
            role="switch"
            aria-checked={config.enabled}
          >
            <span className={`absolute top-[1px] w-4 h-4 rounded-full bg-white border-2 border-coal transition-transform ${config.enabled ? 'left-[17px]' : 'left-[0px]'}`} />
          </button>
        </div>
      </header>

      {/* Companion strip */}
      <div className="grid grid-cols-5 gap-1.5 z-10">
        {ALL_COMPANIONS.map((cid) => {
          const comp = CHARACTER_SKINS[cid];
          const isSelected = config.organismId === cid;
          return (
            <button
              key={cid}
              className={`flex flex-col items-center gap-1 py-1.5 cursor-pointer transition-all border-2 border-coal ${isSelected ? 'text-white shadow-[3px_3px_0_0_#12151A] -translate-y-px' : 'bg-white shadow-[2px_2px_0_0_#12151A] hover:-translate-y-px hover:shadow-[3px_3px_0_0_#12151A]'}`}
              style={isSelected ? { backgroundColor: 'var(--skin-accent)' } : {}}
              onClick={() => handleOrganismChange(cid)}
              title={comp.name}
            >
              <AnimatedSprite id={cid} size={20} state="idle" />
              <span className={`font-mono text-[9px] font-bold ${isSelected ? 'text-white' : 'text-paper-muted'}`}>{comp.name}</span>
            </button>
          );
        })}
      </div>

      {/* Icon tabs */}
      <nav className="grid grid-cols-3 gap-1.5 z-10" aria-label="Sections">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              className={`h-9 border-2 border-coal flex items-center justify-center gap-1.5 transition-all cursor-pointer ${isActive ? 'text-white -translate-y-px shadow-[3px_3px_0_0_#12151A]' : 'bg-white text-paper-muted hover:text-paper-ink hover:-translate-y-px hover:shadow-[3px_3px_0_0_#12151A]'}`}
              style={isActive ? { backgroundColor: 'var(--skin-accent)' } : {}}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={14} />
              <span className="font-mono text-[10px] font-bold tracking-wide">{label.toUpperCase()}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <main className="z-10 flex-1 flex flex-col pt-1">
        {/* ============ FOCUS ============ */}
        {activeTab === 'focus' && (
          <div className="flex-1 flex flex-col gap-4">
            {!isConfigured && (
              <div className="bg-pop-yellow border-2 border-coal shadow-[2px_2px_0_0_#12151A] p-2 flex items-center justify-between font-mono font-bold text-[10px]">
                <span>NOT CONFIGURED</span>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="font-mono font-bold px-2 py-0.5 border-2 border-coal bg-white transition-colors hover:bg-accent cursor-pointer"
                >
                  FIX →
                </button>
              </div>
            )}

            {!isSprintActive ? (
              <div className="flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
                      Goal
                    </span>
                    <button
                      type="button"
                      onClick={handleDecomposeCurrentGoal}
                      disabled={!goalInput.trim() || isDecomposing}
                      className="font-mono text-[10px] font-bold text-white px-2 py-0.5 border-2 border-coal shadow-[2px_2px_0_0_#12151A] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-1 transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer"
                      style={{ backgroundColor: 'var(--skin-accent)' }}
                    >
                      <Sparkles size={11} />
                      <span>{isDecomposing ? '…' : 'DECOMPOSE'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full bg-white border-2 border-coal p-3 text-paper-ink font-mono text-sm placeholder:text-paper-faint focus:outline-none focus:shadow-brut-sm transition-shadow"
                    placeholder="Finish landing page refactor…"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                  />
                </div>

                <div className="flex gap-1.5">
                  {[15, 25, 45, 'flow' as const].map((d) => (
                    <button
                      key={String(d)}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-1.5 border-2 border-coal font-mono font-bold text-[11px] transition-all cursor-pointer ${duration === d ? 'text-white -translate-y-px shadow-[3px_3px_0_0_#12151A]' : 'bg-white text-paper-muted hover:-translate-y-px hover:shadow-[3px_3px_0_0_#12151A]'}`}
                      style={duration === d ? { backgroundColor: 'var(--skin-accent)' } : {}}
                    >
                      {d === 'flow' ? '∞' : d}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleStartSprint}
                  className="w-full border-2 border-coal p-3.5 flex justify-center items-center gap-2 font-display font-bold text-lg text-white shadow-brut transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  style={{ backgroundColor: 'var(--skin-accent)' }}
                >
                  <Play size={19} fill="currentColor" />
                  <span>START SPRINT</span>
                </button>

                <div className="flex-1 min-h-0 pt-1">
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
              <div className="flex-1 flex flex-col gap-4">
                {/* Mission card */}
                <div className="bg-white border-2 border-coal shadow-brut p-5 relative">
                  <div className="absolute inset-x-0 top-0 h-1.5 border-b-2 border-coal" style={{ backgroundColor: 'var(--skin-accent)' }} />

                  <div className="flex items-center justify-between gap-2 pt-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-ink bg-paper px-2 py-1 border-2 border-coal inline-flex items-center min-w-0">
                      <span className="truncate">{sprint.goal || 'Focus sprint'}</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold shrink-0 inline-flex items-center gap-1 px-2 py-1 text-white" style={{ backgroundColor: 'var(--skin-accent)' }}>
                      <Zap size={10} fill="currentColor" />
                      {isFlow ? '∞ FLOW' : `${sprint.targetMinutes} MIN`}
                    </span>
                  </div>

                  <div className="font-display font-bold text-5xl tracking-tighter text-paper-ink text-center tabular-nums py-4">
                    {clockLabel}
                  </div>

                  <div className="relative h-2 w-full bg-paper border-2 border-coal overflow-hidden mb-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
                    {isFlow ? (
                      <div className="absolute inset-y-0 w-1/3 animate-sprint-flow" style={{ backgroundColor: 'var(--skin-accent)' }} />
                    ) : (
                      <div className="absolute inset-y-0 left-0 transition-all duration-1000 ease-linear" style={{ width: `${progressPct}%`, backgroundColor: 'var(--skin-accent)' }} />
                    )}
                  </div>
                  <div className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">
                    {isFlow ? (
                      <>
                        <span>No fixed end</span>
                        <span>{Math.floor(elapsedSecs / 60)}m up</span>
                      </>
                    ) : (
                      <>
                        <span>{progressPct}%</span>
                        <span>-{Math.floor(elapsedSecs / 60)}m</span>
                      </>
                    )}
                  </div>

                  <div className="relative bg-paper border-2 border-coal mt-4 px-3 py-2 font-mono text-[11px] font-bold text-paper-muted leading-relaxed">
                    “{organismState.lastRemark || skin.greeting}”
                  </div>

                  <div className="flex items-center gap-3 justify-center mt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {organismState.focusMinutesToday}m today</span>
                    <span className="inline-flex items-center gap-1"><Flame size={11} /> {organismState.divergenceCountToday} off-track</span>
                  </div>

                  <button
                    onClick={handleStopSprint}
                    className="mt-4 w-full bg-coal text-paper border-2 border-coal px-4 py-2.5 font-display font-bold text-sm flex items-center justify-center gap-2 shadow-[3px_3px_0_0_#65A30D] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#65A30D] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  >
                    <Square size={13} fill="currentColor" /> FINISH
                  </button>
                </div>

                <div className="flex-1 min-h-0 pt-1">
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
          <div className="flex-1 flex flex-col gap-4 pt-1">
            <div className="border-2 border-coal shadow-brut p-4 flex items-center justify-between text-white" style={{ backgroundColor: 'var(--skin-accent)' }}>
              <div className="space-y-1.5">
                <span className="font-display font-bold text-lg block">
                  Daily Diary
                </span>
                <span className="font-mono text-[10px] font-bold bg-black/25 px-1.5 py-0.5 inline-block">
                  CTRL+SHIFT+E
                </span>
              </div>
              <button
                onClick={handleOpenSidePanel}
                className="bg-white text-coal border-2 border-coal font-display font-bold px-4 py-2 shadow-[2px_2px_0_0_#12151A] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer"
              >
                OPEN
              </button>
            </div>

            <div className="bg-white border-2 border-coal shadow-brut p-4 space-y-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted block border-b-2 border-dashed border-line pb-2">
                Audio
              </span>
              <div className="flex items-center justify-between font-mono font-bold text-xs text-paper-ink">
                <span>Chirps & speech</span>
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
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="font-mono font-bold text-[10px] text-paper-muted">{Math.round(config.volume * 100)}%</span>
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
                    className="flex-1 cursor-pointer accent-[#A3E635] h-2 bg-paper border-2 border-coal appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-coal"
                  />
                </div>
              )}
            </div>

            <div className="bg-white border-2 border-coal shadow-brut p-4 space-y-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted block border-b-2 border-dashed border-line pb-2">
                Visual FX
              </span>
              <div className="flex items-center justify-between font-mono font-bold text-xs text-paper-ink">
                <span>Screen glitch</span>
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
              <button
                className="w-full bg-white border-2 border-coal py-2 font-display font-bold text-sm shadow-brut-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                onClick={() => handlePreviewEffect(config.organismId)}
              >
                PREVIEW
              </button>
            </div>
          </div>
        )}

        {/* ============ MODEL ============ */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col gap-4 pt-1">
            <div className="space-y-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted block">
                Provider
              </span>
              <div className="flex flex-col gap-1.5">
                {PROVIDER_ORDER.map((p) => {
                  const prov = SUPPORTED_PROVIDERS[p];
                  const isSelected = selectedProvider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProviderSelect(p)}
                      aria-pressed={isSelected}
                      className={`w-full text-left border-2 border-coal p-2 flex items-center justify-between gap-2 transition-all cursor-pointer ${isSelected ? '-translate-y-px shadow-[3px_3px_0_0_#12151A]' : 'bg-white shadow-[2px_2px_0_0_#12151A] hover:-translate-y-px hover:shadow-[3px_3px_0_0_#12151A]'}`}
                      style={isSelected ? { backgroundColor: 'var(--skin-accent)' } : {}}
                    >
                      <span className="min-w-0">
                        <span className={`block font-display font-semibold text-xs ${isSelected ? 'text-white' : 'text-paper-ink'}`}>
                          {prov.name}
                        </span>
                        <span className={`block font-mono text-[9px] truncate ${isSelected ? 'text-white/85' : 'text-paper-muted'}`}>
                          {PROVIDER_META[p].blurb}
                        </span>
                      </span>
                      <span className={`w-3.5 h-3.5 shrink-0 border-2 flex items-center justify-center ${isSelected ? 'border-white' : 'border-paper-faint'}`}>
                        {isSelected && <span className="w-1.5 h-1.5 bg-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {currentProviderConfig.requiresKey && (
                <div className="space-y-1">
                  <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-paper-muted">Key</span>
                  <input
                    type="password"
                    placeholder={currentProviderConfig.placeholderKey}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-white border-2 border-coal p-2 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none focus:shadow-brut-sm transition-shadow"
                  />
                </div>
              )}

              {(selectedProvider === 'ollama' || selectedProvider === 'custom') && (
                <div className="space-y-1">
                  <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-paper-muted">Endpoint</span>
                  <input
                    type="text"
                    placeholder={currentProviderConfig.defaultEndpoint || 'http://localhost:8000/v1'}
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    className="w-full bg-white border-2 border-coal p-2 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none focus:shadow-brut-sm transition-shadow"
                  />
                </div>
              )}

              <div className="space-y-1">
                <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-paper-muted">Model</span>
                <input
                  type="text"
                  placeholder={currentProviderConfig.defaultModel}
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="w-full bg-white border-2 border-coal p-2 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none focus:shadow-brut-sm transition-shadow"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {currentProviderConfig.popularModels.filter((m) => m !== 'custom-model').map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModelInput(m)}
                      className={`font-mono text-[9px] font-bold px-1.5 py-0.5 border-2 border-coal transition-all cursor-pointer ${modelInput === m ? '-translate-y-px shadow-[2px_2px_0_0_#12151A]' : 'bg-white text-paper-muted hover:-translate-y-px hover:shadow-[2px_2px_0_0_#12151A]'}`}
                      style={modelInput === m ? { backgroundColor: 'var(--skin-accent)', color: '#fff' } : {}}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus?.loading}
                  className="flex-1 bg-white border-2 border-coal py-2 font-display font-bold text-xs shadow-brut-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {testStatus?.loading ? '…' : 'TEST'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex-[2] border-2 border-coal py-2 font-display font-bold text-xs text-white shadow-brut-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  style={{ backgroundColor: 'var(--skin-accent)' }}
                >
                  {saveFeedback ? 'SAVED ✓' : 'SAVE'}
                </button>
              </div>

              {testStatus && (
                <div
                  className={`p-2.5 font-mono font-bold text-xs border-2 border-coal ${testStatus.ok ? 'bg-accent text-coal' : 'bg-pop-pink text-coal'}`}
                >
                  {testStatus.message || (testStatus.ok ? 'OK' : 'FAILED')}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
