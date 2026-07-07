// ── RESEARCH TAB (Jobs → Research) ───────────────────────────
// Manual property research: Zillow lookup via Google search, then enter fields for Audit.

var researchTabInitialized = false;
var selectedResearchJobId = null;
var researchEditOutput = null;

function initResearchTab() {
  if (!researchTabInitialized) {
    researchTabInitialized = true;
    wireResearchTab();
  }
  if (!selectedResearchJobId && typeof getScheduleJobs === 'function') {
    var jobs = getScheduleJobs();
    if (jobs.length) selectedResearchJobId = jobs[0].id;
  }
  renderResearchQueue();
  renderResearchDetail();
}

function wireResearchTab() {
  var zillowBtn = document.getElementById('research-zillow-btn');
  if (zillowBtn) zillowBtn.addEventListener('click', openZillowLookup);
  var forwardBtn = document.getElementById('research-forward-btn');
  if (forwardBtn) forwardBtn.addEventListener('click', forwardResearchToAudit);
  var saveBtn = document.getElementById('research-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveResearchEdits);
}

function getSelectedResearchJob() {
  if (!selectedResearchJobId || typeof getScheduleJobById !== 'function') return null;
  return getScheduleJobById(selectedResearchJobId);
}

function openZillowLookup() {
  var job = getSelectedResearchJob();
  if (!job) {
    toast('Select a job from the queue first.');
    return;
  }
  var address = (job.address || '').trim();
  if (!address) {
    toast('Job needs an address on the Schedule tab.');
    return;
  }
  var query = address + ' Zillow.com';
  var url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function normalizeResearchOutput(raw) {
  if (!raw) return null;
  return {
    findings: raw.findings || [],
    summary: raw.summary || '',
    prefill: {
      propertyType: (raw.prefill && raw.prefill.propertyType) || '',
      year: (raw.prefill && raw.prefill.year) || '',
      sqft: (raw.prefill && raw.prefill.sqft) || '',
      coop: (raw.prefill && raw.prefill.coop) || '',
      generalNotes: (raw.prefill && raw.prefill.generalNotes) || ''
    },
    researchedAt: raw.researchedAt || null,
    meta: raw.meta || {}
  };
}

function emptyResearchPrefill(job) {
  var fromJob = job || {};
  return {
    propertyType: fromJob.propertyType || '',
    year: fromJob.year || '',
    sqft: fromJob.sqft || '',
    coop: fromJob.coop || '',
    generalNotes: ''
  };
}

function buildResearchOutputFromPrefill(prefill) {
  var p = prefill || {};
  var findings = [];
  if (p.propertyType) findings.push({ topic: 'Property Type', value: p.propertyType });
  var sqftLine = formatSqftForNotes(p.sqft);
  if (sqftLine) findings.push({ topic: 'Square Footage', value: sqftLine });
  if (p.year) findings.push({ topic: 'Year Built', value: String(p.year) });
  return normalizeResearchOutput({
    findings: findings,
    summary: '',
    prefill: p,
    researchedAt: new Date().toISOString(),
    meta: { source: 'manual' }
  });
}

function jobHasResearchData(job) {
  if (!job) return false;
  if (job.researchOutput && job.researchOutput.prefill) {
    var pre = job.researchOutput.prefill;
    if (pre.propertyType || pre.year || pre.sqft) return true;
  }
  return !!(job.propertyType || job.year || job.sqft);
}

function getResearchAuditFields(output) {
  var fields = { propertyType: '', sqft: '', year: '' };
  if (!output) return fields;
  var pre = output.prefill || {};
  fields.propertyType = pre.propertyType || '';
  fields.sqft = pre.sqft || '';
  fields.year = pre.year || '';
  (output.findings || []).forEach(function(f) {
    var topic = (f.topic || '').toLowerCase();
    if (!fields.propertyType && topic === 'property type') fields.propertyType = f.value || '';
    if (!fields.sqft && topic === 'square footage') {
      fields.sqft = String(f.value || '').replace(/\s*sq\s*ft\s*/i, '').trim();
    }
    if (!fields.year && topic === 'year built') fields.year = String(f.value || '').trim();
  });
  return fields;
}

function formatSqftForNotes(sqft) {
  var n = String(sqft || '').trim();
  if (!n) return '';
  return /\bsq\s*ft\b/i.test(n) ? n : n + ' sq ft';
}

function formatResearchNotesText(output) {
  var f = getResearchAuditFields(output);
  var lines = [];
  if (f.propertyType) lines.push('- Property Type: ' + f.propertyType);
  var sqftLine = formatSqftForNotes(f.sqft);
  if (sqftLine) lines.push('- Square Footage: ' + sqftLine);
  if (f.year) lines.push('- Year Built: ' + f.year);
  return lines.join('\n').trim();
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

function renderResearchQueue() {
  var listEl = document.getElementById('research-queue-list');
  if (!listEl || typeof getScheduleJobs !== 'function') return;
  var jobs = getScheduleJobs();
  if (!jobs.length) {
    listEl.innerHTML = '<div class="empty-msg">No jobs on Schedule — add jobs on the Schedule tab first.</div>';
    return;
  }
  var weeks = groupScheduleJobsByWeek(jobs);
  listEl.innerHTML = weeks.map(function(week) {
    var daySections = week.days.map(function(day) {
      var rows = day.jobs.map(function(job) { return renderResearchQueueRow(job); }).join('');
      return '<div class="day-group"><div class="day-group-header"><span class="day-group-title">' + escapeHtmlResearch(day.label) + '</span><span class="day-group-count">' + day.jobs.length + ' job' + (day.jobs.length !== 1 ? 's' : '') + '</span></div>' + rows + '</div>';
    }).join('');
    return '<div class="week-group"><div class="week-group-header"><span class="week-group-title">' + escapeHtmlResearch(week.label) + '</span><span class="week-group-count">' + week.jobs.length + ' job' + (week.jobs.length !== 1 ? 's' : '') + '</span></div>' + daySections + '</div>';
  }).join('');
  listEl.querySelectorAll('.research-queue-row').forEach(function(row) {
    row.addEventListener('click', function() {
      selectedResearchJobId = row.dataset.id;
      researchEditOutput = null;
      renderResearchQueue();
      renderResearchDetail();
    });
  });
}

function renderResearchQueueRow(job) {
  var selected = job.id === selectedResearchJobId;
  var hasResearch = jobHasResearchData(job);
  var statusBadge = typeof renderScheduleStatusBadge === 'function' ? renderScheduleStatusBadge(job.status) : '';
  var displayName = typeof formatScheduleJobDisplayName === 'function' ? formatScheduleJobDisplayName(job) : ('#' + job.customerNumber);
  return '<div class="research-queue-row week-audit-row' + (selected ? ' is-current' : '') + '" data-id="' + escapeHtmlResearch(job.id) + '"><div class="week-audit-info"><div class="week-audit-name research-queue-name">' + escapeHtmlResearch(displayName) + '</div><div class="research-queue-address">' + escapeHtmlResearch(job.address || '—') + '</div><div class="week-audit-meta">' + statusBadge + (hasResearch ? '<span class="research-has-results">✓ Researched</span>' : '<span class="research-no-results">Not researched</span>') + '</div></div></div>';
}

function renderResearchDetail() {
  var job = getSelectedResearchJob();
  var titleEl = document.getElementById('research-selected-title');
  var metaEl = document.getElementById('research-selected-meta');
  var zillowBtn = document.getElementById('research-zillow-btn');
  var forwardBtn = document.getElementById('research-forward-btn');
  var formCard = document.getElementById('research-output-card');

  if (titleEl) {
    titleEl.textContent = job
      ? (typeof formatScheduleJobDisplayLine === 'function' ? formatScheduleJobDisplayLine(job) : ('#' + job.customerNumber + ' — ' + (job.address || 'No address')))
      : 'Select a job from the queue below';
  }
  if (metaEl) {
    metaEl.textContent = job
      ? 'Look up the property on Zillow, then enter sq ft and year built below before forwarding to Audit.'
      : '';
  }

  if (zillowBtn) {
    zillowBtn.disabled = !job || !(job.address || '').trim();
    zillowBtn.style.opacity = zillowBtn.disabled ? '0.5' : '1';
  }

  if (!job) {
    if (formCard) formCard.style.display = 'none';
    if (forwardBtn) { forwardBtn.disabled = true; forwardBtn.style.opacity = '0.5'; }
    return;
  }

  if (formCard) formCard.style.display = 'block';

  if (!researchEditOutput) {
    if (job.researchOutput) {
      researchEditOutput = normalizeResearchOutput(job.researchOutput);
    } else {
      researchEditOutput = buildResearchOutputFromPrefill(emptyResearchPrefill(job));
    }
  }

  if (forwardBtn) {
    forwardBtn.disabled = false;
    forwardBtn.style.opacity = '1';
  }

  renderResearchForm(researchEditOutput);
}

function renderResearchForm(output) {
  var typeEl = document.getElementById('research-prefill-property-type');
  var yearEl = document.getElementById('research-prefill-year');
  var sqftEl = document.getElementById('research-prefill-sqft');
  var coopEl = document.getElementById('research-prefill-coop');
  var notesEl = document.getElementById('research-prefill-notes');

  if (typeEl) typeEl.value = (output.prefill && output.prefill.propertyType) || '';
  if (yearEl) yearEl.value = (output.prefill && output.prefill.year) || '';
  if (sqftEl) sqftEl.value = (output.prefill && output.prefill.sqft) || '';
  if (coopEl) coopEl.value = (output.prefill && output.prefill.coop) || '';
  if (notesEl) notesEl.value = (output.prefill && output.prefill.generalNotes) || '';
}

function collectResearchEditsFromForm() {
  var typeEl = document.getElementById('research-prefill-property-type');
  var yearEl = document.getElementById('research-prefill-year');
  var sqftEl = document.getElementById('research-prefill-sqft');
  var coopEl = document.getElementById('research-prefill-coop');
  var notesEl = document.getElementById('research-prefill-notes');
  var prefill = {
    propertyType: typeEl ? typeEl.value.trim() : '',
    year: yearEl ? yearEl.value.trim() : '',
    sqft: sqftEl ? sqftEl.value.trim() : '',
    coop: coopEl ? coopEl.value.trim() : '',
    generalNotes: notesEl ? notesEl.value.trim() : ''
  };
  var output = buildResearchOutputFromPrefill(prefill);
  if (researchEditOutput && researchEditOutput.researchedAt) {
    output.researchedAt = researchEditOutput.researchedAt;
  }
  return output;
}

function saveResearchEdits() {
  var job = getSelectedResearchJob();
  if (!job) { toast('Select a job first.'); return; }
  researchEditOutput = collectResearchEditsFromForm();
  if (typeof updateScheduleJob === 'function') {
    updateScheduleJob(job.id, {
      researchOutput: researchEditOutput,
      propertyType: researchEditOutput.prefill.propertyType || job.propertyType,
      year: researchEditOutput.prefill.year || job.year,
      sqft: researchEditOutput.prefill.sqft || job.sqft,
      coop: researchEditOutput.prefill.coop || job.coop
    });
    refreshScheduleListIfVisible();
    renderResearchQueue();
    toast('Research saved.');
  }
}

function forwardResearchToAudit() {
  var job = getSelectedResearchJob();
  if (!job) { toast('Select a job first.'); return; }
  var output = collectResearchEditsFromForm();
  var hasData = output.prefill.propertyType || output.prefill.year || output.prefill.sqft;
  if (!hasData) {
    if (!confirm('No property details entered yet. Forward anyway?')) return;
  }
  if (typeof S === 'undefined') return;
  if (S.name || S.dump || (S.photos && S.photos.length)) {
    if (!confirm('Forward research to audit? Current unsaved audit data will be replaced.')) return;
  }
  researchEditOutput = output;
  if (typeof updateScheduleJob === 'function') {
    updateScheduleJob(job.id, {
      researchOutput: output,
      researchForwardedAt: new Date().toISOString(),
      propertyType: output.prefill.propertyType || job.propertyType,
      year: output.prefill.year || job.year,
      sqft: output.prefill.sqft || job.sqft,
      coop: output.prefill.coop || job.coop
    });
  }
  var auditFields = getResearchAuditFields(output);
  S.name = job.name || '';
  S.address = job.address || '';
  S.date = job.date || '';
  S.customerNumber = job.customerNumber != null ? job.customerNumber : null;
  S.scheduleJobId = job.id;
  S.propertyType = auditFields.propertyType || job.propertyType || '';
  S.year = auditFields.year || job.year || '';
  S.sqft = auditFields.sqft || job.sqft || '';
  S.coop = (output.prefill && output.prefill.coop) || job.coop || '';
  S.researchNotes = formatResearchNotesText(output);
  var keepPhotos = S.auditId && job.auditId && S.auditId === job.auditId;
  var savedPhotos = keepPhotos ? S.photos.slice() : [];
  S.auditId = job.auditId || null;
  S.dump = (output.prefill && output.prefill.generalNotes) ? output.prefill.generalNotes.trim() : '';
  S.photos = savedPhotos;
  if (!S.auditId) S.tcSignature = null;
  if (typeof save === 'function') save();
  if (typeof fillFields === 'function') fillFields();
  if (typeof renderHeader === 'function') renderHeader();
  if (typeof renderVoiceDump === 'function') renderVoiceDump();
  if (typeof renderResearchNotesSummary === 'function') renderResearchNotesSummary();
  if (typeof persistAuditRecord === 'function') persistAuditRecord();
  if (typeof switchMainTab === 'function') switchMainTab('audit', 'voice');
  renderResearchQueue();
  toast('Research forwarded to Audit Data.');
}

function escapeHtmlResearch(str) {
  if (typeof escapeHtml === 'function') return escapeHtml(str);
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
