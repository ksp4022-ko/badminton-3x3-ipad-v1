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
assert('legacy app shell uses measured height', cssRuleIncludes('html.legacyIpad .app-shell', 'height:var(--legacy-vh)'));
assert('legacy body is locked to measured height', cssRuleIncludes('html.legacyIpad body', 'max-height:var(--legacy-vh)'));
assert('legacy landscape keeps two rows compressible', cssRuleIncludes('html.legacyIpadLandscape .app-shell', 'grid-template-rows:minmax(0,1fr) minmax(0,1fr)'));
assert('legacy landscape card clips overflow', cssRuleIncludes('html.legacyIpadLandscape .zone-card', 'overflow:hidden'));
assert('legacy landscape slots can shrink', cssRuleIncludes('html.legacyIpadLandscape .slot', 'min-height:0'));
assert('legacy safari landscape has extra compact rule', cssRuleIncludes('html.legacyIpadSafari.legacyIpadLandscape .zone-head', 'min-height:28px'));
