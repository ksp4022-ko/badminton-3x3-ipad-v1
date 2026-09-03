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
    const slotFits = Array.prototype.map.call(document.querySelectorAll('.zone-card'), (card) => {
      const cardRect = card.getBoundingClientRect();
      const slots = Array.prototype.map.call(card.querySelectorAll('.slot'), (slot) => slot.getBoundingClientRect());
      return {
        bottomClearance: Math.min.apply(null, slots.map((slot) => cardRect.bottom - slot.bottom)),
        overflowCount: slots.filter((slot) => slot.top < cardRect.top - 1 || slot.bottom > cardRect.bottom - 1).length
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
      titleTexts: Array.prototype.map.call(document.querySelectorAll('.zone-title'), (title) => title.textContent),
      titleMinFontSize: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('.zone-title'), (title) => parseFloat(getComputedStyle(title).fontSize))),
      courtDownPillCount: document.querySelectorAll('#courtRow .court-down-pill').length,
      courtDownPillMinHeight: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('#courtRow .court-down-pill'), (pill) => pill.getBoundingClientRect().height)),
      courtDownPillMinWidth: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('#courtRow .court-down-pill'), (pill) => pill.getBoundingClientRect().width)),
      gamesMinHeight: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('.player-chip .games'), (games) => games.getBoundingClientRect().height)),
      gamesMinFontSize: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll('.player-chip .games'), (games) => parseFloat(getComputedStyle(games).fontSize))),
      slotBottomClearanceMin: Math.min.apply(null, slotFits.map((item) => item.bottomClearance)),
      slotOverflowCount: slotFits.reduce((total, item) => total + item.overflowCount, 0),
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
  assert(label + ' labels are localized', metrics.titleTexts.indexOf('場地 1') >= 0 && metrics.titleTexts.indexOf('預備區 1') >= 0, JSON.stringify(metrics.titleTexts));
  assert(label + ' title buttons are enlarged and tappable', metrics.titleMinHeight >= 54, String(metrics.titleMinHeight));
  assert(label + ' title text is readable', metrics.titleMinFontSize >= 27, String(metrics.titleMinFontSize));
  assert(label + ' court down pills are visible', metrics.courtDownPillCount === (mode === '2x2' ? 2 : 3) && metrics.courtDownPillMinHeight >= 34 && metrics.courtDownPillMinWidth >= 128, JSON.stringify({ count: metrics.courtDownPillCount, height: metrics.courtDownPillMinHeight, width: metrics.courtDownPillMinWidth }));
  assert(label + ' game badges are enlarged', metrics.gamesMinHeight >= 34 && metrics.gamesMinFontSize >= 22, JSON.stringify({ height: metrics.gamesMinHeight, fontSize: metrics.gamesMinFontSize }));
  assert(label + ' slots remain tappable', metrics.slotMinHeight >= 48, String(metrics.slotMinHeight));
  assert(label + ' slots do not overflow cards', metrics.slotOverflowCount === 0, String(metrics.slotOverflowCount));
  assert(label + ' slot bottoms keep padding', metrics.slotBottomClearanceMin >= 3, String(metrics.slotBottomClearanceMin));
  assert(label + ' player names are readable', metrics.nameMinFontSize >= 28, String(metrics.nameMinFontSize));
  assert(label + ' short names are enlarged', metrics.shortNameFontSize >= 38, String(metrics.shortNameFontSize));
  assert(label + ' normal names are enlarged', metrics.normalNameFontSize >= 30, String(metrics.normalNameFontSize));
  assert(label + ' player names do not overflow chip', metrics.nameOverflowCount === 0, String(metrics.nameOverflowCount));
  if(standalone){
    assert(label + ' avoids iOS status bar', metrics.courtRow.top >= 20, JSON.stringify(metrics.courtRow));
  }

  await context.close();
}

