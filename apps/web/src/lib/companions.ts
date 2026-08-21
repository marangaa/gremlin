export type CompanionId = 'Sarge' | 'waifu' | 'sherlock' | 'kuro' | 'sensei';

export interface Companion {
  id: CompanionId;
  name: string;
  archetype: string;
  color: string;
  glow: string;
  sprites: {
    idle: [string, string];
    action: string;
  };
  remark: string;
  lore: string;
  voice: string;
}

/**
 * The roster. Sprite tiles are the exact assets shipped in the extension
 * (Kenney pixel characters), mapped in `AnimatedSprite.tsx` there.
 */
export const COMPANIONS: Companion[] = [
  {
    id: 'Sarge',
    name: 'Sarge',
    archetype: 'The disciplinarian',
    color: '#FF9350',
    glow: 'rgba(255, 147, 80, 0.16)',
    sprites: {
      idle: ['/sprites/characters/tile_0012.png', '/sprites/characters/tile_0013.png'],
      action: '/sprites/characters/tile_0014.png',
    },
    remark: "Deadlines do not wait. Neither do you. Move.",
    lore: 'Relentless accountability. Calls out your excuses before you finish making them.',
    voice: 'Low square-wave bark',
  },
  {
    id: 'waifu',
    name: 'Waifu',
    archetype: 'The supportive cheerleader',
    color: '#FF7EB0',
    glow: 'rgba(255, 126, 176, 0.16)',
    sprites: {
      idle: ['/sprites/characters/tile_0006.png', '/sprites/characters/tile_0007.png'],
      action: '/sprites/characters/tile_0008.png',
    },
    remark: 'Anata, why are we doomscrolling? Stay focused for me, okay? 💕',
    lore: 'Sweet, affectionate encouragement — with a light sprinkle of gentle guilt.',
    voice: 'High sine-wave chirp',
  },
  {
    id: 'sherlock',
    name: 'Sherlock',
    archetype: 'The forensic detective',
    color: '#EFD06B',
    glow: 'rgba(239, 208, 107, 0.15)',
    sprites: {
      idle: ['/sprites/characters/tile_0003.png', '/sprites/characters/tile_0004.png'],
      action: '/sprites/characters/tile_0005.png',
    },
    remark: 'A curious detour from the case, Watson. The trail grows cold.',
    lore: 'Treats your search trail like crime-scene clues and notices every detour.',
    voice: 'Crisp filtered square-wave',
  },
  {
    id: 'kuro',
    name: 'Kuro',
    archetype: 'The chaos gremlin',
    color: '#6FE3F0',
    glow: 'rgba(111, 227, 240, 0.15)',
    sprites: {
      idle: ['/sprites/characters/tile_0009.png', '/sprites/characters/tile_0010.png'],
      action: '/sprites/characters/tile_0011.png',
    },
    remark: 'Caught in 4K 💀 Bro thought he could sneak five minutes of scrolling.',
    lore: 'Savage roasts in fluent meme. Zero mercy for tab hoarders and rabbit holes.',
    voice: 'Raspy sawtooth growl',
  },
  {
    id: 'sensei',
    name: 'Sensei',
    archetype: 'The zen master',
    color: '#8CE99A',
    glow: 'rgba(140, 233, 154, 0.15)',
    sprites: {
      idle: ['/sprites/characters/tile_0000.png', '/sprites/characters/tile_0001.png'],
      action: '/sprites/characters/tile_0002.png',
    },
    remark: 'Breathe. One keystroke at a time. Return to center.',
    lore: 'Calm, mindful course-correction. Disappointment expressed as tranquility.',
    voice: 'Warm triangle-wave tone',
  },
];

export const companionById = (id: CompanionId): Companion =>
  COMPANIONS.find((c) => c.id === id) ?? COMPANIONS[0];
