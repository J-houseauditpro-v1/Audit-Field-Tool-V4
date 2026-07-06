// ============================================================
// AUDIT FIELD TOOL v3 — COMPLETE REWRITE
// ============================================================

// ── STATE ────────────────────────────────────────────────────
var S = {
  name: '', address: '', date: '', year: '', sqft: '', coop: '',
  customerNumber: null,
  scheduleJobId: null,
  researchNotes: '',
  dump: '',
  photos: [],       // [{id, auditId, note, category, ts}]
  auditId: null,
  tcSignature: null
};

// ── PHOTO CATEGORIES + QUICK PRESET NOTES ──────────────────────
// Built from real field note patterns — short codes show on thumbnails.
var PHOTO_CATEGORIES = [
  { id: 'hvac',           label: 'HVAC',            short: 'HVAC'   },
  { id: 'other_hvac',     label: 'Other HVAC',      short: 'O-HVAC' },
  { id: 'condenser',        label: 'Condenser',       short: 'COND'   },
  { id: 'duct',           label: 'Duct Sealing',    short: 'DUCT'   },
  { id: 'air',            label: 'Air Sealing',     short: 'AIR'    },
  { id: 'water',          label: 'Water Heater',    short: 'WTR'    },
  { id: 'insulation',     label: 'Insulation',      short: 'INSUL'  },
  { id: 'attic_measures', label: 'Attic Measures',   short: 'ATTIC'  },
  { id: 'thermostat',     label: 'Thermostat',       short: 'TSTAT'  },
  { id: 'lights',         label: 'Lights',           short: 'LITE'   },
  { id: 'exterior',       label: 'Exterior',        short: 'EXT'    },
  { id: 'general',        label: 'Custom Measures', short: 'CUSTOM' }
];

var WATER_PRESET_PHRASES = [
  'Electric Storage, Conditioned Space, Temp Medium.',
  'Electric Storage, Unconditioned Space, Temp Medium.',
  'Gas Storage, Conditioned Space, Temp Medium.',
  'Gas Storage, Unconditioned Space, Temp Medium.'
];

var STANDARD_DIGIT_KEYPAD = {
  type: 'numpad',
  rows: [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['0']]
};

var INSULATION_TYPE_PHRASES = [
  'Blown Fiberglass throughout,',
  'Blown Cellulose throughout,',
  'Fiberglass Batts throughout,',
  'Blown wool throughout,'
];

var PRESET_NOTES = {
  hvac: [
    { type: 'group', items: [
      'Central HVAC Fully Functional',
      'Central HVAC Partially Functional.',
      'Central HVAC Completely Non-Functional.',
      'Central HVAC Partially Present.',
      'No Central HVAC Present.'
    ]},
    { type: 'row', items: ['1 Ton', '1.5 Ton.', '2 Ton', '2.5 Ton', '3 Ton'] },
    { type: 'row', items: ['3.5 Ton', '4 Ton', '4.5 Ton', '5 Ton'] },
    { type: 'group', items: [
      'All Electric Heat Pump w/ heat strips.',
      'All Electric Heat Pump w/o heat strips.',
      'Split system, Natural Gas Furnace, w/ Electric AC.',
      'Split system, Propane Furnace, w/ Electric AC.',
      'Electric Central AC Only.',
      'Electric Resistance Heat Only.'
    ]}
  ],
  other_hvac: [
    { type: 'group', items: [
      'Wood Fireplace',
      'Wood Stove Freestanding',
      'Window Unit AC',
      'Electric Space Heater',
      'Propane Space heater',
      'Natural Gas Space Heater',
      'Mini Split'
    ]},
    { type: 'row', items: ['x1', 'x2', 'x3', 'x4', 'x5'] },
    { type: 'row', items: ['1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton', '3 Ton'] },
    { type: 'row', items: ['3.5 Ton', '4 Ton', '4.5 Ton', '5 Ton'] }
  ],
  condenser: [
    { type: 'row', items: ['1 Ton', '1.5 Ton', '2 Ton', '2.5 Ton', '3 Ton'] },
    { type: 'row', items: ['3.5 Ton', '4 Ton', '4.5 Ton', '5 Ton'] },
    { type: 'group', items: [
      'Condenser Cleaning Needed, No Cover Removal.',
      'Condenser Cleaning Needed, Remove Cover.',
      'No Condenser Cleaning Needed, unit is already clean.'
    ]}
  ],
  duct: [
    { type: 'group', items: [
      'Ductwork appears to be in excellent condition. No issues found.'
    ]},
    { type: 'code-row', items: ['DS1', 'DS2', 'DS3', 'DS4'] },
    { type: 'group', items: [
      'Trunk boot connection needs mastic.',
      'Supply Plenum connections need tape and mastic.',
      'Return cavity needs to be sealed.',
      'Line set Penetrations need to be sealed.',
      'Trunk boot connection needs to be sealed.',
      'Disconnected duct needs reconnected and tape and mastic.'
    ]}
  ],
  air: [
    { type: 'code-row', items: ['AS1', 'AS2', 'AS3', 'AS4'] },
    { type: 'group', items: [
      'Plumbing Penetrations need to be sealed.',
      'Electrical Penetrations need to be sealed.',
      'Boots need to be sealed.',
      'Fresh Air Duct needs to be sealed.',
      'HVAC Closet needs gaps sealed.'
    ]},
    { type: 'row', items: ['Front door needs', 'Back door needs'] },
    { type: 'row', items: ['Garage door needs', 'Door needs'] },
    { type: 'row', items: ['Dark kerf', 'White kerf', 'Tan kerf'] },
    { type: 'row', items: ['Dark sweep,', 'White sweep,'] },
    { type: 'row', items: ['bolstered Jam side.', 'bolstered at top.'] },
    { type: 'row', items: ['Corner Patch.', 'x1', 'x2', 'x3'] }
  ],
  water: WATER_PRESET_PHRASES,
  insulation: [
    { type: 'group', items: [
      'This home qualifies for Tier 1 whole home Insulation,',
      'This home qualifies for Tier 2 whole home Insulation,'
    ]},
    STANDARD_DIGIT_KEYPAD,
    { type: 'group', items: INSULATION_TYPE_PHRASES },
    { type: 'row', items: ['Sq ft', 'Inches', 'Spray foam throughout,'] }
  ],
  attic_measures: [
    { type: 'group', items: [
      'Attic Scuttle needs sealed + insulated,',
      'Walk in Attic Access needs sealed + insulated,',
      'Attic Fan needs sealed + insulated.',
      'Tier 1 attic insulation defects present,',
      'Tier 2 attic insulation defects present,'
    ]},
    STANDARD_DIGIT_KEYPAD,
    { type: 'group', items: INSULATION_TYPE_PHRASES },
    { type: 'row', items: ['Sq ft', 'Inches'] }
  ],
  thermostat: [
    { type: 'group', items: [
      'Home qualifies for smart thermostat, customer declined.',
      'Home qualifies for smart thermostat, I gave customer the QR code.',
      'Home Already has a smart thermostat.',
      'Home does not qualify for a smart thermostat.'
    ]}
  ],
  lights: [
    { type: 'group', items: [
      'Can lights to be retrofitted,',
      'Incandescent bulbs to be replaced with Led,'
    ]},
    STANDARD_DIGIT_KEYPAD
  ],
  exterior: [
    { type: 'row', items: ['Normal single family,', 'Mobile,'] },
    { type: 'row', items: ['single story,', 'two story,', 'three story,'] },
    { type: 'row', items: ['has a slab foundation,', 'has a Crawlspace,'] },
    { type: 'row', items: ['Crawlspace accessible,', 'Crawlspace not accessible'] },
    { type: 'row', items: ['Natural gas present,', 'Propane present,', 'has a garage,'] },
    { type: 'row', items: ['Brick siding,', 'Vinyl siding,', 'wood siding,', 'metal siding,'] }
  ],
  general: []
};

function normalizePresetItem(item) {
  if (typeof item === 'string') return { text: item, digit: false };
  return { text: item.text, digit: !!item.digit };
}

function normalizePresetBlocks(presets) {
  if (!presets || !presets.length) return [];
  if (typeof presets[0] === 'string') return [{ type: 'group', items: presets }];
  return presets;
}

function collectPresetMeta(blocks) {
  var meta = [];
  blocks.forEach(function(block) {
    if (block.type === 'numpad') {
      (block.rows || []).forEach(function(row) {
        row.forEach(function(d) { meta.push({ text: d, digit: true }); });
      });
    } else if (block.type === 'code-row' || block.items) {
      (block.items || []).forEach(function(item) { meta.push(normalizePresetItem(item)); });
    }
  });
  return meta;
}

function getCategoryShort(id) {
  var c = PHOTO_CATEGORIES.find(function(x) { return x.id === id; });
  return c ? c.short : '';
}
function getCategoryLabel(id) {
  var c = PHOTO_CATEGORIES.find(function(x) { return x.id === id; });
  return c ? c.label : '';
}

// ── INDEXEDDB PHOTO STORAGE ───────────────────────────────────
var photoDB = null;
var photoDBReady = false;
// In-memory cache for audit records — loaded from IDB at startup.
// getSaved()/setSaved() operate on this array synchronously, while IDB is
// updated asynchronously (fire-and-forget). This means zero changes needed
// at any call site that reads or writes the saved-audits list.
var _savedAudits = [];

function initPhotoDB(callback) {
  console.log('[PhotoDB] Opening IndexedDB...');
  var request = indexedDB.open('AuditFieldToolDB', 3);

  request.onupgradeneeded = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains('photos')) {
      db.createObjectStore('photos', { keyPath: 'id' });
      console.log('[PhotoDB] Created photos object store');
    }
    // Holds raw photo/T&C PDF blobs for audits imported from the pre-update
    // 3-file export format (JSON + photo PDF + T&C PDF). Those audits have
    // no S.photos / signature data to regenerate PDFs from, so the original
    // files are stored as-is and passed through untouched on export.
    if (!db.objectStoreNames.contains('legacyFiles')) {
      db.createObjectStore('legacyFiles', { keyPath: 'auditId' });
      console.log('[PhotoDB] Created legacyFiles object store');
    }
    // Full audit records (text + photo metadata + interpreted output).
    // Photos are still stored separately in the 'photos' store.
    if (!db.objectStoreNames.contains('audits')) {
      db.createObjectStore('audits', { keyPath: 'id' });
      console.log('[PhotoDB] Created audits object store');
    }
  };

  request.onblocked = function() {
    console.warn('[PhotoDB] Open blocked — close other tabs with this app open');
  };

  request.onsuccess = function(e) {
    photoDB = e.target.result;
    photoDBReady = true;
    photoDB.onclose = function() {
      photoDBReady = false;
      photoDB = null;
      console.warn('[PhotoDB] Connection closed');
    };
    console.log('[PhotoDB] IndexedDB ready');
    if (callback) callback();
  };

  request.onerror = function(e) {
    photoDBReady = false;
    photoDB = null;
    console.error('[PhotoDB] IndexedDB failed to open:', e);
    if (callback) callback();
  };
}

function savePhotoToDB(photoRecord, callback) {
  console.log('saving photo to IndexedDB', photoRecord.id);
  if (!photoDB || !photoDBReady) {
    console.error('[PhotoDB] savePhotoToDB skipped — IndexedDB not ready', { id: photoRecord.id, photoDBReady: photoDBReady });
    if (callback) callback(false);
    return;
  }
  var tx = photoDB.transaction('photos', 'readwrite');
  var store = tx.objectStore('photos');
  var request = store.put(photoRecord);
  request.onsuccess = function() {
    console.log('[PhotoDB] put succeeded for id', photoRecord.id);
  };
  request.onerror = function(e) {
    console.error('[PhotoDB] put failed for id', photoRecord.id, e);
  };
  tx.oncomplete = function() {
    console.log('[PhotoDB] transaction complete for id', photoRecord.id);
    if (callback) callback(true);
  };
  tx.onerror = function(e) {
    console.error('[PhotoDB] transaction error for id', photoRecord.id, e);
    if (callback) callback(false);
  };
}

function getPhotoFromDB(id, callback) {
  console.log('[PhotoDB] getPhotoFromDB', id);
  if (!photoDB || !photoDBReady) {
    console.warn('[PhotoDB] getPhotoFromDB skipped — IndexedDB not ready', id);
    callback(null);
    return;
  }
  var tx = photoDB.transaction('photos', 'readonly');
  var store = tx.objectStore('photos');
  var request = store.get(id);
  request.onsuccess = function() {
    var result = request.result || null;
    console.log('[PhotoDB] getPhotoFromDB result', id, result ? 'found' : 'not found');
    callback(result);
  };
  request.onerror = function(e) {
    console.error('[PhotoDB] getPhotoFromDB error', id, e);
    callback(null);
  };
}

function getPhotosByAuditId(auditId, callback) {
  if (!photoDB) { callback([]); return; }
  var tx = photoDB.transaction('photos', 'readonly');
  var store = tx.objectStore('photos');
  var results = [];
  var request = store.openCursor();
  request.onsuccess = function(e) {
    var cursor = e.target.result;
    if (cursor) {
      if (cursor.value.auditId === auditId) results.push(cursor.value);
      cursor.continue();
    } else {
      callback(results);
    }
  };
  request.onerror = function() { callback([]); };
}

function deletePhotosByAuditId(auditId, callback) {
  if (!photoDB) { if (callback) callback(); return; }
  var tx = photoDB.transaction('photos', 'readwrite');
  var store = tx.objectStore('photos');
  var request = store.openCursor();
  request.onsuccess = function(e) {
    var cursor = e.target.result;
    if (cursor) {
      if (cursor.value.auditId === auditId) cursor.delete();
      cursor.continue();
    } else {
      if (callback) callback();
    }
  };
  request.onerror = function() { if (callback) callback(); };
}

function deletePhotoFromDB(id, callback) {
  if (!photoDB) { if (callback) callback(); return; }
  var tx = photoDB.transaction('photos', 'readwrite');
  var store = tx.objectStore('photos');
  store.delete(id);
  tx.oncomplete = function() { if (callback) callback(); };
  tx.onerror = function() { if (callback) callback(); };
}

// ── LEGACY FILE STORAGE (pre-update imported audits) ───────────
// Stores PDFs as base64 data URLs, not raw Blob objects — IndexedDB's
// Blob support is unreliable on Safari/iOS (silent failures, corrupted
// reads). Data URLs are plain strings and store/retrieve reliably
// everywhere. Converted back to a Blob on export via dataURLtoBlob().
function saveLegacyFiles(auditId, photoPdfDataUrl, tcPdfDataUrl, callback) {
  if (!photoDB || !photoDBReady) {
    console.error('[LegacyFiles] save skipped — IndexedDB not ready', { photoDB: !!photoDB, photoDBReady: photoDBReady });
    if (callback) callback(false);
    return;
  }
  try {
    var tx = photoDB.transaction('legacyFiles', 'readwrite');
    var store = tx.objectStore('legacyFiles');
    store.put({ auditId: auditId, photoPdfDataUrl: photoPdfDataUrl || null, tcPdfDataUrl: tcPdfDataUrl || null });
    tx.oncomplete = function() { if (callback) callback(true); };
    tx.onerror = function(e) { console.error('[LegacyFiles] transaction error:', e.target.error); if (callback) callback(false); };
    tx.onabort = function(e) { console.error('[LegacyFiles] transaction aborted:', e.target.error); if (callback) callback(false); };
  } catch(e) {
    console.error('[LegacyFiles] save threw synchronously:', e);
    if (callback) callback(false);
  }
}

function getLegacyFiles(auditId, callback) {
  if (!photoDB || !photoDBReady) { callback(null); return; }
  var tx = photoDB.transaction('legacyFiles', 'readonly');
  var store = tx.objectStore('legacyFiles');
  var request = store.get(auditId);
  request.onsuccess = function() { callback(request.result || null); };
  request.onerror = function() { callback(null); };
}

function deleteLegacyFiles(auditId, callback) {
  if (!photoDB) { if (callback) callback(); return; }
  var tx = photoDB.transaction('legacyFiles', 'readwrite');
  var store = tx.objectStore('legacyFiles');
  store.delete(auditId);
  tx.oncomplete = function() { if (callback) callback(); };
  tx.onerror = function() { if (callback) callback(); };
}

// ── STORAGE ──────────────────────────────────────────────────
function load() {
  try {
    var d = localStorage.getItem('aft_current');
    if (d) Object.assign(S, JSON.parse(d));
  } catch(e) {}
}
function save() {
  console.log('[PhotoDB] save() S.photos metadata:', JSON.parse(JSON.stringify(S.photos)));
  try { localStorage.setItem('aft_current', JSON.stringify(S)); } catch(e) {
    console.error('[PhotoDB] localStorage save failed:', e);
  }
}
function getSaved() {
  return _savedAudits;
}
function setSaved(arr) {
  _savedAudits = arr;
  // Persist to IndexedDB asynchronously (fire-and-forget).
  // Clear + rewrite is safe for hundreds of records; each record is ~10-50 KB.
  if (!photoDB || !photoDBReady) return;
  try {
    var tx = photoDB.transaction(['audits'], 'readwrite');
    var store = tx.objectStore('audits');
    store.clear();
    arr.forEach(function(rec) { try { store.put(rec); } catch(e) {} });
  } catch(e) { console.warn('[AuditDB] setSaved IDB write failed:', e); }
}

// Load all audit records from IDB into the in-memory cache.
// Must be called once at startup before any getSaved/setSaved calls.
function loadAuditsFromIDB(callback) {
  if (!photoDB || !photoDBReady) { if (callback) callback(); return; }
  try {
    var tx = photoDB.transaction(['audits'], 'readonly');
    var store = tx.objectStore('audits');
    var req = store.getAll();
    req.onsuccess = function() {
      var results = req.result || [];
      // Newest first (matches previous localStorage sort)
      results.sort(function(a, b) {
        return (b.savedAt || '').localeCompare(a.savedAt || '');
      });
      _savedAudits = results;
      console.log('[AuditDB] Loaded ' + results.length + ' audits from IndexedDB');
      if (callback) callback();
    };
    req.onerror = function() { console.warn('[AuditDB] getAll failed'); if (callback) callback(); };
  } catch(e) { console.warn('[AuditDB] loadAuditsFromIDB failed:', e); if (callback) callback(); }
}

