import {
  gsap,
  ScrollTrigger,
  root,
  reduced,
  finePointer,
  lenis,
  $,
  $$,
  clamp,
  fontsReady,
  initSplitHeadings,
  initReveals,
  countUp,
} from './core';
import { initNavMaze } from './maze';

fontsReady.then(() => {
  intro();
  initSplitHeadings();
  initReveals();
  initFigures();
  $$('[data-count]').forEach((el) => countUp(el));
  initVideos();
  initPill();
  initJourney();
  initEcosystem();
  initPan();
  initLightbox();
  initInView();
  initScrollStrips();
  initPathExplorer();
  initBeforeAfter();
  initNavMaze();
  initRegroup();
  ScrollTrigger.refresh();
});

/* ------------------------------------------------------------------ */
/* Intro                                                               */
/* ------------------------------------------------------------------ */
function intro() {
  const fades = $$('[data-hero-fade]');
  const cover = $('[data-cover]');
  const coverImg = $('[data-cover-img]');
  if (reduced) {
    gsap.set(['.nav__inner', ...fades], { opacity: 1, clearProps: 'transform' });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo('.nav__inner', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 1.2 }, 0.1).fromTo(
    fades,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 },
    0.25,
  );
  if (cover) {
    tl.fromTo(
      cover,
      { clipPath: 'inset(14% 6% 0% 6% round 34px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 34px)', duration: 1.8, ease: 'expo.inOut' },
      0.35,
    );
  }
  if (coverImg) {
    gsap.fromTo(
      coverImg,
      { yPercent: -4, scale: 1.08 },
      {
        yPercent: 4,
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: cover, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  }
}

/* ------------------------------------------------------------------ */
/* Figures: rise in + parallax                                         */
/* ------------------------------------------------------------------ */
function initFigures() {
  if (reduced) return;
  $$('[data-figure]').forEach((fig) => {
    if (fig.closest('[data-reveal]')) return; // parent already animates
    const frame = $('.fig__frame', fig);
    const img = $('img', fig);
    gsap.from(frame, {
      y: 60,
      opacity: 0,
      duration: 1.3,
      ease: 'expo.out',
      scrollTrigger: { trigger: fig, start: 'top 92%', once: true },
    });
    if (img && !$('[data-parallax]', fig)) {
      gsap.from(img, {
        scale: 1.08,
        duration: 1.8,
        ease: 'expo.out',
        scrollTrigger: { trigger: fig, start: 'top 92%', once: true },
      });
    }
  });
  $$('[data-parallax]').forEach((el) => {
    gsap.fromTo(
      el,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}

/* ------------------------------------------------------------------ */
/* Videos: load when near, play only while visible                     */
/* ------------------------------------------------------------------ */
function initVideos() {
  const videos = $$<HTMLVideoElement>('[data-video]');
  // <video poster> downloads eagerly, so posters are attached only when a video gets close.
  const prime = (v: HTMLVideoElement) => {
    if (v.dataset.primed) return;
    if (v.dataset.poster) v.poster = v.dataset.poster;
    v.dataset.primed = '1';
  };
  const load = (v: HTMLVideoElement) => {
    prime(v);
    if (v.dataset.loaded) return;
    v.src = v.dataset.src!;
    v.dataset.loaded = '1';
  };
  const near = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const v = e.target as HTMLVideoElement;
        if (reduced) {
          // No autoplay: poster + controls, the file loads only if someone presses play.
          prime(v);
          v.controls = true;
          v.preload = 'none';
          v.src = v.dataset.src!;
          near.unobserve(v);
        } else load(v);
      }),
    { rootMargin: '600px 0px' },
  );
  if (reduced) {
    videos.forEach((v) => near.observe(v));
    return;
  }
  const visible = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          load(v);
          v.play().catch(() => {});
        } else v.pause();
      }),
    { threshold: 0.35 },
  );
  videos.forEach((v) => {
    near.observe(v);
    visible.observe(v);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach((v) => v.pause());
  });
}

