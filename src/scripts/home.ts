import {
  gsap,
  ScrollTrigger,
  root,
  reduced,
  finePointer,
  $,
  $$,
  clamp,
  smooth,
  fontsReady,
  initSplitHeadings,
  initReveals,
  countUp,
} from './core';
import { createHeroField, type HeroField } from './hero-field';

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
const hero = $('[data-hero]');
const heroCanvas = $<HTMLCanvasElement>('[data-hero-canvas]');
const heroTitle = $('[data-hero-title]');
let field: HeroField | null = null;

const complexEl = $('[data-complex]');
const complexChars: HTMLSpanElement[] = [];
if (complexEl) {
  const word = complexEl.textContent || '';
  complexEl.textContent = '';
  for (const ch of word) {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = ch;
    complexEl.appendChild(s);
    complexChars.push(s);
  }
}
// Each letter of "complex" gets its own messy offset that resolves with clarity.
const charOffsets = complexChars.map((_, i) => ({
  x: (Math.random() - 0.5) * 0.12,
  y: (i % 2 ? 1 : -1) * (0.08 + Math.random() * 0.14),
  r: (Math.random() - 0.5) * 28,
  ph: Math.random() * Math.PI * 2,
}));

let heroClarity = 0;
let heroVisible = true;
const meterComplex = $('[data-meter-complex]');
const meterClarity = $('[data-meter-clarity]');
const meterBar = $('[data-meter-bar]');
const underline = $('[data-underline]');

function renderHeroUI(p: number) {
  if (reduced) p = 1;
  heroClarity = smooth(0.04, 0.62, p);
  field?.setClarity(heroClarity);
  const pct = Math.round(heroClarity * 100);
  if (meterClarity) meterClarity.textContent = `${pct}%`;
  if (meterComplex) meterComplex.textContent = `${100 - pct}%`;
  if (meterBar) meterBar.style.transform = `scaleX(${heroClarity.toFixed(3)})`;
  if (underline) underline.style.transform = `scaleX(${smooth(0.55, 0.78, p).toFixed(3)})`;
  if (heroCanvas) heroCanvas.style.opacity = (1 - smooth(0.8, 1, p) * 0.65).toFixed(3);
}

let complexFs = 100;
const measureComplex = () => complexEl && (complexFs = parseFloat(getComputedStyle(complexEl).fontSize) || 100);
measureComplex();
window.addEventListener('resize', measureComplex);

function tickComplex(time: number) {
  if (!heroVisible || reduced) return;
  const amp = 1 - heroClarity;
  const fs = complexFs;
  complexChars.forEach((c, i) => {
    const o = charOffsets[i];
    if (amp < 0.002) {
      c.style.transform = '';
      return;
    }
    const wob = Math.sin(time * 1.6 + o.ph) * 0.025;
    c.style.transform = `translate(${(o.x * fs * amp).toFixed(2)}px, ${((o.y + wob) * fs * amp).toFixed(2)}px) rotate(${(o.r * amp).toFixed(2)}deg)`;
  });
}

if (hero && heroCanvas) {
  let labels: string[] = [];
  try {
    labels = JSON.parse(heroCanvas.dataset.labels || '[]');
  } catch {}
  field = createHeroField(heroCanvas, {
    labels,
    reduced,
    avoid: () => {
      const c = heroCanvas.getBoundingClientRect();
      return $$('.hero__eyebrow, [data-hero-title], .hero__intro, .hero__meter, .hero__hint')
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0)
        .map((r) => new DOMRect(r.left - c.left, r.top - c.top, r.width, r.height));
    },
  });

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => renderHeroUI(self.progress),
    onRefresh: (self) => renderHeroUI(self.progress),
  });

  new IntersectionObserver(
    ([entry]) => {
      heroVisible = entry.isIntersecting;
      if (reduced) return;
      if (heroVisible) field!.start();
      else field!.stop();
    },
    { rootMargin: '0px 0px 0px 0px' },
  ).observe(hero);

  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    if (document.hidden) field!.stop();
    else if (heroVisible) field!.start();
  });

  gsap.ticker.add(tickComplex);

  let rw = window.innerWidth;
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      // Ignore mobile URL-bar height changes; rebuild on real width changes.
      if (Math.abs(window.innerWidth - rw) < 2 && Math.abs(heroCanvas.height / (window.devicePixelRatio || 1) - window.innerHeight) < 140) return;
      rw = window.innerWidth;
      field!.resize();
    }, 200);
  });
}

/* ------------------------------------------------------------------ */
/* Intro + reveals (after fonts so line splits are correct)            */
/* ------------------------------------------------------------------ */
fontsReady.then(() => {
  measureComplex();
  if (field) field.resize();
  playIntro();
  initSplitHeadings();
  initReveals();
  initAbout();
  initMarquee();
  initWork();
  initExperience();
  initOtherWorks();
  initExplorations();
  initFooter();
  ScrollTrigger.refresh();
});

