// ── CUSTOMERS TAB ─────────────────────────────────────────────
// Fetches customer data from a Google Sheets spreadsheet via the
// Sheets API v4. Configured in More → Settings (sheet ID, range,
// API key, column mapping). Results are cached in localStorage so
// the tab works offline after the first successful fetch.

var customersTabInitialized = false;
var customersData = []; // current in-memory list

// ── SETTINGS HELPERS ─────────────────────────────────────────
function getSheetId()   { return localStorage.getItem('aft_gs_sheet_id')   || ''; }
function setSheetId(v)  { localStorage.setItem('aft_gs_sheet_id', v); }
function getSheetRange(){ return localStorage.getItem('aft_gs_range')       || 'Sheet1!A1:Z200'; }
function setSheetRange(v){ localStorage.setItem('aft_gs_range', v); }
function getSheetApiKey(){ return localStorage.getItem('aft_gs_api_key')    || ''; }
function setSheetApiKey(v){ localStorage.setItem('aft_gs_api_key', v); }

// Column mapping — each value is a 0-based column index (or '' if not mapped)
function getColMap() {
  try { return JSON.parse(localStorage.getItem('aft_gs_col_map') || 'null') || getDefaultColMap(); }
  catch(e) { return getDefaultColMap(); }
}
function setColMap(obj) { localStorage.setItem('aft_gs_col_map', JSON.stringify(obj)); }
function getDefaultColMap() {
  return { name: 0, address: 1, date: 2, coop: 3, year: 4, sqft: 5 };
}

// Cached customer list
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

// ── INIT ──────────────────────────────────────────────────────
function initCustomersTab() {
  if (!customersTabInitialized) {
    customersTabInitialized = true;
    wireCustomersTab();
  }
  loadCachedCustomers();
}

function wireCustomersTab() {
  var refreshBtn = document.getElementById('customers-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', fetchCustomersFromSheets);

  var searchInput = document.getElementById('customers-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      renderCustomersList(customersData, searchInput.value.trim().toLowerCase());
    });
  }
}

function loadCachedCustomers() {
  var cache = getCustomersCache();
  if (cache && Array.isArray(cache.rows) && cache.rows.length) {
    customersData = cache.rows;
    var lastFetch = cache.fetchedAt ? new Date(cache.fetchedAt).toLocaleDateString() : '?';
    var noteEl = document.getElementById('customers-cache-note');
    if (noteEl) { noteEl.textContent = 'Last synced: ' + lastFetch; noteEl.style.display = 'block'; }
    renderCustomersList(customersData, '');
  } else {
    var listEl = document.getElementById('customers-list');
    if (listEl) listEl.innerHTML = '<div class="empty-msg">No customers yet — tap Refresh to fetch from Google Sheets</div>';
  }
}

// ── FETCH FROM GOOGLE SHEETS ─────────────────────────────────
function fetchCustomersFromSheets() {
  var sheetId  = getSheetId();
  var range    = getSheetRange();
  var apiKey   = getSheetApiKey();
  if (!sheetId)  { toast('Add Spreadsheet ID in More → Google Sheets Settings.'); return; }
  if (!apiKey)   { toast('Add Google Sheets API Key in More → Google Sheets Settings.'); return; }

  var refreshBtn = document.getElementById('customers-refresh-btn');
  if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.textContent = '⏳ Fetching…'; }
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
      var headers = values[0];
      var rows = parseSheetRows(values.slice(1), headers);
      customersData = rows;
      setCustomersCache(rows);
      var noteEl = document.getElementById('customers-cache-note');
      if (noteEl) { noteEl.textContent = 'Last synced: ' + new Date().toLocaleDateString(); noteEl.style.display = 'block'; }
      renderCustomersList(rows, '');
      toast('Loaded ' + rows.length + ' customer' + (rows.length !== 1 ? 's' : '') + ' from Sheets');
    })
    .catch(function(e) {
      var msg = 'Sheets fetch failed: ' + e.message;
      if (statusEl) { statusEl.textContent = msg; statusEl.style.color = '#e03333'; statusEl.style.display = 'block'; }
      toast(msg);
    })
    .finally(function() {
      if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = '🔄 Refresh'; }
    });
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
function renderCustomersList(rows, filter) {
  var listEl = document.getElementById('customers-list');
  if (!listEl) return;
  var filtered = filter
    ? rows.filter(function(r) {
        return (r.name + ' ' + r.address + ' ' + r.coop).toLowerCase().includes(filter);
      })
    : rows;

  if (!filtered.length) {
    listEl.innerHTML = filter
      ? '<div class="empty-msg">No customers match "' + escapeHtmlC(filter) + '"</div>'
      : '<div class="empty-msg">No customers found</div>';
    return;
  }

  listEl.innerHTML = filtered.map(function(r) {
    var idx = rows.indexOf(r);
    return '<div class="customer-card" data-idx="' + idx + '">' +
      '<div class="customer-card-name">' + escapeHtmlC(r.name || '—') + '</div>' +
      '<div class="customer-card-meta">' +
        (r.address ? '<span>' + escapeHtmlC(r.address) + '</span>' : '') +
        (r.date    ? '<span class="customer-card-date">' + escapeHtmlC(r.date) + '</span>' : '') +
        (r.coop    ? '<span class="customer-card-coop">' + escapeHtmlC(r.coop) + '</span>' : '') +
      '</div>' +
      '<button class="btn-gold btn-sm customer-start-btn" data-idx="' + idx + '">Start Audit →</button>' +
    '</div>';
  }).join('');

  listEl.querySelectorAll('.customer-start-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.dataset.idx, 10);
      if (!isNaN(idx) && rows[idx]) startAuditFromCustomer(rows[idx]);
    });
  });
}

// escapeHtml is also defined in script.js — use that version when available,
// otherwise fall back to the local one (e.g. during isolated testing)
function _customersEscape(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeHtmlC(str) {
  return typeof escapeHtml === 'function' ? escapeHtml(str) : _customersEscape(str);
}

// ── START AUDIT FROM CUSTOMER ─────────────────────────────────
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
  S.auditId = null;
  S.dump    = '';
  S.photos  = [];
  S.tcSignature = null;
  if (typeof clearTCSignature === 'function') clearTCSignature();
  if (typeof save       === 'function') save();
  if (typeof fillFields === 'function') fillFields();
  if (typeof renderHeader === 'function') renderHeader();
  if (typeof renderVoiceDump === 'function') renderVoiceDump();
  if (typeof renderPhotoList === 'function') renderPhotoList();
  // Switch to Audit Data sub-tab
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

  // Always refresh values from storage when More tab opens
  sheetIdInput.value  = getSheetId();
  rangeInput.value    = getSheetRange();
  gsApiKeyInput.value = getSheetApiKey();

  // Column mapping fields
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
