import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

/**
 * Shared runtime for every page: smooth scroll, nav, menu, clock, cursor,
 * magnetic buttons, split-line headings and fade-up reveals.
 */
gsap.registerPlugin(ScrollTrigger, SplitText);
(window as any).__ready = true;

export { gsap, ScrollTrigger, SplitText };
export const root = document.documentElement;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
export const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) =>
  Array.from(el.querySelectorAll<T>(s));
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                       */
/* ------------------------------------------------------------------ */
export let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
if (import.meta.env.DEV) (window as any).__lenis = lenis;

export function scrollToTarget(hash: string) {
  const target = hash === '#top' ? 0 : $(hash);
  if (target === null) return;
  if (lenis) lenis.scrollTo(target as any, { duration: 1.6 });
  else if (target === 0) window.scrollTo({ top: 0 });
  else (target as HTMLElement).scrollIntoView();
}

document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a) return;
  const hash = a.getAttribute('href')!;
  if (hash.length < 2) return;
  e.preventDefault();
  closeMenu();
  scrollToTarget(hash);
  history.replaceState(null, '', hash === '#top' ? location.pathname : hash);
});

/* ------------------------------------------------------------------ */
/* Nav: hide on scroll down, progress, active section, clock, menu     */
/* ------------------------------------------------------------------ */
const progressBar = $('[data-progress]');
let lastY = 0;
ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate(self) {
    const y = self.scroll();
    root.classList.toggle('nav-scrolled', y > 40);
    if (!root.classList.contains('menu-open')) {
      if (y > lastY + 4 && y > window.innerHeight * 0.9) root.classList.add('nav-hidden');
      else if (y < lastY - 4) root.classList.remove('nav-hidden');
    }
    lastY = y;
    if (progressBar) progressBar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
  },
});

const sectionLinks = $$<HTMLAnchorElement>('[data-section-link]');
const sectionTriggers = $$('[data-section]').map((section) => ({
  key: section.dataset.section!,
  st: ScrollTrigger.create({
    trigger: section,
    start: 'top 50%',
    end: 'bottom 50%',
    onToggle: () => updateActiveLink(),
  }),
}));
function updateActiveLink() {
  const active = sectionTriggers.filter((t) => t.st.isActive).pop();
  sectionLinks.forEach((l) => l.classList.toggle('is-active', !!active && l.dataset.sectionLink === active.key));
}
ScrollTrigger.addEventListener('refresh', updateActiveLink);

const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' });
const tickClock = () => {
  const t = `${clockFmt.format(new Date())} GMT+8`;
  $$('[data-clock]').forEach((el) => (el.textContent = t));
};
tickClock();
setInterval(tickClock, 20_000);

const menuToggle = $<HTMLButtonElement>('[data-menu-toggle]');
const menu = $('[data-menu]');
export function closeMenu() {
  if (!root.classList.contains('menu-open')) return;
  root.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-hidden', 'true');
  $$('a', menu!).forEach((a) => a.setAttribute('tabindex', '-1'));
  lenis?.start();
}
menuToggle?.addEventListener('click', () => {
  const open = !root.classList.contains('menu-open');
  if (!open) return closeMenu();
  root.classList.add('menu-open');
  menuToggle.setAttribute('aria-expanded', 'true');
  menu?.setAttribute('aria-hidden', 'false');
  $$('a', menu!).forEach((a) => a.removeAttribute('tabindex'));
  lenis?.stop();
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

/* ------------------------------------------------------------------ */
/* Fonts gate: line splitting must wait for real metrics               */
/* ------------------------------------------------------------------ */
export const fontsReady = Promise.race([
  document.fonts?.ready ?? Promise.resolve(),
  new Promise((r) => setTimeout(r, 900)),
]);

export function initSplitHeadings() {
  $$('[data-split-lines]').forEach((el) => {
    if (reduced) {
      el.style.visibility = 'visible';
      return;
    }
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      // aria-label is only valid on headings; plain text stays readable as-is.
      aria: el.matches('h1, h2, h3, h4, h5, h6') ? 'auto' : 'none',
      onSplit(self) {
        el.style.visibility = 'visible';
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.3,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      },
    });
  });
}

export function initReveals() {
  if (reduced) return;
  ScrollTrigger.batch('[data-reveal="fade-up"]', {
    start: 'top 90%',
    once: true,
    onEnter: (els) =>
      gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });
}

export function countUp(el: HTMLElement, delay = 0) {
  const to = Number(el.dataset.count || 0);
  if (reduced) return;
  const obj = { v: 0 };
  el.textContent = '0';
  gsap.to(obj, {
    v: to,
    duration: 1.8,
    delay,
    ease: 'expo.out',
    onUpdate: () => (el.textContent = String(Math.round(obj.v))),
    scrollTrigger: { trigger: el, start: 'top 92%', once: true },
  });
}


/* ------------------------------------------------------------------ */
/* Pointer: cursor, magnetic, ambient glow                             */
/* ------------------------------------------------------------------ */
if (finePointer && !reduced) {
  root.classList.add('has-cursor');
  const cursorRoot = $('[data-cursor-root]')!;
  const dot = $('[data-cursor-dot]')!;
  const ring = $('[data-cursor-ring]')!;
  const label = $('[data-cursor-label]')!;
  const ambient = $('.ambient');

  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  const ax = ambient ? gsap.quickTo(ambient, 'x', { duration: 1.6, ease: 'power2' }) : null;
  const ay = ambient ? gsap.quickTo(ambient, 'y', { duration: 1.6, ease: 'power2' }) : null;

  let shown = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
        ambient && gsap.set(ambient, { x: e.clientX, y: e.clientY });
        root.classList.add('has-pointer');
      }
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      ax?.(e.clientX);
      ay?.(e.clientY);
    },
    { passive: true },
  );

  document.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    const labelEl = t.closest<HTMLElement>('[data-cursor]');
    const hideEl = t.closest('[data-cursor-hide]');
    const link = t.closest('a, button');
    root.classList.toggle('cursor-hide', !!hideEl);
    root.classList.toggle('cursor-label', !!labelEl && !hideEl);
    root.classList.toggle('cursor-link', !!link && !labelEl && !hideEl);
    if (labelEl) {
      label.textContent = labelEl.dataset.cursor || '';
      const color = labelEl.dataset.cursorColor;
      cursorRoot.style.setProperty('--cursor-bg', color || '');
      cursorRoot.style.setProperty('--cursor-fg', color ? '#fff' : '');
    }
  });
  document.addEventListener('pointerdown', () => root.classList.add('cursor-down'));
  document.addEventListener('pointerup', () => root.classList.remove('cursor-down'));
  document.documentElement.addEventListener('pointerleave', () => gsap.to(cursorRoot, { opacity: 0, duration: 0.3 }));
  document.documentElement.addEventListener('pointerenter', () => gsap.to(cursorRoot, { opacity: 1, duration: 0.3 }));

  // Magnetic elements
  $$('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic || 0.3);
    const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - (r.left + r.width / 2)) * strength);
      my((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
    });
  });
}