// ── TOAST ────────────────────────────────────────────────────
var toastTimer;
function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.style.display = 'none'; }, 2500);
}

// ── AUTOSAVE INDICATOR ──────────────────────────────────────────
// Tiny, sub-1-second pop at the bottom of the screen. pointer-events:none in
// the CSS means it can never block a tap even if it visually overlaps a
// button for that instant.
function showAutosaveIndicator() {
  var el = document.getElementById('autosave-indicator');
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth; // force reflow so the animation restarts on rapid repeats
  el.classList.add('pop');
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initPhotoDB(function() {
  loadAuditsFromIDB(function() {
  // One-time migration: if localStorage has aft_saved data and IDB is empty,
  // pull it into the cache and write to IDB, then clear the localStorage key.
  try {
    var lsData = localStorage.getItem('aft_saved');
    if (lsData) {
      var lsArr = JSON.parse(lsData);
      if (Array.isArray(lsArr) && lsArr.length > 0 && _savedAudits.length === 0) {
        _savedAudits = lsArr;
        setSaved(_savedAudits);
        console.log('[AuditDB] Migrated ' + lsArr.length + ' audits from localStorage to IndexedDB');
      }
      localStorage.removeItem('aft_saved');
    }
  } catch(e) { console.warn('[AuditDB] localStorage migration failed:', e); }
  console.log('[PhotoDB] App init starting — IndexedDB is ready');
  load();
  fillFields();
  renderHeader();
  renderVoiceDump();
  renderPhotoList();
  renderAuditsList();
  // Weekly batches render on tab open
  initTabs();
  initCustomerFields();
  initCheatsheet();
  initVoice();
  initPhotoInput();
  initPhotoViewControls();
  positionPhotoStickyControls();
  window.addEventListener('resize', updateTopChromeLayout);
  window.addEventListener('orientationchange', updateTopChromeLayout);
  updateTopChromeLayout();
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      stopVoiceRec();
      autosaveAudit();
    }
  });
  window.addEventListener('pagehide', function() { autosaveAudit(); });
  initModal();
  initPhotoMarkup();
  initAuditsTab();
  initLegacyImport();
  initV2V3Import();
  initExportTab();
  initAuditorSettings();
  var btnResetAudit = document.getElementById('btn-reset-audit');
  if (btnResetAudit) {
    btnResetAudit.addEventListener('click', function() {
      if (confirm('Reset current audit? Export first — this cannot be undone.')) clearCurrent();
    });
  }
  initTCTab();
  renderTCInfo();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  }); // end loadAuditsFromIDB
  }); // end initPhotoDB
}); // end DOMContentLoaded

// ── TABS ─────────────────────────────────────────────────────
var currentMainTab = 'jobs';
var currentSubTab = { jobs: 'schedule', audit: 'voice', processing: 'archive' };
var subTabsInitialized = false;

var MAIN_TAB_CONFIG = {
  jobs: { subs: ['schedule', 'research'], defaultSub: 'schedule' },
  audit: { subs: ['voice', 'tc', 'photos'], defaultSub: 'voice' },
  processing: { subs: ['archive', 'interpret', 'export'], defaultSub: 'archive' }
};

function subPanelId(sub) { return 'tab-' + sub; }

function isVoiceSubActive() {
  return currentMainTab === 'audit' && currentSubTab.audit === 'voice';
}

function runSubTabInit(main, sub) {
  if (main === 'jobs' && sub === 'schedule' && typeof initCustomersTab === 'function') initCustomersTab();
  if (main === 'jobs' && sub === 'research' && typeof initResearchTab === 'function') initResearchTab();
  if (main === 'audit' && sub === 'voice' && typeof renderPhotoNotesSummary === 'function') renderPhotoNotesSummary();
  if (main === 'audit' && sub === 'voice' && typeof renderResearchNotesSummary === 'function') renderResearchNotesSummary();
  if (main === 'audit' && sub === 'tc' && typeof renderTCInfo === 'function') renderTCInfo();
  if (main === 'audit' && sub === 'photos') positionPhotoStickyControls();
  if (main === 'processing' && sub === 'archive' && typeof renderAuditsList === 'function') renderAuditsList();
  if (main === 'processing' && sub === 'interpret' && typeof initInterpretTab === 'function') initInterpretTab();
  if (main === 'processing' && sub === 'export' && typeof renderWeeklyBatches === 'function') renderWeeklyBatches();
}

function switchSubTab(main, sub, options) {
  options = options || {};
  if (!MAIN_TAB_CONFIG[main]) return;
  if (sub) currentSubTab[main] = sub;
  else sub = currentSubTab[main];

  var mainPanel = document.getElementById('tab-' + main);
  if (!mainPanel || mainPanel.style.display === 'none') return;

  if (!options.keepRecording && !(main === 'audit' && sub === 'voice')) stopVoiceRec();

  document.querySelectorAll('.sub-pill[data-main="' + main + '"]').forEach(function(p) {
    p.classList.toggle('active', p.dataset.sub === sub);
  });
  MAIN_TAB_CONFIG[main].subs.forEach(function(id) {
    var el = document.getElementById(subPanelId(id));
    if (el) el.style.display = (id === sub) ? 'block' : 'none';
  });

  runSubTabInit(main, sub);
  updateTopChromeLayout();
}

function switchMainTab(mainId, subId) {
  autosaveAudit();

  var activeSub = subId || currentSubTab[mainId] || (MAIN_TAB_CONFIG[mainId] && MAIN_TAB_CONFIG[mainId].defaultSub);
  if (!(mainId === 'audit' && activeSub === 'voice')) stopVoiceRec();

  var gear = document.getElementById('header-settings-btn');
  if (gear) gear.classList.remove('active');

  document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tabpanel').forEach(function(p) { p.style.display = 'none'; });

  currentMainTab = mainId;
  var tabBtn = document.querySelector('[data-tab="' + mainId + '"]');
  var tabPanel = document.getElementById('tab-' + mainId);
  if (tabBtn) tabBtn.classList.add('active');
  if (tabPanel) tabPanel.style.display = 'block';

  if (subId) currentSubTab[mainId] = subId;
  switchSubTab(mainId, currentSubTab[mainId], { keepRecording: mainId === 'audit' && currentSubTab[mainId] === 'voice' });
}

function initSubTabs() {
  if (subTabsInitialized) return;
  subTabsInitialized = true;
  document.querySelectorAll('.sub-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      autosaveAudit();
      switchSubTab(pill.dataset.main, pill.dataset.sub);
    });
  });
}

function getActiveSubnavHeight() {
  var panel = document.getElementById('tab-' + currentMainTab);
  if (!panel || panel.style.display === 'none') return 0;
  var subnav = document.getElementById('subnav-' + currentMainTab);
  return subnav ? subnav.offsetHeight : 0;
}

function updateTopChromeLayout() {
  var header = document.querySelector('.header');
  var tabnav = document.querySelector('.tabnav');
  if (!header || !tabnav) return;
  var headerH = header.offsetHeight;
  document.documentElement.style.setProperty('--header-height', headerH + 'px');
  tabnav.style.top = headerH + 'px';
  var total = headerH + tabnav.offsetHeight;
  document.documentElement.style.setProperty('--top-chrome-height', total + 'px');
  document.documentElement.style.setProperty('--main-subnav-height', getActiveSubnavHeight() + 'px');
  positionPhotoStickyControls();
}

function positionPhotoStickyControls() {
  updateTopChromeLayout();
}

function openSettingsPanel() {
  autosaveAudit();
  stopVoiceRec();
  document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tabpanel').forEach(function(p) { p.style.display = 'none'; });
  var gear = document.getElementById('header-settings-btn');
  if (gear) gear.classList.add('active');
  document.getElementById('tab-more').style.display = 'block';
  initAftMoreTab();
  if (typeof refreshInterpretSettingsUI === 'function') refreshInterpretSettingsUI();
  if (typeof initGoogleSheetsSettings === 'function') initGoogleSheetsSettings();
  var auditorInput = document.getElementById('auditor-name-input');
  if (auditorInput) {
    auditorInput.value = getStoredAuditorName();
    updateAuditorNamePreview(auditorInput.value);
  }
}

function initTabs() {
  var settingsBtn = document.getElementById('header-settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsPanel);
  }

  document.querySelectorAll('.tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchMainTab(btn.dataset.tab);
    });
  });
  initSubTabs();
  switchSubTab('jobs', 'schedule');
}

// ── CUSTOMER FIELDS ───────────────────────────────────────────
var fieldMap = [
  ['f-name','name'], ['f-address','address'], ['f-date','date'],
  ['f-year','year'], ['f-sqft','sqft'], ['f-coop','coop']
];

function fillFields() {
  fieldMap.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.value = S[pair[1]] || '';
  });
}

function initCustomerFields() {
  fieldMap.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    el.addEventListener('input', function() {
      S[pair[1]] = el.value;
      save();
      renderHeader();
    });
    el.addEventListener('change', function() {
      S[pair[1]] = el.value;
      save();
      renderHeader();
    });
  });
}

function renderHeader() {
  var el = document.getElementById('header-sub');
  el.textContent = S.name ? S.name + (S.address ? ' — ' + S.address : '') : 'No customer loaded';
}

// ── CHEAT SHEET ───────────────────────────────────────────────
function initCheatsheet() {
  document.getElementById('cheat-toggle').addEventListener('click', function() {
    var body = document.getElementById('cheat-body');
    var arrow = document.getElementById('cheat-arrow');
    var open = body.classList.toggle('open');
    arrow.textContent = open ? '▲' : '▼';
  });
}

// ── GENERAL NOTES (voice + typing) ───────────────────────────
var voiceRec = null;
var voiceRecActive = false;

function stopVoiceRec() {
  var recordBtn = document.getElementById('record-voice-btn');
  var wasActive = voiceRecActive;
  voiceRecActive = false;
  if (voiceRec) {
    try { voiceRec.stop(); } catch(e) {}
    voiceRec = null;
  }
  if (recordBtn) {
    recordBtn.classList.remove('recording');
    recordBtn.textContent = '🎙 Record Voice 🎙';
  }
  var dumpEl = document.getElementById('voice-dump');
  if (dumpEl) dumpEl.value = S.dump;
  if (wasActive) {
    save();
    autosaveAudit();
  }
}

function initVoice() {
  var dumpEl = document.getElementById('voice-dump');
  if (!dumpEl) return;

  dumpEl.addEventListener('input', function() { S.dump = dumpEl.value; save(); });

  var clearBtn = document.getElementById('voice-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      if (!S.dump) return;
      if (confirm('Clear all general notes? This cannot be undone.')) {
        stopVoiceRec();
        S.dump = ''; dumpEl.value = ''; save();
      }
    });
  }

  var recordBtn = document.getElementById('record-voice-btn');
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!recordBtn) return;

  if (!SR) {
    recordBtn.disabled = true;
    recordBtn.textContent = 'Voice not supported';
    return;
  }

  recordBtn.addEventListener('click', function() {
    voiceRecActive ? stopVoiceRec() : startVoiceRec();
  });

  function startVoiceRec() {
    dumpEl.blur();
    if (document.activeElement) document.activeElement.blur();

    voiceRec = new SR();
    voiceRec.continuous = true;
    voiceRec.interimResults = true;
    voiceRec.lang = 'en-US';

    voiceRec.onstart = function() {
      voiceRecActive = true;
      recordBtn.classList.add('recording');
      recordBtn.textContent = '🔴 Recording — tap to stop';
    };

    voiceRec.onresult = function(e) {
      var final = '', interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      if (final) {
        S.dump += final;
        save();
        autosaveAudit();
      }
      dumpEl.value = S.dump + interim;
    };

    voiceRec.onerror = function(e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast('Microphone permission denied — check Settings for Safari/Chrome');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        toast('Voice error: ' + e.error);
      }
      stopVoiceRec();
    };

    voiceRec.onend = function() {
      if (voiceRecActive) {
        try { voiceRec.start(); } catch(err) { stopVoiceRec(); }
      }
    };

    try {
      voiceRec.start();
    } catch(err) {
      toast('Could not start voice — ' + err.message);
      stopVoiceRec();
    }
  }
}

function renderVoiceDump() {
  var el = document.getElementById('voice-dump');
  if (el) el.value = S.dump;
}

// Auto-populated, read-only summary of all photo notes — grouped by category,
// shown on the Audit Data tab separate from the Voice Dump. Lets Joseph see
// everything he's captured (voice + photo notes together) before leaving the
// property, without digging through the Photos tab. Kept in sync by being
// called from renderPhotoList(), which already fires on every photo/note
// add, edit, or delete.
function renderPhotoNotesSummary() {
  var el = document.getElementById('photo-notes-summary');
  var countEl = document.getElementById('photo-notes-count');
  if (!el) return;

  var withNotes = buildPhotoNotesArray(S.photos);

  if (countEl) countEl.textContent = withNotes.length ? '(' + withNotes.length + ')' : '';

  if (!withNotes.length) {
    el.innerHTML = '<div class="empty-msg">No photo notes yet</div>';
    return;
  }

  var grouped = {};
  var order = [];
  withNotes.forEach(function(p) {
    var cat = p.category || 'general';
    if (!grouped[cat]) { grouped[cat] = []; order.push(cat); }
    grouped[cat].push(p);
  });

  el.innerHTML = order.map(function(cat) {
    var label = (grouped[cat][0].categoryLabel) || 'Custom Measures';
    var items = grouped[cat].map(function(p) {
      return '<div class="photo-notes-item">' + escapeHtml(p.note) + '</div>';
    }).join('');
    return '<div class="photo-notes-group">' +
      '<div class="photo-notes-group-label">' + escapeHtml(label) + '</div>' +
      items +
    '</div>';
  }).join('');
}

function renderResearchNotesSummary() {
  var el = document.getElementById('research-notes-summary');
  if (!el) return;
  var notes = (typeof S !== 'undefined' && S.researchNotes) ? S.researchNotes.trim() : '';
  if (!notes) {
    el.innerHTML = '<div class="empty-msg">No research notes yet</div>';
    return;
  }
  el.innerHTML = '<div class="research-notes-body">' + escapeHtml(notes).replace(/\n/g, '<br>') + '</div>';
}

// ── PHOTOS ────────────────────────────────────────────────────
function compressImage(dataUrl, callback) {
  var img = new Image();
  img.onload = function() {
    var maxWidth = 1200;
    var quality = 0.75;
    var w = img.width;
    var h = img.height;

    if (w > maxWidth) {
      h = Math.round(h * maxWidth / w);
      w = maxWidth;
    }

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', quality));
  };
  img.onerror = function() { callback(dataUrl); };
  img.src = dataUrl;
}

