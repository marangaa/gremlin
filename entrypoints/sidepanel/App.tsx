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
  type OperatingMode,
  type ChattinessLevel,
} from '@/lib/storage';
import {
  ORGANISM_MODELS,
  type OrganismId,
} from '@/lib/personalities/types';
import { OrganismDisplay } from '@/lib/organism/OrganismDisplay';
import { sendMessage } from '@/lib/messaging';
import './App.css';

export default function App() {
  const [config, setConfig] = useState<OrganismConfig | null>(null);
  const [sprint, setSprint] = useState<FocusSprint | null>(null);
  const [organismState, setOrganismState] = useState<OrganismStateData | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  const [activeTab, setActiveTab] = useState<'monitor' | 'activity' | 'settings'>('monitor');
  const [goalInput, setGoalInput] = useState('');
  const [duration, setDuration] = useState(25);
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
    return <div className="sidepanel-loading">Initializing Organism Telemetry…</div>;
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

  const handleSaveSettings = async () => {
    const next: OrganismConfig = {
      ...config,
      selfHostedEndpoint: endpointInput.trim() || 'http://localhost:11434/v1',
      selfHostedModel: modelInput.trim() || 'llama3',
      selfHostedApiKey: apiKeyInput.trim() || undefined,
    };
    setConfig(next);
    await configStorage.setValue(next);
    setActiveTab('monitor');
  };

  const handleClearData = async () => {
    if (confirm('Clear local telemetry and observation history?')) {
      await sendMessage('clearActivityLog', undefined);
    }
  };

  // Pop Out Always-on-Top Document Picture-in-Picture Window
  const handlePopOutPiP = async () => {
    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 260,
          height: 260,
        });

        // Copy styles to PiP window
        document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
          pipWindow.document.head.appendChild(node.cloneNode(true));
        });

        const pipRoot = pipWindow.document.createElement('div');
        pipRoot.id = 'pip-root';
        pipRoot.className = 'pip-wrapper';
        pipWindow.document.body.appendChild(pipRoot);

        // Simple render container inside PiP window
        pipRoot.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#090d16; color:#f8fafc; font-family:sans-serif;">
            <div style="font-size:12px; font-weight:700; color:${model.accentColor}; margin-bottom:8px;">${model.name} • ${organismState.state}</div>
            <div style="width:110px; height:110px;">${getOrganismSvg(config.organismId)}</div>
            ${organismState.lastRemark ? `<div style="margin-top:10px; font-size:11px; font-style:italic; text-align:center; padding:4px 8px; background:#1e293b; border-radius:8px;">“${organismState.lastRemark}”</div>` : ''}
          </div>
        `;
      } catch (err) {
        console.warn('PiP window request cancelled or error:', err);
      }
    } else {
      alert('Document Picture-in-Picture is supported in modern Chrome / Edge.');
    }
  };

  let remainingMinutes = 0;
  if (sprint.status === 'active' && sprint.startedAt > 0) {
    const elapsedMinutes = (Date.now() - sprint.startedAt) / 60000;
    remainingMinutes = Math.max(0, Math.ceil(sprint.targetMinutes - elapsedMinutes));
  }

  return (
    <div className="sidepanel-app">
      {/* Header */}
      <header className="sidepanel-header">
        <div className="identity-block">
          <span className="avatar-chip">{model.emoji}</span>
          <div>
            <div className="title-row">
              <span className="model-name">{model.name}</span>
              <span className={`badge-mode ${config.mode}`}>
                {config.mode === 'cloud' ? '☁️ Cloud' : '🖥️ Local'}
              </span>
            </div>
            <div className="subtitle">{model.archetype} • {organismState.state}</div>
          </div>
        </div>

        <button
          className={`switch-enabled ${config.enabled ? 'active' : ''}`}
          onClick={handleToggleEnabled}
          title={config.enabled ? 'Put Organism to Sleep' : 'Wake Organism'}
        >
          <span className="switch-thumb" />
        </button>
      </header>

      {/* Live Organism Stage */}
      <section className="stage-section">
        <OrganismDisplay
          organismId={config.organismId}
          state={organismState.state}
          remark={organismState.lastRemark}
          onPopOutPiP={handlePopOutPiP}
          supportsPiP={'documentPictureInPicture' in window}
        />
      </section>

      {/* Tabs */}
      <nav className="sidepanel-tabs">
        <button
          className={`tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitor')}
        >
          🎯 Focus Hub
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📡 Stream ({activities.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* TAB 1: MONITOR & SPRINT */}
      {activeTab === 'monitor' && (
        <div className="tab-pane">
          {/* Sprint Card */}
          <div className="card sprint-card">
            {sprint.status === 'active' ? (
              <div className="sprint-active">
                <div className="badge-sprint">⚡ SPRINT ACTIVE</div>
                <div className="sprint-goal">"{sprint.goal}"</div>
                <div className="sprint-meta">
                  <span>⏳ {remainingMinutes}m remaining</span>
                  <button className="btn-stop" onClick={handleStopSprint}>
                    End Sprint
                  </button>
                </div>
              </div>
            ) : (
              <div className="sprint-idle">
                <div className="card-label">FOCUS SPRINT OBJECTIVE</div>
                <input
                  type="text"
                  className="input-goal"
                  placeholder="Define objective..."
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartSprint()}
                  maxLength={60}
                />
                <div className="duration-row">
                  {[15, 25, 45, 60].map((m) => (
                    <button
                      key={m}
                      className={`chip-duration ${duration === m ? 'selected' : ''}`}
                      onClick={() => setDuration(m)}
                    >
                      {m}m
                    </button>
                  ))}
                  <button className="btn-lock" onClick={handleStartSprint}>
                    Lock In
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Archetype Selector */}
          <div className="archetype-section">
            <div className="card-label">SELECT ORGANISM ARCHETYPE</div>
            <div className="archetype-list">
              {(Object.keys(ORGANISM_MODELS) as OrganismId[]).map((id) => {
                const item = ORGANISM_MODELS[id];
                const isSelected = config.organismId === id;
                return (
                  <button
                    key={id}
                    className={`archetype-chip ${isSelected ? 'selected' : ''}`}
                    style={isSelected ? { borderColor: item.accentColor } : {}}
                    onClick={() => handleOrganismChange(id)}
                  >
                    <span className="chip-emoji">{item.emoji}</span>
                    <div className="chip-texts">
                      <span className="chip-title">{item.name}</span>
                      <span className="chip-desc">{item.archetype}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="metrics-row">
            <div className="metric-box">
              <span className="metric-lbl">Focus Today</span>
              <span className="metric-val">{organismState.focusMinutesToday}m</span>
            </div>
            <div className="metric-box">
              <span className="metric-lbl">Divergences</span>
              <span className="metric-val">{organismState.divergenceCountToday}</span>
            </div>
            <div className="metric-box">
              <span className="metric-lbl">State</span>
              <span className="metric-val" style={{ color: model.accentColor }}>
                {organismState.state}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVITY STREAM */}
      {activeTab === 'activity' && (
        <div className="tab-pane">
          <div className="stream-header">
            <span className="card-label">OBSERVATION TIMELINE</span>
            <button className="btn-clear" onClick={handleClearData}>
              Clear
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="empty-stream">No activity logged yet. Lock in a sprint or browse!</div>
          ) : (
            <div className="stream-list">
              {activities.map((a) => (
                <div key={a.id} className={`stream-item ${a.type}`}>
                  <span className="item-icon">
                    {a.type === 'divergence'
                      ? '⚠️'
                      : a.type === 'return'
                      ? '✅'
                      : a.type === 'milestone'
                      ? '🏆'
                      : '⚡'}
                  </span>
                  <div className="item-info">
                    <div className="item-text">{a.summary}</div>
                    <div className="item-meta">
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
        <div className="tab-pane">
          <div className="card-label">OPERATING MODE</div>
          <div className="mode-toggle-group">
            <button
              className={`mode-card ${config.mode === 'cloud' ? 'selected' : ''}`}
              onClick={async () => {
                const next = { ...config, mode: 'cloud' as OperatingMode };
                setConfig(next);
                await configStorage.setValue(next);
              }}
            >
              <div className="mode-title">☁️ Cloud Managed</div>
              <div className="mode-sub">Zero configuration, hosted AI gateway & sync</div>
            </button>

            <button
              className={`mode-card ${config.mode === 'self-hosted' ? 'selected' : ''}`}
              onClick={async () => {
                const next = { ...config, mode: 'self-hosted' as OperatingMode };
                setConfig(next);
                await configStorage.setValue(next);
              }}
            >
              <div className="mode-title">🖥️ Self-Hosted OSS</div>
              <div className="mode-sub">Connect to local Ollama / LM Studio or custom proxy</div>
            </button>
          </div>

          {config.mode === 'self-hosted' && (
            <div className="settings-fields">
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

              <label className="field-label">Bearer Token / Key (Optional)</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="ollama / sk-..."
              />
            </div>
          )}

          <div className="card-label" style={{ marginTop: '12px' }}>
            INTERRUPTION FREQUENCY
          </div>
          <div className="frequency-group">
            {(['quiet', 'balanced', 'chatty'] as ChattinessLevel[]).map((lvl) => (
              <button
                key={lvl}
                className={`freq-btn ${config.chattiness === lvl ? 'selected' : ''}`}
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

          <div className="settings-foot">
            <button className="btn-wipe" onClick={handleClearData}>
              Reset History
            </button>
            <button className="btn-apply" onClick={handleSaveSettings}>
              Apply Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getOrganismSvg(id: OrganismId): string {
  const model = ORGANISM_MODELS[id] || ORGANISM_MODELS.nexus;
  return /* html */ `
    <div style="width:100px; height:100px; display:flex; align-items:center; justify-content:center; font-size:48px; filter:drop-shadow(0 8px 16px ${model.accentColor}44);">
      ${model.emoji}
    </div>
  `;
}
