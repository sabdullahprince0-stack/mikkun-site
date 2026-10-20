const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
const closeMenu = (restoreFocus = false) => {
  if (mobileMenu) mobileMenu.hidden = true;
  menuButton?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menuButton?.focus({preventScroll:true});
};
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  if (mobileMenu) mobileMenu.hidden = open;
  if (!open) mobileMenu?.querySelector('a')?.focus({preventScroll:true});
});
mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileMenu?.hidden) closeMenu(true); });

// Each reveal returns to the existing CSS geometry. No wrappers, text splitting,
// or layout properties are animated; translate handles the separate hero depth.
const hero = document.querySelector('.hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width:760px)');
const desktopPointer = matchMedia('(min-width:761px) and (hover:hover) and (pointer:fine)');
const active = new Set();
const pending = new Map();
const seen = new WeakSet();
const editorial = 'cubic-bezier(.22,.72,.18,1)';
const elegant = 'cubic-bezier(.2,.58,.22,1)';
const open = 'inset(-20% -20% -20% -20%)';
const masks = {
  left: [{ clipPath: 'inset(-20% 100% -20% -20%)' }, { clipPath: open }],
  right: [{ clipPath: 'inset(-20% -20% -20% 100%)' }, { clipPath: open }],
  down: [{ clipPath: 'inset(-20% -20% 100% -20%)' }, { clipPath: open }],
  up: [{ clipPath: 'inset(100% -20% -20% -20%)' }, { clipPath: open }],
  ink: [{ opacity: 0 }, { opacity: 1 }],
};

function play(element, frames, duration, delay = 0, easing = editorial, id = '') {
  if (!element) return;
  if (reduced.matches) {
    element.removeAttribute('data-motion-pending');
    return;
  }
  const keyframes = frames.map(keyframe => ({ opacity: 1, ...keyframe }));
  // Keep delayed cuts entirely blank, including antialiased glyph edges at x=0.
  if (frames[0].clipPath && frames[0].opacity === undefined) {
    keyframes[0] = { ...keyframes[0], opacity: 0, offset: 0 };
    keyframes.splice(1, 0, { ...keyframes[0], opacity: 1, offset: .006 });
    keyframes[keyframes.length - 1].offset = 1;
  }
  const animation = element.animate(keyframes, {
    duration: duration * (mobile.matches ? .78 : 1),
    delay: delay * (mobile.matches ? .72 : 1), easing, fill: 'both',
  });
  animation.id = id;
  active.add(animation);
  animation.finished.then(() => {
    element.removeAttribute('data-motion-pending');
    // Cancel the finished effect so masks and compositing layers do not linger.
    animation.cancel();
  }).catch(() => {}).finally(() => active.delete(animation));
  return animation;
}

function queue(selector, frames, duration, delay = 0, easing = editorial, scene = 'section') {
  document.querySelectorAll(selector).forEach((element, index) => {
    pending.set(element, { frames, duration, delay: delay + index * 65, easing,
      id: `${scene}:${element.className || element.tagName}` });
    if (!reduced.matches) element.setAttribute('data-motion-pending', '');
  });
}

// Architectural registration: horizontal planes and short, measured intervals.
queue('.project-woodstones .project-art', [
  { clipPath: 'inset(-20% 100% -20% -20%)', transform: 'translateX(10px)' },
  { clipPath: open, transform: 'none' },
], 820, 60, editorial, 'woodstones');
queue('.project-woodstones h3', masks.left, 620, 0, editorial, 'woodstones');
queue('.project-woodstones .project-year, .project-woodstones .project-type', masks.left, 420, 40, editorial, 'woodstones');
queue('.project-woodstones .project-description, .project-woodstones .project-link', masks.ink, 500, 120, editorial, 'woodstones');

