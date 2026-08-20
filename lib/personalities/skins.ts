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
    hubTitle: 'Gorg',
    hubSubtitle: 'Quiet desk companion taking notes on your browsing habits',
    badge: 'OBSERVER',
    tagline: 'Quietly watching your tabs with genuine curiosity',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    colors: {
      bgApp: '#08130c',
      bgAppGradient: 'radial-gradient(circle at 50% 0%, #0f2919 0%, #08130c 70%)',
      bgCard: 'rgba(255, 255, 255, 0.03)',
      bgCardHover: 'rgba(255, 255, 255, 0.06)',
      bgInput: '#040b07',
      textPrimary: '#f0fdf4',
      textSecondary: '#86efac',
      textDim: '#4ade80',
      accent: '#22c55e',
      accentGlow: 'rgba(34, 197, 94, 0.2)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderActive: '#22c55e',
    },
    copy: {
      tabFocus: 'Focus',
      tabLog: 'History',
      tabSettings: 'Settings',
      sprintCardLabel: 'CURRENT TASK',
      sprintPlaceholder: 'What are you working on right now?',
      sprintStartBtn: 'Start Focus Session',
      sprintRunningBadge: 'SESSION IN PROGRESS',
      metricFocusLabel: 'Focus Time',
      metricDetoursLabel: 'Detours',
      metricMoodLabel: 'Mood',
      pokeBtn: 'Say Hi to Gorg',
      pokedNotice: 'Gorg looked up from the notepad.',
      logTitle: 'TODAY’S ACTIVITY',
      emptyLog: 'No browsing events recorded yet. Start a session to begin.',
      soundTitle: 'Chirps and voice sounds',
      effectsTitle: 'Gentle screen reminders',
    },
  },
  cipher: { // Bolt (Cyber Bot)
    id: 'cipher',
    name: 'Bolt',
    avatarEmoji: '⚡',
    hubTitle: 'Bolt',
    hubSubtitle: 'Workshop assistant helping you finish tasks on time',
    badge: 'MECHANIC',
    tagline: 'No fluff, just straightforward task tracking',
    fontFamily: '"SF Mono", "Fira Code", monospace, sans-serif',
    colors: {
      bgApp: '#141008',
      bgAppGradient: 'radial-gradient(circle at 50% 0%, #2a2010 0%, #141008 70%)',
      bgCard: 'rgba(255, 255, 255, 0.03)',
      bgCardHover: 'rgba(255, 255, 255, 0.06)',
      bgInput: '#0b0803',
      textPrimary: '#fef3c7',
      textSecondary: '#fcd34d',
      textDim: '#f59e0b',
      accent: '#f59e0b',
      accentGlow: 'rgba(245, 158, 11, 0.2)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderActive: '#f59e0b',
    },
    copy: {
      tabFocus: 'Workbench',
      tabLog: 'Shift Log',
      tabSettings: 'Config',
      sprintCardLabel: 'WORKBENCH GOAL',
      sprintPlaceholder: 'What are we building today, boss?',
      sprintStartBtn: 'Start Shift',
      sprintRunningBadge: 'SHIFT ACTIVE',
      metricFocusLabel: 'Shift Time',
      metricDetoursLabel: 'Off-Track',
      metricMoodLabel: 'Status',
      pokeBtn: 'Check in with Bolt',
      pokedNotice: 'Bolt tightened a wrench and nodded.',
      logTitle: 'SHIFT TIMELINE',
      emptyLog: 'Workbench is clear. Set a goal to start working.',
      soundTitle: 'Mechanical clicks and beeps',
      effectsTitle: 'Workshop hazard stripes',
    },
  },
  aero: { // Momo (Pink Puff)
    id: 'aero',
    name: 'Momo',
    avatarEmoji: '🐙',
    hubTitle: 'Momo',
    hubSubtitle: 'A gentle presence for steady, calm work',
    badge: 'ZEN',
    tagline: 'Soft encouragement and steady pacing',
    fontFamily: 'ui-rounded, "Comfortaa", -apple-system, sans-serif',
    colors: {
      bgApp: '#140a12',
      bgAppGradient: 'radial-gradient(circle at 50% 0%, #281424 0%, #140a12 70%)',
      bgCard: 'rgba(255, 255, 255, 0.03)',
      bgCardHover: 'rgba(255, 255, 255, 0.06)',
      bgInput: '#0c050a',
      textPrimary: '#fdf2f8',
      textSecondary: '#f472b6',
      textDim: '#ec4899',
      accent: '#f472b6',
      accentGlow: 'rgba(244, 114, 182, 0.2)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderActive: '#f472b6',
    },
    copy: {
      tabFocus: 'Peace',
      tabLog: 'Reflection',
      tabSettings: 'Options',
      sprintCardLabel: 'GENTLE GOAL',
      sprintPlaceholder: 'What would you like to finish at your own pace?',
      sprintStartBtn: 'Begin Cozy Session',
      sprintRunningBadge: 'IN FLOW',
      metricFocusLabel: 'Calm Time',
      metricDetoursLabel: 'Pauses',
      metricMoodLabel: 'Feeling',
      pokeBtn: 'Send Love to Momo',
      pokedNotice: 'Momo floated up happily.',
      logTitle: 'TODAY’S PACE',
      emptyLog: 'No notes yet. Take a breath and begin when ready.',
      soundTitle: 'Soft chime notes',
      effectsTitle: 'Floating heart sparkles',
    },
  },
  kuro: { // Kuro (Cheeky Imp)
    id: 'kuro',
    name: 'Kuro',
    avatarEmoji: '👹',
    hubTitle: 'Kuro',
    hubSubtitle: 'Direct accountability with zero excuses',
    badge: 'HONEST',
    tagline: 'Here to call you out when you wander onto social media',
    fontFamily: '"Impact", "Arial Black", -apple-system, sans-serif',
    colors: {
      bgApp: '#140606',
      bgAppGradient: 'radial-gradient(circle at 50% 0%, #2c0c0c 0%, #140606 70%)',
      bgCard: 'rgba(255, 255, 255, 0.03)',
      bgCardHover: 'rgba(255, 255, 255, 0.06)',
      bgInput: '#0a0303',
      textPrimary: '#fef2f2',
      textSecondary: '#f87171',
      textDim: '#ef4444',
      accent: '#ef4444',
      accentGlow: 'rgba(239, 68, 68, 0.2)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderActive: '#ef4444',
    },
    copy: {
      tabFocus: 'Lock In',
      tabLog: 'Detour Log',
      tabSettings: 'Config',
      sprintCardLabel: 'ACTUAL TASK',
      sprintPlaceholder: 'What are you supposed to be doing right now?',
      sprintStartBtn: 'Lock In Now',
      sprintRunningBadge: 'LOCKED IN',
      metricFocusLabel: 'Real Work',
      metricDetoursLabel: 'Slacking',
      metricMoodLabel: 'Imp Mood',
      pokeBtn: 'Prod Kuro',
      pokedNotice: 'Kuro rolled eyes but watched closely.',
      logTitle: 'DETOURS & BROWSING',
      emptyLog: 'Nothing logged yet. Stay focused or get roasted.',
      soundTitle: 'Raspy grunts and chirps',
      effectsTitle: 'Soot puffs and claw marks',
    },
  },
  atlas: { // Glitch (Arcade Ghost)
    id: 'atlas',
    name: 'Glitch',
    avatarEmoji: '👾',
    hubTitle: 'Glitch',
    hubSubtitle: 'Treating your browser sessions like high score runs',
    badge: 'ARCADE',
    tagline: 'Pixelated motivation for deep work sprints',
    fontFamily: '"Press Start 2P", "Courier New", monospace, sans-serif',
    colors: {
      bgApp: '#060d16',
      bgAppGradient: 'radial-gradient(circle at 50% 0%, #0d2038 0%, #060d16 70%)',
      bgCard: 'rgba(255, 255, 255, 0.03)',
      bgCardHover: 'rgba(255, 255, 255, 0.06)',
      bgInput: '#03060a',
      textPrimary: '#f0f9ff',
      textSecondary: '#7dd3fc',
      textDim: '#38bdf8',
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.2)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderActive: '#38bdf8',
    },
    copy: {
      tabFocus: 'Quest',
      tabLog: 'High Scores',
      tabSettings: 'Audio/Video',
      sprintCardLabel: 'MAIN QUEST OBJECTIVE',
      sprintPlaceholder: 'Name your quest objective...',
      sprintStartBtn: 'Press Start',
      sprintRunningBadge: 'STAGE RUNNING',
      metricFocusLabel: 'Quest Time',
      metricDetoursLabel: 'Side Quests',
      metricMoodLabel: 'Player 1',
      pokeBtn: 'Ping Glitch',
      pokedNotice: 'Glitch played a quick 8-bit blip.',
      logTitle: 'QUEST TIMELINE',
      emptyLog: 'Insert coin. Set a quest goal to start.',
      soundTitle: '8-bit retro synthesizer',
      effectsTitle: 'CRT scanlines and glitch pulses',
    },
  },
};
