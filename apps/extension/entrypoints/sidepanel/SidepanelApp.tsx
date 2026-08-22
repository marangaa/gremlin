import React, { Suspense, useEffect, useState } from 'react';
import {
  configStorage,
  sprintStorage,
  organismStateStorage,
  notesStorage,
  diaryStorage,
  telemetryStorage,
  type OrganismConfig,
  type FocusSprint,
  type OrganismStateData,
  type SmartPageNote,
  type DailyDiary,
  type AiTelemetryTrace,
} from '@/lib/storage';
import { CHARACTER_SKINS } from '@/lib/personalities/skins';
import { type OrganismId } from '@/lib/personalities/types';
import { sendMessage } from '@/lib/messaging';
import { soundSynth } from '@/lib/audio/soundEngine';
import { AnimatedSprite } from '../popup/components/AnimatedSprite';
import { DiaryView } from '../popup/components/DiaryView';
import {
  Volume2,
  VolumeX,
  Globe,
  Plus,
  Terminal,
} from 'lucide-react';
import '../popup/App.css';

const LazyTelemetryDrawer = React.lazy(() =>
  import('../popup/components/TelemetryDrawer').then((m) => ({ default: m.TelemetryDrawer })),
);

const ALL_COMPANIONS: OrganismId[] = ['Sarge', 'waifu', 'sherlock', 'kuro', 'sensei'];