// Poster registration: a quick diagonal arrival, followed by hard opposing cuts.
queue('.project-dbasement .project-art', [
  { opacity: 0, clipPath: 'inset(-20% -20% 100% -20%)', transform: 'translate(-12px, 8px) rotate(-.45deg)' },
  { opacity: 1, clipPath: open, transform: 'none' },
], 470, 0, 'cubic-bezier(.16,.85,.25,1)', 'dbasement');
queue('.project-dbasement h3', [
  { clipPath: 'inset(-20% -20% -20% 100%)', transform: 'translateX(-8px)' },
  { clipPath: open, transform: 'none' },
], 380, 40, editorial, 'dbasement');
queue('.project-dbasement .project-year, .project-dbasement .project-type, .project-dbasement .project-description, .project-dbasement .project-link', masks.right, 360, 30, editorial, 'dbasement');

// Perfume pacing: a long vertical aperture and an almost imperceptible settle.
queue('.project-haniyah .project-art', [
  { opacity: 0, clipPath: 'inset(-20% -20% 100% -20%)', transform: 'scale(1.018)' },
  { opacity: 1, clipPath: open, transform: 'none' },
], 1280, 80, elegant, 'haniyah');
queue('.project-haniyah h3', masks.left, 1000, 80, elegant, 'haniyah');
queue('.project-haniyah .project-year, .project-haniyah .project-type, .project-haniyah .project-description, .project-haniyah .project-link', masks.ink, 850, 140, elegant, 'haniyah');

// About reads like a magazine spread: photo aperture, headline, then paragraphs.
queue('.about-photo', masks.down, 1000, 0, editorial, 'about');
queue('.about h2', masks.left, 800, 100, editorial, 'about');
queue('.about .eyebrow, .about .lead, .about-body, .about-process, .about-mantra, .tools-label, .small-caps, .tools', masks.left, 620, 130, editorial, 'about');

// A little asymmetry for the personal material, resolving to the approved grid.
document.querySelectorAll('.quest-card').forEach((element, index) => {
  const x = mobile.matches ? [0, 2, -2][index] : [-7, 4, 8][index];
  const y = mobile.matches ? [9, 13, 7][index] : [14, 22, 11][index];
  pending.set(element, { frames: [
    { opacity: 0, clipPath: 'inset(-20% -20% 100% -20%)', transform: `translate(${x}px, ${y}px)` },
    { opacity: 1, clipPath: open, transform: 'none' },
  ], duration: 680, delay: index * 110, easing: editorial, id: `quests:card-${index}` });
  if (!reduced.matches) element.setAttribute('data-motion-pending', '');
});
queue('.side-quests .eyebrow, .side-quests h2, .side-quests .section-copy, .side-quest-enter', masks.left, 620, 40, editorial, 'quests');

// Closing title: one decisive bottom-to-top cut, then the contact details.
queue('.contact h2', [
  { clipPath: 'inset(100% -20% -20% -20%)', transform: 'translateY(18px)' },
  { clipPath: open, transform: 'none' },
], 860, 0, 'cubic-bezier(.18,.78,.18,1)', 'contact');
queue('.contact .eyebrow, .contact-blurb, .email, .socials, .footer-line, .mobile-footer', masks.left, 600, 220, editorial, 'contact');
queue('.manifesto h2, .work-title', masks.left, 850, 0, editorial, 'chapter');
queue('.manifesto p, .work-eyebrow', masks.ink, 500, 100, editorial, 'chapter');

let revealObserver;
function observeReveals() {
  if (reduced.matches || !('IntersectionObserver' in window)) {
    pending.forEach((_, element) => element.removeAttribute('data-motion-pending'));
    return;
  }
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const effect = pending.get(element);
      revealObserver.unobserve(element);
      if (!effect || seen.has(element)) return;
      seen.add(element);
      play(element, effect.frames, effect.duration, effect.delay, effect.easing, effect.id);
    });
  }, { threshold: .08, rootMargin: '0px 0px -6% 0px' });
  pending.forEach((_, element) => { if (!seen.has(element)) revealObserver.observe(element); });
}

// Entrance and depth use separate transform channels, avoiding competing effects.
const depth = ['.hero-portrait-wrap', '.hero-logo', '.hero-multi', '.hero-creative']
  .map(selector => document.querySelector(selector));
