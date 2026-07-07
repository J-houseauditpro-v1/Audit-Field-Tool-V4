// ── JOBS TAB ─────────────────────────────────────────────────
// Manual job list: add jobs, Zillow lookup, week/day queue, start audit.

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
    propertyType: raw.propertyType || '',
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
  var panel = document.getElementById('tab-jobs');
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

function formatScheduleJobDisplayName(job) {
  if (!job) return '—';
  return (job.name && job.name.trim()) ? job.name.trim() : 'Unnamed job';
}

function formatScheduleJobDisplayLine(job) {
  if (!job) return '—';
  return formatScheduleJobDisplayName(job) + (job.address ? ' — ' + job.address : '');
}

function addressKey(addr) {
  return (addr || '').trim().toLowerCase();
}

function getScheduleJobDateKey(job) {
  if (job.date && /^\d{4}-\d{2}-\d{2}/.test(job.date)) return job.date.split('T')[0];
  if (job.createdAt) return job.createdAt.split('T')[0];
  return 'unknown';
}

function groupScheduleJobsByWeek(jobs) {
  if (typeof getWeekStart !== 'function' || typeof getWeekLabel !== 'function') {
    return [{ monday: new Date(), label: 'All Jobs', jobs: jobs, days: [{ dateKey: 'all', label: 'All', jobs: jobs }] }];
  }
  var weeks = {};
  jobs.forEach(function(job) {
    var dateKey = getScheduleJobDateKey(job);
    var monday = getWeekStart(dateKey === 'unknown' ? null : dateKey);
    var key = monday.toISOString();
    if (!weeks[key]) weeks[key] = { monday: monday, label: getWeekLabel(monday), jobs: [] };
    weeks[key].jobs.push(job);
  });
  return Object.values(weeks).sort(function(a, b) { return b.monday - a.monday; }).map(function(week) {
    week.days = groupScheduleJobsIntoDays(week.jobs);
    return week;
  });
}

function groupScheduleJobsIntoDays(jobs) {
  var days = {};
  jobs.forEach(function(job) {
    var key = getScheduleJobDateKey(job);
    var label = typeof getDayLabel === 'function' ? getDayLabel(key) : key;
    if (!days[key]) days[key] = { dateKey: key, label: label, jobs: [] };
    days[key].jobs.push(job);
  });
  return Object.values(days).sort(function(a, b) {
    if (a.dateKey === 'unknown') return 1;
    if (b.dateKey === 'unknown') return -1;
    return b.dateKey.localeCompare(a.dateKey);
  });
}

// ── INIT ──────────────────────────────────────────────────────
function initCustomersTab() {
  if (!customersTabInitialized) {
    customersTabInitialized = true;
    wireCustomersTab();
  }
  if (typeof initAftSharedSelects === 'function') initAftSharedSelects();
  scheduleJobs = loadScheduleJobs();
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
  if (addBtn) addBtn.addEventListener('click', saveScheduleJobFromForm);

  var cancelBtn = document.getElementById('schedule-cancel-edit-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', clearScheduleAddForm);

  var zillowBtn = document.getElementById('schedule-zillow-btn');
  if (zillowBtn) {
    zillowBtn.addEventListener('click', function() {
      var addrInput = document.getElementById('schedule-add-address');
      openZillowLookupForAddress(addrInput ? addrInput.value : '');
    });
  }

  var addAddress = document.getElementById('schedule-add-address');
  if (addAddress) {
    addAddress.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') saveScheduleJobFromForm();
    });
  }
}

function getScheduleAddFormValues() {
  return {
    name: (document.getElementById('schedule-add-name') || {}).value || '',
    address: (document.getElementById('schedule-add-address') || {}).value || '',
    propertyType: (document.getElementById('schedule-add-property-type') || {}).value || '',
    year: (document.getElementById('schedule-add-year') || {}).value || '',
    sqft: (document.getElementById('schedule-add-sqft') || {}).value || '',
    coop: (document.getElementById('schedule-add-coop') || {}).value || ''
  };
}

function setScheduleAddFormValues(values) {
  var map = {
    'schedule-add-name': values.name || '',
    'schedule-add-address': values.address || '',
    'schedule-add-property-type': values.propertyType || '',
    'schedule-add-year': values.year || '',
    'schedule-add-sqft': values.sqft || '',
    'schedule-add-coop': values.coop || ''
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = map[id];
  });
  ['schedule-add-property-type', 'schedule-add-coop'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && typeof syncSelectPlaceholder === 'function') syncSelectPlaceholder(el);
  });
}

function clearScheduleAddForm() {
  scheduleEditingId = null;
  setScheduleAddFormValues({});
  refreshScheduleAddForm();
}

