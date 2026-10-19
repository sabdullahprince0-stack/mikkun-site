import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const output = path.resolve('.local-review/motion');
await mkdir(output, { recursive: true });
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--disable-lcd-text', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9224',
  `--user-data-dir=${path.join(output, 'chrome-profile')}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let socket;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    try { target = (await (await fetch('http://127.0.0.1:9224/json')).json()).find(t => t.type === 'page'); } catch {}
    if (!target) await sleep(100);
  }
  if (!target) throw new Error('Chrome debugging endpoint unavailable.');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    const callbacks = pending.get(message.id);
    if (callbacks) {
      pending.delete(message.id);
      message.error ? callbacks.reject(new Error(message.error.message)) : callbacks.resolve(message.result);
    }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 150; i++) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  const screenshot = async filename => {
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64'));
  };
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Animation.enable');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__motionCLS = 0;
    window.__motionFrames = 0;
    const originalRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => originalRAF(time => { window.__motionFrames++; callback(time); });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__motionCLS += entry.value;
    }).observe({type:'layout-shift', buffered:true});
  ` });
  const report = [];
  for (const width of [1486, 390]) {
    const height = width === 390 ? 844 : 900;
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width === 390 });
    await call('Emulation.setTouchEmulationEnabled', { enabled: width === 390 });
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    // Freeze animation time while still allowing fonts, images, rAF and IO to run.
    await call('Animation.setPlaybackRate', { playbackRate: 0 });
    await call('Page.navigate', { url: 'http://127.0.0.1:4173/' });
    await waitFor("document.getAnimations().some(a => a.id === 'hero:portrait')");
    // Freezing navigation can also freeze its initial UA link-color transition.
    await evaluate("document.getAnimations().filter(a => a instanceof CSSTransition).forEach(a => a.finish()); true");
    const entrance = await evaluate(`document.getAnimations().filter(a => a.id.startsWith('hero:')).map(a => ({
      id:a.id, timing:a.effect.getTiming(), frames:a.effect.getKeyframes()
    }))`);
    await evaluate("window.__heroReview = document.getAnimations().filter(a => a.id.startsWith('hero:')); window.__heroReview.forEach(a => a.pause()); true");
    for (const time of [0, 240, 520, 900, 1450, 2000]) {
      await evaluate(`window.__heroReview.forEach(a => { a.currentTime = ${time}; }); true`);
      await screenshot(`${width}-hero-${time}.png`);
    }
    const gradient = await evaluate(`(() => {
      const animation=document.getAnimations().find(a=>a.animationName?.startsWith('gradient-bloom'));
      animation.pause(); animation.currentTime=${width === 390 ? 12000 : 9000};
      const style=getComputedStyle(document.querySelector('.hero-gradient'),'::after');
      return {opacity:style.opacity,transform:style.transform,duration:animation.effect.getTiming().duration};
    })()`);
    await screenshot(`${width}-gradient-bloom.png`);
    await evaluate("document.getAnimations().filter(a=>a.animationName?.startsWith('gradient-bloom')).forEach(a=>a.currentTime=0); true");
    const sections = [];
    for (const [scene, selector] of [
      ['woodstones', '.project-woodstones .project-art'],
      ['dbasement', '.project-dbasement .project-art'],
      ['haniyah', '.project-haniyah .project-art'],
      ['about', '.about-photo'], ['quests', '.quest-card'], ['contact', '.contact h2'],
    ]) {
      const scroll = await evaluate(`(() => {
        const node = document.querySelector('${selector}');
        const box = node.getBoundingClientRect();
        window.scrollTo({top:Math.max(0, window.scrollY + box.top - ${Math.round(height * .24)}),behavior:'instant'});
        return true;
      })()`);
      await waitFor(`document.getAnimations().some(a => a.id.startsWith('${scene}:'))`);
      // IO may deliver tall artwork and short text in adjacent rendering frames.
      await sleep(150);
      const effects = await evaluate(`document.getAnimations().filter(a => a.id.startsWith('${scene}:')).map(a => ({id:a.id,timing:a.effect.getTiming()}))`);
      await evaluate(`window.__sectionReview = document.getAnimations().filter(a => a.id.startsWith('${scene}:')); window.__sectionReview.forEach(a => a.pause()); true`);
      for (const time of [150, 450, 1500]) {
        await evaluate(`window.__sectionReview.forEach(a => { a.currentTime = ${time}; }); true`);
        await screenshot(`${width}-${scene}-${time}.png`);
      }
      const nodes = await evaluate(`(() => {
        const selector = '${scene}' === 'woodstones' || '${scene}' === 'dbasement' || '${scene}' === 'haniyah'
          ? '.project-${scene} [data-motion-pending], .project-${scene} h3, .project-${scene} .project-description'
          : '${selector}';
        return [...document.querySelectorAll(selector)].map(el=>({name:el.className,opacity:getComputedStyle(el).opacity,clip:getComputedStyle(el).clipPath,pending:el.hasAttribute('data-motion-pending'),box:el.getBoundingClientRect().toJSON()}));
      })()`);
      sections.push({ scene, effects, scroll, nodes });
    }
    // Now run the real timeline to completion and exercise the interaction loop.
    await call('Animation.setPlaybackRate', { playbackRate: 1 });
    await call('Page.navigate', { url: 'http://127.0.0.1:4173/' });
    await waitFor("document.querySelector('.hero') && !document.querySelector('.hero-entering') && !document.querySelector('.hero-portrait-wrap[data-motion-pending]') && document.readyState === 'complete'");
    await sleep(500);
    const beforePointer = await evaluate("getComputedStyle(document.querySelector('.hero-portrait-wrap')).translate");
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: width * .85, y: height * .38 });
    await sleep(500);
    const afterPointer = await evaluate("getComputedStyle(document.querySelector('.hero-portrait-wrap')).translate");
    await evaluate("window.scrollTo({top:180,behavior:'instant'}); true");
    await sleep(150);
    const depth = await evaluate("[...document.querySelectorAll('.hero-portrait-wrap,.hero-logo,.hero-multi,.hero-creative')].map(el=>({name:el.className,translate:getComputedStyle(el).translate}))");
    const normal = await evaluate(`({ cls:window.__motionCLS, pageWidth:document.documentElement.scrollWidth,
      remainingHeroEffects:document.getAnimations().filter(a=>a.id.startsWith('hero:')).length,
      portraitTransform:getComputedStyle(document.querySelector('.hero-portrait-wrap')).transform })`);
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: width * .5, y: 20 });
    await sleep(1000);
    const framesBefore = await evaluate('window.__motionFrames');
    await sleep(250);
    normal.restingRAFCallbacks = await evaluate(`window.__motionFrames - ${framesBefore}`);
    const completedSections = [];
    for (const selector of ['.project-woodstones h3', '.project-dbasement h3', '.project-haniyah h3', '.about h2', '.quest-card', '.contact h2']) {
      await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'}); true`);
      await sleep(1550);
      completedSections.push(await evaluate(`(() => {
        const el=document.querySelector('${selector}');const style=getComputedStyle(el);
        return {selector:'${selector}',opacity:style.opacity,pending:el.hasAttribute('data-motion-pending'),transform:style.transform};
      })()`));
    }
    normal.completedSections = completedSections;
    // Changing the preference mid-session must cancel every effect immediately.
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await sleep(150);
    const reduced = await evaluate(`({ pending:document.querySelectorAll('[data-motion-pending]').length,
      active:document.getAnimations().length,
      translations:[...document.querySelectorAll('.hero-portrait-wrap,.hero-logo,.hero-multi,.hero-creative')].map(el=>getComputedStyle(el).translate) })`);
    // Match the original static-review input configuration for the pixel check.
    await call('Emulation.setTouchEmulationEnabled', { enabled: false });
    await call('Page.navigate', { url: 'http://127.0.0.1:4173/' });
    await waitFor("document.readyState === 'complete' && document.querySelector('.hero')");
    await evaluate('document.fonts.ready.then(()=>true)');
    const imageHeight = await evaluate('document.documentElement.scrollHeight');
    const finalShot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: imageHeight, scale: 1 } });
    await writeFile(path.join(output, `${width}-reduced.png`), Buffer.from(finalShot.data, 'base64'));
    const comparison = await evaluate(`(async()=>{
      const load=async name=>{const i=new Image();i.src='/.local-review/motion/'+name;await i.decode();return i;};
      const [a,b]=await Promise.all([load('${width}-approved.png'),load('${width}-reduced.png')]);
      const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(a,0,0);const pa=ctx.getImageData(0,0,a.width,a.height).data;
      ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(b,0,0);const pb=ctx.getImageData(0,0,a.width,a.height).data;
      ctx.clearRect(0,0,a.width,a.height);const portrait=document.querySelector('.hero-portrait');const box=portrait.getBoundingClientRect();ctx.drawImage(portrait,box.x,box.y,box.width,box.height);const alpha=ctx.getImageData(0,0,a.width,a.height).data;
      let changed=0,nonEdgeChanges=0,minX=a.width,minY=a.height,maxX=0,maxY=0;
      for(let i=0;i<pa.length;i+=4)if(Math.max(Math.abs(pa[i]-pb[i]),Math.abs(pa[i+1]-pb[i+1]),Math.abs(pa[i+2]-pb[i+2]))>8){
        changed++;const x=(i/4)%a.width,y=Math.floor(i/4/a.width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
        let edge=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const opacity=alpha[((y+dy)*a.width+x+dx)*4+3];if(opacity>0&&opacity<255)edge=true;}if(!edge)nonEdgeChanges++;
      }
      const portraitOnly = !changed || (minX>=box.left-1 && maxX<=box.right+1 && minY>=box.top-1 && maxY<=box.bottom+1);
      return {width:a.width,height:a.height,currentHeight:b.height,changedPixels:changed,nonEdgeChanges,totalPixels:a.width*a.height,portraitOnly,bounds:changed?{minX,minY,maxX,maxY}:null};
    })()`);
    report.push({ width, entrance, gradient, sections, beforePointer, afterPointer, depth, normal, reduced, comparison });
    console.log(JSON.stringify({ width, beforePointer, afterPointer, normal, reduced, comparison }));
  }
  const approved = JSON.parse(await readFile(path.join(output, 'approved-assets.json'), 'utf8'));
  const changedAssets = [];
  for (const [file, hash] of approved) {
    const actual = createHash('sha256').update(await readFile(file)).digest('hex');
    if (actual !== hash) changedAssets.push(file);
  }
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ report, exceptions, changedAssets }, null, 2));
  // Filmstrips make the same sampled moments easy to inspect side by side.
  for (const width of [1486, 390]) {
    for (const [scene, times] of [['hero', [240, 520, 900, 1450]], ...['woodstones','dbasement','haniyah','about','quests','contact'].map(s=>[s,[150,450,1500]])]) {
      const strip = await evaluate(`(async()=>{
        const times=${JSON.stringify(times)};const images=await Promise.all(times.map(async t=>{const i=new Image();i.src='/.local-review/motion/${width}-${scene}-'+t+'.png';await i.decode();return i;}));
        const w=${width === 390 ? 260 : 500};const h=images[0].height*w/images[0].width;
        const canvas=document.createElement('canvas');canvas.width=w*images.length;canvas.height=h+28;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#eee';ctx.fillRect(0,0,canvas.width,28);ctx.font='14px Arial';ctx.fillStyle='#111';
        images.forEach((i,n)=>{ctx.fillText('${scene} / '+times[n]+'ms',n*w+10,20);ctx.drawImage(i,n*w,28,w,h);});
        return canvas.toDataURL('image/png').split(',')[1];
      })()`);
      await writeFile(path.join(output, `${width}-${scene}-filmstrip.png`), Buffer.from(strip, 'base64'));
    }
  }
  // Chrome can rerasterize a few pixels of the noisy transparent portrait.
  // Keep that diagnostic explicit; tolerate at most .025%, only inside the photo.
  const failed = exceptions.length || changedAssets.length || report.some(r =>
    r.normal.pageWidth > r.width || r.normal.cls > .001 || r.normal.restingRAFCallbacks ||
    r.normal.completedSections.some(s=>s.pending || s.opacity!=='1' || s.transform!=='none') ||
    r.reduced.pending || r.reduced.active || r.comparison.currentHeight !== r.comparison.height ||
    (r.comparison.changedPixels && (!r.comparison.portraitOnly || r.comparison.changedPixels/r.comparison.totalPixels > .00025))
  );
  if (failed) process.exitCode = 1;
  console.log(`Motion review saved in ${output}`);
} finally {
  socket?.close();
  browser.kill();
}
