(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(min-width:761px) and (hover:hover) and (pointer:fine)');
  const small = matchMedia('(max-width:760px)');
  const home = !document.body.classList.contains('case-page');
  const luxury = document.body.classList.contains('haniyah');
  const venue = document.body.classList.contains('dbasement');
  const archive = document.body.classList.contains('archive-page');
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const ease = luxury ? 'cubic-bezier(.18,.55,.2,1)' : 'cubic-bezier(.18,.76,.2,1)';
  const active = new Set();
  let frames = 0;
  function animate(el,keyframes,options) {
    if (reduce.matches) return null;
    const a=el.animate(keyframes,{easing:ease,...options});
    a.id='interaction:'+ (options.id||el.className);
    active.add(a);
    a.finished.catch(()=>{}).finally(()=>active.delete(a));
    return a;
  }
  // The native cursor stays intact. This label supplements links and inspectable art.
  const cursor=document.createElement('div');cursor.className='motion-cursor';cursor.setAttribute('aria-hidden','true');cursor.innerHTML='<span></span>';document.body.append(cursor);
  cursor.dataset.tone=luxury?'luxury':'editorial';
  let cursorRAF=0,cursorX=-200,cursorY=-200;
  function placeCursor(){cursorRAF=0;frames++;const x=cursorX>innerWidth-190?cursorX-170:cursorX+20,y=cursorY>innerHeight-65?cursorY-42:cursorY+22;cursor.style.transform=`translate(${x}px,${y}px)`;}
  document.addEventListener('pointermove',e=>{
    if(!fine.matches||reduce.matches||dialog.open)return;
    cursorX=e.clientX;cursorY=e.clientY;
    const target=e.target.closest('[data-cursor]');
    cursor.classList.toggle('is-visible',!!target);
    if(target)cursor.firstChild.textContent=target.dataset.cursor;
    if(!cursorRAF&&target)cursorRAF=requestAnimationFrame(placeCursor);
  },{passive:true});
  document.addEventListener('pointerdown',()=>cursor.classList.add('is-down'),{passive:true});
  document.addEventListener('pointerup',()=>cursor.classList.remove('is-down'),{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>cursor.classList.remove('is-visible'));
  document.addEventListener('keydown',e=>{if(e.key==='Tab')cursor.classList.remove('is-visible');});

  const targets=[...document.querySelectorAll('.project-art,.quest-card,.visual:not(.wood-logo)')];
  const visibleTargets=new Set();
  const geometries=new WeakMap();
  let tracking=null,trackingRAF=0,pointerX=0,pointerY=0;
  function register(el){const rect=el.getBoundingClientRect();geometries.set(el,rect);return rect;}
  function track(){
    trackingRAF=0;frames++;
    if(!tracking||reduce.matches||!fine.matches)return;
    const el=tracking,r=geometries.get(el);if(!r?.width)return;
    const x=clamp((pointerX-r.left)/r.width,0,1),y=clamp((pointerY-r.top)/r.height,0,1);
    const tone=el.dataset.motionTone;
    const strength=tone==='venue'?6:tone==='archive'?8:tone==='luxury'?3:4;
    el.style.setProperty('--ix',`${((x-.5)*strength*2).toFixed(2)}px`);
    el.style.setProperty('--iy',`${((y-.5)*strength-3).toFixed(2)}px`);
    el.style.setProperty('--ir',`${((x-.5)*(tone==='archive'?3:tone==='venue'?1.8:.25)).toFixed(2)}deg`);
    el.style.setProperty('--mx',`${(x*100).toFixed(1)}%`);el.style.setProperty('--my',`${(y*100).toFixed(1)}%`);
  }
  function release(el){
    el.classList.remove('is-tracking','is-pressed');
    ['--ix','--iy','--ir'].forEach(p=>el.style.removeProperty(p));
    if(tracking===el)tracking=null;
    el.closest('.db-wall')?.style.removeProperty('--paper-pressure');
    stopPreview(el);
  }
  targets.forEach((el,i)=>{
    el.classList.add('motion-target');el.dataset.motionIndex=i;
    el.dataset.motionTone=venue||el.closest('.project-dbasement')?'venue':luxury||el.closest('.project-haniyah')?'luxury':archive||el.matches('.quest-card')?'archive':'architecture';
    if(el.matches('.project-art,.quest-card'))el.dataset.cursor='VIEW PROJECT ↗';
    else if(el.closest('a'))el.dataset.cursor='VISIT WEBSITE ↗';
    if(el.closest('.woodstones,.project-woodstones')){const grid=document.createElement('span');grid.className='motion-measure';grid.setAttribute('aria-hidden','true');el.append(grid);}
    el.addEventListener('pointerenter',e=>{
      if(!fine.matches||reduce.matches)return;
      register(el);tracking=el;pointerX=e.clientX;pointerY=e.clientY;el.classList.add('is-tracking');
      if(el.dataset.motionTone==='venue')animate(el,[{translate:'-2px 1px'},{translate:'2px -2px'},{translate:'0px 0px'}],{duration:170,easing:'steps(2,end)',id:'poster-register'});
      el.closest('.db-wall')?.style.setProperty('--paper-pressure','.045');
      if(!trackingRAF)trackingRAF=requestAnimationFrame(track);
    });
    el.addEventListener('pointermove',e=>{if(!fine.matches||reduce.matches)return;if(tracking!==el){register(el);tracking=el;el.classList.add('is-tracking');}pointerX=e.clientX;pointerY=e.clientY;if(!trackingRAF)trackingRAF=requestAnimationFrame(track);},{passive:true});
    el.addEventListener('pointerleave',()=>release(el));
    el.addEventListener('pointerdown',e=>{
      if(reduce.matches)return;el.classList.add('is-pressed');
      if(e.pointerType!=='mouse'){const r=register(el);el.style.setProperty('--mx',`${(e.clientX-r.left)/r.width*100}%`);el.style.setProperty('--my',`${(e.clientY-r.top)/r.height*100}%`);}
    },{passive:true});
    el.addEventListener('pointerup',()=>{el.classList.remove('is-pressed');if(!fine.matches&&!reduce.matches)animate(el,[{scale:'.987'},{scale:'1.008'},{scale:'1'}],{duration:420,id:'paper-release'});},{passive:true});
    el.addEventListener('pointercancel',()=>release(el),{passive:true});
    el.addEventListener('focus',()=>{if(!reduce.matches&&el.matches(':focus-visible')){el.classList.add('is-tracking');el.style.setProperty('--iy','-3px');}});
    el.addEventListener('blur',()=>release(el));
  });

  // Restrained magnetism on navigation. No hit-target moves more than five pixels.
  const magnets=[...document.querySelectorAll('.desktop-nav a,.case-nav a,.project-link,.home-link,.back-home,.side-quest-enter,.scroll-enter,.scroll-enter-mobile,.text-link,.brand,.case-brand')];
  magnets.forEach(el=>{
    el.classList.add('motion-magnet');let rect;
    el.addEventListener('pointerenter',()=>{if(fine.matches&&!reduce.matches)rect=el.getBoundingClientRect();});
    el.addEventListener('pointermove',e=>{if(!rect||!fine.matches||reduce.matches)return;el.style.setProperty('--mag-x',`${clamp((e.clientX-rect.left-rect.width/2)*.15,-5,5)}px`);el.style.setProperty('--mag-y',`${clamp((e.clientY-rect.top-rect.height/2)*.18,-4,4)}px`);},{passive:true});
    el.addEventListener('pointerleave',()=>{el.style.removeProperty('--mag-x');el.style.removeProperty('--mag-y');rect=null;});
  });
  document.querySelectorAll('.next-project').forEach(el=>el.dataset.cursor='NEXT PROJECT ↗');
  document.querySelectorAll('.back-home').forEach(el=>el.dataset.cursor='BACK TO WORK ↖');

  // A quiet reading edge and typographic counterweight; no permanent rAF loop.
  const progress=document.createElement('div');progress.className='motion-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
  const chapters=[...document.querySelectorAll('.manifesto h2,.work-title,.about h2,.contact h2,.case-section>h2')];
  chapters.forEach(el=>el.classList.add('motion-chapter'));
  const visibleChapters=new Set();let scrollRAF=0,pageHeight=document.documentElement.scrollHeight;
  const io=new IntersectionObserver(entries=>{for(const e of entries){const set=e.target.matches('.motion-chapter')?visibleChapters:visibleTargets;if(e.isIntersecting)set.add(e.target);else{set.delete(e.target);if(set===visibleTargets)e.target.style.removeProperty('--drift');}}requestScroll();},{rootMargin:'80px 0px',threshold:0});
  [...targets,...chapters].forEach(el=>io.observe(el));
  function requestScroll(){if(!scrollRAF&&!reduce.matches&&!document.hidden)scrollRAF=requestAnimationFrame(scrollFrame);}
  function scrollFrame(){
    scrollRAF=0;frames++;if(reduce.matches||document.hidden)return;
    const h=innerHeight, y=scrollY;
    progress.style.setProperty('--reading',clamp(y/Math.max(1,pageHeight-h),0,1));
    const readings=[...visibleChapters].map(el=>({el,r:el.getBoundingClientRect()}));
    const images=small.matches?[...visibleTargets].filter(el=>!el.matches('.project-art')).map(el=>({el,r:el.getBoundingClientRect()})):[];
    for(const {el,r} of readings){const p=clamp((r.top+r.height/2-h/2)/h,-1,1);el.style.setProperty('--chapter-x',`${(p*(luxury?3:small.matches?3:7)).toFixed(2)}px`);}
    for(const {el,r} of images){const p=clamp((r.top+r.height/2-h/2)/h,-1,1);const sign=Number(el.dataset.motionIndex)%2?1:-1;el.style.setProperty('--drift',`${(p*(archive?8:venue?5:luxury?3:4)*sign).toFixed(2)}px`);}
  }
  addEventListener('scroll',()=>{cursor.classList.remove('is-visible');if(tracking)release(tracking);requestScroll();},{passive:true});
  addEventListener('resize',()=>{pageHeight=document.documentElement.scrollHeight;tracking=null;requestScroll();},{passive:true});
  document.fonts.ready.then(()=>{pageHeight=document.documentElement.scrollHeight;requestScroll();});

  // Inspect a photograph or poster as an object, without pretending archive stills play.
  const dialog=document.createElement('dialog');dialog.className='motion-gallery';dialog.setAttribute('aria-label','Image inspection');dialog.dataset.tone=luxury?'luxury':'editorial';
  dialog.innerHTML='<div class="motion-gallery__bar"><span class="motion-gallery__count"></span><button type="button" class="motion-gallery__close">CLOSE ×</button></div><div class="motion-gallery__stage"><img alt=""><video class="motion-gallery__video" controls playsinline preload="metadata" hidden aria-label="Video player"></video><button type="button" class="motion-gallery__play" hidden>▶ PLAY WITH SOUND</button></div><div class="motion-gallery__footer"><div class="motion-gallery__caption" aria-live="polite"></div><div class="motion-gallery__nav"><button type="button" data-step="-1" aria-label="Previous image">← PREV</button><button type="button" data-step="1" aria-label="Next image">NEXT →</button></div></div>';
  document.body.append(dialog);
  const gallery=[...document.querySelectorAll('.visual:not(.wood-logo)')].filter(el=>!el.closest('a'));
  let galleryIndex=0,invoker=null,lockedY=0;
  const player=dialog.querySelector('video');
  const playControl=dialog.querySelector('.motion-gallery__play');
  playControl.addEventListener('click',()=>{playControl.disabled=true;player.play().then(()=>{playControl.hidden=true;}).catch(()=>{}).finally(()=>{playControl.disabled=false;});});
  player.addEventListener('play',()=>{playControl.hidden=true;});
  player.addEventListener('pause',()=>{if(!player.hidden&&dialog.open)playControl.hidden=false;});
  const videos=['boxturtle.mp4','creeplive.mp4','mindovermatter.mp4','panalangin.mp4'];
  document.querySelectorAll('.music-card').forEach((el,i)=>{if(videos[i])el.dataset.videoSrc='assets/videos/web/'+videos[i];});
  document.querySelectorAll('.db-motion .motion-still').forEach(el=>{el.dataset.videoSrc='assets/videos/web/panalangin.mp4';});
  function stopPreview(el){window.mikkunMedia?.stopPreview(el);}
  function preview(el,delay=160){if(!dialog.open)window.mikkunMedia?.preview(el,delay);}
  window.mikkunMedia?.register(player);
  const display=()=>{
    const source=gallery[galleryIndex].querySelector('img');
    const image=dialog.querySelector('img'),videoSrc=gallery[galleryIndex].dataset.videoSrc;
    player.pause();player.removeAttribute('src');player.load();player.hidden=!videoSrc;image.hidden=!!videoSrc;playControl.hidden=!videoSrc;playControl.disabled=false;
    image.src=source.currentSrc||source.src;image.alt=source.alt;
    if(videoSrc){player.poster=source.currentSrc||source.src;player.src=videoSrc;player.muted=false;player.setAttribute('aria-label',source.alt);}
    dialog.querySelector('.motion-gallery__caption').textContent=source.alt;
    dialog.querySelector('.motion-gallery__count').textContent=`${String(galleryIndex+1).padStart(2,'0')} / ${String(gallery.length).padStart(2,'0')} — ${videoSrc?'VIDEO':'IMAGE'} ARCHIVE`;
  };
  function openImage(el){
    galleryIndex=gallery.indexOf(el);invoker=el;lockedY=scrollY;window.mikkunMedia?.stopAll();display();cursor.classList.remove('is-visible');release(el);
    dialog.showModal();document.documentElement.style.overflow='hidden';
    animate(dialog.querySelector('.motion-gallery__stage'),[{clipPath:'inset(0 0 100% 0)',opacity:.4},{clipPath:'inset(0)',opacity:1}],{duration:luxury?850:venue?300:550,id:'gallery-aperture'});
    dialog.querySelector('.motion-gallery__close').focus({preventScroll:true});
  }
  gallery.forEach(el=>{
    const hasVideo=!!el.dataset.videoSrc;
    el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',(hasVideo?'Open video: ':'Inspect image: ')+el.querySelector('img').alt);el.classList.add('motion-inspect');el.dataset.cursor=hasVideo?'PLAY ↗':'INSPECT ↗';
    if(hasVideo){window.mikkunMedia?.attach(el);el.addEventListener('pointerenter',()=>{if(fine.matches)preview(el);});el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')preview(el,240);},{passive:true});el.addEventListener('pointerup',()=>stopPreview(el),{passive:true});el.addEventListener('pointercancel',()=>stopPreview(el),{passive:true});}
    el.addEventListener('click',e=>{if(e.target.closest('video,button'))return;if(hasVideo)window.mikkunMedia.toggle(el);else openImage(el);});
    el.addEventListener('keydown',e=>{if(e.target!==el)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();if(hasVideo)window.mikkunMedia.toggle(el);else openImage(el);}});
  });
  function step(n){galleryIndex=(galleryIndex+n+gallery.length)%gallery.length;display();animate(player.hidden?dialog.querySelector('img'):player,[{opacity:0,translate:`${n*16}px 0`},{opacity:1,translate:'0 0'}],{duration:luxury?600:280,id:'gallery-turn'});}
  dialog.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>step(Number(b.dataset.step))));
  dialog.querySelector('.motion-gallery__close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('keydown',e=>{if(e.target===player)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();step(e.key==='ArrowLeft'?-1:1);}});
  dialog.addEventListener('close',()=>{player.pause();player.removeAttribute('src');player.load();document.documentElement.style.removeProperty('overflow');scrollTo({top:lockedY,behavior:'instant'});invoker?.focus({preventScroll:true});});

  // Page-turn shutters work with ordinary URLs, history, modified clicks and bfcache.
  const route=document.createElement('div');route.className='motion-route';route.setAttribute('aria-hidden','true');route.innerHTML='<i class="motion-route__red"></i><i class="motion-route__paper"></i><i class="motion-route__ink"></i><span class="motion-route__caption"></span>';document.body.append(route);
  let departing=false;
  const names={'woodstones.html':['WOODSTONES','architecture'],'dbasement.html':['D’BASEMENT','venue'],'haniyah.html':['HANIYAH','luxury'],'side-quests.html':['SIDE QUESTS','archive'],'index.html':['MIKKUN','editorial'],'':['MIKKUN','editorial']};
  function clearRoute(){route.classList.remove('is-active');route.getAnimations({subtree:true}).forEach(a=>a.cancel());departing=false;}
  function arrival(){
    let saved;try{saved=JSON.parse(sessionStorage.getItem('mikkun:arrival'));sessionStorage.removeItem('mikkun:arrival');}catch{}
    if(!saved||Date.now()-saved.time>15000||saved.path!==location.pathname||reduce.matches)return;
    route.classList.add('is-active');route.dataset.personality=saved.personality;route.querySelector('.motion-route__caption').textContent=saved.title;
    const sheets=[...route.querySelectorAll('i')];
    sheets.forEach(el=>el.style.transformOrigin='top');
    const duration=saved.personality==='luxury'?800:saved.personality==='venue'?360:580;
    sheets.forEach((el,i)=>animate(el,[{transform:'scaleY(1)'},{transform:'scaleY(0)'}],{duration,delay:(2-i)*60,fill:'both',id:'arrival-sheet'}));
    const caption=route.querySelector('.motion-route__caption');animate(caption,[{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -24px'}],{duration:duration*.7,fill:'both',id:'arrival-title'});
    setTimeout(clearRoute,duration+150);
  }
  document.addEventListener('click',async e=>{
    const link=e.target.closest('a[href]');
    if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey||link.target||link.hasAttribute('download')||reduce.matches)return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin||url.pathname===location.pathname||(!url.pathname.endsWith('.html')&&!url.pathname.endsWith('/')))return;
    if(url.pathname.endsWith('/index.html')&&location.pathname.endsWith('/')&&url.hash)return;
    const key=url.pathname.split('/').pop();if(!(key in names))return;
    e.preventDefault();if(departing)return;departing=true;
    const [title,personality]=names[key];
    route.dataset.personality=personality;route.querySelector('.motion-route__caption').textContent=title;route.classList.add('is-active');cursor.classList.remove('is-visible');
    try{sessionStorage.setItem('mikkun:arrival',JSON.stringify({path:url.pathname,title,personality,time:Date.now()}));}catch{}
    const duration=personality==='luxury'?560:personality==='venue'?280:410;
    const sheets=[...route.querySelectorAll('i')];sheets.forEach(el=>el.style.transformOrigin='bottom');
    const animations=sheets.map((el,i)=>animate(el,[{transform:'scaleY(0)'},{transform:'scaleY(1)'}],{duration,delay:i*45,fill:'both',id:'departure-sheet'}));
    animate(route.querySelector('.motion-route__caption'),[{opacity:0,translate:'0 25px'},{opacity:1,translate:'0 0'}],{duration:220,delay:duration*.6,fill:'both',id:'departure-title'});
    // Navigation still completes if a media preference changes during the shutter.
    await Promise.race([Promise.allSettled(animations.filter(Boolean).map(a=>a.finished)),new Promise(r=>setTimeout(r,900))]);
    location.assign(url.href);
  });
  addEventListener('pageshow',e=>{if(e.persisted)clearRoute();});
  addEventListener('pagehide',()=>{cursor.classList.remove('is-visible');});
  arrival();
  function reset(){
    active.forEach(a=>a.cancel());active.clear();clearRoute();cursor.classList.remove('is-visible');
    targets.forEach(el=>{release(el);el.style.removeProperty('--drift');});
    magnets.forEach(el=>{el.style.removeProperty('--mag-x');el.style.removeProperty('--mag-y');});
    chapters.forEach(el=>el.style.removeProperty('--chapter-x'));
    cancelAnimationFrame(scrollRAF);cancelAnimationFrame(trackingRAF);cancelAnimationFrame(cursorRAF);scrollRAF=trackingRAF=cursorRAF=0;
  }
  reduce.addEventListener('change',()=>{if(reduce.matches)reset();else requestScroll();});
  fine.addEventListener('change',()=>{cursor.classList.remove('is-visible');targets.forEach(release);});
  document.addEventListener('visibilitychange',()=>{active.forEach(a=>document.hidden?a.pause():a.play());if(document.hidden){cursor.classList.remove('is-visible');targets.forEach(release);}else requestScroll();});
  // Local replay tooling can inspect activity without creating a production UI.
  window.mikkunInteractions={get state(){return {frames,active:active.size,visibleTargets:visibleTargets.size,cursor:cursor.classList.contains('is-visible'),galleryOpen:dialog.open,departing,reduced:reduce.matches,finePointer:fine.matches};},reset};
})();
