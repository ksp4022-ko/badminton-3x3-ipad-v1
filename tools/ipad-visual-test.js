const path = require('path');
const { chromium } = require('playwright');

const iPadAirIos12Ua = 'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1';
const modernIpadUa = 'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';
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
      headBorderBottom: style('floatPanel') && window.getComputedStyle(document.querySelector('.admin-v2 .panel-head')).borderBottomWidth,
      selectedBar: rect('selectedAdminBar'),
      firstCard: document.querySelector('#adminTools .admin-v2-card') ? (() => {
        const r = document.querySelector('#adminTools .admin-v2-card').getBoundingClientRect();
        return { top: r.top, left: r.left, right: r.right, width: r.width };
      })() : null,
      selectedBarRadius: window.getComputedStyle(document.getElementById('selectedAdminBar')).borderRadius,
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
  assert(label + ' header divider removed', parseFloat(metrics.headBorderBottom) === 0, metrics.headBorderBottom);
  assert(label + ' selected bar aligns with cards and uses rounded container', metrics.firstCard && Math.abs(metrics.selectedBar.left - metrics.firstCard.left) <= 2 && Math.abs(metrics.selectedBar.width - metrics.firstCard.width) <= 2 && parseFloat(metrics.selectedBarRadius) >= 18 && metrics.firstCard.top - metrics.selectedBar.bottom >= 8 && metrics.firstCard.top - metrics.selectedBar.bottom <= 14, JSON.stringify({ selectedBar: metrics.selectedBar, firstCard: metrics.firstCard, radius: metrics.selectedBarRadius }));
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

function overflowMetricsScript() {
  return Array.prototype.map.call(document.querySelectorAll('.player-chip .name'), (name) => {
    const chip = name.parentNode;
    const maxWidth = Math.max(24, (chip.clientWidth || chip.offsetWidth || 0) - 18);
    const maxHeight = Math.max(20, (chip.clientHeight || chip.offsetHeight || 0) - 12);
    return {
      text: name.textContent,
      scrollWidth: name.scrollWidth,
      scrollHeight: name.scrollHeight,
      maxWidth,
      maxHeight
    };
  }).filter((name) => name.scrollWidth > name.maxWidth + 1 || name.scrollHeight > name.maxHeight + 1);
}

function portraitFitState() {
  return {
    app: 'badminton-court-2x2-3x3-ipad',
    version: 'visual-test',
    players: [
      player('p1', '國泰 哥', 'court1', 1, '#bfdbfe'),
      player('p2', 'Chris 哥', 'court1', 2, '#fde68a'),
      player('p3', '安鼎 哥', 'next1', 1, '#bbf7d0')
    ],
    settings: {
      courtCount: 3,
      nextCount: 3,
      playersPerCourt: 4,
      adminPassword: '1111',
      freePlayMode: false,
      autoArrangeMode: true,
      autoCallEnabled: false,
      autoCallMode: 'off',
      callEffectEnabled: true,
      playerNameScale: 100,
      playerNameFont: 'system',
      helperTextEnabled: true,
      floating: { side: 'left', y: 0.62 },
      collapsedSections: []
    },
    gameLog: []
  };
}

async function openUnlockedAdmin(page) {
  await page.waitForSelector('#floatButton');
  await page.click('#floatButton', { force: true });
  await page.waitForSelector('#floatPanel.open');
  await page.waitForSelector('#adminTools');
}

async function runPortraitAdminToLandscapeFitCase(browser, action) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: modernIpadUa
  });
  const page = await context.newPage();
  await page.addInitScript((state) => {
    const d = new Date();
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(state));
    window.localStorage.setItem('badminton3x3.ipad.v1.state.adminUnlockedDate', key);
  }, portraitFitState());
  await page.goto(appUrl + '?debug=1');
  await openUnlockedAdmin(page);
  if (action === 'roster') {
    await page.evaluate(async () => {
      await window.__badmintonIpadV1.saveTodayRosterFromText('國泰 哥\nChris 哥\n安鼎 哥\nAriel');
    });
  } else {
    await page.evaluate(() => {
      window.__resetPromise = window.__badmintonIpadV1.resetToday();
    });
    await page.waitForSelector('#modalMask.show');
    await page.click('#modalOkBtn');
    await page.evaluate(async () => { await window.__resetPromise; });
  }
  await page.click('#closePanelBtn', { force: true });
  await page.setViewportSize({ width: 1024, height: 638 });
  await page.waitForTimeout(450);
  const overflow = await page.evaluate(overflowMetricsScript);
  assert('portrait Admin ' + action + ' then landscape board has fitted player names', overflow.length === 0, JSON.stringify(overflow.slice(0, 3)));
  await context.close();
}

