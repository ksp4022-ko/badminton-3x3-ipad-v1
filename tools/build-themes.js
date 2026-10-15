// Builds themes.css: the 系統配色 options (A / B / C) as colour overrides of the
// existing styles. Run `npm run build:themes` after changing colours in
// index.html, integrated-preview.css, integrated-admin.css or setup-test.html.
//
// Every colour declaration is re-emitted under html.theme-x in source order
// (mapped or not), so the cascade between the original rules is preserved.
// Player colours, flip / light-trail / call effects and the selected-player
// banner are re-emitted unchanged (never re-coloured).
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const SOURCES = [
  { file: 'index.html', style: 0, flow: false },
  { file: 'integrated-preview.css', flow: false },
  { file: 'integrated-admin.css', flow: false },
  { file: 'setup-test.html', style: 0, flow: true },
  { file: 'setup-test.html', style: 1, flow: true }
];

const EXCLUDE = /player-chip|color-swatch|gf-swatch|gf-player|court-down-confirm-card|preview-flip|preview-arrival|preview-move|entry-|call-|selected-banner|selected-name|has-selected|status-roster|status-slider-pill|\.games\b|zone-head\.warn/;
const COLOR_PROP = /^(color|background(-color|-image)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|box-shadow|fill|stroke|caret-color|--(bg|panel|ink|muted|line))$/;

function role(prop) {
  if (/^(color|fill|stroke|caret-color|--ink|--muted)$/.test(prop)) return 'text';
  if (/^(border|outline|box-shadow|--line)/.test(prop)) return 'border';
  return 'bg';
}