function refreshScheduleAddForm() {
  var titleEl = document.getElementById('schedule-add-title');
  var addBtn = document.getElementById('schedule-add-btn');
  var cancelBtn = document.getElementById('schedule-cancel-edit-btn');
  var editing = !!scheduleEditingId;
  if (titleEl) titleEl.textContent = editing ? 'Edit Job' : '+ Add Job';
  if (addBtn) addBtn.textContent = editing ? 'Save Job' : 'Add to Schedule';
  if (cancelBtn) cancelBtn.style.display = editing ? 'block' : 'none';
}

function loadJobIntoAddForm(job) {
  scheduleEditingId = job.id;
  setScheduleAddFormValues(job);
  refreshScheduleAddForm();
  var body = document.getElementById('schedule-add-body');
  var arrow = document.getElementById('schedule-add-arrow');
  if (body) body.classList.add('open');
  if (arrow) arrow.textContent = '▲';
  var card = document.getElementById('schedule-add-card');
  if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function saveScheduleJobFromForm() {
  var values = getScheduleAddFormValues();
  var name = values.name.trim();
  var address = values.address.trim();
  if (!name) { toast('Enter a customer name.'); return; }
  if (!address) { toast('Enter an address.'); return; }

  var researchOutput = typeof buildResearchOutputFromPrefill === 'function'
    ? buildResearchOutputFromPrefill({
      propertyType: values.propertyType.trim(),
      year: values.year.trim(),
      sqft: values.sqft.trim(),
      coop: values.coop.trim(),
      generalNotes: ''
    })
    : null;

  var jobs = getScheduleJobs().slice();

  if (scheduleEditingId) {
    updateScheduleJob(scheduleEditingId, {
      name: name,
      address: address,
      propertyType: values.propertyType.trim(),
      year: values.year.trim(),
      sqft: values.sqft.trim(),
      coop: values.coop.trim(),
      researchOutput: researchOutput
    });
    clearScheduleAddForm();
    renderCustomersList(getScheduleJobs(), getScheduleSearchFilter());
    toast('Job saved.');
    return;
  }

  jobs.push(normalizeScheduleJob({
    id: newScheduleJobId(),
    customerNumber: getNextCustomerNumber(jobs),
    name: name,
    address: address,
    propertyType: values.propertyType.trim(),
    year: values.year.trim(),
    sqft: values.sqft.trim(),
    coop: values.coop.trim(),
    researchOutput: researchOutput,
    source: 'manual',
    createdAt: new Date().toISOString()
  }));
  saveScheduleJobs(jobs);
  clearScheduleAddForm();
  renderCustomersList(jobs, getScheduleSearchFilter());
  toast('Added to schedule.');
}

function updateScheduleJob(id, updates) {
  var jobs = getScheduleJobs().slice();
  var idx = jobs.findIndex(function(j) { return j.id === id; });
  if (idx < 0) return false;
  var job = jobs[idx];
  if (updates.name !== undefined) job.name = updates.name.trim();
  if (updates.address !== undefined) job.address = updates.address.trim();
  if (updates.status !== undefined) job.status = normalizeScheduleStatus(updates.status);
  if (updates.auditId !== undefined) job.auditId = updates.auditId;
  if (updates.researchOutput !== undefined) job.researchOutput = updates.researchOutput;
  if (updates.researchForwardedAt !== undefined) job.researchForwardedAt = updates.researchForwardedAt;
  if (updates.propertyType !== undefined) job.propertyType = updates.propertyType;
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
  if (scheduleEditingId === id) clearScheduleAddForm();
  renderCustomersList(jobs, getScheduleSearchFilter());
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
      if (typeof buildResearchOutputFromPrefill === 'function') {
        existing.researchOutput = buildResearchOutputFromPrefill({
          propertyType: existing.propertyType || '',
          year: existing.year,
          sqft: existing.sqft,
          coop: existing.coop,
          generalNotes: ''
        });
      }
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
  var hay = [job.name, job.address, job.coop, job.propertyType].join(' ').toLowerCase();
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

  if (filter) {
    listEl.innerHTML = '<div class="week-group">' + filtered.map(function(job) {
      return renderScheduleQueueRow(job);
    }).join('') + '</div>';
  } else {
    var weeks = groupScheduleJobsByWeek(filtered);
    listEl.innerHTML = weeks.map(function(week) {
      var daySections = week.days.map(function(day) {
        var rowsHtml = day.jobs.map(function(job) { return renderScheduleQueueRow(job); }).join('');
        return '<div class="day-group"><div class="day-group-header"><span class="day-group-title">' + escapeHtmlC(day.label) + '</span><span class="day-group-count">' + day.jobs.length + ' job' + (day.jobs.length !== 1 ? 's' : '') + '</span></div>' + rowsHtml + '</div>';
      }).join('');
      return '<div class="week-group"><div class="week-group-header"><span class="week-group-title">' + escapeHtmlC(week.label) + '</span><span class="week-group-count">' + week.jobs.length + ' job' + (week.jobs.length !== 1 ? 's' : '') + '</span></div>' + daySections + '</div>';
    }).join('');
  }

  wireScheduleQueueActions(jobs, filter);
}

function renderScheduleQueueRow(job) {
  var status = normalizeScheduleStatus(job.status);
  var sourceTag = job.source === 'sheets'
    ? '<span class="schedule-source-tag">Sheets</span>'
    : '<span class="schedule-source-tag manual">Manual</span>';
  var completeClass = status === 'complete' ? 'schedule-icon-btn is-complete' : 'schedule-icon-btn';
  return '<div class="schedule-queue-row week-audit-row" data-id="' + escapeHtmlC(job.id) + '">' +
    '<div class="week-audit-info">' +
      '<div class="week-audit-name schedule-queue-name">' + escapeHtmlC(formatScheduleJobDisplayName(job)) + '</div>' +
      '<div class="schedule-queue-address">' + escapeHtmlC(job.address || '—') + '</div>' +
      '<div class="week-audit-meta schedule-queue-meta">' +
        renderScheduleStatusBadge(status) +
        sourceTag +
      '</div>' +
    '</div>' +
    '<div class="schedule-row-actions">' +
      '<button type="button" class="schedule-icon-btn schedule-edit-btn" data-id="' + escapeHtmlC(job.id) + '" title="Edit" aria-label="Edit">✏️</button>' +
      '<button type="button" class="schedule-icon-btn schedule-delete-btn" data-id="' + escapeHtmlC(job.id) + '" title="Delete" aria-label="Delete">🗑</button>' +
      '<button type="button" class="' + completeClass + ' schedule-mark-complete-btn" data-id="' + escapeHtmlC(job.id) + '" title="Mark complete" aria-label="Mark complete"' + (status === 'complete' ? ' disabled' : '') + '>✓</button>' +
      '<button type="button" class="btn-xs-gold customer-start-btn" data-id="' + escapeHtmlC(job.id) + '">Start →</button>' +
    '</div>' +
  '</div>';
}

function wireScheduleQueueActions(jobs, filter) {
  var listEl = document.getElementById('customers-list');
  if (!listEl) return;

  listEl.querySelectorAll('.customer-start-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var job = jobs.find(function(j) { return j.id === btn.dataset.id; });
      if (job) startAuditFromCustomer(job);
    });
  });
  listEl.querySelectorAll('.schedule-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var job = jobs.find(function(j) { return j.id === btn.dataset.id; });
      if (job) loadJobIntoAddForm(job);
    });
  });
  listEl.querySelectorAll('.schedule-delete-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var id = btn.dataset.id;
      var job = jobs.find(function(j) { return j.id === id; });
      var label = job ? (job.name || 'this job') : 'this job';
      if (confirm('Delete ' + label + ' from schedule?')) deleteScheduleJob(id);
    });
  });
  listEl.querySelectorAll('.schedule-mark-complete-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var id = btn.dataset.id;
      if (confirm('Mark this job as Complete?')) {
        markScheduleJobComplete(id);
        renderCustomersList(getScheduleJobs(), filter);
        toast('Job marked Complete');
      }
    });
  });
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
  S.propertyType = row.propertyType || '';
  S.customerNumber = row.customerNumber != null ? row.customerNumber : null;
  S.scheduleJobId = row.id || null;
  S.researchNotes = '';
  if (typeof buildResearchOutputFromJob === 'function') {
    var output = row.researchOutput || buildResearchOutputFromJob(row);
    if (output && typeof formatResearchNotesText === 'function') {
      S.researchNotes = formatResearchNotesText(output);
      if (typeof getResearchAuditFields === 'function') {
        var auditFields = getResearchAuditFields(output);
        if (auditFields.propertyType) S.propertyType = auditFields.propertyType;
        if (auditFields.year) S.year = auditFields.year;
        if (auditFields.sqft) S.sqft = auditFields.sqft;
      }
    }
  }
  S.auditId = null;
  S.dump    = '';
  S.photos  = [];
  S.tcSignature = null;
  if (typeof clearTCSignature === 'function') clearTCSignature();
  setScheduleJobStatus(row.id, 'in_progress', { force: true });
  if (typeof updateScheduleJob === 'function') {
    updateScheduleJob(row.id, { researchForwardedAt: new Date().toISOString() });
  }
  if (typeof save       === 'function') save();
  if (typeof fillFields === 'function') fillFields();
  if (typeof renderHeader === 'function') renderHeader();
  if (typeof renderVoiceDump === 'function') renderVoiceDump();
  if (typeof renderPhotoList === 'function') renderPhotoList();
  if (typeof persistAuditRecord === 'function') persistAuditRecord();
  if (typeof switchMainTab === 'function') {
    switchMainTab('audit', 'voice');
  }
  toast('Started audit for ' + (row.name || 'customer'));
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
