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
assert('copy paste player list exists', html.includes('function playerNamesText') && html.includes('function showImportPasteDialog') && html.includes('function importPlayersFromText'));
assert('player list exports plain names', html.includes("showExportText('複製名單', playerNamesText())") && html.includes(".join('\\n')"));
assert('player list import accepts plain lines', html.includes('function parsePlayerListText') && html.includes("placeholder=\"A&#10;B&#10;C\"") && html.includes("replace(/^\\s*\\[(.*)\\]\\s*$/, '$1')"));
assert('import resets games', html.includes('games:0'));
assert('system buttons use unified tap handler', html.includes("tap('resetTodayBtn', resetToday)") && html.includes("tap('exportBackupBtn', exportJson)") && html.includes("tap('importBackupBtn', showImportPasteDialog)"));
const courtDownStart = html.indexOf('async function courtDown');
const autoArrangeStart = html.indexOf('async function autoArrangeCourtDown');
const courtDownBlock = html.slice(courtDownStart, autoArrangeStart);
assert('court down dialog is concise', !courtDownBlock.includes('modeNote') && !courtDownBlock.includes('countNote') && courtDownBlock.includes("confirmDialog('確認下場'") && courtDownBlock.includes("'下場', 'warn'"));
assert('partial next up requires confirmation', html.includes('function confirmPartialNextUp') && html.includes('仍要上場嗎？') && html.includes('await confirmPartialNextUp'));
assert('board touch does not await before click guard', html.includes('function runBoardInteraction') && html.includes('lastTouchHandledAt = Date.now();') && !html.includes('await handleBoardInteraction(e);'));
const selectStart = html.indexOf('function selectPlayer');
const movePlayerStart = html.indexOf('function movePlayer');
const selectBlock = html.slice(selectStart, movePlayerStart);
assert('select player uses local UI refresh', selectBlock.includes('refreshSelectionUi(previousId, p.id)') && selectBlock.includes('refreshSelectionUi(previousId, null)'));
assert('select player does not rerender board', !selectBlock.includes('render();'));
assert('court call target highlight exists', html.includes('function markCourtCallTarget') && html.includes('zone-card.call-target') && html.includes('data-zone-card'));
assert('court call target duration is configurable', html.includes('callEffectDuration') && html.includes('duration * 1000'));
assert('court call target rerenders after timeout', html.includes('courtHighlightZone = null;') && html.includes('renderZones();') && html.includes('fitPlayerNameText();'));
assert('court call target controls exist', html.includes('callEffectOffBtn') && html.includes('callEffectOnBtn') && html.includes('callEffectDurationSelect') && html.includes('callEffectIntensitySelect') && html.includes('callEffectColorSelect') && html.includes('callMarqueeOnBtn'));
assert('court down pill exists', html.includes('court-down-pill') && html.includes('<span class="arrow">'));
assert('court down pill expanded', html.includes('min-width:136px'));
assert('court header uses flex layout', html.includes('.zone-head{width:100%;display:flex;'));
assert('court call prompt includes court label', html.includes('call-marquee') && html.includes("zoneLabel(zone) + ' >>> 請上場…'"));
assert('shared player color editor exists', html.includes('id="newPlayerColorGrid"') && html.includes('id="sharedColorLabel"') && !html.includes('id="selectedPlayerColorGrid"') && html.includes('function setSelectedPlayerColor'));
assert('selected banner highlights player name', html.includes('selected-name') && html.includes('id="selectedText"') && html.includes('.selected-banner .selected-name'));
assert('admin enabled line removed', !html.includes('管理員模式已開啟'));
assert('panel repeat call button removed', !html.includes('id="repeatCallBtn"'));
assert('speaker repeat floating button exists', html.includes('id="speakerButton"') && html.includes("setStableTap($('speakerButton'), repeatLastCall)") && html.includes('function positionSpeakerButton'));
assert('stable speaker tap exists', html.includes('function bindStableTap') && html.includes('function setStableTap'));
assert('speaker button uses purple tool color', html.includes('.floating-button.speaker-button{display:none;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff'));
assert('selected floating button still turns yellow', html.includes('.floating-button.has-selected{background:linear-gradient(135deg,#f59e0b,#facc15);color:#422006;}'));
assert('admin nested section titles are blue', html.includes('#adminTools .panel-section .collapse-head') && html.includes('color:#1d4ed8'));
assert('bilingual speech helpers exist', html.includes('function detectNameLanguage') && html.includes('function findPreferredVoice') && html.includes('function speakCallSequence'));
assert('court call speaks player names sequentially', html.includes('createCallUtterance(parts[index].text, parts[index].lang)') && html.includes('setTimeout(function(){ speakNext(index + 1); }, 110)'));
assert('court call no longer uses single combined zh sentence', !html.includes("names.join('、')} 請上") && !html.includes("'請上場：' + names.join('、')"));
assert('repeat call reuses callPlayers path', html.includes('function repeatLastCall') && html.includes('callPlayers(names, state.settings.lastCallCourt || null);'));
assert('selectable bilingual voice controls exist', html.includes('id="zhVoiceSelect"') && html.includes('id="enVoiceSelect"') && html.includes('zhVoiceId') && html.includes('enVoiceId'));
assert('old voice language selector removed from UI', !html.includes('id="voiceLangSelect"') && html.includes("voiceLang:'zh-TW-first'"));
assert('voice selectors populate safely', html.includes('function populateVoiceSelects') && html.includes('onvoiceschanged') && html.includes('<option value="">自動推薦</option>'));
assert('selected voice fallback exists', html.includes('function findSelectedVoice') && html.includes('findVoiceById(id)') && html.includes('return findPreferredVoice(lang);'));
assert('voice test uses bilingual one-court sample', html.includes("callPlayers(['雅雯','Kevin'], 'court1')"));
assert('player name fit cache exists', html.includes('playerNameFitCache') && html.includes('playerNameFitKey'));
assert('panel scroll tap guard exists', html.includes('function initPanelScrollGuard') && html.includes('panelTouch.blockUntil') && html.includes('isPanelScrollBlocked(el)'));
assert('floating tap uses drag threshold', html.includes('const FLOAT_DRAG_THRESHOLD = 8') && html.includes('const LEGACY_FLOAT_DRAG_THRESHOLD = 20') && html.includes('function floatingDragThreshold') && html.includes('startX:point.x') && html.includes('floatingTapHandledAt'));
assert('floating toggle uses lock', html.includes('floatingToggleLockedUntil') && html.includes('function toggleFloatingPanel') && html.includes('now + 300'));
assert('floating pointer and touch are not both bound on modern browsers', html.includes('if(window.PointerEvent)') && html.includes('}else{') && html.includes("btn.addEventListener('touchstart'"));
assert('roster import button exists', html.includes('id="fetchRosterBtn"') && html.includes('更新日安名單') && html.includes("tap('fetchRosterBtn', showRosterImportDialog)"));
assert('roster api fixed to rian', html.includes("const ROSTER_SITE = 'rian'"));
assert('roster api uses shuttle rian source', html.includes('ROSTER_SOURCE_PAGE') && html.includes('shuttle-burst-dynamic/rian') && html.includes('SHUTTLE_ROSTER_API_BASE') && html.includes('function requestShuttleRosterApi'));
assert('roster source is visible and not blank', html.includes('rosterApiUrl:ROSTER_SOURCE_PAGE') && html.includes('merged.settings.rosterApiUrl = ROSTER_SOURCE_PAGE') && html.includes('目前固定使用日安報名頁'));
assert('roster source dialog no longer asks apps script', !html.includes('請貼上新 Apps Script Web App URL') && !html.includes('請貼上 Apps Script Web App URL'));
assert('roster api imports confirmed lists only', html.includes('fixedConfirmed') && html.includes('tempConfirmed') && html.includes('function rosterConfirmedPlayers'));
assert('roster import clears list into rest', html.includes('function importRosterPlayers') && html.includes('state.players = importedPlayers') && html.includes('function normalizeRosterPlayers'));
assert('fixed viewport layout exists', html.includes('overflow:hidden') && html.includes('position:fixed;top:0;right:0;bottom:0;left:0;inset:0') && html.includes('height:var(--safe-vh)'));
assert('modal mask has old safari fixed fallback', html.includes('.modal-mask{position:fixed;top:0;right:0;bottom:0;left:0;inset:0'));
assert('manager panel opens fullscreen', html.includes('.float-panel{position:fixed;z-index:49;top:0;right:0;bottom:0;left:0') && html.includes('html.legacyIpadLandscape .float-panel{left:0;right:0;top:0;bottom:0'));
assert('legacy ipad classes exist', html.includes('function detectLegacyIpad') && html.includes('legacyIpadLandscape') && html.includes('html.legacyIpadLandscape'));
assert('legacy ipad measured viewport height exists', html.includes('function measuredLegacyViewportHeight') && html.includes('--legacy-vh') && html.includes('height:var(--legacy-vh)'));
assert('legacy ipad safari compact layout exists', html.includes('legacyIpadSafari') && html.includes('html.legacyIpadSafari.legacyIpadLandscape'));
assert('selected player storage fallback exists', html.includes('SELECTED_PLAYER_KEY') && html.includes('sessionStorage') && html.includes('localStorage') && html.includes('function loadSelectedPlayer'));

assert('service worker html network first', sw.includes('const isHtml') && sw.includes('fetch(event.request).then'));
assert('service worker cache scoped', sw.includes("key.startsWith(CACHE_PREFIX)"));
assert('v1 cache prefix isolated', sw.includes("badminton-3x3-ipad-v1-"));