// Shared accent / tint remaps per theme (all roles), then role-specific remaps.
const THEMES = {
  a: { // 青綠＋行動橘 on an orange base (Productivity Tool palette; base warmed so it differs from 預設)
    any: { '#2563eb': '#ea580c', '#1d4ed8': '#c2410c', '#245cbd': '#9a3412', '#e4edff': '#ffedd5', '#edf3ff': '#fff7ed', '#eff6ff': '#fff7ed', '#72a2ff': '#fb923c', '#4f8cff': '#f97316', '#356be0': '#ea580c', '#80acff': '#c2410c', '#6d28d9': '#ea580c', '#7c3aed': '#ea580c', '#4f46e5': '#f97316', '#ecfeff': '#ffedd5', '#9ecbe8': '#fdba74', '#d7f0ec': '#ccfbf1', '#b6e3dc': '#99f6e4', '#0f5f58': '#134e4a', '#e8edf3': '#fdeee0' },
    bg: { '#f3f5f7': '#fff7ed', '#f8fafc': '#fffaf5' },
    flow: { bg: { '#0f1115': '#fff7ed', '#171a21': '#ffffff', '#232834': '#fdeee0', '#1e222b': '#fdeee0' }, border: { '#2e3442': '#fed7aa', '#3c4556': '#fdba74', '#ffffff': '#134e4a' }, text: { '#f5f7fa': '#134e4a', '#ffffff': '#134e4a', '#b7c0cd': '#57534e', '#71ddbb': '#0f766e', '#ffca75': '#b45309' } }
  },
  b: { // 深藍高對比 (Government / Public Service palette)
    any: { '#2563eb': '#0369a1', '#1d4ed8': '#075985', '#245cbd': '#075985', '#e4edff': '#e0f2fe', '#edf3ff': '#f0f9ff', '#eff6ff': '#f0f9ff', '#72a2ff': '#0ea5e9', '#4f8cff': '#0369a1', '#356be0': '#0369a1', '#80acff': '#0369a1', '#6d28d9': '#0f172a', '#7c3aed': '#0f172a', '#4f46e5': '#1e293b', '#ecfeff': '#f8fafc', '#9ecbe8': '#cbd5e1', '#d7f0ec': '#e8ecf1', '#b6e3dc': '#cbd5e1', '#0f5f58': '#0f172a', '#3d7c74': '#475569', '#e8edf3': '#f1f5f9' },
    text: { '#18202d': '#020617', '#526176': '#334155', '#657184': '#475569' },
    flow: { bg: { '#0f1115': '#f8fafc', '#171a21': '#ffffff', '#232834': '#e8ecf1', '#1e222b': '#e8ecf1' }, border: { '#2e3442': '#e2e8f0', '#3c4556': '#cbd5e1', '#ffffff': '#020617' }, text: { '#f5f7fa': '#020617', '#ffffff': '#020617', '#b7c0cd': '#475569', '#71ddbb': '#0f766e', '#ffca75': '#b45309' } }
  },
  c: { // 深色看板 (Digital Signage dark + Fitness energy orange)
    any: { '#2563eb': '#f97316', '#1d4ed8': '#ea580c', '#245cbd': '#fdba74', '#e4edff': '#3b2414', '#edf3ff': '#2a1a10', '#eff6ff': '#2a1a10', '#72a2ff': '#fb923c', '#4f8cff': '#f97316', '#356be0': '#f97316', '#80acff': '#fdba74', '#6d28d9': '#f97316', '#7c3aed': '#f97316', '#4f46e5': '#ea580c', '#ecfeff': '#020617', '#9ecbe8': '#334155', '#d7f0ec': '#1a1e2f', '#b6e3dc': '#334155', '#0f5f58': '#5eead4', '#3d7c74': '#5eead4', '#e8edf3': '#1a1e2f' },
    bg: { '#ffffff': '#1b2336', '#f3f5f7': '#020617', '#f8fafc': '#0e1223', '#f5f7fa': '#0e1223', '#e2e8f0': '#273043', '#edf1f5': '#1a1e2f', '#eef2f7': '#1a1e2f', '#f1f5f9': '#1a1e2f', '#e2e7ed': '#273043', '#fff3d6': '#3b2414', '#ffe5e5': '#3f1d1d', '#fef3c7': '#3b2414', lightRgba: '27,35,54' },
    border: { '#d7dee7': '#334155', '#e2e7ed': '#334155', '#cdd6e1': '#475569', '#cbd5e1': '#475569', '#94a3b8': '#475569', '#e8d49c': '#7c5a1e', '#e9b4b4': '#7f1d1d', '#e2e8f0': '#334155', '#18202d': '#f8fafc' },
    text: { '#18202d': '#f8fafc', '#0f172a': '#f8fafc', '#111827': '#f8fafc', '#526176': '#94a3b8', '#657184': '#94a3b8', '#3b4656': '#cbd5e1', '#475569': '#94a3b8', '#64748b': '#94a3b8', '#334155': '#cbd5e1', '#875300': '#fdba74', '#92400e': '#fdba74', '#a32424': '#fca5a5', '#991b1b': '#fca5a5' },
    flow: {}
  },
  d: noGreen({ court: '#4f46e5', courtLight: '#818cf8', bg: '#eef2ff', cardBorder: '#c7d2fe', nextHead: '#e0e7ff', nextHeadText: '#1e1b4b', restHead: '#f1f5f9', slotBg: '#f5f7ff', ink: '#1e1b4b', accent: '#ea580c', accentDark: '#c2410c', accentText: '#9a3412', accentSoft: '#ffedd5', accentSofter: '#fff7ed', float: '#ea580c', float2: '#f97316' }), // 靛藍＋活力橘 (Educational App palette)
  e: noGreen({ court: '#1d4ed8', courtLight: '#3b82f6', bg: '#fff7ed', cardBorder: '#fcd9bd', nextHead: '#dbeafe', nextHeadText: '#1e3a8a', restHead: '#f5f0eb', slotBg: '#fffaf5', ink: '#0f172a', accent: '#ea580c', accentDark: '#c2410c', accentText: '#9a3412', accentSoft: '#ffedd5', accentSofter: '#fff7ed', float: '#ea580c', float2: '#f97316' }), // 皇家藍＋活動橘 (Local Events palette)
  f: noGreen({ court: '#1e3a8a', courtLight: '#3b5bdb', bg: '#fffbeb', cardBorder: '#fde68a', nextHead: '#dbeafe', nextHeadText: '#1e3a8a', restHead: '#f5f5f4', slotBg: '#fffdf5', ink: '#1c1917', accent: '#d97706', accentDark: '#b45309', accentText: '#78350f', accentSoft: '#fef3c7', accentSofter: '#fffbeb', float: '#1e3a8a', float2: '#1e40af' }) // 午夜藍＋琥珀 (Coworking Space palette)
};

