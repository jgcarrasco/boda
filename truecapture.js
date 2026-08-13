const { chromium } = require('playwright');
const fs = require('fs');

async function scrollAll(page) {
  const stops = [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 3200];
  for (const s of stops) {
    await page.evaluate((y) => { document.querySelector('.ZRRuDw').scrollTop = y; }, s);
    await page.waitForTimeout(1000);
  }
  await page.evaluate(() => { document.querySelector('.ZRRuDw').scrollTop = 0; });
  await page.waitForTimeout(2000);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/home/jgcarrasco/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome' });

  // ---- Desktop: assets + true layout in one session ----
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://tesperamosennuestraboda.my.canva.site/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(10000);
  await scrollAll(page);

  const assets = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('main img')];
    const out = [];
    for (let i = 0; i < imgs.length; i++) {
      const im = imgs[i];
      const r = im.getBoundingClientRect();
      const resp = await fetch(im.src);
      const ctype = resp.headers.get('content-type') || '';
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let j = 0; j < bytes.length; j += 8192) bin += String.fromCharCode(...bytes.subarray(j, j + 8192));
      const head = new TextDecoder().decode(bytes.slice(0, 60)).trimStart();
      const isSvg = ctype.includes('svg') || head.startsWith('<svg');
      out.push({ i, isSvg, b64: btoa(bin), nat: im.naturalWidth + 'x' + im.naturalHeight });
    }
    return out;
  });
  fs.mkdirSync('reference/assets4', { recursive: true });
  const manifest = [];
  for (const a of assets) {
    const ext = a.isSvg ? 'svg' : 'png';
    const fname = 'img_' + String(a.i).padStart(2, '0') + '.' + ext;
    fs.writeFileSync('reference/assets4/' + fname, Buffer.from(a.b64, 'base64'));
    manifest.push({ i: a.i, file: fname, nat: a.nat });
  }
  fs.writeFileSync('reference/assets4/manifest.json', JSON.stringify(manifest, null, 1));
  console.log('desktop assets:', manifest.length);
  await ctx.close();

  // ---- Mobile: true layout after scrolling ----
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mpage = await mctx.newPage();
  await mpage.goto('https://tesperamosennuestraboda.my.canva.site/', { waitUntil: 'networkidle', timeout: 90000 });
  await mpage.waitForTimeout(10000);
  const mstops = [0, 800, 1600, 2400, 3200, 4000];
  for (const s of mstops) {
    await mpage.evaluate((y) => { document.querySelector('.ZRRuDw').scrollTop = y; }, s);
    await mpage.waitForTimeout(1000);
  }
  await mpage.evaluate(() => { document.querySelector('.ZRRuDw').scrollTop = 0; });
  await mpage.waitForTimeout(2000);

  const collect = () => {
    const secs = [...document.querySelectorAll('main section')];
    return secs.map((sec, si) => {
      const sr = sec.getBoundingClientRect();
      const imgs = [];
      const texts = [];
      const walk = (el, depth) => {
        if (depth > 30) return;
        const cs = getComputedStyle(el);
        if (el.tagName === 'IMG') {
          const r = el.getBoundingClientRect();
          imgs.push({ x: +(r.x - sr.x).toFixed(1), y: +(r.y - sr.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), nat: el.naturalWidth + 'x' + el.naturalHeight });
          return;
        }
        if (el.querySelector && el.querySelector(':scope > span.a_GcMg, :scope > span.xtSH_A')) {
          const r = el.getBoundingClientRect();
          texts.push({ tag: el.tagName, x: +(r.x - sr.x).toFixed(1), y: +(r.y - sr.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), ff: cs.fontFamily.split(',')[0], fs: cs.fontSize, lh: cs.lineHeight, ls: cs.letterSpacing, color: cs.color });
          return;
        }
        for (const c of el.children) walk(c, depth + 1);
      };
      walk(sec, 0);
      return { bg: getComputedStyle(sec).backgroundColor, imgs, texts };
    });
  };
  const mdata = await mpage.evaluate(collect);
  fs.writeFileSync('reference/true-mobile.json', JSON.stringify(mdata, null, 1));
  console.log('mobile sections:', mdata.length);
  await mctx.close();
  await browser.close();
  console.log('DONE');
})();
