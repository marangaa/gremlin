import { useEffect, useState } from 'react';
import {
  configStorage,
  sprintStorage,
  organismStateStorage,
  userSessionStorage,
  onboardedStorage,
  activityStorage,
  goalsStorage,
  telemetryStorage,
  type OrganismConfig,
  type FocusSprint,
  type OrganismStateData,
  type UserSession,
  type OperatingMode,
  type ActivityEntry,
  type DecomposedGoal,
  type AiTelemetryTrace,
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
import { TelemetryDrawer } from './components/TelemetryDrawer';
import {
  Volume2,
  VolumeX,
  ArrowRight,
  Shield,
  Sliders,
  Play,
  Square,
  Pause,
  Clock,
  Trash2,
  Flame,
  Globe,
  LogIn,
  LogOut,
  BookOpen,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import './App.css';

const ALL_COMPANIONS: OrganismId[] = ['Sarge', 'waifu', 'sherlock', 'kuro', 'sensei'];

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
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [session, setSession] = useState<UserSession>({ plan: 'free', isLoggedIn: false });
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(true);

  // Goals & Telemetry
  const [goals, setGoals] = useState<DecomposedGoal[]>([]);
  const [telemetryTraces, setTelemetryTraces] = useState<AiTelemetryTrace[]>([]);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  // Tabs: Focus, Preferences, Settings
  const [activeTab, setActiveTab] = useState<'focus' | 'preferences' | 'settings'>('focus');
  const [goalInput, setGoalInput] = useState('');
  const [duration, setDuration] = useState<number | 'flow'>(25);
  const [isDecomposing, setIsDecomposing] = useState(false);

  // Settings form states
  const [selectedProvider, setSelectedProvider] = useState<SupportedAiProvider>('google');
  const [endpointInput, setEndpointInput] = useState('http://localhost:11434/v1');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('gemini-2.5-flash');
  const [testStatus, setTestStatus] = useState<{ loading: boolean; ok?: boolean; message?: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Quick Cloud Sign-in state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    void configStorage.getValue().then((c: OrganismConfig) => {
      if (alive) {
        setConfig(c);
        setSelectedProvider(c.provider || 'google');
        setEndpointInput(c.selfHostedEndpoint || 'http://localhost:11434/v1');
        setApiKeyInput(c.selfHostedApiKey || '');
        setModelInput(c.selfHostedModel || SUPPORTED_PROVIDERS[c.provider || 'google']?.defaultModel || 'gemini-2.5-flash');
        soundSynth.setVolume(c.volume ?? 0.6);
        soundSynth.setMuted(!c.soundEnabled);
      }
    });

    void sprintStorage.getValue().then((s: FocusSprint) => alive && setSprint(s));
    void organismStateStorage.getValue().then((st: OrganismStateData) => alive && setOrganismState(st));
    void activityStorage.getValue().then((act: ActivityEntry[]) => alive && setActivityLog(act));
    void userSessionStorage.getValue().then((u: UserSession) => alive && setSession(u));
    void onboardedStorage.getValue().then((o: boolean) => alive && setHasOnboarded(o));
    void goalsStorage.getValue().then((g: DecomposedGoal[]) => alive && setGoals(g));
    void telemetryStorage.getValue().then((t: AiTelemetryTrace[]) => alive && setTelemetryTraces(t));

    const unwatchConfig = configStorage.watch((c: OrganismConfig | null) => c && setConfig(c));
    const unwatchSprint = sprintStorage.watch((s: FocusSprint | null) => s && setSprint(s));
    const unwatchState = organismStateStorage.watch((st: OrganismStateData | null) => st && setOrganismState(st));
    const unwatchActivity = activityStorage.watch((act: ActivityEntry[] | null) => act && setActivityLog(act));
    const unwatchSession = userSessionStorage.watch((u: UserSession | null) => u && setSession(u));
    const unwatchOnboard = onboardedStorage.watch((o: boolean | null) => o !== null && setHasOnboarded(o));
    const unwatchGoals = goalsStorage.watch((g: DecomposedGoal[] | null) => g && setGoals(g));
    const unwatchTelemetry = telemetryStorage.watch((t: AiTelemetryTrace[] | null) => t && setTelemetryTraces(t));

    return () => {
      alive = false;
      unwatchConfig();
      unwatchSprint();
      unwatchState();
      unwatchActivity();
      unwatchSession();
      unwatchOnboard();
      unwatchGoals();
      unwatchTelemetry();
    };
  }, []);

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

  const handleQuickCloudLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    setAuthError(null);

    try {
      await new Promise((r) => setTimeout(r, 600));
      const nextSession: UserSession = {
        plan: 'pro',
        isLoggedIn: true,
        email: authEmail,
      };
      await userSessionStorage.setValue(nextSession);
      setSession(nextSession);
      const nextConfig = { ...config, mode: 'cloud' as OperatingMode };
      setConfig(nextConfig);
      await configStorage.setValue(nextConfig);
    } catch {
      setAuthError('Invalid credentials. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCloudLogout = async () => {
    const nextSession: UserSession = { plan: 'free', isLoggedIn: false };
    await userSessionStorage.setValue(nextSession);
    setSession(nextSession);
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

  // Sprint Progress Calculations
  const isSprintActive = sprint.status === 'active';
  const elapsedSecs = isSprintActive ? Math.max(0, Math.floor((Date.now() - sprint.startedAt) / 1000)) : 0;
  const targetSecs = (sprint.targetMinutes || 25) * 60;
  const remainingSecs = Math.max(0, targetSecs - elapsedSecs);
  const remainingMins = Math.floor(remainingSecs / 60);
  const remainingSecsDisplay = String(remainingSecs % 60).padStart(2, '0');

  // ================= FIRST-RUN CONSENT (prominent disclosure) =================
  if (!hasOnboarded) {
    return (
      <div className="w-[380px] bg-base p-5 pb-4 flex flex-col text-ink">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 shrink-0 bg-accent border-2 border-coal shadow-[2px_2px_0_0_#12151A]" />
          <h1 className="font-display font-semibold text-lg tracking-tight">Welcome to Gremlin</h1>
        </div>
        <p className="mt-2 text-xs text-ink-muted leading-relaxed">Your pixel focus companion. Before we start, the legal bit — in plain English:</p>

        <div className="mt-4 flex flex-col gap-2.5 text-[13px] leading-relaxed border border-paper-line bg-paper-card text-paper-ink p-4 rounded-md shadow-paper">
          <div className="flex gap-2">
            <Shield size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              <strong>During active sprints only</strong>, Gremlin reads lightweight page context from your
              current tab: title, headings, a short text excerpt, and the domains you visit.
            </p>
          </div>
          <div className="flex gap-2">
            <Sparkles size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              That context is sent to the <strong>AI provider you configure</strong> (your own API key) or to
              Gremlin Cloud if you sign in, purely to judge whether you're on task. It is never sold or used
              for ads.
            </p>
          </div>
          <div className="flex gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-paper-muted" />
            <p>
              Goals, notes, and stats are stored <strong>locally on your device</strong>. Nothing is captured
              while idle or when tracking is disabled.
            </p>
          </div>
          <a
            href="https://gremlin.fasihi.xyz/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-xs underline text-paper-muted hover:text-paper-ink"
          >
            Read the full privacy policy →
          </a>
        </div>

        <button
          onClick={handleCompleteOnboarding}
          className="mt-6 w-full py-2.5 text-sm font-semibold bg-accent text-base-deep hover:bg-accent-bright transition-colors rounded-md cursor-pointer"
        >
          I understand — enable my companion
        </button>
        <button
          onClick={() => window.close()}
          className="w-full py-1.5 mt-1.5 text-xs text-ink-faint hover:text-ink-muted transition-colors cursor-pointer"
        >
          Not now
        </button>
      </div>
    );
  }

  // ================= MAIN INTERFACE =================
  return (
    <div
      className="w-[380px] min-h-[520px] bg-base p-4 flex flex-col gap-4 relative overflow-hidden text-ink"
      style={{
        '--skin-accent': skin.colors.step9,
        '--skin-accent-hover': skin.colors.step10,
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.10] z-0" style={{ backgroundSize: '16px 16px', backgroundImage: 'radial-gradient(circle, var(--skin-accent) 1px, transparent 1px)' }} />

      {/* Top Header - Cardless, clean lines */}
      <header className="flex items-center justify-between pb-3 border-b border-line z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 border border-line flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--skin-accent)' }}>
            <AnimatedSprite id={config.organismId} size={36} state={organismState.state} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-lg tracking-tight text-ink">
                {skin.name}
              </span>
              <span className="w-2.5 h-2.5 border border-line rounded-full animate-pulse" style={{ backgroundColor: 'var(--skin-accent)' }} />
            </div>
            <span className="font-mono text-[10px] font-bold text-ink-muted block truncate max-w-[170px]">
              "{organismState.lastRemark || skin.tagline}"
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 bg-surface border border-line flex items-center justify-center hover:bg-surface-raised transition-colors cursor-pointer"
            onClick={handleOpenSidePanel}
            title="Open Daily Diary Sidepanel (Ctrl+Shift+E)"
          >
            <BookOpen size={16} />
          </button>
          <button
            className={`w-8 h-8 flex items-center justify-center border border-line transition-colors cursor-pointer ${config.soundEnabled ? 'text-white' : 'bg-surface-raised text-ink-faint'} `}
            style={config.soundEnabled ? { backgroundColor: 'var(--skin-accent)' } : {}}
            onClick={handleToggleSound}
            title={config.soundEnabled ? 'Mute audio' : 'Enable audio'}
          >
            {config.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            className={`w-10 h-6 rounded-full border border-line relative cursor-pointer transition-colors ${config.enabled ? '' : 'bg-surface-raised'}`}
            style={config.enabled ? { backgroundColor: 'var(--skin-accent)' } : {}}
            onClick={handleToggleEnabled}
            title={config.enabled ? 'Sleep' : 'Wake'}
          >
            <span className={`absolute top-[1px] w-4 h-4 rounded-full bg-surface border border-line transition-transform ${config.enabled ? 'left-[17px]' : 'left-[1px]'}`} />
          </button>
        </div>
      </header>

      {/* Companion Switcher Strip - Flat Grid */}
      <div className="grid grid-cols-5 gap-1.5 z-10 pb-2 border-b border-line">
        {ALL_COMPANIONS.map((cid) => {
          const comp = CHARACTER_SKINS[cid];
          const isSelected = config.organismId === cid;
          return (
            <button
              key={cid}
              className={`flex flex-col items-center gap-1 border border-line py-1 cursor-pointer transition-colors ${isSelected ? 'text-white' : 'bg-surface hover:bg-surface-raised'} `}
              style={isSelected ? { backgroundColor: 'var(--skin-accent)' } : {}}
              onClick={() => handleOrganismChange(cid)}
            >
              <AnimatedSprite id={cid} size={20} state="idle" />
              <span className={`font-mono text-[9px] font-bold ${isSelected ? 'text-white' : 'text-ink-muted'}`}>{comp.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3 Navigation Tabs - Streamlined */}
      <nav className="grid grid-cols-3 gap-1.5 z-10 font-display font-semibold text-sm">
        <button
          className={`flex items-center justify-center gap-1 border border-line py-1.5 cursor-pointer transition-colors ${activeTab === 'focus' ? 'text-white' : 'bg-surface text-ink hover:bg-surface-raised'} `}
          style={activeTab === 'focus' ? { backgroundColor: 'var(--skin-accent)' } : {}}
          onClick={() => setActiveTab('focus')}
        >
          <Play size={14} />
          <span>FOCUS</span>
        </button>
        <button
          className={`flex items-center justify-center gap-1 border border-line py-1.5 cursor-pointer transition-colors ${activeTab === 'preferences' ? 'text-white' : 'bg-surface text-ink hover:bg-surface-raised'} `}
          style={activeTab === 'preferences' ? { backgroundColor: 'var(--skin-accent)' } : {}}
          onClick={() => setActiveTab('preferences')}
        >
          <Sliders size={14} />
          <span>Preferences</span>
        </button>
        <button
          className={`flex items-center justify-center gap-1 border border-line py-1.5 cursor-pointer transition-colors ${activeTab === 'settings' ? 'text-white' : 'bg-surface text-ink hover:bg-surface-raised'} `}
          style={activeTab === 'settings' ? { backgroundColor: 'var(--skin-accent)' } : {}}
          onClick={() => setActiveTab('settings')}
        >
          <Shield size={14} />
          <span>Model</span>
        </button>
      </nav>

      {/* Main Tab Content Flow */}
      <main className="z-10 flex-1 flex flex-col pt-2">
        {/* ================= 1. UNIFIED FOCUS TAB ================= */}
        {activeTab === 'focus' && (
          <div className="flex-1 flex flex-col gap-4">
            {!isConfigured && (
              <div className="bg-base-deep border border-line text-danger p-2 flex items-center justify-between font-mono font-bold text-[10px]">
                <span className="">⚠ Agent unconfigured</span>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="border border-line-bright px-2 py-0.5 hover:bg-surface-raised transition-colors"
                >
                  FIX NOW →
                </button>
              </div>
            )}

            {!isSprintActive ? (
              <div className="flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-sm">
                      Sprint goal
                    </span>
                    <button
                      type="button"
                      onClick={handleDecomposeCurrentGoal}
                      disabled={!goalInput.trim() || isDecomposing}
                      className="font-mono text-[10px] font-bold text-white px-2 py-1 border border-line disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: 'var(--skin-accent)' }}
                    >
                      <Sparkles size={12} />
                      <span>{isDecomposing ? 'SPLITTING…' : 'AI DECOMPOSE'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full bg-base border border-line p-3 text-ink font-mono text-sm placeholder:text-ink-faint focus:outline-none focus:bg-surface transition-colors"
                    placeholder="e.g. Finish landing page refactor..."
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between border-y-2 border-line py-2">
                  <span className="font-display font-semibold text-xs">DURATION:</span>
                  <div className="flex gap-2">
                    {[15, 25, 45, 'flow' as const].map((d) => (
                      <button
                        key={String(d)}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={`px-3 py-1 border border-line font-mono font-bold text-[11px] transition-colors cursor-pointer ${ duration === d ? 'text-white' : 'bg-surface text-ink hover:bg-surface-raised' } `}
                        style={duration === d ? { backgroundColor: 'var(--skin-accent)' } : {}}
                      >
                        {d === 'flow' ? '∞' : `${d}m`}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStartSprint}
                  className="w-full border border-line p-4 flex justify-center items-center gap-2 font-display font-semibold text-lg text-white hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ backgroundColor: 'var(--skin-accent)' }}
                >
                  <Play size={20} fill="currentColor" />
                  <span>Start focus sprint</span>
                </button>

                <div className="flex-1 min-h-0 pt-2">
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
                <div className="border border-line p-5 text-center space-y-3 relative overflow-hidden" style={{ backgroundColor: 'var(--skin-accent)' }}>
                  <div className="absolute top-2 right-2 text-white animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-surface border border-line" />
                  </div>
                  <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-accent bg-base-deep px-3 py-1 inline-block border border-line">
                    🎯 {sprint.goal || 'FOCUS SPRINT'}
                  </span>

                  <div className="font-display font-semibold text-5xl tracking-tighter text-ink py-2">
                    {sprint.targetMinutes === 0
                      ? `${Math.floor(elapsedSecs / 60)}m ${String(elapsedSecs % 60).padStart(2, '0')}s`
                      : `${remainingMins}:${remainingSecsDisplay}`}
                  </div>

                  <div className="font-mono text-[11px] font-bold bg-surface border border-line p-2 inline-block max-w-[90%] text-ink">
                    “{organismState.lastRemark || skin.greeting}”
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={handleStopSprint}
                      className="bg-accent text-base-deep border border-line px-4 py-2 font-display font-semibold text-sm flex items-center hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <Square size={16} fill="currentColor" className="mr-2" /> Finish sprint
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 pt-2">
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

        {/* ================= 2. PREFERENCES TAB ================= */}
        {activeTab === 'preferences' && (
          <div className="flex-1 flex flex-col gap-6 pt-2">
            <div className="text-white border border-line p-4 flex items-center justify-between" style={{ backgroundColor: 'var(--skin-accent)' }}>
              <div className="space-y-1">
                <span className="font-display font-semibold text-lg block">
                  Daily Diary
                </span>
                <span className="font-mono text-[10px] font-bold bg-black px-1 py-0.5 inline-block">
                  Ctrl+Shift+E
                </span>
              </div>
              <button
                onClick={handleOpenSidePanel}
                className="bg-surface border border-line text-ink font-display font-semibold px-4 py-2 hover:bg-surface-raised transition-colors cursor-pointer"
              >
                OPEN
              </button>
            </div>

            <div className="space-y-4">
              <span className="font-display font-semibold text-sm border-b border-line pb-1 block">
                Audio Engine
              </span>
              <div className="flex items-center justify-between font-mono font-bold text-xs text-ink">
                <span>Companions Chime & Speak</span>
                <input
                  type="checkbox"
                  checked={config.soundEnabled}
                  onChange={async (e) => {
                    const next = { ...config, soundEnabled: e.target.checked };
                    setConfig(next);
                    await configStorage.setValue(next);
                    soundSynth.setMuted(!e.target.checked);
                  }}
                  className="w-5 h-5 accent-[#A3E635] border border-line cursor-pointer"
                />
              </div>
              {config.soundEnabled && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="font-mono font-bold text-[10px] text-ink-muted">VOL: {Math.round(config.volume * 100)}%</span>
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
                    className="flex-1 cursor-pointer accent-[#A3E635] h-2 bg-surface-raised border border-line rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <span className="font-display font-semibold text-sm border-b border-line pb-1 block">
                Visual FX
              </span>
              <div className="flex items-center justify-between font-mono font-bold text-xs text-ink">
                <span>Distraction Screen Glitch</span>
                <input
                  type="checkbox"
                  checked={config.effectsEnabled}
                  onChange={async (e) => {
                    const next = { ...config, effectsEnabled: e.target.checked };
                    setConfig(next);
                    await configStorage.setValue(next);
                  }}
                  className="w-5 h-5 accent-[#A3E635] border border-line cursor-pointer"
                />
              </div>
              <button
                className="w-full bg-accent text-base-deep border border-line py-2 font-display font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer mt-2"
                onClick={() => handlePreviewEffect(config.organismId)}
              >
                Test effect
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. Model & SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col gap-4 pt-2">
            <div className="space-y-3">
              <span className="font-display font-semibold text-sm border-b border-line pb-1 block">
                AI Provider
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['google', 'anthropic', 'openai', 'groq', 'ollama'] as SupportedAiProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderSelect(p)}
                    className={`p-2 border border-line text-center font-display font-semibold text-xs cursor-pointer transition-colors ${ selectedProvider === p ? 'text-white' : 'bg-surface text-ink hover:bg-surface-raised' } `}
                    style={selectedProvider === p ? { backgroundColor: 'var(--skin-accent)' } : {}}
                  >
                    {SUPPORTED_PROVIDERS[p].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {currentProviderConfig.requiresKey && (
                <div className="space-y-1">
                  <span className="font-mono font-bold text-[10px] text-ink-muted">API Key</span>
                  <input
                    type="password"
                    placeholder={currentProviderConfig.placeholderKey}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-base border border-line p-2 font-mono text-xs focus:outline-none focus:bg-surface transition-colors"
                  />
                </div>
              )}

              {selectedProvider === 'ollama' && (
                <div className="space-y-1">
                  <span className="font-mono font-bold text-[10px] text-ink-muted">Endpoint</span>
                  <input
                    type="text"
                    placeholder="http://localhost:11434/v1"
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    className="w-full bg-base border border-line p-2 font-mono text-xs focus:outline-none focus:bg-surface transition-colors"
                  />
                </div>
              )}

              <div className="space-y-1">
                <span className="font-mono font-bold text-[10px] text-ink-muted">Model ID</span>
                <input
                  type="text"
                  placeholder={currentProviderConfig.defaultModel}
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="w-full bg-base border border-line p-2 font-mono text-xs focus:outline-none focus:bg-surface transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus?.loading}
                  className="flex-1 bg-surface border border-line py-2 font-display font-semibold text-xs hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  {testStatus?.loading ? 'TESTING…' : 'TEST'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex-[2] border border-line py-2 font-display font-semibold text-xs text-white hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ backgroundColor: 'var(--skin-accent)' }}
                >
                  {saveFeedback ? 'SAVED ✓' : 'SAVE SETTINGS'}
                </button>
              </div>

              {testStatus && (
                <div
                  className={`p-3 border border-line font-mono font-bold text-xs ${ testStatus.ok ? 'bg-green-400 text-ink' : 'bg-red-500 text-white' } `}
                >
                  {testStatus.message || (testStatus.ok ? 'SUCCESS!' : 'FAILED')}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
