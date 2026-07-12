const path = require('path');
const { chromium } = require('playwright');

const iPadAirIos12Ua = 'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1';
const appUrl = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

function assert(name, condition, details) {
  if (!condition) throw new Error('FAIL: ' + name + (details ? ' | ' + details : ''));
  console.log('OK: ' + name);
}

function player(id, name, zone, slot, color) {
  return {
    id,
    name,
    zone,
    slot,
    games: 0,
    color: color || '#bfdbfe',
    sortOrder: Number(id.replace(/\D/g, '')) || 1,
    isActive: true,
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z'
  };
}

function stateForMode(mode) {
  const isTwo = mode === '2x2';
  const courts = isTwo ? ['court1', 'court2'] : ['court1', 'court2', 'court3'];
  const nexts = isTwo ? ['next1', 'next2'] : ['next1', 'next2', 'next3'];
  const players = [];
  let n = 1;
  courts.concat(nexts).forEach((zone) => {
    for (let slot = 1; slot <= 4; slot += 1) {
      players.push(player('p' + n, 'P' + n, zone, slot, slot % 2 ? '#bfdbfe' : '#fde68a'));
      n += 1;
    }
  });
  return {
    app: 'badminton-court-2x2-3x3-ipad',
    version: 'visual-test',
    players,
    settings: {
      courtCount: isTwo ? 2 : 3,
      nextCount: isTwo ? 2 : 3,
      playersPerCourt: 4,
      adminPassword: '1111',
      freePlayMode: false,
      autoArrangeMode: true,
      autoCallEnabled: false,
      voiceRate: 'normal',
      voicePitch: 'normal',
      voiceLang: 'zh-TW-first',
      lastCallPlayers: [],
      lastCallCourt: null,
      floating: { side: 'left', y: 0.62 },
      collapsedSections: []
    },
    gameLog: []
  };
}

async function runCase(browser, mode) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 638 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: iPadAirIos12Ua
  });
  const page = await context.newPage();
  await page.addInitScript((state) => {
    Object.defineProperty(window.navigator, 'standalone', { value: false, configurable: true });
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(state));
  }, stateForMode(mode));
  await page.goto(appUrl);
  await page.waitForSelector('#courtRow .zone-card');
  await page.waitForTimeout(100);

  const metrics = await page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    return {
      innerHeight: window.innerHeight,
      htmlClass: document.documentElement.className,
      app: rect(document.getElementById('appShell')),
      courtRow: rect(document.getElementById('courtRow')),
      nextRow: rect(document.getElementById('nextRow')),
      courtCount: document.querySelectorAll('#courtRow .zone-card').length,
      nextCount: document.querySelectorAll('#nextRow .zone-card').length,
      slotMinHeight: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('.slot'), (slot) => slot.getBoundingClientRect().height)),
      nameMinFontSize: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('.player-chip .name'), (name) => parseFloat(getComputedStyle(name).fontSize)))
    };
  });

  assert(mode + ' legacy iPad classes applied', /legacyIpad/.test(metrics.htmlClass) && /legacyIpadLandscape/.test(metrics.htmlClass) && /legacyIpadSafari/.test(metrics.htmlClass), metrics.htmlClass);
  assert(mode + ' app fits viewport', metrics.app.top >= -1 && metrics.app.bottom <= metrics.innerHeight + 1, JSON.stringify(metrics.app));
  assert(mode + ' court row visible', metrics.courtRow.top >= -1 && metrics.courtRow.bottom <= metrics.innerHeight + 1, JSON.stringify(metrics.courtRow));
  assert(mode + ' next row visible', metrics.nextRow.top >= -1 && metrics.nextRow.bottom <= metrics.innerHeight + 1, JSON.stringify(metrics.nextRow));
  assert(mode + ' rows do not overlap', metrics.courtRow.bottom <= metrics.nextRow.top + 4, JSON.stringify({ courtRow: metrics.courtRow, nextRow: metrics.nextRow }));
  assert(mode + ' expected court count', metrics.courtCount === (mode === '2x2' ? 2 : 3), String(metrics.courtCount));
  assert(mode + ' expected next count', metrics.nextCount === (mode === '2x2' ? 2 : 3), String(metrics.nextCount));
  assert(mode + ' slots remain tappable', metrics.slotMinHeight >= 48, String(metrics.slotMinHeight));
  assert(mode + ' player names are readable', metrics.nameMinFontSize >= 23, String(metrics.nameMinFontSize));

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    await runCase(browser, '3x3');
    await runCase(browser, '2x2');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
