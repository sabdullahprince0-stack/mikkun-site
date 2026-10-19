const body = document.body;
window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => body.classList.add('is-ready')));

const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  mobileMenu.hidden = open;
});
mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileMenu.hidden = true;
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const hero = document.querySelector('.hero');
const portrait = document.querySelector('.hero-portrait-wrap');
const logo = document.querySelector('.hero-logo');
const multi = document.querySelector('.hero-multi');
const creative = document.querySelector('.hero-creative');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer:fine)').matches;

if (finePointer && !reduced && hero && portrait && logo) {
  hero.addEventListener('pointermove', (event) => {
    const r = hero.getBoundingClientRect();
    const nx = (event.clientX - r.left) / r.width - .5;
    const ny = (event.clientY - r.top) / r.height - .5;
    portrait.style.translate = `${nx * -5}px ${ny * -3}px`;
    logo.style.translate = `${nx * 2.2}px ${ny * 1.4}px`;
  });
  hero.addEventListener('pointerleave', () => {
    portrait.style.translate = '';
    logo.style.translate = '';
  });
}

if (!reduced) {
  let ticking = false;
  const updateScroll = () => {
    const y = Math.min(window.scrollY, window.innerHeight);
    const mobile = window.innerWidth <= 760;
    if (portrait) portrait.style.setProperty('--scroll-y', `${y * (mobile ? -.012 : -.026)}px`);
    if (multi) multi.style.translate = `${y * (mobile ? -.006 : -.013)}px 0`;
    if (creative) creative.style.translate = `${y * (mobile ? .006 : .013)}px 0`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScroll);
  }, {passive:true});
}