let heroVisible = true;
let heroEntered = false;
let frame = 0;
let lastTime = 0;
let bounds;
let scrollPosition = window.scrollY;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
// One bounded mobile clock: idle, scroll and touch replace the same translate
// values. The PNG's existing 14px underlap covers the maximum 9px upward depth.
const mobileDepth = { time: 0, last: 0, frames: 0, press: 0, targetPress: 0, contact: null, paused: false };
function suspendMobileDepth() {
  if (!mobile.matches) return;
  cancelAnimationFrame(frame);
  frame = 0;
  mobileDepth.last = 0;
  mobileDepth.targetPress = 0;
  mobileDepth.contact = null;
}
function updateMobileDepth(time) {
  if (mobileDepth.paused) { mobileDepth.last = 0; return; }
  const elapsed = mobileDepth.last ? Math.min(time - mobileDepth.last, 64) : 0;
  mobileDepth.last = time;
  mobileDepth.time += elapsed / 1000;
  mobileDepth.frames++;
  const t = mobileDepth.time;
  mobileDepth.press += (mobileDepth.targetPress - mobileDepth.press) * (1 - Math.exp(-elapsed / 110));
  const press = mobileDepth.press;
  const progress = Math.max(0, Math.min(1, (scrollPosition - bounds.top) / bounds.height));
  const values = [
    [2.2 * Math.sin(t * .31), 1.1 * (1 - Math.cos(t * .37)) - progress * 9 + press * 1.4],
    [1.3 * Math.sin(t * .29), Math.sin(t * .25) - progress * 2.4 + press * .35],
    [-1.4 * Math.sin(t * .27) - progress * 3.5, Math.sin(t * .23) - progress * 4.5],
    [1.2 * Math.sin(t * .33) + progress * 3, -.8 * Math.sin(t * .23) + progress * 3],
  ];
  depth.forEach((element, i) => {
    if (element) element.style.translate = `${values[i][0].toFixed(3)}px ${values[i][1].toFixed(3)}px`;
  });
  const lightX = 2 * Math.sin(t * .16);
  const lightY = 1.5 * Math.sin(t * .13) - progress * 2.5;
  hero.style.setProperty('--light-x', `${lightX.toFixed(3)}px`);
  hero.style.setProperty('--light-y', `${lightY.toFixed(3)}px`);
  const cover = 1 + 2 * Math.max(Math.abs(lightX) / bounds.width, Math.abs(lightY) / (bounds.height * .84)) + .002;
  hero.style.setProperty('--light-scale', cover.toFixed(5));
  requestDepth();
}
function measure() {
  if (!hero) return;
  const rect = hero.getBoundingClientRect();
  bounds = { left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
  scrollPosition = window.scrollY;
  requestDepth();
}
function requestDepth() {
  if (!frame && heroVisible && heroEntered && !reduced.matches && !document.hidden) {
    frame = requestAnimationFrame(updateDepth);
  }
}
function updateDepth(time) {
  frame = 0;
  if (!bounds || reduced.matches || !heroVisible || document.hidden) return;
  if (mobile.matches) { updateMobileDepth(time); return; }
  const blend = 1 - Math.exp(-Math.min(time - (lastTime || time - 16), 64) / 85);
  lastTime = time;
  const canPoint = desktopPointer.matches;
  if (!canPoint) pointer.x = pointer.y = 0;
  pointer.x += ((canPoint ? pointer.targetX : 0) - pointer.x) * blend;
  pointer.y += ((canPoint ? pointer.targetY : 0) - pointer.y) * blend;
  const progress = Math.max(0, Math.min(1, (scrollPosition - bounds.top) / bounds.height));
  const factor = mobile.matches ? .42 : 1;
  const values = [
    [-pointer.x * 7.5, -pointer.y * 5 - progress * 30 * factor],
    [pointer.x * 5, pointer.y * 2.2 - progress * 5 * factor],
    [-pointer.x * 3.4 - progress * 10 * factor, -progress * 9 * factor],
    [pointer.x * 4.5 + progress * 9 * factor, progress * 6 * factor],
  ];
  depth.forEach((element, i) => {
    if (element) element.style.translate = `${values[i][0].toFixed(3)}px ${values[i][1].toFixed(3)}px`;
  });
  const lightX = Number((pointer.x * 5).toFixed(2));
  const lightY = Number((pointer.y * 3 - progress * 5 * factor).toFixed(2));
  hero.style.setProperty('--light-x', `${lightX}px`);
  hero.style.setProperty('--light-y', `${lightY}px`);
  // Only overscan while moving, so the gradient cannot expose the hero's backing.
  const cover = lightX || lightY ? 1 + 2 * Math.max(Math.abs(lightX)/bounds.width, Math.abs(lightY)/(bounds.height * (mobile.matches ? .84 : 1))) + .002 : 1;
  hero.style.setProperty('--light-scale', cover.toFixed(5));
  hero.style.setProperty('--ink-angle', `${(pointer.x * -.18).toFixed(3)}deg`);
  hero.style.setProperty('--scratch-x', `${(pointer.x * -8).toFixed(2)}px`);
  if (Math.abs(pointer.x - pointer.targetX) + Math.abs(pointer.y - pointer.targetY) > .002 && canPoint) requestDepth();
}
hero?.addEventListener('pointermove', event => {
  if (!desktopPointer.matches || !bounds || reduced.matches) return;
  pointer.targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
  pointer.targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top + scrollPosition) / bounds.height * 2 - 1));
  requestDepth();
});
hero?.addEventListener('pointerleave', () => { pointer.targetX = pointer.targetY = 0; requestDepth(); });
window.addEventListener('scroll', () => { scrollPosition = window.scrollY; requestDepth(); }, { passive: true });
window.addEventListener('resize', measure, { passive: true });
desktopPointer.addEventListener('change', () => { pointer.targetX = pointer.targetY = 0; requestDepth(); });

