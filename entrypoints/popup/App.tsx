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
  type ChattinessLevel,
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
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    let alive = true;

    void configStorage.getValue().then((c: OrganismConfig) => {
      if (alive) {
        setConfig(c);
        setEndpointInput(c.selfHostedEndpoint);
        setModelInput(c.selfHostedModel);
        setApiKeyInput(c.selfHostedApiKey || '');
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
    return <div className="loading-screen">Waking your companion…</div>;
  }

  const skin = CHARACTER_SKINS[config.organismId] || CHARACTER_SKINS.nexus;
  const model = ORGANISM_MODELS[config.organismId] || ORGANISM_MODELS.nexus;

  const handleOrganismChange = async (id: OrganismId) => {
    const next = { ...config, organismId: id, name: ORGANISM_MODELS[id].name };
    setConfig(next);
    await configStorage.setValue(next);
    soundSynth.playAnimalese('Hello!', id);
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

  const handleToggleEffects = async () => {
    const next = { ...config, effectsEnabled: !config.effectsEnabled };
    setConfig(next);
    await configStorage.setValue(next);
  };

  const handleVolumeChange = async (vol: number) => {
    const next = { ...config, volume: vol };
    setConfig(next);
    await configStorage.setValue(next);
    soundSynth.setVolume(vol);
  };

  const handleStartSprint = async () => {
    if (!goalInput.trim()) return;
    soundSynth.playChime('start');
    await sendMessage('startSprint', {
      goal: goalInput.trim(),
      targetMinutes: duration,
    });
    setGoalInput('');
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
      }
    } catch {
      setPokeResult(skin.copy.pokedNotice);
    } finally {
      setPokeLoading(false);
      setTimeout(() => setPokeResult(null), 4000);
    }
  };

  const handleSaveSettings = async () => {
    const next: OrganismConfig = {
      ...config,
      selfHostedEndpoint: endpointInput.trim() || 'http://localhost:11434/v1',
      selfHostedModel: modelInput.trim() || 'llama3',
      selfHostedApiKey: apiKeyInput.trim() || undefined,
    };
    setConfig(next);
    await configStorage.setValue(next);
    setActiveTab('focus');
  };

  const handleClearData = async () => {
    if (confirm('Clear today’s activity timeline?')) {
      await sendMessage('clearActivityLog', undefined);
    }
  };

  // Remaining sprint timer calculation
  let remainingMinutes = 0;
  if (sprint.status === 'active' && sprint.startedAt > 0) {
    const elapsedMinutes = (Date.now() - sprint.startedAt) / 60000;
    remainingMinutes = Math.max(0, Math.ceil(sprint.targetMinutes - elapsedMinutes));
  }

  return (
    <div
      className={`habitat-shell skin-${config.organismId}`}
      style={
        {
          '--skin-bg-app': skin.colors.bgApp,
          '--skin-bg-gradient': skin.colors.bgAppGradient,
          '--skin-bg-card': skin.colors.bgCard,
          '--skin-bg-card-hover': skin.colors.bgCardHover,
          '--skin-bg-input': skin.colors.bgInput,
          '--skin-text-primary': skin.colors.textPrimary,
          '--skin-text-secondary': skin.colors.textSecondary,
          '--skin-text-dim': skin.colors.textDim,
          '--skin-accent': skin.colors.accent,
          '--skin-accent-glow': skin.colors.accentGlow,
          '--skin-border': skin.colors.border,
          '--skin-border-active': skin.colors.borderActive,
          '--skin-font': skin.fontFamily,
        } as React.CSSProperties
      }
    >
      {/* Top Header Card */}
      <header className="skin-header">
        <div className="header-character">
          <div className="avatar-frame">
            <span className="avatar-emoji">{skin.avatarEmoji}</span>
          </div>
          <div className="title-block">
            <div className="title-badge-row">
              <h1 className="skin-hub-title">{skin.hubTitle}</h1>
              <span className="skin-pill-badge">{skin.badge}</span>
            </div>
            <p className="skin-hub-subtitle">{skin.hubSubtitle}</p>
          </div>
        </div>

        <div className="header-controls">
          <button
            className={`btn-sound-switch ${config.soundEnabled ? 'active' : ''}`}
            onClick={handleToggleSound}
            title={config.soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {config.soundEnabled ? '🔔' : '🔕'}
          </button>
          <button
            className={`btn-master-power ${config.enabled ? 'active' : ''}`}
            onClick={handleToggleEnabled}
            title={config.enabled ? 'Companion Active (Click to Sleep)' : 'Companion Sleeping (Click to Wake)'}
          >
            <span className="power-thumb" />
          </button>
        </div>
      </header>

      {/* Navigation Tab Bar */}
      <nav className="skin-tabs">
        <button
          className={`skin-tab-btn ${activeTab === 'focus' ? 'active' : ''}`}
          onClick={() => setActiveTab('focus')}
        >
          {skin.copy.tabFocus}
        </button>
        <button
          className={`skin-tab-btn ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          {skin.copy.tabLog} ({activities.length})
        </button>
        <button
          className={`skin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          {skin.copy.tabSettings}
        </button>
      </nav>

      {/* TAB 1: FOCUS HUB */}
      {activeTab === 'focus' && (
        <div className="skin-tab-content">
          {/* Main Focus Card */}
          <section className="skin-card main-focus-card">
            {sprint.status === 'active' ? (
              <div className="active-sprint-container">
                <div className="sprint-state-tag">{skin.copy.sprintRunningBadge}</div>
                <div className="sprint-goal-display">"{sprint.goal}"</div>
                <div className="sprint-progress-bar-wrapper">
                  <div
                    className="sprint-progress-bar"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          (((Date.now() - sprint.startedAt) / 60000) / sprint.targetMinutes) * 100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <div className="sprint-action-footer">
                  <span className="sprint-countdown">⏳ {remainingMinutes}m remaining</span>
                  <button className="btn-cancel-sprint" onClick={handleStopSprint}>
                    End Early
                  </button>
                </div>
              </div>
            ) : (
              <div className="idle-sprint-container">
                <label className="skin-section-label">{skin.copy.sprintCardLabel}</label>
                <input
                  className="skin-focus-input"
                  type="text"
                  placeholder={skin.copy.sprintPlaceholder}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartSprint()}
                  maxLength={65}
                />
                <div className="duration-preset-row">
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      className={`preset-pill ${duration === mins ? 'selected' : ''}`}
                      onClick={() => setDuration(mins)}
                    >
                      {mins}m
                    </button>
                  ))}
                  <button className="btn-start-focus" onClick={handleStartSprint}>
                    {skin.copy.sprintStartBtn}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Companion Character Switcher */}
          <section className="skin-card">
            <label className="skin-section-label">SWITCH COMPANION SKIN</label>
            <div className="skin-companion-grid">
              {(Object.keys(ORGANISM_MODELS) as OrganismId[]).map((id) => {
                const item = ORGANISM_MODELS[id];
                const isSelected = config.organismId === id;
                return (
                  <button
                    key={id}
                    className={`companion-choice-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleOrganismChange(id)}
                  >
                    <span className="choice-emoji">{item.emoji}</span>
                    <span className="choice-name">{item.name}</span>
                    <span className="choice-role">{item.archetype.split(' ')[1] || item.archetype}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Daily Metrics Dashboard */}
          <div className="skin-metrics-grid">
            <div className="metric-cell">
              <span className="metric-number">{organismState.focusMinutesToday}m</span>
              <span className="metric-caption">{skin.copy.metricFocusLabel}</span>
            </div>
            <div className="metric-cell">
              <span className="metric-number">{organismState.divergenceCountToday}</span>
              <span className="metric-caption">{skin.copy.metricDetoursLabel}</span>
            </div>
            <div className="metric-cell">
              <span className="metric-number mood-text">{organismState.state}</span>
              <span className="metric-caption">{skin.copy.metricMoodLabel}</span>
            </div>
          </div>

          {/* Live Thought Bubble */}
          {organismState.lastRemark && (
            <div className="skin-thought-bubble">
              <span className="thought-icon">💭</span>
              <span className="thought-body">“{organismState.lastRemark}”</span>
            </div>
          )}

          {/* Interactive Poke Action */}
          <button className="btn-skin-poke" onClick={handlePoke} disabled={pokeLoading}>
            {pokeLoading ? 'Connecting…' : skin.copy.pokeBtn}
          </button>

          {pokeResult && <div className="skin-poke-banner">{pokeResult}</div>}
        </div>
      )}

      {/* TAB 2: ACTIVITY TIMELINE */}
      {activeTab === 'log' && (
        <div className="skin-tab-content">
          <div className="log-header-bar">
            <label className="skin-section-label">{skin.copy.logTitle}</label>
            <button className="btn-clear-timeline" onClick={handleClearData}>
              Clear
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="empty-timeline-state">{skin.copy.emptyLog}</div>
          ) : (
            <div className="timeline-scroll-container">
              {activities.map((a) => (
                <div key={a.id} className={`timeline-entry-card entry-${a.type}`}>
                  <span className="entry-symbol">
                    {a.type === 'divergence'
                      ? '⚠️'
                      : a.type === 'return'
                      ? '🌸'
                      : a.type === 'milestone'
                      ? '🏆'
                      : '⚡'}
                  </span>
                  <div className="entry-details">
                    <div className="entry-summary-text">{a.summary}</div>
                    <div className="entry-meta-text">
                      {a.domain} • {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="skin-tab-content">
          <label className="skin-section-label">AUDIO & VISUAL EFFECTS</label>

          <div className="skin-card">
            <div className="skin-toggle-item">
              <div>
                <div className="toggle-heading">{skin.copy.soundTitle}</div>
                <div className="toggle-subheading">Procedural Web Audio speech chirps & chimes</div>
              </div>
              <button
                className={`switch-control ${config.soundEnabled ? 'active' : ''}`}
                onClick={handleToggleSound}
              >
                <span className="switch-knob" />
              </button>
            </div>

            {config.soundEnabled && (
              <div className="skin-slider-box">
                <span className="slider-label">Volume: {Math.round(config.volume * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={config.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                />
              </div>
            )}

            <div className="skin-toggle-item" style={{ marginTop: '12px' }}>
              <div>
                <div className="toggle-heading">{skin.copy.effectsTitle}</div>
                <div className="toggle-subheading">Full screen distraction reminders during sprints</div>
              </div>
              <button
                className={`switch-control ${config.effectsEnabled ? 'active' : ''}`}
                onClick={handleToggleEffects}
              >
                <span className="switch-knob" />
              </button>
            </div>
          </div>

          <label className="skin-section-label" style={{ marginTop: '8px' }}>
            INTELLIGENCE PROVIDER
          </label>

          <div className="skin-card">
            <div className="provider-grid">
              <button
                className={`provider-button ${config.mode === 'cloud' ? 'selected' : ''}`}
                onClick={async () => {
                  const next = { ...config, mode: 'cloud' as OperatingMode };
                  setConfig(next);
                  await configStorage.setValue(next);
                }}
              >
                ☁️ Cloud Gateway
              </button>
              <button
                className={`provider-button ${config.mode === 'self-hosted' ? 'selected' : ''}`}
                onClick={async () => {
                  const next = { ...config, mode: 'self-hosted' as OperatingMode };
                  setConfig(next);
                  await configStorage.setValue(next);
                }}
              >
                🖥️ Local Ollama
              </button>
            </div>

            {config.mode === 'self-hosted' && (
              <div className="local-config-box">
                <label className="config-hint">Ollama / Custom Endpoint URL</label>
                <input
                  type="text"
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                />

                <label className="config-hint">Model Identifier</label>
                <input
                  type="text"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  placeholder="llama3"
                />
              </div>
            )}
          </div>

          <label className="skin-section-label" style={{ marginTop: '8px' }}>
            VIEWPORT POSITION
          </label>
          <div className="dock-position-row">
            {(['bottom-right', 'bottom-left', 'top-right'] as DockPosition[]).map((pos) => (
              <button
                key={pos}
                className={`dock-pill ${config.dockPosition === pos ? 'selected' : ''}`}
                onClick={async () => {
                  const xFrac = pos === 'bottom-left' ? 0.04 : 0.90;
                  const yFrac = pos === 'top-right' ? 0.04 : 0.82;
                  const next: OrganismConfig = { ...config, dockPosition: pos, xFrac, yFrac };
                  setConfig(next);
                  await configStorage.setValue(next);
                }}
              >
                {pos.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="skin-footer-actions">
            <button className="btn-apply-settings" onClick={handleSaveSettings}>
              Apply & Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