function initPhotoInput() {
  document.getElementById('photo-input').addEventListener('change', function(e) {
    if (!photoDBReady) {
      console.error('[PhotoDB] Photo capture blocked — IndexedDB not ready yet');
      toast('Photo storage not ready — wait a moment and try again');
      e.target.value = '';
      return;
    }
    var files = Array.from(e.target.files);
    var room = 50 - S.photos.length;
    if (files.length > room) {
      alert('Only ' + room + ' more photos allowed (50 max).');
      files = files.slice(0, room);
    }
    if (!files.length) {
      e.target.value = '';
      return;
    }
    var pending = files.length;
    var done = 0;
    var addedIds = [];
    function finishBatch() {
      done++;
      if (done === pending) {
        save();
        autosaveAudit();
        if (files.length === 1 && addedIds.length === 1) {
          openModal(addedIds[0]);
        } else {
          renderPhotoList();
        }
      }
    }
    files.forEach(function(f) {
      var r = new FileReader();
      r.onload = function(ev) {
        compressImage(ev.target.result, function(compressed) {
          var id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
          var ts = new Date().toISOString();
          var auditId = S.auditId || ('audit-' + Date.now());
          S.auditId = auditId;

          savePhotoToDB({ id: id, auditId: auditId, dataUrl: compressed, note: '', category: '', ts: ts, markupStrokes: [] }, function(ok) {
            if (ok) {
              S.photos.push({ id: id, auditId: auditId, note: '', category: '', ts: ts, markupStrokes: [] });
              addedIds.push(id);
              console.log('[PhotoDB] Photo metadata added to S.photos, count:', S.photos.length);
            } else {
              console.error('[PhotoDB] Photo not added to S.photos — IndexedDB save failed', id);
              toast('Photo could not be saved — try again');
            }
            finishBatch();
          });
        });
      };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  });
}

var photoViewMode = 'grid'; // 'grid' or 'full'
var selectMode = false;
var selectedPhotoIds = new Set();
var photoListScrollY = null;

function renderPhotoList() {
  renderPhotoNotesSummary();
  photoListScrollY = window.scrollY;
  var list = document.getElementById('photo-list');
  var countEl = document.getElementById('photo-count');
  var warnEl = document.getElementById('photo-warn');
  var n = S.photos.length;

  countEl.textContent = n + ' / 50 photos';
  countEl.className = 'photo-count-display' + (n >= 45 ? ' danger' : n >= 38 ? ' warn' : '');
  warnEl.style.display = n >= 38 ? 'block' : 'none';

  if (!n) {
    list.innerHTML = '<div class="empty-msg">No photos yet — tap Add Photo</div>';
    if (photoListScrollY !== null) { window.scrollTo(0, photoListScrollY); photoListScrollY = null; }
    return;
  }

  if (photoViewMode === 'grid') {
    renderGridView(list);
  } else {
    renderFullView(list);
  }
}

function renderGridView(list) {
  list.innerHTML = '<div class="empty-msg" style="padding:8px;">Loading...</div>';

  var loaded = 0;
  var photoData = {};

  if (S.photos.length === 0) { list.innerHTML = ''; return; }

  S.photos.forEach(function(p) {
    getPhotoFromDB(p.id, function(record) {
      if (record) photoData[p.id] = record.dataUrl;
      else if (p.dataUrl) photoData[p.id] = p.dataUrl;
      loaded++;
      if (loaded === S.photos.length) buildGrid(list, photoData);
    });
  });

  function buildGrid(list, photoData) {
    var grid = document.createElement('div');
    grid.className = 'photo-grid';

    S.photos.forEach(function(p, i) {
      var wrap = document.createElement('div');
      wrap.className = 'photo-thumb-wrap';
      wrap.dataset.id = p.id;

      var dataUrl = photoData[p.id] || '';
      var isSelected = selectedPhotoIds.has(p.id);

      wrap.innerHTML =
        (dataUrl ? '<img src="' + dataUrl + '" loading="lazy">' : '<div style="width:100%;height:100%;background:#333;display:flex;align-items:center;justify-content:center;color:#666;font-size:1.5rem;">📷</div>') +
        '<div class="photo-thumb-num">' + (i+1) + '</div>' +
        (p.note ? '<div class="photo-thumb-note-dot"></div>' : '') +
        (p.category ? '<div class="photo-thumb-cat">' + getCategoryShort(p.category) + '</div>' : '') +
        '<div class="photo-thumb-select-overlay' + (isSelected ? ' selected' : '') + '">' +
          '<div class="photo-thumb-checkmark">✓</div>' +
        '</div>';

      wrap.addEventListener('click', function() {
        if (selectMode) {
          toggleSelectPhoto(p.id, wrap);
        } else {
          openModal(p.id);
        }
      });

      grid.appendChild(wrap);
      attachThumbMarkupOverlay(wrap, p.id, p.markupStrokes || []);
    });

    list.innerHTML = '';
    list.appendChild(grid);
    if (photoListScrollY !== null) { window.scrollTo(0, photoListScrollY); photoListScrollY = null; }
  }
}

function renderFullView(list) {
  list.innerHTML = '<div class="empty-msg" style="padding:8px;">Loading...</div>';

  var loaded = 0;
  var photoData = {};

  S.photos.forEach(function(p) {
    getPhotoFromDB(p.id, function(record) {
      if (record) photoData[p.id] = record.dataUrl;
      else if (p.dataUrl) photoData[p.id] = p.dataUrl;
      loaded++;
      if (loaded === S.photos.length) buildFullCards(list, photoData);
    });
  });

  function buildFullCards(list, photoData) {
    list.innerHTML = '';
    S.photos.forEach(function(p, i) {
      var card = document.createElement('div');
      card.className = 'photo-card';
      var t = new Date(p.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      var dataUrl = photoData[p.id] || '';

      card.innerHTML =
        (dataUrl ? '<img src="' + dataUrl + '" loading="lazy" alt="Photo ' + (i+1) + '">' :
          '<div style="background:#222;padding:30px;text-align:center;color:#666;font-size:2rem;">📷</div>') +
        '<div class="photo-card-body">' +
          '<div class="photo-card-meta">Photo ' + (i+1) + ' · ' + t + (p.category ? '<span class="photo-card-cat">' + getCategoryShort(p.category) + '</span>' : '') + '</div>' +
          '<div class="photo-card-note' + (p.note ? '' : ' empty') + '">' + (p.note || 'No note — tap Edit to add') + '</div>' +
          '<div class="photo-card-actions">' +
            '<button class="btn-sm edit-photo-btn" data-id="' + p.id + '">✏️ Edit Note</button>' +
            '<button class="btn-danger-sm del-photo-btn" data-id="' + p.id + '">🗑 Delete</button>' +
          '</div>' +
        '</div>';
      list.appendChild(card);
      if (dataUrl) {
        var imgWrap = card.querySelector('img');
        if (imgWrap && imgWrap.parentNode) {
          var wrap = document.createElement('div');
          wrap.style.position = 'relative';
          imgWrap.parentNode.insertBefore(wrap, imgWrap);
          wrap.appendChild(imgWrap);
          attachThumbMarkupOverlay(wrap, p.id, p.markupStrokes || []);
        }
      }
    });

    list.querySelectorAll('.edit-photo-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { openModal(Number(btn.dataset.id)); });
    });
    list.querySelectorAll('.del-photo-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (confirm('Delete this photo?')) {
          var id = Number(btn.dataset.id);
          deletePhotoFromDB(id, function() {
            S.photos = S.photos.filter(function(p) { return p.id !== id; });
            save(); autosaveAudit(); renderPhotoList();
          });
        }
      });
    });
    if (photoListScrollY !== null) { window.scrollTo(0, photoListScrollY); photoListScrollY = null; }
  }
}

function toggleSelectPhoto(id, wrap) {
  if (selectedPhotoIds.has(id)) {
    selectedPhotoIds.delete(id);
    wrap.querySelector('.photo-thumb-select-overlay').classList.remove('selected');
  } else {
    selectedPhotoIds.add(id);
    wrap.querySelector('.photo-thumb-select-overlay').classList.add('selected');
  }
  updateSelectUI();
}

function updateSelectUI() {
  var count = selectedPhotoIds.size;
  var countEl = document.getElementById('select-count');
  var deleteBar = document.getElementById('delete-bar');
  if (countEl) countEl.textContent = count + ' selected';
  if (deleteBar) deleteBar.style.display = count > 0 ? 'block' : 'none';
}

function enterSelectMode() {
  selectMode = true;
  selectedPhotoIds.clear();
  var toolbar = document.getElementById('select-toolbar');
  if (toolbar) toolbar.style.display = 'flex';
  var deleteBar = document.getElementById('delete-bar');
  if (deleteBar) deleteBar.style.display = 'none';
  var gridBtn = document.getElementById('btn-view-grid');
  var fullBtn = document.getElementById('btn-view-full');
  if (gridBtn) gridBtn.disabled = true;
  if (fullBtn) fullBtn.disabled = true;
  renderPhotoList();
}

function exitSelectMode() {
  selectMode = false;
  selectedPhotoIds.clear();
  var toolbar = document.getElementById('select-toolbar');
  if (toolbar) toolbar.style.display = 'none';
  var deleteBar = document.getElementById('delete-bar');
  if (deleteBar) deleteBar.style.display = 'none';
  var gridBtn = document.getElementById('btn-view-grid');
  var fullBtn = document.getElementById('btn-view-full');
  if (gridBtn) gridBtn.disabled = false;
  if (fullBtn) fullBtn.disabled = false;
  renderPhotoList();
}

function initPhotoViewControls() {
  var gridBtn = document.getElementById('btn-view-grid');
  var fullBtn = document.getElementById('btn-view-full');

  if (gridBtn) gridBtn.addEventListener('click', function() {
    photoViewMode = 'grid';
    gridBtn.classList.add('active');
    fullBtn.classList.remove('active');
    exitSelectMode();
  });

  if (fullBtn) fullBtn.addEventListener('click', function() {
    photoViewMode = 'full';
    fullBtn.classList.add('active');
    gridBtn.classList.remove('active');
    exitSelectMode();
  });

  var selectAllBtn = document.getElementById('btn-select-all');
  var cancelSelectBtn = document.getElementById('btn-cancel-select');
  var deleteSelectedBtn = document.getElementById('btn-delete-selected');

  if (selectAllBtn) selectAllBtn.addEventListener('click', function() {
    if (!selectMode) enterSelectMode();
    S.photos.forEach(function(p) { selectedPhotoIds.add(p.id); });
    renderPhotoList();
    updateSelectUI();
  });

  if (cancelSelectBtn) cancelSelectBtn.addEventListener('click', exitSelectMode);

  if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', function() {
    if (selectedPhotoIds.size === 0) return;
    if (!confirm('Delete ' + selectedPhotoIds.size + ' selected photo(s)?')) return;

    var idsToDelete = Array.from(selectedPhotoIds);
    var deleted = 0;

    idsToDelete.forEach(function(id) {
      deletePhotoFromDB(id, function() {
        deleted++;
        if (deleted === idsToDelete.length) {
          S.photos = S.photos.filter(function(p) { return !idsToDelete.includes(p.id); });
          save();
          autosaveAudit();
          exitSelectMode();
          toast('Deleted ' + idsToDelete.length + ' photo(s)');
        }
      });
    });
  });

  var photoList = document.getElementById('photo-list');
  if (photoList) {
    photoList.addEventListener('pointerdown', function(e) {
      var wrap = e.target.closest('.photo-thumb-wrap');
      if (!wrap || selectMode) return;
      var pressTimer = setTimeout(function() {
        enterSelectMode();
        toggleSelectPhoto(Number(wrap.dataset.id), wrap);
      }, 600);
      wrap.addEventListener('pointerup', function() { clearTimeout(pressTimer); }, {once:true});
      wrap.addEventListener('pointermove', function() { clearTimeout(pressTimer); }, {once:true});
    });
  }

  var uploadInput = document.getElementById('photo-upload-input');
  if (uploadInput) {
    uploadInput.addEventListener('change', function(e) {
      if (!photoDBReady) {
        toast('Photo storage not ready — wait a moment and try again');
        e.target.value = '';
        return;
      }
      var files = Array.from(e.target.files);
      var room = 50 - S.photos.length;
      if (files.length > room) { alert('Only ' + room + ' more photos allowed.'); files = files.slice(0, room); }
      if (!files.length) { e.target.value = ''; return; }
      var pending = files.length;
      var done = 0;
      var added = 0;
      function finishBatch() {
        done++;
        if (done === pending) {
          save();
          autosaveAudit();
          renderPhotoList();
          if (added) toast(added + ' photo(s) added');
        }
      }
      files.forEach(function(f) {
        var r = new FileReader();
        r.onload = function(ev) {
          compressImage(ev.target.result, function(compressed) {
            var id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
            var ts = new Date().toISOString();
            var auditId = S.auditId || ('audit-' + Date.now());
            S.auditId = auditId;
            savePhotoToDB({ id: id, auditId: auditId, dataUrl: compressed, note: '', category: '', ts: ts, markupStrokes: [] }, function(ok) {
              if (ok) {
                S.photos.push({ id: id, auditId: auditId, note: '', category: '', ts: ts, markupStrokes: [] });
                added++;
              } else {
                toast('Photo could not be saved — try again');
              }
              finishBatch();
            });
          });
        };
        r.readAsDataURL(f);
      });
      e.target.value = '';
    });
  }
}

// ── PHOTO MODAL ───────────────────────────────────────────────
var modalPhotoId = null;
var noteAutosaveTimer = null;

// ── PHOTO MARKUP ──────────────────────────────────────────────
var markupPhotoId = null;
var markupStrokesWorking = [];
var markupCurrentStroke = null;
var markupPenColor = '#e03333';
var markupPenWidth = 4;
var markupDrawing = false;

var MARKUP_REF_WIDTH = 400;

function getPhotoMarkupStrokes(photoId) {
  var p = S.photos.find(function(x) { return x.id === photoId; });
  return (p && p.markupStrokes && p.markupStrokes.length) ? JSON.parse(JSON.stringify(p.markupStrokes)) : [];
}

function saveMarkupStrokes(photoId, strokes) {
  var p = S.photos.find(function(x) { return x.id === photoId; });
  if (p) p.markupStrokes = strokes.length ? strokes : [];
  save();
  getPhotoFromDB(photoId, function(record) {
    if (record) {
      record.markupStrokes = strokes.length ? strokes : [];
      savePhotoToDB(record, null);
    }
  });
  autosaveAudit();
}

function drawStrokesOnCanvas(ctx, strokes, canvasWidth, canvasHeight) {
  (strokes || []).forEach(function(stroke) {
    if (!stroke.points || stroke.points.length < 2) return;
    ctx.strokeStyle = stroke.color || '#e03333';
    ctx.lineWidth = Math.max(1, (stroke.width || 4) * (canvasWidth / MARKUP_REF_WIDTH));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.points.forEach(function(pt, i) {
      var x = pt.x * canvasWidth;
      var y = pt.y * canvasHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function compositePhotoWithMarkup(dataUrl, strokes, callback) {
  if (!dataUrl) { callback(null); return; }
  if (!strokes || !strokes.length) { callback(dataUrl); return; }
  var img = new Image();
  img.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    drawStrokesOnCanvas(ctx, strokes, canvas.width, canvas.height);
    callback(canvas.toDataURL('image/jpeg', 0.92));
  };
  img.onerror = function() { callback(dataUrl); };
  img.src = dataUrl;
}

function preparePhotosForExport(photoMetas, callback) {
  var result = [];
  var i = 0;
  function next() {
    if (i >= photoMetas.length) { callback(result); return; }
    var meta = photoMetas[i];
    getPhotoFromDB(meta.id, function(record) {
      var dataUrl = (record && record.dataUrl) ? record.dataUrl : (meta.dataUrl || null);
      var strokes = meta.markupStrokes || (record && record.markupStrokes) || [];
      compositePhotoWithMarkup(dataUrl, strokes, function(composited) {
        result.push({
          dataUrl: composited,
          note: meta.note || (record ? record.note : ''),
          category: meta.category || (record ? record.category : '') || '',
          ts: meta.ts || meta.timestamp
        });
        i++;
        next();
      });
    });
  }
  next();
}

function renderModalMarkupOverlay() {
  var wrap = document.getElementById('modal-img-wrap');
  var img = document.getElementById('modal-img');
  var canvas = document.getElementById('modal-markup-canvas');
  if (!wrap || !img || !canvas || modalPhotoId === null) return;
  if (!img.complete || !img.naturalWidth) {
    img.onload = function() { renderModalMarkupOverlay(); };
    return;
  }
  var strokes = getPhotoMarkupStrokes(modalPhotoId);
  var wrapRect = wrap.getBoundingClientRect();
  var imgRect = img.getBoundingClientRect();
  var w = Math.round(imgRect.width);
  var h = Math.round(imgRect.height);
  if (!w || !h) { canvas.style.display = 'none'; return; }
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.style.left = Math.round(imgRect.left - wrapRect.left) + 'px';
  canvas.style.top = Math.round(imgRect.top - wrapRect.top) + 'px';
  canvas.style.display = strokes.length ? 'block' : 'none';
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (strokes.length) drawStrokesOnCanvas(ctx, strokes, w, h);
}

function attachThumbMarkupOverlay(wrap, photoId, strokes) {
  var existing = wrap.querySelector('.photo-thumb-markup-canvas');
  if (existing) existing.remove();
  if (!strokes || !strokes.length) return;
  var img = wrap.querySelector('img');
  if (!img) return;
  var canvas = document.createElement('canvas');
  canvas.className = 'photo-thumb-markup-canvas';
  wrap.appendChild(canvas);
  function draw() {
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    drawStrokesOnCanvas(ctx, strokes, w, h);
  }
  if (img.complete) draw();
  else img.onload = draw;
}

function layoutMarkupCanvas() {
  var stage = document.getElementById('markup-stage');
  var img = document.getElementById('markup-img');
  var canvas = document.getElementById('markup-canvas');
  if (!stage || !img || !canvas || !img.complete || !img.naturalWidth) return;
  var stageRect = stage.getBoundingClientRect();
  var imgRect = img.getBoundingClientRect();
  var w = Math.round(imgRect.width);
  var h = Math.round(imgRect.height);
  if (!w || !h) return;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.style.left = Math.round(imgRect.left - stageRect.left) + 'px';
  canvas.style.top = Math.round(imgRect.top - stageRect.top) + 'px';
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  var allStrokes = markupStrokesWorking.slice();
  if (markupCurrentStroke && markupCurrentStroke.points.length) allStrokes.push(markupCurrentStroke);
  drawStrokesOnCanvas(ctx, allStrokes, w, h);
}

function markupPointerToNormalized(e, canvas) {
  var rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  };
}

function redrawMarkupCanvas() {
  layoutMarkupCanvas();
}

function openMarkupOverlay(photoId) {
  markupPhotoId = photoId;
  markupStrokesWorking = getPhotoMarkupStrokes(photoId);
  markupCurrentStroke = null;
  markupDrawing = false;

  var overlay = document.getElementById('markup-overlay');
  var img = document.getElementById('markup-img');
  var widthInput = document.getElementById('markup-width');
  if (!overlay || !img) return;

  if (widthInput) {
    markupPenWidth = Number(widthInput.value) || 4;
  }

  getPhotoFromDB(photoId, function(record) {
    var p = S.photos.find(function(x) { return x.id === photoId; });
    var src = (record && record.dataUrl) ? record.dataUrl : (p && p.dataUrl ? p.dataUrl : '');
    if (!src) { toast('Photo not available'); return; }
    img.onload = function() {
      layoutMarkupCanvas();
    };
    img.src = src;
    overlay.style.display = 'flex';
    setTimeout(layoutMarkupCanvas, 50);
  });
}

function closeMarkupOverlay() {
  var overlay = document.getElementById('markup-overlay');
  if (overlay) overlay.style.display = 'none';
  markupPhotoId = null;
  markupCurrentStroke = null;
  markupDrawing = false;
}

function initPhotoMarkup() {
  var canvas = document.getElementById('markup-canvas');
  var widthInput = document.getElementById('markup-width');
  var markupBtn = document.getElementById('modal-markup-btn');
  if (!canvas) return;

  if (markupBtn) {
    markupBtn.addEventListener('click', function() {
      if (modalPhotoId !== null) openMarkupOverlay(modalPhotoId);
    });
  }

  document.querySelectorAll('.markup-color-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.markup-color-chip').forEach(function(c) { c.classList.remove('active'); });
      chip.classList.add('active');
      markupPenColor = chip.dataset.color;
    });
  });

  if (widthInput) {
    widthInput.addEventListener('input', function() {
      markupPenWidth = Number(widthInput.value) || 4;
    });
  }

  document.getElementById('markup-undo').addEventListener('click', function() {
    if (markupCurrentStroke) { markupCurrentStroke = null; markupDrawing = false; }
    else if (markupStrokesWorking.length) markupStrokesWorking.pop();
    redrawMarkupCanvas();
  });

  document.getElementById('markup-clear').addEventListener('click', function() {
    if (!markupStrokesWorking.length && !markupCurrentStroke) return;
    if (confirm('Clear all markup on this photo?')) {
      markupStrokesWorking = [];
      markupCurrentStroke = null;
      markupDrawing = false;
      redrawMarkupCanvas();
    }
  });

  document.getElementById('markup-cancel').addEventListener('click', closeMarkupOverlay);

  document.getElementById('markup-save').addEventListener('click', function() {
    if (markupPhotoId === null) return;
    saveMarkupStrokes(markupPhotoId, markupStrokesWorking);
    closeMarkupOverlay();
    renderModalMarkupOverlay();
    renderPhotoList();
    toast('Markup saved');
  });

  window.addEventListener('resize', function() {
    if (markupPhotoId !== null) layoutMarkupCanvas();
  });
  window.addEventListener('orientationchange', function() {
    if (markupPhotoId !== null) setTimeout(layoutMarkupCanvas, 100);
  });

  function onPointerDown(e) {
    if (markupPhotoId === null) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    markupDrawing = true;
    var pt = markupPointerToNormalized(e, canvas);
    if (!pt) return;
    markupCurrentStroke = { color: markupPenColor, width: markupPenWidth, points: [pt] };
    redrawMarkupCanvas();
  }

  function onPointerMove(e) {
    if (!markupDrawing || !markupCurrentStroke) return;
    e.preventDefault();
    var pt = markupPointerToNormalized(e, canvas);
    if (!pt) return;
    markupCurrentStroke.points.push(pt);
    redrawMarkupCanvas();
  }

  function onPointerUp(e) {
    if (!markupDrawing || !markupCurrentStroke) return;
    e.preventDefault();
    if (markupCurrentStroke.points.length > 1) {
      markupStrokesWorking.push(markupCurrentStroke);
    }
    markupCurrentStroke = null;
    markupDrawing = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
    redrawMarkupCanvas();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
}

