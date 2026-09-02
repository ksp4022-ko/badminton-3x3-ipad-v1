const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g));
if (!scriptMatches.length) throw new Error('script not found');
const mainScript = scriptMatches[scriptMatches.length - 1][1];

function assert(name, condition) {
  if (!condition) throw new Error('FAIL: ' + name);
  console.log('OK: ' + name);
}

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.items = new Set();
  }
  add(name) {
    this.items.add(name);
    this.owner.className = Array.from(this.items).join(' ');
  }
  remove(name) {
    this.items.delete(name);
    this.owner.className = Array.from(this.items).join(' ');
  }
  contains(name) {
    return this.items.has(name);
  }
  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.items.has(name) : !!force;
    if (shouldAdd) this.add(name);
    else this.remove(name);
    return shouldAdd;
  }
}

class FakeElement {
  constructor(tagName, documentRef) {
    this.tagName = tagName || 'div';
    this.documentRef = documentRef || null;
    this.id = '';
    this.parentNode = null;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.className = '';
    this.classList = new FakeClassList(this);
    this.value = '';
    this.textContent = '';
    this.offsetWidth = 64;
    this.offsetHeight = 64;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') {
      this.id = String(value);
      if (this.documentRef) this.documentRef.elements[this.id] = this;
    }
    if (name === 'class') {
      String(value).split(/\s+/).filter(Boolean).forEach((item) => this.classList.add(item));
    }
  }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }
  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }
  dispatchEvent(event) {
    event.target = event.target || this;
    const list = this.listeners[event.type] || [];
    list.slice().forEach((handler) => handler(event));
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    child.parentNode = null;
    return child;
  }
  focus() {}
  select() {}
  click() {
    this.dispatchEvent({ type: 'click', target: this, cancelable: true, preventDefault() {}, stopPropagation() {} });
  }
  getBoundingClientRect() {
    return { left: 12, top: 120, width: this.offsetWidth, height: this.offsetHeight };
  }
  set innerHTML(value) {
    this._innerHTML = String(value || '');
    if (!this.documentRef) return;
    const idRegex = /id="([^"]+)"/g;
    let match;
    while ((match = idRegex.exec(this._innerHTML))) {
      this.documentRef.getElementById(match[1]);
    }
  }
  get innerHTML() {
    return this._innerHTML || '';
  }
}

class FakeDocument {
  constructor() {
    this.elements = {};
    this.body = this.getElementById('body');
    this.documentElement = this.getElementById('html');
    this.listeners = {};
  }
  getElementById(id) {
    if (!this.elements[id]) {
      const el = new FakeElement('div', this);
      el.id = id;
      el.setAttribute('id', id);
      this.elements[id] = el;
    }
    return this.elements[id];
  }
  createElement(tagName) {
    return new FakeElement(tagName, this);
  }
  querySelectorAll() {
    return [];
  }
  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }
}

