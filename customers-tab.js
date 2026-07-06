// ── SCHEDULE TAB (Jobs → Schedule) ───────────────────────────
// Manual job list with customer #, name, and address.
// Research pass will use customerNumber + address only (not name).

var customersTabInitialized = false;
var scheduleJobs = [];
var scheduleEditingId = null;

var SCHEDULE_STORAGE_KEY = 'aft_schedule_jobs';

var SCHEDULE_STATUSES = ['ready', 'in_progress', 'interpreted', 'complete'];
var SCHEDULE_STATUS_LABELS = {
  ready: 'Ready',
  in_progress: 'In Progress',
  interpreted: 'Interpreted',
  complete: 'Complete'
};
var SCHEDULE_STATUS_ORDER = { ready: 0, in_progress: 1, interpreted: 2, complete: 3 };

// ── SETTINGS HELPERS (Google Sheets import) ───────────────────
function getSheetId()   { return localStorage.getItem('aft_gs_sheet_id')   || ''; }
function setSheetId(v)  { localStorage.setItem('aft_gs_sheet_id', v); }
function getSheetRange(){ return localStorage.getItem('aft_gs_range')       || 'Sheet1!A1:Z200'; }
function setSheetRange(v){ localStorage.setItem('aft_gs_range', v); }
function getSheetApiKey(){ return localStorage.getItem('aft_gs_api_key')    || ''; }
function setSheetApiKey(v){ localStorage.setItem('aft_gs_api_key', v); }

function getColMap() {
  try { return JSON.parse(localStorage.getItem('aft_gs_col_map') || 'null') || getDefaultColMap(); }
  catch(e) { return getDefaultColMap(); }
}
function setColMap(obj) { localStorage.setItem('aft_gs_col_map', JSON.stringify(obj)); }
function getDefaultColMap() {
  return { name: 0, address: 1, date: 2, coop: 3, year: 4, sqft: 5 };
}

function getCustomersCache() {
  try { return JSON.parse(localStorage.getItem('aft_customers_cache') || 'null') || null; }
  catch(e) { return null; }
}
function setCustomersCache(data) {
  localStorage.setItem('aft_customers_cache', JSON.stringify({
    rows: data,
    fetchedAt: new Date().toISOString()
  }));
}

