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
    archetype: 'The drill instructor',
    color: '#FF9350',
    glow: 'rgba(255, 147, 80, 0.16)',
    sprites: {
      idle: ['/sprites/characters/tile_0012.png', '/sprites/characters/tile_0013.png'],
      action: '/sprites/characters/tile_0014.png',
    },
    remark: "You have 15 minutes left on this sprint and you're reading about watches. Move.",
    lore: 'Zero excuses. Treats your afternoon slump like a personal insult and barks at you to close your tabs.',
    voice: 'Low square-wave bark',
  },
  {
    id: 'waifu',
    name: 'Waifu',
    archetype: 'The cheerleader',
    color: '#FF7EB0',
    glow: 'rgba(255, 126, 176, 0.16)',
    sprites: {
      idle: ['/sprites/characters/tile_0006.png', '/sprites/characters/tile_0007.png'],
      action: '/sprites/characters/tile_0008.png',
    },
    remark: 'Are we really reading Reddit right now? Do it for me, close the tab 💕',
    lore: 'A supportive companion who uses weaponized guilt and cute encouragement to keep your hands on the keyboard.',
    voice: 'High sine-wave chirp',
  },
  {
    id: 'sherlock',
    name: 'Sherlock',
    archetype: 'The investigator',
    color: '#EFD06B',
    glow: 'rgba(239, 208, 107, 0.15)',
    sprites: {
      idle: ['/sprites/characters/tile_0003.png', '/sprites/characters/tile_0004.png'],
      action: '/sprites/characters/tile_0005.png',
    },
    remark: 'Curious. We were researching APIs ten minutes ago, and now we are looking at vintage keyboards.',
    lore: 'Investigates your browser trail. Will politely interrogate you when you inevitably wander off-topic.',
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
    remark: 'Bro really opened Wikipedia to read about medieval cheese instead of working. Tragic 💀',
    lore: 'A menace who roasts your procrastination habits. Zero mercy for tab hoarders and doomscrollers.',
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
    remark: 'The mind wanders to the algorithm’s feed. Let us gently close the tab.',
    lore: 'Gentle mindfulness. Will make you feel profoundly disappointed in yourself without ever raising his voice.',
    voice: 'Warm triangle-wave tone',
  },
];

export const companionById = (id: CompanionId): Companion =>
  COMPANIONS.find((c) => c.id === id) ?? COMPANIONS[0];

/**
 * Procedural Audio preview using Web Audio API
 */
export function playCharacterVoice(id: CompanionId) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (id === 'Sarge') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);
    } else if (id === 'waifu') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.15);
    } else if (id === 'sherlock') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(330, now + 0.08);
      osc.frequency.setValueAtTime(260, now + 0.16);
    } else if (id === 'kuro') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.25);
    }

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // AudioContext blocked or not supported
  }
}