function createContext() {
  const document = new FakeDocument();
  const idRegex = /id="([^"]+)"/g;
  let match;
  while ((match = idRegex.exec(html))) document.getElementById(match[1]);

  const store = {};
  const sessionStore = {};
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    Error,
    Promise,
    document,
    location: { search: '?debug=1' },
    navigator: {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
      serviceWorker: { register() { return Promise.resolve(); } }
    },
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value) { store[key] = String(value); },
      removeItem(key) { delete store[key]; }
    },
    sessionStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(sessionStore, key) ? sessionStore[key] : null; },
      setItem(key, value) { sessionStore[key] = String(value); },
      removeItem(key) { delete sessionStore[key]; }
    },
    window: null,
    __voices: [],
    __spokenUtterances: [],
    __speechCancelCount: 0,
    speechSynthesis: null,
    SpeechSynthesisUtterance: function SpeechSynthesisUtterance(text) { this.text = text; },
    Blob: function Blob(parts, options) { this.parts = parts; this.options = options; },
    URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} }
  };
  context.speechSynthesis = {
    cancel() {
      context.__speechCancelCount += 1;
    },
    speak(utter) {
      context.__spokenUtterances.push({
        text: utter.text,
        lang: utter.lang,
        rate: utter.rate,
        pitch: utter.pitch,
        voiceName: utter.voice ? utter.voice.name : null,
        voiceLang: utter.voice ? utter.voice.lang : null
      });
      setTimeout(() => {
        if (typeof utter.onend === 'function') utter.onend({ type: 'end' });
      }, 0);
    },
    getVoices() {
      return context.__voices;
    }
  };
  context.fetch = function fetch(url) {
    context.__lastFetchUrl = url;
    return Promise.resolve({
      ok: context.__fetchOk !== false,
      status: context.__fetchStatus || 200,
      json() {
        return Promise.resolve(context.__fetchData || { ok: true });
      }
    });
  };
  context.window = context;
  context.window.innerWidth = 768;
  context.window.innerHeight = 922;
  context.window.addEventListener = function () {};
  context.document.execCommand = function () { return true; };
  return context;
}

function player(id, name, zone, slot, games) {
  return {
    id,
    name,
    zone,
    slot: slot == null ? null : slot,
    games: games || 0,
    color: '#bfdbfe',
    sortOrder: Number(id.replace(/\D/g, '')) || 1,
    isActive: true,
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z'
  };
}

function baseState(players, extraSettings) {
  return {
    players,
    settings: Object.assign({
      courtCount: 3,
      nextCount: 3,
      nextCount2x2: 2,
      nextCount3x3: 3,
      playersPerCourt: 4,
      adminPassword: '1111',
      freePlayMode: true,
      autoArrangeMode: false,
      autoCallEnabled: false,
      voiceRate: 'normal',
      voicePitch: 'normal',
      voiceLang: 'zh-TW-first',
      zhVoiceId: '',
      enVoiceId: '',
      lastCallPlayers: [],
      lastCallCourt: null,
      floating: { side: 'left', y: 0.45 },
      collapsedSections: []
    }, extraSettings || {}),
    gameLog: []
  };
}

function eventFor(target) {
  return {
    type: 'touchend',
    target,
    cancelable: true,
    preventDefault() {},
    stopPropagation() {}
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    wait(1000).then(() => {
      throw new Error('TIMEOUT: ' + label);
    })
  ]);
}