// ── SCHEDULE JOB STORAGE ──────────────────────────────────────
function newScheduleJobId() {
  return 'job-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function getNextCustomerNumber(jobs) {
  if (!jobs || !jobs.length) return 1;
  var max = 0;
  jobs.forEach(function(j) {
    var n = parseInt(j.customerNumber, 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function normalizeScheduleStatus(status) {
  var s = (status || 'ready').toLowerCase().replace(/\s+/g, '_');
  if (s === 'inprogress') s = 'in_progress';
  return SCHEDULE_STATUSES.indexOf(s) >= 0 ? s : 'ready';
}

function normalizeScheduleJob(raw) {
  return {
    id: raw.id || newScheduleJobId(),
    customerNumber: parseInt(raw.customerNumber, 10) || 1,
    name: (raw.name || '').trim(),
    address: (raw.address || '').trim(),
    date: raw.date || '',
    coop: raw.coop || '',
    year: raw.year || '',
    sqft: raw.sqft || '',
    source: raw.source || 'manual',
    status: normalizeScheduleStatus(raw.status),
    auditId: raw.auditId || null,
    researchOutput: raw.researchOutput || null,
    researchForwardedAt: raw.researchForwardedAt || null,
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function getScheduleJobById(id) {
  return getScheduleJobs().find(function(j) { return j.id === id; }) || null;
}

function getScheduleJobByAuditId(auditId) {
  if (!auditId) return null;
  return getScheduleJobs().find(function(j) { return j.auditId === auditId; }) || null;
}

function setScheduleJobStatus(jobId, status, options) {
  options = options || {};
  var jobs = getScheduleJobs().slice();
  var idx = jobs.findIndex(function(j) { return j.id === jobId; });
  if (idx < 0) return false;
  var next = normalizeScheduleStatus(status);
  var current = normalizeScheduleStatus(jobs[idx].status);
  if (!options.force && SCHEDULE_STATUS_ORDER[next] < SCHEDULE_STATUS_ORDER[current]) return false;
  jobs[idx].status = next;
  saveScheduleJobs(jobs);
  refreshScheduleListIfVisible();
  if (typeof renderHeader === 'function') renderHeader();
  return true;
}

function syncScheduleStatusFromAudit(auditId, status, options) {
  if (!auditId) return false;
  var job = getScheduleJobByAuditId(auditId);
  if (!job && options && options.scheduleJobId) job = getScheduleJobById(options.scheduleJobId);
  if (!job) return false;
  return setScheduleJobStatus(job.id, status, options || {});
}

function linkScheduleJobToAudit(jobId, auditId) {
  if (!jobId || !auditId) return false;
  var jobs = getScheduleJobs().slice();
  var idx = jobs.findIndex(function(j) { return j.id === jobId; });
  if (idx < 0) return false;
  jobs[idx].auditId = auditId;
  if (normalizeScheduleStatus(jobs[idx].status) === 'ready') jobs[idx].status = 'in_progress';
  saveScheduleJobs(jobs);
  refreshScheduleListIfVisible();
  return true;
}

function markScheduleJobComplete(jobId) {
  var ok = setScheduleJobStatus(jobId, 'complete', { force: true });
  if (typeof renderHeader === 'function') renderHeader();
  return ok;
}

function refreshScheduleListIfVisible() {
  var panel = document.getElementById('tab-schedule');
  if (panel && panel.style.display !== 'none' && typeof renderCustomersList === 'function') {
    renderCustomersList(getScheduleJobs(), getScheduleSearchFilter());
  }
}

function renderScheduleStatusBadge(status) {
  var s = normalizeScheduleStatus(status);
  var label = SCHEDULE_STATUS_LABELS[s] || 'Ready';
  return '<span class="schedule-status-badge status-' + s + '">' + escapeHtmlC(label) + '</span>';
}

function loadScheduleJobs() {
  try {
    var raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (raw) {
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map(normalizeScheduleJob);
    }
  } catch(e) {}
  var cache = getCustomersCache();
  if (cache && Array.isArray(cache.rows) && cache.rows.length) {
    var migrated = cache.rows.map(function(r, i) {
      return normalizeScheduleJob({
        id: newScheduleJobId(),
        customerNumber: i + 1,
        name: r.name,
        address: r.address,
        date: r.date,
        coop: r.coop,
        year: r.year,
        sqft: r.sqft,
        source: 'sheets',
        createdAt: cache.fetchedAt || new Date().toISOString()
      });
    });
    saveScheduleJobs(migrated);
    return migrated;
  }
  return [];
}

function saveScheduleJobs(jobs) {
  scheduleJobs = jobs;
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(jobs));
}

function getScheduleJobs() {
  if (!scheduleJobs.length) scheduleJobs = loadScheduleJobs();
  return scheduleJobs;
}

// Payload for future research API — name intentionally excluded
function getResearchJobPayload(job) {
  if (!job) return null;
  return {
    customerNumber: job.customerNumber,
    address: job.address
  };
}

function formatScheduleJobDisplayName(job) {
  if (!job) return '—';
  var label = '#' + job.customerNumber;
  if (job.name && job.name.trim()) label += ' ' + job.name.trim();
  return label;
}

function formatScheduleJobDisplayLine(job) {
  if (!job) return '—';
  return formatScheduleJobDisplayName(job) + (job.address ? ' — ' + job.address : '');
}

function addressKey(addr) {
  return (addr || '').trim().toLowerCase();
}

// ── INIT ──────────────────────────────────────────────────────
function initCustomersTab() {
  if (!customersTabInitialized) {
    customersTabInitialized = true;
    wireCustomersTab();
  }
  scheduleJobs = loadScheduleJobs();
  scheduleEditingId = null;
  refreshScheduleAddForm();
  renderCustomersList(scheduleJobs, getScheduleSearchFilter());
  updateScheduleCacheNote();
}

function getScheduleSearchFilter() {
  var searchInput = document.getElementById('customers-search');
  return searchInput ? searchInput.value.trim().toLowerCase() : '';
}

function wireCustomersTab() {
  var refreshBtn = document.getElementById('customers-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', fetchCustomersFromSheets);

  var searchInput = document.getElementById('customers-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      renderCustomersList(getScheduleJobs(), searchInput.value.trim().toLowerCase());
    });
  }

  var addBtn = document.getElementById('schedule-add-btn');
  if (addBtn) addBtn.addEventListener('click', addManualScheduleJob);

  var addAddress = document.getElementById('schedule-add-address');
  if (addAddress) {
    addAddress.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') addManualScheduleJob();
    });
  }
}

function refreshScheduleAddForm() {
  var numInput = document.getElementById('schedule-add-number');
  if (numInput) numInput.value = getNextCustomerNumber(getScheduleJobs());
}

function updateScheduleCacheNote() {
  var cache = getCustomersCache();
  var noteEl = document.getElementById('customers-cache-note');
  if (!noteEl) return;
  if (cache && cache.fetchedAt) {
    noteEl.textContent = 'Sheets last synced: ' + new Date(cache.fetchedAt).toLocaleDateString();
    noteEl.style.display = 'block';
  } else {
    noteEl.style.display = 'none';
  }
}

function addManualScheduleJob() {
  var numInput = document.getElementById('schedule-add-number');
  var nameInput = document.getElementById('schedule-add-name');
  var addrInput = document.getElementById('schedule-add-address');
  var name = nameInput ? nameInput.value.trim() : '';
  var address = addrInput ? addrInput.value.trim() : '';
  if (!name) { toast('Enter a customer name.'); return; }
  if (!address) { toast('Enter an address.'); return; }

  var jobs = getScheduleJobs().slice();
  var num = numInput ? parseInt(numInput.value, 10) : NaN;
  if (isNaN(num) || num < 1) num = getNextCustomerNumber(jobs);

  jobs.push(normalizeScheduleJob({
    id: newScheduleJobId(),
    customerNumber: num,
    name: name,
    address: address,
    source: 'manual',
    createdAt: new Date().toISOString()
  }));
  saveScheduleJobs(jobs);

  if (nameInput) nameInput.value = '';
  if (addrInput) addrInput.value = '';
  refreshScheduleAddForm();
  renderCustomersList(jobs, getScheduleSearchFilter());
  toast('Added customer #' + num);
}

function updateScheduleJob(id, updates) {
  var jobs = getScheduleJobs().slice();
  var idx = jobs.findIndex(function(j) { return j.id === id; });
  if (idx < 0) return false;
  var job = jobs[idx];
  if (updates.customerNumber !== undefined) {
    var n = parseInt(updates.customerNumber, 10);
    job.customerNumber = (!isNaN(n) && n >= 1) ? n : job.customerNumber;
  }
  if (updates.name !== undefined) job.name = updates.name.trim();
  if (updates.address !== undefined) job.address = updates.address.trim();
  if (updates.status !== undefined) job.status = normalizeScheduleStatus(updates.status);
  if (updates.auditId !== undefined) job.auditId = updates.auditId;
  if (updates.researchOutput !== undefined) job.researchOutput = updates.researchOutput;
  if (updates.researchForwardedAt !== undefined) job.researchForwardedAt = updates.researchForwardedAt;
  if (updates.year !== undefined) job.year = updates.year;
  if (updates.sqft !== undefined) job.sqft = updates.sqft;
  if (updates.coop !== undefined) job.coop = updates.coop;
  jobs[idx] = job;
  saveScheduleJobs(jobs);
  return true;
}

function deleteScheduleJob(id) {
  var jobs = getScheduleJobs().filter(function(j) { return j.id !== id; });
  saveScheduleJobs(jobs);
  scheduleEditingId = null;
  renderCustomersList(jobs, getScheduleSearchFilter());
  refreshScheduleAddForm();
}

// ── FETCH FROM GOOGLE SHEETS ─────────────────────────────────
function fetchCustomersFromSheets() {
  var sheetId  = getSheetId();
  var range    = getSheetRange();
  var apiKey   = getSheetApiKey();
  if (!sheetId)  { toast('Add Spreadsheet ID in Settings → Google Sheets.'); return; }
  if (!apiKey)   { toast('Add Google Sheets API Key in Settings → Google Sheets.'); return; }

  var refreshBtn = document.getElementById('customers-refresh-btn');
  if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.textContent = '⏳ …'; }
  var statusEl = document.getElementById('customers-fetch-status');
  if (statusEl) { statusEl.textContent = ''; statusEl.style.display = 'none'; }

  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' +
    encodeURIComponent(sheetId) + '/values/' +
    encodeURIComponent(range) + '?key=' + encodeURIComponent(apiKey);

  fetch(url)
    .then(function(res) {
      if (!res.ok) return res.json().then(function(e) { throw new Error(e.error ? e.error.message : res.statusText); });
      return res.json();
    })
    .then(function(data) {
      var values = data.values || [];
      if (!values.length) { toast('Sheet is empty or range has no data.'); return; }
      var rows = parseSheetRows(values.slice(1), values[0]);
      setCustomersCache(rows);
      mergeSheetRowsIntoSchedule(rows);
      updateScheduleCacheNote();
      toast('Imported ' + rows.length + ' row' + (rows.length !== 1 ? 's' : '') + ' from Sheets');
    })
    .catch(function(e) {
      var msg = 'Sheets fetch failed: ' + e.message;
      if (statusEl) { statusEl.textContent = msg; statusEl.style.color = '#e03333'; statusEl.style.display = 'block'; }
      toast(msg);
    })
    .finally(function() {
      if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = '🔄 Sheets'; }
    });
}

