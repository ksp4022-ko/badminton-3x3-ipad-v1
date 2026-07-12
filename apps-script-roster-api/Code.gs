/**
 * iPad V1 roster API
 * Purpose: expose read-only event roster data for the GitHub Pages iPad app.
 */

const API_VERSION = 'roster-api-20260712-1';
const DEFAULT_TENANT_SITE = 'rian';
const SHEET_EVENTS = 'Events';
const SHEET_SIGNUPS = 'Signups';
const TENANT_CONFIG = {
  rian: { name: '日安', spreadsheetId: '1S-aU4qGF6GAMS_9DXX2VAtYWY-29eRX4lzXzz5AGXsM' },
  kangxuan: { name: '康軒', spreadsheetId: '1EzXLw9zT2L0sImqsO41okqeS7yE_1pJYr7JxBdxYWmw' }
};

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const callback = String(params.callback || '').trim();
  const action = String(params.action || 'ping').trim();
  let payload;
  try {
    if (action === 'ping') payload = { ok: true, version: API_VERSION };
    else if (action === 'listEvents') payload = listOpenEvents_(params);
    else if (action === 'previewRoster') payload = previewRoster_(params);
    else throw new Error('Unknown action: ' + action);
  } catch (err) {
    payload = { ok: false, error: String(err && err.message ? err.message : err), version: API_VERSION };
  }
  return outputJson_(payload, callback);
}

function outputJson_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function listOpenEvents_(params) {
  const ss = getSpreadsheet_(params.site);
  const sheet = ss.getSheetByName(SHEET_EVENTS);
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, version: API_VERSION, site: DEFAULT_TENANT_SITE, events: [] };
  const table = readTable_(sheet);
  const closedWords = ['cancel', 'closed', 'done', '取消', '關閉', '結束'];
  const events = table.rows.map(function(row) {
    const eventId = String(firstNonEmpty_(row, ['eventid','id','聚會id','活動id']) || '').trim();
    const eventDate = firstNonEmpty_(row, ['eventdate','date','playdate','activitydate','日期','聚會日期','活動日期','開打日期']);
    const dateKey = normalizeDateKey_(eventDate);
    const title = String(firstNonEmpty_(row, ['eventname','name','title','聚會名稱','活動名稱','名稱']) || '').trim();
    const status = String(firstNonEmpty_(row, ['status','eventstatus','狀態','聚會狀態']) || '').trim();
    const isActive = firstNonEmpty_(row, ['isactive','active','開放','啟用']);
    const groupName = String(firstNonEmpty_(row, ['groupname','group','群組','組別']) || '').trim();
    const maxPeople = firstNonEmpty_(row, ['maxpeople','max','人數上限','名額']);
    return { eventId: eventId, date: dateKey, title: title, status: status, isActive: isActive, groupName: groupName, maxPeople: maxPeople };
  }).filter(function(event) {
    if (!event.eventId) return false;
    const status = String(event.status || '').toLowerCase();
    for (let i = 0; i < closedWords.length; i += 1) {
      if (status.indexOf(closedWords[i]) >= 0) return false;
    }
    if (event.isActive === false) return false;
    const activeText = String(event.isActive || '').trim().toLowerCase();
    if (activeText && ['false', 'no', '0', '否', '關閉'].indexOf(activeText) >= 0) return false;
    return true;
  }).sort(function(a, b) {
    return String(a.date || '').localeCompare(String(b.date || '')) || String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hant');
  });
  return { ok: true, version: API_VERSION, site: normalizeTenantSite_(params.site), events: events };
}

function previewRoster_(params) {
  const ss = getSpreadsheet_(params.site);
  const eventInfo = findEventById_(ss, params.eventId);
  if (!eventInfo) throw new Error('找不到選取聚會');
  const roster = readSignupRoster_(ss, eventInfo);
  return {
    ok: true,
    version: API_VERSION,
    site: normalizeTenantSite_(params.site),
    event: eventInfo.public,
    players: roster.included.map(function(item) {
      return { name: item.name };
    }),
    excluded: roster.excluded,
    warnings: roster.warnings
  };
}

function getSpreadsheet_(site) {
  const key = normalizeTenantSite_(site);
  return SpreadsheetApp.openById(TENANT_CONFIG[key].spreadsheetId);
}

function normalizeTenantSite_(site) {
  const key = String(site || DEFAULT_TENANT_SITE).trim().toLowerCase();
  return TENANT_CONFIG[key] ? key : DEFAULT_TENANT_SITE;
}

