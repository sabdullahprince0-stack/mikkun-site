(() => {
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const entries=new Map();
  const players=new Set();
  let full=null;
  function stopPreview(el){
    const e=entries.get(el);if(!e)return;
    clearTimeout(e.timer);e.ticket++;
    if(e.preview){e.preview.pause();e.preview.classList.remove('is-playing');if(e.preview.hasAttribute('src')){e.preview.removeAttribute('src');e.preview.load();}}
  }
  function stopAll(except){
    entries.forEach((_,el)=>stopPreview(el));
    players.forEach(v=>{if(v!==except)v.pause();});
  }
  function register(v){
    players.add(v);
    v.addEventListener('play',()=>{stopAll(v);full=v;});
    v.addEventListener('pause',()=>{if(full===v)full=null;});
    v.addEventListener('ended',()=>{if(full===v)full=null;});
  }
  function attach(el){
    const image=el.querySelector('img'),caption=el.querySelector('figcaption');
    const e={timer:0,ticket:0,preview:null,video:null};entries.set(el,e);
    el.classList.add('portfolio-media');el.tabIndex=-1;el.setAttribute('role','group');
    el.setAttribute('aria-label',image.alt);
    const button=document.createElement('button');button.type='button';button.className='portfolio-media__toggle';
    button.textContent='▶ PLAY';button.setAttribute('aria-label','Play with sound: '+image.alt);button.setAttribute('aria-pressed','false');
    el.append(button);e.button=button;
    if(caption){
      const measure=()=>el.style.setProperty('--media-caption',caption.offsetHeight+'px');
      new ResizeObserver(measure).observe(caption);measure();
    }
    button.addEventListener('click',event=>{event.stopPropagation();toggle(el);});
    // Native video controls own their pointer and keyboard events.
    el.addEventListener('keydown',event=>{
      if(event.target!==button&&event.target!==e.video)return;
      if(event.key.toLowerCase()==='k'){event.preventDefault();toggle(el);}
    });
    const status=document.createElement('span');status.className='portfolio-media__status';status.setAttribute('role','status');el.append(status);e.status=status;
  }
  function toggle(el){
    const e=entries.get(el);if(!e)return;
    stopPreview(el);
    if(!e.video){
      const v=document.createElement('video');v.className='portfolio-media__video';v.controls=true;v.playsInline=true;v.preload='none';
      v.poster=el.querySelector('img').src;v.src=el.dataset.videoSrc;v.setAttribute('aria-label',el.querySelector('img').alt);
      v.addEventListener('click',event=>event.stopPropagation());
      v.addEventListener('play',()=>{el.classList.add('is-video-active');el.dataset.cursor='PAUSE';e.button.textContent='Ⅱ PAUSE';e.button.setAttribute('aria-label','Pause video');e.button.setAttribute('aria-pressed','true');e.status.textContent=v.muted?'Playing muted':'Playing with sound';});
      v.addEventListener('pause',()=>{el.dataset.cursor='PLAY';e.button.textContent='▶ PLAY';e.button.setAttribute('aria-label','Resume with sound');e.button.setAttribute('aria-pressed','false');e.status.textContent='Paused';});
      v.addEventListener('ended',()=>{el.classList.remove('is-video-active');v.currentTime=0;e.status.textContent='Video ended';});
      v.addEventListener('error',()=>{e.status.textContent='Video could not load. Press Play to retry.';el.classList.remove('is-video-active');});
      register(v);el.append(v);e.video=v;
    }
    if(!e.video.paused){e.video.pause();return;}
    stopAll(e.video);
    e.video.play().catch(()=>{e.status.textContent='Playback paused. Press Play to try again.';});
  }
  function preview(el,delay=160){
    const e=entries.get(el);if(!e||reduce.matches||navigator.connection?.saveData||/2g/.test(navigator.connection?.effectiveType||'')||full&&!full.paused||el.classList.contains('is-video-active'))return;
    stopPreview(el);const ticket=e.ticket;
    e.timer=setTimeout(()=>{
      if(ticket!==e.ticket||reduce.matches||full&&!full.paused)return;
      entries.forEach((_,other)=>{if(other!==el)stopPreview(other);});
      if(!e.preview){
        const v=document.createElement('video');v.className='motion-preview';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.preload='none';v.loop=true;v.tabIndex=-1;v.setAttribute('aria-hidden','true');v.src=el.dataset.videoSrc;
        v.addEventListener('timeupdate',()=>{if(v.currentTime>=6)v.currentTime=0;});
        v.addEventListener('error',()=>v.classList.remove('is-playing'));el.append(v);e.preview=v;
      }
      if(!e.preview.hasAttribute('src'))e.preview.src=el.dataset.videoSrc;
      e.preview.play().then(()=>{if(ticket===e.ticket&&!e.preview.paused)e.preview.classList.add('is-playing');else{e.preview.pause();if(e.preview.readyState)e.preview.currentTime=0;}}).catch(()=>{});
    },delay);
  }
  addEventListener('pagehide',()=>stopAll());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});
  // Stop sound as soon as an ordinary page navigation is intentionally activated.
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[href]');
    if(a&&!a.target&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0){const u=new URL(a.href,location.href);if(u.pathname!==location.pathname||u.origin!==location.origin)stopAll();}
  },true);
  reduce.addEventListener('change',()=>{if(reduce.matches)entries.forEach((_,el)=>stopPreview(el));});
  window.mikkunMedia={attach,toggle,preview,stopPreview,register,stopAll};
})();