function mergeSheetRowsIntoSchedule(sheetRows) {
  var jobs = getScheduleJobs().slice();
  var added = 0;
  var updated = 0;

  sheetRows.forEach(function(row) {
    if (!row.address && !row.name) return;
    var key = addressKey(row.address);
    var existing = jobs.find(function(j) {
      return addressKey(j.address) === key && key;
    });
    if (existing) {
      existing.name = row.name || existing.name;
      existing.date = row.date || existing.date;
      existing.coop = row.coop || existing.coop;
      existing.year = row.year || existing.year;
      existing.sqft = row.sqft || existing.sqft;
      if (existing.source !== 'manual') existing.source = 'sheets';
      updated++;
    } else {
      jobs.push(normalizeScheduleJob({
        id: newScheduleJobId(),
        customerNumber: getNextCustomerNumber(jobs),
        name: row.name,
        address: row.address,
        date: row.date,
        coop: row.coop,
        year: row.year,
        sqft: row.sqft,
        source: 'sheets',
        createdAt: new Date().toISOString()
      }));
      added++;
    }
  });

  saveScheduleJobs(jobs);
  renderCustomersList(jobs, getScheduleSearchFilter());
  refreshScheduleAddForm();
}

function parseSheetRows(rows, headers) {
  var colMap = getColMap();
  return rows.map(function(row) {
    function col(key) {
      var idx = colMap[key];
      if (idx === '' || idx === null || idx === undefined) return '';
      return (row[Number(idx)] || '').trim();
    }
    return {
      name:    col('name'),
      address: col('address'),
      date:    col('date'),
      coop:    col('coop'),
      year:    col('year'),
      sqft:    col('sqft'),
      _raw:    row
    };
  }).filter(function(r) { return r.name || r.address; });
}

