const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

function assert(name, condition) {
  if (!condition) throw new Error('FAIL: ' + name);
  console.log('OK: ' + name);
}

function cssRuleIncludes(selector, text) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped + '[^{]*\\{([^}]*)\\}', 'm');
  const match = html.match(pattern);
  return !!(match && match[1].indexOf(text) >= 0);
}

assert('legacy height uses window.innerHeight first', html.includes('var height = window.innerHeight || doc.clientHeight || 0;'));
assert('legacy height writes css variable', html.includes("style.setProperty('--legacy-vh'"));
assert('legacy safari class is separate from standalone', html.includes("classList.toggle('legacyIpadSafari', isLegacy && !isStandalone)"));
assert('legacy standalone class exists', html.includes("classList.toggle('legacyIpadStandalone', isLegacy && isStandalone)"));
assert('legacy app shell uses measured height', cssRuleIncludes('html.legacyIpad .app-shell', 'height:var(--legacy-vh)'));
assert('legacy body is locked to measured height', cssRuleIncludes('html.legacyIpad body', 'max-height:var(--legacy-vh)'));
assert('legacy landscape keeps two rows compressible', cssRuleIncludes('html.legacyIpadLandscape .app-shell', 'grid-template-rows:minmax(0,1fr) minmax(0,1fr)'));
assert('legacy landscape card clips overflow', cssRuleIncludes('html.legacyIpadLandscape .zone-card', 'overflow:hidden'));
assert('legacy landscape slots can shrink', cssRuleIncludes('html.legacyIpadLandscape .slot', 'min-height:0'));
assert('legacy landscape uses fixed card row math', cssRuleIncludes('html.legacyIpadLandscape .zone-card', 'grid-template-rows:60px minmax(0,calc(100% - 62px))'));
assert('legacy landscape keeps bottom slot padding', cssRuleIncludes('html.legacyIpadLandscape .slot-grid', 'padding:0 1px 5px'));
assert('legacy safari landscape keeps enlarged title buttons', cssRuleIncludes('html.legacyIpadSafari.legacyIpadLandscape .zone-head', 'min-height:58px'));
assert('legacy landscape game badge is enlarged', cssRuleIncludes('html.legacyIpadLandscape .player-chip .games', 'height:38px'));
assert('legacy standalone avoids status bar', cssRuleIncludes('html.legacyIpadStandalone.legacyIpadLandscape .app-shell', 'padding-top:26px'));
assert('legacy panel opens fullscreen', cssRuleIncludes('html.legacyIpadLandscape .float-panel', 'top:0') && cssRuleIncludes('html.legacyIpadLandscape .float-panel', 'height:var(--legacy-vh)') && cssRuleIncludes('html.legacyIpadLandscape .float-panel', 'bottom:0'));
assert('player name auto fit exists', html.includes('function fitPlayerNameText') && html.includes('function fitOnePlayerName') && html.includes('scheduleFitPlayerNames()'));
assert('player name fit cache exists', html.includes('const playerNameFitCache') && html.includes('function playerNameFitKey'));
assert('legacy court down pill stays wide', cssRuleIncludes('html.legacyIpadLandscape .court-down-pill', 'min-width:136px'));
assert('legacy selected banner is enlarged', cssRuleIncludes('html.legacyIpadLandscape .selected-banner', 'min-height:58px') && cssRuleIncludes('html.legacyIpadLandscape .selected-banner button', 'min-width:128px'));
assert('voice settings use four column compact grid', cssRuleIncludes('.voice-grid', 'grid-template-columns:repeat(4,minmax(0,1fr))'));
assert('call effect settings use four column compact grid', cssRuleIncludes('.effect-grid', 'grid-template-columns:repeat(4,minmax(0,1fr))'));
assert('player name settings use compact grid', cssRuleIncludes('.player-text-grid', 'grid-template-columns:repeat(4,minmax(0,1fr))'));
assert('narrow screens allow two column voice grid', html.includes('@media (max-width:700px)') && html.includes('.voice-grid{grid-template-columns:repeat(2,minmax(0,1fr));}'));
assert('admin tools have inner side padding', html.includes('#adminTools{padding:0 10px 8px;background:#f8fafc;}') && html.includes('html.legacyIpadLandscape #adminTools{padding:0 14px;}'));
assert('compact admin rows exist', html.includes('compact-state-row') && html.includes('player-admin-row') && html.includes('system-mode-row') && html.includes('admin-button-row four'));
assert('player add row has fixed button and compact swatches', html.includes('.player-add-row{grid-template-columns:56px minmax(160px,1fr) 332px 108px;}') && html.includes('grid-template-columns:repeat(12,24px)') && html.includes('width:24px'));
assert('system mode status is not duplicated', html.includes("textContent = '場地模式'") && !html.includes('場地模式：${currentMode()}'));
assert('zone labels are localized', html.includes("return '場地 '") && html.includes("return '預備區 '"));
assert('roster import defaults to blue', html.includes('color:COLORS[0]'));
