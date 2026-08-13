const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/home/jgcarrasco/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://tesperamosennuestraboda.my.canva.site/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(20000);
  const stops = [0, 800, 1600, 2400, 3200, 4000];
  for (const s of stops) { await page.evaluate((y) => { document.querySelector('.ZRRuDw').scrollTop = y; }, s); await page.waitForTimeout(600); }
  await page.evaluate(() => { document.querySelector('.ZRRuDw').scrollTop = 0; });
  await page.waitForTimeout(1500);
  const secs = [0, 1106.6, 2229.6, 3353.1];
  for (let i = 0; i < 4; i++) {
    await page.evaluate((y) => { document.querySelector('.ZRRuDw').scrollTop = y; }, secs[i]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'reference/replica/mob-orig-sec' + i + '.png' });
  }
  await ctx.close();

  const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const rpage = await rctx.newPage();
  await rpage.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await rpage.waitForTimeout(2000);
  const rsecs = [0, 1106.6, 2229.6, 3353.1];
  for (let i = 0; i < 4; i++) {
    await rpage.evaluate((y) => window.scrollTo(0, y), rsecs[i]);
    await rpage.waitForTimeout(400);
    await rpage.screenshot({ path: 'reference/replica/mob-repl-sec' + i + '.png' });
  }
  await rctx.close();
  await browser.close();
  console.log('mobile shots done');
})();
