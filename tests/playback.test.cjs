const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
let server, baseURL;
before(async () => {
  // Serve byte ranges so seeking exercises the same behavior as static hosting.
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(`${root}${path.sep}`) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    const size = fs.statSync(filename).size;
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
    const headers = { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    res.writeHead(range ? 206 : 200, { ...headers, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = fs.createReadStream(filename, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  test(name, async t => {
    const browser = await engine.launch();
    t.after(() => browser.close());
    async function scenario(title, run, options = {}) {
      await t.test(title, async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // Keep regression checks independent of third-party uptime. Real Vimeo
        // playback is additionally checked manually against the live provider.
        await context.route('**/*', route => new URL(route.request().url()).origin === baseURL
          ? route.continue() : route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
        try { await run(page); assert.deepEqual(errors, []); }
        finally { await context.close(); }
      });
    }

    await scenario('blocked storage still renders; offscreen videos stay unloaded', async page => {
      await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
      await page.goto(baseURL);
      assert.equal(await page.locator('.video-card').count(), 28);
      await page.waitForTimeout(250);
      assert.equal(await page.locator('video[src]').count(), 0);
      assert.equal(await page.evaluate(() => safePlay({ play: () => Promise.resolve() })), true);
      assert.equal(await page.evaluate(() => safePlay({ play: () => Promise.reject(new Error('Denied')) })), false);
      await page.locator('.project-expand').first().click();
      assert.equal(await page.locator('#mediaViewer').evaluate(e => e.open), true);
    });

    await scenario('actual local playback, keyboard sound, seek and viewer cleanup', async page => {
      await page.goto(baseURL);
      const card = page.locator('.video-card').filter({ has: page.locator('video[poster$="video5.jpg"]') });
      await card.locator('.media-play').click();
      await page.waitForFunction(() => [...document.querySelectorAll('.video-card video')].some(v => !v.paused && v.currentTime > 0));
      assert.equal(await card.locator('.media-play').getAttribute('aria-label'), 'Pause Work edit 06');
      await card.locator('.media-sound').focus();
      await page.keyboard.press('Enter');
      assert.equal(await card.locator('video').evaluate(v => v.muted), false);
      assert.equal(await card.locator('video').evaluate(v => v.paused), false);
      await card.locator('.media-play').click();
      assert.equal(await card.locator('video').evaluate(v => v.paused), true);
      await card.locator('.media-progress').fill('40');
      const seekTime = await card.locator('video').evaluate(v => v.currentTime);
      assert.ok(seekTime > 0);
      await card.locator('.media-expand').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('#viewerMedia video')?.currentTime > 0);
      assert.equal(await page.locator('#viewerMedia video').evaluate(v => v.muted), false);
      assert.equal(await page.locator('#viewerMedia video').evaluate(v => v.controls), true);
      assert.equal(await card.locator('video').evaluate(v => v.paused), true);
      await page.locator('#viewerPlay').click();
      assert.equal(await page.locator('#viewerMedia video').evaluate(v => v.paused), true);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !history.state?.portfolioViewer);
      assert.equal(await page.locator('#viewerMedia').evaluate(e => e.childElementCount), 0);
      assert.equal(await page.evaluate(() => document.activeElement.className), 'media-expand');
    }, { reducedMotion: 'reduce' });

    await scenario('autoplay is exclusive, respects explicit pause and stops offscreen', async page => {
      await page.goto(baseURL);
      await page.locator('#music-videos-label').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll('.video-card video')].filter(v => !v.paused).length === 1);
      const playing = page.locator('.video-card.is-playing');
      await playing.locator('.media-play').click();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('video').evaluateAll(vs => vs.filter(v => !v.paused).length), 0);
      await page.locator('#heroSection').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('video').evaluateAll(vs => vs.filter(v => !v.paused).length), 0);
    });

    await scenario('embeds use native controls and are removed on close and backgrounding', async page => {
      await page.goto(baseURL);
      const card = page.locator('.video-card').first();
      for (let i = 0; i < 3; i++) {
        await card.locator('.media-play').click();
        assert.equal(await card.locator('iframe').count(), 1);
        await card.locator('.media-expand').click();
        assert.equal(await card.locator('iframe').count(), 0);
        const src = await page.locator('#viewerMedia iframe').getAttribute('src');
        assert.ok(!src.includes('background=1'));
        assert.equal(await page.locator('#viewerPlay').isHidden(), true);
        await page.locator('#viewerClose').click();
        await page.waitForFunction(() => !history.state?.portfolioViewer);
        assert.equal(await page.locator('iframe').count(), 0);
      }
      await card.locator('.media-expand').click();
      await page.evaluate(() => pausePageMedia());
      assert.equal(await page.locator('iframe').count(), 0);
      await page.getByRole('button', { name: 'Retry loading media' }).click();
      assert.equal(await page.locator('#viewerMedia iframe').count(), 1);
    }, { reducedMotion: 'reduce' });

    await scenario('image viewer keyboard, swipe, browser Back and viewport bounds', async page => {
      await page.goto(baseURL);
      for (const width of [320, 375, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.equal(await page.locator('.project-card').evaluateAll(cards => cards.every(c => c.getBoundingClientRect().right <= innerWidth)), true);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.project-expand').first().click();
      const bounds = await page.locator('#mediaViewer').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.y + bounds.height <= 844);
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#viewerCounter').textContent(), '02 / 10');
      await page.locator('#viewerMedia').dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true, clientX: 300, clientY: 200 });
      await page.locator('#viewerMedia').dispatchEvent('pointerup', { pointerId: 1, isPrimary: true, clientX: 100, clientY: 205 });
      assert.equal(await page.locator('#viewerCounter').textContent(), '03 / 10');
      await page.goBack();
      assert.equal(await page.locator('#mediaViewer').evaluate(e => e.open), false);
      assert.equal(await page.locator('#viewerMedia img').count(), 0);
      assert.equal(await page.locator('body').evaluate(e => e.classList.contains('viewer-open')), false);
    });

    await scenario('failed local video has a working retry', async page => {
      let fail = true;
      await page.route('**/media/work/video5.mp4', route => fail ? route.fulfill({ status: 404, body: '' }) : route.continue());
      await page.goto(baseURL);
      const card = page.locator('.video-card').filter({ has: page.locator('video[poster$="video5.jpg"]') });
      await card.locator('.media-play').click();
      await card.locator('.media-error').waitFor({ state: 'visible' });
      fail = false;
      await card.locator('.media-play').click();
      await page.waitForFunction(() => document.querySelector('video[poster$="video5.jpg"]')?.currentTime > 0);
      assert.equal(await card.locator('.media-error').isHidden(), true);
    }, { reducedMotion: 'reduce' });

    await scenario('dragging never clicks a card; vertical wheel still scrolls the page', async page => {
      await page.goto(baseURL);
      await page.locator('#work-label').scrollIntoViewIfNeeded();
      const box = await page.locator('.video-card').first().boundingBox();
      await page.mouse.move(box.x + 250, box.y + 40);
      await page.mouse.down();
      await page.mouse.move(box.x + 50, box.y + 40, { steps: 10 });
      await page.mouse.up();
      assert.equal(await page.locator('iframe').count(), 0);
      assert.equal(await page.locator('video[src]').count(), 0);
      const before = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 300);
      await page.waitForFunction(y => scrollY > y, before);
    }, { reducedMotion: 'reduce' });
  });
}
