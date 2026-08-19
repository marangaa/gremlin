import { type OrganismId, type OrganismState, ORGANISM_MODELS } from '../personalities/types';

export class SpriteEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private organismId: OrganismId = 'nexus';
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

  public triggerBurst(type: 'spark' | 'zzz' | 'exclamation') {
    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.nexus;
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
        color: type === 'zzz' ? '#94a3b8' : model.accentColor,
        char: type === 'zzz' ? 'z' : type === 'exclamation' ? '!' : undefined,
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
        const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.nexus;
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
    ctx.scale(w / 96, h / 96); // Scale to 96x96 space

    // 1. Draw subtle base shadow / ground aura
    this.drawBaseShadow(ctx);

    // 2. Draw Kenney Pixel Character (No bobbing, firmly grounded)
    this.drawCharacter(ctx);

    // 3. Draw Particles
    this.drawParticles(ctx);

    ctx.restore();
  }

  private drawBaseShadow(ctx: CanvasRenderingContext2D) {
    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.nexus;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(48, 80, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(48, 52, 10, 48, 52, 38);
    grad.addColorStop(0, `${model.accentColor}25`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(48, 52, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCharacter(ctx: CanvasRenderingContext2D) {
    const f = this.currentFrame;
    const isBlinking = (f === 3 && this.currentState === 'idle') || this.currentState === 'sleeping';

    switch (this.organismId) {
      case 'cipher':
        this.renderKenneyYellowBot(ctx, f, isBlinking);
        break;
      case 'aero':
        this.renderKenneyPinkMomo(ctx, f, isBlinking);
        break;
      case 'kuro':
        this.renderKenneyRedGremlin(ctx, f, isBlinking);
        break;
      case 'atlas':
        this.renderKenneyBlueGhost(ctx, f, isBlinking);
        break;
      case 'nexus':
      default:
        this.renderKenneyGreenAlien(ctx, f, isBlinking);
        break;
    }
  }

  // --- 1. KENNEY GREEN ALIEN (Gorg) ---
  private renderKenneyGreenAlien(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Antennae
    ctx.fillStyle = '#15803d';
    ctx.fillRect(36, 18, 4, 10);
    ctx.fillRect(56, 18, 4, 10);

    ctx.fillStyle = '#4ade80';
    ctx.fillRect(34, 14, 8, 8);
    ctx.fillRect(54, 14, 8, 8);

    // Body (Round Kenney green alien)
    ctx.fillStyle = '#22c55e';
    this.pixelRect(ctx, 28, 24, 40, 44, 8);

    // Belly patch
    ctx.fillStyle = '#86efac';
    this.pixelRect(ctx, 36, 46, 24, 18, 4);

    // Feet
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(32, 68, 10, 8);
    ctx.fillRect(54, 68, 10, 8);

    // Eyes & Gaze
    this.drawKenneyEyes(ctx, 38, 38, 58, 38, isBlinking, '#22c55e');

    // Mouth / Expression
    ctx.fillStyle = '#14532d';
    if (this.currentState === 'celebrating') {
      ctx.fillRect(44, 50, 8, 4);
    } else if (this.currentState === 'annoyed') {
      ctx.fillRect(44, 52, 8, 2);
    } else {
      ctx.fillRect(44, 50, 8, 2);
    }
  }

  // --- 2. KENNEY PINK CREATURE (Momo) ---
  private renderKenneyPinkMomo(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Cute Ears
    ctx.fillStyle = '#db2777';
    ctx.fillRect(24, 26, 8, 10);
    ctx.fillRect(64, 26, 8, 10);

    // Round Pink Body
    ctx.fillStyle = '#f472b6';
    this.pixelRect(ctx, 26, 28, 44, 42, 10);

    // Cheeks
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(30, 48, 6, 4);
    ctx.fillRect(60, 48, 6, 4);

    // Feet
    ctx.fillStyle = '#db2777';
    ctx.fillRect(32, 70, 10, 6);
    ctx.fillRect(54, 70, 10, 6);

    // Eyes
    this.drawKenneyEyes(ctx, 40, 40, 56, 40, isBlinking, '#f472b6');

    // Smile
    ctx.fillStyle = '#831843';
    ctx.fillRect(46, 52, 4, 3);
  }

  // --- 3. KENNEY YELLOW SPIKY / BOT (Bolt) ---
  private renderKenneyYellowBot(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Antenna
    ctx.fillStyle = '#b45309';
    ctx.fillRect(46, 16, 4, 10);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(44, 12, 8, 6);

    // Golden Body
    ctx.fillStyle = '#fbbf24';
    this.pixelRect(ctx, 28, 26, 40, 42, 8);

    // Cyber Visor / Eye Bar
    ctx.fillStyle = '#1e293b';
    this.pixelRect(ctx, 32, 34, 32, 14, 4);

    // Visor Scanner
    if (isBlinking) {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(36, 40, 24, 2);
    } else {
      const shiftX = Math.round(this.gazeX * 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(44 + shiftX, 37, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(46 + shiftX, 39, 4, 4);
    }

    // Feet
    ctx.fillStyle = '#d97706';
    ctx.fillRect(32, 68, 10, 8);
    ctx.fillRect(54, 68, 10, 8);
  }

  // --- 4. KENNEY BLUE GHOST / CYBER (Glitch) ---
  private renderKenneyBlueGhost(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Ghost Body with wavy skirt
    ctx.fillStyle = '#38bdf8';
    this.pixelRect(ctx, 28, 24, 40, 44, 10);

    // Wavy skirt base
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(28, 66, 8, 6);
    ctx.fillRect(44, 66, 8, 6);
    ctx.fillRect(60, 66, 8, 6);

    // Goggles
    ctx.fillStyle = '#0f172a';
    this.pixelRect(ctx, 32, 36, 32, 14, 4);

    // Goggle Lenses
    if (isBlinking) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(36, 42, 8, 2);
      ctx.fillRect(52, 42, 8, 2);
    } else {
      const shiftX = Math.round(this.gazeX * 2);
      const shiftY = Math.round(this.gazeY * 2);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(36, 38, 8, 10);
      ctx.fillRect(52, 38, 8, 10);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(38 + shiftX, 40 + shiftY, 4, 4);
      ctx.fillRect(54 + shiftX, 40 + shiftY, 4, 4);
    }
  }

  // --- 5. KENNEY RED IMP (Kuro) ---
  private renderKenneyRedGremlin(ctx: CanvasRenderingContext2D, f: number, isBlinking: boolean) {
    // Horns
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(28, 16, 6, 12);
    ctx.fillRect(62, 16, 6, 12);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(30, 14, 4, 6);
    ctx.fillRect(62, 14, 4, 6);

    // Crimson Body
    ctx.fillStyle = '#ef4444';
    this.pixelRect(ctx, 26, 26, 44, 42, 8);

    // Feet
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(32, 68, 10, 8);
    ctx.fillRect(54, 68, 10, 8);

    // Expressive Eyes
    this.drawKenneyEyes(ctx, 38, 38, 58, 38, isBlinking, '#ef4444');

    // Fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(44, 52, 3, 4);
    ctx.fillRect(50, 52, 3, 4);
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
