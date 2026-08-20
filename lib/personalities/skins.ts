import { type OrganismId } from './types';

export interface CharacterSkin {
  id: OrganismId;
  name: string;
  avatarEmoji: string;
  hubTitle: string;
  hubSubtitle: string;
  badge: string;
  tagline: string;
  fontFamily: string;
  colors: {
    bgApp: string;
    bgAppGradient: string;
    bgCard: string;
    bgCardHover: string;
    bgInput: string;
    textPrimary: string;
    textSecondary: string;
    textDim: string;
    accent: string;
    accentGlow: string;
    border: string;
    borderActive: string;
  };
  copy: {
    tabFocus: string;
    tabLog: string;
    tabSettings: string;
    sprintCardLabel: string;
    sprintPlaceholder: string;
    sprintStartBtn: string;
    sprintRunningBadge: string;
    metricFocusLabel: string;
    metricDetoursLabel: string;
    metricMoodLabel: string;
    pokeBtn: string;
    pokedNotice: string;
    logTitle: string;
    emptyLog: string;
    soundTitle: string;
    effectsTitle: string;
  };
}

export const CHARACTER_SKINS: Record<OrganismId, CharacterSkin> = {
  nexus: { // Gorg (Green Alien)
    id: 'nexus',
    name: 'Gorg',
    avatarEmoji: '👽',
    hubTitle: "Gorg's Mothership",
    hubSubtitle: 'Orbital Earth Observation Deck',
    badge: 'EXPEDITION',
    tagline: 'Observing human digital rituals with extraterrestrial curiosity',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    colors: {
      bgApp: '#061a10',
      bgAppGradient: 'radial-gradient(ellipse at 50% 0%, #0d3820 0%, #061a10 75%)',
      bgCard: 'rgba(13, 56, 32, 0.65)',
      bgCardHover: 'rgba(21, 84, 48, 0.75)',
      bgInput: '#03120b',
      textPrimary: '#f0fdf4',
      textSecondary: '#86efac',
      textDim: '#4ade80',
      accent: '#22c55e',
      accentGlow: 'rgba(34, 197, 94, 0.25)',
      border: 'rgba(74, 222, 128, 0.2)',
      borderActive: '#22c55e',
    },
    copy: {
      tabFocus: '🛸 Mission Hub',
      tabLog: '📜 Earth Log',
      tabSettings: '⚙️ Transponder',
      sprintCardLabel: 'SET EXPEDITION OBJECTIVE',
      sprintPlaceholder: 'What human task are we exploring today?',
      sprintStartBtn: 'Launch Expedition 🛸',
      sprintRunningBadge: '🛸 EXPEDITION MISSION IN PROGRESS',
      metricFocusLabel: 'Earth Focus',
      metricDetoursLabel: 'Detours Logged',
      metricMoodLabel: 'Alien State',
      pokeBtn: 'Transmit Signal to Gorg 👽',
      pokedNotice: 'Gorg received your signal!',
      logTitle: 'EXPEDITION OBSERVATION TIMELINE',
      emptyLog: 'No human anomalies logged yet. Launch an expedition to start!',
      soundTitle: 'Alien Chitter & Telepathy',
      effectsTitle: 'UFO Abduction Tractor Beam',
    },
  },
  cipher: { // Bolt (Cyber Bot)
    id: 'cipher',
    name: 'Bolt',
    avatarEmoji: '⚡',
    hubTitle: "Bolt's Workshop",
    hubSubtitle: 'Precision Builder & Mechanic Bench',
    badge: 'WORKSHOP',
    tagline: 'Keeping your build pipeline organized and on schedule',
    fontFamily: '"SF Mono", "Fira Code", monospace, sans-serif',
    colors: {
      bgApp: '#1a1306',
      bgAppGradient: 'radial-gradient(ellipse at 50% 0%, #362408 0%, #1a1306 75%)',
      bgCard: 'rgba(54, 36, 8, 0.65)',
      bgCardHover: 'rgba(82, 54, 12, 0.75)',
      bgInput: '#100c04',
      textPrimary: '#fffbeb',
      textSecondary: '#fcd34d',
      textDim: '#d97706',
      accent: '#f59e0b',
      accentGlow: 'rgba(245, 158, 11, 0.25)',
      border: 'rgba(245, 158, 11, 0.25)',
      borderActive: '#f59e0b',
    },
    copy: {
      tabFocus: '⚙️ Workbench',
      tabLog: '📋 Blueprint Log',
      tabSettings: '🔧 Diagnostics',
      sprintCardLabel: 'LOCK IN BUILD OBJECTIVE',
      sprintPlaceholder: 'What are we wrenching on today?',
      sprintStartBtn: 'Start Build ⚡',
      sprintRunningBadge: '⚙️ WORKSHOP ASSEMBLY ACTIVE',
      metricFocusLabel: 'Wrench Time',
      metricDetoursLabel: 'Drift Count',
      metricMoodLabel: 'Bot Status',
      pokeBtn: 'Check Diagnostics with Bolt ⚡',
      pokedNotice: 'Diagnostic ping acknowledged!',
      logTitle: 'WORKSHOP SHIFT TIMELINE',
      emptyLog: 'Workbench clear. Lock in a build sprint to start logging progress!',
      soundTitle: 'Pneumatic Whistles & Clicks',
      effectsTitle: 'Hazard Stripe Caution Bar',
    },
  },
  aero: { // Momo (Pink Puff)
    id: 'aero',
    name: 'Momo',
    avatarEmoji: '🐙',
    hubTitle: "Momo's Sanctuary",
    hubSubtitle: 'Mindful Garden & Serenity Tea Room',
    badge: 'SANCTUARY',
    tagline: 'Gentle encouragement, peaceful breathing, and cozy focus',
    fontFamily: 'ui-rounded, "Comic Sans MS", "Quicksand", -apple-system, sans-serif',
    colors: {
      bgApp: '#1f0d18',
      bgAppGradient: 'radial-gradient(ellipse at 50% 0%, #421532 0%, #1f0d18 75%)',
      bgCard: 'rgba(66, 21, 50, 0.65)',
      bgCardHover: 'rgba(92, 29, 70, 0.75)',
      bgInput: '#140810',
      textPrimary: '#fdf2f8',
      textSecondary: '#fbcfe8',
      textDim: '#f472b6',
      accent: '#f472b6',
      accentGlow: 'rgba(244, 114, 182, 0.3)',
      border: 'rgba(244, 114, 182, 0.25)',
      borderActive: '#f472b6',
    },
    copy: {
      tabFocus: '🌸 Zen Garden',
      tabLog: '📖 Memory Book',
      tabSettings: '✨ Ambience',
      sprintCardLabel: 'SET TODAY’S INTENTION',
      sprintPlaceholder: 'What lovely goal are we nurturing?',
      sprintStartBtn: 'Begin Mindful Session 🌸',
      sprintRunningBadge: '🌸 COZY FLOW STATE ACTIVE',
      metricFocusLabel: 'Zen Time',
      metricDetoursLabel: 'Wanderings',
      metricMoodLabel: 'Heart State',
      pokeBtn: 'Give Momo a Warm Hug 🐙',
      pokedNotice: 'Momo sends cozy warm sparkles! 💕',
      logTitle: 'GARDEN MEMORY TIMELINE',
      emptyLog: 'The garden is quiet and peaceful. Set an intention to begin!',
      soundTitle: 'Sweet Animalese Chirps',
      effectsTitle: 'Heart & Blossom Rain',
    },
  },
  kuro: { // Kuro (Red Imp)
    id: 'kuro',
    name: 'Kuro',
    avatarEmoji: '👹',
    hubTitle: "Kuro's Lair",
    hubSubtitle: 'Mischief Dungeon & Accountability Forge',
    badge: 'LAIR',
    tagline: 'Brutal honesty, cheeky teasing, and no-excuses accountability',
    fontFamily: '"Impact", "Arial Black", -apple-system, sans-serif',
    colors: {
      bgApp: '#1c0808',
      bgAppGradient: 'radial-gradient(ellipse at 50% 0%, #3d0e0e 0%, #1c0808 75%)',
      bgCard: 'rgba(61, 14, 14, 0.65)',
      bgCardHover: 'rgba(90, 20, 20, 0.75)',
      bgInput: '#120404',
      textPrimary: '#fef2f2',
      textSecondary: '#fca5a5',
      textDim: '#ef4444',
      accent: '#ef4444',
      accentGlow: 'rgba(239, 68, 68, 0.3)',
      border: 'rgba(239, 68, 68, 0.3)',
      borderActive: '#ef4444',
    },
    copy: {
      tabFocus: '🔥 War Room',
      tabLog: '💀 Shame Ledger',
      tabSettings: '⚔️ Forge',
      sprintCardLabel: 'PROVE YOUR VALUE (GOAL)',
      sprintPlaceholder: 'What task will you actually finish, mortal?',
      sprintStartBtn: 'Lock In or Suffer 🔥',
      sprintRunningBadge: '🔥 NO DISTRACTIONS ALLOWED',
      metricFocusLabel: 'Grind Time',
      metricDetoursLabel: 'Slack Count',
      metricMoodLabel: 'Imp Temper',
      pokeBtn: 'Dare to Poke the Imp 👹',
      pokedNotice: 'Kuro growls playfully!',
      logTitle: 'MISCHIEF & SLACKING LEDGER',
      emptyLog: 'No slacking caught yet. Let’s see if you can keep it up!',
      soundTitle: 'Raspy Imp Growls',
      effectsTitle: 'Soot Puff & Scratch Marks',
    },
  },
  atlas: { // Glitch (Blue Ghost)
    id: 'atlas',
    name: 'Glitch',
    avatarEmoji: '👾',
    hubTitle: "Glitch's Arcade",
    hubSubtitle: 'Retro 8-Bit Quest Arcade',
    badge: 'ARCADE',
    tagline: 'Leveling up your daily quests with lo-fi retro vibes',
    fontFamily: '"Courier New", "Lucida Console", monospace',
    colors: {
      bgApp: '#081426',
      bgAppGradient: 'radial-gradient(ellipse at 50% 0%, #0f2b52 0%, #081426 75%)',
      bgCard: 'rgba(15, 43, 82, 0.65)',
      bgCardHover: 'rgba(22, 64, 120, 0.75)',
      bgInput: '#040b17',
      textPrimary: '#f0f9ff',
      textSecondary: '#7dd3fc',
      textDim: '#38bdf8',
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.25)',
      border: 'rgba(56, 189, 248, 0.25)',
      borderActive: '#38bdf8',
    },
    copy: {
      tabFocus: '👾 Stage 1',
      tabLog: '🏆 High Scores',
      tabSettings: '💾 Options',
      sprintCardLabel: 'SELECT MAIN QUEST',
      sprintPlaceholder: 'Input primary quest objectives...',
      sprintStartBtn: 'Press Start 🕹️',
      sprintRunningBadge: '👾 STAGE IN PROGRESS (XP x2)',
      metricFocusLabel: 'Quest Time',
      metricDetoursLabel: 'Side Quests',
      metricMoodLabel: 'Ghost State',
      pokeBtn: 'Insert Coin / Ping Glitch 👾',
      pokedNotice: '+100 XP! Stage ongoing.',
      logTitle: 'QUEST COMPLETION TIMELINE',
      emptyLog: 'Insert coin! Lock in your main quest to start racking up XP.',
      soundTitle: '8-Bit Square Wave Beeps',
      effectsTitle: 'CRT Scanlines & Pixel Dissolve',
    },
  },
};
