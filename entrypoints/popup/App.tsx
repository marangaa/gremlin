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
import { sendMessage } from '@/lib/messaging';
import { soundSynth } from '@/lib/audio/soundEngine';
import './App.css';

const HABITAT_TITLES: Record<OrganismId, { title: string; subtitle: string }> = {
  nexus: { title: "Gorg's Mothership", subtitle: 'Alien Expedition Habitat' },
  cipher: { title: "Bolt's Workshop", subtitle: 'Builder & Mechanic Bench' },
  aero: { title: "Momo's Garden", subtitle: 'Mindful Zen Sanctuary' },
  kuro: { title: "Kuro's Lair", subtitle: 'Mischief & Accountability Den' },
  atlas: { title: "Glitch's Arcade", subtitle: 'Retro 8-Bit Stage' },
};

export default function App() {
  const [config, setConfig] = useState<OrganismConfig | null>(null);
  const [sprint, setSprint] = useState<FocusSprint | null>(null);
  const [organismState, setOrganismState] = useState<OrganismStateData | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  const [activeTab, setActiveTab] = useState<'habitat' | 'log' | 'settings'>('habitat');
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

  const model = ORGANISM_MODELS[config.organismId] || ORGANISM_MODELS.nexus;
  const habitat = HABITAT_TITLES[config.organismId] || HABITAT_TITLES.nexus;

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
        setPokeResult('Poked!');
      }
    } catch {
      setPokeResult('Poked!');
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
    setActiveTab('habitat');
  };

  const handleClearData = async () => {
    if (confirm('Clear today’s session activity history?')) {
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
    <div className={`habitat-root theme-${config.organismId}`}>
      {/* Header: Dynamic Habitat Title */}
      <header className="habitat-header">
        <div className="header-identity">
          <span className="character-badge" style={{ borderColor: model.accentColor }}>
            {model.emoji}
          </span>
          <div>
            <div className="habitat-title-row">
              <h1 className="habitat-title">{habitat.title}</h1>
            </div>
            <p className="habitat-subtitle">{habitat.subtitle}</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`btn-icon-toggle ${config.soundEnabled ? 'active' : ''}`}
            onClick={handleToggleSound}
            title={config.soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
          >
            {config.soundEnabled ? '🔔' : '🔕'}
          </button>
          <button
            className={`master-power-toggle ${config.enabled ? 'active' : ''}`}
            onClick={handleToggleEnabled}
            title={config.enabled ? 'Put companion to sleep' : 'Wake companion'}
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'habitat' ? 'active' : ''}`}
          onClick={() => setActiveTab('habitat')}
        >
          🎯 Focus Hub
        </button>
        <button
          className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          📖 Story Log ({activities.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* TAB 1: HABITAT FOCUS HUB */}
      {activeTab === 'habitat' && (
        <div className="tab-panel">
          {/* Active Sprint Section */}
          <section className="habitat-card focus-card">
            {sprint.status === 'active' ? (
              <div className="sprint-running-view">
                <div className="sprint-running-badge" style={{ color: model.accentColor }}>
                  ✨ SPRINT IN PROGRESS
                </div>
                <div className="sprint-active-goal">"{sprint.goal}"</div>
                <div className="sprint-footer-row">
                  <span className="sprint-clock">⏳ {remainingMinutes}m remaining</span>
                  <button className="btn-cancel-sprint" onClick={handleStopSprint}>
                    End Sprint
                  </button>
                </div>
              </div>
            ) : (
              <div className="sprint-setup-view">
                <label className="card-label">LOCK IN A FOCUS SPRINT</label>
                <input
                  className="input-focus-goal"
                  type="text"
                  placeholder="What are you working on right now?"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartSprint()}
                  maxLength={65}
                />
                <div className="presets-row">
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      className={`preset-chip ${duration === mins ? 'selected' : ''}`}
                      onClick={() => setDuration(mins)}
                    >
                      {mins}m
                    </button>
                  ))}
                  <button className="btn-lock-sprint" onClick={handleStartSprint}>
                    Start Sprint ✨
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Character Selector */}
          <section className="habitat-card">
            <label className="card-label">CHOOSE YOUR COMPANION</label>
            <div className="character-grid">
              {(Object.keys(ORGANISM_MODELS) as OrganismId[]).map((id) => {
                const item = ORGANISM_MODELS[id];
                const isSelected = config.organismId === id;
                return (
                  <button
                    key={id}
                    className={`character-card ${isSelected ? 'selected' : ''}`}
                    style={isSelected ? { borderColor: item.accentColor } : {}}
                    onClick={() => handleOrganismChange(id)}
                  >
                    <span className="char-emoji">{item.emoji}</span>
                    <span className="char-name">{item.name}</span>
                    <span className="char-role">{item.archetype.split(' ')[1] || item.archetype}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Daily Progress Counters */}
          <div className="metrics-row">
            <div className="metric-box">
              <span className="metric-val">{organismState.focusMinutesToday}m</span>
              <span className="metric-lbl">Focus Time</span>
            </div>
            <div className="metric-box">
              <span className="metric-val">{organismState.divergenceCountToday}</span>
              <span className="metric-lbl">Detours</span>
            </div>
            <div className="metric-box">
              <span className="metric-val" style={{ color: model.accentColor, textTransform: 'capitalize' }}>
                {organismState.state}
              </span>
              <span className="metric-lbl">Mood</span>
            </div>
          </div>

          {/* Recent Character Thought */}
          {organismState.lastRemark && (
            <div className="thought-quote-bubble">
              <span className="quote-icon">💭</span>
              <span className="quote-text">“{organismState.lastRemark}”</span>
            </div>
          )}

          {/* Interactive Poke Action */}
          <button className="btn-poke-companion" onClick={handlePoke} disabled={pokeLoading}>
            {pokeLoading ? 'Poking…' : `Poke ${model.name} ${model.emoji}`}
          </button>

          {pokeResult && <div className="poke-feedback-pill">{pokeResult}</div>}
        </div>
      )}

      {/* TAB 2: STORY & ACTIVITY LOG */}
      {activeTab === 'log' && (
        <div className="tab-panel">
          <div className="log-top-row">
            <label className="card-label">TODAY’S ACTIVITY TIMELINE</label>
            <button className="btn-clear-log" onClick={handleClearData}>
              Clear
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="empty-log-state">
              No activity recorded yet today. Start a focus sprint or explore the web!
            </div>
          ) : (
            <div className="activity-stream">
              {activities.map((a) => (
                <div key={a.id} className={`activity-card type-${a.type}`}>
                  <span className="act-icon">
                    {a.type === 'divergence'
                      ? '⚠️'
                      : a.type === 'return'
                      ? '🌸'
                      : a.type === 'milestone'
                      ? '🏆'
                      : '⚡'}
                  </span>
                  <div className="act-content">
                    <div className="act-summary">{a.summary}</div>
                    <div className="act-meta">
                      {a.domain} • {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS & PREFERENCES */}
      {activeTab === 'settings' && (
        <div className="tab-panel">
          <label className="card-label">AUDIO & SCREEN EFFECTS</label>

          <div className="habitat-card settings-group">
            <div className="setting-toggle-row">
              <div>
                <div className="setting-title">Character Sound Chirps</div>
                <div className="setting-desc">Procedural Animalese speech voice & chimes</div>
              </div>
              <button
                className={`switch-toggle ${config.soundEnabled ? 'active' : ''}`}
                onClick={handleToggleSound}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {config.soundEnabled && (
              <div className="volume-slider-row">
                <span className="volume-label">Volume: {Math.round(config.volume * 100)}%</span>
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

            <div className="setting-toggle-row" style={{ marginTop: '10px' }}>
              <div>
                <div className="setting-title">Distraction Screen Effects</div>
                <div className="setting-desc">Visual attention reminders on distracted tabs</div>
              </div>
              <button
                className={`switch-toggle ${config.effectsEnabled ? 'active' : ''}`}
                onClick={handleToggleEffects}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          <label className="card-label" style={{ marginTop: '10px' }}>
            AI INTELLIGENCE PROVIDER
          </label>

          <div className="habitat-card settings-group">
            <div className="provider-buttons">
              <button
                className={`provider-chip ${config.mode === 'cloud' ? 'selected' : ''}`}
                onClick={async () => {
                  const next = { ...config, mode: 'cloud' as OperatingMode };
                  setConfig(next);
                  await configStorage.setValue(next);
                }}
              >
                ☁️ Cloud Hosted
              </button>
              <button
                className={`provider-chip ${config.mode === 'self-hosted' ? 'selected' : ''}`}
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
              <div className="local-fields">
                <label className="field-hint">Ollama / Local Endpoint URL</label>
                <input
                  type="text"
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                />

                <label className="field-hint">Model Name</label>
                <input
                  type="text"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  placeholder="llama3"
                />
              </div>
            )}
          </div>

          <label className="card-label" style={{ marginTop: '10px' }}>
            VIEWPORT POSITION
          </label>
          <div className="position-grid">
            {(['bottom-right', 'bottom-left', 'top-right'] as DockPosition[]).map((pos) => (
              <button
                key={pos}
                className={`pos-btn ${config.dockPosition === pos ? 'selected' : ''}`}
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

          <div className="settings-footer">
            <button className="btn-save-settings" onClick={handleSaveSettings}>
              Apply & Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