// Light schemes with no green at all: teal court / buttons / checks become the court colour.
function noGreen(p) {
  return {
    any: { '#2563eb': p.accent, '#1d4ed8': p.accentDark, '#245cbd': p.accentText, '#e4edff': p.accentSoft, '#edf3ff': p.accentSofter, '#eff6ff': p.accentSofter, '#72a2ff': p.accent, '#4f8cff': p.accent, '#356be0': p.accent, '#80acff': p.accentDark, '#6d28d9': p.float, '#7c3aed': p.float, '#4f46e5': p.float2, '#ecfeff': p.bg, '#9ecbe8': p.cardBorder, '#d7f0ec': p.nextHead, '#b6e3dc': p.cardBorder, '#0f5f58': p.nextHeadText, '#3d7c74': p.nextHeadText, '#e8edf3': p.restHead, '#0f766e': p.court, '#14b8a6': p.courtLight, '#99f6e4': p.cardBorder, '#16a34a': p.court, '#71ddbb': p.court },
    bg: { '#f3f5f7': p.bg, '#f8fafc': p.slotBg },
    text: { '#18202d': p.ink },
    flow: { bg: { '#0f1115': p.bg, '#171a21': '#ffffff', '#232834': p.nextHead, '#1e222b': p.nextHead }, border: { '#2e3442': p.cardBorder, '#3c4556': p.cardBorder, '#ffffff': p.ink }, text: { '#f5f7fa': p.ink, '#ffffff': p.ink, '#b7c0cd': '#475569', '#71ddbb': p.court, '#ffca75': '#b45309' } }
  };
}

// The flip face, legacy court head and roster check are frozen above; no-green schemes recolour them here.
function courtExtras(court, entering, portraitEnd) {
  return '.portrait-warning{background:linear-gradient(135deg,' + court + ',' + portraitEnd + ');}' +
    '.preview-flip-face{background:' + court + ';}.preview-flip-face.action{background:#D97706;}.preview-flip-face.entering{background:' + entering + ';}' +
    'body.preview-test .zone-head.warn{background:' + court + ';border-color:' + court + ';}' +
    '.status-roster-value.is-loaded .status-roster-mark{background:' + court + ';}';
}

// Hand-written additions that are not a colour swap of an existing rule.
const EXTRA = {
  a: '.portrait-warning{background:linear-gradient(135deg,#ea580c,#9a3412);}',
  b: '.portrait-warning{background:linear-gradient(135deg,#0f172a,#1e293b);}',
  c: '.portrait-warning{background:#020617;}.portrait-card{background:#1b2336;border-color:#334155;}.status-metric img{filter:invert(1);opacity:.85;}',
  d: courtExtras('#4f46e5', '#0ea5e9', '#1e1b4b'),
  e: courtExtras('#1d4ed8', '#7c3aed', '#1e3a8a'),
  f: courtExtras('#1e3a8a', '#7c3aed', '#172554')
};

function styleBlock(text, index) {
  const blocks = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(text))) blocks.push(m[1]);
  if (!blocks[index]) throw new Error('style block ' + index + ' missing');
  return blocks[index];
}

// Minimal CSS parser: top-level rules and one level of @media / @supports.
function parse(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  function readBlock(start) {
    let depth = 0, j = start;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') { depth--; if (depth === 0) return j; }
    }
    throw new Error('unbalanced css');
  }
  function walk(from, to, wrapper) {
    let k = from;
    while (k < to) {
      const open = css.indexOf('{', k);
      if (open < 0 || open >= to) break;
      const prelude = css.slice(k, open).trim();
      const close = readBlock(open);
      if (/^@(media|supports)/.test(prelude)) walk(open + 1, close, prelude);
      else if (!/^@/.test(prelude)) out.push({ wrapper, selector: prelude, body: css.slice(open + 1, close) });
      k = close + 1;
    }
  }
  walk(0, css.length, null);
  return out;
}