function exportAuditPhotosZip(audit) {
  if (typeof JSZip === 'undefined') { toast('Zip library not loaded'); return; }
  var photos = audit.photos || [];
  if (!photos.length) { toast('No photos in this audit'); return; }

  toast('Preparing photos...');
  preparePhotosForExport(photos, function(prepared) {
    var withImages = prepared.filter(function(p) { return p.dataUrl; });
    if (!withImages.length) { toast('No photo files found'); return; }

    var zip = new JSZip();
    var safeName = (audit.customer.name || 'audit').replace(/[^a-zA-Z0-9]/g, '-');
    var dateStr = audit.customer.date || new Date().toISOString().split('T')[0];

    withImages.forEach(function(photo, index) {
      var parts = photo.dataUrl.split(',');
      var binary = atob(parts[1]);
      var array = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
      zip.file((index + 1) + '_' + dateStr + '_' + safeName + '.jpg', array, { binary: true });
    });

    zip.generateAsync({ type: 'blob' }).then(function(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = safeName + '_Photos_' + dateStr + '.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Photos zip exported — ' + withImages.length + ' images');
    }).catch(function(e) {
      toast('Zip error: ' + e.message);
    });
  });
}

var categoryChipsInitialized = false;
var modalPresetMeta = [];
var noteAppendHistory = [];
var lastPresetWasDigit = false;

function resetPresetDigitMode() {
  lastPresetWasDigit = false;
}

function presetChipHtml(idx, item, opts) {
  opts = opts || {};
  var meta = normalizePresetItem(item);
  var cls = 'preset-chip';
  if (opts.inline) cls += ' preset-chip-inline';
  if (meta.digit) cls += ' preset-chip-digit';
  return '<button type="button" class="' + cls + '" data-preset-idx="' + idx + '">' + escapeHtml(meta.text) + '</button>';
}

function initCategoryChipsOnce() {
  if (categoryChipsInitialized) return;
  var wrap = document.getElementById('modal-category-chips');
  if (!wrap) return;
  wrap.innerHTML = PHOTO_CATEGORIES.map(function(c) {
    return '<button type="button" class="chip" data-cat="' + c.id + '">' + escapeHtml(c.label) + '</button>';
  }).join('');
  wrap.addEventListener('click', function(e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    var catId = btn.dataset.cat;
    var current = S.photos.find(function(p) { return p.id === modalPhotoId; });
    var newCat = (current && current.category === catId) ? '' : catId;
    setModalCategory(newCat);
  });
  categoryChipsInitialized = true;
}

function updateCategoryChipSelection(selectedId) {
  var wrap = document.getElementById('modal-category-chips');
  if (!wrap) return;
  wrap.querySelectorAll('.chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.cat === selectedId);
  });
}

// Renders the category chip row and highlights the one currently set on this photo
function renderCategoryChips(selectedId) {
  initCategoryChipsOnce();
  updateCategoryChipSelection(selectedId);
}

function buildPresetNotesHtml(blocks) {
  var flatIdx = 0;
  var html = '';
  var i = 0;
  while (i < blocks.length) {
    var block = blocks[i];
    if (block.type === 'numpad') {
      html += '<div class="preset-numpad">';
      (block.rows || []).forEach(function(row) {
        var rowCls = 'preset-row-inline' + (row.length === 1 ? ' preset-numpad-row-single' : '');
        html += '<div class="' + rowCls + '">';
        row.forEach(function(d) {
          html += presetChipHtml(flatIdx++, { text: d, digit: true }, { inline: true });
        });
        html += '</div>';
      });
      html += '</div>';
      i++;
    } else if (block.type === 'code-row') {
      html += '<div class="preset-code-row">';
      block.items.forEach(function(item) {
        html += presetChipHtml(flatIdx++, item, { inline: true });
      });
      html += '</div>';
      i++;
    } else if (block.type === 'row') {
      html += '<div class="preset-inline-cluster">';
      while (i < blocks.length && blocks[i].type === 'row') {
        html += '<div class="preset-row-inline">';
        blocks[i].items.forEach(function(item) {
          html += presetChipHtml(flatIdx++, item, { inline: true });
        });
        html += '</div>';
        i++;
      }
      html += '</div>';
    } else {
      html += '<div class="preset-group">';
      block.items.forEach(function(item) {
        html += presetChipHtml(flatIdx++, item, {});
      });
      html += '</div>';
      i++;
    }
  }
  return html;
}

function updatePresetUndoButton() {
  var btn = document.getElementById('modal-preset-undo');
  if (btn) btn.disabled = noteAppendHistory.length === 0;
}

function clearNoteAppendHistory() {
  noteAppendHistory = [];
  resetPresetDigitMode();
  updatePresetUndoButton();
}

// Renders the preset quick-note buttons for whichever category is selected
function renderPresetNotes(categoryId) {
  var wrap = document.getElementById('modal-preset-notes');
  var header = document.getElementById('modal-preset-header');
  if (!wrap) return;
  var blocks = categoryId === 'water'
    ? [{ type: 'group', items: WATER_PRESET_PHRASES }]
    : normalizePresetBlocks(PRESET_NOTES[categoryId] || []);
  modalPresetMeta = collectPresetMeta(blocks);
  if (!blocks.length) {
    wrap.innerHTML = '';
    if (header) header.style.display = 'none';
    clearNoteAppendHistory();
    return;
  }
  if (header) header.style.display = 'flex';
  wrap.innerHTML = buildPresetNotesHtml(blocks);
  clearNoteAppendHistory();
}

function setModalCategory(catId) {
  if (modalPhotoId === null) return;
  var p = S.photos.find(function(x) { return x.id === modalPhotoId; });
  if (!p) return;
  p.category = catId;
  save();
  getPhotoFromDB(modalPhotoId, function(record) {
    if (record) { record.category = catId; savePhotoToDB(record, null); }
  });
  updateCategoryChipSelection(catId);
  renderPresetNotes(catId);
}

function insertPresetNote(text, isDigit) {
  var noteEl = document.getElementById('modal-note');
  if (!noteEl) return;
  noteAppendHistory.push(noteEl.value);
  var prev = noteEl.value.replace(/\s+$/, '');
  var join = '';
  if (prev) join = (isDigit && lastPresetWasDigit) ? '' : ' ';
  noteEl.value = prev ? (prev + join + text) : text;
  lastPresetWasDigit = !!isDigit;
  updatePresetUndoButton();
  scheduleNoteAutosave();
  noteEl.blur();
}

function undoLastPresetNote() {
  var noteEl = document.getElementById('modal-note');
  if (!noteEl || !noteAppendHistory.length) return;
  noteEl.value = noteAppendHistory.pop();
  resetPresetDigitMode();
  updatePresetUndoButton();
  scheduleNoteAutosave();
  noteEl.blur();
}

// Debounced autosave while typing/inserting — so a note is never lost just because
// the phone got interrupted before "Save Note" was tapped.
function scheduleNoteAutosave() {
  clearTimeout(noteAutosaveTimer);
  noteAutosaveTimer = setTimeout(flushNoteAutosaveNow, 700);
}

function flushNoteAutosaveNow() {
  clearTimeout(noteAutosaveTimer);
  if (modalPhotoId === null) return;
  var noteEl = document.getElementById('modal-note');
  if (!noteEl) return;
  var p = S.photos.find(function(x) { return x.id === modalPhotoId; });
  if (!p) return;
  p.note = noteEl.value;
  save();
  getPhotoFromDB(modalPhotoId, function(record) {
    if (record) { record.note = p.note; savePhotoToDB(record, null); }
  });
}

function clearModalNote() {
  var noteEl = document.getElementById('modal-note');
  if (!noteEl) return;
  noteEl.value = '';
  noteEl.blur();
  clearNoteAppendHistory();
  if (modalPhotoId === null) return;
  var p = S.photos.find(function(x) { return x.id === modalPhotoId; });
  if (p) {
    p.note = '';
    save();
    getPhotoFromDB(modalPhotoId, function(record) {
      if (record) { record.note = ''; savePhotoToDB(record, null); }
    });
  }
}

function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-clear').addEventListener('click', clearModalNote);

  var photoModal = document.getElementById('photo-modal');
  photoModal.addEventListener('touchmove', function(e) {
    if (e.target.closest('.modal-scroll')) return;
    e.preventDefault();
  }, { passive: false });

  document.getElementById('modal-save').addEventListener('click', function() {
    if (modalPhotoId !== null) {
      var p = S.photos.find(function(x) { return x.id === modalPhotoId; });
      if (p) {
        p.note = document.getElementById('modal-note').value;
        // Sync note to IndexedDB record too
        getPhotoFromDB(modalPhotoId, function(record) {
          if (record) {
            record.note = p.note;
            savePhotoToDB(record, null);
          }
        });
        save();
        renderPhotoList();
      }
    }
    closeModal();
  });

  document.getElementById('modal-delete').addEventListener('click', function() {
    if (modalPhotoId !== null && confirm('Delete this photo?')) {
      var id = modalPhotoId;
      clearTimeout(noteAutosaveTimer);
      deletePhotoFromDB(id, function() {
        S.photos = S.photos.filter(function(p) { return p.id !== id; });
        save(); renderPhotoList(); closeModal();
      });
    }
  });

  document.getElementById('modal-note').addEventListener('input', function() {
    resetPresetDigitMode();
    scheduleNoteAutosave();
  });

  document.getElementById('modal-preset-notes').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-preset-idx]');
    if (!btn) return;
    var idx = Number(btn.dataset.presetIdx);
    var m = modalPresetMeta[idx];
    if (m) insertPresetNote(m.text, m.digit);
  });

  document.getElementById('modal-preset-undo').addEventListener('click', undoLastPresetNote);
}

var modalSavedScrollY = 0;

function lockPageScroll() {
  modalSavedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('modal-open');
  document.body.style.top = '-' + modalSavedScrollY + 'px';
}

function unlockPageScroll() {
  document.body.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo(0, modalSavedScrollY);
}

function openModal(id) {
  var p = S.photos.find(function(x) { return x.id === id; });
  if (!p) return;
  modalPhotoId = id;
  clearNoteAppendHistory();
  document.getElementById('modal-note').value = p.note || '';
  renderCategoryChips(p.category || '');
  renderPresetNotes(p.category || '');
  lockPageScroll();
  document.getElementById('photo-modal').style.display = 'flex';

  var imgEl = document.getElementById('modal-img');
  imgEl.src = '';
  getPhotoFromDB(id, function(record) {
    if (record && record.dataUrl) {
      imgEl.src = record.dataUrl;
      imgEl.style.display = 'block';
      if (record.markupStrokes && !p.markupStrokes) p.markupStrokes = record.markupStrokes;
    } else if (p.dataUrl) {
      imgEl.src = p.dataUrl;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }
    imgEl.onload = function() { renderModalMarkupOverlay(); };
    setTimeout(renderModalMarkupOverlay, 50);
  });
}

function closeModal() {
  flushNoteAutosaveNow();
  autosaveAudit();
  document.getElementById('photo-modal').style.display = 'none';
  unlockPageScroll();
  clearNoteAppendHistory();
  modalPhotoId = null;
}

// ── AUDITS TAB ────────────────────────────────────────────────
function initAuditsTab() {
  document.getElementById('save-btn').addEventListener('click', saveAudit);
  var newBtn = document.getElementById('new-btn');
  if (newBtn) newBtn.addEventListener('click', function() {
    if (!S.name && !S.dump && !S.photos.length) { toast('Nothing to save — add info first'); return; }
    if (confirm('Save current audit and start a fresh one?')) { saveAudit(); clearCurrent(); }
  });
  initBackupRestore();
}

// Core upsert into the Saved Audits list — shared by the manual Save button
// and the silent autosave checkpoints below. Always upserts by S.auditId, so
// repeated calls update the same record rather than creating duplicates.
function persistAuditRecord() {
  var id = S.auditId || ('audit-' + Date.now());
  S.auditId = id;

  // Ensure all photos have this auditId in IndexedDB
  S.photos.forEach(function(p) {
    if (p.auditId !== id) {
      p.auditId = id;
      getPhotoFromDB(p.id, function(record) {
        if (record) {
          record.auditId = id;
          savePhotoToDB(record, null);
        }
      });
    }
  });

  var saved = getSaved();
  saveTCSignature();
  var idx = saved.findIndex(function(a) { return a.id === id; });
  var existing = idx >= 0 ? saved[idx] : null;
  var rec = {
    id: id,
    customer: {
      name: S.name,
      address: S.address,
      date: S.date,
      yearBuilt: S.year,
      sqFt: S.sqft,
      coop: S.coop,
      customerNumber: S.customerNumber
    },
    scheduleJobId: S.scheduleJobId || null,
    researchNotes: S.researchNotes || '',
    tcSignature: S.tcSignature || null,
    voiceDump: S.dump,
    photos: S.photos.slice(),
    savedAt: new Date().toISOString(),
    source: (existing && existing.source) ? existing.source : 'AuditFieldTool'
  };
  // Preserve fields autosave must not wipe (interpret output, legacy flags, etc.)
  if (existing) {
    if (existing.interpretedOutput) rec.interpretedOutput = existing.interpretedOutput;
    if (existing.legacyImport) {
      rec.legacyImport = true;
      rec.legacyPhotoPdf = existing.legacyPhotoPdf;
      rec.legacyTcPdf = existing.legacyTcPdf;
    }
    if (existing.photosNotImported) rec.photosNotImported = true;
    if (!rec.scheduleJobId && existing.scheduleJobId) rec.scheduleJobId = existing.scheduleJobId;
    if (!rec.researchNotes && existing.researchNotes) rec.researchNotes = existing.researchNotes;
  }
  if (idx >= 0) saved[idx] = rec; else saved.unshift(rec);
  setSaved(saved);
  save();
  if (rec.scheduleJobId && typeof linkScheduleJobToAudit === 'function') {
    linkScheduleJobToAudit(rec.scheduleJobId, id);
  }
  renderAuditsList();
}

function saveAudit() {
  if (!S.name && !S.dump && !S.photos.length) { toast('Nothing to save'); return; }
  persistAuditRecord();
  toast('Saved: ' + (S.name || 'Unnamed audit'));
}

// ── LEGACY AUDIT IMPORT ──────────────────────────────────────────
// For audits exported with the old 3-file system (JSON + photo PDF + T&C
// PDF) before the Weekly Bundle update. There's no way to regenerate those
// PDFs from this app's storage — the photos and signature were never
// captured into IndexedDB the way newer audits are. So instead of trying
// to reconstruct them, the original PDFs are stored as-is and passed
// straight through on every future export (see exportSavedPhotoPDF and
// generateTCPDFFromRecord — both check audit.legacyImport first).
var legacyJsonFile = null;

function initLegacyImport() {
  var jsonInput = document.getElementById('legacy-json-input');
  var selectedEl = document.getElementById('legacy-import-selected');
  var importBtn = document.getElementById('legacy-import-btn');
  if (!jsonInput || !importBtn) return;

  function updateSelectedSummary() {
    if (!selectedEl) return;
    selectedEl.textContent = legacyJsonFile ? '✓ JSON: ' + legacyJsonFile.name : 'No JSON selected';
  }

  jsonInput.addEventListener('change', function() { legacyJsonFile = jsonInput.files[0] || null; updateSelectedSummary(); });

  function readFileAsText(file) {
    return new Promise(function(resolve, reject) {
      var r = new FileReader();
      r.onload = function(e) { resolve(e.target.result); };
      r.onerror = function() { reject(new Error('Could not read ' + file.name)); };
      r.readAsText(file);
    });
  }

  importBtn.addEventListener('click', function() {
    if (!legacyJsonFile) { toast('Select the JSON file first'); return; }

    var jsonFileAtClick = legacyJsonFile;
    toast('Importing...');

    readFileAsText(jsonFileAtClick).then(function(jsonText) {
      var data;
      try { data = JSON.parse(jsonText); }
      catch(e) { throw new Error('Could not parse JSON: ' + e.message); }

      var audit = (data.audits && data.audits.length) ? data.audits[0] : data;
      if (!audit || !audit.customer) { throw new Error('Unrecognized JSON format — expected a customer object'); }

      var id = 'legacy-' + Date.now();
      var rec = {
        id: id,
        customer: audit.customer,
        voiceDump: audit.voiceDump || '',
        photos: [],
        tcSignature: null,
        savedAt: new Date().toISOString(),
        source: 'AuditFieldTool-LegacyImport',
        legacyImport: true,
        legacyPhotoPdf: false,
        legacyTcPdf: false
      };

      var saved = getSaved();
      saved.unshift(rec);
      setSaved(saved);

      var verify = getSaved();
      if (!verify.some(function(a) { return a.id === id; })) {
        throw new Error('Could not save audit record (storage error)');
      }
      toast('Imported: ' + (rec.customer.name || 'legacy audit'));
      legacyJsonFile = null;
      jsonInput.value = '';
      updateSelectedSummary();
      renderAuditsList();

    }).catch(function(err) {
      toast(err.message || 'Import failed');
      console.error('[LegacyImport] failed:', err);
    });
  });
}

