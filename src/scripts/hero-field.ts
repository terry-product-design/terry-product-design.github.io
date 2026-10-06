/**
 * Complexity → Clarity field.
 *
 * Every node has two homes: a tangled "chaos" position and a cell in a clean grid.
 * Scroll progress (global clarity) and the pointer (a local "clarity lens") pull nodes
 * from the first to the second. Chaos edges fade out, orthogonal flow paths fade in,
 * and labelled modules become tidy pills — a tiny diagram of what product design does.
 */

type Node = {
  cx: number; // chaos home
  cy: number;
  ox: number; // ordered grid cell
  oy: number;
  x: number;
  y: number;
  t: number; // smoothed local clarity 0..1
  phase: number;
  speed: number;
  amp: number;
  rot: number;
  label?: string;
  labelW?: number;
};

type Pulse = { a: number; b: number; p: number; speed: number; mode: 0 | 1 };

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Deterministic PRNG so the composition is stable between resizes.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type HeroField = {
  setClarity: (t: number) => void;
  start: () => void;
  stop: () => void;
  resize: () => void;
  playIntro: () => void;
  destroy: () => void;
};

export function createHeroField(
  canvas: HTMLCanvasElement,
  opts: { labels: string[]; avoid?: () => DOMRect[]; reduced?: boolean },
): HeroField {
  const ctx = canvas.getContext('2d')!;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let spacing = 80;
  let cols = 0;
  let rows = 0;
  let nodes: Node[] = [];
  let chaosEdges: [number, number][] = [];
  let orderEdges: [number, number][] = [];
  let gridEdges: [number, number][] = [];
  let neighbours: number[][] = [];
  let pulses: Pulse[] = [];
  let modules: number[] = [];

  let clarity = 0; // from scroll
  let intro = opts.reduced ? 1 : 0;
  let introStart = 0;
  let running = false;
  let last = 0;
  let time = 0;
  let lensR = 190;
  const mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, target: 0 };

  const FONT = '500 10px "JetBrains Mono", ui-monospace, monospace';

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    const mobile = W < 700;
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 1.75);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    spacing = mobile ? 52 : W < 1100 ? 70 : Math.round(clamp(W / 18, 76, 96));
    lensR = mobile ? 120 : Math.round(clamp(W * 0.16, 200, 260));
    cols = Math.max(4, Math.floor((W - spacing * 0.8) / spacing) + 1);
    rows = Math.max(5, Math.floor((H - spacing * 0.8) / spacing) + 1);
    const gx = (W - (cols - 1) * spacing) / 2;
    const gy = (H - (rows - 1) * spacing) / 2;

    const rand = mulberry32(7);
    const count = cols * rows;
    // Shuffle which chaos node lands in which grid cell — longer flights read as "untangling".
    const perm = Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }

    // A few knots make the chaos feel tangled rather than uniformly random.
    // Knots sit mostly to the right so the headline keeps a calm field to live on.
    const knots = Array.from({ length: mobile ? 3 : 4 }, (_, k) => ({
      x: W * (mobile ? 0.2 + rand() * 0.7 : 0.5 + rand() * 0.42),
      y: H * (mobile ? 0.12 + (k / 3) * 0.7 + rand() * 0.1 : 0.15 + rand() * 0.7),
      s: (mobile ? 0.26 : 0.2) * Math.min(W, H) * (0.7 + rand() * 0.6),
    }));

    nodes = [];
    for (let i = 0; i < count; i++) {
      const cell = perm[i];
      const c = cell % cols;
      const r = Math.floor(cell / cols);
      let cx: number;
      let cy: number;
      if (rand() < 0.74) {
        const k = knots[Math.floor(rand() * knots.length)];
        const a = rand() * TAU;
        const d = Math.sqrt(-2 * Math.log(rand() + 1e-6)) * k.s * 0.6;
        cx = k.x + Math.cos(a) * d;
        cy = k.y + Math.sin(a) * d;
      } else {
        cx = -0.05 * W + rand() * 1.1 * W;
        cy = -0.05 * H + rand() * 1.1 * H;
      }
      const ox = gx + c * spacing;
      const oy = gy + r * spacing;
      nodes.push({
        cx,
        cy,
        ox,
        oy,
        x: cx,
        y: cy,
        t: 0,
        phase: rand() * TAU,
        speed: 0.25 + rand() * 0.55,
        amp: 10 + rand() * 34,
        rot: (rand() - 0.5) * 1.1,
      });
    }

    // Grid neighbour lookup by cell index -> node index.
    const nodeAtCell: number[] = new Array(count);
    for (let i = 0; i < count; i++) nodeAtCell[perm[i]] = i;
    const cellOf = (i: number) => perm[i];

    // Full lattice — only visible where clarity is high (pointer lens or end of scroll).
    gridEdges = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = nodeAtCell[r * cols + c];
        if (c + 1 < cols) gridEdges.push([a, nodeAtCell[r * cols + c + 1]]);
        if (r + 1 < rows) gridEdges.push([a, nodeAtCell[(r + 1) * cols + c]]);
      }
    }

    // Chaos edges: one local, one long — the long ones create the crossing tangle.
    chaosEdges = [];
    for (let i = 0; i < count; i++) {
      let best = -1;
      let bd = Infinity;
      for (let s = 0; s < 10; s++) {
        const j = Math.floor(rand() * count);
        if (j === i) continue;
        const d = (nodes[i].cx - nodes[j].cx) ** 2 + (nodes[i].cy - nodes[j].cy) ** 2;
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      if (best >= 0) chaosEdges.push([i, best]);
      if (rand() < 0.5) {
        // A longer thread, but not across the whole screen.
        for (let s = 0; s < 6; s++) {
          const j = Math.floor(rand() * count);
          const d = Math.hypot(nodes[i].cx - nodes[j].cx, nodes[i].cy - nodes[j].cy);
          if (j !== i && d < Math.min(W, H) * 0.55) {
            chaosEdges.push([i, j]);
            break;
          }
        }
      }
    }

    // Modules: labelled nodes placed in the ordered grid away from the headline.
    const pad = mobile ? 18 : 28;
    const avoidRects = (opts.avoid?.() || []).map((a) => ({
      l: a.left - pad - 50,
      r: a.right + pad + 50,
      t: a.top - pad,
      b: a.bottom + pad,
    }));
    const inAvoid = (x: number, y: number) => avoidRects.some((a) => x > a.l && x < a.r && y > a.t && y < a.b);

    const candidateCells: number[] = [];
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const x = gx + c * spacing;
        const y = gy + r * spacing;
        if (!inAvoid(x, y) && y > 90 && y < H - 60) candidateCells.push(r * cols + c);
      }
    }
    // Spread modules: greedy pick with minimum spacing in cells.
    const wanted = Math.min(opts.labels.length, mobile ? 6 : 12);
    const picked: number[] = [];
    const minGap = mobile ? 2 : 3;
    const shuffled = candidateCells.sort(() => rand() - 0.5);
    for (const cell of shuffled) {
      if (picked.length >= wanted) break;
      const c = cell % cols;
      const r = Math.floor(cell / cols);
      if (picked.every((p) => Math.abs((p % cols) - c) + Math.abs(Math.floor(p / cols) - r) >= minGap)) {
        picked.push(cell);
      }
    }
    // Order modules left→right, top→bottom so flows read naturally.
    picked.sort((a, b) => (a % cols) - (b % cols) || a - b);
    ctx.font = FONT;
    modules = picked.map((cell, k) => {
      const i = nodeAtCell[cell];
      nodes[i].label = opts.labels[k % opts.labels.length];
      nodes[i].labelW = ctx.measureText(nodes[i].label!).width;
      return i;
    });

    // Order edges: Manhattan flow paths between consecutive modules (deduped grid segments).
    const seg = new Set<string>();
    orderEdges = [];
    neighbours = Array.from({ length: count }, () => []);
    const addSeg = (cellA: number, cellB: number) => {
      const a = nodeAtCell[cellA];
      const b = nodeAtCell[cellB];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seg.has(key)) return;
      seg.add(key);
      orderEdges.push([a, b]);
      neighbours[a].push(b);
      neighbours[b].push(a);
    };
    const route = (from: number, to: number, hFirst: boolean) => {
      let c = from % cols;
      let r = Math.floor(from / cols);
      const tc = to % cols;
      const tr = Math.floor(to / cols);
      const stepH = () => {
        while (c !== tc) {
          const nc = c + Math.sign(tc - c);
          addSeg(r * cols + c, r * cols + nc);
          c = nc;
        }
      };
      const stepV = () => {
        while (r !== tr) {
          const nr = r + Math.sign(tr - r);
          addSeg(r * cols + c, nr * cols + c);
          r = nr;
        }
      };
      if (hFirst) {
        stepH();
        stepV();
      } else {
        stepV();
        stepH();
      }
    };
    for (let k = 0; k < picked.length - 1; k++) route(picked[k], picked[k + 1], k % 2 === 0);
    // A couple of branches so it's a system, not a single line.
    for (let k = 0; k + 3 < picked.length; k += 3) route(picked[k], picked[k + 3], k % 2 === 1);

    // Pulses: half travel the tangle, half travel the clean flow.
    pulses = [];
    const pulseCount = mobile ? 10 : 18;
    for (let k = 0; k < pulseCount; k++) {
      const mode = (k % 2) as 0 | 1;
      const e = mode === 0 ? chaosEdges[Math.floor(rand() * chaosEdges.length)] : orderEdges[Math.floor(rand() * Math.max(1, orderEdges.length))];
      if (!e) continue;
      pulses.push({ a: e[0], b: e[1], p: rand(), speed: mode === 0 ? 0.35 + rand() * 0.5 : 1.4 + rand() * 0.8, mode });
    }
    void cellOf;
  }

  function nextPulse(p: Pulse) {
    if (p.mode === 1) {
      const options = neighbours[p.b].filter((n) => n !== p.a);
      const pool = options.length ? options : neighbours[p.b];
      if (!pool.length) return;
      p.a = p.b;
      p.b = pool[Math.floor(Math.random() * pool.length)];
    } else {
      const e = chaosEdges[Math.floor(Math.random() * chaosEdges.length)];
      p.a = e[0];
      p.b = e[1];
    }
    p.p = 0;
  }

  // Alpha buckets let us batch hundreds of lines into ~10 stroke calls.
  const BUCKETS = 10;
  const bucketPaths: Path2D[] = [];

  function frame(now: number) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    time += dt;

    if (intro < 1 && introStart) intro = clamp((now - introStart) / 1900);
    const introE = 1 - Math.pow(1 - intro, 4);

    // Pointer smoothing
    mouse.on += (mouse.target - mouse.on) * 0.06;
    mouse.x += (mouse.tx - mouse.x) * 0.14;
    mouse.y += (mouse.ty - mouse.y) * 0.14;

    const centerX = W * 0.62;
    const centerY = H * 0.5;
    const g = clarity;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dx = n.ox - mouse.x;
      const dy = n.oy - mouse.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const lens = (1 - smooth(lensR * 0.5, lensR, d)) * mouse.on;
      const target = Math.max(g, lens);
      if (opts.reduced) n.t = 1;
      else n.t += (target - n.t) * (target > n.t ? 0.11 : 0.05);

      const wob = 1 - n.t;
      const chx = n.cx + Math.sin(time * n.speed + n.phase) * n.amp * wob;
      const chy = n.cy + Math.cos(time * n.speed * 0.8 + n.phase * 1.3) * n.amp * wob;
      // Intro: bloom out from a point.
      const ix = lerp(centerX, chx, introE);
      const iy = lerp(centerY, chy, introE);
      const e = easeInOut(n.t);
      n.x = lerp(ix, n.ox, e);
      n.y = lerp(iy, n.oy, e);
    }

    ctx.clearRect(0, 0, W, H);

    // --- Chaos edges ---
    for (let b = 0; b < BUCKETS; b++) bucketPaths[b] = new Path2D();
    for (let k = 0; k < chaosEdges.length; k++) {
      const [a, b] = chaosEdges[k];
      const na = nodes[a];
      const nb = nodes[b];
      const tAvg = (na.t + nb.t) * 0.5;
      const v = Math.pow(1 - tAvg, 1.6);
      if (v < 0.03) continue;
      const bi = Math.min(BUCKETS - 1, Math.floor(v * BUCKETS));
      // Threads bow and sway while tangled, and straighten as they resolve.
      const mx = (na.x + nb.x) * 0.5;
      const my = (na.y + nb.y) * 0.5;
      const bow = (0.32 + 0.18 * Math.sin(time * 0.5 + k)) * (1 - tAvg) * (k % 2 ? 1 : -1);
      const cx = mx - (nb.y - na.y) * bow;
      const cy = my + (nb.x - na.x) * bow;
      bucketPaths[bi].moveTo(na.x, na.y);
      bucketPaths[bi].quadraticCurveTo(cx, cy, nb.x, nb.y);
    }
    ctx.lineWidth = 0.75;
    for (let b = 0; b < BUCKETS; b++) {
      ctx.strokeStyle = `rgba(226,222,255,${(((b + 0.5) / BUCKETS) * 0.12 * introE).toFixed(3)})`;
      ctx.stroke(bucketPaths[b]);
    }

    // --- Lattice revealed by clarity ---
    for (let b = 0; b < BUCKETS; b++) bucketPaths[b] = new Path2D();
    const latticeMax = 0.26 * (1 - clarity * 0.6);
    for (let k = 0; k < gridEdges.length; k++) {
      const [a, b] = gridEdges[k];
      const na = nodes[a];
      const nb = nodes[b];
      const v = Math.pow(Math.min(na.t, nb.t), 2);
      if (v < 0.04) continue;
      const bi = Math.min(BUCKETS - 1, Math.floor(v * BUCKETS));
      bucketPaths[bi].moveTo(na.x, na.y);
      bucketPaths[bi].lineTo(nb.x, nb.y);
    }
    ctx.lineWidth = 1;
    for (let b = 0; b < BUCKETS; b++) {
      ctx.strokeStyle = `rgba(241,241,241,${(((b + 0.5) / BUCKETS) * latticeMax).toFixed(3)})`;
      ctx.stroke(bucketPaths[b]);
    }

    // --- Order edges (flow paths) ---
    for (let b = 0; b < BUCKETS; b++) bucketPaths[b] = new Path2D();
    for (let k = 0; k < orderEdges.length; k++) {
      const [a, b] = orderEdges[k];
      const na = nodes[a];
      const nb = nodes[b];
      const v = Math.pow(Math.min(na.t, nb.t), 2.2);
      if (v < 0.03) continue;
      const bi = Math.min(BUCKETS - 1, Math.floor(v * BUCKETS));
      bucketPaths[bi].moveTo(na.x, na.y);
      bucketPaths[bi].lineTo(nb.x, nb.y);
    }
    ctx.lineWidth = 1;
    for (let b = 0; b < BUCKETS; b++) {
      ctx.strokeStyle = `rgba(155,140,255,${(((b + 0.5) / BUCKETS) * 0.55).toFixed(3)})`;
      ctx.stroke(bucketPaths[b]);
    }

    // --- Nodes: grid dots brighten with clarity ---
    for (let b = 0; b < BUCKETS; b++) bucketPaths[b] = new Path2D();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.label) continue;
      const v = 0.22 + n.t * 0.68;
      const bi = Math.min(BUCKETS - 1, Math.floor(v * BUCKETS));
      const r = 1.6 - n.t * 0.3;
      bucketPaths[bi].moveTo(n.x + r, n.y);
      bucketPaths[bi].arc(n.x, n.y, r, 0, TAU);
    }
    for (let b = 0; b < BUCKETS; b++) {
      ctx.fillStyle = `rgba(241,241,241,${(((b + 0.5) / BUCKETS) * introE).toFixed(3)})`;
      ctx.fill(bucketPaths[b]);
    }

    // --- Pulses ---
    for (let k = 0; k < pulses.length; k++) {
      const p = pulses[k];
      const na = nodes[p.a];
      const nb = nodes[p.b];
      if (!na || !nb) continue;
      const len = Math.hypot(nb.x - na.x, nb.y - na.y) || 1;
      p.p += (p.speed * dt * (p.mode === 1 ? spacing : 140)) / len;
      if (p.p >= 1) {
        nextPulse(p);
        continue;
      }
      const vis = p.mode === 1 ? Math.pow(Math.min(na.t, nb.t), 2) : Math.pow(1 - (na.t + nb.t) * 0.5, 2);
      if (vis < 0.05) continue;
      const x = lerp(na.x, nb.x, p.p);
      const y = lerp(na.y, nb.y, p.p);
      const tx = lerp(na.x, nb.x, Math.max(0, p.p - 0.18));
      const ty = lerp(na.y, nb.y, Math.max(0, p.p - 0.18));
      const grad = ctx.createLinearGradient(tx, ty, x, y);
      const col = p.mode === 1 ? '155,140,255' : '241,241,241';
      grad.addColorStop(0, `rgba(${col},0)`);
      grad.addColorStop(1, `rgba(${col},${(0.9 * vis * introE).toFixed(3)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = p.mode === 1 ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // --- Modules ---
    ctx.font = FONT;
    ctx.textBaseline = 'middle';
    for (let k = 0; k < modules.length; k++) {
      const n = nodes[modules[k]];
      const t = n.t;
      const e = easeInOut(t);
      const label = n.label!;
      const w = (n.labelW || 40) + 18;
      const h = 22;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rot * (1 - e) + Math.sin(time * 0.6 + n.phase) * 0.12 * (1 - e));
      // Pill fades in with clarity
      if (t > 0.05) {
        ctx.globalAlpha = smooth(0.2, 0.9, t) * introE;
        ctx.fillStyle = 'rgba(19,17,27,0.92)';
        ctx.strokeStyle = 'rgba(155,140,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
        else ctx.rect(-w / 2, -h / 2, w, h);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = (0.38 + 0.52 * t) * introE;
      ctx.fillStyle = t > 0.5 ? '#e9e6ff' : '#f1f1f1';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 0.5);
      // chaos-state dot
      if (t < 0.6) {
        ctx.globalAlpha = (1 - t / 0.6) * 0.8 * introE;
        ctx.beginPath();
        ctx.arc(-w / 2 - 4, 0, 2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // --- Lens: a designer's loupe ---
    if (mouse.on > 0.02 && clarity < 0.98) {
      const a = mouse.on * (1 - clarity);
      const R = lensR * 0.9;
      ctx.strokeStyle = `rgba(155,140,255,${(0.5 * a).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, R, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(155,140,255,${(0.6 * a).toFixed(3)})`;
      ctx.beginPath();
      for (let q = 0; q < 4; q++) {
        const ang = q * (Math.PI / 2) + time * 0.15;
        ctx.moveTo(mouse.x + Math.cos(ang) * (R - 6), mouse.y + Math.sin(ang) * (R - 6));
        ctx.lineTo(mouse.x + Math.cos(ang) * (R + 6), mouse.y + Math.sin(ang) * (R + 6));
      }
      ctx.stroke();
      ctx.globalAlpha = 0.7 * a;
      ctx.fillStyle = '#b9afff';
      ctx.font = FONT;
      ctx.textAlign = 'left';
      ctx.fillText('CLARITY', mouse.x + R * 0.72 + 8, mouse.y - R * 0.72 - 4);
      ctx.globalAlpha = 1;
    }
  }

  function loop(now: number) {
    if (!running) return;
    frame(now);
    raf = requestAnimationFrame(loop);
  }
  let raf = 0;

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    mouse.tx = e.clientX - r.left;
    mouse.ty = e.clientY - r.top;
    if (mouse.x < -1000) {
      mouse.x = mouse.tx;
      mouse.y = mouse.ty;
    }
    mouse.target = 1;
  };
  const onLeave = () => {
    mouse.target = 0;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  build();
  if (import.meta.env.DEV) (window as any).__heroDebug = () => ({ mouse: { ...mouse }, clarity, running, intro, n0: nodes[0] && { t: nodes[0].t } });

  const api: HeroField = {
    setClarity(t) {
      // Reduced motion shows the resolved, static diagram.
      clarity = opts.reduced ? 1 : clamp(t);
    },
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resize() {
      build();
      if (!running) frame(performance.now());
    },
    playIntro() {
      intro = 0;
      introStart = performance.now();
    },
    destroy() {
      api.stop();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };

  if (opts.reduced) {
    clarity = 1;
    nodes.forEach((n) => (n.t = 1));
    frame(performance.now());
  }

  return api;
}
