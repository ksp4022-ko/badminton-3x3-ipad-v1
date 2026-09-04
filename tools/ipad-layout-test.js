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
assert('modern device layout classes exist', html.includes("classList.toggle('modernIpad'") && html.includes("classList.toggle('modernDesktop'"));
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
assert('modern cards clip overflowing content', html.includes('.zone-card{background:rgba(255,255,255,.96)') && html.includes('display:flex;flex-direction:column;overflow:hidden;}'));
assert('modern zone cards use reinforced light blue frame without layout growth', html.includes('border:1px solid #9ECBE8') && html.includes('inset 0 0 0 1px #9ECBE8') && html.includes('.rest-board-card{background:rgba(248,250,252,.98);border-color:#9ECBE8;}'));
assert('modern short landscape removes slot min height', html.includes('@media (orientation:landscape) and (max-height:560px)') && html.includes('html:not(.legacyIpad) .slot{min-height:0'));
assert('modern tablet desktop admin panel overrides side drawer to fullscreen', html.includes('html.modernIpad .admin-v2.float-panel') && html.includes('width:100vw'));
assert('player name auto fit exists', html.includes('function fitPlayerNameText') && html.includes('function fitOnePlayerName') && html.includes('scheduleFitPlayerNames()'));
assert('player name fit cache exists', html.includes('const playerNameFitCache') && html.includes('function playerNameFitKey'));
assert('legacy court down pill stays wide', cssRuleIncludes('html.legacyIpadLandscape .court-down-pill', 'min-width:136px'));
assert('legacy selected banner is enlarged', cssRuleIncludes('html.legacyIpadLandscape .selected-banner', 'min-height:58px') && cssRuleIncludes('html.legacyIpadLandscape .selected-banner button', 'min-width:128px'));
assert('admin v2 dark fullscreen system exists', html.includes('.admin-v2.float-panel') && html.includes('background:#0f1115') && html.includes('body.admin-panel-open .floating-button{display:none!important;}'));
assert('voice settings use responsive admin v2 grid', html.includes('.voice-grid{grid-template-columns:repeat(2,minmax(0,1fr))') && html.includes('grid-template-columns:minmax(0,1.4fr) minmax(0,1.4fr)'));
assert('call effect settings use two column admin v2 grid', html.includes('.effect-grid,') && html.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
assert('player name settings use two column admin v2 grid', html.includes('.player-text-grid,') && html.includes('球員姓名大小'));
assert('narrow screens allow single column voice selectors', html.includes('@media (max-width:760px)') && html.includes('.voice-grid{grid-template-columns:1fr;}'));
assert('admin tools use safe area side padding', html.includes('max(14px,var(--safe-right))') && html.includes('max(14px,var(--safe-left))'));
assert('compact admin v2 rows exist', html.includes('admin-action-grid four') && html.includes('admin-nav-grid') && html.includes('admin-button-row four game-actions'));
assert('player add row has fixed button and compact swatches', html.includes('.player-add-row{grid-template-columns:60px minmax(150px,1fr) minmax(240px,340px) minmax(96px,120px);}') && html.includes('grid-template-columns:repeat(12,24px)') && html.includes('width:24px'));
assert('system mode status is not duplicated', html.includes("textContent = '場地模式'") && !html.includes('場地模式：${currentMode()}'));
assert('modern next row can scroll horizontally', cssRuleIncludes('.zone-row.next-scroll', 'overflow-x:auto') && html.includes("classList.toggle('next-scroll'"));
assert('modern next row uses pan-x touch behavior', cssRuleIncludes('.zone-row.next-scroll', 'touch-action:pan-x') && cssRuleIncludes('.zone-row.next-scroll .player-chip', 'touch-action:pan-x'));
assert('scroll affordance is overlay only', html.includes('.scroll-affordance{position:fixed') && html.includes('pointer-events:none') && html.includes('aria-hidden') && html.includes('scrollWidth <= row.clientWidth + 2'));
assert('next zones support up to five areas', html.includes("const NEXTS = ['next1','next2','next3','next4','next5']"));
assert('next count admin controls exist', html.includes('id="nextCountControls"') && html.includes('data-next-count-option="min"') && html.includes('function setNextCount'));
assert('zone labels are localized', html.includes("return '場地 '") && html.includes("return '預備區 '"));
assert('roster import defaults to blue', html.includes('color:COLORS[0]'));
