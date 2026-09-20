import { useEffect, useState } from 'react';
import { storage } from '#imports';
import {
  configStorage,
  sprintStorage,
  organismStateStorage,
  userSessionStorage,
  onboardedStorage,
  goalsStorage,
  notesStorage,
  telemetryStorage,
  type OrganismConfig,
  type FocusSprint,
  type OrganismStateData,
  type UserSession,
  type OperatingMode,
  type DecomposedGoal,
  type SmartPageNote,
  type AgentTelemetryData,
} from '@/lib/storage';
import { authClient } from '@/lib/auth/client';
import {
  ORGANISM_MODELS,
  type OrganismId,
} from '@/lib/personalities/types';
import { CHARACTER_SKINS } from '@/lib/personalities/skins';
import { sendMessage } from '@/lib/messaging';
import { soundSynth } from '@/lib/audio/soundEngine';
import { API_BASE_URL, WEB_APP_URL } from '@/lib/api/client';
import {
  SUPPORTED_PROVIDERS,
  fetchLiveProviderModels,
  type SupportedAiProvider,
  type DiscoveredModelOption,
} from '@/lib/ai/providers';
import { AnimatedSprite } from './components/AnimatedSprite';
import { GoalStack } from './components/GoalStack';
import { FocusTelemetryHUD } from './components/FocusTelemetryHUD';
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
  Eye,
  EyeOff,
  RefreshCw,
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
  mode: 'byok',
  organismId: 'Sarge',
  name: 'Sarge',
  enabled: true,
  provider: 'google',
  byokEndpoint: 'http://localhost:11434/v1',
  byokApiKey: '',
  byokModel: '',
  selfHostedEndpoint: 'http://localhost:11434/v1',
  selfHostedApiKey: '',
  selfHostedModel: '',
  xFrac: 0.9,
  yFrac: 0.82,
  soundEnabled: true,
  volume: 0.6,
  effectsEnabled: true,
};

const DEFAULT_SPRINT: FocusSprint = {
  goal: '',
  targetMinutes: 0,
  startedAt: 0,
  status: 'idle',
  isContinuousFlow: true,
};

const DEFAULT_ORGANISM_STATE: OrganismStateData = {
  state: 'idle',
  lastRemark: undefined,
  lastRemarkAt: 0,
  focusMinutesToday: 0,
  divergenceCountToday: 0,
  contextSwitchesToday: 0,
  escalationLevel: 0,
  lastObservationAt: 0,
};

