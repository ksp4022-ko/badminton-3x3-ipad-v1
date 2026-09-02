const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT_DIR, 'index.html');

function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function extractConst(source, name) {
  const match = source.match(new RegExp("const\\s+" + name + "\\s*=\\s*'([^']+)'"));
  if (!match) throw new Error('Missing const ' + name);
  return match[1];
}

function extractFixedNameMap(source) {
  const match = source.match(/names:\{\s*([\s\S]*?)\s*\},\s*courtPhrases:/);
  if (!match) throw new Error('Missing FIXED_AUDIO.names mapping');
  const map = {};
  const re = /'((?:\\'|[^'])+)'\s*:\s*'((?:\\'|[^'])+)'/g;
  let item;
  while ((item = re.exec(match[1]))) {
    map[unescapeJsString(item[1])] = unescapeJsString(item[2]);
  }
  return map;
}

function unescapeJsString(value) {
  return value.replace(/\\'/g, "'");
}

function escapeJsString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function detectNameLanguage(name) {
  const text = String(name || '');
  if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(text)) return 'zh';
  if (/[A-Za-z]/.test(text)) return 'en';
  return 'zh';
}

function splitEnglishSuffix(name) {
  const match = String(name || '').trim().match(/^(.+?)\s*(哥|姊)$/);
  if (!match) return null;
  const base = match[1].trim();
  if (detectNameLanguage(base) !== 'en') return null;
  return { base, suffix: match[2] };
}

function slugName(name, lang) {
  const raw = String(name || '').trim();
  if (lang === 'en') {
    const ascii = raw
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return (ascii || codepointSlug(raw)) + '-rate-minus20';
  }
  const known = {
    '柯': 'ke',
    '安鼎 哥': 'an-ding-ge',
    '簡 哥': 'jian-ge',
    '建志 哥': 'jian-zhi-ge',
    '國泰 哥': 'guo-tai-ge',
    '綿羊🐑': 'mian-yang',
    '綿羊': 'mian-yang-no-emoji',
    '柔伊': 'rou-yi',
    '哥': 'ge',
    '姊': 'jie'
  };
  return known[raw] || codepointSlug(raw);
}

function codepointSlug(value) {
  const points = [];
  for (const char of String(value || '').trim()) {
    const code = char.codePointAt(0).toString(16);
    if (/[A-Za-z0-9]/.test(char)) points.push(char.toLowerCase());
    else if (char.trim()) points.push('u' + code);
  }
  return points.join('-') || 'voice';
}

function audioPathForName(name) {
  const lang = detectNameLanguage(name);
  const file = slugName(name, lang) + '.mp3';
  if (lang === 'en') return 'en-US-AriaNeural/rate-test/' + file;
  return 'zh-TW-HsiaoChenNeural/' + file;
}

function absoluteAudioPath(rootDir, relativeAudioPath) {
  return path.join(rootDir, 'voice-poc', relativeAudioPath.replace(/\//g, path.sep));
}

function fileExistsNonEmpty(filePath) {
  try {
    return fs.statSync(filePath).size > 0;
  } catch (err) {
    return false;
  }
}

function normalizeRosterPlayers(data) {
  const lists = [];
  if (data && Array.isArray(data.confirmed)) lists.push(data.confirmed);
  if (data && Array.isArray(data.fixedConfirmed)) lists.push(data.fixedConfirmed);
  if (data && Array.isArray(data.tempConfirmed)) lists.push(data.tempConfirmed);
  return lists
    .flat()
    .filter((player) => player && String(player.name || '').trim())
    .sort((a, b) => {
      const ao = Number(a.orderNo || a.order || 999999);
      const bo = Number(b.orderNo || b.order || 999999);
      if (ao !== bo) return ao - bo;
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant');
    })
    .map((player) => String(player.name || '').trim());
}

function rosterArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && data.data) return rosterArray(data.data, key);
  return [];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function defaultFetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response || !response.ok) throw new Error('HTTP ' + (response ? response.status : ''));
  const data = await response.json();
  if (!data || data.ok === false) throw new Error('Roster API returned failure');
  return data;
}

function buildQueryUrl(baseUrl, params) {
  const parts = Object.keys(params || {})
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key])));
  return baseUrl + (baseUrl.includes('?') ? '&' : '?') + parts.join('&');
}

async function fetchCurrentRosterNames(config, fetchJson) {
  const eventsUrl = buildQueryUrl(config.apiBase + '/sites/' + encodeURIComponent(config.site) + '/events', {
    status: 'open',
    from: todayKey(),
    limit: 20,
    _ts: Date.now()
  });
  const eventsData = await fetchJson(eventsUrl);
  const events = rosterArray(eventsData, 'events')
    .map((event) => String(event.eventId || event.id || event.event_id || '').trim())
    .filter(Boolean);
  const names = [];
  for (const eventId of events) {
    const rosterUrl = buildQueryUrl(config.apiBase + '/events/' + encodeURIComponent(eventId) + '/roster', {
      _ts: Date.now()
    });
    const roster = await fetchJson(rosterUrl);
    names.push(...normalizeRosterPlayers(roster));
  }
  return unique(names);
}

