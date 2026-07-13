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
  const sampleNames = ['柯', 'IC', 'Chris 哥', 'Jerry 哥', '建志 哥', '安鼎 哥', 'Ariel', 'Astin', 'Bobo 哥', '國泰 哥', '綿羊', '簡 哥'];
  const players = [];
  let n = 1;
  courts.concat(nexts).forEach((zone) => {
    for (let slot = 1; slot <= 4; slot += 1) {
      players.push(player('p' + n, sampleNames[(n - 1) % sampleNames.length], zone, slot, slot % 2 ? '#bfdbfe' : '#fde68a'));
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

async function runCase(browser, mode, scenario) {
  const standalone = !!scenario.standalone;
  const context = await browser.newContext({
    viewport: { width: 1024, height: scenario.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: iPadAirIos12Ua
  });
  const page = await context.newPage();
  await page.addInitScript(({ state, standalone }) => {
    Object.defineProperty(window.navigator, 'standalone', { value: standalone, configurable: true });
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(state));
  }, { state: stateForMode(mode), standalone });
  await page.goto(appUrl);
  await page.waitForSelector('#courtRow .zone-card');
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const names = Array.prototype.map.call(document.querySelectorAll('.player-chip .name'), (name) => {
      const chip = name.parentNode;
      const fontSize = parseFloat(getComputedStyle(name).fontSize);
      const maxWidth = Math.max(24, (chip.clientWidth || chip.offsetWidth || 0) - 18);
      const maxHeight = Math.max(20, (chip.clientHeight || chip.offsetHeight || 0) - 12);
      return {
        text: name.textContent,
        fontSize,
        scrollWidth: name.scrollWidth,
        scrollHeight: name.scrollHeight,
        maxWidth,
        maxHeight
      };
    });
    return {
      innerHeight: window.innerHeight,
      htmlClass: document.documentElement.className,
      app: rect(document.getElementById('appShell')),
      courtRow: rect(document.getElementById('courtRow')),
      nextRow: rect(document.getElementById('nextRow')),
      courtCount: document.querySelectorAll('#courtRow .zone-card').length,
      nextCount: document.querySelectorAll('#nextRow .zone-card').length,
      titleMinHeight: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('.zone-head'), (head) => head.getBoundingClientRect().height)),
      slotMinHeight: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('.slot'), (slot) => slot.getBoundingClientRect().height)),
      nameMinFontSize: Math.min.apply(null, names.map((name) => name.fontSize)),
      shortNameFontSize: (names.find((name) => name.text === '柯') || { fontSize: 0 }).fontSize,
      normalNameFontSize: (names.find((name) => name.text === 'Chris 哥') || { fontSize: 0 }).fontSize,
      nameOverflowCount: names.filter((name) => name.scrollWidth > name.maxWidth + 1 || name.scrollHeight > name.maxHeight + 1).length
    };
  });

  const label = mode + ' ' + scenario.name;
  assert(label + ' legacy iPad classes applied', /legacyIpad/.test(metrics.htmlClass) && /legacyIpadLandscape/.test(metrics.htmlClass), metrics.htmlClass);
  assert(label + ' correct browser mode class', standalone ? /legacyIpadStandalone/.test(metrics.htmlClass) : /legacyIpadSafari/.test(metrics.htmlClass), metrics.htmlClass);
  assert(label + ' app fits viewport', metrics.app.top >= -1 && metrics.app.bottom <= metrics.innerHeight + 1, JSON.stringify(metrics.app));
  assert(label + ' court row visible', metrics.courtRow.top >= -1 && metrics.courtRow.bottom <= metrics.innerHeight + 1, JSON.stringify(metrics.courtRow));
  assert(label + ' next row visible', metrics.nextRow.top >= -1 && metrics.nextRow.bottom <= metrics.innerHeight + 1, JSON.stringify(metrics.nextRow));
  assert(label + ' rows do not overlap', metrics.courtRow.bottom <= metrics.nextRow.top + 4, JSON.stringify({ courtRow: metrics.courtRow, nextRow: metrics.nextRow }));
  assert(label + ' expected court count', metrics.courtCount === (mode === '2x2' ? 2 : 3), String(metrics.courtCount));
  assert(label + ' expected next count', metrics.nextCount === (mode === '2x2' ? 2 : 3), String(metrics.nextCount));
  assert(label + ' title buttons are tappable', metrics.titleMinHeight >= 36, String(metrics.titleMinHeight));
  assert(label + ' slots remain tappable', metrics.slotMinHeight >= 48, String(metrics.slotMinHeight));
  assert(label + ' player names are readable', metrics.nameMinFontSize >= 24, String(metrics.nameMinFontSize));
  assert(label + ' short names are enlarged', metrics.shortNameFontSize >= 32, String(metrics.shortNameFontSize));
  assert(label + ' normal names are enlarged', metrics.normalNameFontSize >= 26, String(metrics.normalNameFontSize));
  assert(label + ' player names do not overflow chip', metrics.nameOverflowCount === 0, String(metrics.nameOverflowCount));
  if(standalone){
    assert(label + ' avoids iOS status bar', metrics.courtRow.top >= 20, JSON.stringify(metrics.courtRow));
  }

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const scenarios = [
    { name: 'Safari', standalone: false, height: 638 },
    { name: 'Standalone', standalone: true, height: 768 }
  ];
  try {
    for (const scenario of scenarios) {
      await runCase(browser, '3x3', scenario);
      await runCase(browser, '2x2', scenario);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
