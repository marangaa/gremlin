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
import './App.css';

export default function App() {
  const [config, setConfig] = useState<OrganismConfig | null>(null);
  const [sprint, setSprint] = useState<FocusSprint | null>(null);
  const [organismState, setOrganismState] = useState<OrganismStateData | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  const [activeTab, setActiveTab] = useState<'hub' | 'activity' | 'settings'>('hub');
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
    return <div className="loading-screen">Booting Organism Telemetry…</div>;
  }

  const model = ORGANISM_MODELS[config.organismId] || ORGANISM_MODELS.nexus;

  const handleOrganismChange = async (id: OrganismId) => {
    const next = { ...config, organismId: id, name: ORGANISM_MODELS[id].name };
    setConfig(next);
    await configStorage.setValue(next);
  };

  const handleToggleEnabled = async () => {
    const next = { ...config, enabled: !config.enabled };
    setConfig(next);
    await configStorage.setValue(next);
  };

  const handleStartSprint = async () => {
    if (!goalInput.trim()) return;
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
    try {
      const res = await sendMessage('pokeOrganism', undefined);
      if (res?.message) {
        setPokeResult(`“${res.message}”`);
      } else {
        setPokeResult('Telemetry pulse sent.');
      }
    } catch {
      setPokeResult('Pulse dispatched.');
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
    setActiveTab('hub');
  };

  const handleClearData = async () => {
    if (confirm('Clear local telemetry and activity stream?')) {
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
    <div className="control-hub">
      {/* Top Status Header */}
      <header className="hub-header">
        <div className="organism-identity">
          <span className="organism-avatar-emoji" style={{ borderColor: model.accentColor }}>
            {model.emoji}
          </span>
          <div>
            <div className="name-row">
              <span className="organism-name">{model.name}</span>
              <span className={`mode-pill ${config.mode}`}>
                {config.mode === 'cloud' ? '☁️ Cloud' : '🖥️ Local'}
              </span>
            </div>
            <div className="archetype-label">{model.archetype} • {organismState.state}</div>
          </div>
        </div>

        <button
          className={`master-toggle ${config.enabled ? 'active' : ''}`}
          onClick={handleToggleEnabled}
          title={config.enabled ? 'Put Organism to Sleep' : 'Wake Organism'}
          role="switch"
          aria-checked={config.enabled}
        >
          <span className="toggle-slider" />
        </button>
      </header>

      {/* Nav Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'hub' ? 'active' : ''}`}
          onClick={() => setActiveTab('hub')}
        >
          🎯 Sprint Hub
        </button>
        <button
          className={`nav-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📡 Activity ({activities.length})
        </button>
        <button
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Infrastructure
        </button>
      </nav>

      {/* TAB 1: SPRINT HUB */}
      {activeTab === 'hub' && (
        <div className="tab-content">
          {/* Sprint Focus Section */}
          <section className="sprint-card">
            {sprint.status === 'active' ? (
              <div className="sprint-active-state">
                <div className="sprint-badge">⚡ ACTIVE SPRINT IN PROGRESS</div>
                <div className="sprint-goal-title">"{sprint.goal}"</div>
                <div className="sprint-metrics-row">
                  <span className="sprint-time-left">⏳ {remainingMinutes}m remaining</span>
                  <button className="btn-stop-sprint" onClick={handleStopSprint}>
                    End Sprint
                  </button>
                </div>
              </div>
            ) : (
              <div className="sprint-idle-state">
                <div className="section-title">SET SPRINT OBJECTIVE</div>
                <input
                  className="sprint-input"
                  type="text"
                  placeholder="e.g., Code API endpoints without tab switching"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartSprint()}
                  maxLength={60}
                />
                <div className="duration-selector">
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      className={`duration-chip ${duration === mins ? 'selected' : ''}`}
                      onClick={() => setDuration(mins)}
                    >
                      {mins}m
                    </button>
                  ))}
                  <button className="btn-start-sprint" onClick={handleStartSprint}>
                    Lock In
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Model Archetype Selector */}
          <section className="archetypes-section">
            <div className="section-title">ACTIVE ORGANISM ARCHETYPE</div>
            <div className="archetype-grid">
              {(Object.keys(ORGANISM_MODELS) as OrganismId[]).map((id) => {
                const item = ORGANISM_MODELS[id];
                const isSelected = config.organismId === id;
                return (
                  <button
                    key={id}
                    className={`archetype-card ${isSelected ? 'selected' : ''}`}
                    style={isSelected ? { borderColor: item.accentColor } : {}}
                    onClick={() => handleOrganismChange(id)}
                  >
                    <span className="archetype-emoji">{item.emoji}</span>
                    <span className="archetype-name">{item.name}</span>
                    <span className="archetype-role">{item.archetype}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Telemetry Metrics */}
          <section className="telemetry-bar">
            <div className="telemetry-item">
              <span className="telemetry-label">Focus Today</span>
              <span className="telemetry-val">{organismState.focusMinutesToday}m</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">Divergences</span>
              <span className="telemetry-val">{organismState.divergenceCountToday}</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">State</span>
              <span className="telemetry-val" style={{ color: model.accentColor }}>
                {organismState.state}
              </span>
            </div>
          </section>

          {/* Recent Quote / Telemetry */}
          {organismState.lastRemark && (
            <div className="thought-quote-box">
              <span className="quote-text">“{organismState.lastRemark}”</span>
            </div>
          )}

          {/* Quick Action Button */}
          <div className="action-row">
            <button className="btn-pulse" onClick={handlePoke} disabled={pokeLoading}>
              {pokeLoading ? 'Pinging…' : 'Ping Telemetry Pulse 📡'}
            </button>
          </div>

          {pokeResult && <div className="pulse-banner">{pokeResult}</div>}
        </div>
      )}

      {/* TAB 2: ACTIVITY STREAM */}
      {activeTab === 'activity' && (
        <div className="tab-content">
          <div className="activity-header-row">
            <span className="section-title">OBSERVATION TIMELINE</span>
            <button className="btn-clear-link" onClick={handleClearData}>
              Clear
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="empty-state">No observations recorded yet. Start browsing or lock in a sprint!</div>
          ) : (
            <div className="activity-timeline">
              {activities.map((a) => (
                <div key={a.id} className={`activity-row type-${a.type}`}>
                  <span className="activity-icon">
                    {a.type === 'divergence'
                      ? '⚠️'
                      : a.type === 'return'
                      ? '✅'
                      : a.type === 'milestone'
                      ? '🏆'
                      : '⚡'}
                  </span>
                  <div className="activity-details">
                    <div className="activity-summary">{a.summary}</div>
                    <div className="activity-meta">
                      {a.domain} • {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INFRASTRUCTURE & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="tab-content settings-view">
          <div className="section-title">OPERATING INFERENCE MODE</div>

          {/* Mode Switcher */}
          <div className="mode-switcher">
            <button
              className={`mode-btn ${config.mode === 'cloud' ? 'selected' : ''}`}
              onClick={async () => {
                const next = { ...config, mode: 'cloud' as OperatingMode };
                setConfig(next);
                await configStorage.setValue(next);
              }}
            >
              <div className="mode-btn-title">☁️ Cloud Managed</div>
              <div className="mode-btn-desc">Zero configuration, hosted AI gateway & sync</div>
            </button>

            <button
              className={`mode-btn ${config.mode === 'self-hosted' ? 'selected' : ''}`}
              onClick={async () => {
                const next = { ...config, mode: 'self-hosted' as OperatingMode };
                setConfig(next);
                await configStorage.setValue(next);
              }}
            >
              <div className="mode-btn-title">🖥️ Self-Hosted OSS</div>
              <div className="mode-btn-desc">Connect to local Ollama / LM Studio or custom proxy</div>
            </button>
          </div>

          {/* Self-Hosted Details */}
          {config.mode === 'self-hosted' && (
            <div className="self-hosted-fields">
              <label className="field-label">Endpoint URL</label>
              <input
                type="text"
                value={endpointInput}
                onChange={(e) => setEndpointInput(e.target.value)}
                placeholder="http://localhost:11434/v1"
              />

              <label className="field-label">Model Identifier</label>
              <input
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="llama3"
              />

              <label className="field-label">Bearer / API Key (Optional)</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="ollama / sk-..."
              />
            </div>
          )}

          {/* Dock Position & Behavior */}
          <div className="section-title" style={{ marginTop: '12px' }}>
            VIEWPORT DOCK POSITION
          </div>
          <div className="dock-grid">
            {(['bottom-right', 'bottom-left', 'top-right'] as DockPosition[]).map((pos) => (
              <button
                key={pos}
                className={`dock-btn ${config.dockPosition === pos ? 'selected' : ''}`}
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

          <div className="section-title" style={{ marginTop: '12px' }}>
            INTERRUPTION FREQUENCY
          </div>
          <div className="dock-grid">
            {(['quiet', 'balanced', 'chatty'] as ChattinessLevel[]).map((lvl) => (
              <button
                key={lvl}
                className={`dock-btn ${config.chattiness === lvl ? 'selected' : ''}`}
                onClick={async () => {
                  const next = { ...config, chattiness: lvl };
                  setConfig(next);
                  await configStorage.setValue(next);
                }}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="settings-actions">
            <button className="btn-danger" onClick={handleClearData}>
              Reset Telemetry History
            </button>
            <button className="btn-save" onClick={handleSaveSettings}>
              Apply Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
