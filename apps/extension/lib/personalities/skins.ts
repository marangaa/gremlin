import { type OrganismId } from './types';

export interface CharacterSkin {
  id: OrganismId;
  name: string;
  tagline: string;
  greeting: string;
  pokeNotice: string;
  colors: {
    step1: string; // App background (Neutral dark)
    step2: string; // Panel background (Subtle neutral)
    step3: string; // Card / Input background
    step4: string; // Hover state background
    step5: string; // Active / Selected background
    step6: string; // Subtle hairline borders
    step7: string; // Interactive border / focus ring
    step8: string; // Accent active border
    step9: string; // Primary Accent (Character Solid)
    step10: string; // Primary Accent Hover
    step11: string; // Muted Secondary Text
    step12: string; // High Contrast Primary Text
  };
}

// Universal soothing neutral dark base scale
const BASE_NEUTRAL_DARK = {
  step1: '#090a0f', // Deep neutral charcoal base
  step2: '#11131a', // Layer 1 Panel background
  step3: '#181b24', // Layer 2 Card / Input surface
  step4: '#202430', // Hover surface
  step5: '#282d3d', // Active selected surface
  step6: 'rgba(255, 255, 255, 0.07)', // Hairline border
  step7: 'rgba(255, 255, 255, 0.14)', // Interactive border
  step11: '#94a3b8', // Crisp slate secondary text
  step12: '#f8fafc', // Bright white primary text
};

export const CHARACTER_SKINS: Record<OrganismId, CharacterSkin> = {
  Sarge: {
    id: 'Sarge',
    name: 'Sarge',
    tagline: 'Pain is temporary. Quitting is forever.',
    greeting: 'No surrender. No scrolling. Lock in and execute.',
    pokeNotice: 'Sarge stared right through you. "Get back to work!"',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(249, 115, 22, 0.4)',
      step9: '#f97316', // Blaze Orange
      step10: '#ea580c',
    },
  },
  waifu: {
    id: 'waifu',
    name: 'Waifu',
    tagline: 'Sweet, loving, and cheering you on with cute energy.',
    greeting: 'Yay! Let’s do our best today! I believe in you! 🌸',
    pokeNotice: 'Waifu blushed and cheered: "Lock in, anata! 💕"',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(236, 72, 153, 0.4)',
      step9: '#ec4899', // Sakura Pink
      step10: '#db2777',
    },
  },
  sherlock: {
    id: 'sherlock',
    name: 'Sherlock',
    tagline: 'Sharp analytical deduction of your digital footprint.',
    greeting: 'The digital clues reveal an ambitious goal. Proceed.',
    pokeNotice: 'Sherlock adjusted his magnifying glass and took notes.',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(59, 130, 246, 0.4)',
      step9: '#3b82f6', // Detective Blue
      step10: '#2563eb',
    },
  },
  kuro: {
    id: 'kuro',
    name: 'Kuro',
    tagline: 'Direct accountability when you start wandering.',
    greeting: 'Caught in 4K if you slack. Let’s see what you’ve got.',
    pokeNotice: 'Kuro rolled eyes: "Stop poking me and finish your task!"',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(239, 68, 68, 0.4)',
      step9: '#ef4444', // Crimson Red
      step10: '#dc2626',
    },
  },
  sensei: {
    id: 'sensei',
    name: 'Sensei',
    tagline: 'Tranquil wisdom, deep breaths, and deliberate action.',
    greeting: 'Breathe. One keystroke at a time. Enter the flow.',
    pokeNotice: 'Sensei bowed in serene silence.',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(16, 185, 129, 0.4)',
      step9: '#10b981', // Bamboo Emerald
      step10: '#059669',
    },
  },
};