function animationState(nextCount) {
  const players = [];
  for (let slot = 1; slot <= nextCount; slot += 1) {
    players.push(player('n' + slot, ['A', 'B', 'C', 'D'][slot - 1], 'next1', slot, '#bfdbfe'));
  }
  return {
    app: 'badminton-court-2x2-3x3-ipad',
    version: 'visual-test',
    players,
    settings: {
      courtCount: 3,
      nextCount: 3,
      playersPerCourt: 4,
      adminPassword: '1111',
      freePlayMode: false,
      autoArrangeMode: true,
      autoCallEnabled: false,
      autoCallMode: 'off',
      callEffectEnabled: true,
      callEffectDuration: 5,
      callEffectIntensity: 'medium',
      callEffectColor: 'yellow',
      callEffectMarquee: true,
      courtEntryAnimationEnabled: true,
      courtEntryAnimationModule: 'fly-guide-v1',
      playerNameScale: 100,
      playerNameFont: 'system',
      helperTextEnabled: true,
      floating: { side: 'left', y: 0.62 },
      collapsedSections: []
    },
    gameLog: []
  };
}

async function runEntryAnimationCase(browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 638 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: modernIpadUa
  });
  const page = await context.newPage();
  await page.addInitScript((state) => {
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(state));
  }, animationState(3));
  await page.goto(appUrl + '?debug=1');
  await page.waitForSelector('#nextRow .player-chip');
  await page.evaluate(() => {
    const api = window.__badmintonIpadV1;
    window.__entryMovePromise = api.autoNextUpToCourt('next1', 'court1', true);
  });
  await page.waitForSelector('#modalMask.show');
  await page.click('#modalOkBtn');
  await page.evaluate(async () => {
    await window.__entryMovePromise;
    const api = window.__badmintonIpadV1;
    api.render();
  });
  await page.waitForSelector('.entry-animation-overlay');
  const during = await page.evaluate(() => ({
    cloneCount: document.querySelectorAll('.entry-fly-clone').length,
    hiddenCount: document.querySelectorAll('#courtRow .entry-destination-hidden').length,
    dynamicCount: document.querySelectorAll('#courtRow .entry-dynamic-focus').length,
    courtPlayers: window.__badmintonIpadV1.getState().players.filter((p) => p.zone === 'court1').length
  }));
  assert('modern partial Next creates one clone per actual player', during.cloneCount === 3, JSON.stringify(during));
  assert('modern partial Next hides matching destination cards during flight', during.hiddenCount === 3, JSON.stringify(during));
  assert('modern entry animation uses one dynamic court focus', during.dynamicCount === 1, JSON.stringify(during));
  assert('modern entry animation does not block player mutation', during.courtPlayers === 3, JSON.stringify(during));
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    overlayCount: document.querySelectorAll('.entry-animation-overlay').length,
    hiddenCount: document.querySelectorAll('.entry-destination-hidden').length
  }));
  assert('modern entry animation cleans overlay and hidden state', after.overlayCount === 0 && after.hiddenCount === 0, JSON.stringify(after));
  const focus = await page.evaluate(() => {
    window.__badmintonIpadV1.markCourtCallTarget('court2');
    window.__badmintonIpadV1.render();
    return {
      dynamicCount: document.querySelectorAll('#courtRow .entry-dynamic-focus').length,
      staticCount: document.querySelectorAll('#courtRow .entry-static-pending').length,
      court1Static: document.querySelector('[data-zone-card="court1"]').classList.contains('entry-static-pending'),
      court2Dynamic: document.querySelector('[data-zone-card="court2"]').classList.contains('entry-dynamic-focus')
    };
  });
  assert('entry reminder keeps one dynamic focus and prior static pending court', focus.dynamicCount === 1 && focus.staticCount === 1 && focus.court1Static && focus.court2Dynamic, JSON.stringify(focus));
  await context.close();
}

async function runLegacyNoEntryAnimationCase(browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 638 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: iPadAirIos12Ua
  });
  const page = await context.newPage();
  await page.addInitScript((state) => {
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(state));
  }, animationState(4));
  await page.goto(appUrl + '?debug=1');
  await page.waitForSelector('#nextRow .player-chip');
  await page.evaluate(async () => {
    const api = window.__badmintonIpadV1;
    await api.autoNextUpToCourt('next1', 'court1', true);
    api.render();
  });
  await page.waitForTimeout(100);
  const metrics = await page.evaluate(() => ({
    htmlClass: document.documentElement.className,
    overlayCount: document.querySelectorAll('.entry-animation-overlay').length,
    shouldRun: window.__badmintonIpadV1.courtEntryAnimationShouldRun(),
    courtPlayers: window.__badmintonIpadV1.getState().players.filter((p) => p.zone === 'court1').length
  }));
  assert('legacy iPad does not run new entry animation', /legacyIpad/.test(metrics.htmlClass) && metrics.shouldRun === false && metrics.overlayCount === 0 && metrics.courtPlayers === 4, JSON.stringify(metrics));
  await context.close();
}