async function run() {
  const context = createContext();
  vm.createContext(context);
  vm.runInContext(mainScript, context);
  const api = context.window.__badmintonIpadV1;
  assert('debug api exposed', !!api);

  api.setState(baseState([]));
  await api.setNextCount(5);
  assert('modern 3x3 next count can increase to five', api.getState().settings.nextCount3x3 === 5 && (context.document.getElementById('nextRow').innerHTML.match(/data-zone-card="next/g) || []).length === 5);
  assert('modern board shows rest area after next zones', (context.document.getElementById('nextRow').innerHTML.match(/data-zone-card="rest"/g) || []).length === 1);
  await api.setCourtMode(2);
  await api.setNextCount(4);
  assert('modern 2x2 next count can increase to four', api.getState().settings.nextCount2x2 === 4 && (context.document.getElementById('nextRow').innerHTML.match(/data-zone-card="next/g) || []).length === 4);
  await api.setCourtMode(3);
  assert('next count is remembered separately per mode', api.getState().settings.nextCount3x3 === 5 && (context.document.getElementById('nextRow').innerHTML.match(/data-zone-card="next/g) || []).length === 5);
  api.setState(baseState([player('rest1', '休息A', 'rest', null), player('rest2', '休息B', 'rest', null)]));
  assert('modern board rest area reserves drop spaces', (context.document.getElementById('nextRow').innerHTML.match(/rest-board-space/g) || []).length === 2);

  api.setState(baseState([player('busy1', 'Busy', 'court1', 1)], { nextCount3x3: 3 }));
  const blockedNextCount = api.setNextCount(5);
  api.tap('modalOkBtn');
  await blockedNextCount;
  assert('next count change requires empty board', api.getState().settings.nextCount3x3 === 3);

  const legacyNextContext = createContext();
  vm.createContext(legacyNextContext);
  vm.runInContext(mainScript, legacyNextContext);
  legacyNextContext.document.documentElement.classList.add('legacyIpad');
  const legacyNextApi = legacyNextContext.window.__badmintonIpadV1;
  legacyNextApi.setState(baseState([], { nextCount3x3: 5 }));
  assert('legacy iPad keeps fixed next count for now', (legacyNextContext.document.getElementById('nextRow').innerHTML.match(/data-zone-card=/g) || []).length === 3);

  context.__voices = [
    { name: 'Taiwan Local', lang: 'zh-TW', localService: true },
    { name: 'US Local', lang: 'en-US', localService: true },
    { name: 'Mandarin Backup', lang: 'zh-CN', localService: false },
    { name: 'English Backup', lang: 'en-GB', localService: false }
  ];
  api.callPlayers(['雅雯', '承昀'], 'court1');
  await wait(500);
  assert('chinese names use zh-TW voice and final court instruction', context.__spokenUtterances.map((u) => u.lang).join(',') === 'zh-TW,zh-TW,zh-TW' && context.__spokenUtterances[2].text === '請上，一號場。');
  assert('chinese names prefer exact local zh-TW voice', context.__spokenUtterances.every((u) => u.voiceName === 'Taiwan Local'));

  context.__spokenUtterances = [];
  api.callPlayers(['Kevin', 'Amy'], 'court2');
  await wait(500);
  assert('english names use en-US voice and final instruction uses zh-TW', context.__spokenUtterances.map((u) => u.lang).join(',') === 'en-US,en-US,zh-TW' && context.__spokenUtterances[2].text === '請上，二號場。');
  assert('english names prefer exact local en-US voice', context.__spokenUtterances[0].voiceName === 'US Local' && context.__spokenUtterances[1].voiceName === 'US Local');

  context.__spokenUtterances = [];
  api.callPlayers(['雅雯', 'Kevin', '承昀', 'Amy'], 'court3');
  await wait(800);
  assert('mixed call switches zh en zh en then final zh', context.__spokenUtterances.map((u) => u.lang).join(',') === 'zh-TW,en-US,zh-TW,en-US,zh-TW');
  assert('mixed Chinese English name prioritizes Chinese', api.detectNameLanguage('Amy王') === 'zh-TW');

  context.__voices = [];
  context.__spokenUtterances = [];
  api.callPlayers(['Kevin'], 'court1');
  await wait(400);
  assert('empty voices fallback does not crash and still speaks', context.__spokenUtterances.length === 2 && context.__spokenUtterances[0].lang === 'en-US' && context.__spokenUtterances[1].lang === 'zh-TW' && !context.__spokenUtterances[0].voiceName);

  context.__voices = [
    { name: 'Taiwan Local', lang: 'zh-TW', localService: true },
    { name: 'US Local', lang: 'en-US', localService: true }
  ];
  context.__spokenUtterances = [];
  api.callPlayers(['雅雯', 'Kevin'], 'court2');
  await wait(500);
  context.__spokenUtterances = [];
  api.repeatLastCall();
  await wait(500);
  assert('repeat last call uses bilingual sequence', context.__spokenUtterances.map((u) => u.lang).join(',') === 'zh-TW,en-US,zh-TW' && context.__spokenUtterances[2].text === '請上，二號場。');

  context.__voices = [
    { name: 'Taiwan Auto', lang: 'zh-TW', localService: true, voiceURI: 'zh-auto' },
    { name: 'Chinese Selected', lang: 'zh-TW', localService: false, voiceURI: 'zh-selected' },
    { name: 'US Auto', lang: 'en-US', localService: true, voiceURI: 'en-auto' },
    { name: 'English Selected', lang: 'en-GB', localService: false, voiceURI: 'en-selected' }
  ];
  api.setState(baseState([], { zhVoiceId: 'zh-selected', enVoiceId: 'en-selected', voiceRate: 'fast', voicePitch: 'high' }));
  context.__spokenUtterances = [];
  api.callPlayers(['雅雯', 'Kevin'], 'court1');
  await wait(500);
  assert('selected Chinese and English voices are used', context.__spokenUtterances[0].voiceName === 'Chinese Selected' && context.__spokenUtterances[1].voiceName === 'English Selected' && context.__spokenUtterances[2].voiceName === 'Chinese Selected');
  assert('rate and pitch apply to both selected voices', context.__spokenUtterances.every((u) => u.rate === 1.18 && u.pitch === 1.18));

  api.setState(baseState([], { zhVoiceId: 'missing-zh', enVoiceId: 'missing-en' }));
  context.__spokenUtterances = [];
  api.callPlayers(['雅雯', 'Kevin'], 'court1');
  await wait(500);
  assert('missing saved voices fall back automatically', context.__spokenUtterances[0].voiceName === 'Taiwan Auto' && context.__spokenUtterances[1].voiceName === 'US Auto');

  const emptyVoiceContext = createContext();
  vm.createContext(emptyVoiceContext);
  vm.runInContext(mainScript, emptyVoiceContext);
  const emptyVoiceApi = emptyVoiceContext.window.__badmintonIpadV1;
  assert('initial empty voice selectors do not crash', !!emptyVoiceApi && emptyVoiceContext.document.getElementById('zhVoiceSelect').innerHTML.indexOf('自動推薦') >= 0);
  emptyVoiceContext.__voices = [
    { name: 'Taiwan Reloaded', lang: 'zh-TW', localService: true, voiceURI: 'zh-reloaded' },
    { name: 'Taiwan Reloaded Copy', lang: 'zh-TW', localService: true, voiceURI: 'zh-reloaded' },
    { name: 'English Reloaded', lang: 'en-US', localService: true, voiceURI: 'en-reloaded' }
  ];
  emptyVoiceContext.document.getElementById('zhVoiceSelect').value = 'zh-reloaded';
  emptyVoiceContext.speechSynthesis.onvoiceschanged();
  assert('voiceschanged populates Chinese and English selectors', emptyVoiceContext.document.getElementById('zhVoiceSelect').innerHTML.indexOf('Taiwan Reloaded | zh-TW') >= 0 && emptyVoiceContext.document.getElementById('enVoiceSelect').innerHTML.indexOf('English Reloaded | en-US') >= 0);
  assert('voiceschanged preserves current available selection', emptyVoiceContext.document.getElementById('zhVoiceSelect').value === 'zh-reloaded');
  assert('voice selector avoids duplicate option values', emptyVoiceContext.document.getElementById('zhVoiceSelect').innerHTML.indexOf('zh-reloaded') === emptyVoiceContext.document.getElementById('zhVoiceSelect').innerHTML.lastIndexOf('zh-reloaded'));

  const floatBtn = context.document.getElementById('floatButton');
  floatBtn.dispatchEvent({ type: 'touchstart', target: floatBtn, touches: [{ clientX: 20, clientY: 120 }], cancelable: true, preventDefault() {}, stopPropagation() {} });
  floatBtn.dispatchEvent({ type: 'touchmove', target: floatBtn, touches: [{ clientX: 22, clientY: 123 }], cancelable: true, preventDefault() {}, stopPropagation() {} });
  floatBtn.dispatchEvent({ type: 'touchend', target: floatBtn, changedTouches: [{ clientX: 22, clientY: 123 }], cancelable: true, preventDefault() {}, stopPropagation() {} });
  assert('floating button small touch move still opens panel', context.document.getElementById('floatPanel').classList.contains('open'));
  context.document.getElementById('closePanelBtn').dispatchEvent({ type: 'touchend', target: context.document.getElementById('closePanelBtn'), cancelable: true, preventDefault() {}, stopPropagation() {} });

  const mediumContext = createContext();
  vm.createContext(mediumContext);
  vm.runInContext(mainScript, mediumContext);
  mediumContext.document.documentElement.classList.add('legacyIpad');
  const mediumFloatBtn = mediumContext.document.getElementById('floatButton');
  mediumFloatBtn.dispatchEvent({ type: 'touchstart', target: mediumFloatBtn, touches: [{ clientX: 20, clientY: 120 }], cancelable: true, preventDefault() {}, stopPropagation() {} });
  mediumFloatBtn.dispatchEvent({ type: 'touchmove', target: mediumFloatBtn, touches: [{ clientX: 34, clientY: 132 }], cancelable: true, preventDefault() {}, stopPropagation() {} });
  mediumFloatBtn.dispatchEvent({ type: 'touchend', target: mediumFloatBtn, changedTouches: [{ clientX: 34, clientY: 132 }], cancelable: true, preventDefault() {}, stopPropagation() {} });
  assert('legacy floating medium touch move still opens panel', mediumContext.document.getElementById('floatPanel').classList.contains('open'));

  const restoredContext = createContext();
  restoredContext.localStorage.setItem('badminton3x3.ipad.v1.state', JSON.stringify(baseState([player('p1', 'A', 'court1', 1)])));
  restoredContext.localStorage.setItem('badminton3x3.ipad.v1.state.selectedPlayer', JSON.stringify({ playerId: 'p1', name: 'A', fromZone: 'court1', fromSlot: 1 }));
  vm.createContext(restoredContext);
  vm.runInContext(mainScript, restoredContext);
  const restoredApi = restoredContext.window.__badmintonIpadV1;
  const restoredTargetSlot = new FakeElement('div');
  restoredTargetSlot.classList.add('slot');
  restoredTargetSlot.setAttribute('data-zone', 'court2');
  restoredTargetSlot.setAttribute('data-slot', '1');
  await restoredApi.handleBoardInteraction(eventFor(restoredTargetSlot));
  assert('selected player restores from local storage after reload', restoredApi.getState().players[0].zone === 'court2');

  api.setState(baseState([
    player('p1', 'A', 'next1', 1),
    player('p2', 'B', 'next1', 2),
    player('p3', 'C', 'next1', 3)
  ]));
  const incompleteCancel = api.nextUp('next1');
  api.tap('modalCancelBtn');
  await incompleteCancel;
  assert('next with 3 players cancel does not move', api.getState().players.every((p) => p.zone === 'next1'));

  const incompleteConfirm = api.nextUp('next1');
  api.tap('modalOkBtn');
  await incompleteConfirm;
  assert('next with 3 players confirm moves to court1', api.getState().players.every((p) => p.zone === 'court1'));

  api.setState(baseState([
    player('p1', 'A', 'next1', 1),
    player('p2', 'B', 'next1', 2),
    player('p3', 'C', 'next1', 3),
    player('p4', 'D', 'next1', 4)
  ]));
  await api.nextUp('next1');
  assert('next with 4 players moves to court1', api.getState().players.every((p) => p.zone === 'court1'));

  api.setState(baseState([
    player('p1', 'A', 'next1', 1),
    player('p2', 'B', 'next1', 2),
    player('p3', 'C', 'next1', 3)
  ], { freePlayMode: false, autoArrangeMode: true }));
  const autoPartial = api.nextUp('next1');
  api.tap('modalOkBtn');
  await autoPartial;
  assert('auto arrange next with 3 players confirm moves', api.getState().players.every((p) => p.zone === 'court1'));

  api.setState(baseState([
    player('p1', 'A', 'court1', 1),
    player('p2', 'B', 'court1', 2),
    player('p3', 'C', 'court1', 3),
    player('p4', 'D', 'court1', 4)
  ]));
  const head = new FakeElement('button');
  head.classList.add('zone-head');
  head.setAttribute('data-court', 'court1');
  const down = api.handleBoardInteraction(eventFor(head));
  assert('court down dialog title names court', context.document.getElementById('modalTitle').textContent === '場地 1 下場');
  assert('court down dialog message is empty', context.document.getElementById('modalMessage').textContent === '');
  assert('court down dialog shows player cards', (context.document.getElementById('modalExtra').innerHTML.match(/court-down-confirm-card/g) || []).length === 4);
  assert('court down dialog removes game-count text', !/場次 \+1/.test(context.document.getElementById('modalExtra').innerHTML || ''));
  assert('court down dialog ok button is down', context.document.getElementById('modalOkBtn').textContent === '下場');
  api.tap('modalOkBtn');
  await down;
  assert('court head touch moves players to rest', api.getState().players.every((p) => p.zone === 'rest'));
  assert('court down adds one game', api.getState().players.every((p) => p.games === 1));

  api.setState(baseState([player('p1', 'A', 'court1', 1)]));
  const sourceSlot = new FakeElement('div');
  sourceSlot.classList.add('slot');
  sourceSlot.setAttribute('data-zone', 'court1');
  sourceSlot.setAttribute('data-slot', '1');
  const sourceChip = new FakeElement('div');
  sourceChip.classList.add('player-chip');
  sourceChip.setAttribute('data-player-id', 'p1');
  sourceChip.parentNode = sourceSlot;
  await api.handleBoardInteraction(eventFor(sourceChip));
  assert('selected player saved to session storage', /"playerId":"p1"/.test(context.sessionStorage.getItem('badminton3x3.ipad.v1.state.selectedPlayer') || ''));
  assert('selected banner highlights player name', /class="selected-name">A<\/span>/.test(context.document.getElementById('selectedText').innerHTML || ''));
  api.setSelectedPlayerColor('#fecaca');
  assert('selected player color can be changed', api.getState().players[0].color === '#fecaca');
  const targetSlot = new FakeElement('div');
  targetSlot.classList.add('slot');
  targetSlot.setAttribute('data-zone', 'court2');
  targetSlot.setAttribute('data-slot', '1');
  await api.handleBoardInteraction(eventFor(targetSlot));
  assert('selected board player moves to tapped empty slot', api.getState().players[0].zone === 'court2' && api.getState().players[0].slot === 1);
  assert('selected player cleared from session storage after move', !context.sessionStorage.getItem('badminton3x3.ipad.v1.state.selectedPlayer'));
  await api.handleBoardInteraction(eventFor(sourceChip));
  const restDrop = new FakeElement('div');
  restDrop.classList.add('rest-board-drop');
  await api.handleBoardInteraction(eventFor(restDrop));
  assert('selected board player moves to board rest area', api.getState().players[0].zone === 'rest' && api.getState().players[0].slot === null);

  api.setState(baseState([
    player('p1', 'A', 'court1', 1, 5),
    player('p2', 'B', 'next1', 1, 3)
  ]));
  const reset = api.resetToday();
  api.tap('modalOkBtn');
  await reset;
  assert('reset today clears locations and games', api.getState().players.every((p) => p.zone === 'rest' && p.slot === null && p.games === 0));

  api.importPlayersFromText(JSON.stringify({ players: [{ name: '匯入A', color: '#fecaca' }, { name: '匯入B', games: 9 }] }));
  assert('paste import replaces list', api.getState().players.length === 2 && api.getState().players[0].name === '匯入A');
  assert('paste import resets games', api.getState().players.every((p) => p.games === 0 && p.zone === 'rest'));
  api.importPlayersFromText('[A]\n[B]\nC');
  assert('plain pasted names import', api.getState().players.length === 3 && api.getState().players[0].name === 'A' && api.getState().players[1].name === 'B' && api.getState().players[2].name === 'C');
  assert('plain pasted names default to blue', api.getState().players.every((p) => p.color === '#bfdbfe'));

  api.setState(baseState([
    player('old1', '舊A', 'court1', 1, 7),
    player('old2', '舊B', 'next1', 1, 2)
  ]));
  context.__fetchData = {
    ok: true,
    data: [
      {
        id: 'rian__EVT_TEST_001',
        eventDate: '2026-08-24',
        name: '日安',
        status: 'open',
        confirmedCount: 3,
        waitingCount: 1,
        maxPeople: 14
      }
    ]
  };
  const eventList = await api.requestRosterApi('listEvents', {});
  assert('roster api lists shuttle rian open events', /\/sites\/rian\/events/.test(context.__lastFetchUrl) && /status=open/.test(context.__lastFetchUrl) && eventList.events.length === 1);
  context.__fetchData = {
    ok: true,
    data: {
      event: { id: 'rian__EVT_TEST_001', name: '日安', eventDate: '2026-08-24' },
      fixedConfirmed: [
        { id: 'F2', name: '新B', orderNo: 2, signupType: 'fixed' },
        { id: 'F1', name: '新A', orderNo: 1, signupType: 'fixed' }
      ],
      tempConfirmed: [
        { id: 'T3', name: '新C', orderNo: 3, signupType: 'temp' }
      ],
      fixedWaiting: [
        { id: 'W1', name: '等待A', orderNo: 4, signupType: 'fixed' }
      ],
      fixedLeave: [
        { id: 'L1', name: '請假A', orderNo: 5, signupType: 'fixed' }
      ],
      summary: { confirmedCount: 3, waitingCount: 1, leaveCount: 1 }
    }
  };
  const rosterData = await api.requestRosterApi('previewRoster', { eventId: 'rian__EVT_TEST_001' });
  api.importRosterPlayers(rosterData.players, rosterData.event);
  assert('roster api reads selected shuttle roster', /\/events\/rian__EVT_TEST_001\/roster/.test(context.__lastFetchUrl));
  assert('roster api import clears old list', api.getState().players.length === 3 && api.getState().players[0].name === '新A');
  assert('roster api import excludes waiting and leave players', !api.getState().players.some((p) => /等待|請假/.test(p.name)));
  assert('roster api import puts all players in rest', api.getState().players.every((p) => p.zone === 'rest' && p.slot === null));
  assert('roster api import resets games', api.getState().players.every((p) => p.games === 0));
  assert('roster api import defaults all players to blue', api.getState().players.every((p) => p.color === '#bfdbfe'));

  api.setState(baseState([player('old1', '保留A', 'court1', 1, 4)]));
  context.__fetchData = { ok: false, error: { message: 'API failed' } };
  let failed = false;
  try {
    await api.requestRosterApi('previewRoster', { eventId: 'rian__EVT_TEST_002' });
  } catch (err) {
    failed = true;
  }
  assert('roster api failure rejects', failed);
  assert('roster api failure does not overwrite existing players', api.getState().players.length === 1 && api.getState().players[0].name === '保留A' && api.getState().players[0].zone === 'court1');

  api.exportJson();
  assert('copy list export opens plain names textarea', context.document.getElementById('exportTextArea').value.split('\n').length === api.getState().players.length && !/badminton-player-list-v1/.test(context.document.getElementById('exportTextArea').value));
  api.tap('modalOkBtn');

  api.exportLogCsv();
  assert('today log export opens textarea', /logId/.test(context.document.getElementById('exportTextArea').value) && /players/.test(context.document.getElementById('exportTextArea').value));
  api.tap('modalOkBtn');

  api.setState(baseState([player('p1', 'A', 'rest', null)]));
  const clear = api.clearAll();
  api.tap('modalOkBtn');
  await wait(0);
  api.tap('modalOkBtn');
  await withTimeout(clear, 'clear all double confirm');
  assert('clear all removes players', api.getState().players.length === 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