/* ------------------------------------------------------------------ */
/* Chapter pill: current chapter, page progress, quick jump            */
/* ------------------------------------------------------------------ */
function initPill() {
  const pill = $('[data-pill]');
  if (!pill) return;
  const btn = $<HTMLButtonElement>('[data-pill-toggle]', pill)!;
  const numEl = $('[data-pill-num]', pill)!;
  const labelEl = $('[data-pill-label]', pill)!;
  const ring = $<SVGCircleElement>('[data-pill-ring]', pill);
  const links = $$<HTMLAnchorElement>('[data-pill-link]', pill);
  const chapters = $$('[data-chapter]');

  const setOpen = (open: boolean) => {
    root.classList.toggle('pill-open', open);
    btn.setAttribute('aria-expanded', String(open));
    links.forEach((l) => (open ? l.removeAttribute('tabindex') : l.setAttribute('tabindex', '-1')));
  };
  btn.addEventListener('click', () => setOpen(!root.classList.contains('pill-open')));
  links.forEach((l) => l.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  document.addEventListener('pointerdown', (e) => {
    if (!pill.contains(e.target as Node)) setOpen(false);
  });

  // Filled in place: a chapter already in view fires onToggle during create(),
  // before its trigger is in the list — so update again once all exist and on every refresh.
  const triggers: ScrollTrigger[] = [];
  chapters.forEach((ch) =>
    triggers.push(
      ScrollTrigger.create({
        trigger: ch,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: () => update(),
      }),
    ),
  );
  update();
  ScrollTrigger.addEventListener('refresh', update);
  function update() {
    const i = triggers.map((t) => t.isActive).lastIndexOf(true);
    if (i < 0) return;
    numEl.textContent = String(i + 1).padStart(2, '0');
    labelEl.textContent = chapters[i].dataset.chapter || '';
    links.forEach((l, k) => l.classList.toggle('is-active', k === i));
  }

  const firstChapter = chapters[0];
  const footer = $('#contact');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      if (ring) ring.style.strokeDashoffset = String(1 - self.progress);
      const y = self.scroll();
      const after = firstChapter ? y > firstChapter.offsetTop - window.innerHeight * 0.4 : true;
      const before = footer ? y + window.innerHeight < footer.offsetTop + 120 : true;
      const on = after && before;
      root.classList.toggle('pill-on', on);
      if (!on) setOpen(false);
    },
  });
}

/* ------------------------------------------------------------------ */
/* Journey bar                                                         */
/* ------------------------------------------------------------------ */
function initJourney() {
  const bar = $('[data-jbar]');
  if (!bar) return;
  const links = $$('[data-jbar-link]', bar);
  const fill = $('[data-jbar-fill]', bar);
  const phases = $$('[data-phase]');
  const set = (i: number) => links.forEach((l, k) => l.classList.toggle('is-active', k === i));
  phases.forEach((ph, i) => {
    ScrollTrigger.create({
      trigger: ph,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => self.isActive && set(i),
    });
  });
  if (fill && phases.length) {
    ScrollTrigger.create({
      trigger: phases[0],
      endTrigger: phases[phases.length - 1],
      start: 'top 50%',
      end: 'bottom 50%',
      onUpdate: (self) => (fill.style.transform = `scaleX(${self.progress.toFixed(4)})`),
    });
  }
}

/* ------------------------------------------------------------------ */
/* Ecosystem diagram                                                   */
/* ------------------------------------------------------------------ */
function initEcosystem() {
  const eco = $('[data-eco]');
  if (!eco) return;
  const svg = $<SVGSVGElement>('svg', eco);
  if (reduced) {
    eco.classList.add('is-on');
    svg?.pauseAnimations();
    return;
  }
  svg?.pauseAnimations();
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        eco.classList.add('is-on');
        svg?.unpauseAnimations();
      } else svg?.pauseAnimations();
    },
    { threshold: 0.25 },
  ).observe(eco);
}