function norm(hex) {
  hex = hex.toLowerCase();
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  return hex;
}

function mapValue(value, theme, r, flow, keepWhiteText) {
  const t = THEMES[theme];
  const roleMap = Object.assign({}, t[r] || {});
  const flowMap = flow && t.flow ? (t.flow[r] || {}) : {};
  value = value.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, function (h) {
    const n = norm(h);
    if (flow && flowMap[n] && !(keepWhiteText && n === '#ffffff')) return flowMap[n];
    if (t.any[n]) return t.any[n];
    if (!flow && roleMap[n]) return roleMap[n];
    return h;
  });
  value = value.replace(/\bwhite\b/g, function (w) { return (!flow && r === 'bg' && roleMap['#ffffff']) ? roleMap['#ffffff'] : w; });
  if (!flow && r === 'bg' && roleMap.lightRgba) {
    value = value.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g, function (all, R, G, B, A) {
      return (+R >= 240 && +G >= 240 && +B >= 240) ? 'rgba(' + roleMap.lightRgba + ',' + A + ')' : all;
    });
  }
  return value;
}

function prefix(selector, theme) {
  return selector.split(',').map(function (s) {
    s = s.trim();
    if (/^:root\b/.test(s)) return 'html.theme-' + theme + s.slice(5);
    if (/^html\b/.test(s)) return 'html.theme-' + theme + s.slice(4);
    return 'html.theme-' + theme + ' ' + s;
  }).join(',');
}

function build() {
  const rules = [];
  SOURCES.forEach(function (src) {
    const text = fs.readFileSync(path.join(root, src.file), 'utf8');
    const css = src.style === undefined ? text : styleBlock(text, src.style);
    parse(css).forEach(function (rule) { rule.flow = src.flow; rule.file = src.file; rules.push(rule); });
  });
  let out = '/* Generated by tools/build-themes.js (npm run build:themes). Do not edit by hand. */\n';
  Object.keys(THEMES).forEach(function (theme) {
    const groups = [];
    rules.forEach(function (rule) {
      // Excluded rules are re-emitted unchanged so their priority over the mapped rules is kept.
      const frozen = EXCLUDE.test(rule.selector);
      const decls = rule.body.split(';').map(function (d) { return d.trim(); }).filter(Boolean);
      const bgDecl = decls.find(function (d) { return /^background(-color)?\s*:/.test(d); }) || '';
      const darkBg = /#0f766e|#2563eb|#356be0|#dc2626|#0f172a|#18202d/i.test(bgDecl);
      const keep = [];
      decls.forEach(function (d) {
        const c = d.indexOf(':');
        if (c < 0) return;
        const prop = d.slice(0, c).trim().toLowerCase();
        if (!COLOR_PROP.test(prop)) return;
        const value = d.slice(c + 1).trim();
        if (!/#[0-9a-f]{3,6}|rgba?\(|\bwhite\b|transparent|none|inherit|currentcolor|var\(/i.test(value)) return;
        keep.push(prop + ':' + (frozen ? value : mapValue(value, theme, role(prop), rule.flow, darkBg)));
      });
      if (!keep.length) return;
      groups.push({ wrapper: rule.wrapper, text: prefix(rule.selector, theme) + '{' + keep.join(';') + ';}' });
    });
    out += '\n/* theme-' + theme + ' */\n';
    groups.forEach(function (g) { out += g.wrapper ? g.wrapper + '{' + g.text + '}\n' : g.text + '\n'; });
    if (EXTRA[theme]) out += EXTRA[theme].split('}').filter(Boolean).map(function (r) { return prefix(r.slice(0, r.indexOf('{')), theme) + r.slice(r.indexOf('{')) + '}'; }).join('\n') + '\n';
  });
  fs.writeFileSync(path.join(root, 'themes.css'), out);
  return out.length;
}

if (require.main === module) console.log('themes.css written, ' + build() + ' bytes');
module.exports = { build: build, THEMES: THEMES };