// ── RENDER LIST ───────────────────────────────────────────────
function jobMatchesFilter(job, filter) {
  if (!filter) return true;
  var hay = [
    String(job.customerNumber),
    '#' + job.customerNumber,
    job.name,
    job.address,
    job.coop
  ].join(' ').toLowerCase();
  return hay.indexOf(filter) !== -1;
}

function renderCustomersList(rows, filter) {
  var listEl = document.getElementById('customers-list');
  if (!listEl) return;
  var jobs = rows || getScheduleJobs();
  var filtered = filter ? jobs.filter(function(j) { return jobMatchesFilter(j, filter); }) : jobs;

  if (!filtered.length) {
    listEl.innerHTML = filter
      ? '<div class="empty-msg">No jobs match "' + escapeHtmlC(filter) + '"</div>'
      : '<div class="empty-msg">No jobs yet — add one above or import from Google Sheets</div>';
    return;
  }

  listEl.innerHTML = filtered.map(function(job) {
    if (scheduleEditingId === job.id) return renderScheduleEditCard(job);
    return renderScheduleViewCard(job);
  }).join('');

  listEl.querySelectorAll('.customer-start-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.dataset.id;
      var job = jobs.find(function(j) { return j.id === id; });
      if (job) startAuditFromCustomer(job);
    });
  });
  listEl.querySelectorAll('.schedule-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      scheduleEditingId = btn.dataset.id;
      renderCustomersList(jobs, filter);
    });
  });
  listEl.querySelectorAll('.schedule-delete-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.dataset.id;
      var job = jobs.find(function(j) { return j.id === id; });
      var label = job ? ('#' + job.customerNumber + ' ' + (job.name || 'job')) : 'this job';
      if (confirm('Delete ' + label + ' from schedule?')) deleteScheduleJob(id);
    });
  });
  listEl.querySelectorAll('.schedule-save-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.dataset.id;
      var card = btn.closest('.schedule-edit-card');
      if (!card) return;
      var num = parseInt(card.querySelector('.schedule-edit-number').value, 10);
      var name = card.querySelector('.schedule-edit-name').value;
      var address = card.querySelector('.schedule-edit-address').value;
      if (!name.trim()) { toast('Name is required.'); return; }
      if (!address.trim()) { toast('Address is required.'); return; }
      updateScheduleJob(id, { customerNumber: num, name: name, address: address });
      scheduleEditingId = null;
      renderCustomersList(getScheduleJobs(), filter);
      refreshScheduleAddForm();
      toast('Saved customer #' + (isNaN(num) ? '?' : num));
    });
  });
  listEl.querySelectorAll('.schedule-cancel-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      scheduleEditingId = null;
      renderCustomersList(jobs, filter);
    });
  });
  listEl.querySelectorAll('.schedule-mark-complete-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.dataset.id;
      if (confirm('Mark this job as Complete?')) {
        markScheduleJobComplete(id);
        renderCustomersList(getScheduleJobs(), filter);
        toast('Job marked Complete');
      }
    });
  });
}

