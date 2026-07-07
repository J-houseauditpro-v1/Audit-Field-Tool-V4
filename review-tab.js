// ── REVIEW SUB-TAB (Audit → Review) ───────────────────────────
// Full audit summary with inline edits before sending to Processing.

var reviewTabInitialized = false;

function initReviewTab() {
  if (!reviewTabInitialized) {
    reviewTabInitialized = true;
    wireReviewTab();
  }
  renderReviewTab();
}

function wireReviewTab() {
  var sendBtn = document.getElementById('review-send-processing-btn');
  if (sendBtn) sendBtn.addEventListener('click', sendAuditToProcessing);

  var fields = [
    ['review-f-name', 'name'],
    ['review-f-address', 'address'],
    ['review-f-date', 'date'],
    ['review-f-year', 'year'],
    ['review-f-sqft', 'sqft'],
    ['review-f-property-type', 'propertyType'],
    ['review-f-coop', 'coop']
  ];
  fields.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    el.addEventListener('input', function() {
      if (typeof S === 'undefined') return;
      S[pair[1]] = el.value;
      if (typeof save === 'function') save();
      if (typeof renderHeader === 'function') renderHeader();
    });
    el.addEventListener('change', function() {
      if (typeof S === 'undefined') return;
      S[pair[1]] = el.value;
      if (typeof save === 'function') save();
      if (typeof renderHeader === 'function') renderHeader();
      if (pair[0] === 'review-f-date' && typeof syncAllDateFieldPlaceholders === 'function') {
        syncAllDateFieldPlaceholders();
      }
    });
  });

  document.querySelectorAll('.date-field').forEach(function(wrap) {
    if (typeof bindDateFieldPlaceholder === 'function') bindDateFieldPlaceholder(wrap);
  });

  var researchEl = document.getElementById('review-research-notes');
  if (researchEl) {
    researchEl.addEventListener('input', function() {
      if (typeof S === 'undefined') return;
      S.researchNotes = researchEl.value;
      if (typeof save === 'function') save();
    });
  }

  var dumpEl = document.getElementById('review-voice-dump');
  if (dumpEl) {
    dumpEl.addEventListener('input', function() {
      if (typeof S === 'undefined') return;
      S.dump = dumpEl.value;
      if (typeof save === 'function') save();
      var voiceDump = document.getElementById('voice-dump');
      if (voiceDump && voiceDump.value !== dumpEl.value) voiceDump.value = dumpEl.value;
    });
  }
}

function renderReviewTab() {
  var hasAudit = typeof S !== 'undefined' && (S.name || S.dump || (S.photos && S.photos.length));
  var emptyEl = document.getElementById('review-empty-msg');
  var contentEl = document.getElementById('review-content');
  var sendBtn = document.getElementById('review-send-processing-btn');
  var readyEl = document.getElementById('review-ready-status');

  if (emptyEl) emptyEl.style.display = hasAudit ? 'none' : 'block';
  if (contentEl) contentEl.style.display = hasAudit ? 'block' : 'none';
  if (sendBtn) sendBtn.style.display = hasAudit ? 'block' : 'none';

  if (!hasAudit) return;

  var fields = {
    'review-f-name': S.name,
    'review-f-address': S.address,
    'review-f-date': S.date,
    'review-f-year': S.year,
    'review-f-sqft': S.sqft,
    'review-f-property-type': S.propertyType,
    'review-f-coop': S.coop
  };
  Object.keys(fields).forEach(function(id) {
    var el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = fields[id] || '';
  });
  if (typeof syncAllDateFieldPlaceholders === 'function') syncAllDateFieldPlaceholders();

  var researchEl = document.getElementById('review-research-notes');
  if (researchEl && document.activeElement !== researchEl) {
    researchEl.value = S.researchNotes || '';
  }

  var dumpEl = document.getElementById('review-voice-dump');
  if (dumpEl && document.activeElement !== dumpEl) {
    dumpEl.value = S.dump || '';
  }

  var photoCountEl = document.getElementById('review-photo-count');
  if (photoCountEl) photoCountEl.textContent = String((S.photos || []).length);

  var sigEl = document.getElementById('review-sig-status');
  if (sigEl) {
    var hasSig = !!(S.tcSignature);
    sigEl.textContent = hasSig ? 'Yes' : 'No';
    sigEl.className = 'review-sig-status ' + (hasSig ? 'review-sig-yes' : 'review-sig-no');
  }

  renderReviewPhotoNotes();

  var saved = typeof getLoadedAuditRecord === 'function' ? getLoadedAuditRecord() : null;
  if (readyEl) {
    if (saved && saved.readyForProcessingAt) {
      readyEl.style.display = 'block';
      readyEl.textContent = '✓ Sent to Processing ' + new Date(saved.readyForProcessingAt).toLocaleString();
    } else {
      readyEl.style.display = 'none';
    }
  }
}

function renderReviewPhotoNotes() {
  var el = document.getElementById('review-photo-notes');
  if (!el || typeof buildPhotoNotesArray !== 'function') return;
  var withNotes = buildPhotoNotesArray(S.photos || []);
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
      return '<div class="photo-notes-item">' + escapeHtmlReview(p.note) + '</div>';
    }).join('');
    return '<div class="photo-notes-group">' +
      '<div class="photo-notes-group-label">' + escapeHtmlReview(label) + '</div>' + items +
    '</div>';
  }).join('');
}

function applyReviewEditsToS() {
  var map = {
    'review-f-name': 'name',
    'review-f-address': 'address',
    'review-f-date': 'date',
    'review-f-year': 'year',
    'review-f-sqft': 'sqft',
    'review-f-property-type': 'propertyType',
    'review-f-coop': 'coop'
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) S[map[id]] = el.value;
  });
  var researchEl = document.getElementById('review-research-notes');
  if (researchEl) S.researchNotes = researchEl.value;
  var dumpEl = document.getElementById('review-voice-dump');
  if (dumpEl) {
    S.dump = dumpEl.value;
    var voiceDump = document.getElementById('voice-dump');
    if (voiceDump) voiceDump.value = dumpEl.value;
  }
  if (typeof fillFields === 'function') fillFields();
  if (typeof save === 'function') save();
}

function sendAuditToProcessing() {
  if (typeof S === 'undefined') return;
  if (!S.name && !S.dump && !(S.photos && S.photos.length)) {
    toast('Add audit data before sending to Processing.');
    return;
  }
  if (!confirm('Mark this audit complete and send to the Interpret queue?')) return;

  applyReviewEditsToS();
  if (typeof persistAuditRecord === 'function') persistAuditRecord();

  var saved = typeof getSaved === 'function' ? getSaved().slice() : [];
  var idx = saved.findIndex(function(a) { return a.id === S.auditId; });
  if (idx < 0) {
    toast('Save the audit first, then try again.');
    return;
  }
  saved[idx].readyForProcessingAt = new Date().toISOString();
  if (typeof setSaved === 'function') setSaved(saved);

  if (typeof renderHeader === 'function') renderHeader();
  if (typeof renderInterpretQueue === 'function') renderInterpretQueue();
  if (typeof renderReviewTab === 'function') renderReviewTab();
  toast('Audit sent to Interpret queue.');
  if (typeof switchMainTab === 'function') switchMainTab('processing', 'interpret');
}

function escapeHtmlReview(str) {
  if (typeof escapeHtml === 'function') return escapeHtml(str);
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
