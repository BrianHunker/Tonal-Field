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
   Email: the first time, pick "authorize" in the function menu at the top of the editor and press Run, and allow
   Google to send email as you. That is what lets the Overview and the Designer email a student their page.

   The sheet's tabs, made automatically on first use (new columns are added to old tabs by themselves):
     Students   — one row per student: id (the private link), first name, date added, tracking, instrument, hand, email,
                  phone, about (the student's own words), since (the date lessons began), last name, status ('current'
                  or 'former'), lesson day (0–6, Mon–Sun, or blank), lesson time (HH:MM, or blank), routineAt (when the
                  teacher last assigned, changed, retired or removed one of their items). The student's own page shows
                  only the first name; the Designer and the Overview show both.
     Drills     — one row per item of a student's routine: id, student id, date, number, title, settings, notes, added,
                  status (blank while it is in the routine, 'retired' once it is not). The settings say what the item is:
                  a drill (built in the Designer), a song from the student's repertoire, or any other assignment.
     Checks     — one row per starred practice day: student id, item id, week (Monday's date), day 0–6 (Mon–Sun)
     Opens      — one row per item per day it was played on a student's device: times opened, seconds played, seconds open
                  (only for students who switched practice tracking on, from their own page — the Students tab's 'tracking')
     Routines   — one row per saved routine: id, student id, name, its items (ids), date saved
     Repertoire — one row per song: id, student id, title, artist, lesson (a Tonal Field page, if it has one), status
                  ('learning' or 'done'), started, finished, added
   Rows can be read, sorted or deleted by hand. Email, phone and last name are never sent to the student pages. */

var PASSPHRASE = 'change-me';

function authorize() { MailApp.getRemainingDailyQuota(); }   /* run once from the editor to allow email */

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
    /* the student's page: anyone holding the student's private link */
    if (a === 'student') return out_(student_(p.sid));
    if (a === 'drill')   return out_(drill_(p.did));
    if (a === 'check')   return out_(check_(p));
    if (a === 'open')    return out_(open_(p));
    if (a === 'optin')   return out_(optin_(p));
    if (a === 'about')   return out_(about_(p));
    if (a === 'song')    return out_(song_(p));
    if (a === 'routine') return out_(routine_(p));
    /* everything below is the teacher's */
    if (p.pass !== PASSPHRASE) return out_({ ok: false, error: 'wrong passphrase' });
    if (a === 'ping')     return out_({ ok: true });
    if (a === 'students') return out_({ ok: true, students: rows_('Students').map(function (r) { return profile_(r, true); }) });
    if (a === 'assign')   return out_(assign_(p));
    if (a === 'overview') return out_(overview_());
    if (a === 'update')   return out_(update_(p));
    if (a === 'remove')   return out_(remove_(p));
    if (a === 'profile')  return out_(setProfile_(p));
    if (a === 'notify')   return out_(notify_(p));
    return out_({ ok: false, error: 'unknown action' });
  } finally { lock.releaseLock(); }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

var HEAD = { Students: ['sid', 'first', 'added', 'tracking', 'instrument', 'hand', 'email', 'phone', 'about', 'since', 'last', 'status', 'day', 'time', 'routineAt', 'routine'],
             Drills: ['did', 'sid', 'date', 'ex', 'title', 'params', 'notes', 'added', 'status'],
             Checks: ['sid', 'did', 'week', 'day', 'at'],
             Opens: ['sid', 'did', 'date', 'week', 'day', 'opens', 'playSecs', 'openSecs', 'last'],
             Repertoire: ['rid', 'sid', 'title', 'artist', 'lesson', 'status', 'started', 'finished', 'added'],
             Routines: ['rtid', 'sid', 'name', 'items', 'saved'] };
function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(HEAD[name]); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < HEAD[name].length) sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]);   /* a column added in a later version */
  return sh;
}
function rows_(name) { var v = sheet_(name).getRange(1, 1, Math.max(1, sheet_(name).getLastRow()), HEAD[name].length).getValues(); v.shift(); return v.filter(function (r) { return r[0] !== ''; }); }
function id_(n) { var c = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length)); return s; }
function day_(d) { return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function ds_(v) { return v instanceof Date ? day_(v) : String(v || ''); }   /* a date cell as yyyy-mm-dd */
function str_(v, n) { return String(v == null ? '' : v).slice(0, n || 200); }
function rowOf_(name, col, val) { var v = sheet_(name).getDataRange().getValues(); for (var i = 1; i < v.length; i++) if (v[i][col] === val) return i + 1; return 0; }
var INST = ['guitar', 'bass', 'keyboard'];

/* a student row as an object: the student sees their first name; the teacher, the full name and contact details */
function hhmm_(v) { if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm'); v = String(v || ''); return /^\d{1,2}:\d{2}$/.test(v) ? v : ''; }
function stamp_(d) { return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm"); }
/* the routine changed: the Overview can sort students by when the teacher last touched their routine */
function touch_(sid) { var i = rowOf_('Students', 0, sid); if (i) sheet_('Students').getRange(i, 15).setValue(new Date()); }
function full_(r) { return (String(r[1] || '').trim() + ' ' + String(r[10] || '').trim()).trim(); }
function split_(n) { n = String(n || '').trim().replace(/\s+/g, ' '); var i = n.indexOf(' '); return i < 0 ? [n, ''] : [n.slice(0, i), n.slice(i + 1)]; }
function profile_(r, teacher) {
  var o = { sid: r[0], name: String(r[1] || '').trim(), track: r[3] === true, inst: INST.indexOf(r[4]) >= 0 ? r[4] : 'guitar', hand: r[5] === 'left' ? 'left' : 'right',
            about: String(r[8] || ''), since: ds_(r[9]) || ds_(r[2]), routine: String(r[15] || '') };
  if (teacher) { o.status = r[11] === 'former' ? 'former' : 'current'; o.day = (r[12] === '' || r[12] == null) ? '' : Number(r[12]); o.time = hhmm_(r[13]);
    o.routineAt = r[14] instanceof Date ? stamp_(r[14]) : String(r[14] || ''); o.first = o.name; o.last = String(r[10] || '').trim(); o.name = full_(r); o.email = String(r[6] || ''); o.phone = String(r[7] || ''); }
  return o;
}

function assign_(p) {
  var name = String(p.student || '').trim().replace(/\s+/g, ' '); if (!name && !p.sid) return { ok: false, error: 'no student name' };
  var st = rows_('Students'), sid = null, inst = 'guitar';
  for (var i = 0; i < st.length; i++) if (p.sid ? st[i][0] === p.sid : full_(st[i]).toLowerCase() === name.toLowerCase()) { sid = st[i][0]; name = full_(st[i]); inst = profile_(st[i]).inst; break; }
  if (p.sid && !sid) return { ok: false, error: 'no such student' };
  if (!sid) {   /* a new student, "First Last": their instrument and hand come with the first assignment */
    var nm = split_(name); sid = id_(10); inst = INST.indexOf(p.inst) >= 0 ? p.inst : 'guitar';
    sheet_('Students').appendRow([sid, nm[0], new Date(), false, inst, p.hand === 'left' ? 'left' : 'right', '', '', '', "'" + day_(new Date()), nm[1], 'current', '', '', '']);
  }
  var mine = rows_('Drills').filter(function (r) { return r[1] === sid; });
  var ex = p.ex ? Number(p.ex) : mine.length + 1;
  var did = id_(8);
  sheet_('Drills').appendRow([did, sid, p.date || day_(new Date()), ex, p.title || '', JSON.stringify(p.params || {}), p.notes || '', new Date(), '']);
  touch_(sid);
  return { ok: true, sid: sid, did: did, ex: ex, name: name, inst: inst };
}

function drillObj_(r) {
  var params = {}; try { params = JSON.parse(r[5]); } catch (e) {}
  return { did: r[0], sid: r[1], date: ds_(r[2]), ex: r[3], title: r[4], params: params, notes: r[6], status: String(r[8] || '') };
}

/* one item, for the page that plays it: with the student's instrument, hand and tracking, and its song if it is one */
function drill_(did) {
  var r = rows_('Drills').filter(function (r) { return r[0] === did; })[0];
  if (!r) return { ok: false, error: 'no such drill' };
  var d = drillObj_(r), st = rows_('Students').filter(function (x) { return x[0] === r[1]; })[0], pr = st ? profile_(st) : {};
  d.track = !!pr.track; d.hand = pr.hand || 'right'; d.inst = pr.inst || 'guitar';
  if (d.params.kind === 'song') { var s = songsFor_(r[1]).filter(function (x) { return x.rid === d.params.rid; })[0]; if (s) d.song = s; }
  return { ok: true, drill: d };
}

function checksFor_(sid) {
  return rows_('Checks').filter(function (r) { return !sid || r[0] === sid; }).map(function (r) {
    return { sid: r[0], did: r[1], week: ds_(r[2]), day: Number(r[3]) };
  });
}
function songsFor_(sid) {
  return rows_('Repertoire').filter(function (r) { return !sid || r[1] === sid; }).map(function (r) {
    return { rid: r[0], sid: r[1], title: r[2], artist: r[3], lesson: r[4], status: r[5] === 'done' ? 'done' : 'learning', started: ds_(r[6]), finished: ds_(r[7]) };
  });
}

function student_(sid) {
  var s = rows_('Students').filter(function (r) { return r[0] === sid; })[0];
  if (!s) return { ok: false, error: 'no such student' };
  var drills = rows_('Drills').filter(function (r) { return r[1] === sid; }).map(drillObj_);
  return { ok: true, student: profile_(s), drills: drills, checks: checksFor_(sid), opens: opensFor_(sid), songs: songsFor_(sid), routines: routinesFor_(sid) };
}

function check_(p) {
  var sid = p.sid, did = p.did, week = String(p.week), d = Number(p.day);
  var ok = rows_('Drills').some(function (r) { return r[0] === did && r[1] === sid; });   /* a student can star only their own items */
  if (!ok || !(d >= 0 && d <= 6) || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return { ok: false, error: 'not allowed' };
  var sh = sheet_('Checks'), v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    if (v[i][0] === sid && v[i][1] === did && ds_(v[i][2]) === week && Number(v[i][3]) === d) { if (!p.on) sh.deleteRow(i + 1); return { ok: true }; }
  }
  if (p.on) sh.appendRow([sid, did, "'" + week, d, new Date()]);
  return { ok: true };
}

function opensFor_(sid) {
  return rows_('Opens').filter(function (r) { return !sid || r[0] === sid; }).map(function (r) {
    return { sid: r[0], did: r[1], date: ds_(r[2]), week: ds_(r[3]), day: Number(r[4]), opens: Number(r[5]), play: Number(r[6]), open: Number(r[7]) };
  });
}

/* the student's own choices, from their page: record practice time or not; their about; their repertoire */
function optin_(p) {
  var i = rowOf_('Students', 0, p.sid); if (!i) return { ok: false, error: 'no such student' };
  sheet_('Students').getRange(i, 4).setValue(!!p.on); return { ok: true, track: !!p.on };
}
function about_(p) {
  var i = rowOf_('Students', 0, p.sid); if (!i) return { ok: false, error: 'no such student' };
  var t = str_(p.text, 2000); sheet_('Students').getRange(i, 9).setValue(t); return { ok: true, about: t };
}
/* routines: the items in the routine now have a name (the student's or the teacher's); a routine can be saved under its name
   and recalled later — recalling brings its items back into the routine and moves the others to Earlier items (nothing is
   deleted: stars and practice time stay with each item) */
function routinesFor_(sid) {
  return rows_('Routines').filter(function (r) { return !sid || r[1] === sid; }).map(function (r) {
    var items = []; try { items = JSON.parse(r[3]); } catch (e) {}
    return { rtid: r[0], sid: r[1], name: String(r[2] || ''), items: items, saved: ds_(r[4]) };
  });
}
function routine_(p) {
  var si = rowOf_('Students', 0, p.sid); if (!si) return { ok: false, error: 'no such student' };
  var st = sheet_('Students'), name = str_(p.name, 80).trim(), today = "'" + day_(new Date());
  var mine = rows_('Drills').filter(function (r) { return r[1] === p.sid; });
  if (p.op === 'name') { st.getRange(si, 16).setValue(name); }
  else if (p.op === 'save') {
    if (!name) return { ok: false, error: 'give the routine a name' };
    var items = mine.filter(function (r) { return String(r[8] || '') !== 'retired'; }).map(function (r) { return r[0]; });
    if (!items.length) return { ok: false, error: 'the routine is empty' };
    var sh = sheet_('Routines'), v = sh.getDataRange().getValues(), done = false;
    for (var i = 1; i < v.length; i++) if (v[i][1] === p.sid && String(v[i][2]).toLowerCase() === name.toLowerCase()) { sh.getRange(i + 1, 3, 1, 3).setValues([[name, JSON.stringify(items), today]]); done = true; break; }
    if (!done) sh.appendRow([id_(8), p.sid, name, JSON.stringify(items), today]);
    st.getRange(si, 16).setValue(name);
  }
  else if (p.op === 'recall') {
    var rt = routinesFor_(p.sid).filter(function (r) { return r.rtid === p.rtid; })[0]; if (!rt) return { ok: false, error: 'no such routine' };
    var keep = {}; rt.items.forEach(function (d) { keep[d] = 1; });
    var dsh = sheet_('Drills'), dv = dsh.getDataRange().getValues();
    for (var j = 1; j < dv.length; j++) if (dv[j][1] === p.sid) { var want = keep[dv[j][0]] ? '' : 'retired'; if (String(dv[j][8] || '') !== want) dsh.getRange(j + 1, 9).setValue(want); }
    st.getRange(si, 16).setValue(rt.name);
  }
  else if (p.op === 'delete') {
    var rsh = sheet_('Routines'), rv = rsh.getDataRange().getValues();
    for (var k = rv.length - 1; k >= 1; k--) if (rv[k][0] === p.rtid && rv[k][1] === p.sid) rsh.deleteRow(k + 1);
  }
  else return { ok: false, error: 'unknown routine action' };
  var r2 = rows_('Students').filter(function (x) { return x[0] === p.sid; })[0];
  return { ok: true, routine: String(r2[15] || ''), routines: routinesFor_(p.sid), drills: rows_('Drills').filter(function (r) { return r[1] === p.sid; }).map(drillObj_) };
}
function song_(p) {
  if (!rowOf_('Students', 0, p.sid)) return { ok: false, error: 'no such student' };
  var sh = sheet_('Repertoire'), lesson = /^lessons\/[\w-]+\.html$/.test(String(p.lesson || '')) ? p.lesson : '', today = "'" + day_(new Date());
  if (p.rid) {
    var v = sh.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) if (v[i][0] === p.rid && v[i][1] === p.sid) {
      if (p.remove) { sh.deleteRow(i + 1); return { ok: true, songs: songsFor_(p.sid) }; }
      if (p.title !== undefined) sh.getRange(i + 1, 3).setValue(str_(p.title, 120));
      if (p.artist !== undefined) sh.getRange(i + 1, 4).setValue(str_(p.artist, 120));
      if (p.lesson !== undefined) sh.getRange(i + 1, 5).setValue(lesson);
      if (p.status === 'done' || p.status === 'learning') { sh.getRange(i + 1, 6).setValue(p.status); sh.getRange(i + 1, 8).setValue(p.status === 'done' ? today : ''); }
      return { ok: true, songs: songsFor_(p.sid), rid: p.rid };
    }
    return { ok: false, error: 'no such song' };
  }
  var title = str_(p.title, 120).trim(); if (!title) return { ok: false, error: 'no title' };
  var rid = id_(8), done = p.status === 'done';
  sh.appendRow([rid, p.sid, title, str_(p.artist, 120), lesson, done ? 'done' : 'learning', today, done ? today : '', new Date()]);
  return { ok: true, songs: songsFor_(p.sid), rid: rid };
}

/* the teacher's corrections: change an item (title, settings, notes, date, number, retired or not), or remove it with its
   stars and practice rows */
function update_(p) {
  var i = rowOf_('Drills', 0, p.did); if (!i) return { ok: false, error: 'no such drill' };
  var sh = sheet_('Drills');
  if (p.date) sh.getRange(i, 3).setValue(p.date);
  if (p.ex) sh.getRange(i, 4).setValue(Number(p.ex));
  if (p.title !== undefined) sh.getRange(i, 5).setValue(p.title);
  if (p.params) sh.getRange(i, 6).setValue(JSON.stringify(p.params));
  if (p.notes !== undefined) sh.getRange(i, 7).setValue(p.notes);
  if (p.status !== undefined) sh.getRange(i, 9).setValue(p.status === 'retired' ? 'retired' : '');
  var sid = sh.getRange(i, 2).getValue(); touch_(sid);
  return { ok: true, did: p.did, sid: sid };
}
function remove_(p) {
  var found = false, dr = rows_('Drills').filter(function (r) { return r[0] === p.did; })[0]; if (dr) touch_(dr[1]);
  ['Drills', 'Checks', 'Opens'].forEach(function (name) {
    var sh = sheet_(name), v = sh.getDataRange().getValues(), col = (name === 'Drills') ? 0 : 1;
    for (var i = v.length - 1; i >= 1; i--) if (v[i][col] === p.did) { sh.deleteRow(i + 1); if (name === 'Drills') found = true; }
  });
  return found ? { ok: true } : { ok: false, error: 'no such drill' };
}
/* a student's profile, from the Overview: a new student when there is no id */
function setProfile_(p) {
  var first = str_(p.first, 60).trim(), last = str_(p.last, 60).trim(), name = (first + ' ' + last).trim(); if (!first) return { ok: false, error: 'no first name' };
  var inst = INST.indexOf(p.inst) >= 0 ? p.inst : 'guitar', hand = p.hand === 'left' ? 'left' : 'right';
  var status = p.status === 'former' ? 'former' : 'current', day = /^[0-6]$/.test(String(p.day)) ? Number(p.day) : '', time = /^\d{1,2}:\d{2}$/.test(String(p.time || '')) ? "'" + p.time : '';
  var email = str_(p.email, 120).trim(), phone = str_(p.phone, 40).trim(), since = /^\d{4}-\d{2}-\d{2}$/.test(String(p.since || '')) ? "'" + p.since : '';
  var clash = rows_('Students').filter(function (r) { return r[0] !== p.sid && full_(r).toLowerCase() === name.toLowerCase(); })[0];
  if (clash) return { ok: false, error: 'another student already has that first and last name' };
  var sh = sheet_('Students');
  if (!p.sid) { var sid = id_(10); sh.appendRow([sid, first, new Date(), false, inst, hand, email, phone, '', since || "'" + day_(new Date()), last, status, day, time, '']); return { ok: true, sid: sid }; }
  var i = rowOf_('Students', 0, p.sid); if (!i) return { ok: false, error: 'no such student' };
  sh.getRange(i, 2).setValue(first); sh.getRange(i, 11).setValue(last); sh.getRange(i, 5, 1, 4).setValues([[inst, hand, email, phone]]); if (since) sh.getRange(i, 10).setValue(since);
  sh.getRange(i, 12, 1, 3).setValues([[status, day, time]]);
  return { ok: true, sid: p.sid };
}
/* email the student (the page writes the message; it only ever goes to the address on their profile) */
function notify_(p) {
  var r = rows_('Students').filter(function (x) { return x[0] === p.sid; })[0]; if (!r) return { ok: false, error: 'no such student' };
  var to = String(r[6] || '').trim(); if (!to) return { ok: false, error: 'no email on this student’s profile' };
  MailApp.sendEmail({ to: to, subject: str_(p.subject, 200) || 'Your practice', body: str_(p.body, 5000), name: 'Gables Guitar Studio' });
  return { ok: true, to: to, left: MailApp.getRemainingDailyQuota() };
}

function overview_() {
  var students = rows_('Students').map(function (r) { return profile_(r, true); }), D = rows_('Drills');
  students.forEach(function (s) { if (s.routineAt) return;   /* before routineAt was kept: the newest item's assignment */
    D.forEach(function (r) { if (r[1] === s.sid && r[7] instanceof Date) { var t = stamp_(r[7]); if (t > s.routineAt) s.routineAt = t; } }); });
  return { ok: true, students: students, drills: D.map(drillObj_), checks: checksFor_(null), opens: opensFor_(null), songs: songsFor_(null), routines: routinesFor_(null) };
}

/* a page opened on a student's device reports itself: once on opening (first), then the seconds played and open since its
   last report, whenever the page is hidden or closed. One row per item per day; the numbers add up. */
function open_(p) {
  var did = String(p.did || ''), date = String(p.date || ''), week = String(p.week || ''), d = Number(p.day);
  var dr = rows_('Drills').filter(function (r) { return r[0] === did; })[0];
  var st = dr && rows_('Students').filter(function (x) { return x[0] === dr[1]; })[0];
  if (!st || st[3] !== true) return { ok: false, error: 'tracking is off' };
  if (!dr || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(week) || !(d >= 0 && d <= 6)) return { ok: false, error: 'not allowed' };
  var play = Math.max(0, Math.min(14400, Number(p.play) || 0)), open = Math.max(0, Math.min(14400, Number(p.open) || 0));
  var sh = sheet_('Opens'), v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    if (v[i][1] === did && ds_(v[i][2]) === date) {
      sh.getRange(i + 1, 6, 1, 4).setValues([[Number(v[i][5]) + (p.first ? 1 : 0), Number(v[i][6]) + play, Number(v[i][7]) + open, new Date()]]);
      return { ok: true };
    }
  }
  sh.appendRow([dr[1], did, "'" + date, "'" + week, d, p.first ? 1 : 0, play, open, new Date()]);
  return { ok: true };
}
