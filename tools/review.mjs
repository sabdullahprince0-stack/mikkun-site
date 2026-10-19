import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Local-only browser review. Requires Chrome and Node 22+; no packages needed.
const output = path.resolve('.local-review');
await mkdir(output, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--disable-lcd-text', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9223', `--user-data-dir=${path.join(output, 'chrome-profile')}`,
  'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let targets;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      targets = await (await fetch('http://127.0.0.1:9223/json')).json();
      if (targets.some(target => target.type === 'page')) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const target = targets?.find(target => target.type === 'page');
  if (!target) throw new Error('Chrome debugging endpoint did not become available.');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('close', () => {
    for (const { reject } of pending.values()) reject(new Error('Chrome closed the debugging connection. Run the review with browser execution permission.'));
    pending.clear();
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
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
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const report = [];
  for (const width of [1486, 390, 1800]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
    await call('Page.navigate', { url: 'http://127.0.0.1:4173' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await evaluate('document.fonts.ready.then(() => true)');
    await evaluate('Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))).then(() => true)');
    const state = await evaluate(`(async () => {
      const images = await Promise.all([...document.images].map(async img => {
        let error = null;
        try { await img.decode(); } catch(e) { error = e.message; }
        const rect = img.getBoundingClientRect();
        let pixels = null;
        if (!error) {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const context = canvas.getContext('2d');
          context.drawImage(img, 0, 0);
          const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let visible = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i]) visible++;
          pixels = { total: data.length / 4, visible };
        }
        return { src: new URL(img.currentSrc || img.src).pathname.slice(1), decoded: !error, error, pixels,
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
          width: rect.width, height: rect.height };
      }));
      return { width: innerWidth, pageWidth: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight, images,
        reveals: [...document.querySelectorAll('[data-reveal]')].map(el => ({
          name: el.className, opacity: getComputedStyle(el).opacity,
          display: getComputedStyle(el).display, box: el.getBoundingClientRect().toJSON() })),
        fonts: [...document.fonts].map(f => ({family:f.family,status:f.status})),
        header: document.querySelector('.site-header').getBoundingClientRect().toJSON(),
        hero: document.querySelector('.hero').getBoundingClientRect().toJSON(),
        links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')) };
    })()`);
    if (width === 1486) {
      await call('DOM.enable');
      await call('CSS.enable');
      const { root } = await call('DOM.getDocument');
      state.platformFonts = {};
      for (const selector of ['.hero-logo', '.hero-multi', '.hero-manifesto', '.work-title']) {
        const { nodeId } = await call('DOM.querySelector', { nodeId: root.nodeId, selector });
        state.platformFonts[selector] = await call('CSS.getPlatformFontsForNode', { nodeId });
      }
    }
    for (const image of state.images) {
      const bytes = await readFile(image.src);
      const png = bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
      const jpeg = bytes[0] === 255 && bytes[1] === 216;
      const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      const headerValid = png || webp || jpeg;
      const declaredBytes = png || jpeg ? bytes.length : webp ? bytes.readUInt32LE(4) + 8 : null;
      image.file = { bytes: bytes.length, headerValid, declaredBytes,
        complete: png ? bytes.subarray(-8, -4).toString() === 'IEND' : jpeg ? bytes.at(-2) === 255 && bytes.at(-1) === 217 : headerValid && declaredBytes === bytes.length };
      image.usable = image.file.complete && image.decoded && image.pixels?.visible > 0;
    }
    if (width === 390) {
      state.menu = await evaluate(`(() => {
        const button = document.querySelector('.menu-toggle');
        const menu = document.querySelector('#mobile-menu');
        button.click();
        const opens = !menu.hidden && button.getAttribute('aria-expanded') === 'true';
        menu.querySelector('a').click();
        const closes = menu.hidden && button.getAttribute('aria-expanded') === 'false';
        window.scrollTo({top:0,behavior:'instant'});
        return { opens, closes };
      })()`);
    }
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: state.height, scale: 1 } });
    await writeFile(path.join(output, `${width}.png`), Buffer.from(shot.data, 'base64'));
    const heroShot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: Math.ceil(state.hero.height), scale: 1 } });
    await writeFile(path.join(output, `${width}-hero.png`), Buffer.from(heroShot.data, 'base64'));
    report.push(state);
    console.log(JSON.stringify({ width, pageWidth:state.pageWidth, images:state.images.map(i=>({src:i.src,decoded:i.decoded,usable:i.usable})), menu:state.menu }));
  }
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ pages: report, errors }, null, 2));
  // Compare the actual render with the exported references, section by section.
  for (const [width, reference, sections] of [
    [1486, 'desktop-reference.png', [['hero', 0, 755], ['statement', 755, 349], ['about', 3138, 647], ['quests', 3785, 1030]]],
    [390, 'mobile-reference.png', [['hero', 0, 817], ['work', 1053, 1377], ['about', 2430, 709], ['quests', 3138, 781]]],
  ]) {
    try { await access(path.join(output, reference)); } catch { continue; }
    for (const [name, y, height] of sections) {
      const data = await evaluate(`(async () => {
        const load = async src => { const img = new Image(); img.src = src; await img.decode(); return img; };
        const [reference, actual] = await Promise.all([
          load('/.local-review/${reference}'), load('/.local-review/${width}.png')
        ]);
        const canvas = document.createElement('canvas');
        canvas.width = ${width * 2}; canvas.height = ${height + 30};
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, 30);
        ctx.fillStyle = '#000'; ctx.font = '16px Arial';
        ctx.fillText('Figma reference', 12, 21); ctx.fillText('Local render', ${width + 12}, 21);
        ctx.drawImage(reference, 0, ${y}, ${width}, ${height}, 0, 30, ${width}, ${height});
        ctx.drawImage(actual, 0, ${y}, ${width}, ${height}, ${width}, 30, ${width}, ${height});
        return canvas.toDataURL('image/png').split(',')[1];
      })()`);
      await writeFile(path.join(output, `${width}-${name}-comparison.png`), Buffer.from(data, 'base64'));
    }
  }
  console.log(`Screenshots and browser report saved in ${output}`);
  if (report.some(page => page.images.some(image => !image.usable)) || errors.length) process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill();
}
