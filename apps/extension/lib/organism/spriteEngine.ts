import { type OrganismId, type OrganismState, ORGANISM_MODELS } from '../personalities/types';

export class SpriteEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private organismId: OrganismId = 'goggins';
  private currentState: OrganismState = 'idle';

  private currentFrame = 0;
  private frameTimer = 0;
  private animFps = 4;
  private totalFrames = 4;

  // Particle System
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    size: number;
    color: string;
    char?: string;
  }> = [];

  // Pupil Gaze Offset (-1 to 1)
  private gazeX = 0;
  private gazeY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.ctx.imageSmoothingEnabled = false;
  }

  public setOrganism(id: OrganismId) {
    this.organismId = id;
    this.particles = [];
  }

  public setState(state: OrganismState) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.currentFrame = 0;
    this.frameTimer = 0;

    if (state === 'sleeping') {
      this.animFps = 2;
      this.totalFrames = 4;
    } else if (state === 'celebrating' || state === 'shocked') {
      this.animFps = 6;
      this.totalFrames = 4;
    } else if (state === 'annoyed') {
      this.animFps = 5;
      this.totalFrames = 4;
    } else {
      this.animFps = 3;
      this.totalFrames = 4;
    }
  }

  public setGaze(normalizedX: number, normalizedY: number) {
    this.gazeX = Math.max(-1, Math.min(1, normalizedX));
    this.gazeY = Math.max(-1, Math.min(1, normalizedY));
  }

  public triggerBurst(type: 'spark' | 'zzz' | 'exclamation' | 'heart') {
    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.goggins;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const speed = 1.2 + Math.random() * 1.5;
      this.particles.push({
        x: 48,
        y: 48,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        alpha: 1,
        size: 3 + Math.random() * 3,
        color: type === 'zzz' ? '#94a3b8' : type === 'heart' ? '#ec4899' : model.accentColor,
        char: type === 'zzz' ? 'z' : type === 'exclamation' ? '!' : type === 'heart' ? '♥' : undefined,
      });
    }
  }

  public update(dtMs: number) {
    this.frameTimer += dtMs;
    const frameDuration = 1000 / this.animFps;

    if (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;

      // Ambient particles
      if (this.currentState === 'sleeping' && Math.random() < 0.15) {
        this.particles.push({
          x: 52 + (Math.random() - 0.5) * 12,
          y: 32,
          vx: 0.3 + Math.random() * 0.3,
          vy: -0.6 - Math.random() * 0.4,
          alpha: 1,
          size: 11,
          color: '#94a3b8',
          char: 'z',
        });
      } else if (this.currentState === 'celebrating' && Math.random() < 0.25) {
        const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.goggins;
        this.particles.push({
          x: 48 + (Math.random() - 0.5) * 28,
          y: 48,
          vx: (Math.random() - 0.5) * 1.8,
          vy: -1.2 - Math.random() * 1.5,
          alpha: 1,
          size: 3,
          color: model.accentColor,
        });
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.currentState === 'hidden') return;

    ctx.save();
    ctx.scale(w / 96, h / 96); // Scale to 96x96 virtual space

    // 1. Draw Pixel Character (crisp, floating with clean outline)
    this.drawCharacter(ctx);

    // 2. Draw Particles
    this.drawParticles(ctx);

    ctx.restore();
  }

  private drawCharacter(ctx: CanvasRenderingContext2D) {
    const f = this.currentFrame;
    const isBlinking = (f === 3 && this.currentState === 'idle') || this.currentState === 'sleeping';

    switch (this.organismId) {
      case 'goggins':
        this.renderGogginsBot(ctx, f, isBlinking);
        break;
      case 'waifu':
        this.renderWaifuMomo(ctx, f, isBlinking);
        break;
      case 'sherlock':
        this.renderSherlockDetective(ctx, f, isBlinking);
        break;
      case 'kuro':
        this.renderKuroGremlin(ctx, f, isBlinking);
        break;
      case 'sensei':
      default:
        this.renderSenseiMonk(ctx, f, isBlinking);
        break;
    }
  }

  // --- 1. GOGGINS (Blaze Orange Disciplinarian Robot) ---
  private renderGogginsBot(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Sweatband / Headband
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(26, 20, 44, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(44, 22, 8, 4);

    // Rugged Square Chassis
    ctx.fillStyle = '#f97316';
    this.pixelRect(ctx, 26, 26, 44, 42, 6);

    // Pauldrons / Shoulders
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(20, 36, 6, 16);
    ctx.fillRect(70, 36, 6, 16);

    // Heavy Metal Feet
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(30, 68, 12, 8);
    ctx.fillRect(54, 68, 12, 8);

    // Cyber HUD Visor
    ctx.fillStyle = '#0f172a';
    this.pixelRect(ctx, 30, 34, 36, 16, 4);

    // Glowing Tactical Scanner
    if (isBlinking) {
      ctx.fillStyle = '#f97316';
      ctx.fillRect(34, 41, 28, 2);
    } else {
      const shiftX = Math.round(this.gazeX * 3);
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(38 + shiftX, 37, 8, 8);
      ctx.fillRect(50 + shiftX, 37, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40 + shiftX, 39, 3, 3);
      ctx.fillRect(52 + shiftX, 39, 3, 3);
    }

    // Stern Grid Mouth
    ctx.fillStyle = '#7c2d12';
    if (this.currentState === 'celebrating') {
      ctx.fillRect(42, 54, 12, 4);
    } else {
      ctx.fillRect(42, 54, 12, 2);
    }
  }

  // --- 2. WAIFU (Sakura Pink Cheerful Companion) ---
  private renderWaifuMomo(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Bunny / Cat Ears
    ctx.fillStyle = '#db2777';
    ctx.fillRect(24, 16, 8, 14);
    ctx.fillRect(64, 16, 8, 14);
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(26, 18, 4, 8);
    ctx.fillRect(66, 18, 4, 8);

    // Soft Pink Body
    ctx.fillStyle = '#ec4899';
    this.pixelRect(ctx, 26, 26, 44, 44, 12);

    // Blushing Cheeks
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(30, 48, 6, 4);
    ctx.fillRect(60, 48, 6, 4);

    // Cute Feet
    ctx.fillStyle = '#be185d';
    ctx.fillRect(34, 70, 8, 6);
    ctx.fillRect(54, 70, 8, 6);

    // Expressive Eyes
    this.drawKenneyEyes(ctx, 40, 40, 56, 40, isBlinking, '#ec4899');

    // Sweet Smile
    ctx.fillStyle = '#831843';
    if (this.currentState === 'celebrating') {
      ctx.fillRect(44, 52, 8, 4);
    } else {
      ctx.fillRect(46, 52, 4, 3);
    }
  }

  // --- 3. SHERLOCK (Amber/Gold Detective Bot) ---
  private renderSherlockDetective(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Noir Hat & Brim
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(22, 20, 52, 6);
    ctx.fillRect(30, 10, 36, 12);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(30, 18, 36, 3);

    // Detective Trenchcoat Body
    ctx.fillStyle = '#1e293b';
    this.pixelRect(ctx, 28, 26, 40, 44, 8);

    // Gold Monocle / Scanner on Left Eye
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(34, 36, 14, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(36, 38, 10, 10);

    // Monocle Lens Glow
    if (isBlinking) {
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(38, 42, 6, 2);
      ctx.fillRect(56, 42, 6, 2);
    } else {
      const shiftX = Math.round(this.gazeX * 2);
      const shiftY = Math.round(this.gazeY * 2);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(38 + shiftX, 40 + shiftY, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(39 + shiftX, 40 + shiftY, 2, 2);

      // Normal Right Eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(54, 38, 10, 10);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(56 + shiftX, 40 + shiftY, 6, 6);
    }

    // Feet
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(32, 70, 10, 6);
    ctx.fillRect(54, 70, 10, 6);
  }

  // --- 4. KURO (Crimson Chaos Gremlin) ---
  private renderKuroGremlin(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Sharp Horns
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(28, 14, 6, 14);
    ctx.fillRect(62, 14, 6, 14);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(30, 12, 4, 6);
    ctx.fillRect(62, 12, 4, 6);

    // Crimson Gremlin Body
    ctx.fillStyle = '#ef4444';
    this.pixelRect(ctx, 26, 26, 44, 42, 8);

    // Feet
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(32, 68, 10, 8);
    ctx.fillRect(54, 68, 10, 8);

    // Cyber Piercing Eyes
    this.drawKenneyEyes(ctx, 38, 38, 58, 38, isBlinking, '#ef4444');

    // Gremlin Fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(44, 52, 3, 4);
    ctx.fillRect(50, 52, 3, 4);
  }

  // --- 5. SENSEI (Emerald Zen Master) ---
  private renderSenseiMonk(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Floating Wisdom Antennae / Halo Node
    ctx.fillStyle = '#047857';
    ctx.fillRect(36, 16, 4, 10);
    ctx.fillRect(56, 16, 4, 10);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(34, 12, 8, 8);
    ctx.fillRect(54, 12, 8, 8);

    // Zen Emerald Body
    ctx.fillStyle = '#10b981';
    this.pixelRect(ctx, 28, 24, 40, 44, 10);

    // Bamboo Belly Patch
    ctx.fillStyle = '#6ee7b7';
    this.pixelRect(ctx, 36, 46, 24, 18, 4);

    // Feet
    ctx.fillStyle = '#059669';
    ctx.fillRect(32, 68, 10, 8);
    ctx.fillRect(54, 68, 10, 8);

    // Serene Eyes
    this.drawKenneyEyes(ctx, 38, 38, 58, 38, isBlinking, '#10b981');

    // Peaceful Smile
    ctx.fillStyle = '#064e3b';
    if (this.currentState === 'celebrating') {
      ctx.fillRect(44, 50, 8, 4);
    } else {
      ctx.fillRect(44, 50, 8, 2);
    }
  }

  private drawKenneyEyes(
    ctx: CanvasRenderingContext2D,
    leftX: number,
    leftY: number,
    rightX: number,
    rightY: number,
    isBlinking: boolean,
    _bg: string,
  ) {
    if (isBlinking) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(leftX - 4, leftY + 2, 8, 3);
      ctx.fillRect(rightX - 4, rightY + 2, 8, 3);
      return;
    }

    const shiftX = Math.round(this.gazeX * 2.5);
    const shiftY = Math.round(this.gazeY * 2);

    // Eye Whites
    ctx.fillStyle = '#ffffff';
    this.pixelRect(ctx, leftX - 6, leftY - 6, 12, 14, 3);
    this.pixelRect(ctx, rightX - 6, rightY - 6, 12, 14, 3);

    // Pupils
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(leftX - 2 + shiftX, leftY - 2 + shiftY, 6, 6);
    ctx.fillRect(rightX - 2 + shiftX, rightY - 2 + shiftY, 6, 6);

    // White Glint
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(leftX - 1 + shiftX, leftY - 2 + shiftY, 2, 2);
    ctx.fillRect(rightX - 1 + shiftX, rightY - 2 + shiftY, 2, 2);
  }

  private pixelRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r = 0,
  ) {
    if (r === 0) {
      ctx.fillRect(x, y, w, h);
      return;
    }
    ctx.fillRect(x + r, y, w - r * 2, h);
    ctx.fillRect(x, y + r, w, h - r * 2);
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.char) {
        ctx.font = `bold ${p.size}px monospace`;
        ctx.fillText(p.char, p.x, p.y);
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.restore();
    }
  }
}