// ── V2/V3 BULK IMPORT ────────────────────────────────────────────
// Reads a JSON file that is an aft_saved array exported from V2 or V3.
// Merges records into the current saved list (deduplicates by id).
// Photos are not included — they flag photosNotImported:true.
function importV2V3Audits(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var arr;
    try { arr = JSON.parse(e.target.result); }
    catch(ex) { toast('Could not parse JSON: ' + ex.message); return; }
    if (!Array.isArray(arr)) {
      // Might be wrapped: { saved: [...] } or { audits: [...] }
      arr = arr.saved || arr.audits || arr.aft_saved || null;
    }
    if (!Array.isArray(arr) || !arr.length) { toast('No audit records found in file'); return; }
    var existing = getSaved();
    var existingIds = {};
    existing.forEach(function(r) { existingIds[r.id] = true; });
    var added = 0;
    arr.forEach(function(rec) {
      if (!rec || !rec.id) return;
      if (existingIds[rec.id]) return; // skip duplicates
      // Normalize customer object
      rec.customer = rec.customer || {};
      rec.voiceDump = rec.voiceDump || rec.dump || '';
      rec.photos = rec.photos || [];
      rec.savedAt = rec.savedAt || new Date().toISOString();
      rec.source = rec.source || 'V2V3Import';
      if (rec.photos.length) rec.photosNotImported = true; // photos can't transfer via JSON
      existing.push(rec);
      added++;
    });
    setSaved(existing);
    renderAuditsList();
    toast('Imported ' + added + ' audit' + (added !== 1 ? 's' : '') + ' from ' + file.name);
  };
  reader.onerror = function() { toast('Could not read file'); };
  reader.readAsText(file);
}

function initV2V3Import() {
  var btn = document.getElementById('v2v3-import-btn');
  var input = document.getElementById('v2v3-import-input');
  if (!btn || !input) return;
  input.addEventListener('change', function() {
    if (input.files[0]) importV2V3Audits(input.files[0]);
    input.value = '';
  });
  btn.addEventListener('click', function() { input.click(); });
}

// Silent checkpoint autosave. Fires only at natural pause points (tab switch,
// photo added/deleted, recording stopped, note screen closed, signature saved,
// app backgrounded) — never on a timer, never mid-action. Pushes the same
// record the manual Save button writes, so nothing is ever lost to a crash,
// a dropped signal, or forgetting to tap Save.
function autosaveAudit() {
  if (!S.name && !S.dump && !S.photos.length) return;
  persistAuditRecord();
  showAutosaveIndicator();
}

function clearCurrent() {
  stopVoiceRec();
  S.name = ''; S.address = ''; S.date = ''; S.year = ''; S.sqft = ''; S.coop = '';
  S.customerNumber = null;
  S.scheduleJobId = null;
  S.researchNotes = '';
  S.dump = ''; S.photos = []; S.auditId = null; S.tcSignature = null;
  clearTCSignature();
  if (typeof clearInterpretSession === 'function') clearInterpretSession();
  save();
  fillFields();
  renderHeader();
  renderVoiceDump();
  renderPhotoList();
  if (typeof renderResearchNotesSummary === 'function') renderResearchNotesSummary();
  renderExportSummary();
  toast('New audit started');
}

function loadAudit(id) {
  var saved = getSaved();
  var rec = saved.find(function(a) { return a.id === id; });
  if (!rec) return;
  S.name = rec.customer.name || '';
  S.address = rec.customer.address || '';
  S.date = rec.customer.date || '';
  S.year = rec.customer.yearBuilt || '';
  S.sqft = rec.customer.sqFt || '';
  S.coop = rec.customer.coop || '';
  S.customerNumber = rec.customer.customerNumber != null ? rec.customer.customerNumber : null;
  S.scheduleJobId = rec.scheduleJobId || null;
  S.researchNotes = rec.researchNotes || '';
  S.dump = rec.voiceDump || '';
  S.photos = rec.photos || [];
  S.auditId = rec.id;
  S.tcSignature = rec.tcSignature || null;
  // Restore interpreted output to Interpret tab if present
  if (typeof interpretLastParsed !== 'undefined') {
    if (rec.interpretedOutput && rec.interpretedOutput.fields) {
      interpretLastParsed = rec.interpretedOutput;
      interpretLastMeta = (rec.interpretedOutput.interpretMeta) || null;
    } else {
      interpretLastParsed = null;
      interpretLastMeta = null;
    }
  }
  save();
  fillFields();
  renderHeader();
  renderVoiceDump();
  renderPhotoList();
  renderTCInfo();
  if (typeof renderResearchNotesSummary === 'function') renderResearchNotesSummary();
  switchMainTab('audit', 'voice');
  toast('Loaded: ' + (S.name || 'audit'));
  if (typeof refreshInterpretFromLoadedAudit === 'function') refreshInterpretFromLoadedAudit();
}

function deleteAudit(id) {
  var wasCurrent = S.auditId === id;
  setSaved(getSaved().filter(function(a) { return a.id !== id; }));
  if (wasCurrent) {
    stopVoiceRec();
    S.name = '';
    S.address = '';
    S.date = '';
    S.year = '';
    S.sqft = '';
    S.coop = '';
    S.customerNumber = null;
    S.scheduleJobId = null;
    S.researchNotes = '';
    S.dump = '';
    S.photos = [];
    S.auditId = null;
    S.tcSignature = null;
    clearTCSignature();
    if (typeof clearInterpretSession === 'function') clearInterpretSession();
    save();
    fillFields();
    renderHeader();
    renderVoiceDump();
    renderPhotoList();
  }
  deletePhotosByAuditId(id, function() {
    deleteLegacyFiles(id, function() {
      renderAuditsList();
      var exportPanel = document.getElementById('tab-export');
      if (exportPanel && exportPanel.style.display === 'block') renderWeeklyBatches();
      toast('Audit deleted');
    });
  });
}

function renderAuditsList() {
  var list = document.getElementById('audits-list');
  var saved = getSaved();
  if (!saved.length) { list.innerHTML = '<div class="empty-msg">No saved audits yet</div>'; return; }

  var weeks = groupAuditsByWeek(saved);
  list.innerHTML = '';

  weeks.forEach(function(week) {
    var group = document.createElement('div');
    group.className = 'week-group';

    var daySections = week.days.map(function(day) {
      var auditRows = day.audits.map(function(a) {
        return renderAuditsListRow(a);
      }).join('');
      return '<div class="day-group">' +
        '<div class="day-group-header">' +
          '<span class="day-group-title">' + escapeHtml(day.label) + '</span>' +
          '<span class="day-group-count">' + day.audits.length + ' audit' + (day.audits.length !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        auditRows +
      '</div>';
    }).join('');

    group.innerHTML =
      '<div class="week-group-header">' +
        '<span class="week-group-title">' + week.label + '</span>' +
        '<span class="week-group-count">' + week.audits.length + ' audit' + (week.audits.length !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      daySections;

    list.appendChild(group);
  });

  list.querySelectorAll('.load-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { loadAudit(btn.dataset.id); });
  });
  list.querySelectorAll('.photos-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var audit = saved.find(function(a) { return a.id === btn.dataset.id; });
      if (audit) exportAuditPhotosZip(audit);
    });
  });
  list.querySelectorAll('.del-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (confirm('Delete this saved audit?')) deleteAudit(btn.dataset.id);
    });
  });
  list.querySelectorAll('.interp-view-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (typeof openInterpArchive === 'function') openInterpArchive(btn.dataset.id);
    });
  });
}

function renderAuditsListRow(a) {
  var name = a.customer.name || 'Unnamed';
  var date = formatExportRowDate(a.customer.date || '—');
  var metaLine = a.legacyImport
    ? (date + ' · 📥 legacy import · ' + formatInterpretStatus(a))
    : formatInterpretStatus(a);
  var interpBadge = auditHasInterpretation(a) ? '<span class="interp-badge" title="Interpreted">⚡</span>' : '';
  return '<div class="week-audit-row' + (a.id === S.auditId ? ' is-current' : '') + '">' +
    '<div class="week-audit-info">' +
      '<div class="week-audit-name">' + escapeHtml(name) + interpBadge + '</div>' +
      '<div class="week-audit-meta">' + metaLine + '</div>' +
    '</div>' +
    '<div class="week-audit-btns">' +
      '<button class="btn-xs load-btn" data-id="' + a.id + '">Load</button>' +
      '<button class="btn-xs photos-btn" data-id="' + a.id + '">📷</button>' +
      '<button class="btn-xs interp-view-btn" data-id="' + a.id + '"' + (auditHasInterpretation(a) ? '' : ' style="display:none"') + ' title="View interpretation">⚡</button>' +
      '<button class="btn-xs btn-danger-sm del-btn" data-id="' + a.id + '">🗑</button>' +
    '</div>' +
  '</div>';
}

// ── EXPORT TAB ────────────────────────────────────────────────
function initExportTab() {
  var btn = document.getElementById('export-full-backup-btn');
  if (btn) {
    btn.addEventListener('click', function() {
      var progress = document.getElementById('export-full-backup-progress');
      exportFullBackup(progress);
    });
  }
  var exportBtn = document.getElementById('export-full-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      var progress = document.getElementById('export-full-export-progress');
      exportFullExport(progress);
    });
  }
}

function renderExportSummary() {
  // No longer used — export tab uses weekly batch view
}

// Builds the "lean" export object used by every JSON export path — customer
// info, voice dump, and now photo notes (text only, never the image data).
// Photos with no note are skipped since an empty entry adds no value.
function buildPhotoNotesArray(photos) {
  return (photos || []).map(function(p) {
    return {
      category: p.category || '',
      categoryLabel: p.category ? getCategoryLabel(p.category) : '',
      note: p.note || '',
      ts: p.ts || p.timestamp || null
    };
  }).filter(function(p) { return p.note && p.note.trim(); });
}

function buildLeanAudit(audit) {
  return {
    id: audit.id,
    customer: audit.customer,
    voiceDump: audit.voiceDump,
    photoNotes: buildPhotoNotesArray(audit.photos),
    exportedAt: new Date().toISOString(),
    source: 'AuditFieldTool'
  };
}

// Plain-text, human-readable version of the same data — for archiving and
// quick reference. Opens cleanly in Notepad, no JSON syntax to parse.
function buildAuditTextSummary(audit) {
  var c = audit.customer || {};
  var line = function(n) { return new Array(n + 1).join('-'); };
  var lines = [];

  lines.push('AUDIT RECORD');
  lines.push(line(40));
  lines.push('');
  lines.push('Customer:   ' + (c.name || '—'));
  lines.push('Address:    ' + (c.address || '—'));
  lines.push('Date:       ' + (c.date || '—'));
  lines.push('Co-op:      ' + (c.coop || '—'));
  lines.push('Year Built: ' + (c.yearBuilt || c.year || '—'));
  lines.push('Sq Ft:      ' + (c.sqFt || c.sqft || '—'));
  lines.push('');
  lines.push(line(40));
  lines.push('VOICE DUMP');
  lines.push(line(40));
  lines.push((audit.voiceDump && audit.voiceDump.trim()) ? audit.voiceDump.trim() : '(none recorded)');
  lines.push('');

  var photoNotes = buildPhotoNotesArray(audit.photos);
  lines.push(line(40));
  lines.push('PHOTO NOTES (' + photoNotes.length + ')');
  lines.push(line(40));
  if (photoNotes.length) {
    var grouped = {};
    var order = [];
    photoNotes.forEach(function(p) {
      var cat = p.categoryLabel || p.category || 'Custom Measures';
      if (!grouped[cat]) { grouped[cat] = []; order.push(cat); }
      grouped[cat].push(p.note);
    });
    order.forEach(function(cat) {
      lines.push('');
      lines.push('[' + cat + ']');
      grouped[cat].forEach(function(note) { lines.push('  - ' + note); });
    });
  } else if (audit.legacyImport) {
    lines.push('(not available — this is a legacy-imported audit; see the attached photo PDF for images and notes)');
  } else {
    lines.push('(none)');
  }
  lines.push('');
  lines.push(line(40));
  lines.push('Exported: ' + new Date().toLocaleString());
  lines.push('Source: Audit Field Tool' + (audit.legacyImport ? ' (legacy import)' : ''));

  return lines.join('\n');
}

function buildInterpretTextSummary(audit) {
  var io = audit.interpretedOutput;
  if (!io) return '';
  var line = function(n) { return new Array(n + 1).join('-'); };
  var lines = [];

  lines.push('INTERPRETATION OUTPUT');
  lines.push(line(40));
  if (io.interpretMeta && io.interpretMeta.interpretedAt) {
    lines.push('Interpreted: ' + io.interpretMeta.interpretedAt);
  }
  if (io.interpretMeta && io.interpretMeta.model) {
    lines.push('Model: ' + io.interpretMeta.model);
  }
  lines.push('');

  if (io.notes && io.notes.trim()) {
    lines.push(line(40));
    lines.push('INTERPRETER NOTES');
    lines.push(line(40));
    lines.push(io.notes.trim());
    lines.push('');
  }

  if (io.clarifications && io.clarifications.length) {
    lines.push(line(40));
    lines.push('CLARIFICATIONS');
    lines.push(line(40));
    io.clarifications.forEach(function(c, i) {
      lines.push('');
      lines.push('Q' + (i + 1) + ': ' + (c.question || ''));
      if (c.fieldPage || c.fieldSection || c.fieldName) {
        lines.push('Field: ' + [c.fieldPage, c.fieldSection, c.fieldName].filter(Boolean).join(' — '));
      }
      (c.options || []).forEach(function(opt) {
        lines.push('  ' + (opt.label || '?') + ': ' + (opt.text || opt.value || ''));
      });
    });
    lines.push('');
  }

  if (io.fields && io.fields.length) {
    lines.push(line(40));
    lines.push('FIELD OUTPUT');
    lines.push(line(40));
    var byPage = {};
    io.fields.forEach(function(f) {
      if (!byPage[f.page || 'Other']) byPage[f.page || 'Other'] = [];
      byPage[f.page || 'Other'].push(f);
    });
    Object.keys(byPage).forEach(function(page) {
      lines.push('');
      lines.push('[' + page + ']');
      byPage[page].forEach(function(f) {
        lines.push('');
        lines.push((f.section || '') + ' — ' + (f.field || ''));
        lines.push('  ' + (f.value || ''));
      });
    });
  }

  return lines.join('\n');
}

function buildAuditExportFolderName(audit) {
  var dateStr = (audit.customer && audit.customer.date) ? audit.customer.date : new Date().toISOString().split('T')[0];
  var safeName = (audit.customer.name || 'audit').replace(/[^a-zA-Z0-9]/g, '-');
  return dateStr + '_' + safeName;
}

function dataUrlToJpegBytes(dataUrl) {
  if (!dataUrl || dataUrl.indexOf(',') === -1) return null;
  var binary = atob(dataUrl.split(',')[1]);
  var array = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return array;
}

function buildRecord() {
  var id = S.auditId || ('audit-' + Date.now());
  S.auditId = id; save();
  return {
    id: id,
    customer: {
      name: S.name,
      address: S.address,
      date: S.date,
      yearBuilt: S.year,
      sqFt: S.sqft,
      coop: S.coop
    },
    voiceDump: S.dump,
    photoNotes: buildPhotoNotesArray(S.photos),
    exportedAt: new Date().toISOString(),
    source: 'AuditFieldTool'
  };
}

function exportCurrent() {
  if (!S.name && !S.dump && !S.photos.length) { toast('Nothing to export — add data first'); return; }
  var rec = buildRecord();
  var name = (S.name || 'audit').replace(/[^a-zA-Z0-9]/g,'-');
  var date = S.date || new Date().toISOString().split('T')[0];
  dlJSON(rec, date + '_' + name + '.json');
  toast('Exported: ' + name);
}

function exportSavedAudit(id) {
  var saved = getSaved();
  var audit = saved.find(function(a) { return a.id === id; });
  if (!audit) { toast('Not found'); return; }

  var lean = buildLeanAudit(audit);

  var name = (audit.customer.name || 'audit').replace(/[^a-zA-Z0-9]/g, '-');
  var date = audit.customer.date || new Date().toISOString().split('T')[0];
  dlJSON(lean, date + '_' + name + '.json');
  toast('Exported: ' + name);
}

function exportAll() {
  var saved = getSaved();
  if (!saved.length) { toast('No saved audits to export'); return; }

  var leanAudits = saved.map(buildLeanAudit);

  var bundle = {
    exportedAt: new Date().toISOString(),
    source: 'AuditFieldTool',
    auditCount: leanAudits.length,
    audits: leanAudits
  };

  dlJSON(bundle, new Date().toISOString().split('T')[0] + '_all-audits.json');
  toast('Exported ' + leanAudits.length + ' audits');
}

