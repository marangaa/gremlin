import React, { useEffect, useState } from 'react';
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
import { TelemetryDrawer } from '../popup/components/TelemetryDrawer';
import {
  Volume2,
  VolumeX,
  Globe,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Terminal,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import '../popup/App.css';

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
    void telemetryStorage.getValue().then((t: AiTelemetryTrace[]) => alive && setTelemetryTraces(t));
    void sendMessage('getTodayDiary', undefined).then((res) => {
      if (alive && res?.diary) setDiary(res.diary);
    });

    const unwatchConfig = configStorage.watch((c: OrganismConfig | null) => c && setConfig(c));
    const unwatchSprint = sprintStorage.watch((s: FocusSprint | null) => s && setSprint(s));
    const unwatchState = organismStateStorage.watch((st: OrganismStateData | null) => st && setOrganismState(st));
    const unwatchNotes = notesStorage.watch((n: SmartPageNote[] | null) => n && setNotes(n));
    const unwatchTelemetry = telemetryStorage.watch((t: AiTelemetryTrace[] | null) => t && setTelemetryTraces(t));
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
      unwatchTelemetry();
      unwatchDiary();
      browser.tabs.onActivated.removeListener(updateActiveTab);
      browser.tabs.onUpdated.removeListener(updateActiveTab);
    };
  }, []);

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

  return (
    <div
      className="w-full min-h-screen bg-base p-5 flex flex-col gap-5 relative overflow-x-hidden text-ink"
      style={{
        '--skin-accent': skin.colors.step9,
        '--skin-accent-hover': skin.colors.step10,
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.15] z-0" style={{ backgroundSize: '16px 16px', backgroundImage: 'radial-gradient(circle, var(--skin-accent) 1px, transparent 1px)' }} />

      {/* Editorial Diary Header */}
      <header className="flex items-center justify-between pb-4 border-b border-line z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 border border-line flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--skin-accent)' }}>
            <AnimatedSprite id={config.organismId} size={36} state={organismState.state} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-xl tracking-tighter text-ink">
                Focus Diary
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-line text-white" style={{ backgroundColor: 'var(--skin-accent)' }}>
                {skin.name}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-ink-muted bg-surface-raised px-1 mt-1 inline-block border border-line">
              {diary.date} · Auto-Journal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            className={`w-10 h-10 border border-line flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer ${config.soundEnabled ? 'text-white' : 'bg-surface-raised text-ink-faint'} `}
            style={config.soundEnabled ? { backgroundColor: 'var(--skin-accent)' } : {}}
            title={config.soundEnabled ? 'Mute' : 'Unmute'}
          >
            {config.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
            className="w-10 h-10 border border-line flex items-center justify-center bg-surface text-ink hover:bg-surface-raised transition-colors cursor-pointer"
            title="Inspect AI Reasoning Telemetry"
          >
            <Terminal size={18} />
          </button>
        </div>
      </header>

      {/* Quick In-Page Note Taking Cardless Bar */}
      <form onSubmit={handleSavePageNote} className="space-y-2 pt-1 z-10 relative bg-surface border border-line p-4">
        <div className="flex items-center justify-between text-xs font-display font-semibold">
          <span className="text-white border border-line px-2 py-1 flex items-center gap-1.5 truncate max-w-[70%]" style={{ backgroundColor: 'var(--skin-accent)' }}>
            <Globe size={12} className="shrink-0" />
            <span className="truncate">{activeTabInfo.domain || 'Active Page'}</span>
          </span>
          <span className="text-ink-muted font-mono font-bold">Enter ↵ to save</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-base border border-line p-3 text-ink font-mono text-sm placeholder:text-ink-faint focus:outline-none focus:bg-surface transition-colors"
            placeholder={`Annotate thoughts about ${activeTabInfo.domain || 'this page'}…`}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newNoteText.trim()}
            className="bg-accent text-base-deep font-display font-semibold border border-line px-4 py-3 text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <Plus size={16} />
            <span>NOTE</span>
          </button>
        </div>
      </form>

      {/* Diary & Reflection Canvas */}
      <main className="space-y-6 flex-1 relative z-10">
        <DiaryView
          diary={diary}
          companionId={config.organismId}
          accentColor="var(--skin-accent)"
          onGenerateReflection={handleGenerateReflection}
          onDeleteNote={handleDeleteNote}
        />

        {/* AI Telemetry Drawer */}
        <TelemetryDrawer
          traces={telemetryTraces}
          isOpen={isTelemetryOpen}
          accentColor="var(--skin-accent)"
          onToggle={() => setIsTelemetryOpen(!isTelemetryOpen)}
        />
      </main>
    </div>
  );
};