function resolveNeededVoices(names, fixedMap, rootDir) {
  const existing = [];
  const skipped = [];
  const missing = [];
  const required = new Map();

  function ensure(name, text) {
    const currentPath = fixedMap[name];
    if (currentPath) {
      const full = absoluteAudioPath(rootDir, currentPath);
      if (fileExistsNonEmpty(full)) {
        existing.push({ name, path: currentPath });
        return;
      }
    }
    if (!required.has(name)) {
      const audioPath = currentPath || audioPathForName(name);
      required.set(name, {
        name,
        text: text || name,
        lang: detectNameLanguage(text || name),
        path: audioPath
      });
    }
  }

  for (const rawName of names) {
    const name = String(rawName || '').trim();
    if (!name) continue;
    const suffix = splitEnglishSuffix(name);
    if (suffix) {
      ensure(suffix.base, suffix.base);
      if (fixedMap[suffix.suffix] && fileExistsNonEmpty(absoluteAudioPath(rootDir, fixedMap[suffix.suffix]))) {
        skipped.push({ name: suffix.suffix, reason: 'shared suffix' });
      } else {
        ensure(suffix.suffix, suffix.suffix);
      }
      continue;
    }
    ensure(name, name);
  }

  required.forEach((item) => missing.push(item));
  return { existing, skipped, missing };
}

function edgeArgsFor(item) {
  const isEnglish = item.lang === 'en';
  const voice = isEnglish ? 'en-US-AriaNeural' : 'zh-TW-HsiaoChenNeural';
  const args = ['-m', 'edge_tts', '--voice', voice, '--text', item.text, '--write-media', item.output];
  if (isEnglish) args.push('--rate=-20%');
  return args;
}

function generateWithEdgeTts(item) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(item.output), { recursive: true });
    const child = spawn('python', edgeArgsFor(item), { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('edge_tts failed for ' + item.name + ' exit ' + code));
    });
  });
}

function updateIndexMapping(indexPath, fixedMap, generated) {
  if (!generated.length) return false;
  const source = fs.readFileSync(indexPath, 'utf8');
  const nextMap = Object.assign({}, fixedMap);
  generated.forEach((item) => {
    nextMap[item.name] = item.path;
  });
  const entries = Object.keys(nextMap).map((name) => "      '" + escapeJsString(name) + "':'" + escapeJsString(nextMap[name]) + "'");
  const replacement = 'names:{\n' + entries.join(',\n') + '\n    },\n    courtPhrases:';
  const nextSource = source.replace(/names:\{\s*[\s\S]*?\s*\},\s*courtPhrases:/, replacement);
  if (nextSource === source) return false;
  fs.writeFileSync(indexPath, nextSource, 'utf8');
  return true;
}

async function syncVoices(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const indexPath = options.indexPath || path.join(rootDir, 'index.html');
  const source = fs.readFileSync(indexPath, 'utf8');
  const config = {
    site: extractConst(source, 'ROSTER_SITE'),
    apiBase: extractConst(source, 'SHUTTLE_ROSTER_API_BASE')
  };
  const fixedMap = extractFixedNameMap(source);
  const fetchJson = options.fetchJson || defaultFetchJson;
  const generateAudio = options.generateAudio || generateWithEdgeTts;
  const names = options.names || await fetchCurrentRosterNames(config, fetchJson);
  const plan = resolveNeededVoices(names, fixedMap, rootDir);
  const generated = [];
  const failed = [];

  for (const item of plan.missing) {
    const output = absoluteAudioPath(rootDir, item.path);
    const task = Object.assign({}, item, { output });
    if (fileExistsNonEmpty(output)) {
      generated.push(item);
      continue;
    }
    try {
      await generateAudio(task);
      if (!fileExistsNonEmpty(output)) throw new Error('generated file is empty or missing');
      generated.push(item);
    } catch (err) {
      failed.push({ name: item.name, path: item.path, error: err.message });
    }
  }

  const mappingChanged = updateIndexMapping(indexPath, fixedMap, generated);
  return {
    rosterSource: config.site,
    names,
    existing: plan.existing,
    skipped: plan.skipped,
    generated,
    failed,
    mappingChanged
  };
}

function parseCliArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--names') {
      options.names = parseNames(argv[i + 1] || '');
      i += 1;
    } else if (arg.indexOf('--names=') === 0) {
      options.names = parseNames(arg.slice('--names='.length));
    } else if (arg === '--names-file') {
      options.names = parseNames(fs.readFileSync(argv[i + 1], 'utf8'));
      i += 1;
    } else if (arg.indexOf('--names-file=') === 0) {
      options.names = parseNames(fs.readFileSync(arg.slice('--names-file='.length), 'utf8'));
    }
  }
  return options;
}

function parseNames(raw) {
  return unique(String(raw || '')
    .split(/[\r\n,，、]+/)
    .map((name) => name.replace(/^\s*\[(.*)\]\s*$/, '$1').trim())
    .filter(Boolean));
}

function printSummary(result) {
  console.log('ROSTER SOURCE: ' + result.rosterSource);
  console.log('ROSTER NAMES: ' + result.names.join(', '));
  console.log('EXISTING: ' + (result.existing.map((item) => item.name).join(', ') || 'NONE'));
  console.log('GENERATED: ' + (result.generated.map((item) => item.name + ' -> ' + item.path).join(', ') || 'NONE'));
  console.log('SKIPPED: ' + (result.skipped.map((item) => item.name + ' (' + item.reason + ')').join(', ') || 'NONE'));
  console.log('FAILED: ' + (result.failed.map((item) => item.name + ' (' + item.error + ')').join(', ') || 'NONE'));
  console.log('MAPPING CHANGES: ' + (result.mappingChanged ? 'YES' : 'NO'));
}

if (require.main === module) {
  syncVoices(parseCliArgs(process.argv.slice(2)))
    .then((result) => {
      printSummary(result);
      if (result.failed.length) process.exitCode = 1;
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}

module.exports = {
  detectNameLanguage,
  splitEnglishSuffix,
  audioPathForName,
  parseNames,
  resolveNeededVoices,
  syncVoices
};