function dlJSON(data, filename) {
  var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportHTML() {
  var name = S.name || 'Unknown';
  var date = new Date().toISOString().split('T')[0];
  var photosHtml = S.photos.map(function(p, i) {
    var t = new Date(p.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return '<div class="pe"><div class="pm">Photo '+(i+1)+' · '+t+'</div><img src="'+p.dataUrl+'"><div class="pn">'+(p.note||'<em>No note</em>')+'</div></div>';
  }).join('');
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+name+'</title><style>'+
    'body{font-family:Arial,sans-serif;color:#222;margin:24px;max-width:800px}'+
    'h1{color:#c9a84c;border-bottom:2px solid #c9a84c;padding-bottom:8px;margin-bottom:16px}'+
    'h2{color:#c9a84c;margin:20px 0 8px;font-size:.95rem;text-transform:uppercase;letter-spacing:.05em}'+
    '.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:20px;font-size:.88rem;color:#555}'+
    '.dump{background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:14px;white-space:pre-wrap;font-size:.88rem;line-height:1.6}'+
    '.pe{margin-bottom:20px;border:1px solid #ddd;border-radius:8px;overflow:hidden;page-break-inside:avoid}'+
    '.pm{background:#f5f5f5;padding:6px 12px;font-size:.78rem;color:#888}'+
    '.pe img{width:100%;max-height:400px;object-fit:cover;display:block}'+
    '.pn{padding:10px 12px;font-size:.88rem;line-height:1.5}'+
    '.ft{margin-top:24px;border-top:1px solid #ddd;padding-top:8px;font-size:.72rem;color:#aaa;text-align:center}'+
    '</style></head><body>'+
    '<h1>'+name+'</h1>'+
    '<div class="meta">'+
      '<div><b>Address:</b> '+(S.address||'—')+'</div>'+
      '<div><b>Date:</b> '+(S.date||date)+'</div>'+
      '<div><b>Co-op:</b> '+(S.coop||'—')+'</div>'+
      '<div><b>Year Built:</b> '+(S.year||'—')+'</div>'+
      '<div><b>Sq Ft:</b> '+(S.sqft||'—')+'</div>'+
      '<div><b>Photos:</b> '+S.photos.length+'</div>'+
    '</div>'+
    '<h2>Voice Dump</h2><div class="dump">'+(S.dump||'No voice dump recorded')+'</div>'+
    (S.photos.length ? '<h2>Photos ('+S.photos.length+')</h2>'+photosHtml : '')+
    '<div class="ft">Audit Field Tool — Jarvis / Project Brain — '+new Date().toLocaleString()+'</div>'+
    '</body></html>';
  var blob = new Blob([html],{type:'text/html'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = date+'_'+(S.name||'audit').replace(/[^a-zA-Z0-9]/g,'-')+'-field.html';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportPhotoPDF() {
  if (!S.photos.length) { toast('No photos to export'); return; }

  var genMsg = document.getElementById('pdf-generating-msg');
  if (genMsg) genMsg.style.display = 'block';

  setTimeout(function() {
    try {
      var jsPDF = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDF) { toast('PDF library not loaded — check internet connection'); if (genMsg) genMsg.style.display = 'none'; return; }

      var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      var pageW = 210;
      var pageH = 297;
      var margin = 14;
      var contentW = pageW - margin * 2;

      doc.setFillColor(17, 17, 17);
      doc.rect(0, 0, pageW, 28, 'F');
      doc.setTextColor(238, 238, 238);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(S.name || 'Field Audit Photos', margin, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      var metaLine = (S.address || '') + (S.date ? '  ·  ' + S.date : '') + (S.coop ? '  ·  ' + S.coop : '');
      doc.text(metaLine, margin, 20);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by Audit Field Tool  ·  ' + new Date().toLocaleDateString(), margin, 26);

      preparePhotosForExport(S.photos, function(loadedPhotos) {
        generatePhotoPDFFromData(doc, loadedPhotos, pageW, pageH, margin, contentW, S.name, S.date, genMsg);
      });

    } catch(e) {
      toast('PDF error: ' + e.message);
      console.error('PDF generation error:', e);
      if (genMsg) genMsg.style.display = 'none';
    }
  }, 100);
}

function generatePhotoPDFFromData(doc, photos, pageW, pageH, margin, contentW, customerName, auditDate, genMsg, onComplete) {
  try {
    photos.forEach(function(photo, index) {
      if (index > 0) { doc.addPage(); }
      var startY = (index === 0) ? 36 : margin;

      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      var headerText = 'PHOTO ' + (index + 1) + ' OF ' + photos.length;
      if (photo.category) headerText += '   ·   ' + getCategoryLabel(photo.category).toUpperCase();
      doc.text(headerText, margin, startY + 5);

      var t = new Date(photo.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(t, margin, startY + 10);

      var imgY = startY + 14;

      // ── NOTE BOX SIZE COMPUTED BEFORE THE IMAGE ──────────────────
      // Previously the note box was sized AFTER the image was placed, capped
      // at a flat 50mm regardless of how much text it held. Long notes had no
      // guaranteed room — text could run past the box and off the bottom of
      // the page, which is what caused wrapped lines to be lost. Now we
      // measure the wrapped note FIRST, size the box to fit it exactly (no
      // cap), and shrink the image to make room if needed.
      var noteLineHeight = 5.0; // mm per line at 10pt — matches actual jsPDF render spacing
      var notePadding = 6;
      var noteLines = photo.note ? doc.splitTextToSize(photo.note, contentW - 8) : [];
      var noteH = photo.note ? (noteLines.length * noteLineHeight + notePadding) : 12;

      if (photo.dataUrl) {
        try {
          var imgProps = doc.getImageProperties(photo.dataUrl);
          var availH = pageH - imgY - margin - noteH - 4;
          var imgW = contentW;
          var imgH = (imgProps.height * imgW) / imgProps.width;
          if (imgH > availH) { imgW = availH * (imgProps.width / imgProps.height); imgH = availH; }
          doc.addImage(photo.dataUrl, 'JPEG', margin, imgY, imgW, imgH, '', 'MEDIUM');
          imgY += imgH + 4;
        } catch(e) {
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(9);
          doc.text('[Image could not be embedded]', margin, imgY + 10);
          imgY += 20;
        }
      } else {
        doc.setFillColor(30, 30, 30);
        doc.roundedRect(margin, imgY, contentW, 50, 3, 3, 'F');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.text('Photo not available', margin + contentW/2, imgY + 28, {align:'center'});
        imgY += 58;
      }

      if (photo.note) {
        doc.setFillColor(30, 30, 30);
        doc.setDrawColor(51, 51, 51);
        doc.roundedRect(margin, imgY, contentW, noteH, 2, 2, 'FD');
        doc.setTextColor(204, 204, 204);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        // Draw each wrapped line manually at a fixed line height instead of
        // handing jsPDF an array and trusting its default line spacing —
        // guarantees every line lands inside the box, nothing runs off the
        // page edge, and nothing is lost.
        noteLines.forEach(function(line, li) {
          doc.text(line, margin + 4, imgY + 5 + (li * noteLineHeight));
        });
      } else {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('No note attached', margin, imgY + 5);
      }
    });

    var totalPages = doc.getNumberOfPages();
    for (var i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.text('Page ' + i + ' of ' + totalPages, pageW - margin, pageH - 6, {align:'right'});
    }

    if (onComplete) {
      // Bundle mode — hand the finished doc back instead of downloading.
      if (genMsg) genMsg.style.display = 'none';
      onComplete(doc);
      return;
    }

    var name = (customerName || 'audit').replace(/[^a-zA-Z0-9]/g, '-');
    var date = auditDate || new Date().toISOString().split('T')[0];
    doc.save(date + '_' + name + '-photos.pdf');
    toast('Photo PDF exported: ' + photos.length + ' photos');

  } catch(e) {
    toast('PDF error: ' + e.message);
    console.error(e);
    if (onComplete) { onComplete(null); if (genMsg) genMsg.style.display = 'none'; return; }
  }
  if (genMsg) genMsg.style.display = 'none';
}

// ============================================================
// EXPORT TAB — WEEKLY BATCH VIEW
// ============================================================

function getWeekStart(dateStr) {
  var d;
  if (dateStr) {
    var parts = dateStr.split('-');
    d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    d = new Date();
  }
  var day = d.getDay();
  var diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function getWeekLabel(mondayDate) {
  var sunday = new Date(mondayDate);
  sunday.setDate(sunday.getDate() + 6);
  var opts = { month: 'numeric', day: 'numeric', year: '2-digit' };
  return 'Week of ' + mondayDate.toLocaleDateString('en-US', opts) + ' – ' + sunday.toLocaleDateString('en-US', opts);
}

function getStoredAuditorName() {
  try {
    var n = localStorage.getItem('aft_auditor_name');
    return (n && n.trim()) ? n.trim() : '';
  } catch (e) {}
  return '';
}

function setAuditorExportName(name) {
  try {
    var trimmed = (name || '').trim();
    if (trimmed) localStorage.setItem('aft_auditor_name', trimmed);
    else localStorage.removeItem('aft_auditor_name');
  } catch (e) {}
}

function getAuditorExportName() {
  var n = getStoredAuditorName();
  if (!n) return '';
  return n.replace(/[^a-zA-Z0-9_-]/g, '') || '';
}

function buildSchedulerZipStem(monday, sunday) {
  return 'Week_Of_' + formatExportMd(monday) + '_thru_' + formatExportMd(sunday) + '_TC_and_Photos';
}

function updateAuditorNamePreview(rawName) {
  var el = document.getElementById('auditor-name-preview');
  if (!el) return;
  var safe = (rawName || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  var stem = buildSchedulerZipStem(new Date(2026, 5, 22), new Date(2026, 5, 28));
  var filename = safe ? safe + '_' + stem : stem;
  el.textContent = 'ZIP example: ' + filename + '.zip';
}

function initAuditorSettings() {
  var input = document.getElementById('auditor-name-input');
  var saveBtn = document.getElementById('auditor-name-save');
  if (!input || !saveBtn) return;

  input.value = getStoredAuditorName();
  updateAuditorNamePreview(input.value);

  input.addEventListener('input', function() {
    updateAuditorNamePreview(input.value);
  });

  function saveAuditorName() {
    setAuditorExportName(input.value);
    input.value = getStoredAuditorName();
    updateAuditorNamePreview(input.value);
    toast('Auditor name saved');
  }

  saveBtn.addEventListener('click', saveAuditorName);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') saveAuditorName();
  });
}

function formatExportMd(date) {
  return (date.getMonth() + 1) + '-' + date.getDate();
}

function buildSchedulerZipFilename(week) {
  var sunday = new Date(week.monday);
  sunday.setDate(sunday.getDate() + 6);
  var stem = buildSchedulerZipStem(week.monday, sunday);
  var auditor = getAuditorExportName();
  return auditor ? auditor + '_' + stem : stem;
}

function groupAuditsByWeek(audits) {
  var weeks = {};
  audits.forEach(function(a) {
    var dateStr = a.customer && a.customer.date ? a.customer.date : null;
    var monday = getWeekStart(dateStr);
    var key = monday.toISOString();
    if (!weeks[key]) {
      weeks[key] = { monday: monday, label: getWeekLabel(monday), audits: [] };
    }
    weeks[key].audits.push(a);
  });
  return Object.values(weeks).sort(function(a, b) { return b.monday - a.monday; }).map(function(week) {
    week.days = groupAuditsIntoDays(week.audits);
    return week;
  });
}

function getAuditDateKey(audit) {
  var dateStr = audit.customer && audit.customer.date ? audit.customer.date : null;
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
  if (audit.savedAt) return audit.savedAt.split('T')[0];
  return 'unknown';
}

function getDayLabel(dateKey) {
  if (dateKey === 'unknown') return 'Date unknown';
  var parts = dateKey.split('-');
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric', year: '2-digit' });
}

function groupAuditsIntoDays(audits) {
  var days = {};
  audits.forEach(function(a) {
    var key = getAuditDateKey(a);
    if (!days[key]) days[key] = { dateKey: key, label: getDayLabel(key), audits: [] };
    days[key].audits.push(a);
  });
  return Object.values(days).sort(function(a, b) {
    if (a.dateKey === 'unknown') return 1;
    if (b.dateKey === 'unknown') return -1;
    return b.dateKey.localeCompare(a.dateKey);
  });
}

function auditHasInterpretation(a) {
  return !!(a.interpretedOutput && a.interpretedOutput.fields && a.interpretedOutput.fields.length);
}

function formatInterpretStatus(a) {
  var ok = auditHasInterpretation(a);
  var cls = ok ? 'interp-yes' : 'interp-no';
  var label = ok ? 'Yes' : 'No';
  return '<span class="audit-interp-status ' + cls + '"><span class="interp-status-dot">●</span> Interpreted? ' + label + '</span>';
}

function auditHasSignature(a) {
  return !!(a.tcSignature || (a.legacyImport && a.legacyTcPdf));
}

function auditHasPhotos(a) {
  return (a.photos || []).length > 0 || (a.legacyImport && a.legacyPhotoPdf);
}

function auditHasWords(a) {
  return !!(a.voiceDump || '').trim();
}

function formatStatusDot(ok) {
  var cls = ok ? 'sig-ok' : 'sig-miss';
  return '<span class="sig-indicator ' + cls + '">●</span>';
}

function formatExportRowDate(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  var parts = dateStr.split('-');
  if (parts.length === 3) {
    return parseInt(parts[1], 10) + '/' + parseInt(parts[2], 10);
  }
  var d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return (d.getMonth() + 1) + '/' + d.getDate();
  }
  return dateStr;
}

function formatExportRowMeta(a) {
  var date = formatExportRowDate(a.customer && a.customer.date ? a.customer.date : '—');
  return '<span class="export-row-meta">' +
    '<span class="export-meta-date">' + escapeHtml(date) + '</span>' +
    '<span class="export-meta-pill" title="Signature">✍️' + formatStatusDot(auditHasSignature(a)) + '</span>' +
    '<span class="export-meta-pill" title="Audit data"><span class="export-meta-aa">Aa</span>' + formatStatusDot(auditHasWords(a)) + '</span>' +
    '<span class="export-meta-pill" title="Photos">📷' + formatStatusDot(auditHasPhotos(a)) + '</span>' +
    '<span class="export-meta-pill" title="Interpretation">⚡' + formatStatusDot(auditHasInterpretation(a)) + '</span>' +
    '</span>';
}

function addSchedulerAuditPdfs(audit, baseFilename, photoFolder, tcFolder, entry, callback) {
  function afterPhoto() {
    if (auditHasSignature(audit)) {
      generateTCPDFFromRecord(audit, function(blob) {
        if (blob) { tcFolder.file(baseFilename + '-TC.pdf', blob); entry.tcPdf = true; }
        callback();
      }, true);
    } else {
      callback();
    }
  }
  if (auditHasPhotos(audit)) {
    exportSavedPhotoPDF(audit, function(blob) {
      if (blob) { photoFolder.file(baseFilename + '-photos.pdf', blob); entry.photoPdf = true; }
      afterPhoto();
    }, true);
  } else {
    afterPhoto();
  }
}

function renderWeeklyBatches() {
  var container = document.getElementById('weekly-batches-container');
  if (!container) return;

  var saved = getSaved();
  var fullBackupSection = document.getElementById('export-full-backup-section');

  if (!saved.length) {
    if (fullBackupSection) fullBackupSection.style.display = 'none';
    container.innerHTML = '<div class="export-empty-msg">No saved audits yet.<br>Complete an audit on the Audit Data tab, then save it on the Audits tab.</div>';
    return;
  }

  if (fullBackupSection) fullBackupSection.style.display = 'block';

  var weeks = groupAuditsByWeek(saved);
  container.innerHTML = '';

  weeks.forEach(function(week) {
    var group = document.createElement('div');
    group.className = 'week-group';

    var daySections = week.days.map(function(day) {
      var auditRows = day.audits.map(function(a) {
        var name = a.customer.name || 'Unnamed';
        var metaLine = formatExportRowMeta(a);
        return '<div class="week-audit-row week-export-row">' +
          '<div class="week-export-main">' +
            '<div class="week-audit-name">' + escapeHtml(name) + '</div>' +
            '<div class="week-export-line2">' +
              '<div class="week-audit-meta">' + metaLine + '</div>' +
              '<div class="week-audit-btns">' +
                '<button class="btn-xs row-json-btn" data-id="' + a.id + '">📦 JSON</button>' +
                '<button class="btn-xs-gold row-pdf-btn" data-id="' + a.id + '">📷 PDF</button>' +
                '<button class="btn-xs row-tc-btn" data-id="' + a.id + '">📋 T&C</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      return '<div class="day-group">' +
        '<div class="day-group-header">' +
          '<span class="day-group-title">' + escapeHtml(day.label) + '</span>' +
          '<span class="day-group-count">' + day.audits.length + ' audit' + (day.audits.length !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        auditRows +
      '</div>';
    }).join('');

    group.innerHTML =
      '<div class="week-group-header">' +
        '<span class="week-group-title">' + week.label + '</span>' +
        '<span class="week-group-count">' + week.audits.length + ' audit' + (week.audits.length !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<div class="week-batch-btns">' +
        '<button class="btn-gold btn-full week-backup-btn">Weekly Backup</button>' +
        '<button class="btn-gold btn-full week-scheduler-btn">Weekly T&amp;C + Photos</button>' +
      '</div>' +
      '<div class="pdf-progress week-pdf-progress">Building bundle...</div>' +
      daySections;

    container.appendChild(group);

    group.querySelector('.week-backup-btn').addEventListener('click', function() {
      var progress = group.querySelector('.week-pdf-progress');
      exportWeeklyBackup(week, progress);
    });

    group.querySelector('.week-scheduler-btn').addEventListener('click', function() {
      var progress = group.querySelector('.week-pdf-progress');
      exportWeekSchedulerBundle(week, progress);
    });

    group.querySelectorAll('.row-json-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { exportSavedAudit(btn.dataset.id); });
    });

    group.querySelectorAll('.row-pdf-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var audit = saved.find(function(a) { return a.id === btn.dataset.id; });
        if (audit) exportSavedPhotoPDF(audit);
        else toast('Audit not found');
      });
    });

    group.querySelectorAll('.row-tc-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var audit = saved.find(function(a) { return a.id === btn.dataset.id; });
        if (audit) generateTCPDFFromRecord(audit, null);
        else toast('Audit not found');
      });
    });
  });
}

function exportSavedPhotoPDF(audit, callback, blobMode) {
  // Legacy-imported audit — pass the original photo PDF straight through
  // instead of trying to regenerate one. There's no S.photos data to build
  // from for these; the file IS the record.
  if (audit.legacyImport) {
    getLegacyFiles(audit.id, function(legacy) {
      if (!legacy || !legacy.photoPdfDataUrl) {
        if (blobMode) { if (callback) callback(null); return; }
        toast('No legacy photo PDF stored for ' + (audit.customer.name || 'this audit'));
        if (callback) callback();
        return;
      }
      var blob = dataURLtoBlob(legacy.photoPdfDataUrl);
      if (blobMode) { if (callback) callback(blob); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var safeName = (audit.customer.name || 'audit').replace(/[^a-zA-Z0-9]/g, '-');
      a.download = (audit.customer.date || 'legacy') + '_' + safeName + '-photos.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Photo PDF exported (legacy)');
      if (callback) callback();
    });
    return;
  }

  var photos = audit.photos || [];
  if (!photos.length) {
    if (blobMode) { if (callback) callback(null); return; }
    toast('No photos for ' + (audit.customer.name || 'this audit'));
    if (callback) callback();
    return;
  }

  try {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) {
      if (blobMode) { if (callback) callback(null); return; }
      toast('PDF library not loaded'); if (callback) callback(); return;
    }

    var c = audit.customer || {};
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pageW = 210;
    var pageH = 297;
    var margin = 14;
    var contentW = pageW - margin * 2;

    doc.setFillColor(17, 17, 17);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(238, 238, 238);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(c.name || 'Field Audit Photos', margin, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    var metaLine = (c.address || '') + (c.date ? '  ·  ' + c.date : '') + (c.coop ? '  ·  ' + c.coop : '');
    doc.text(metaLine, margin, 20);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Audit Field Tool  ·  ' + new Date().toLocaleDateString(), margin, 26);

    preparePhotosForExport(photos, function(loadedPhotos) {
      if (blobMode) {
        generatePhotoPDFFromData(doc, loadedPhotos, pageW, pageH, margin, contentW, c.name, c.date, null, function(finishedDoc) {
          var blob = finishedDoc ? finishedDoc.output('blob') : null;
          if (callback) callback(blob);
        });
      } else {
        generatePhotoPDFFromData(doc, loadedPhotos, pageW, pageH, margin, contentW, c.name, c.date, null);
        if (callback) setTimeout(callback, 200);
      }
    });

  } catch(e) {
    if (blobMode) { if (callback) callback(null); return; }
    toast('PDF error: ' + e.message);
    if (callback) callback();
  }
}

// ============================================================
// FULL-FIDELITY BACKUP — export and restore
// ============================================================

var BACKUP_BUNDLE_FULL = 'full-backup';
var BACKUP_BUNDLE_WEEKLY = 'weekly-backup';
var EXPORT_BUNDLE_FULL = 'full-export';

function buildFullAuditBackupRecord(audit) {
  return JSON.parse(JSON.stringify(audit));
}

function collectBackupPhotosForAudit(audit, callback) {
  var photos = audit.photos || [];
  var results = [];
  var i = 0;

  function nextPhoto() {
    if (i >= photos.length) {
      getLegacyFiles(audit.id, function(legacy) {
        callback(results, legacy || null);
      });
      return;
    }
    var meta = photos[i];
    getPhotoFromDB(meta.id, function(record) {
      var dataUrl = (record && record.dataUrl) || meta.dataUrl || null;
      if (dataUrl) {
        results.push({
          id: meta.id,
          auditId: audit.id,
          dataUrl: dataUrl,
          note: meta.note || (record ? record.note : '') || '',
          category: meta.category || (record ? record.category : '') || '',
          ts: meta.ts || meta.timestamp || (record ? record.ts : null),
          markupStrokes: meta.markupStrokes || (record && record.markupStrokes) || []
        });
      }
      i++;
      nextPhoto();
    });
  }
  nextPhoto();
}

function exportBackupBundle(audits, opts) {
  if (typeof JSZip === 'undefined') { toast('Zip library not loaded — check internet connection'); return; }
  if (!audits.length) { toast('No audits to back up'); return; }

  var zip = new JSZip();
  var auditsFolder = zip.folder('audits');
  var photosFolder = zip.folder('photos');
  var legacyFolder = zip.folder('legacy');
  var manifest = {
    bundleType: opts.bundleType,
    exportedAt: new Date().toISOString(),
    source: 'AuditFieldTool',
    version: 1,
    auditCount: audits.length,
    photoCount: 0,
    audits: []
  };
  if (opts.week) manifest.week = opts.week;
  if (opts.weekStart) manifest.weekStart = opts.weekStart;

  var auditIndex = 0;
  var photoCount = 0;
  var progressEl = opts.progressEl;

  if (progressEl) {
    progressEl.style.display = 'block';
    progressEl.textContent = 'Building backup — 0 / ' + audits.length;
  }

  function processNextAudit() {
    if (auditIndex >= audits.length) {
      manifest.photoCount = photoCount;
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      if (progressEl) progressEl.textContent = 'Zipping backup...';
      zip.generateAsync({ type: 'blob' }).then(function(blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = opts.downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (progressEl) progressEl.style.display = 'none';
        toast('Backup exported — ' + manifest.auditCount + ' audit' + (manifest.auditCount !== 1 ? 's' : '') + ', ' + photoCount + ' photo' + (photoCount !== 1 ? 's' : ''));
      }).catch(function(e) {
        if (progressEl) progressEl.style.display = 'none';
        toast('Zip error: ' + e.message);
        console.error('[BackupExport] zip error:', e);
      });
      return;
    }

    var audit = audits[auditIndex];
    if (progressEl) {
      progressEl.textContent = 'Building backup — ' + (auditIndex + 1) + ' / ' + audits.length + ': ' + (audit.customer.name || 'Unnamed');
    }

    collectBackupPhotosForAudit(audit, function(photoRecords, legacyRecord) {
      var auditFile = 'audits/' + audit.id + '.json';
      auditsFolder.file(audit.id + '.json', JSON.stringify(buildFullAuditBackupRecord(audit), null, 2));

      var entry = {
        id: audit.id,
        name: (audit.customer && audit.customer.name) || 'Unnamed',
        auditFile: auditFile,
        photos: []
      };

      photoRecords.forEach(function(photo) {
        var photoFile = 'photos/' + photo.id + '.json';
        photosFolder.file(photo.id + '.json', JSON.stringify(photo, null, 2));
        entry.photos.push(photoFile);
        photoCount++;
      });

      if (legacyRecord && (legacyRecord.photoPdfDataUrl || legacyRecord.tcPdfDataUrl)) {
        var legacyFile = 'legacy/' + audit.id + '.json';
        legacyFolder.file(audit.id + '.json', JSON.stringify({
          auditId: audit.id,
          photoPdfDataUrl: legacyRecord.photoPdfDataUrl || null,
          tcPdfDataUrl: legacyRecord.tcPdfDataUrl || null
        }, null, 2));
        entry.legacyFile = legacyFile;
      }

      manifest.audits.push(entry);
      auditIndex++;
      setTimeout(processNextAudit, 10);
    });
  }

  processNextAudit();
}

function exportFullBackup(progressEl) {
  var saved = getSaved();
  if (!saved.length) { toast('No saved audits to back up'); return; }
  var dateStr = new Date().toISOString().split('T')[0];
  exportBackupBundle(saved, {
    bundleType: BACKUP_BUNDLE_FULL,
    progressEl: progressEl,
    downloadName: 'AFT_Full_Backup_' + dateStr + '.zip'
  });
}

function exportWeeklyBackup(week, progressEl) {
  if (!week.audits.length) { toast('No audits in this week'); return; }
  var weekStart = week.monday.toISOString().split('T')[0];
  exportBackupBundle(week.audits, {
    bundleType: BACKUP_BUNDLE_WEEKLY,
    week: week.label,
    weekStart: weekStart,
    progressEl: progressEl,
    downloadName: 'AFT_Weekly_Backup_' + weekStart + '.zip'
  });
}

function exportFullExport(progressEl) {
  var saved = getSaved();
  if (!saved.length) { toast('No saved audits to export'); return; }
  if (typeof JSZip === 'undefined') { toast('Zip library not loaded — check internet connection'); return; }

  var zip = new JSZip();
  var manifest = {
    bundleType: EXPORT_BUNDLE_FULL,
    exportedAt: new Date().toISOString(),
    source: 'AuditFieldTool',
    version: 1,
    auditCount: saved.length,
    note: 'Human-readable export — not for app restore. Use Full Backup for restore.',
    audits: []
  };

  var auditIndex = 0;
  if (progressEl) {
    progressEl.style.display = 'block';
    progressEl.textContent = 'Building export — 0 / ' + saved.length;
  }

  function processNextAudit() {
    if (auditIndex >= saved.length) {
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      zip.file('README.txt',
        'Audit Field Tool — Full Export\n\n' +
        'This zip contains human-readable files: JPG photos, PDFs, and text summaries.\n' +
        'It is NOT for restoring into the app — use Full Backup for that.\n\n' +
        'Folder layout per audit:\n' +
        '  audit-summary.txt — customer info, voice dump, photo notes\n' +
        '  interpretation.txt — interpreter notes and field output (if run)\n' +
        '  photos/ — individual JPG files\n' +
        '  *-photos.pdf — photo PDF\n' +
        '  *-TC.pdf — signed terms & conditions PDF\n'
      );
      if (progressEl) progressEl.textContent = 'Zipping export...';
      zip.generateAsync({ type: 'blob' }).then(function(blob) {
        var dateStr = new Date().toISOString().split('T')[0];
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'AFT_Full_Export_' + dateStr + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (progressEl) progressEl.style.display = 'none';
        toast('Full export ready — ' + saved.length + ' audit' + (saved.length !== 1 ? 's' : ''));
      }).catch(function(e) {
        if (progressEl) progressEl.style.display = 'none';
        toast('Zip error: ' + e.message);
        console.error('[FullExport] zip error:', e);
      });
      return;
    }

    var audit = saved[auditIndex];
    var folderName = buildAuditExportFolderName(audit);
    var auditFolder = zip.folder(folderName);
    var baseFilename = folderName;
    var entry = { id: audit.id, folder: folderName, photos: 0, photoPdf: false, tcPdf: false, interpreted: auditHasInterpretation(audit) };

    if (progressEl) {
      progressEl.textContent = 'Building export — ' + (auditIndex + 1) + ' / ' + saved.length + ': ' + (audit.customer.name || 'Unnamed');
    }

    auditFolder.file('audit-summary.txt', buildAuditTextSummary(audit));

    if (auditHasInterpretation(audit)) {
      auditFolder.file('interpretation.txt', buildInterpretTextSummary(audit));
      auditFolder.file('interpretation.json', JSON.stringify(audit.interpretedOutput, null, 2));
    }

    function afterPdfs() {
      manifest.audits.push(entry);
      auditIndex++;
      setTimeout(processNextAudit, 10);
    }

    function afterPhotos(photoRecords) {
      var photosFolder = auditFolder.folder('photos');
      photoRecords.forEach(function(photo, index) {
        var bytes = dataUrlToJpegBytes(photo.dataUrl);
        if (bytes) {
          var cat = (photo.category || 'photo').replace(/[^a-zA-Z0-9_-]/g, '');
          photosFolder.file((index + 1) + '_' + cat + '.jpg', bytes, { binary: true });
          entry.photos++;
        }
      });

      if (auditHasPhotos(audit)) {
        exportSavedPhotoPDF(audit, function(blob) {
          if (blob) {
            auditFolder.file(baseFilename + '-photos.pdf', blob);
            entry.photoPdf = true;
          }
          if (auditHasSignature(audit)) {
            generateTCPDFFromRecord(audit, function(tcBlob) {
              if (tcBlob) {
                auditFolder.file(baseFilename + '-TC.pdf', tcBlob);
                entry.tcPdf = true;
              }
              afterPdfs();
            }, true);
          } else {
            afterPdfs();
          }
        }, true);
      } else if (auditHasSignature(audit)) {
        generateTCPDFFromRecord(audit, function(tcBlob) {
          if (tcBlob) {
            auditFolder.file(baseFilename + '-TC.pdf', tcBlob);
            entry.tcPdf = true;
          }
          afterPdfs();
        }, true);
      } else {
        afterPdfs();
      }
    }

    collectBackupPhotosForAudit(audit, function(photoRecords) {
      afterPhotos(photoRecords);
    });
  }

  processNextAudit();
}

function initBackupRestore() {
  var btn = document.getElementById('backup-restore-btn');
  var input = document.getElementById('backup-restore-input');
  var selected = document.getElementById('backup-restore-selected');
  if (!btn || !input) return;

  btn.addEventListener('click', function() { input.click(); });
  input.addEventListener('change', function() {
    var file = input.files[0];
    if (!file) return;
    if (selected) {
      selected.style.display = 'block';
      selected.textContent = '✓ ' + file.name;
    }
    restoreFromBackupFile(file);
    input.value = '';
  });
}

function restoreFromBackupFile(file) {
  if (typeof JSZip === 'undefined') { toast('Zip library not loaded — check internet connection'); return; }
  if (!file || !/\.zip$/i.test(file.name)) {
    toast('Please select a .zip backup file');
    return;
  }

  toast('Restoring backup...');

  JSZip.loadAsync(file).then(function(zip) {
    var manifestEntry = zip.file('manifest.json');
    if (!manifestEntry) throw new Error('Not a valid backup — missing manifest.json');
    return manifestEntry.async('string').then(function(text) {
      var manifest;
      try { manifest = JSON.parse(text); }
      catch(e) { throw new Error('Not a valid backup — manifest.json is corrupted'); }
      if (!manifest.bundleType || (manifest.bundleType !== BACKUP_BUNDLE_FULL && manifest.bundleType !== BACKUP_BUNDLE_WEEKLY)) {
        throw new Error('Not a valid Audit Field Tool backup — use a Full Backup or Weekly Backup zip');
      }
      if (!manifest.audits || !manifest.audits.length) {
        throw new Error('Backup zip contains no audits');
      }
      return restoreBackupFromZip(zip, manifest);
    });
  }).then(function(result) {
    toast('Restored ' + result.auditCount + ' audit' + (result.auditCount !== 1 ? 's' : '') + ' and ' + result.photoCount + ' photo' + (result.photoCount !== 1 ? 's' : ''));
    renderAuditsList();
    var exportPanel = document.getElementById('tab-export');
    if (exportPanel && exportPanel.style.display === 'block') renderWeeklyBatches();
  }).catch(function(err) {
    toast(err.message || 'Restore failed');
    console.error('[BackupRestore] failed:', err);
  });
}

function restoreBackupFromZip(zip, manifest) {
  return new Promise(function(resolve, reject) {
    var saved = getSaved().slice();
    var auditCount = 0;
    var photoCount = 0;
    var entries = manifest.audits.slice();
    var entryIndex = 0;

    function nextEntry() {
      if (entryIndex >= entries.length) {
        saved.sort(function(a, b) {
          return (b.savedAt || '').localeCompare(a.savedAt || '');
        });
        setSaved(saved);
        resolve({ auditCount: auditCount, photoCount: photoCount });
        return;
      }

      var entry = entries[entryIndex];
      var auditPath = entry.auditFile || ('audits/' + entry.id + '.json');
      var auditFile = zip.file(auditPath);
      if (!auditFile) {
        entryIndex++;
        nextEntry();
        return;
      }

      auditFile.async('string').then(function(text) {
        var audit;
        try { audit = JSON.parse(text); }
        catch(e) { throw new Error('Corrupted audit file in backup'); }
        if (!audit || !audit.id) throw new Error('Invalid audit record in backup');

        restoreBackupPhotos(zip, entry.photos || [], audit.id).then(function(restoredPhotos) {
          photoCount += restoredPhotos;

          var legacyPath = entry.legacyFile || ('legacy/' + audit.id + '.json');
          var legacyZipFile = zip.file(legacyPath);
          var legacyPromise;
          if (legacyZipFile) {
            legacyPromise = legacyZipFile.async('string').then(function(legacyText) {
              var legacy = JSON.parse(legacyText);
              audit.legacyImport = true;
              audit.legacyPhotoPdf = !!legacy.photoPdfDataUrl;
              audit.legacyTcPdf = !!legacy.tcPdfDataUrl;
              return new Promise(function(res) {
                saveLegacyFiles(audit.id, legacy.photoPdfDataUrl, legacy.tcPdfDataUrl, function() { res(); });
              });
            });
          } else {
            legacyPromise = Promise.resolve();
          }

          return legacyPromise.then(function() {
            var idx = saved.findIndex(function(a) { return a.id === audit.id; });
            if (idx >= 0) saved[idx] = audit;
            else saved.unshift(audit);
            auditCount++;
            entryIndex++;
            nextEntry();
          });
        });
      }).catch(reject);
    }

    nextEntry();
  });
}

function restoreBackupPhotos(zip, photoPaths, auditId) {
  return new Promise(function(resolve) {
    if (!photoPaths.length) { resolve(0); return; }
    var restored = 0;
    var i = 0;

    function next() {
      if (i >= photoPaths.length) { resolve(restored); return; }
      var path = photoPaths[i];
      var photoFile = zip.file(path);
      if (!photoFile) { i++; next(); return; }
      photoFile.async('string').then(function(text) {
        var photo;
        try { photo = JSON.parse(text); } catch(e) { i++; next(); return; }
        if (!photo || !photo.id || !photo.dataUrl) { i++; next(); return; }
        savePhotoToDB({
          id: photo.id,
          auditId: auditId,
          dataUrl: photo.dataUrl,
          note: photo.note || '',
          category: photo.category || '',
          ts: photo.ts || new Date().toISOString(),
          markupStrokes: photo.markupStrokes || []
        }, function(ok) {
          if (ok) restored++;
          i++;
          next();
        });
      }).catch(function() { i++; next(); });
    }

    next();
  });
}

// ============================================================
// WEEKLY T&C + PHOTOS BUNDLE — PDF zip for scheduler handoff
// ============================================================
function exportWeekSchedulerBundle(week, progressEl) {
  if (typeof JSZip === 'undefined') { toast('Zip library not loaded — check internet connection'); return; }
  if (!week.audits.length) { toast('No audits in this week'); return; }

  var missingSig = week.audits.filter(function(a) { return !auditHasSignature(a); });
  if (missingSig.length) {
    var names = missingSig.map(function(a) { return '• ' + (a.customer.name || 'Unnamed'); }).join('\n');
    if (!confirm('These audits have no T&C signature:\n\n' + names + '\n\nExport T&C + Photos zip anyway?')) {
      return;
    }
  }

  var zip = new JSZip();
  var photoFolder = zip.folder("Photo PDF's");
  var tcFolder = zip.folder("T&C PDF's");
  var results = [];

  if (progressEl) { progressEl.style.display = 'block'; progressEl.textContent = 'Building T&C + Photos bundle — 0 / ' + week.audits.length; }

  var index = 0;
  function next() {
    if (index >= week.audits.length) { finish(); return; }

    var audit = week.audits[index];
    var safeName = (audit.customer.name || 'audit-' + (index + 1)).replace(/[^a-zA-Z0-9]/g, '-');
    var dateStr = audit.customer.date || new Date().toISOString().split('T')[0];
    var baseFilename = dateStr + '_' + safeName;

    if (progressEl) progressEl.textContent = 'T&C + Photos bundle — ' + (index + 1) + ' / ' + week.audits.length + ': ' + (audit.customer.name || 'Unnamed');

    var entry = { photoPdf: false, tcPdf: false };

    addSchedulerAuditPdfs(audit, baseFilename, photoFolder, tcFolder, entry, function() {
      results.push(entry);
      index++;
      setTimeout(next, 50);
    });
  }

  function finish() {
    if (progressEl) progressEl.textContent = 'Zipping T&C + Photos bundle...';
    zip.generateAsync({ type: 'blob' }).then(function(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = buildSchedulerZipFilename(week) + '.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (progressEl) progressEl.style.display = 'none';
      var photoCount = results.filter(function(e) { return e.photoPdf; }).length;
      var tcCount = results.filter(function(e) { return e.tcPdf; }).length;
      var expectedPhotos = week.audits.filter(auditHasPhotos).length;
      var expectedTc = week.audits.filter(auditHasSignature).length;
      var msg = 'T&C + Photos bundle — ' + photoCount + ' photo PDFs, ' + tcCount + ' T&C PDFs';
      if (photoCount < expectedPhotos || tcCount < expectedTc) {
        msg += ' (some expected PDFs missing)';
      }
      toast(msg);
    }).catch(function(e) {
      if (progressEl) progressEl.style.display = 'none';
      toast('Zip error: ' + e.message);
    });
  }

  next();
}

// Converts a base64 data URL back into a Blob. Legacy PDF files are stored
// as data URLs in IndexedDB (not raw Blobs) because Safari/iOS has a known
// bug storing Blob/File objects directly in IndexedDB — same reason photos
// in this app have always been stored as data URLs.
function dataURLtoBlob(dataUrl) {
  var parts = dataUrl.split(',');
  var mimeMatch = parts[0].match(/:(.*?);/);
  var mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
  var binary = atob(parts[1]);
  var array = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) { array[i] = binary.charCodeAt(i); }
  return new Blob([array], { type: mime });
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ============================================================
// T&C MODULE
// ============================================================

var tcSigCanvas = null;
var tcSigCtx = null;
var tcDrawing = false;
var tcStrokes = [];
var tcCurrentStroke = [];
var tcHasSig = false;

// Wipes the customer signature — used by the on-card Clear button and by
// Reset Current Audit, so a new customer never inherits the last one's signature.
function clearTCSignature() {
  tcStrokes = []; tcCurrentStroke = []; tcHasSig = false;
  S.tcSignature = null; save();
  var preview = document.getElementById('tc-sig-preview');
  var noSigMsg = document.getElementById('tc-no-sig-msg');
  var clearBtn = document.getElementById('tc-sig-clear');
  if (preview) preview.style.display = 'none';
  if (noSigMsg) noSigMsg.style.display = 'block';
  if (clearBtn) clearBtn.style.display = 'none';
}

function initTCTab() {
  tcSigCanvas = document.getElementById('tc-sig-canvas');
  if (!tcSigCanvas) return;

  // Open signature overlay
  document.getElementById('tc-open-sig-btn').addEventListener('click', function() {
    document.getElementById('sig-overlay').style.display = 'flex';
    setupSigCanvas();
  });

  // Save signature button
  document.getElementById('tc-sig-save-btn').addEventListener('click', function() {
    if (tcStrokes.length === 0) {
      alert('Please draw your signature first.');
      return;
    }
    // Save signature as data URL
    S.tcSignature = tcSigCanvas.toDataURL('image/png');
    save();
    autosaveAudit();

    // Show preview
    var preview = document.getElementById('tc-sig-preview');
    var previewImg = document.getElementById('tc-sig-preview-img');
    var noSigMsg = document.getElementById('tc-no-sig-msg');
    var clearBtn = document.getElementById('tc-sig-clear');
    if (preview) preview.style.display = 'block';
    if (previewImg) previewImg.src = S.tcSignature;
    if (noSigMsg) noSigMsg.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'inline-block';
    tcHasSig = true;

    // Close overlay
    document.getElementById('sig-overlay').style.display = 'none';
    toast('Signature saved');
  });

  // Clear button (on T&C card)
  document.getElementById('tc-sig-clear').addEventListener('click', function() {
    clearTCSignature();
    toast('Signature cleared');
  });

  // Back button (in overlay) — discard in-session strokes without saving
  document.getElementById('tc-sig-cancel').addEventListener('click', function() {
    tcStrokes = []; tcCurrentStroke = [];
    if (tcSigCtx && tcSigCanvas) {
      var rect = tcSigCanvas.getBoundingClientRect();
      tcSigCtx.clearRect(0, 0, tcSigCanvas.width, tcSigCanvas.height);
      tcSigCtx.fillStyle = '#ffffff';
      tcSigCtx.fillRect(0, 0, rect.width, rect.height);
    }
    document.getElementById('sig-overlay').style.display = 'none';
  });

  // Undo button (in overlay)
  document.getElementById('tc-sig-undo').addEventListener('click', function() {
    if (!tcStrokes.length) return;
    tcStrokes.pop();
    redrawStrokes();
  });

  // Clear button (in overlay)
  document.getElementById('tc-sig-redo-clear').addEventListener('click', function() {
    tcStrokes = []; tcCurrentStroke = [];
    if (tcSigCtx) {
      var rect = tcSigCanvas.getBoundingClientRect();
      tcSigCtx.clearRect(0, 0, tcSigCanvas.width, tcSigCanvas.height);
      // Refill white background
      tcSigCtx.fillStyle = '#ffffff';
      tcSigCtx.fillRect(0, 0, rect.width, rect.height);
    }
  });

  var genBtn = document.getElementById('tc-generate-btn');
  if (genBtn) genBtn.addEventListener('click', function() {
    generateTCPDF(null, null);
  });
}

function setupSigCanvas() {
  tcSigCanvas = document.getElementById('tc-sig-canvas');
  if (!tcSigCanvas) return;

  var rect = tcSigCanvas.getBoundingClientRect();
  tcSigCanvas.width = rect.width * window.devicePixelRatio;
  tcSigCanvas.height = rect.height * window.devicePixelRatio;
  tcSigCtx = tcSigCanvas.getContext('2d');
  tcSigCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

  // White background — critical for signature visibility
  tcSigCtx.fillStyle = '#ffffff';
  tcSigCtx.fillRect(0, 0, rect.width, rect.height);

  // Black ink
  tcSigCtx.strokeStyle = '#000000';
  tcSigCtx.lineWidth = 2.5;
  tcSigCtx.lineCap = 'round';
  tcSigCtx.lineJoin = 'round';

  // Redraw existing strokes if any
  redrawStrokes();

  // Remove old listeners by cloning
  var newCanvas = tcSigCanvas.cloneNode(true);
  tcSigCanvas.parentNode.replaceChild(newCanvas, tcSigCanvas);
  tcSigCanvas = newCanvas;
  tcSigCtx = tcSigCanvas.getContext('2d');
  tcSigCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  tcSigCtx.fillStyle = '#ffffff';
  tcSigCtx.fillRect(0, 0, rect.width, rect.height);
  tcSigCtx.strokeStyle = '#000000';
  tcSigCtx.lineWidth = 2.5;
  tcSigCtx.lineCap = 'round';
  tcSigCtx.lineJoin = 'round';
  redrawStrokes();

  function getPos(e) {
    var r = tcSigCanvas.getBoundingClientRect();
    var touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - r.left, y: touch.clientY - r.top };
  }

  function startDraw(e) {
    e.preventDefault();
    tcDrawing = true;
    tcCurrentStroke = [];
    var pos = getPos(e);
    tcCurrentStroke.push(pos);
    tcSigCtx.beginPath();
    tcSigCtx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    e.preventDefault();
    if (!tcDrawing) return;
    var pos = getPos(e);
    tcCurrentStroke.push(pos);
    tcSigCtx.lineTo(pos.x, pos.y);
    tcSigCtx.stroke();
  }

  function endDraw(e) {
    if (!tcDrawing) return;
    tcDrawing = false;
    if (tcCurrentStroke.length > 0) {
      tcStrokes.push(tcCurrentStroke.slice());
    }
    tcCurrentStroke = [];
  }

  tcSigCanvas.addEventListener('mousedown', startDraw);
  tcSigCanvas.addEventListener('mousemove', draw);
  tcSigCanvas.addEventListener('mouseup', endDraw);
  tcSigCanvas.addEventListener('mouseleave', endDraw);
  tcSigCanvas.addEventListener('touchstart', startDraw, {passive:false});
  tcSigCanvas.addEventListener('touchmove', draw, {passive:false});
  tcSigCanvas.addEventListener('touchend', endDraw);
}

function redrawStrokes() {
  if (!tcSigCtx || !tcSigCanvas) return;
  var rect = tcSigCanvas.getBoundingClientRect();
  tcSigCtx.fillStyle = '#ffffff';
  tcSigCtx.fillRect(0, 0, rect.width, rect.height);
  tcSigCtx.strokeStyle = '#000000';
  tcSigCtx.lineWidth = 2.5;
  tcSigCtx.lineCap = 'round';
  tcSigCtx.lineJoin = 'round';
  tcStrokes.forEach(function(stroke) {
    if (stroke.length < 2) return;
    tcSigCtx.beginPath();
    tcSigCtx.moveTo(stroke[0].x, stroke[0].y);
    for (var i = 1; i < stroke.length; i++) {
      tcSigCtx.lineTo(stroke[i].x, stroke[i].y);
    }
    tcSigCtx.stroke();
  });
}

function renderTCInfo() {
  var nameEl = document.getElementById('tc-name-display');
  var addrEl = document.getElementById('tc-address-display');
  var dateEl = document.getElementById('tc-date-display');
  var warnEl = document.getElementById('tc-no-customer-msg');
  if (nameEl) nameEl.textContent = S.name || '—';
  if (addrEl) addrEl.textContent = S.address || '—';
  if (dateEl) dateEl.textContent = S.date || '—';
  if (warnEl) warnEl.style.display = (!S.name && !S.address) ? 'block' : 'none';

  // Restore signature preview if exists
  var preview = document.getElementById('tc-sig-preview');
  var previewImg = document.getElementById('tc-sig-preview-img');
  var noSigMsg = document.getElementById('tc-no-sig-msg');
  var clearBtn = document.getElementById('tc-sig-clear');
  if (S.tcSignature) {
    if (preview) preview.style.display = 'block';
    if (previewImg) previewImg.src = S.tcSignature;
    if (noSigMsg) noSigMsg.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'inline-block';
  } else {
    if (preview) preview.style.display = 'none';
    if (noSigMsg) noSigMsg.style.display = 'block';
    if (clearBtn) clearBtn.style.display = 'none';
  }
}

function saveTCSignature() {
  if (tcStrokes.length > 0 && tcSigCanvas) {
    S.tcSignature = tcSigCanvas.toDataURL('image/png');
    save();
  }
}

function generateTCPDF(auditData, callback, blobMode) {
  var name, address, date, sigDataUrl;

  if (auditData && auditData.customer) {
    name = auditData.customer.name || '';
    address = auditData.customer.address || '';
    date = auditData.customer.date || '';
    sigDataUrl = auditData.tcSignature || null;
  } else {
    name = S.name || '';
    address = S.address || '';
    date = S.date || '';
    sigDataUrl = S.tcSignature || null;
  }

  if (!name) {
    if (blobMode) { if (callback) callback(null); return; }
    toast('No customer name — fill in customer info first');
    if (callback) callback();
    return;
  }

  if (!sigDataUrl && !auditData) {
    if (!confirm('No signature captured. Generate T&C without signature?')) {
      if (callback) callback();
      return;
    }
  }

  var genMsg = document.getElementById('tc-generating-msg');
  if (genMsg) genMsg.style.display = 'block';

  overlayTCPDF(name, address, date, sigDataUrl, genMsg, callback, blobMode);
}

async function overlayTCPDF(name, address, date, sigDataUrl, genMsg, callback, blobMode) {
  try {
    var PDFLib = window.PDFLib;
    if (!PDFLib) {
      toast('PDF library not loaded — check internet connection');
      if (genMsg) genMsg.style.display = 'none';
      if (blobMode) { if (callback) callback(null); return; }
      if (callback) callback();
      return;
    }

    // Load blank T&C PDF
    var pdfBytes;
    try {
      var response = await fetch('blank-tc.pdf');
      if (!response.ok) throw new Error('blank-tc.pdf not found');
      var arrayBuffer = await response.arrayBuffer();
      pdfBytes = new Uint8Array(arrayBuffer);
    } catch(e) {
      toast('Could not load blank-tc.pdf — make sure it is in the app folder');
      if (genMsg) genMsg.style.display = 'none';
      if (blobMode) { if (callback) callback(null); return; }
      if (callback) callback();
      return;
    }

    var pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    var pages = pdfDoc.getPages();
    var page2 = pages[1]; // Page 2 — signature block

    var size = page2.getSize();
    var height = size.height;

    // Embed standard font
    var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    var fontSize = 10;
    var textColor = PDFLib.rgb(0, 0, 0);

    // ── COORDINATES for page 2 signature block ──
    // pdf-lib uses bottom-left origin (0,0 = bottom left)
    // These coordinates are tuned to match the blank T&C form lines

    // Signature image — above the signature line
    if (sigDataUrl) {
      try {
        // Convert canvas dataUrl to bytes
        var sigBase64 = sigDataUrl.split(',')[1];
        var sigBytes = Uint8Array.from(atob(sigBase64), function(c) { return c.charCodeAt(0); });
        var sigImage = await pdfDoc.embedPng(sigBytes);
        var sigDims = sigImage.scale(0.3);
        // Position signature above the signature line
        page2.drawImage(sigImage, {
          x: 380,
          y: height - 385,
          width: Math.min(sigDims.width, 180),
          height: Math.min(sigDims.height, 35),
        });
      } catch(e) {
        console.error('Sig embed error:', e);
      }
    }

    // Print name — on the print name line
    if (name) {
      page2.drawText(name, {
        x: 320,
        y: height - 400,
        size: fontSize,
        font: font,
        color: textColor,
      });
    }

    // Address line 1
    if (address) {
      page2.drawText(address, {
        x: 320,
        y: height - 435,
        size: fontSize,
        font: font,
        color: textColor,
      });
    }

    // Date
    if (date) {
      page2.drawText(date, {
        x: 320,
        y: height - 480,
        size: fontSize,
        font: font,
        color: textColor,
      });
    }

    // Save and download
    var savedBytes = await pdfDoc.save();
    var blob = new Blob([savedBytes], { type: 'application/pdf' });

    if (blobMode) {
      if (genMsg) genMsg.style.display = 'none';
      if (callback) callback(blob);
      return;
    }

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var safeName = (name || 'customer').replace(/[^a-zA-Z0-9]/g, '-');
    a.download = safeName + '-TC.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast('T&C PDF: ' + (name || 'customer'));

  } catch(e) {
    toast('PDF error: ' + e.message);
    console.error('T&C PDF error:', e);
    if (blobMode) { if (genMsg) genMsg.style.display = 'none'; if (callback) callback(null); return; }
  }

  if (genMsg) genMsg.style.display = 'none';
  if (callback) setTimeout(callback, 300);
}

function generateTCPDFFromRecord(audit, callback, blobMode) {
  // Legacy-imported audit — pass the original signed T&C PDF straight
  // through instead of trying to regenerate one from a signature that
  // doesn't exist in this app's storage.
  if (audit.legacyImport) {
    getLegacyFiles(audit.id, function(legacy) {
      if (!legacy || !legacy.tcPdfDataUrl) {
        if (blobMode) { if (callback) callback(null); return; }
        toast('No legacy T&C PDF stored for ' + (audit.customer.name || 'this audit') + ' — skipping');
        if (callback) setTimeout(callback, 100);
        return;
      }
      var blob = dataURLtoBlob(legacy.tcPdfDataUrl);
      if (blobMode) { if (callback) callback(blob); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var safeName = (audit.customer.name || 'customer').replace(/[^a-zA-Z0-9]/g, '-');
      a.download = safeName + '-TC.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('T&C PDF exported (legacy)');
      if (callback) setTimeout(callback, 300);
    });
    return;
  }

  if (!audit.tcSignature) {
    if (blobMode) { if (callback) callback(null); return; }
    toast('No signature for ' + (audit.customer.name || 'this audit') + ' — skipping');
    if (callback) setTimeout(callback, 100);
    return;
  }
  generateTCPDF(audit, callback, blobMode);
}