const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  detectNameLanguage,
  splitEnglishSuffix,
  audioPathForName,
  parseNames,
  resolveNeededVoices,
  syncVoices
} = require('./voice-sync');

function assert(name, condition) {
  if (!condition) throw new Error('FAIL: ' + name);
  console.log('OK: ' + name);
}

function writeFile(filePath, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body);
}

function writeMp3(rootDir, relativePath) {
  writeFile(path.join(rootDir, 'voice-poc', relativePath.replace(/\//g, path.sep)), Buffer.from([1, 2, 3]));
}

async function run() {
  assert('Chinese names detect zh', detectNameLanguage('雅雯') === 'zh');
  assert('English names detect en', detectNameLanguage('Ariel') === 'en');
  assert('mixed names prioritize zh', detectNameLanguage('Amy王') === 'zh');
  assert('English suffix splits', splitEnglishSuffix('Jerry 哥').base === 'Jerry');
  assert('English mp3 path uses Aria rate minus20', audioPathForName('Bobo') === 'en-US-AriaNeural/rate-test/bobo-rate-minus20.mp3');
  assert('manual names parse comma newline brackets', parseNames('Bobo, Astin\n[Ariel]、Jerry').join('|') === 'Bobo|Astin|Ariel|Jerry');

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-sync-'));
  const fixedMap = {
    'Chris': 'en-US-AriaNeural/rate-test/chris-rate-minus20.mp3',
    '哥': 'zh-TW-HsiaoChenNeural/ge.mp3',
    '姊': 'zh-TW-HsiaoChenNeural/jie.mp3'
  };
  writeMp3(rootDir, fixedMap.Chris);
  writeMp3(rootDir, fixedMap['哥']);
  writeMp3(rootDir, fixedMap['姊']);

  const plan = resolveNeededVoices(['Chris', 'Bobo', 'Astin', '雅雯', 'Jerry 哥', 'Amy 姊'], fixedMap, rootDir);
  assert('existing asset is skipped from missing', plan.existing.some((item) => item.name === 'Chris') && !plan.missing.some((item) => item.name === 'Chris'));
  assert('missing English generates base name', plan.missing.some((item) => item.name === 'Bobo' && item.path === 'en-US-AriaNeural/rate-test/bobo-rate-minus20.mp3'));
  assert('missing Chinese generates HsiaoChen path', plan.missing.some((item) => item.name === '雅雯' && item.path.indexOf('zh-TW-HsiaoChenNeural/') === 0));
  assert('English suffix generates base only', plan.missing.some((item) => item.name === 'Jerry') && !plan.missing.some((item) => item.name === 'Jerry 哥'));
  assert('shared ge jie do not regenerate', !plan.missing.some((item) => item.name === '哥') && !plan.missing.some((item) => item.name === '姊'));

  const indexPath = path.join(rootDir, 'index.html');
  writeFile(indexPath, `
    const ROSTER_SITE = 'rian';
    const SHUTTLE_ROSTER_API_BASE = 'https://example.test/api';
    const FIXED_AUDIO = {
      names:{
        'Chris':'en-US-AriaNeural/rate-test/chris-rate-minus20.mp3',
        '哥':'zh-TW-HsiaoChenNeural/ge.mp3',
        '姊':'zh-TW-HsiaoChenNeural/jie.mp3'
      },
      courtPhrases:{}
    };
  `);
  writeMp3(rootDir, 'en-US-AriaNeural/rate-test/chris-rate-minus20.mp3');
  writeMp3(rootDir, 'zh-TW-HsiaoChenNeural/ge.mp3');
  writeMp3(rootDir, 'zh-TW-HsiaoChenNeural/jie.mp3');

  const generated = [];
  const first = await syncVoices({
    rootDir,
    indexPath,
    names: ['Chris', 'Bobo', '雅雯', 'Jerry 哥'],
    generateAudio: async (item) => {
      generated.push({ name: item.name, argsPath: item.path, output: item.output, lang: item.lang });
      writeFile(item.output, Buffer.from([9, 9, 9, 9]));
    }
  });
  assert('sync generates missing files', first.failed.length === 0 && generated.length === 3);
  assert('generated mp3 files are non-empty', generated.every((item) => fs.statSync(item.output).size > 0));
  assert('sync updates mapping for generated names', /'Bobo':'en-US-AriaNeural\/rate-test\/bobo-rate-minus20\.mp3'/.test(fs.readFileSync(indexPath, 'utf8')));
  assert('English generation marked en', generated.some((item) => item.name === 'Bobo' && item.lang === 'en'));
  assert('Chinese generation marked zh', generated.some((item) => item.name === '雅雯' && item.lang === 'zh'));

  generated.length = 0;
  const second = await syncVoices({
    rootDir,
    indexPath,
    names: ['Chris', 'Bobo', '雅雯', 'Jerry 哥'],
    generateAudio: async (item) => {
      generated.push(item);
      writeFile(item.output, Buffer.from([8]));
    }
  });
  assert('second run does not regenerate', second.failed.length === 0 && generated.length === 0 && second.generated.length === 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
