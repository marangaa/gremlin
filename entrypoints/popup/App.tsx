import { useEffect, useState } from 'react';
import {
  configStorage,
  sprintStorage,
  organismStateStorage,
  activityStorage,
  type OrganismConfig,
  type FocusSprint,
  type OrganismStateData,
  type ActivityEntry,
  type DockPosition,
  type OperatingMode,
} from '@/lib/storage';
import {
  ORGANISM_MODELS,
  type OrganismId,
} from '@/lib/personalities/types';
import { CHARACTER_SKINS } from '@/lib/personalities/skins';
import { sendMessage } from '@/lib/messaging';
import { soundSynth } from '@/lib/audio/soundEngine';
import './App.css';

const ALL_COMPANIONS: OrganismId[] = ['nexus', 'cipher', 'aero', 'kuro', 'atlas'];

export default function App() {
  const [config, setConfig] = useState<OrganismConfig | null>(null);
  const [sprint, setSprint] = useState<FocusSprint | null>(null);
  const [organismState, setOrganismState] = useState<OrganismStateData | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  const [activeTab, setActiveTab] = useState<'focus' | 'log' | 'settings'>('focus');
  const [goalInput, setGoalInput] = useState('');
  const [duration, setDuration] = useState(25);
  const [pokeLoading, setPokeLoading] = useState(false);
  const [pokeResult, setPokeResult] = useState<string | null>(null);

  // Settings form states
  const [endpointInput, setEndpointInput] = useState('');
  const [modelInput, setModelInput] = useState('');

  useEffect(() => {
    let alive = true;

    void configStorage.getValue().then((c: OrganismConfig) => {
      if (alive) {
        setConfig(c);
        setEndpointInput(c.selfHostedEndpoint);
        setModelInput(c.selfHostedModel);
        soundSynth.setVolume(c.volume ?? 0.6);
        soundSynth.setMuted(!c.soundEnabled);
      }
    });

    void sprintStorage.getValue().then((s: FocusSprint) => alive && setSprint(s));
    void organismStateStorage.getValue().then((st: OrganismStateData) => alive && setOrganismState(st));
    void activityStorage.getValue().then((a: ActivityEntry[]) => alive && setActivities(a));

    const unwatchConfig = configStorage.watch((c: OrganismConfig | null) => c && setConfig(c));
    const unwatchSprint = sprintStorage.watch((s: FocusSprint | null) => s && setSprint(s));
    const unwatchState = organismStateStorage.watch((st: OrganismStateData | null) => st && setOrganismState(st));
    const unwatchActivity = activityStorage.watch((a: ActivityEntry[] | null) => a && setActivities(a));

    return () => {
      alive = false;
      unwatchConfig();
      unwatchSprint();
      unwatchState();
      unwatchActivity();
    };
  }, []);

  if (!config || !sprint || !organismState) {
    return <div className="loading-screen">Starting Gremlin…</div>;
  }

  const skin = CHARACTER_SKINS[config.organismId] || CHARACTER_SKINS.nexus;
  const model = ORGANISM_MODELS[config.organismId] || ORGANISM_MODELS.nexus;

  const handleOrganismChange = async (id: OrganismId) => {
    const next = { ...config, organismId: id, name: ORGANISM_MODELS[id].name };
    setConfig(next);
    await configStorage.setValue(next);
    soundSynth.playAnimalese('Hi', id);
  };

  const handleToggleEnabled = async () => {
    const next = { ...config, enabled: !config.enabled };
    setConfig(next);
    await configStorage.setValue(next);
  };

  const handleToggleSound = async () => {
    const next = { ...config, soundEnabled: !config.soundEnabled };
    setConfig(next);
    await configStorage.setValue(next);
    soundSynth.setMuted(!next.soundEnabled);
    if (next.soundEnabled) soundSynth.playChime('poke');
  };

  const handleStartSprint = async () => {
    if (!goalInput.trim()) return;
    await sendMessage('startSprint', {
      goal: goalInput.trim(),
      targetMinutes: duration,
    });
    setGoalInput('');
    soundSynth.playChime('start');
  };

  const handleStopSprint = async () => {
    await sendMessage('stopSprint', undefined);
  };

  const handlePoke = async () => {
    setPokeLoading(true);
    setPokeResult(null);
    soundSynth.playChime('poke');

    try {
      const res = await sendMessage('pokeOrganism', undefined);
      if (res?.message) {
        setPokeResult(`“${res.message}”`);
        soundSynth.playAnimalese(res.message, config.organismId);
      } else {
        setPokeResult(skin.copy.pokedNotice);
        soundSynth.playAnimalese('Poke!', config.organismId);
      }
    } catch {
      setPokeResult('Poked companion!');
    } finally {
      setPokeLoading(false);
      setTimeout(() => setPokeResult(null), 3000);
    }
  };

  const handleSaveSettings = async () => {
    const next: OrganismConfig = {
      ...config,
      selfHostedEndpoint: endpointInput.trim() || 'http://localhost:11434/v1',
      selfHostedModel: modelInput.trim() || 'llama3',
    };
    setConfig(next);
    await configStorage.setValue(next);
  };

  const handleClearHistory = async () => {
    if (confirm('Clear today’s browsing activity log?')) {
      await sendMessage('clearActivityLog', undefined);
    }
  };

  // Sprint Progress
  const isSprintActive = sprint.status === 'active' && sprint.startedAt > 0;
  const elapsedMinutes = isSprintActive ? (Date.now() - sprint.startedAt) / 60000 : 0;
  const remainingMinutes = isSprintActive ? Math.max(0, Math.ceil(sprint.targetMinutes - elapsedMinutes)) : 0;
  const progressPercent = isSprintActive && sprint.targetMinutes > 0
    ? Math.min(100, Math.max(0, (elapsedMinutes / sprint.targetMinutes) * 100))
    : 0;

  return (
    <div
      className="popup-container"
      style={{
        '--skin-bg-app': skin.colors.bgApp,
        '--skin-bg-gradient': skin.colors.bgAppGradient,
        '--skin-accent': skin.colors.accent,
        '--skin-accent-glow': skin.colors.accentGlow,
        '--skin-border': skin.colors.border,
        '--skin-border-active': skin.colors.borderActive,
        '--skin-text-primary': skin.colors.textPrimary,
        '--skin-text-secondary': skin.colors.textSecondary,
        '--skin-font': skin.fontFamily,
      } as React.CSSProperties}
    >
      {/* Procedural Grain Noise Backdrop */}
      <div className="bg-grain-noise" />

      {/* Top Header */}
      <header className="popup-header">
        <div className="header-brand">
          <div className="avatar-chip">
            <span>{skin.avatarEmoji}</span>
          </div>
          <div className="brand-meta">
            <div className="brand-title-row">
              <h1 className="brand-name">{skin.name}</h1>
              <span className="badge-pill">{skin.badge}</span>
            </div>
            <p className="brand-desc">{skin.tagline}</p>
          </div>
        </div>

        <div className="header-toggles">
          <button
            className={`btn-sound ${config.soundEnabled ? 'active' : ''}`}
            onClick={handleToggleSound}
            title={config.soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {config.soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className={`btn-power ${config.enabled ? 'active' : ''}`}
            onClick={handleToggleEnabled}
            title={config.enabled ? 'Pause companion' : 'Wake companion'}
          >
            <span className="power-thumb" />
          </button>
        </div>
      </header>

      {/* Companion Switcher Strip */}
      <div className="companion-strip">
        {ALL_COMPANIONS.map((cid) => {
          const comp = CHARACTER_SKINS[cid];
          const isSelected = config.organismId === cid;
          return (
            <button
              key={cid}
              className={`companion-pill ${isSelected ? 'active' : ''}`}
              onClick={() => handleOrganismChange(cid)}
              title={`${comp.name}: ${comp.tagline}`}
            >
              <span className="pill-emoji">{comp.avatarEmoji}</span>
              <span className="pill-name">{comp.name}</span>
            </button>
          );
        })}
      </div>

      {/* Segmented Navigation Tabs */}
      <nav className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'focus' ? 'active' : ''}`}
          onClick={() => setActiveTab('focus')}
        >
          {skin.copy.tabFocus}
        </button>
        <button
          className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          {skin.copy.tabLog}
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          {skin.copy.tabSettings}
        </button>
      </nav>

      {/* Main View Area */}
      <main className="view-content">
        {/* ================= FOCUS TAB ================= */}
        {activeTab === 'focus' && (
          <section className="section-flow">
            {/* Active Sprint Banner or Setup */}
            {isSprintActive ? (
              <div className="sprint-active-box">
                <div className="sprint-active-head">
                  <span className="status-indicator-dot" />
                  <span className="sprint-goal-title">"{sprint.goal}"</span>
                  <span className="sprint-time-badge">{remainingMinutes}m left</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="sprint-active-footer">
                  <span className="sprint-time-detail">
                    {Math.round(elapsedMinutes)} of {sprint.targetMinutes} minutes elapsed
                  </span>
                  <button className="btn-stop-sprint" onClick={handleStopSprint}>
                    Finish Early
                  </button>
                </div>
              </div>
            ) : (
              <div className="sprint-setup-box">
                <label className="section-label">{skin.copy.sprintCardLabel}</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    className="input-goal"
                    placeholder={skin.copy.sprintPlaceholder}
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartSprint()}
                    maxLength={80}
                  />
                  <button
                    className="btn-start"
                    onClick={handleStartSprint}
                    disabled={!goalInput.trim()}
                  >
                    {skin.copy.sprintStartBtn}
                  </button>
                </div>

                <div className="duration-row">
                  <span className="duration-label">Duration:</span>
                  <div className="duration-options">
                    {[15, 25, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        className={`duration-chip ${duration === mins ? 'selected' : ''}`}
                        onClick={() => setDuration(mins)}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live Remark / Thought Bubble */}
            <div className="thought-stream">
              {pokeResult ? (
                <div className="thought-bubble poke-alert">{pokeResult}</div>
              ) : organismState.lastRemark ? (
                <div className="thought-bubble">“{organismState.lastRemark}”</div>
              ) : (
                <div className="thought-bubble-muted">
                  <span>{skin.tagline}</span>
                </div>
              )}
            </div>

            {/* Metrics Row */}
            <div className="metrics-strip">
              <div className="metric-cell">
                <span className="metric-value">{organismState.focusMinutesToday}m</span>
                <span className="metric-title">{skin.copy.metricFocusLabel}</span>
              </div>
              <div className="metric-cell">
                <span className="metric-value">{organismState.divergenceCountToday}</span>
                <span className="metric-title">{skin.copy.metricDetoursLabel}</span>
              </div>
              <div className="metric-cell">
                <span className="metric-value mood-val">{organismState.state}</span>
                <span className="metric-title">{skin.copy.metricMoodLabel}</span>
              </div>
            </div>

            {/* Quick Interaction */}
            <button
              className="btn-poke-companion"
              onClick={handlePoke}
              disabled={pokeLoading}
            >
              <span>{skin.copy.pokeBtn}</span>
            </button>
          </section>
        )}

        {/* ================= HISTORY TAB ================= */}
        {activeTab === 'log' && (
          <section className="section-flow">
            <div className="section-header-row">
              <span className="section-label">{skin.copy.logTitle}</span>
              {activities.length > 0 && (
                <button className="btn-text-clear" onClick={handleClearHistory}>
                  Clear
                </button>
              )}
            </div>

            {activities.length === 0 ? (
              <div className="empty-state-box">{skin.copy.emptyLog}</div>
            ) : (
              <div className="activity-list">
                {activities.slice(0, 15).map((act) => {
                  const timeStr = new Date(act.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div key={act.id} className="activity-row">
                      <div className="activity-time">{timeStr}</div>
                      <div className="activity-info">
                        <div className="activity-domain">{act.domain}</div>
                        <div className="activity-title-text">{act.summary}</div>
                      </div>
                      <span className={`status-tag status-${act.type}`}>
                        {act.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================= SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <section className="section-flow">
            <div className="settings-group">
              <span className="section-label">EXPERIENCE</span>

              <div className="settings-row">
                <div>
                  <div className="settings-name">{skin.copy.soundTitle}</div>
                  <div className="settings-sub">Procedural Animalese voice chirps</div>
                </div>
                <button
                  className={`switch-pill ${config.soundEnabled ? 'active' : ''}`}
                  onClick={handleToggleSound}
                >
                  <span className="switch-thumb" />
                </button>
              </div>

              {config.soundEnabled && (
                <div className="volume-slider-row">
                  <span className="volume-label">Volume: {Math.round((config.volume ?? 0.6) * 100)}%</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={config.volume ?? 0.6}
                    onChange={async (e) => {
                      const v = parseFloat(e.target.value);
                      const next = { ...config, volume: v };
                      setConfig(next);
                      await configStorage.setValue(next);
                      soundSynth.setVolume(v);
                    }}
                  />
                </div>
              )}

              <div className="settings-row">
                <div>
                  <div className="settings-name">{skin.copy.effectsTitle}</div>
                  <div className="settings-sub">Visual notifications when distracted</div>
                </div>
                <button
                  className={`switch-pill ${config.effectsEnabled ? 'active' : ''}`}
                  onClick={async () => {
                    const next = { ...config, effectsEnabled: !config.effectsEnabled };
                    setConfig(next);
                    await configStorage.setValue(next);
                  }}
                >
                  <span className="switch-thumb" />
                </button>
              </div>
            </div>

            <div className="settings-group">
              <span className="section-label">DOCK POSITION</span>
              <div className="dock-position-options">
                {(['bottom-right', 'bottom-left', 'top-right'] as DockPosition[]).map((pos) => (
                  <button
                    key={pos}
                    className={`dock-chip ${config.dockPosition === pos ? 'selected' : ''}`}
                    onClick={async () => {
                      const next = { ...config, dockPosition: pos };
                      setConfig(next);
                      await configStorage.setValue(next);
                    }}
                  >
                    {pos.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <span className="section-label">INTELLIGENCE PROVIDER</span>
              <div className="provider-options">
                <button
                  className={`provider-chip ${config.mode === 'cloud' ? 'selected' : ''}`}
                  onClick={async () => {
                    const next: OrganismConfig = { ...config, mode: 'cloud' as OperatingMode };
                    setConfig(next);
                    await configStorage.setValue(next);
                  }}
                >
                  ☁️ Managed Cloud
                </button>
                <button
                  className={`provider-chip ${config.mode === 'self-hosted' ? 'selected' : ''}`}
                  onClick={async () => {
                    const next: OrganismConfig = { ...config, mode: 'self-hosted' as OperatingMode };
                    setConfig(next);
                    await configStorage.setValue(next);
                  }}
                >
                  🖥️ Local Ollama
                </button>
              </div>

              {config.mode === 'self-hosted' && (
                <div className="self-hosted-form">
                  <label className="field-label">Ollama / Custom API Endpoint</label>
                  <input
                    type="text"
                    className="field-input"
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                  />

                  <label className="field-label">Model Name</label>
                  <input
                    type="text"
                    className="field-input"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    placeholder="llama3"
                  />

                  <button className="btn-save-settings" onClick={handleSaveSettings}>
                    Save Local Configuration
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
