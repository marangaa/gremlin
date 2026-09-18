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
    tagline: 'Zero excuses. Lock in on the objective.',
    greeting: 'Twelve minutes left on this sprint. Hands on keyboard. Move.',
    pokeNotice: 'Sarge glared: "Do not touch the coach. Finish the objective."',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(249, 115, 22, 0.4)',
      step9: '#f97316', // Blaze Orange
      step10: '#ea580c',
    },
  },
  waifu: {
    id: 'waifu',
    name: 'Momo',
    tagline: 'Honest accountability disguised as sweet encouragement.',
    greeting: "Let's make real progress today. Pick one task and see it through. ✨",
    pokeNotice: 'Momo tapped your screen: "No procrastination pokes. Let\'s finish this! ♡"',
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
    pokeNotice: 'Sherlock raised an eyebrow: "Prodding me will not solve your bug."',
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
    tagline: 'Cheeky chaos gremlin with zero tolerance for fake productivity.',
    greeting: "Let's see if you can work for thirty minutes without falling down a rabbit hole.",
    pokeNotice: 'Kuro dodged your click: "Click the code editor, not me! 💀"',
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
    greeting: 'Breathe. One keystroke at a time. The work awaits your presence.',
    pokeNotice: 'Sensei smiled calmly: "Peace is found in completing the task, not in poking."',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(16, 185, 129, 0.4)',
      step9: '#10b981', // Bamboo Emerald
      step10: '#059669',
    },
  },
  byte: {
    id: 'byte',
    name: 'Byte',
    tagline: 'Your focus daemon. Terminating rogue distraction threads.',
    greeting: '> focus_daemon online. monitoring sprint execution.',
    pokeNotice: '> err: cursor input dropped. target socket locked on task.',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(34, 211, 238, 0.4)',
      step9: '#22d3ee', // Terminal Cyan
      step10: '#06b6d4',
    },
  },
  pixel: {
    id: 'pixel',
    name: 'Pixel',
    tagline: 'Pure feline contempt to shame you back to work.',
    greeting: 'mrrp. you promised you would work. sit down.',
    pokeNotice: 'Pixel swatted your cursor away: "Get back to work."',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(250, 204, 21, 0.4)',
      step9: '#facc15', // Cat-Eye Yellow
      step10: '#eab308',
    },
  },
  ufo: {
    id: 'ufo',
    name: 'Zeta',
    tagline: 'Studying fragile human focus from orbit. Abducting distractions.',
    greeting: 'specimen focus tracking initiated. mission clock active.',
    pokeNotice: 'Zeta logged the probe: "Tactile disturbance recorded. Specimen still off-task."',
    colors: {
      ...BASE_NEUTRAL_DARK,
      step8: 'rgba(139, 92, 246, 0.4)',
      step9: '#8b5cf6', // Abduction Violet
      step10: '#7c3aed',
    },
  },
};