/* ------------------------------------------------------------------ */
/* Pan: drag-to-scroll for oversized diagrams                          */
/* ------------------------------------------------------------------ */
function initPan() {
  $$('[data-pan]').forEach((pan) => {
    const vp = $('[data-pan-viewport]', pan)!;
    const progress = $('[data-pan-progress]', pan);
    const sync = () => {
      const max = vp.scrollWidth - vp.clientWidth;
      const visible = vp.clientWidth / vp.scrollWidth;
      if (progress)
        progress.style.transform = `translateX(${(max > 0 ? vp.scrollLeft / max : 0) * (1 - visible) * 100}%) scaleX(${visible.toFixed(3)})`;
    };
    vp.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    $('img', vp)?.addEventListener('load', sync);
    sync();

    if (!finePointer) return;
    let down = false;
    let startX = 0;
    let startLeft = 0;
    let velocity = 0;
    let lastX = 0;
    vp.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true;
      startX = lastX = e.clientX;
      startLeft = vp.scrollLeft;
      vp.classList.add('is-dragging');
      vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', (e) => {
      if (!down) return;
      velocity = e.clientX - lastX;
      lastX = e.clientX;
      vp.scrollLeft = startLeft - (e.clientX - startX);
    });
    const end = () => {
      if (!down) return;
      down = false;
      vp.classList.remove('is-dragging');
      // Momentum
      const target = clamp(vp.scrollLeft - velocity * 14, 0, vp.scrollWidth - vp.clientWidth);
      gsap.to(vp, { scrollLeft: target, duration: 0.9, ease: 'power3.out' });
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
  });
}

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */
function initLightbox() {
  const box = $('[data-lightbox]');
  if (!box) return;
  const img = $<HTMLImageElement>('[data-lightbox-img]', box)!;
  const caption = $('[data-lightbox-caption]', box)!;
  const close = $<HTMLButtonElement>('[data-lightbox-close]', box)!;
  box.setAttribute('data-lenis-prevent', '');
  let opener: HTMLElement | null = null;

  const open = (el: HTMLElement) => {
    opener = el;
    img.src = el.dataset.zoom!;
    img.alt = el.dataset.zoomAlt || '';
    caption.textContent = el.dataset.zoomCaption || '';
    root.classList.add('lightbox-open');
    box.setAttribute('aria-hidden', 'false');
    lenis?.stop();
    close.focus({ preventScroll: true });
  };
  const shut = () => {
    if (!root.classList.contains('lightbox-open')) return;
    root.classList.remove('lightbox-open');
    box.setAttribute('aria-hidden', 'true');
    lenis?.start();
    opener?.focus({ preventScroll: true });
  };

  document.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]');
    if (trigger) open(trigger);
  });
  close.addEventListener('click', shut);
  box.addEventListener('click', (e) => {
    if (e.target === box || (e.target as HTMLElement).matches('[data-lightbox-stage]')) shut();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && shut());
}

