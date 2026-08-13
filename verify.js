const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EXE = '/home/jgcarrasco/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const SECS = [0, 767, 1534, 2301];

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  fs.mkdirSync('reference/replica', { recursive: true });

  // Original
  const octx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });
  const opage = await octx.newPage();
  await opage.goto('https://tesperamosennuestraboda.my.canva.site/', { waitUntil: 'networkidle', timeout: 90000 });
  await opage.waitForTimeout(20000);
  for (let i = 0; i < 4; i++) {
    await opage.evaluate((y) => { document.querySelector('.ZRRuDw').scrollTop = y; }, SECS[i]);
    await opage.waitForTimeout(800);
    await opage.screenshot({ path: 'reference/replica/orig-sec' + i + '.png' });
  }
  await octx.close();

  // Replica (local file via file://)
  const rctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 2 });
  const rpage = await rctx.newPage();
  await rpage.goto('file://' + path.resolve('index.html'), { waitUntil: 'load', timeout: 30000 });
  await rpage.waitForTimeout(3000); // fonts
  for (let i = 0; i < 4; i++) {
    await rpage.evaluate((y) => window.scrollTo(0, y), SECS[i]);
    await rpage.waitForTimeout(400);
    await rpage.screenshot({ path: 'reference/replica/repl-sec' + i + '.png' });
  }
  await rctx.close();
  await browser.close();
  console.log('screenshots done');
})();
