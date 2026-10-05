/* Gables Guitar Studio — the drill book's back end (Google Apps Script)
   ──────────────────────────────────────────────────────────────────────
   One-time setup (about five minutes):
     1. Create a blank Google Sheet (any name, e.g. "Studio Drills").
     2. In the sheet: Extensions → Apps Script. Delete what is there, paste this whole file, and save.
     3. Change PASSPHRASE below to a phrase only you know. The Drill Designer and the Studio Overview ask for it.
     4. Deploy → New deployment → gear icon → Web app.
          Execute as: Me        Who has access: Anyone
        Click Deploy, allow the permissions Google asks for (it is your own script, writing to your own sheet).
     5. Copy the "Web app URL" (it ends in /exec) and send it to Claude.
   If you ever edit this script, use Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy,
   so the URL stays the same.

   The sheet gets three tabs, made automatically on first use:
     Students — one row per student: id (the private link), name, date added
     Drills   — one row per assigned drill: id, student id, date, exercise number, title, settings, notes
     Checks   — one row per ticked practice day: student id, drill id, week (Monday's date), day 0–6 (Mon–Sun)
     Opens    — one row per drill per day it was opened on a student's device: times opened, seconds played, seconds open
                (only for students who switched practice tracking on, from their own page — the Students tab's 'tracking' column)
   Rows can be read, sorted or deleted by hand; deleting a student's rows removes them from every page. */

var PASSPHRASE = 'change-me';

function doGet(e)  { return handle_(e && e.parameter ? e.parameter : {}); }
function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad request' }); }
  return handle_(p);
}

function handle_(p) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var a = p.action;
    if (a === 'student') return out_(student_(p.sid));
    if (a === 'drill')   return out_(drill_(p.did));
    if (a === 'check')   return out_(check_(p));
    if (a === 'open')    return out_(open_(p));
    if (a === 'optin')   return out_(optin_(p));
    /* everything below is the teacher's */
    if (p.pass !== PASSPHRASE) return out_({ ok: false, error: 'wrong passphrase' });
    if (a === 'ping')     return out_({ ok: true });
    if (a === 'students') return out_({ ok: true, students: rows_('Students').map(function (r) { return { sid: r[0], name: r[1] }; }) });
    if (a === 'assign')   return out_(assign_(p));
    if (a === 'overview') return out_(overview_());
    if (a === 'update')   return out_(update_(p));
    if (a === 'remove')   return out_(remove_(p));
    return out_({ ok: false, error: 'unknown action' });
  } finally { lock.releaseLock(); }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

var HEAD = { Students: ['sid', 'name', 'added', 'tracking'], Drills: ['did', 'sid', 'date', 'ex', 'title', 'params', 'notes', 'added'], Checks: ['sid', 'did', 'week', 'day', 'at'],
             Opens: ['sid', 'did', 'date', 'week', 'day', 'opens', 'playSecs', 'openSecs', 'last'] };
function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(HEAD[name]); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < HEAD[name].length) sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]);   /* a column added in a later version */
  return sh;
}
function rows_(name) { var v = sheet_(name).getDataRange().getValues(); v.shift(); return v; }
function id_(n) { var c = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length)); return s; }
function day_(d) { return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }

function assign_(p) {
  var name = String(p.student || '').trim(); if (!name) return { ok: false, error: 'no student name' };
  var st = rows_('Students'), sid = null;
  for (var i = 0; i < st.length; i++) if (String(st[i][1]).trim().toLowerCase() === name.toLowerCase()) { sid = st[i][0]; name = st[i][1]; break; }
  if (!sid) { sid = id_(10); sheet_('Students').appendRow([sid, name, new Date()]); }
  var mine = rows_('Drills').filter(function (r) { return r[1] === sid; });
  var ex = p.ex ? Number(p.ex) : mine.length + 1;
  var did = id_(8);
  sheet_('Drills').appendRow([did, sid, p.date || day_(new Date()), ex, p.title || '', JSON.stringify(p.params || {}), p.notes || '', new Date()]);
  return { ok: true, sid: sid, did: did, ex: ex, name: name };
}

function drillObj_(r) {
  var params = {}; try { params = JSON.parse(r[5]); } catch (e) {}
  return { did: r[0], sid: r[1], date: r[2] instanceof Date ? day_(r[2]) : String(r[2]), ex: r[3], title: r[4], params: params, notes: r[6] };
}

function drill_(did) {
  var r = rows_('Drills').filter(function (r) { return r[0] === did; })[0];
  if (!r) return { ok: false, error: 'no such drill' };
  var d = drillObj_(r), st = rows_('Students').filter(function (x) { return x[0] === r[1]; })[0];
  d.track = !!(st && st[3] === true);   /* the student has chosen to have practice time recorded */
  return { ok: true, drill: d };
}

function checksFor_(sid) {
  return rows_('Checks').filter(function (r) { return !sid || r[0] === sid; }).map(function (r) {
    return { sid: r[0], did: r[1], week: r[2] instanceof Date ? day_(r[2]) : String(r[2]), day: Number(r[3]) };
  });
}