/* ------------------------------------------------------------------ */
/* In-view: charts animate once when they enter                        */
/* ------------------------------------------------------------------ */
function initInView() {
  const els = $$('[data-inview]');
  if (reduced) {
    els.forEach((el) => el.classList.add('is-on'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-on');
        io.unobserve(e.target);
      }),
    { threshold: 0.3 },
  );
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ */
/* Scroll strips: a very tall screenshot scrolls inside a frame        */
/* ------------------------------------------------------------------ */
function initScrollStrips() {
  $$('[data-strip]').forEach((strip) => {
    const frame = $('[data-strip-frame]', strip)!;
    const img = $('img', frame);
    if (!img || reduced) return;
    const travel = () => Math.max(0, img.getBoundingClientRect().height - frame.clientHeight);
    gsap.fromTo(
      img,
      { y: 0 },
      {
        y: () => -travel(),
        ease: 'none',
        scrollTrigger: {
          trigger: strip,
          start: 'top 60%',
          end: 'bottom 70%',
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      },
    );
    img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  });
}

/* ------------------------------------------------------------------ */
/* Path explorer: before / after navigation for a chosen task          */
/* ------------------------------------------------------------------ */
function initPathExplorer() {
  $$('[data-px]').forEach((px) => {
    const buttons = $$<HTMLButtonElement>('[data-px-task]', px);
    const note = $('[data-px-note]', px);
    const select = (btn: HTMLButtonElement) => {
      const t = JSON.parse(btn.dataset.pxTask!) as {
        before: [string, string][];
        after: [string, string][];
        direct: [number, number];
        note: string;
      };
      buttons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', String(on));
      });
      px.classList.add('has-task');
      $$('.is-path, .is-target', px).forEach((el) => el.classList.remove('is-path', 'is-target'));
      (['before', 'after'] as const).forEach((side, sideIndex) => {
        const panel = $(`[data-px-panel="${side}"]`, px)!;
        t[side].forEach(([top, child], i) => {
          const item = $(`[data-px-key="${CSS.escape(`${side}:${top}`)}"]`, panel);
          const target = $(`[data-px-key="${CSS.escape(`${side}:${top}>${child}`)}"]`, panel);
          item?.classList.add('is-path');
          target?.classList.add('is-target');
          const step = item && $('[data-px-step]', item);
          if (step) step.textContent = String(i + 1);
        });
        const score = t.direct[sideIndex];
        const scoreEl = $('[data-px-score]', panel);
        const bar = $('[data-px-bar]', panel);
        if (scoreEl) scoreEl.textContent = String(score);
        if (bar) bar.style.transform = `scaleX(${(score / 8).toFixed(3)})`;
      });
      if (note) note.textContent = t.note;
    };
    buttons.forEach((b) => b.addEventListener('click', () => select(b)));
    if (buttons[0]) select(buttons[0]);
  });
}

/* ------------------------------------------------------------------ */
/* Before / after: task tabs + version switch                          */
/* ------------------------------------------------------------------ */
function initBeforeAfter() {
  $$('[data-ba]').forEach((ba) => {
    const tabs = $$<HTMLButtonElement>('[data-ba-tab]', ba);
    const panels = $$('[data-ba-panel]', ba);
    let touched = false;

    const setState = (panel: HTMLElement, state: 'before' | 'after') => {
      panel.dataset.state = state;
      $$<HTMLButtonElement>('[data-ba-set]', panel).forEach((b) => {
        const on = b.dataset.baSet === state;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
    };
    const selectTab = (tab: HTMLButtonElement, focus = false) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.baPanel === tab.dataset.baTab));
      if (focus) tab.focus();
      ScrollTrigger.refresh();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        touched = true;
        selectTab(tab);
      });
      tab.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        selectTab(tabs[(i + dir + tabs.length) % tabs.length], true);
      });
    });
    panels.forEach((panel) => {
      $$<HTMLButtonElement>('[data-ba-set]', panel).forEach((b) =>
        b.addEventListener('click', () => {
          touched = true;
          setState(panel, b.dataset.baSet as 'before' | 'after');
        }),
      );
    });

    // First time it comes into view, flip once to show what the switch does.
    if (reduced) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setTimeout(() => {
          const active = panels.find((p) => p.classList.contains('is-active'));
          if (!touched && active) setState(active, 'after');
        }, 1600);
      },
      { threshold: 0.6 },
    );
    io.observe(ba);
  });
}

/* ------------------------------------------------------------------ */
/* Regroup: one tab per new group                                      */
/* ------------------------------------------------------------------ */
function initRegroup() {
  $$('[data-rg]').forEach((rg) => {
    const tabs = $$<HTMLButtonElement>('[data-rg-tab]', rg);
    const panels = $$('[data-rg-panel]', rg);
    const select = (tab: HTMLButtonElement, focus = false) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => (p.hidden = p.dataset.rgPanel !== tab.dataset.rgTab));
      if (focus) tab.focus();
      ScrollTrigger.refresh();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        select(tabs[(i + dir + tabs.length) % tabs.length], true);
      });
    });
  });
}
