import { gsap, reduced, $, $$ } from './core';

/**
 * NavMaze (src/components/case/NavMaze.astro): a walker tries to finish a job in the
 * navigation mind map. Watch mode replays a scripted walkthrough; "Let me try" hands
 * the map to the visitor and counts their wrong turns.
 */

type Step = { g: string; c?: string; ok?: boolean | 'part'; think: string; note: string; why?: number };
type Run = { steps: Step[]; stat: string };
type Task = { id: string; brief: string; before: Run; after: Run };
type Mode = 'before' | 'after';
type Tone = 'probe' | 'wrong' | 'ok' | 'part';

const MIN_SCALE = 0.62;
const MAX_SCALE = 1;
const MIN_HEIGHT_SCALE = 0.75;
const HINT_AFTER = 4;

export function initNavMaze() {
  $$('[data-maze]').forEach(setup);
}

function setup(mz: HTMLElement) {
  const tasks = JSON.parse(mz.dataset.maze!) as Task[];
  const W = Number(mz.dataset.mazeW);
  const H = Number(mz.dataset.mazeH);
  const ROOT = { x: Number(mz.dataset.mazeCx), y: Number(mz.dataset.mazeCy) };

  const viewport = $('[data-mz-viewport]', mz)!;
  const sizer = $('[data-mz-sizer]', mz)!;
  const stage = $('[data-mz-stage]', mz)!;
  const walker = $('[data-mz-walker]', mz)!;
  const briefEl = $('[data-mz-brief]', mz)!;
  const wrongEl = $('[data-mz-wrong]', mz)!;
  const openedEl = $('[data-mz-opened]', mz)!;
  const sayEl = $('[data-mz-say]', mz)!;
  const outEl = $('[data-mz-out]', mz)!;
  const statEl = $('[data-mz-stat]', mz)!;
  const nextBtn = $<HTMLButtonElement>('[data-mz-next]', mz)!;
  const chips = $$<HTMLButtonElement>('[data-mz-task]', mz);
  const modeBtns = $$<HTMLButtonElement>('[data-mz-mode]', mz);
  const replayBtn = $<HTMLButtonElement>('[data-mz-replay]', mz)!;
  const tryBtn = $<HTMLButtonElement>('[data-mz-try]', mz)!;
  const cardList = $('[data-mz-cards]', mz)!;
  const cards = $$('[data-mz-card]', mz);
  const arrows = $$<HTMLButtonElement>('[data-mz-why-step]', mz);

  let ti = 0;
  let mode: Mode = 'before';
  let manual = false;
  let tl: gsap.core.Timeline | null = null;
  let wrong = 0;
  const opened = new Set<string>();
  const k = reduced ? 0 : 1; // duration factor: reduced motion jumps straight to the end state

  /* ---------- lookups (always in the visible tree) ---------- */
  const tree = () => $(`[data-mz-tree="${mode}"]`, mz)!;
  const esc = (s: string) => CSS.escape(s);
  const groupEl = (g: string) => $(`[data-g="${esc(g)}"]`, tree());
  const kidEl = (g: string, c: string) => $(`[data-k="${esc(`${g}>${c}`)}"]`, tree());
  const baseLine = (g: string) => $<SVGPathElement>(`[data-line="${esc(g)}"]`, tree())!;
  const kidLine = (g: string, c: string) => $<SVGPathElement>(`[data-kline="${esc(`${g}>${c}`)}"]`, tree())!;
  const trail = () => $<SVGSVGElement>('[data-mz-trail]', tree())!;
  const run = () => tasks[ti][mode];

  /* ---------- fit the stage to the frame; pan on small screens ---------- */
  // Scale to the frame's width, and to the window's height so the map, the narration and
  // the cause cards can be seen together. Below MIN_SCALE the map pans instead.
  let scale = 1;
  const fit = () => {
    const w = viewport.clientWidth;
    const chrome = mz.offsetHeight - sizer.offsetHeight; // version tabs + everything in the frame but the map
    const byHeight = Math.max(MIN_HEIGHT_SCALE, (window.innerHeight - chrome - 24) / H);
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, w / W, byHeight));
    stage.style.transform = `scale(${scale})`;
    sizer.style.width = `${W * scale}px`;
    sizer.style.height = `${H * scale}px`;
    mz.classList.toggle('is-pan', W * scale > w + 1);
  };
  new ResizeObserver(fit).observe(viewport);
  window.addEventListener('resize', fit);
  fit();
  const panTo = gsap.quickTo(viewport, 'scrollLeft', { duration: 0.8, ease: 'power3.out' });
  const place = (x: number, y: number) => {
    gsap.set(walker, { x, y });
    if (mz.classList.contains('is-pan')) panTo(x * scale - viewport.clientWidth / 2);
  };

  /* ---------- narration + counters ---------- */
  const say = (think: string, note = '') => {
    const parts: Node[] = [];
    if (think) {
      const t = document.createElement('span');
      t.className = 'mz__think';
      t.textContent = think;
      parts.push(t);
    }
    if (note) {
      const n = document.createElement('span');
      n.className = 'mz__note';
      n.textContent = note;
      if (parts.length) parts.push(document.createTextNode(' '));
      parts.push(n);
    }
    sayEl.replaceChildren(...parts);
  };
  const bump = (el: HTMLElement, v: number) => {
    el.textContent = String(v);
    el.classList.remove('is-bump');
    void el.offsetWidth;
    el.classList.add('is-bump');
  };
  const addWrong = () => bump(wrongEl, ++wrong);
  const markOpened = (g: string) => {
    opened.add(g);
    openedEl.textContent = String(opened.size);
  };

  /* ---------- cause cards under the map ---------- */
  const showCard = (i: number) => {
    const card = cards[i];
    if (!card) return;
    cardList.scrollTo({ left: card.offsetLeft, behavior: reduced ? 'auto' : 'smooth' }); // list is the offsetParent
  };
  const hitWhy = (i: number | undefined) => {
    if (i === undefined || !cards[i]) return;
    cards.forEach((c) => c.classList.replace('is-hit', 'is-seen'));
    cards[i].classList.remove('is-seen');
    cards[i].classList.add('is-hit');
    showCard(i);
  };
  const syncArrows = () => {
    const max = cardList.scrollWidth - cardList.clientWidth - 2;
    arrows.forEach((a) => (a.disabled = Number(a.dataset.mzWhyStep) < 0 ? cardList.scrollLeft <= 2 : cardList.scrollLeft >= max));
  };
  arrows.forEach((a) =>
    a.addEventListener('click', () => {
      const step = (cards[1]?.offsetLeft ?? 0) - (cards[0]?.offsetLeft ?? 0);
      cardList.scrollBy({ left: Number(a.dataset.mzWhyStep) * step, behavior: reduced ? 'auto' : 'smooth' });
    }),
  );
  cardList.addEventListener('scroll', syncArrows, { passive: true });
  new ResizeObserver(syncArrows).observe(cardList);

  /* ---------- trail segments + walker travel ---------- */
  const seg = (path: SVGPathElement, parent?: string) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const len = path.getTotalLength();
    s.setAttribute('d', path.getAttribute('d')!);
    s.setAttribute('class', 'mz__seg is-probe');
    s.style.strokeDasharray = String(len);
    s.style.strokeDashoffset = String(len);
    if (parent) s.dataset.parent = parent;
    trail().appendChild(s);
    return s;
  };
  const tone = (s: SVGPathElement | undefined, t: Tone) => s?.setAttribute('class', `mz__seg is-${t}`);
  const travel = (path: SVGPathElement, { back = false, draw = undefined as SVGPathElement | undefined, dur = 0.7 } = {}) => {
    const len = path.getTotalLength();
    const o = { t: 0 };
    return gsap.to(o, {
      t: 1,
      duration: dur * k,
      ease: 'power2.inOut',
      onUpdate() {
        const p = path.getPointAtLength((back ? 1 - o.t : o.t) * len);
        place(p.x, p.y);
        if (draw) draw.style.strokeDashoffset = String(len * (1 - o.t));
      },
    });
  };

  /* ---------- groups open and fold ---------- */
  const openGroup = (g: string) => {
    groupEl(g)?.classList.add('is-open');
    $$(`[data-parent="${esc(g)}"]`, tree()).forEach((el) => el.classList.add('is-shown'));
    markOpened(g);
  };
  // Children fold away with their group (kid columns of neighbouring groups overlap);
  // anything found there stays on the group pill as "› Child".
  const closeGroup = (g: string) => {
    groupEl(g)?.classList.remove('is-open');
    $$(`.mz__node[data-parent="${esc(g)}"], .mz__kl[data-parent="${esc(g)}"]`, tree()).forEach((el) =>
      el.classList.remove('is-shown'),
    );
    $$<SVGPathElement>(`.mz__seg[data-parent="${esc(g)}"]`, trail()).forEach((s) =>
      gsap.to(s, { opacity: 0, duration: 0.3 * k, onComplete: () => s.remove() }),
    );
  };
  const markFound = (g: string, c: string | undefined, part: boolean) => {
    const cls = part ? 'is-part' : 'is-found';
    const group = groupEl(g);
    if (group && !group.classList.contains('is-found')) {
      group.classList.remove('is-part', 'is-wrong');
      group.classList.add(cls);
    }
    if (c) {
      kidEl(g, c)?.classList.add(cls);
      if (group && !$('.mz__hit', group)) {
        const hit = document.createElement('span');
        hit.className = 'mz__hit';
        hit.textContent = `› ${c}`;
        group.insertBefore(hit, $('.mz__badge', group));
      }
    }
  };

  /* ---------- reset ---------- */
  const reset = () => {
    tl?.kill();
    tl = null;
    gsap.killTweensOf(walker);
    $$('[data-mz-tree]', mz).forEach((t) => {
      $$('.is-open, .is-shown, .is-wrong, .is-found, .is-part', t).forEach((el) =>
        el.classList.remove('is-open', 'is-shown', 'is-wrong', 'is-found', 'is-part'),
      );
      $$('.mz__hit', t).forEach((el) => el.remove());
      $('[data-mz-trail]', t)?.replaceChildren();
    });
    wrong = 0;
    opened.clear();
    wrongEl.textContent = '0';
    openedEl.textContent = '0';
    gsap.set(walker, { x: ROOT.x, y: ROOT.y, opacity: 0 });
    if (mz.classList.contains('is-pan')) viewport.scrollLeft = (ROOT.x * scale - viewport.clientWidth / 2);
    outEl.classList.remove('is-on');
    briefEl.textContent = tasks[ti].brief;
    cards.forEach((c) => c.classList.remove('is-hit', 'is-seen'));
    cardList.scrollTo({ left: 0 });
    visit = null;
    found.clear();
  };

  /* ---------- end of a run ---------- */
  const finish = () => {
    const s = run().stat.split('**');
    statEl.replaceChildren(
      ...s.map((part, i) => {
        if (i % 2 === 0) return document.createTextNode(part);
        const b = document.createElement('b');
        b.textContent = part;
        return b;
      }),
    );
    nextBtn.textContent =
      mode === 'before' ? 'Now try the new sidebar →' : ti < tasks.length - 1 ? 'Next job →' : 'Start over →';
    outEl.classList.add('is-on');
    if (mode === 'after') {
      const fixed = [...new Set(tasks[ti].before.steps.map((st) => st.why).filter((w): w is number => w !== undefined))];
      fixed.forEach((w) => cards[w]?.classList.add('is-hit'));
      if (fixed.length) showCard(Math.min(...fixed));
    }
  };

  /* ---------- watch mode: a scripted walkthrough ---------- */
  const play = () => {
    setManual(false);
    reset();
    const steps = run().steps;
    say(mode === 'before' ? 'Someone new to the back office gives it a go.' : 'Same job — new sidebar.');
    const t = gsap.timeline({ delay: 0.5 * k });
    tl = t;
    t.set(walker, { opacity: 1 });
    let at: { g?: string; c?: string } = {};
    let base: SVGPathElement | undefined;

    steps.forEach((s, i) => {
      const sameNext = steps[i + 1]?.g === s.g;
      t.call(() => say(s.think));
      t.to({}, { duration: 0.6 * k });

      if (at.g !== s.g) {
        if (at.g) {
          const g0 = at.g;
          if (at.c) t.add(travel(kidLine(g0, at.c), { back: true, dur: 0.3 }));
          t.call(() => closeGroup(g0));
          t.add(travel(baseLine(g0), { back: true, dur: 0.45 }));
        }
        base = seg(baseLine(s.g));
        t.add(travel(baseLine(s.g), { draw: base, dur: 0.75 }));
        t.call(() => openGroup(s.g));
        t.to({}, { duration: 0.4 * k });
        at = { g: s.g };
      } else if (at.c) {
        t.add(travel(kidLine(s.g, at.c), { back: true, dur: 0.3 }));
        at = { g: s.g };
      }

      let kseg: SVGPathElement | undefined;
      if (s.c) {
        kseg = seg(kidLine(s.g, s.c), s.g);
        t.add(travel(kidLine(s.g, s.c), { draw: kseg, dur: 0.5 }));
        at = { g: s.g, c: s.c };
      }

      const b = base;
      const ks = kseg;
      t.call(() => {
        say(s.think, s.note);
        if (mode === 'before') hitWhy(s.why);
        if (s.ok) {
          const part = s.ok === 'part';
          markFound(s.g, s.c, part);
          tone(b, part ? 'part' : 'ok');
          tone(ks, part ? 'part' : 'ok');
        } else {
          addWrong();
          if (s.c) {
            kidEl(s.g, s.c)?.classList.add('is-wrong');
            tone(ks, 'wrong');
          }
          if (!sameNext) {
            groupEl(s.g)?.classList.add('is-wrong');
            tone(b, 'wrong');
          }
        }
      });
      t.to({}, { duration: (s.ok ? 1.3 : 1.9) * k });
    });
    t.call(finish);
  };

  /* ---------- try mode: the visitor walks ---------- */
  let visit: { g: string; base: SVGPathElement; counted: boolean; found: boolean } | null = null;
  const found = new Set<string>();
  const targets = () => run().steps.filter((s) => s.ok);
  const key = (g: string, c?: string) => (c ? `${g}>${c}` : g);

  const setManual = (on: boolean) => {
    manual = on;
    mz.classList.toggle('is-manual', on);
    tryBtn.setAttribute('aria-pressed', String(on));
    $$('[data-mz-tree]', mz).forEach((t) => {
      const live = on && t.dataset.mzTree === mode;
      t.setAttribute('aria-hidden', String(!live));
      $$<HTMLButtonElement>('.mz__node', t).forEach((b) => {
        b.disabled = !live;
        b.tabIndex = live ? 0 : -1;
      });
    });
  };
  const startTry = () => {
    reset();
    setManual(true);
    say('', 'Your turn. Open a group, pick an entry — every wrong turn is counted.');
  };
  const leave = () => {
    if (!visit) return;
    if (!visit.found) {
      if (!visit.counted) addWrong();
      groupEl(visit.g)?.classList.add('is-wrong');
      tone(visit.base, 'wrong');
    }
    closeGroup(visit.g);
    visit = null;
  };
  const pickGroup = (g: string) => {
    if (visit?.g === g) return;
    leave();
    gsap.killTweensOf(walker);
    const line = baseLine(g);
    const base = seg(line);
    visit = { g, base, counted: false, found: false };
    gsap.set(walker, { opacity: 1 });
    travel(line, { draw: base, dur: 0.45 });
    openGroup(g);
    groupEl(g)?.classList.remove('is-wrong');
    const hasKids = !!$(`.mz__node[data-parent="${esc(g)}"]`, tree());
    const hit = targets().find((s) => s.g === g && !s.c);
    if (hit) return hitTarget(hit);
    say('', hasKids ? `${g} — anything here?` : `${g} — nothing to open here.`);
    if (!hasKids) {
      addWrong();
      visit.counted = true;
      hint();
    }
  };
  const pickKid = (g: string, c: string) => {
    if (!visit || visit.g !== g || found.has(key(g, c))) return;
    gsap.killTweensOf(walker);
    const line = kidLine(g, c);
    const kseg = seg(line, g);
    travel(line, { draw: kseg, dur: 0.35 });
    const hit = targets().find((s) => s.g === g && s.c === c);
    if (hit) {
      tone(kseg, hit.ok === 'part' ? 'part' : 'ok');
      return hitTarget(hit);
    }
    addWrong();
    visit.counted = true;
    kidEl(g, c)?.classList.add('is-wrong');
    tone(kseg, 'wrong');
    say('', `Not ${c}.`);
    hint();
  };
  const hitTarget = (s: Step) => {
    const part = s.ok === 'part';
    if (mode === 'before') hitWhy(s.why);
    found.add(key(s.g, s.c));
    visit!.found = true;
    markFound(s.g, s.c, part);
    tone(visit!.base, part ? 'part' : 'ok');
    const left = targets().length - found.size;
    if (left > 0) return say('', `${s.note} One more place to find.`);
    say('', s.note);
    setManual(false);
    finish();
  };
  const hint = () => {
    if (wrong === HINT_AFTER) say('', 'Lost? That’s the point. Press Replay to watch the way through.');
  };

  stage.addEventListener('click', (e) => {
    if (!manual) return;
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.mz__node');
    if (!b) return;
    if (b.dataset.g) pickGroup(b.dataset.g);
    else if (b.dataset.k) {
      const i = b.dataset.k.indexOf('>');
      pickKid(b.dataset.k.slice(0, i), b.dataset.k.slice(i + 1));
    }
  });

  /* ---------- controls ---------- */
  const setTask = (i: number) => {
    ti = i;
    chips.forEach((c, j) => {
      c.classList.toggle('is-on', j === i);
      c.setAttribute('aria-pressed', String(j === i));
    });
  };
  const setMode = (m: Mode) => {
    mode = m;
    mz.dataset.mode = m;
    $$('[data-mz-tree]', mz).forEach((t) => t.classList.toggle('is-active', t.dataset.mzTree === m));
    modeBtns.forEach((b) => {
      const on = b.dataset.mzMode === m;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  };
  const restart = () => (manual ? startTry() : play());

  let touched = false;
  const touch = () => (touched = true);
  chips.forEach((c, i) =>
    c.addEventListener('click', () => {
      touch();
      setTask(i);
      restart();
    }),
  );
  modeBtns.forEach((b) =>
    b.addEventListener('click', () => {
      touch();
      setMode(b.dataset.mzMode as Mode);
      restart();
    }),
  );
  replayBtn.addEventListener('click', () => {
    touch();
    play();
  });
  tryBtn.addEventListener('click', () => {
    touch();
    if (manual) play();
    else startTry();
  });
  nextBtn.addEventListener('click', () => {
    touch();
    if (mode === 'before') setMode('after');
    else {
      setTask((ti + 1) % tasks.length);
      setMode('before');
    }
    play();
  });

  setMode('before');
  setManual(false);
  gsap.set(walker, { x: ROOT.x, y: ROOT.y, opacity: 0 });

  // First time the map is in view, play the first walkthrough.
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (!touched) play();
    },
    { threshold: 0.45 },
  );
  io.observe(stage);
}