export default function App() {
  const [config, setConfig] = useState<OrganismConfig>(DEFAULT_CONFIG);
  const [sprint, setSprint] = useState<FocusSprint>(DEFAULT_SPRINT);
  const [organismState, setOrganismState] = useState<OrganismStateData>(DEFAULT_ORGANISM_STATE);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(true);
  const [session, setSession] = useState<UserSession>({ plan: 'free', isLoggedIn: false });
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [showCloudPassword, setShowCloudPassword] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const [goals, setGoals] = useState<DecomposedGoal[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('focus');
  const [goalInput, setGoalInput] = useState('');
  const [goalRequiredNotice, setGoalRequiredNotice] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<SupportedAiProvider>('google');
  const [endpointInput, setEndpointInput] = useState('http://localhost:11434/v1');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [availableModels, setAvailableModels] = useState<DiscoveredModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; ok?: boolean; message?: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'cloud' | 'byok'>('byok');

  const [telemetry, setTelemetry] = useState<AgentTelemetryData>({
    isEvaluating: false,
    lastEvaluatedAt: 0,
    nextEvaluationAt: 0,
    history: [],
  });

  const [now, setNow] = useState(() => Date.now());

  const loadModelsForProvider = async (provider: SupportedAiProvider, key?: string, endpoint?: string) => {
    if (provider !== 'ollama' && !key?.trim()) {
      setAvailableModels([]);
      return;
    }
    setIsLoadingModels(true);
    try {
      const models = await fetchLiveProviderModels({
        provider,
        apiKey: key?.trim() || undefined,
        endpoint: endpoint?.trim() || undefined,
      });
      setAvailableModels(models);
    } catch {
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    let alive = true;

    void storage.getItems([
      configStorage,
      sprintStorage,
      organismStateStorage,
      userSessionStorage,
      onboardedStorage,
      goalsStorage,
      telemetryStorage,
    ]).then(([c, s, st, u, o, g, tel]) => {
      if (!alive || !c || !s || !st || !u || !o || !g) return;
      const cfg = c.value as OrganismConfig;
      setConfig(cfg);
      setSelectedProvider(cfg.provider || 'google');
      const endpoint = cfg.byokEndpoint || cfg.selfHostedEndpoint || 'http://localhost:11434/v1';
      const apiKey = cfg.byokApiKey || cfg.selfHostedApiKey || '';
      const model = cfg.byokModel || cfg.selfHostedModel || '';
      setEndpointInput(endpoint);
      setApiKeyInput(apiKey);
      setModelInput(model);
      soundSynth.setVolume(cfg.volume ?? 0.6);
      soundSynth.setMuted(!cfg.soundEnabled);
      setSprint(s.value as FocusSprint);
      setOrganismState(st.value as OrganismStateData);
      const userSess = u.value as UserSession;
      setSession(userSess);
      setHasOnboarded(o.value as boolean);
      setGoals(g.value as DecomposedGoal[]);
      if (tel?.value) {
        setTelemetry(tel.value as AgentTelemetryData);
      }
      if (apiKey || cfg.provider === 'ollama') {
        void loadModelsForProvider(cfg.provider || 'google', apiKey, endpoint);
      }
      if (cfg.mode === 'cloud' || userSess?.isLoggedIn) {
        setSettingsTab('cloud');
      }
    });

    const unwatchConfig = configStorage.watch((c: OrganismConfig | null) => c && setConfig(c));
    const unwatchSprint = sprintStorage.watch((s: FocusSprint | null) => s && setSprint(s));
    const unwatchState = organismStateStorage.watch((st: OrganismStateData | null) => st && setOrganismState(st));
    const unwatchSession = userSessionStorage.watch((u: UserSession | null) => u && setSession(u));
    const unwatchOnboard = onboardedStorage.watch((o: boolean | null) => o !== null && setHasOnboarded(o));
    const unwatchGoals = goalsStorage.watch((g: DecomposedGoal[] | null) => g && setGoals(g));
    const unwatchTelemetry = telemetryStorage.watch((t: AgentTelemetryData | null) => t && setTelemetry(t));

    /**
     * Shared-cookie auto-detect: the extension's service worker sends the
     * browser's cookie jar to the backend, so a session created on the
     * WEBSITE is visible here too. Probe once per popup open and adopt it
     * silently — this makes web sign-in effectively sign the extension in.
     *
     * Strict tier rule: local storage is NEVER trusted for the plan badge.
     * A fresh signup defaults to `free` until a server-confirmed source
     * (profile fetch below, then Polar customer.state) says otherwise.
     */
    void authClient
      .getSession()
      .then(async ({ data }) => {
        if (!alive || !data?.user) return;
        const email = data.user.email;
        // Session additionalFields carry the plan hint; fall back to 'free'.
        const hinted = (data.user as { plan?: unknown }).plan === 'pro' ? 'pro' : 'free';
        setSession((prev) =>
          prev.isLoggedIn
            ? prev
            : { plan: hinted, isLoggedIn: true, email, userId: data.user.id },
        );
        try {
          const stored = await userSessionStorage.getValue();
          if (!stored?.isLoggedIn) {
            await userSessionStorage.setValue({
              plan: hinted,
              isLoggedIn: true,
              email,
              userId: data.user.id,
            });
          }
        } catch {
          /** Best-effort persist; in-memory session above is enough for this open. */
        }

        /**
         * Authoritative plan re-sync: the session cookie hint can lag webhook
         * flips, so confirm the tier against GET /api/user/profile (server reads
         * the webhook-reconciled `user.plan` mirror). Only queried when authenticated.
         */
        try {
          const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
            credentials: 'include',
            headers: { 'x-requested-with': 'Gremlin-Browser-Extension' },
          });
          if (!alive || !res.ok) return;
          const body = (await res.json()) as {
            data?: { plan?: string; email?: string; id?: string };
          };
          const serverPlan = body?.data?.plan === 'pro' ? 'pro' : 'free';
          setSession((prev) => {
            if (!prev.isLoggedIn) return prev;
            if (prev.plan === serverPlan) return prev;
            void userSessionStorage
              .setValue({ ...prev, plan: serverPlan })
              .catch(() => {});
            return { ...prev, plan: serverPlan };
          });
        } catch {
          /** Offline / backend down: keep the session hint. */
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
      unwatchConfig();
      unwatchSprint();
      unwatchState();
      unwatchSession();
      unwatchOnboard();
      unwatchGoals();
      unwatchTelemetry();
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
    Boolean((config.byokApiKey || config.selfHostedApiKey)?.trim()) ||
    (config.provider === 'ollama' && Boolean((config.byokEndpoint || config.selfHostedEndpoint)?.trim())) ||
    (session.isLoggedIn && config.mode === 'cloud');

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
    const g = goalInput.trim();
    if (!g) {
      setGoalRequiredNotice(true);
      setTimeout(() => setGoalRequiredNotice(false), 2800);
      return;
    }
    setGoalRequiredNotice(false);
    await sendMessage('startSprint', { goal: g, targetMinutes: 0 });
    soundSynth.playChime('start');
  };

  const handleStopSprint = async () => {
    await sendMessage('stopSprint', undefined);
    soundSynth.playChime('complete');
  };

  const handlePokeAgent = async () => {
    await sendMessage('pokeOrganism', undefined);
    soundSynth.playChime('poke');
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
      if (prov.defaultEndpoint) {
        setEndpointInput(prov.defaultEndpoint);
      }
    }
    setTestStatus(null);
    void loadModelsForProvider(p, apiKeyInput, endpointInput);
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
      mode: config.mode === 'cloud' ? 'cloud' : 'byok',
      provider: selectedProvider,
      byokEndpoint: endpointInput.trim() || 'http://localhost:11434/v1',
      byokApiKey: apiKeyInput.trim(),
      byokModel: modelInput.trim(),
      selfHostedEndpoint: endpointInput.trim() || 'http://localhost:11434/v1',
      selfHostedApiKey: apiKeyInput.trim(),
      selfHostedModel: modelInput.trim(),
    };
    setConfig(next);
    await configStorage.setValue(next);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleCompleteOnboarding = async () => {
    const nextConfig: OrganismConfig = {
      ...config,
      mode: apiKeyInput.trim() ? 'byok' : config.mode,
      byokApiKey: apiKeyInput.trim(),
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

  const canSaveSettings =
    (!currentProviderConfig.requiresKey || apiKeyInput.trim().length > 0) &&
    (!(selectedProvider === 'ollama' || selectedProvider === 'custom') || endpointInput.trim().length > 0);

  const isSprintActive = sprint.status === 'active';
  const elapsedSecs = isSprintActive ? Math.max(0, Math.floor((now - sprint.startedAt) / 1000)) : 0;

  /** FIRST-RUN CONSENT — gates the whole popup until the user opts in. */
  if (!hasOnboarded) {
    return (
      <div className="w-[380px] bg-paper p-5 pb-4 flex flex-col text-paper-ink">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon/48.png"
            alt="Gremlin"
            className="w-8 h-8 shrink-0 object-contain border-2 border-coal shadow-[2px_2px_0_0_#12151A] bg-accent p-0.5"
          />
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
              It goes only to the <strong>AI provider you configure</strong> (or Gremlin Cloud if signed in)
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
          href={`${WEB_APP_URL}/privacy`}
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
          Got it: enable companion
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

  /** MAIN INTERFACE. */
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
          <button
            type="button"
            onClick={handlePokeAgent}
            title={`Poke ${skin.name}`}
            className="w-11 h-11 shrink-0 border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--skin-accent)' }}
          >
            <AnimatedSprite id={config.organismId} size={33} state={organismState.state} />
          </button>
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
            className={`w-9 h-5 rounded-full border-2 relative cursor-pointer transition-colors shrink-0 flex items-center p-0.5 ${config.enabled ? 'border-coal' : 'border-line'}`}
            style={config.enabled ? { backgroundColor: 'var(--skin-accent)' } : { backgroundColor: '#E4E7DE' }}
            onClick={handleToggleEnabled}
            title={config.enabled ? 'Sleep' : 'Wake'}
            role="switch"
            aria-checked={config.enabled}
          >
            <span
              className={`w-3 h-3 rounded-full bg-white border border-coal shadow-xs transition-transform duration-150 ease-out ${
                config.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
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
                ⚠ Not configured (fix) →
              </button>
            )}

            {!isSprintActive ? (
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div>
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
                      Goal
                    </span>
                  </div>
                  <input
                    type="text"
                    className={`mt-1 w-full bg-transparent border-0 border-b-2 pb-1.5 text-paper-ink font-mono text-sm placeholder:text-paper-faint focus:outline-none transition-colors ${
                      goalRequiredNotice ? 'border-red-500 placeholder:text-red-400' : 'border-coal'
                    }`}
                    placeholder={goalRequiredNotice ? 'Enter your goal or pick a tag below!' : 'What are we working on?'}
                    value={goalInput}
                    onChange={(e) => {
                      setGoalInput(e.target.value);
                      if (goalRequiredNotice) setGoalRequiredNotice(false);
                    }}
                  />
                  {goalRequiredNotice && (
                    <p className="mt-1 font-mono text-[10px] font-bold text-red-600 animate-fade-in">
                      Please enter a goal so your companion knows what to keep you focused on.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {['Coding', 'Debugging', 'Writing', 'Research'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setGoalInput(tag);
                          setGoalRequiredNotice(false);
                        }}
                        className="px-2 py-0.5 font-mono text-[9px] font-bold border border-line bg-paper-card text-paper-muted hover:border-coal hover:text-coal cursor-pointer transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 font-mono text-[9px] text-paper-faint">
                    No timers. Your companion watches and speaks when it matters.
                  </p>
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
                    onToggleGoal={handleToggleGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onAddGoal={handleAddGoal}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Live mission header */}
                <div className="flex items-center justify-between gap-2 border-b border-dashed border-line pb-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider truncate">
                    {sprint.goal || 'Open-ended focus'}
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: 'var(--skin-accent)' }}>
                    live sprint
                  </span>
                </div>

                {/* Live Telemetry HUD (Focus Graph, Agent Observation, Cadence) */}
                <FocusTelemetryHUD
                  telemetry={telemetry}
                  now={now}
                  goal={sprint.goal || 'Focus Sprint'}
                  elapsedSecs={elapsedSecs}
                  accentColor="var(--skin-accent)"
                  onPoke={handlePokeAgent}
                />

                <div className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">
                  <span>{organismState.focusMinutesToday}m focused today</span>
                  <span>{organismState.divergenceCountToday} off-track</span>
                </div>

                <button
                  onClick={handleStopSprint}
                  className="w-full bg-coal text-paper px-4 py-2.5 font-display font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-85 cursor-pointer shadow-brut"
                >
                  <Square size={12} fill="currentColor" /> Finish sprint
                </button>

                <div className="min-h-0 flex border-t-2 border-dashed border-line pt-2">
                  <GoalStack
                    goals={goals}
                    accentColor="var(--skin-accent)"
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
            </div>
          </div>
        )}

        {/* ============ MODEL / SETTINGS ============ */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col pt-1 min-h-0 overflow-y-auto">
            {/* Segmented Mode Switcher: Cloud vs. BYOK */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-paper-line/30 border-2 border-coal mb-3 shadow-[2px_2px_0_0_#12151A]">
              <button
                type="button"
                onClick={async () => {
                  setSettingsTab('cloud');
                  if (session.isLoggedIn && config.mode !== 'cloud') {
                    const next = { ...config, mode: 'cloud' as OperatingMode };
                    setConfig(next);
                    await configStorage.setValue(next);
                  }
                }}
                className={`py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  settingsTab === 'cloud'
                    ? 'bg-coal text-white shadow-sm'
                    : 'text-paper-muted hover:text-paper-ink'
                }`}
              >
                <span>☁ Gremlin Cloud</span>
                {session.isLoggedIn && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setSettingsTab('byok');
                  if (config.mode !== 'byok') {
                    const next = { ...config, mode: 'byok' as OperatingMode };
                    setConfig(next);
                    await configStorage.setValue(next);
                  }
                }}
                className={`py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  settingsTab === 'byok'
                    ? 'bg-coal text-white shadow-sm'
                    : 'text-paper-muted hover:text-paper-ink'
                }`}
              >
                <span>🔑 BYOK</span>
              </button>
            </div>

            {/* View 1: Gremlin Cloud */}
            {settingsTab === 'cloud' && (
              <div className="flex-1 flex flex-col gap-3">
                <div className="p-2.5 bg-[#FAFBF7] border-2 border-dashed border-coal/20 space-y-1">
                  <div className="font-display font-bold text-xs text-coal">Hosted AI & Cross-Browser Sync</div>
                  <p className="font-mono text-[9.5px] text-paper-muted leading-relaxed">
                    Zero setup required. We host the fast cloud AI evaluations and keep your focus goals and daily diaries synced across all your devices.
                  </p>
                </div>

                {session.isLoggedIn ? (
                  <div className="p-3.5 bg-white border-2 border-coal space-y-3 shadow-brut">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-paper-muted block">Signed in as</span>
                        <span className="font-mono text-xs font-bold text-coal truncate block">{session.email}</span>
                      </div>
                      <span className={`px-2 py-0.5 border border-coal font-mono text-[10px] font-bold uppercase shadow-[1px_1px_0_0_#12151A] ${
                        session.plan === 'pro'
                          ? 'bg-accent text-coal'
                          : 'bg-[#FAFBF7] text-coal'
                      }`}>
                        {session.plan === 'pro' ? '★ Pro Active' : 'Free Account'}
                      </span>
                    </div>

                    {session.plan === 'pro' ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-2 bg-[#FAFBF7] border border-coal/20">
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                          <span className="font-mono text-[10px] font-bold uppercase text-coal">
                            Cloud Pro AI Active
                          </span>
                        </div>

                        <div className="pt-2 border-t-2 border-dashed border-coal/15 flex items-center justify-between gap-2">
                          <a
                            href={`${WEB_APP_URL}/pricing`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[9px] font-bold uppercase underline underline-offset-2 text-coal hover:text-accent transition-colors"
                          >
                            Manage Subscription →
                          </a>

                          <button
                            type="button"
                            onClick={async () => {
                              await authClient.signOut();
                              const nextSession: UserSession = { plan: 'free', isLoggedIn: false };
                              await userSessionStorage.setValue(nextSession);
                              setSession(nextSession);
                              if (config.mode === 'cloud') {
                                const next = { ...config, mode: 'byok' as OperatingMode };
                                setConfig(next);
                                await configStorage.setValue(next);
                              }
                            }}
                            className="font-mono text-[9px] font-bold uppercase text-paper-muted hover:text-red-600 transition-colors cursor-pointer"
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-amber-700">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Pro Required for Cloud AI</span>
                          </div>
                          <p className="font-mono text-[9px] text-paper-muted leading-relaxed">
                            Gremlin Cloud is a hosted service ($5/mo). Subscribe to activate fast cloud evaluations, or switch to the BYOK tab to use your own free key.
                          </p>
                          <a
                            href={`${WEB_APP_URL}/pricing`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 w-full bg-accent hover:bg-accent-bright text-coal font-mono text-[10px] font-bold uppercase py-2 border-2 border-coal shadow-[1px_1px_0_0_#12151A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer mt-1"
                          >
                            ⚡ Activate Cloud Pro ($5/mo) →
                          </a>
                        </div>

                        <div className="pt-2 border-t-2 border-dashed border-coal/15 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              await authClient.signOut();
                              const nextSession: UserSession = { plan: 'free', isLoggedIn: false };
                              await userSessionStorage.setValue(nextSession);
                              setSession(nextSession);
                              if (config.mode === 'cloud') {
                                const next = { ...config, mode: 'byok' as OperatingMode };
                                setConfig(next);
                                await configStorage.setValue(next);
                              }
                            }}
                            className="font-mono text-[9px] font-bold uppercase text-paper-muted hover:text-red-600 transition-colors cursor-pointer"
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-white border-2 border-coal space-y-3.5 shadow-brut">
                    <div className="flex items-center justify-between pb-2 border-b-2 border-coal/10">
                      <span className="font-display font-bold text-xs text-coal">Sign into Gremlin Cloud</span>
                      <a
                        href={`${WEB_APP_URL}/auth?mode=signup`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[10px] font-bold uppercase underline underline-offset-2 text-coal hover:text-accent transition-colors"
                      >
                        Create account ($5/mo) →
                      </a>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-coal block mb-1">
                          Email address
                        </label>
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={cloudEmail}
                          onChange={(e) => setCloudEmail(e.target.value)}
                          className="w-full bg-[#FAFBF7] border-2 border-coal px-2.5 py-1.5 font-mono text-xs text-coal placeholder:text-[#8C94A0] focus:outline-none focus:bg-white focus:shadow-[2px_2px_0_0_#12151A] transition-all"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-coal block mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCloudPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={cloudPassword}
                            onChange={(e) => setCloudPassword(e.target.value)}
                            className="w-full bg-[#FAFBF7] border-2 border-coal pl-2.5 pr-8 py-1.5 font-mono text-xs text-coal placeholder:text-[#8C94A0] focus:outline-none focus:bg-white focus:shadow-[2px_2px_0_0_#12151A] transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCloudPassword(!showCloudPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C94A0] hover:text-coal cursor-pointer"
                            tabIndex={-1}
                            title={showCloudPassword ? 'Hide password' : 'Show password'}
                          >
                            {showCloudPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {cloudError && (
                      <p className="font-mono text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 p-2">
                        {cloudError}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={cloudBusy || !cloudEmail.trim() || !cloudPassword}
                      onClick={async () => {
                        setCloudBusy(true);
                        setCloudError(null);
                        try {
                          const res = await authClient.signIn.email({ email: cloudEmail.trim(), password: cloudPassword });
                          if (res.error) {
                            setCloudError(res.error.message ?? 'Sign-in failed');
                          } else {
                            // Strict default: fresh sign-in starts `free`; the
                            // authoritative profile fetch below upgrades to
                            // `pro` only on server confirmation.
                            const nextSession: UserSession = {
                              plan: 'free',
                              isLoggedIn: true,
                              email: cloudEmail.trim(),
                            };
                            await userSessionStorage.setValue(nextSession);
                            setSession(nextSession);
                            const next = { ...config, mode: 'cloud' as OperatingMode };
                            setConfig(next);
                            await configStorage.setValue(next);
                            setCloudPassword('');

                            // Confirm the billing tier from the server before
                            // showing any badge: GET /api/user/profile reads
                            // the webhook-reconciled `user.plan` mirror.
                            try {
                              const profileRes = await fetch(`${API_BASE_URL}/api/user/profile`, {
                                credentials: 'include',
                                headers: { 'x-requested-with': 'Gremlin-Browser-Extension' },
                              });
                              if (profileRes.ok) {
                                const profileBody = (await profileRes.json()) as {
                                  data?: { plan?: string };
                                };
                                const serverPlan =
                                  profileBody?.data?.plan === 'pro' ? 'pro' : 'free';
                                const confirmed: UserSession = {
                                  ...nextSession,
                                  plan: serverPlan,
                                };
                                await userSessionStorage.setValue(confirmed);
                                setSession(confirmed);
                              }
                            } catch {
                              /** Offline: keep the `free` default until next open. */
                            }

                            // Account merge via the sync engine: LWW
                            // pull-merge of goals/notes/diaries/episodes/
                            // profile, then push local contributions.
                            void (async () => {
                              try {
                                const { onAccountConnected } = await import('@/lib/sync/engine');
                                await onAccountConnected();
                              } catch {
                                // Non-blocking sync error — local-first continues.
                              }
                            })();
                          }
                        } finally {
                          setCloudBusy(false);
                        }
                      }}
                      className="w-full py-2.5 bg-coal text-white font-display font-bold text-xs border-2 border-coal shadow-brut transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cloudBusy ? 'Signing in…' : 'Sign in to Gremlin Cloud'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* View 2: BYOK (Bring Your Own Key) */}
            {settingsTab === 'byok' && (
              <div className="flex-1 flex flex-col pt-0.5 min-h-0">
                <div className="p-2.5 bg-paper-subtle border border-line mb-3 space-y-1">
                  <div className="font-display font-bold text-xs text-paper-ink">Local & Private Execution</div>
                  <p className="font-mono text-[9px] text-paper-faint leading-relaxed">
                    Zero data leaves your machine to our servers. Use your own free API key directly from Google Gemini, OpenAI, Claude, Groq, or local Ollama.
                  </p>
                </div>

                {!isConfigured && config.mode !== 'cloud' && (
                  <p className="pb-2 font-mono font-bold text-[10px] uppercase tracking-wider text-red-600">
                    ⚠ Enter your API key below and save
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
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder={currentProviderConfig.placeholderKey}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          onBlur={() => {
                            if (apiKeyInput.trim()) {
                              void loadModelsForProvider(selectedProvider, apiKeyInput, endpointInput);
                            }
                          }}
                          className="mt-0.5 w-full bg-transparent border-0 border-b-2 border-line focus:border-coal pb-1 pr-6 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-paper-faint hover:text-paper-ink cursor-pointer"
                          tabIndex={-1}
                          title={showApiKey ? 'Hide key' : 'Show key'}
                        >
                          {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
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
                        onBlur={() => {
                          if (selectedProvider === 'ollama' || apiKeyInput.trim()) {
                            void loadModelsForProvider(selectedProvider, apiKeyInput, endpointInput);
                          }
                        }}
                        className="mt-0.5 w-full bg-transparent border-0 border-b-2 border-line focus:border-coal pb-1 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">Model</span>
                      <button
                        type="button"
                        onClick={() => void loadModelsForProvider(selectedProvider, apiKeyInput, endpointInput)}
                        disabled={isLoadingModels || (!apiKeyInput.trim() && selectedProvider !== 'ollama')}
                        className="font-mono text-[9px] uppercase tracking-wider text-paper-muted hover:text-paper-ink transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-30"
                        title="Scan active models from provider"
                      >
                        <RefreshCw size={10} className={isLoadingModels ? 'animate-spin' : ''} />
                        {isLoadingModels ? 'Scanning…' : 'Scan Live'}
                      </button>
                    </div>

                    {availableModels.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        <select
                          value={modelInput}
                          onChange={(e) => setModelInput(e.target.value)}
                          className="w-full bg-paper-card border border-line focus:border-coal px-2 py-1 font-mono text-xs text-paper-ink focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="">Auto-select latest from provider</option>
                          {availableModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.id} {m.isRecommended ? '★' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="font-mono text-[8px] text-paper-faint">
                          {availableModels.length} active models discovered from provider endpoint.
                        </p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={isLoadingModels ? 'Scanning provider models…' : 'Auto (dynamic latest) or specify custom model ID'}
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        className="mt-0.5 w-full bg-transparent border-0 border-b-2 border-line focus:border-coal pb-1 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none transition-colors"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3 pb-2">
                    {!canSaveSettings && (
                      <span className="font-mono text-[10px] font-bold text-red-600">
                        {currentProviderConfig.requiresKey && !apiKeyInput.trim() ? 'Key required' : 'Endpoint required'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={!canSaveSettings}
                      className="border-2 border-coal px-5 py-1.5 font-display font-bold text-xs text-white shadow-brut-sm transition-all hover:-translate-y-0.5 hover:shadow-brut active:translate-y-0 active:shadow-none cursor-pointer disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
                      style={{ backgroundColor: 'var(--skin-accent)' }}
                    >
                      {saveFeedback ? 'Saved ✓' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testStatus?.loading || !canSaveSettings}
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
          </div>
        )}
      </main>
    </div>
  );
}

