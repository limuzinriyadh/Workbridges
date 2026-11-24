/*
 * Focused regression check for the WORKBRIDGES header layout.
 *
 * Guards the reported bug: the navigation rendered as a permanent vertical
 * column on mobile and squeezed the brand to zero width. Asserts a horizontal
 * bar on desktop, a collapsed menu on mobile that opens on tap, and a visible
 * brand block at both sizes. Exits non-zero on failure.
 *
 * Run: node scripts/header-check.mjs   (expects dist/ from `npm run build`)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/appjet/browser/node_modules/playwright');

const PORT = Number(process.env.HEADER_PORT || 3998);
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-header-'));

let failures = 0;
const check = (name, condition, detail = '') => {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const server = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, ADMIN_USERNAME: 'headeradmin', ADMIN_PASSWORD: 'HeaderTest@2026' },
  stdio: 'ignore'
});

const waitForServer = async () => {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

const measure = (page) =>
  page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: cs.display,
        dir: cs.flexDirection,
        visible: !!(r.width && r.height) && cs.visibility !== 'hidden'
      };
    };
    const links = [...document.querySelectorAll('.main-nav a')].map((a) => Math.round(a.getBoundingClientRect().y));
    return {
      header: rect('.site-header'),
      inner: rect('.header-inner'),
      brand: rect('.brand'),
      nav: rect('.main-nav'),
      actions: rect('.header-actions'),
      toggle: rect('.nav-toggle'),
      linkYs: links
    };
  });

let browser;
try {
  if (!(await waitForServer())) throw new Error('server did not start');
  browser = await chromium.launch();

  // ---- desktop: one horizontal bar
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktop.goto(BASE, { waitUntil: 'networkidle' });
  const d = await measure(desktop);
  check('desktop: header is a single short bar', d.header.h <= 110, `height ${d.header.h}`);
  check('desktop: menu is visible', d.nav.visible);
  check('desktop: menu lays out horizontally', d.nav.dir === 'row', `direction ${d.nav.dir}`);
  check(
    'desktop: all menu links share one row',
    d.linkYs.length > 2 && Math.max(...d.linkYs) - Math.min(...d.linkYs) <= 3,
    `y positions ${d.linkYs.join(',')}`
  );
  check('desktop: brand sits left of the menu', d.brand.x < d.nav.x, `brand ${d.brand.x} nav ${d.nav.x}`);
  check('desktop: brand block has width', d.brand.w > 40, `width ${d.brand.w}`);
  check('desktop: toggle is hidden', d.toggle.display === 'none', `display ${d.toggle.display}`);
  await desktop.close();

  // ---- mobile: collapsed menu, tap to open
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(BASE, { waitUntil: 'networkidle' });
  const m = await measure(mobile);
  check('mobile: header stays a short horizontal bar', m.header.h <= 100, `height ${m.header.h}`);
  check('mobile: menu is collapsed by default', m.nav.display === 'none', `display ${m.nav.display}`);
  check('mobile: brand block is visible', m.brand.w > 40 && m.brand.visible, `width ${m.brand.w}`);
  check('mobile: brand is not squeezed off-screen', m.brand.x >= 0 && m.brand.x + m.brand.w <= 390, `x ${m.brand.x} width ${m.brand.w}`);
  check('mobile: toggle is visible', m.toggle.visible, `display ${m.toggle.display}`);

  await mobile.click('.nav-toggle');
  await mobile.waitForTimeout(350);
  const opened = await measure(mobile);
  check('mobile: menu opens on tap', opened.nav.visible, `display ${opened.nav.display}`);
  check('mobile: opened menu is a vertical panel', opened.nav.dir === 'column', `direction ${opened.nav.dir}`);
  check('mobile: menu panel sits below the bar', opened.nav.y >= m.header.h - 2, `panel y ${opened.nav.y} bar height ${m.header.h}`);
  await mobile.close();
} catch (err) {
  failures += 1;
  console.error(`  FAIL header check crashed — ${err.message}`);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  fs.rmSync(dataDir, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} header check(s) failed.`);
  process.exit(1);
}
console.log('\nAll header layout checks passed.');