function playIntro() {
  const lines = $$('.hero__line');
  const fades = $$('[data-hero-fade]');
  if (reduced) {
    gsap.set([...lines, ...fades], { clearProps: 'all' });
    root.classList.add('intro-done');
    return;
  }
  field?.playIntro();
  field?.start();
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => root.classList.add('intro-done') });
  tl.fromTo(lines, { y: 0, yPercent: 112 }, { y: 0, yPercent: 0, duration: 1.5, stagger: 0.09 }, 0.15)
    .fromTo(fades, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.55)
    .fromTo('.nav__inner', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 1.2 }, 0.5);
}

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */
function initAbout() {
  const words = $$('[data-words] .w');
  if (words.length) {
    if (reduced) gsap.set(words, { opacity: 1 });
    else
      gsap.to(words, {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: '[data-words]', start: 'top 82%', end: 'bottom 52%', scrub: 0.6 },
      });
  }

  const portrait = $('[data-portrait]');
  if (portrait && !reduced) {
    const frame = $('.about__portrait-frame', portrait)!;
    const img = $('img', portrait);
    gsap.fromTo(
      frame,
      { clipPath: 'inset(100% 0% 0% 0% round 28px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 28px)',
        duration: 1.5,
        ease: 'expo.inOut',
        scrollTrigger: { trigger: portrait, start: 'top 85%', once: true },
      },
    );
    if (img)
      gsap.fromTo(
        img,
        { yPercent: -12, scale: 1.12 },
        {
          yPercent: 0,
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: portrait, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
  }

  $$('.about__stats [data-count]').forEach((el, i) => countUp(el, i * 0.08));

  const pillars = $$('[data-pillar]');
  if (reduced) {
    pillars.forEach((p) => p.classList.add('is-on'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const i = pillars.indexOf(el);
        setTimeout(() => el.classList.add('is-on'), 350 + i * 220);
        io.unobserve(el);
      });
    },
    { threshold: 0.45 },
  );
  pillars.forEach((p) => {
    io.observe(p);
    let replay = 0;
    p.addEventListener('pointerenter', () => {
      if (!p.classList.contains('is-on')) return;
      p.classList.remove('is-on');
      clearTimeout(replay);
      replay = window.setTimeout(() => p.classList.add('is-on'), 420);
    });
    p.addEventListener('pointermove', (e) => {
      const r = p.getBoundingClientRect();
      p.style.setProperty('--mx', `${e.clientX - r.left}px`);
      p.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Marquee: drifts constantly, speeds up and flips with scroll velocity */
/* ------------------------------------------------------------------ */
function initMarquee() {
  const section = $('[data-marquee-section]');
  if (!section) return;
  const rows = $$('[data-marquee]', section).map((row) => ({
    dir: Number(row.dataset.marquee) || 1,
    track: $('[data-marquee-track]', row)!,
    x: 0,
    w: 0,
  }));
  const measure = () => rows.forEach((r) => (r.w = (r.track.firstElementChild as HTMLElement).offsetWidth));
  measure();
  window.addEventListener('resize', measure);
  if (reduced) return;

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(section);
  const st = ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top' });
  let boost = 0;
  let heading = 1;
  gsap.ticker.add((_t, dt) => {
    if (!visible) return;
    const v = st.getVelocity();
    if (Math.abs(v) > 60) heading = v < 0 ? -1 : 1;
    boost += (clamp(Math.abs(v) / 900, 0, 7) - boost) * 0.08;
    const step = (0.55 + boost * 2.6) * (dt / 16.67) * heading;
    rows.forEach((r) => {
      r.x -= step * r.dir;
      if (r.x <= -r.w) r.x += r.w;
      else if (r.x > 0) r.x -= r.w;
      r.track.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0)`;
    });
  });
}

/* ------------------------------------------------------------------ */
/* Selected work: sticky stack                                          */
/* ------------------------------------------------------------------ */
function initWork() {
  $$('.card [data-count]').forEach((el) => countUp(el));
  if (reduced) return;

  const cards = $$('[data-card]');
  // Zero-height markers keep the natural (non-sticky) position for ScrollTrigger maths.
  const markers = cards.map((card) => {
    const m = document.createElement('div');
    m.setAttribute('aria-hidden', 'true');
    m.style.cssText = 'height:0;pointer-events:none';
    card.before(m);
    return m;
  });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    cards.forEach((card, i) => {
      const inner = $('[data-card-inner]', card)!;
      const shade = $('[data-card-shade]', card)!;
      const img = $('[data-card-img]', card);
      const stickTop = () => parseFloat(getComputedStyle(card).top) || 0;

      if (img)
        gsap.fromTo(
          img,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: {
              trigger: markers[i],
              start: 'top bottom',
              end: () => `+=${window.innerHeight + card.offsetHeight}`,
              scrub: true,
            },
          },
        );

      // Content inside each card rises in as it arrives.
      gsap.from($$('.card__meta, .card__body > *, .card__foot > *', card), {
        y: 40,
        opacity: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: markers[i], start: 'top 70%', once: true },
      });

      const next = markers[i + 1];
      if (!next) return;
      const nextCard = cards[i + 1];
      gsap
        .timeline({
          scrollTrigger: {
            trigger: next,
            start: 'top bottom',
            end: () => `top ${parseFloat(getComputedStyle(nextCard).top) || stickTop()}px`,
            scrub: true,
          },
        })
        .to(inner, { scale: 0.9, ease: 'none' }, 0)
        .to(shade, { opacity: 0.6, ease: 'none' }, 0);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Experience                                                          */
/* ------------------------------------------------------------------ */
function initExperience() {
  if (reduced) return;
  $$('[data-role]').forEach((row) => {
    const rule = $('.role__rule', row);
    const parts = $$('.role__period, .role__company, .role__title, .role__text, .role__tags', row);
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', once: true } });
    if (rule) tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut' }, 0);
    tl.from(parts, { y: 28, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05 }, 0.2);
  });
}

/* ------------------------------------------------------------------ */
/* Other work: accordion + cursor-follow preview                       */
/* ------------------------------------------------------------------ */
function initOtherWorks() {
  const list = $('[data-other-list]');
  if (!list) return;
  const items = $$('[data-item]', list);
  let refreshTimer = 0;

  items.forEach((item) => {
    const btn = $<HTMLButtonElement>('[data-item-toggle]', item)!;
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      items.forEach((other) => {
        if (other !== item && other.classList.contains('is-open')) {
          other.classList.remove('is-open');
          $('[data-item-toggle]', other)!.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 750);
    });
  });

  if (!reduced) {
    gsap.from($$('.item', list), {
      y: 30,
      opacity: 0,
      duration: 1,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: list, start: 'top 85%', once: true },
    });
  }

  const preview = $('[data-preview]');
  if (!preview || !finePointer) return;
  const imgs = $$('[data-preview-img]', preview);

  // Only mount (and load) preview images once the section is close.
  new IntersectionObserver(
    ([e], obs) => {
      if (e.isIntersecting) {
        root.classList.add('preview-ready');
        obs.disconnect();
      }
    },
    { rootMargin: '600px 0px' },
  ).observe(list);

  const xTo = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
  const rTo = gsap.quickTo(preview, 'rotation', { duration: 0.8, ease: 'power3' });
  let lastX = 0;

  list.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    place(e.clientX, e.clientY);
    rTo(clamp((e.clientX - lastX) * 0.6, -8, 8));
    lastX = e.clientX;
  });
  const place = (cx: number, cy: number, instant = false) => {
    const w = preview.offsetWidth || 400;
    const h = preview.offsetHeight || 326;
    const x = cx - w / 2 + Math.min(260, window.innerWidth - cx - w / 2 - 24);
    const y = cy - h / 2;
    if (instant) gsap.set(preview, { x, y });
    else {
      xTo(x);
      yTo(y);
    }
  };
  items.forEach((item, i) => {
    $('[data-item-toggle]', item)!.addEventListener('pointerenter', (e) => {
      const pe = e as PointerEvent;
      if (pe.pointerType !== 'mouse') return;
      imgs.forEach((img, k) => img.classList.toggle('is-active', k === i));
      place(pe.clientX, pe.clientY, !root.classList.contains('preview-on'));
      root.classList.add('preview-on');
    });
  });
  list.addEventListener('pointerleave', () => root.classList.remove('preview-on'));
}

/* ------------------------------------------------------------------ */
/* Explorations: sticky image swap                                     */
/* ------------------------------------------------------------------ */
function initExplorations() {
  const items = $$('[data-xp-item]');
  const imgs = $$('[data-xp-img]');
  const counter = $('[data-xp-count]');
  let current = 0;

  const setActive = (i: number) => {
    if (i === current) return;
    imgs.forEach((img, k) => {
      img.classList.toggle('was-active', k === current);
      img.classList.toggle('is-active', k === i);
      if (k !== current && k !== i) img.classList.remove('was-active');
    });
    items.forEach((it, k) => it.classList.toggle('is-active', k === i));
    if (counter) counter.textContent = String(i + 1).padStart(2, '0');
    current = i;
  };

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    items.forEach((item, i) => {
      ScrollTrigger.create({
        trigger: item,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => self.isActive && setActive(i),
      });
    });
  });

  if (!reduced) {
    mm.add('(max-width: 1023px)', () => {
      items.forEach((item) => {
        gsap.from(item.children, {
          y: 30,
          opacity: 0,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.06,
          scrollTrigger: { trigger: item, start: 'top 85%', once: true },
        });
      });
    });
  }
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */
function initFooter() {
  const mark = $('[data-wordmark]');
  if (!mark || reduced) return;
  gsap.from(mark.children, {
    yPercent: 70,
    opacity: 0,
    ease: 'none',
    stagger: 0.1,
    scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
  const orb = $('.orb');
  if (orb)
    gsap.from(orb, {
      scale: 0.4,
      opacity: 0,
      duration: 1.4,
      ease: 'expo.out',
      scrollTrigger: { trigger: orb, start: 'top 92%', once: true },
    });
}