async function runAdminCase(browser, scenario) {
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: iPadAirIos12Ua
  });
  const page = await context.newPage();
  await page.addInitScript(({ state, standalone }) => {
    Object.defineProperty(window.navigator, 'standalone', { value: standalone, configurable: true });
    const d = new Date();
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(state));
    window.localStorage.setItem('badminton3x3.ipad.v1.state.adminUnlockedDate', key);
  }, { state: stateForMode('3x3'), standalone: !!scenario.standalone });
  await page.goto(appUrl + '?debug=1');
  await page.waitForSelector('#floatButton');
  await page.click('#floatButton', { force: true });
  await page.waitForSelector('#floatPanel.open');
  await page.waitForSelector('#adminTools');

  const metrics = await page.evaluate(() => {
    const style = (id) => window.getComputedStyle(document.getElementById(id));
    const rect = (id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    return {
      bodyClass: document.body.className,
      portraitWarningDisplay: style('floatPanel') && window.getComputedStyle(document.querySelector('.portrait-warning.phone')).display,
      panel: rect('floatPanel'),
      title: document.getElementById('panelTitle').textContent,
      back: document.getElementById('closePanelBtn').textContent,
      adminToolsDisplay: style('adminTools').display,
      sectionTitles: Array.prototype.map.call(document.querySelectorAll('#adminTools .admin-v2-card h3'), (el) => el.textContent),
      redCloseExists: !!document.querySelector('.close-strong'),
      playerDetailVisibleBefore: document.getElementById('playerDetailView').classList.contains('show')
    };
  });

  const label = 'Admin V2 ' + scenario.name;
  assert(label + ' body marks panel open', /admin-panel-open/.test(metrics.bodyClass), metrics.bodyClass);
  assert(label + ' portrait warning is bypassed when open', metrics.portraitWarningDisplay === 'none', metrics.portraitWarningDisplay);
  assert(label + ' panel fills viewport', metrics.panel.left <= 1 && metrics.panel.top <= 1 && metrics.panel.width >= scenario.width - 2 && metrics.panel.height >= scenario.height - 2, JSON.stringify(metrics.panel));
  assert(label + ' header is compact nav', metrics.title === '管理員' && metrics.back.indexOf('返回排場') >= 0, JSON.stringify({ title: metrics.title, back: metrics.back }));
  assert(label + ' admin tools visible after unlock', metrics.adminToolsDisplay !== 'none', metrics.adminToolsDisplay);
  assert(label + ' all v2 sections visible', ['今日操作','自動呼叫','球員與場次','場地與排場','視覺與顯示','系統與資料'].every((title) => metrics.sectionTitles.indexOf(title) >= 0), JSON.stringify(metrics.sectionTitles));
  assert(label + ' old red close removed', !metrics.redCloseExists);
  assert(label + ' detail views are initially closed', metrics.playerDetailVisibleBefore === false);

  await page.click('#showPlayerDetailBtn');
  const detailVisible = await page.evaluate(() => document.getElementById('playerDetailView').classList.contains('show') && document.getElementById('adminDetailNav').style.display === 'none');
  assert(label + ' player detail opens as subview', detailVisible);
  await page.click('#hidePlayerDetailBtn');
  const detailClosed = await page.evaluate(() => !document.getElementById('playerDetailView').classList.contains('show') && document.getElementById('adminDetailNav').style.display !== 'none');
  assert(label + ' player detail returns to admin home', detailClosed);

  await page.click('#closePanelBtn');
  const closed = await page.evaluate(() => !document.getElementById('floatPanel').classList.contains('open') && !document.body.classList.contains('admin-panel-open'));
  assert(label + ' back button closes admin', closed);

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
    await runAdminCase(browser, { name: 'Safari portrait', standalone: false, width: 390, height: 844 });
    await runAdminCase(browser, { name: 'Standalone portrait', standalone: true, width: 390, height: 844 });
    await runAdminCase(browser, { name: 'Safari landscape', standalone: false, width: 1024, height: 638 });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