function student_(sid) {
  var s = rows_('Students').filter(function (r) { return r[0] === sid; })[0];
  if (!s) return { ok: false, error: 'no such student' };
  var drills = rows_('Drills').filter(function (r) { return r[1] === sid; }).map(drillObj_);
  return { ok: true, student: { sid: sid, name: s[1], track: s[3] === true }, drills: drills, checks: checksFor_(sid), opens: opensFor_(sid) };
}

function check_(p) {
  var sid = p.sid, did = p.did, week = String(p.week), d = Number(p.day);
  var ok = rows_('Drills').some(function (r) { return r[0] === did && r[1] === sid; });   /* a student can tick only their own drills */
  if (!ok || !(d >= 0 && d <= 6) || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return { ok: false, error: 'not allowed' };
  var sh = sheet_('Checks'), v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    var w = v[i][2] instanceof Date ? day_(v[i][2]) : String(v[i][2]);
    if (v[i][0] === sid && v[i][1] === did && w === week && Number(v[i][3]) === d) { if (!p.on) sh.deleteRow(i + 1); return { ok: true }; }
  }
  if (p.on) sh.appendRow([sid, did, "'" + week, d, new Date()]);
  return { ok: true };
}

function opensFor_(sid) {
  return rows_('Opens').filter(function (r) { return !sid || r[0] === sid; }).map(function (r) {
    return { sid: r[0], did: r[1], date: r[2] instanceof Date ? day_(r[2]) : String(r[2]), week: r[3] instanceof Date ? day_(r[3]) : String(r[3]), day: Number(r[4]), opens: Number(r[5]), play: Number(r[6]), open: Number(r[7]) };
  });
}

/* the student's own choice, from their page: record practice time or not */
function optin_(p) {
  var sh = sheet_('Students'), v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0] === p.sid) { sh.getRange(i + 1, 4).setValue(!!p.on); return { ok: true, track: !!p.on }; }
  return { ok: false, error: 'no such student' };
}

/* the teacher's corrections: change a drill (title, settings, notes, date, number), or remove it with its stars and practice rows */
function update_(p) {
  var sh = sheet_('Drills'), v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0] === p.did) {
    if (p.date) sh.getRange(i + 1, 3).setValue(p.date);
    if (p.ex) sh.getRange(i + 1, 4).setValue(Number(p.ex));
    if (p.title !== undefined) sh.getRange(i + 1, 5).setValue(p.title);
    if (p.params) sh.getRange(i + 1, 6).setValue(JSON.stringify(p.params));
    if (p.notes !== undefined) sh.getRange(i + 1, 7).setValue(p.notes);
    return { ok: true, did: p.did, sid: v[i][1] };
  }
  return { ok: false, error: 'no such drill' };
}
function remove_(p) {
  var found = false;
  ['Drills', 'Checks', 'Opens'].forEach(function (name) {
    var sh = sheet_(name), v = sh.getDataRange().getValues(), col = (name === 'Drills') ? 0 : 1;
    for (var i = v.length - 1; i >= 1; i--) if (v[i][col] === p.did) { sh.deleteRow(i + 1); if (name === 'Drills') found = true; }
  });
  return found ? { ok: true } : { ok: false, error: 'no such drill' };
}

function overview_() {
  var students = rows_('Students').map(function (r) { return { sid: r[0], name: r[1], track: r[3] === true }; });
  var drills = rows_('Drills').map(drillObj_);
  var opens = opensFor_(null);
  return { ok: true, students: students, drills: drills, checks: checksFor_(null), opens: opens };
}

/* a drill page opened on a student's device reports itself: once on opening (first), then the seconds played and open since its
   last report, whenever the page is hidden or closed. One row per drill per day; the numbers add up. */
function open_(p) {
  var did = String(p.did || ''), date = String(p.date || ''), week = String(p.week || ''), d = Number(p.day);
  var dr = rows_('Drills').filter(function (r) { return r[0] === did; })[0];
  var st = dr && rows_('Students').filter(function (x) { return x[0] === dr[1]; })[0];
  if (!st || st[3] !== true) return { ok: false, error: 'tracking is off' };
  if (!dr || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(week) || !(d >= 0 && d <= 6)) return { ok: false, error: 'not allowed' };
  var play = Math.max(0, Math.min(14400, Number(p.play) || 0)), open = Math.max(0, Math.min(14400, Number(p.open) || 0));
  var sh = sheet_('Opens'), v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    var dt = v[i][2] instanceof Date ? day_(v[i][2]) : String(v[i][2]);
    if (v[i][1] === did && dt === date) {
      sh.getRange(i + 1, 6, 1, 4).setValues([[Number(v[i][5]) + (p.first ? 1 : 0), Number(v[i][6]) + play, Number(v[i][7]) + open, new Date()]]);
      return { ok: true };
    }
  }
  sh.appendRow([dr[1], did, "'" + date, "'" + week, d, p.first ? 1 : 0, play, open, new Date()]);
  return { ok: true };
}
