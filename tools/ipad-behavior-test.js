const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) throw new Error('script not found');

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
    window: null,
    speechSynthesis: { speak() {}, getVoices() { return []; } },
    SpeechSynthesisUtterance: function SpeechSynthesisUtterance(text) { this.text = text; },
    Blob: function Blob(parts, options) { this.parts = parts; this.options = options; },
    URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} }
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
      playersPerCourt: 4,
      adminPassword: '1111',
      freePlayMode: true,
      autoArrangeMode: false,
      autoCallEnabled: false,
      voiceRate: 'normal',
      voicePitch: 'normal',
      voiceLang: 'zh-TW-first',
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
  vm.runInContext(scriptMatch[1], context);
  const api = context.window.__badmintonIpadV1;
  assert('debug api exposed', !!api);

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
  const targetSlot = new FakeElement('div');
  targetSlot.classList.add('slot');
  targetSlot.setAttribute('data-zone', 'court2');
  targetSlot.setAttribute('data-slot', '1');
  await api.handleBoardInteraction(eventFor(targetSlot));
  assert('selected board player moves to tapped empty slot', api.getState().players[0].zone === 'court2' && api.getState().players[0].slot === 1);

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

  api.exportJson();
  assert('copy list export opens textarea', /badminton-player-list-v1/.test(context.document.getElementById('exportTextArea').value));
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