function findEventById_(ss, eventId) {
  const sheet = ss.getSheetByName(SHEET_EVENTS);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const targetId = String(eventId || '').trim();
  if (!targetId) return null;
  const table = readTable_(sheet);
  for (let i = 0; i < table.rows.length; i += 1) {
    const row = table.rows[i];
    const foundEventId = String(firstNonEmpty_(row, ['eventid','id','聚會id','活動id']) || '').trim();
    if (foundEventId !== targetId) continue;
    const eventDate = firstNonEmpty_(row, ['eventdate','date','playdate','activitydate','日期','聚會日期','活動日期','開打日期']);
    const dateKey = normalizeDateKey_(eventDate);
    const status = String(firstNonEmpty_(row, ['status','eventstatus','狀態','聚會狀態']) || '').trim();
    const title = String(firstNonEmpty_(row, ['eventname','name','title','聚會名稱','活動名稱','名稱']) || '').trim();
    return {
      eventId: foundEventId,
      dateKey: dateKey,
      title: title || '選取聚會',
      public: { eventId: foundEventId, date: dateKey || '', title: title || '選取聚會', status: status || '' }
    };
  }
  return null;
}

function readSignupRoster_(ss, eventInfo) {
  const sheet = ss.getSheetByName(SHEET_SIGNUPS);
  if (!sheet || sheet.getLastRow() < 2) throw new Error('找不到 Signups 分頁，或 Signups 沒有資料');
  const table = readTable_(sheet);
  const warnings = [];
  const included = [];
  const excluded = [];
  const targetEventId = eventInfo && eventInfo.eventId ? String(eventInfo.eventId).trim() : '';
  const targetDateKey = eventInfo && eventInfo.dateKey ? eventInfo.dateKey : '';

  table.rows.forEach(function(row, idx) {
    const signupEventId = String(firstNonEmpty_(row, ['eventid','activityid','聚會id','活動id']) || '').trim();
    const signupDateKey = normalizeDateKey_(firstNonEmpty_(row, ['eventdate','date','playdate','activitydate','日期','聚會日期','活動日期','開打日期']));
    const matchEvent = targetEventId ? signupEventId === targetEventId : (signupDateKey && signupDateKey === targetDateKey);
    if (!matchEvent) return;

    const name = String(firstNonEmpty_(row, ['membername','name','playername','displayname','姓名','球員姓名','成員姓名','報名姓名']) || '').trim();
    if (!name) {
      excluded.push({ name: '', reason: '姓名空白', row: idx + 2 });
      return;
    }
    const status = String(firstNonEmpty_(row, ['signupstatus','status','state','報名狀態','狀態']) || '').trim();
    const type = String(firstNonEmpty_(row, ['membertype','type','signupType','身份','類型','報名類型']) || '').trim();
    const order = Number(firstNonEmpty_(row, ['orderno','order','signuporder','seq','排序','順位']) || 999);
    const decision = classifySignup_(status, type);
    const item = { name: name, status: status, type: type, order: order };
    if (decision.include) included.push(item);
    else excluded.push({ name: name, status: status, type: type, order: order, reason: decision.reason });
  });

  included.sort(function(a, b) {
    return Number(a.order || 999) - Number(b.order || 999) || String(a.name).localeCompare(String(b.name), 'zh-Hant');
  });
  if (!included.length) warnings.push('正式名單為空，請確認 Events / Signups 欄位或報名狀態文字。');
  return { included: included, excluded: excluded, warnings: warnings };
}

function classifySignup_(status, type) {
  const text = String(status || '') + ' ' + String(type || '');
  const lower = text.toLowerCase().replace(/\s+/g, ' ');
  if (/(取消|cancel|deleted|remove|退出|退報)/i.test(lower)) return { include: false, reason: '取消' };
  if (/(請假|leave|absent|off)/i.test(lower)) return { include: false, reason: '請假' };
  if (/(候補|wait|waiting|backup)/i.test(lower)) return { include: false, reason: '候補未匯入' };
  if (!lower.trim()) return { include: true, reason: '狀態空白，預設匯入' };
  if (/(正式|已報名|成功|出席|confirmed|confirm|registered|active|present|臨打|季打)/i.test(lower)) return { include: true, reason: '正式出席' };
  return { include: false, reason: '非正式狀態' };
}

function readTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], rows: [] };
  const rawHeaders = values[0].map(function(v) { return String(v || '').trim(); });
  const keys = rawHeaders.map(normalizeHeader_);
  const rows = [];
  for (let r = 1; r < values.length; r += 1) {
    const obj = {};
    let hasValue = false;
    for (let c = 0; c < keys.length; c += 1) {
      if (!keys[c]) continue;
      const value = values[r][c];
      if (value !== '' && value != null) hasValue = true;
      obj[keys[c]] = value;
      obj[rawHeaders[c]] = value;
    }
    if (hasValue) rows.push(obj);
  }
  return { headers: rawHeaders, rows: rows };
}

function normalizeHeader_(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s_\-\/\\()（）［］\[\]：:]/g, '');
}

function firstNonEmpty_(row, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const k = normalizeHeader_(keys[i]);
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    if (row[keys[i]] !== undefined && row[keys[i]] !== null && row[keys[i]] !== '') return row[keys[i]];
  }
  return '';
}

function normalizeDateKey_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(value).trim();
  if (!s) return '';
  const m = s.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  const d = new Date(s);
  if (!isNaN(d)) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return '';
}
