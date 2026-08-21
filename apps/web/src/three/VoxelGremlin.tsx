import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sprite } from '../components/Sprite';

/**
 * Procedurally-built voxel gremlin — no model files.
 * The creature floats, sways toward the cursor, and blinks.
 */
export const VoxelGremlin: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ------------------------------------------------------------------ *
     * Model: 11x11 front sprite, extruded to 3 layers.
     *  g body green   d dark outline/ears   b belly
     *  w eye white    k pupil               n nose/mouth
     * ------------------------------------------------------------------ */
    const ROWS = [
      '..d.....d..', // ear tips
      '..dd...dd..',
      '...d...d...',
      '.dgggggggd.', // head top
      '.ggggggggg.',
      '.gwkgggkwg.', // eyes
      '.ggggngggg.', // nose
      '.ggdgdgdgg.', // zigzag mouth
      '.dgggggggd.', // chin
      '..gbbbbbg..', // body
      '..dd...dd..', // feet
    ];
    const COLORS: Record<string, number> = {
      g: 0x7ed957,
      d: 0x4c9a3e,
      b: 0xcdf2a0,
      w: 0xffffff,
      k: 0x1a2417,
      n: 0x35702c,
    };
    // inner-layer replacement: eyes/nose/mouth become body green inside
    const INNER_MAP: Record<string, string> = { w: 'g', k: 'g', n: 'g' };
    const depthForRow = (row: number) => (row <= 2 ? 1 : row <= 8 ? 3 : 2);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.4, 13.5);
    camera.lookAt(0, -0.3, 0);

    /* Lights */
    scene.add(new THREE.AmbientLight(0x8fa3b8, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa3e635, 0.4);
    rim.position.set(-6, -2, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xdfe9ff, 0.3);
    fill.position.set(0, 2, 8);
    scene.add(fill);

    /* Voxel meshes — one InstancedMesh per part color */
    const creature = new THREE.Group();
    scene.add(creature);

    interface Part {
      mesh: THREE.InstancedMesh;
      indices: number[];
      positions: THREE.Vector3[];
    }
    const parts: Record<string, Part> = {};
    const dummy = new THREE.Object3D();
    const frontZFor = (depth: number) => (depth - 1) / 2; // 1→0, 2→0.5, 3→1

    ROWS.forEach((rowStr, row) => {
      const depth = depthForRow(row);
      const zs =
        depth === 1 ? [0] : depth === 2 ? [-0.5, 0.5] : [-1, 0, 1];
      const frontZ = frontZFor(depth);

      rowStr.split('').forEach((ch, col) => {
        if (ch === '.') return;
        zs.forEach((z) => {
          const isFront = Math.abs(z - frontZ) < 0.01;
          const partKey = isFront ? ch : INNER_MAP[ch] ?? ch;
          const part =
            parts[partKey] ??
            (parts[partKey] = { mesh: null as unknown as THREE.InstancedMesh, indices: [], positions: [] });
          part.positions.push(
            new THREE.Vector3(col - 5, 10 - row - 5, z),
          );
          part.indices.push(part.positions.length - 1);
        });
      });
    });

    const boxGeo = new THREE.BoxGeometry(0.94, 0.94, 0.94);
    const baseColor = new THREE.Color();

    Object.entries(parts).forEach(([keyName, part]) => {
      const count = part.positions.length;
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.62,
        metalness: 0.05,
        emissive: keyName === 'g' ? 0x0b1a05 : 0x000000,
      });
      const mesh = new THREE.InstancedMesh(boxGeo, mat, count);
      mesh.instanceMatrix.setUsage(
        keyName === 'w' || keyName === 'k' ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage,
      );
      part.positions.forEach((pos, i) => {
        dummy.position.copy(pos);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        // per-voxel lightness jitter for an organic, hand-placed feel
        baseColor.setHex(COLORS[keyName]).multiplyScalar(0.94 + Math.random() * 0.1);
        mesh.setColorAt(i, baseColor);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      part.mesh = mesh;
      creature.add(mesh);
    });

    /* Dust particles behind the creature */
    const P_COUNT = 220;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(P_COUNT * 3);
    const pCol = new Float32Array(P_COUNT * 3);
    const pSpeed = new Float32Array(P_COUNT);
    const dustColors = [0xa3e635, 0xf2f5f9, 0x6fe3f0].map((c) => new THREE.Color(c));
    for (let i = 0; i < P_COUNT; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 22;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pPos[i * 3 + 2] = -3 - Math.random() * 6;
      const c = dustColors[Math.floor(Math.random() * dustColors.length)];
      pCol[i * 3] = c.r;
      pCol[i * 3 + 1] = c.g;
      pCol[i * 3 + 2] = c.b;
      pSpeed[i] = 0.15 + Math.random() * 0.45;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    /* Soft lime glow pool under the creature */
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d')!;
    const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(163, 230, 53, 0.5)');
    grad.addColorStop(0.5, 'rgba(163, 230, 53, 0.12)');
    grad.addColorStop(1, 'rgba(163, 230, 53, 0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -6.4;
    scene.add(glow);

    /* Sizing */
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    /* Interaction + animation */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMouse = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    let raf = 0;
    let running = true;
    let inView = true;
    let pageVisible = !document.hidden;
    const clock = new THREE.Clock();
    let nextBlink = 2.2;
    let blinkUntil = -1;

    const eyeParts = [parts.w, parts.k].filter(Boolean);
    const setEyeScale = (s: number) => {
      eyeParts.forEach((part) => {
        part.positions.forEach((pos, i) => {
          dummy.position.copy(pos);
          dummy.scale.set(1, s, 1);
          dummy.updateMatrix();
          part.mesh.setMatrixAt(i, dummy.matrix);
        });
        part.mesh.instanceMatrix.needsUpdate = true;
      });
    };

    const tick = () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (!inView || !pageVisible) return;

      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      creature.position.y = Math.sin(t * 1.1) * 0.2;
      creature.rotation.y = Math.sin(t * 0.32) * 0.42 + mouse.x * 0.35;
      creature.rotation.x = mouse.y * 0.1;
      glow.material.opacity = 0.75 + Math.sin(t * 1.1) * 0.15;

      if (t > nextBlink) {
        blinkUntil = t + 0.13;
        nextBlink = t + 2.4 + Math.random() * 2.4;
      }
      setEyeScale(t < blinkUntil ? 0.12 : 1);

      const posAttr = pGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < P_COUNT; i++) {
        let y = posAttr.getY(i) + pSpeed[i] * dt;
        if (y > 7) y = -7;
        posAttr.setY(i, y);
        posAttr.setX(i, posAttr.getX(i) + Math.sin(t * 0.6 + i) * 0.0015);
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    const syncRunState = () => {
      const shouldRun = inView && pageVisible;
      if (shouldRun && !running) {
        running = true;
        clock.getDelta();
        tick();
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    if (reducedMotion) {
      creature.rotation.y = 0.3;
      renderer.render(scene, camera);
    } else {
      window.addEventListener('pointermove', onMouse, { passive: true });
      const io = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          syncRunState();
        },
        { threshold: 0.02 },
      );
      io.observe(mount);
      const onVis = () => {
        pageVisible = !document.hidden;
        syncRunState();
      };
      document.addEventListener('visibilitychange', onVis);
      tick();

      return () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onMouse);
        document.removeEventListener('visibilitychange', onVis);
        io.disconnect();
        ro.disconnect();
        scene.traverse((obj) => {
          const anyObj = obj as THREE.Mesh;
          if (anyObj.geometry) anyObj.geometry.dispose();
          const mat = anyObj.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else if (mat) mat.dispose();
        });
        glowTex.dispose();
        renderer.dispose();
        mount.removeChild(renderer.domElement);
      };
    }

    // reduced-motion cleanup
    return () => {
      ro.disconnect();
      scene.traverse((obj) => {
        const anyObj = obj as THREE.Mesh;
        if (anyObj.geometry) anyObj.geometry.dispose();
        const mat = anyObj.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      glowTex.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  if (failed) {
    // graceful fallback: the real 2D sprite on a glow
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="animate-float-soft drop-shadow-[0_0_60px_rgba(163,230,53,0.35)]">
          <Sprite id="sensei" size={200} />
        </div>
      </div>
    );
  }

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
};