function renderScheduleViewCard(job) {
  var sourceTag = job.source === 'sheets'
    ? '<span class="schedule-source-tag">Sheets</span>'
    : '<span class="schedule-source-tag manual">Manual</span>';
  var status = normalizeScheduleStatus(job.status);
  var completeBtn = status !== 'complete'
    ? '<button type="button" class="btn-sm schedule-mark-complete-btn" data-id="' + escapeHtmlC(job.id) + '">Mark Complete</button>'
    : '';
  return '<div class="customer-card schedule-job-card" data-id="' + escapeHtmlC(job.id) + '">' +
    '<div class="schedule-card-top">' +
      '<span class="schedule-customer-num">#' + escapeHtmlC(String(job.customerNumber)) + '</span>' +
      '<div class="customer-card-name">' + escapeHtmlC(job.name || '—') + '</div>' +
      renderScheduleStatusBadge(status) +
      sourceTag +
    '</div>' +
    '<div class="customer-card-meta schedule-card-address">' +
      '<span>' + escapeHtmlC(job.address || '—') + '</span>' +
    '</div>' +
    '<div class="schedule-card-actions">' +
      '<button type="button" class="btn-sm schedule-edit-btn" data-id="' + escapeHtmlC(job.id) + '">Edit</button>' +
      '<button type="button" class="btn-sm btn-danger-sm schedule-delete-btn" data-id="' + escapeHtmlC(job.id) + '">Delete</button>' +
      completeBtn +
      '<button type="button" class="btn-gold btn-sm customer-start-btn" data-id="' + escapeHtmlC(job.id) + '">Start Audit →</button>' +
    '</div>' +
  '</div>';
}

function renderScheduleEditCard(job) {
  return '<div class="customer-card schedule-job-card schedule-edit-card" data-id="' + escapeHtmlC(job.id) + '">' +
    '<div class="card-title" style="margin-bottom:8px;font-size:0.9rem;">Edit Job</div>' +
    '<div class="schedule-add-grid">' +
      '<div class="schedule-add-field schedule-add-number-wrap">' +
        '<label class="schedule-field-label">Customer #</label>' +
        '<input class="field schedule-edit-number" type="number" min="1" value="' + escapeHtmlC(String(job.customerNumber)) + '">' +
      '</div>' +
      '<div class="schedule-add-field schedule-add-field-grow">' +
        '<label class="schedule-field-label">Name</label>' +
        '<input class="field schedule-edit-name" type="text" value="' + escapeHtmlC(job.name) + '">' +
      '</div>' +
    '</div>' +
    '<div class="schedule-add-field" style="margin-top:8px;">' +
      '<label class="schedule-field-label">Address</label>' +
      '<input class="field schedule-edit-address schedule-add-address-input" type="text" value="' + escapeHtmlC(job.address) + '">' +
    '</div>' +
    '<div class="schedule-card-actions" style="margin-top:10px;">' +
      '<button type="button" class="btn-sm schedule-cancel-edit-btn" data-id="' + escapeHtmlC(job.id) + '">Cancel</button>' +
      '<button type="button" class="btn-gold btn-sm schedule-save-edit-btn" data-id="' + escapeHtmlC(job.id) + '">Save</button>' +
    '</div>' +
  '</div>';
}

