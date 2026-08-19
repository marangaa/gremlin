import { type OrganismId, type OrganismState, ORGANISM_MODELS } from '../personalities/types';

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnimationClip {
  fps: number;
  loop: boolean;
  frameCount: number;
}

export class SpriteEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private organismId: OrganismId = 'nexus';
  private currentState: OrganismState = 'idle';

  private currentFrame = 0;
  private frameTimer = 0;
  private animFps = 6;
  private totalFrames = 4;
  private loop = true;

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
      this.animFps = 3;
      this.totalFrames = 4;
    } else if (state === 'celebrating' || state === 'shocked') {
      this.animFps = 10;
      this.totalFrames = 4;
    } else if (state === 'annoyed') {
      this.animFps = 8;
      this.totalFrames = 4;
    } else {
      this.animFps = 6;
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
      const speed = 1.5 + Math.random() * 2;
      this.particles.push({
        x: 48,
        y: 48,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
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

      // Spawn ambient particles
      if (this.currentState === 'sleeping' && Math.random() < 0.15) {
        this.particles.push({
          x: 48 + (Math.random() - 0.5) * 16,
          y: 36,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.8 - Math.random() * 0.6,
          alpha: 1,
          size: 10,
          color: '#94a3b8',
          char: 'z',
        });
      } else if (this.currentState === 'celebrating' && Math.random() < 0.3) {
        const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.nexus;
        this.particles.push({
          x: 48 + (Math.random() - 0.5) * 32,
          y: 48,
          vx: (Math.random() - 0.5) * 2,
          vy: -1.5 - Math.random() * 2,
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
    ctx.scale(w / 96, h / 96); // Scale to 96x96 logical coordinate space

    // 1. Draw Ambient Aura / Glow
    this.drawAura(ctx);

    // 2. Draw Sprite Model according to active archetype and frame
    this.drawCharacter(ctx);

    // 3. Draw Particles
    this.drawParticles(ctx);

    ctx.restore();
  }

  private drawAura(ctx: CanvasRenderingContext2D) {
    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.nexus;
    const pulse = Math.sin((this.currentFrame / this.totalFrames) * Math.PI * 2) * 0.15 + 0.85;

    const grad = ctx.createRadialGradient(48, 48, 10, 48, 48, 42);
    grad.addColorStop(0, `${model.accentColor}33`);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(48, 48, 40 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCharacter(ctx: CanvasRenderingContext2D) {
    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.nexus;
    const f = this.currentFrame;
    const bob = Math.sin((f / this.totalFrames) * Math.PI * 2) * (this.currentState === 'celebrating' ? 8 : 3);

    ctx.save();
    ctx.translate(0, bob);

    switch (this.organismId) {
      case 'cipher':
        this.renderCipher(ctx, model.accentColor, f);
        break;
      case 'aero':
        this.renderAero(ctx, model.accentColor, model.secondaryColor, f);
        break;
      case 'kuro':
        this.renderKuro(ctx, model.accentColor, f);
        break;
      case 'atlas':
        this.renderAtlas(ctx, model.accentColor, model.secondaryColor, f);
        break;
      case 'nexus':
      default:
        this.renderNexus(ctx, model.accentColor, model.secondaryColor, f);
        break;
    }

    ctx.restore();
  }

  // --- 1. NEXUS-01 SPRITE ---
  private renderNexus(
    ctx: CanvasRenderingContext2D,
    accent: string,
    secondary: string,
    f: number,
  ) {
    const angle = (Date.now() / 1000) * 1.5;

    // Outer Gyroscope Rings
    ctx.save();
    ctx.translate(48, 48);
    ctx.rotate(angle);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-angle * 1.8);
    ctx.strokeStyle = secondary;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Core Chassis
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, 28, 28, 40, 40, 10, true, true);

    // Visor
    ctx.fillStyle = '#030712';
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, 33, 38, 30, 16, 5, true, true);

    // Optical Eyes / Gaze
    if (this.currentState === 'sleeping') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(37, 46);
      ctx.lineTo(45, 46);
      ctx.moveTo(51, 46);
      ctx.lineTo(59, 46);
      ctx.stroke();
    } else {
      const pupilShiftX = this.gazeX * 3;
      const pupilShiftY = this.gazeY * 2;

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(41, 46, 4, 0, Math.PI * 2);
      ctx.arc(55, 46, 4, 0, Math.PI * 2);
      ctx.fill();

      // White Glints
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(41 + pupilShiftX, 46 + pupilShiftY, 2, 0, Math.PI * 2);
      ctx.arc(55 + pupilShiftX, 46 + pupilShiftY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Telemetry Pulse Line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(35, 60);
    ctx.lineTo(42, 60 + (f % 2 === 0 ? -2 : 2));
    ctx.lineTo(50, 60 + (f % 2 === 0 ? 2 : -2));
    ctx.lineTo(61, 60);
    ctx.stroke();
  }

  // --- 2. CIPHER SPRITE ---
  private renderCipher(ctx: CanvasRenderingContext2D, accent: string, f: number) {
    // Cloak / Shadow Body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(48, 64, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Collar
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(34, 64);
    ctx.lineTo(48, 54);
    ctx.lineTo(62, 64);
    ctx.lineTo(48, 76);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(48, 44, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fedora Hat
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.ellipse(48, 38, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, 32, 22, 32, 16, 4, true, false);

    ctx.fillStyle = accent;
    ctx.fillRect(32, 34, 32, 3);

    // Glowing Amber Scanner Monocle
    if (this.currentState === 'sleeping') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(38, 44);
      ctx.lineTo(46, 44);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(42, 44, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(42 + this.gazeX * 2, 44 + this.gazeY * 1.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 3. AERO SPRITE ---
  private renderAero(
    ctx: CanvasRenderingContext2D,
    accent: string,
    secondary: string,
    f: number,
  ) {
    // Ethereal Wisp Body
    ctx.fillStyle = accent;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(48, 22);
    ctx.bezierCurveTo(32, 22, 26, 36, 28, 54);
    ctx.bezierCurveTo(30, 68, 42, 78, 48, 80);
    ctx.bezierCurveTo(54, 78, 66, 68, 68, 54);
    ctx.bezierCurveTo(70, 36, 64, 22, 48, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sprout Crest
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(48, 20 + (f % 2 === 0 ? -1 : 1), 4, 0, Math.PI * 2);
    ctx.fill();

    // Luminous Eyes
    if (this.currentState === 'sleeping') {
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(40, 48, 4, 0, Math.PI);
      ctx.arc(56, 48, 4, 0, Math.PI);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(40, 46, 4.5, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(56, 46, 4.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle Glints
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(40 + this.gazeX * 2, 45 + this.gazeY * 2, 2, 0, Math.PI * 2);
      ctx.arc(56 + this.gazeX * 2, 45 + this.gazeY * 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 4. KURO SPRITE ---
  private renderKuro(ctx: CanvasRenderingContext2D, accent: string, f: number) {
    // Horns
    ctx.fillStyle = accent;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(34, 32);
    ctx.lineTo(20, 16);
    ctx.lineTo(28, 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(62, 32);
    ctx.lineTo(76, 16);
    ctx.lineTo(68, 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shadow Body
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(48, 54, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Cat Eyes
    if (this.currentState === 'sleeping') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(32, 48);
      ctx.lineTo(42, 46);
      ctx.moveTo(64, 48);
      ctx.lineTo(54, 46);
      ctx.stroke();
    } else {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(30, 44);
      ctx.quadraticCurveTo(40, 40, 44, 48);
      ctx.quadraticCurveTo(36, 52, 30, 44);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(66, 44);
      ctx.quadraticCurveTo(56, 40, 52, 48);
      ctx.quadraticCurveTo(60, 52, 66, 44);
      ctx.fill();

      // Slit Pupil
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(37 + this.gazeX * 2, 46, 1.5, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(59 + this.gazeX * 2, 46, 1.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fangs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(42, 58);
    ctx.lineTo(44, 63);
    ctx.lineTo(46, 58);
    ctx.moveTo(50, 58);
    ctx.lineTo(52, 63);
    ctx.lineTo(54, 58);
    ctx.fill();
  }

  // --- 5. ATLAS SPRITE ---
  private renderAtlas(
    ctx: CanvasRenderingContext2D,
    accent: string,
    secondary: string,
    f: number,
  ) {
    // Chassis
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2;
    this.roundRect(ctx, 26, 28, 44, 44, 8, true, true);

    // Shoulder Pauldrons
    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, 18, 40, 8, 18, 3, true, true);
    this.roundRect(ctx, 70, 40, 8, 18, 3, true, true);

    // Visor
    ctx.fillStyle = '#030712';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 32, 36, 32, 14, 4, true, true);

    // Visor Scan Line
    if (this.currentState === 'sleeping') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(36, 43);
      ctx.lineTo(60, 43);
      ctx.stroke();
    } else {
      ctx.fillStyle = accent;
      const scanX = 36 + ((f * 6) % 20);
      ctx.fillRect(scanX + this.gazeX * 2, 39, 6, 8);
    }

    // Core Reactor
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(48, 58, 5, 0, Math.PI * 2);
    ctx.fill();
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
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill = true,
    stroke = true,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}
