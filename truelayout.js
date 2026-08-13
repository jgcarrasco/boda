const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ executablePath: '/home/jgcarrasco/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://tesperamosennuestraboda.my.canva.site/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(12000);

  // Scroll through every section so each reflows to its real layout
  const stops = [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 3200];
  for (const s of stops) {
    await page.evaluate((y) => { document.querySelector('.ZRRuDw').scrollTop = y; }, s);
    await page.waitForTimeout(1200);
  }
  await page.evaluate(() => { document.querySelector('.ZRRuDw').scrollTop = 0; });
  await page.waitForTimeout(2500);

  const data = await page.evaluate(() => {
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
  });
  fs.writeFileSync('reference/true-layout.json', JSON.stringify(data, null, 1));
  console.log(JSON.stringify(data, null, 1));
  await browser.close();
})();