function _customersEscape(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeHtmlC(str) {
  return typeof escapeHtml === 'function' ? escapeHtml(str) : _customersEscape(str);
}

// ── START AUDIT FROM SCHEDULE JOB ─────────────────────────────
function startAuditFromCustomer(row) {
  if (typeof S === 'undefined') return;
  if (S.name || S.dump || (S.photos && S.photos.length)) {
    if (!confirm('Start a new audit? Unsaved data in the current audit will be lost.')) return;
  }
  S.name    = row.name    || '';
  S.address = row.address || '';
  S.date    = row.date    || '';
  S.coop    = row.coop    || '';
  S.year    = row.year    || '';
  S.sqft    = row.sqft    || '';
  S.customerNumber = row.customerNumber != null ? row.customerNumber : null;
  S.scheduleJobId = row.id || null;
  S.researchNotes = '';
  if (row.researchOutput && row.researchForwardedAt) {
    S.researchNotes = typeof formatResearchNotesText === 'function'
      ? formatResearchNotesText(row.researchOutput)
      : (row.researchOutput.summary || '');
  }
  S.auditId = null;
  S.dump    = '';
  S.photos  = [];
  S.tcSignature = null;
  if (typeof clearTCSignature === 'function') clearTCSignature();
  setScheduleJobStatus(row.id, 'in_progress', { force: true });
  if (typeof save       === 'function') save();
  if (typeof fillFields === 'function') fillFields();
  if (typeof renderHeader === 'function') renderHeader();
  if (typeof renderVoiceDump === 'function') renderVoiceDump();
  if (typeof renderPhotoList === 'function') renderPhotoList();
  if (typeof renderResearchNotesSummary === 'function') renderResearchNotesSummary();
  if (typeof persistAuditRecord === 'function') persistAuditRecord();
  if (typeof switchMainTab === 'function') {
    switchMainTab('audit', 'voice');
  }
  toast('Started audit for #' + row.customerNumber + ' ' + (row.name || 'customer'));
}

// ── GOOGLE SHEETS SETTINGS ────────────────────────────────────
var googleSheetsSettingsWired = false;
function initGoogleSheetsSettings() {
  var sheetIdInput  = document.getElementById('gs-sheet-id-input');
  var rangeInput    = document.getElementById('gs-range-input');
  var gsApiKeyInput = document.getElementById('gs-api-key-input');
  var saveBtn       = document.getElementById('gs-settings-save');

  if (!sheetIdInput) return;

  sheetIdInput.value  = getSheetId();
  rangeInput.value    = getSheetRange();
  gsApiKeyInput.value = getSheetApiKey();

  var colMap = getColMap();
  ['name','address','date','coop','year','sqft'].forEach(function(key) {
    var el = document.getElementById('gs-col-' + key);
    if (el) el.value = (colMap[key] !== undefined && colMap[key] !== '') ? String(colMap[key]) : '';
  });

  if (saveBtn && !googleSheetsSettingsWired) {
    googleSheetsSettingsWired = true;
    saveBtn.addEventListener('click', function() {
      setSheetId((sheetIdInput.value || '').trim());
      setSheetRange((rangeInput.value || '').trim() || 'Sheet1!A1:Z200');
      setSheetApiKey((gsApiKeyInput.value || '').trim());
      var newMap = {};
      ['name','address','date','coop','year','sqft'].forEach(function(key) {
        var el = document.getElementById('gs-col-' + key);
        newMap[key] = el ? (el.value.trim() !== '' ? parseInt(el.value, 10) : '') : '';
      });
      setColMap(newMap);
      if (typeof toast === 'function') toast('Google Sheets settings saved.');
    });
  }
}