// A short settle, never a gesture recognizer: touch scrolling stays native.
hero?.addEventListener('pointerdown', event => {
  if (!mobile.matches || reduced.matches || !heroEntered || event.isPrimary === false ||
      event.target.closest('a,button,input,select,textarea')) return;
  mobileDepth.contact = { id: event.pointerId, x: event.clientX, y: event.clientY };
  mobileDepth.targetPress = 1;
  requestDepth();
}, { passive: true });
window.addEventListener('pointermove', event => {
  const contact = mobileDepth.contact;
  if (contact?.id === event.pointerId && Math.hypot(event.clientX - contact.x, event.clientY - contact.y) > 8) {
    mobileDepth.targetPress = 0;
    mobileDepth.contact = null;
  }
}, { passive: true });
function releaseHeroPress() { mobileDepth.targetPress = 0; mobileDepth.contact = null; }
window.addEventListener('pointerup', releaseHeroPress, { passive: true });
window.addEventListener('pointercancel', releaseHeroPress, { passive: true });
mobile.addEventListener('change', () => {
  cancelAnimationFrame(frame); frame = 0; lastTime = 0;
  mobileDepth.last = 0;
  releaseHeroPress();
  // Discard the previous breakpoint's offsets before its own depth calculation.
  depth.forEach(element => element?.style.removeProperty('translate'));
  ['--light-x', '--light-y', '--light-scale', '--ink-angle', '--scratch-x'].forEach(property => hero?.style.removeProperty(property));
  measure();
});

