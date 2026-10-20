const button = document.querySelector('.case-menu-toggle');
const menu = document.querySelector('#case-menu');
const close = (focus = false) => {
  menu.hidden = true;
  button.setAttribute('aria-expanded', 'false');
  if (focus) button.focus();
};
button.addEventListener('click', () => {
  const expanded = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(expanded));
  menu.hidden = !expanded;
  if (expanded) menu.querySelector('a')?.focus({preventScroll:true});
});
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => close()));
document.addEventListener('keydown', e => { if (e.key === 'Escape') close(!menu.hidden); });
document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) close(); });
matchMedia('(min-width:761px)').addEventListener('change', e => { if (e.matches) close(); });

// Keep final geometry in CSS: only composite opacity, transforms and masks.
// Content remains visible when scripting is unavailable or motion is reduced.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set();
const seen = new WeakSet();
const isLuxury = document.body.classList.contains('haniyah');
const isVenue = document.body.classList.contains('dbasement');
const easing = isLuxury ? 'cubic-bezier(.2,.58,.22,1)' : 'cubic-bezier(.22,.72,.18,1)';
function reveal(el) {
  if (seen.has(el)) return;
  seen.add(el);
  if (reduced.matches) return;
  const title = el.dataset.enter === 'title';
  const image = el.dataset.enter === 'image';
  const frames = title ? isLuxury ? [
    {opacity:1,clipPath:'inset(100% 0 0 0)',translate:'0 14px'},
    {opacity:1,clipPath:'inset(-10% -10% -10% -10%)',translate:'0 0'},
  ] : isVenue ? [
    {opacity:1,clipPath:'inset(0 100% 0 0)',translate:'-5px 0'},
    {opacity:1,clipPath:'inset(-10% -10% -10% -10%)',translate:'0 0'},
  ] : [
    {opacity:0, clipPath:'inset(0 100% 0 0)', translate:'0 8px'},
    {opacity:1, clipPath:'inset(-10% -10% -10% -10%)', translate:'0 0'},
  ] : image ? document.body.classList.contains('woodstones') ? [
    {opacity:1,clipPath:'inset(0 100% 0 0)',translate:'0 0'},
    {opacity:1,clipPath:'inset(0 0 0 0)',translate:'0 0'},
  ] : [
    {opacity:0, clipPath:'inset(0 0 100% 0)', translate:isVenue?'-8px 8px':'0 14px'},
    {opacity:1, clipPath:'inset(-12% -12% -12% -12%)', translate:'0 0'},
  ] : [{opacity:0, translate:'0 8px'},{opacity:1, translate:'0 0'}];
  const animation = el.animate(frames,{duration:isLuxury?1150:isVenue?480:800,easing,fill:'both'});
  animations.add(animation);
  animation.finished.then(()=>animation.cancel()).catch(()=>{}).finally(()=>animations.delete(animation));
}
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
}, {threshold:.08,rootMargin:'0px 0px -20px 0px'});
document.querySelectorAll('[data-enter]').forEach(el => observer.observe(el));
reduced.addEventListener('change', () => { if (reduced.matches) { animations.forEach(a=>a.cancel()); animations.clear(); } });