export const SidepanelApp: React.FC = () => {
  const [config, setConfig] = useState<OrganismConfig>({
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
  });

  const [sprint, setSprint] = useState<FocusSprint>({
    goal: '',
    targetMinutes: 25,
    startedAt: 0,
    status: 'idle',
  });

  const [organismState, setOrganismState] = useState<OrganismStateData>({
    state: 'idle',
    lastRemark: undefined,
    lastRemarkAt: 0,
    focusMinutesToday: 0,
    divergenceCountToday: 0,
    lastObservationAt: 0,
  });

  const [notes, setNotes] = useState<SmartPageNote[]>([]);
  const [diary, setDiary] = useState<DailyDiary>({
    date: new Date().toISOString().split('T')[0] || '',
    totalFocusMinutes: 0,
    totalDetours: 0,
    completedGoalsCount: 0,
    sessions: [],
    notes: [],
    topDomains: [],
  });
  const [telemetryTraces, setTelemetryTraces] = useState<AiTelemetryTrace[]>([]);
  const [hasOpenedTelemetry, setHasOpenedTelemetry] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  // Quick note form state
  const [newNoteText, setNewNoteText] = useState('');
  const [activeTabInfo, setActiveTabInfo] = useState<{ title: string; url: string; domain: string }>({
    title: 'Loading tab…',
    url: '',
    domain: '',
  });

  useEffect(() => {
    let alive = true;

    void configStorage.getValue().then((c: OrganismConfig) => alive && setConfig(c));
    void sprintStorage.getValue().then((s: FocusSprint) => alive && setSprint(s));
    void organismStateStorage.getValue().then((st: OrganismStateData) => alive && setOrganismState(st));
    void notesStorage.getValue().then((n: SmartPageNote[]) => alive && setNotes(n));
    void sendMessage('getTodayDiary', undefined).then((res) => {
      if (alive && res?.diary) setDiary(res.diary);
    });

    const unwatchConfig = configStorage.watch((c: OrganismConfig | null) => c && setConfig(c));
    const unwatchSprint = sprintStorage.watch((s: FocusSprint | null) => s && setSprint(s));
    const unwatchState = organismStateStorage.watch((st: OrganismStateData | null) => st && setOrganismState(st));
    const unwatchNotes = notesStorage.watch((n: SmartPageNote[] | null) => n && setNotes(n));
    const unwatchDiary = diaryStorage.watch((diaries: DailyDiary[] | null) => {
      if (diaries && diaries[0]) setDiary(diaries[0]);
    });

    const updateActiveTab = async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          const domain = new URL(tab.url).hostname.replace(/^www\./, '');
          setActiveTabInfo({
            title: tab.title || domain,
            url: tab.url,
            domain,
          });
        }
      } catch {
        // Restricted tab
      }
    };

    void updateActiveTab();
    browser.tabs.onActivated.addListener(updateActiveTab);
    browser.tabs.onUpdated.addListener(updateActiveTab);

    return () => {
      alive = false;
      unwatchConfig();
      unwatchSprint();
      unwatchState();
      unwatchNotes();
      unwatchDiary();
      browser.tabs.onActivated.removeListener(updateActiveTab);
      browser.tabs.onUpdated.removeListener(updateActiveTab);
    };
  }, []);

  useEffect(() => {
    if (!hasOpenedTelemetry) return;
    let alive = true;
    void telemetryStorage.getValue().then((t: AiTelemetryTrace[]) => alive && setTelemetryTraces(t));
    const unwatchTelemetry = telemetryStorage.watch((t: AiTelemetryTrace[] | null) => {
      if (alive && t) setTelemetryTraces(t);
    });
    return () => {
      alive = false;
      unwatchTelemetry();
    };
  }, [hasOpenedTelemetry]);

  const skin = CHARACTER_SKINS[config.organismId] || CHARACTER_SKINS.Sarge;

  const handleToggleSound = async () => {
    const next = { ...config, soundEnabled: !config.soundEnabled };
    setConfig(next);
    await configStorage.setValue(next);
    soundSynth.setMuted(!next.soundEnabled);
  };

  const handleSavePageNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    await sendMessage('createPageNote', {
      content: newNoteText.trim(),
      url: activeTabInfo.url,
      domain: activeTabInfo.domain || 'browser',
      pageTitle: activeTabInfo.title,
    });
    setNewNoteText('');
    soundSynth.playChime('complete');
  };

  const handleGenerateReflection = async () => {
    const res = await sendMessage('generateDiaryReflection', undefined);
    if (res?.reflection) {
      soundSynth.playChime('complete');
      return res.reflection;
    }
    throw new Error('Reflection generation failed');
  };

  const handleDeleteNote = async (id: string) => {
    await sendMessage('deletePageNote', { id });
  };

  const handleToggleTelemetry = () => {
    setIsTelemetryOpen((o) => !o);
    setHasOpenedTelemetry(true);
  };

  return (
    <div
      className="w-full min-h-screen bg-paper p-5 flex flex-col gap-5 relative overflow-x-hidden text-paper-ink"
      style={{
        '--skin-accent': skin.colors.step9,
        '--skin-accent-hover': skin.colors.step10,
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-0 gm-dots-bg" />

      {/* Diary header */}
      <header className="flex items-center justify-between pb-4 border-b-2 border-dashed border-line z-10 relative">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--skin-accent)' }}
          >
            <AnimatedSprite id={config.organismId} size={36} state={organismState.state} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl tracking-tighter text-paper-ink">
                Focus Diary
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 text-white border-2 border-coal" style={{ backgroundColor: 'var(--skin-accent)' }}>
                {skin.name}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-paper-muted bg-white px-1 mt-1 inline-block border border-coal">
              {diary.date} · auto-journal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleSound}
            className={`w-10 h-10 border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer ${config.soundEnabled ? 'text-white' : 'bg-white text-paper-faint'}`}
            style={config.soundEnabled ? { backgroundColor: 'var(--skin-accent)' } : {}}
            title={config.soundEnabled ? 'Mute' : 'Unmute'}
          >
            {config.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            onClick={handleToggleTelemetry}
            className={`w-10 h-10 border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer ${hasOpenedTelemetry && isTelemetryOpen ? 'text-white' : 'bg-white text-paper-muted hover:text-paper-ink'}`}
            style={hasOpenedTelemetry && isTelemetryOpen ? { backgroundColor: 'var(--skin-accent)' } : {}}
            title="AI reasoning traces"
          >
            <Terminal size={17} />
          </button>
        </div>
      </header>

      {/* Quick note bar */}
      <form onSubmit={handleSavePageNote} className="space-y-2 pt-1 z-10 relative bg-white border-2 border-coal shadow-brut-sm p-4">
        <div className="flex items-center justify-between text-xs font-display font-bold">
          <span className="text-white border-2 border-coal px-2 py-1 flex items-center gap-1.5 truncate max-w-[70%]" style={{ backgroundColor: 'var(--skin-accent)' }}>
            <Globe size={12} className="shrink-0" />
            <span className="truncate">{activeTabInfo.domain || 'Active page'}</span>
          </span>
          <span className="text-paper-faint font-mono font-bold">ENTER ↵</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 min-w-0 bg-paper border-2 border-coal p-3 text-paper-ink font-mono text-sm placeholder:text-paper-faint focus:outline-none focus:shadow-brut-sm transition-shadow"
            placeholder={`A thought about ${activeTabInfo.domain || 'this page'}…`}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newNoteText.trim()}
            className="text-white font-display font-bold border-2 border-coal px-4 py-3 text-sm shadow-[2px_2px_0_0_#12151A] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--skin-accent)' }}
          >
            <Plus size={15} />
            <span>NOTE</span>
          </button>
        </div>
      </form>

      {/* Diary canvas */}
      <main className="space-y-6 flex-1 relative z-10">
        <DiaryView
          diary={diary}
          companionId={config.organismId}
          accentColor="var(--skin-accent)"
          onGenerateReflection={handleGenerateReflection}
          onDeleteNote={handleDeleteNote}
        />

        {/* AI Telemetry Drawer — chunk + data hydrate on first open */}
        {hasOpenedTelemetry && (
          <Suspense
            fallback={
              <div className="bg-white border-2 border-coal shadow-brut-sm p-3 font-mono text-xs font-bold text-paper-muted">
                Loading traces…
              </div>
            }
          >
            <LazyTelemetryDrawer
              traces={telemetryTraces}
              isOpen={isTelemetryOpen}
              accentColor="var(--skin-accent)"
              onToggle={() => setIsTelemetryOpen((o) => !o)}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
};
