const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

function assert(name, condition) {
  if (!condition) throw new Error('FAIL: ' + name);
  console.log('OK: ' + name);
}

assert('no optional chaining', !html.includes('?.'));
assert('no nullish coalescing', !html.includes('??'));
assert('no Element.closest usage', !/\.closest\s*\(/.test(html));
assert('no dataset usage', !/\.dataset\b/.test(html));
assert('no NodeList.forEach delegation', !/querySelectorAll\([^\n]+\)\.forEach/.test(html));

const handlerStart = html.indexOf('async function handleBoardInteraction');
const bindStart = html.indexOf('function bindEvents');
assert('has handleBoardInteraction', handlerStart >= 0);
assert('has bindEvents', bindStart >= 0);

const handler = html.slice(handlerStart, bindStart);
const zonePos = handler.indexOf("closestByClass(e.target, 'zone-head')");
const slotPos = handler.indexOf("closestByClass(e.target, 'slot')");
const chipPos = handler.indexOf("closestByClass(e.target, 'player-chip')");
assert('zone head handled before slot', zonePos >= 0 && slotPos > zonePos);
assert('slot handled before chip fallback', chipPos > slotPos);
assert('filled slot can select when no selected player', handler.includes('if(!selectedPlayer)') && handler.includes('if(chipInSlot)') && handler.includes("selectPlayer(dataAttr(chipInSlot, 'player-id')"));
assert('selected player moves through slot branch', handler.includes('movePlayer(selectedPlayer.playerId, targetZone, targetSlot)'));
assert('court down calls courtDown from zone head', handler.includes('await courtDown(dataAttr(zoneHead, '));
assert('next up calls nextUp from zone head', handler.includes('await nextUp(dataAttr(zoneHead, '));

const bind = html.slice(bindStart);
assert('touchend listener exists', bind.includes("document.addEventListener('touchend'"));
assert('click listener exists', bind.includes("document.addEventListener('click'"));
assert('touch duplicate click guard exists', bind.includes('lastTouchHandledAt') && bind.includes('Date.now() - lastTouchHandledAt < 500'));

assert('old iOS export fallback exists', html.includes('isOldIosSafari()') && html.includes('showExportText(filename, text)'));
assert('FileReader import fallback exists', html.includes('new FileReader()') && html.includes('reader.readAsText(file)'));
assert('admin unlock persisted', html.includes('saveAdminUnlock()') && html.includes('isAdmin = isAdminUnlocked()'));
assert('debug mode exists', html.includes("location.search.indexOf('debug=1')") && html.includes('function debugLog'));
assert('debug mode tracks board actions', html.includes("debugLog('zone-head courtDown'") && html.includes("debugLog('slot move success'") && html.includes("debugLog(inRest ? 'chip rest select'"));
assert('v1 storage key isolated', html.includes("badminton3x3.ipad.v1.state"));
assert('copy paste player list exists', html.includes('function playerListPayload') && html.includes('function showImportPasteDialog') && html.includes('function importPlayersFromText'));
assert('player list exports name and color only', html.includes('app:\'badminton-player-list-v1\'') && html.includes('name:p.name') && html.includes('color:p.color || COLORS[0]'));
assert('import resets games', html.includes('games:0'));
assert('system buttons use unified tap handler', html.includes("tap('resetTodayBtn', resetToday)") && html.includes("tap('exportBackupBtn', exportJson)") && html.includes("tap('importBackupBtn', showImportPasteDialog)"));
assert('partial next up requires confirmation', html.includes('function confirmPartialNextUp') && html.includes('仍要上場嗎？') && html.includes('await confirmPartialNextUp'));
assert('board touch does not await before click guard', html.includes('function runBoardInteraction') && html.includes('lastTouchHandledAt = Date.now();') && !html.includes('await handleBoardInteraction(e);'));
assert('roster import button exists', html.includes('id="fetchRosterBtn"') && html.includes("tap('fetchRosterBtn', showRosterImportDialog)"));
assert('roster api fixed to rian', html.includes("const ROSTER_SITE = 'rian'"));
assert('roster api has fetch and jsonp fallback', html.includes('function requestRosterApi') && html.includes('fetchRosterJson') && html.includes('jsonpRosterJson'));
assert('roster import clears list into rest', html.includes('function importRosterPlayers') && html.includes('state.players = importedPlayers') && html.includes('function normalizeRosterPlayers'));
assert('fixed viewport layout exists', html.includes('overflow:hidden') && html.includes('position:fixed;inset:0') && html.includes('height:var(--safe-vh)'));
assert('legacy ipad classes exist', html.includes('function detectLegacyIpad') && html.includes('legacyIpadLandscape') && html.includes('html.legacyIpadLandscape'));
assert('selected player storage fallback exists', html.includes('SELECTED_PLAYER_KEY') && html.includes('sessionStorage') && html.includes('localStorage') && html.includes('function loadSelectedPlayer'));

assert('service worker html network first', sw.includes('const isHtml') && sw.includes('fetch(event.request).then'));
assert('service worker cache scoped', sw.includes("key.startsWith(CACHE_PREFIX)"));
assert('v1 cache prefix isolated', sw.includes("badminton-3x3-ipad-v1-"));