async function runNextScrollTouchCase(browser) {
  const state = stateForMode('3x3');
  state.settings.nextCount = 5;
  state.settings.nextCount3x3 = 5;
  state.players.push(player('r1', '休息甲', 'rest', null, '#bfdbfe'));
  state.players.push(player('r2', '休息乙', 'rest', null, '#fde68a'));
  const context = await browser.newContext({
    viewport: { width: 1024, height: 638 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: modernIpadUa
  });
  const page = await context.newPage();
  await page.addInitScript((nextState) => {
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(nextState));
  }, state);
  await page.goto(appUrl + '?debug=1');
  await page.waitForSelector('#nextRow.next-scroll .player-chip');
  await page.waitForTimeout(100);

  const hintInitial = await page.evaluate(() => {
    const row = document.getElementById('nextRow');
    const hint = document.getElementById('nextScrollAffordance');
    return {
      overflow: row.scrollWidth > row.clientWidth + 2,
      visible: !!hint && hint.classList.contains('show'),
      bars: hint ? hint.querySelectorAll('span').length : 0
    };
  });
  assert('next scroll affordance appears only when right content remains', hintInitial.overflow && hintInitial.visible && hintInitial.bars === 2, JSON.stringify(hintInitial));

  const hintRight = await page.evaluate(() => new Promise((resolve) => {
    const row = document.getElementById('nextRow');
    row.scrollLeft = row.scrollWidth;
    row.dispatchEvent(new Event('scroll'));
    requestAnimationFrame(() => {
      const hint = document.getElementById('nextScrollAffordance');
      resolve(!!hint && hint.classList.contains('show'));
    });
  }));
  assert('next scroll affordance hides at right edge', hintRight === false);

  const afterSwipe = await page.evaluate(async () => {
    const row = document.getElementById('nextRow');
    row.scrollLeft = 0;
    row.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const chip = row.querySelector('.player-chip');
    const rect = chip.getBoundingClientRect();
    const startX = Math.round(rect.left + rect.width * 0.75);
    const y = Math.round(rect.top + rect.height / 2);
    chip.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId:1, pointerType:'touch', clientX:startX, clientY:y }));
    chip.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, pointerId:1, pointerType:'touch', clientX:startX - 44, clientY:y + 2 }));
    chip.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId:1, pointerType:'touch', clientX:startX - 44, clientY:y + 2 }));
    chip.click();
    return window.__badmintonIpadV1.getState().players.filter((p) => p.id === window.__badmintonIpadV1.getState().players[0].id).length && document.querySelectorAll('.player-chip.selected').length;
  });
  assert('next horizontal swipe suppresses accidental chip selection', afterSwipe === 0, String(afterSwipe));

  await page.waitForTimeout(380);
  await page.click('#nextRow .player-chip', { force: true });
  const afterTap = await page.evaluate(() => document.querySelectorAll('.player-chip.selected').length);
  assert('next short tap still selects player immediately', afterTap === 1, String(afterTap));

  await context.close();
}

async function runPortraitAdminModeCase(browser) {
  const state = stateForMode('3x3');
  state.settings.portraitAdminModeEnabled = true;
  state.settings.helperTextEnabled = true;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: modernIpadUa
  });
  const page = await context.newPage();
  await page.addInitScript((nextState) => {
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(nextState));
  }, state);
  await page.goto(appUrl + '?debug=1');
  await page.waitForSelector('#floatPanel.open');
  const portrait = await page.evaluate(() => ({
    panelOpen: document.getElementById('floatPanel').classList.contains('open'),
    hintShown: document.getElementById('orientationHint').classList.contains('show'),
    warningHidden: window.getComputedStyle(document.querySelector('.portrait-warning.phone')).display === 'none'
  }));
  assert('portrait admin mode opens Admin and bypasses rotate guard', portrait.panelOpen && portrait.hintShown && portrait.warningHidden, JSON.stringify(portrait));
  await page.setViewportSize({ width: 1024, height: 638 });
  await page.waitForTimeout(260);
  const landscape = await page.evaluate(() => ({
    panelOpen: document.getElementById('floatPanel').classList.contains('open'),
    overflow: Array.prototype.filter.call(document.querySelectorAll('.player-chip .name'), (name) => name.scrollWidth > name.clientWidth + 1).length
  }));
  assert('portrait admin mode returns to landscape board without name overflow', !landscape.panelOpen && landscape.overflow === 0, JSON.stringify(landscape));
  await context.close();

  const quietContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: modernIpadUa
  });
  const quietPage = await quietContext.newPage();
  const quietState = stateForMode('3x3');
  quietState.settings.portraitAdminModeEnabled = true;
  quietState.settings.helperTextEnabled = false;
  await quietPage.addInitScript((nextState) => {
    window.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(nextState));
  }, quietState);
  await quietPage.goto(appUrl + '?debug=1');
  await quietPage.waitForSelector('#floatPanel.open');
  const quietHint = await quietPage.evaluate(() => document.getElementById('orientationHint').classList.contains('show'));
  assert('portrait admin startup hint follows helper text setting', quietHint === false);
  await quietContext.close();
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
    await runPortraitAdminToLandscapeFitCase(browser, 'roster');
    await runPortraitAdminToLandscapeFitCase(browser, 'reset');
    await runEntryAnimationCase(browser);
    await runLegacyNoEntryAnimationCase(browser);
    await runNextScrollTouchCase(browser);
    await runPortraitAdminModeCase(browser);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