async function enterHero() {
  if (!hero || reduced.matches) { heroEntered = true; return; }
  if (mobile.matches) { heroEntered = false; suspendMobileDepth(); }
  const entrants = hero.querySelectorAll('[data-reveal]:not([data-reveal="copy"]), .hero-manifesto strong, .logo-scratches i');
  entrants.forEach(element => element.setAttribute('data-motion-pending', ''));
  let timer;
  await Promise.race([
    Promise.allSettled([document.fonts.ready, hero.querySelector('img')?.decode()]),
    new Promise(resolve => { timer = setTimeout(resolve, 1800); }),
  ]);
  clearTimeout(timer);
  if (reduced.matches) { entrants.forEach(element => element.removeAttribute('data-motion-pending')); return; }
  hero.classList.add('hero-entering');
  const find = selector => hero.querySelector(selector);
  play(find('.site-header'), masks.ink, 360, 0, editorial, 'hero:nav');
  play(find('.hero-logo'), [
    { clipPath:'polygon(0 0,0 0,0 33%,0 33%,0 66%,0 66%,0 100%,0 100%)' },
    { clipPath:'polygon(0 0,100% 0,100% 33%,72% 33%,72% 66%,88% 66%,88% 100%,0 100%)' },
    { clipPath:'polygon(0 0,100% 0,100% 33%,100% 33%,100% 66%,100% 66%,100% 100%,0 100%)' },
  ], 1160, 80, editorial, 'hero:logo');
  play(find('.hero-multi'), masks.left, 950, 260, editorial, 'hero:multi');
  play(find('.hero-creative'), masks.right, 840, 500, editorial, 'hero:creative');
  const portrait = play(find('.hero-portrait-wrap'), [
    { opacity: 0, transform: `translateY(${mobile.matches ? 26 : 36}px) scale(${mobile.matches ? 1.03 : 1.035})` },
    { opacity: 1, transform: 'none' },
  ], 1120, 380, elegant, 'hero:portrait');
  hero.querySelectorAll('.hero-manifesto strong').forEach((element, index) => {
    play(element, masks.left, 560, 1010 + index * 120, editorial, `hero:copy-${index}`);
  });
  hero.querySelectorAll('[data-reveal="meta"]').forEach((element, index) => {
    play(element, masks.ink, 460, 1220 + index * 55, editorial, `hero:meta-${index}`);
  });
  hero.querySelectorAll('.logo-scratches i').forEach((element, index) => {
    play(element, masks.left, 300, 720 + index * 55, editorial, `hero:scratch-${index}`);
  });
  portrait?.finished.then(() => {
    heroEntered = true;
    hero.classList.remove('hero-entering');
    requestDepth();
  }).catch(() => {});
}

function stopMotion() {
  active.forEach(animation => animation.cancel());
  revealObserver?.disconnect();
  document.querySelectorAll('[data-motion-pending]').forEach(element => element.removeAttribute('data-motion-pending'));
  pending.forEach((_, element) => seen.add(element));
  hero?.classList.remove('hero-entering');
  heroEntered = true;
  cancelAnimationFrame(frame);
  frame = 0;
  mobileDepth.last = 0;
  mobileDepth.press = 0;
  releaseHeroPress();
  pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
  depth.forEach(element => element?.style.removeProperty('translate'));
  ['--light-x','--light-y','--light-scale','--ink-angle','--scratch-x'].forEach(p=>hero?.style.removeProperty(p));
}
reduced.addEventListener('change', () => {
  if (reduced.matches) stopMotion();
  else requestDepth();
});
document.addEventListener('visibilitychange', () => {
  active.forEach(animation => document.hidden ? animation.pause() : animation.play());
  document.body.classList.toggle('motion-suspended', document.hidden);
  if (document.hidden) suspendMobileDepth();
  if (!document.hidden) { lastTime = 0; requestDepth(); }
});
if (hero && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    hero.classList.toggle('hero-is-visible', heroVisible);
    if (!heroVisible) suspendMobileDepth();
    if (heroVisible) requestDepth();
  }).observe(hero);
}
// Read/replay hooks for local review; no production controls or layout changes.
window.mikkunMobileHero = {
  get state() { return { mobile: mobile.matches, reduced: reduced.matches, visible: heroVisible,
    hidden: document.hidden, paused: mobileDepth.paused, entered: heroEntered,
    time: mobileDepth.time, frames: mobileDepth.frames, press: mobileDepth.press, scheduled: !!frame }; },
  setPaused(paused) {
    mobileDepth.paused = !!paused;
    if (paused) suspendMobileDepth();
    else { mobileDepth.last = 0; requestDepth(); }
  },
  replay() {
    if (!mobile.matches) return;
    active.forEach(animation => { if (animation.id.startsWith('hero:')) animation.cancel(); });
    depth.forEach(element => element?.style.removeProperty('translate'));
    ['--light-x', '--light-y', '--light-scale'].forEach(property => hero?.style.removeProperty(property));
    mobileDepth.time = mobileDepth.last = mobileDepth.press = 0;
    mobileDepth.paused = false;
    releaseHeroPress();
    enterHero();
  },
};
measure();
observeReveals();
enterHero();
