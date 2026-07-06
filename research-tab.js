// ── RESEARCH TAB (Jobs → Research) ───────────────────────────
// Claude web search per schedule job — customer # + address only.

var researchTabInitialized = false;
var selectedResearchJobId = null;
var researchEditOutput = null;

var RESEARCH_CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 };

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
  var runBtn = document.getElementById('research-run-btn');
  if (runBtn) runBtn.addEventListener('click', runResearchForSelectedJob);

  var forwardBtn = document.getElementById('research-forward-btn');
  if (forwardBtn) forwardBtn.addEventListener('click', forwardResearchToAudit);

  var saveBtn = document.getElementById('research-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveResearchEdits);
}

function getSelectedResearchJob() {
  if (!selectedResearchJobId || typeof getScheduleJobById !== 'function') return null;
  return getScheduleJobById(selectedResearchJobId);
}

function sortResearchFindings(findings) {
  return (findings || []).slice().sort(function(a, b) {
    var ca = RESEARCH_CONFIDENCE_ORDER[(a.confidence || 'medium').toLowerCase()];
    var cb = RESEARCH_CONFIDENCE_ORDER[(b.confidence || 'medium').toLowerCase()];
    if (ca !== cb) return ca - cb;
    return (a.topic || '').localeCompare(b.topic || '');
  });
}

function normalizeResearchOutput(raw) {
  if (!raw) return null;
  var out = {
    findings: sortResearchFindings(raw.findings || []),
    summary: raw.summary || '',
    prefill: {
      year: (raw.prefill && raw.prefill.year) || '',
      sqft: (raw.prefill && raw.prefill.sqft) || '',
      coop: (raw.prefill && raw.prefill.coop) || '',
      generalNotes: (raw.prefill && raw.prefill.generalNotes) || ''
    },
    researchedAt: raw.researchedAt || null,
    meta: raw.meta || {}
  };
  return out;
}

function formatResearchNotesText(output) {
  if (!output) return '';
  var lines = [];
  if (output.summary && output.summary.trim()) lines.push(output.summary.trim());
  if (output.findings && output.findings.length) {
    if (lines.length) lines.push('');
    lines.push('FINDINGS:');
    sortResearchFindings(output.findings).forEach(function(f) {
      var conf = (f.confidence || 'medium').toUpperCase();
      var line = '- [' + conf + '] ' + (f.topic || 'Finding') + ': ' + (f.value || '');
      if (f.source) line += ' (' + f.source + ')';
      lines.push(line);
    });
  }
  if (output.prefill && output.prefill.generalNotes && output.prefill.generalNotes.trim()) {
    if (lines.length) lines.push('');
    lines.push('NOTES FOR FIELD:');
    lines.push(output.prefill.generalNotes.trim());
  }
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
      var rows = day.jobs.map(function(job) {
        return renderResearchQueueRow(job);
      }).join('');
      return '<div class="day-group">' +
        '<div class="day-group-header">' +
          '<span class="day-group-title">' + escapeHtmlResearch(day.label) + '</span>' +
          '<span class="day-group-count">' + day.jobs.length + ' job' + (day.jobs.length !== 1 ? 's' : '') + '</span>' +
        '</div>' + rows +
      '</div>';
    }).join('');

    return '<div class="week-group">' +
      '<div class="week-group-header">' +
        '<span class="week-group-title">' + escapeHtmlResearch(week.label) + '</span>' +
        '<span class="week-group-count">' + week.jobs.length + ' job' + (week.jobs.length !== 1 ? 's' : '') + '</span>' +
      '</div>' + daySections +
    '</div>';
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
  var hasResearch = !!(job.researchOutput && job.researchOutput.findings && job.researchOutput.findings.length);
  var statusBadge = typeof renderScheduleStatusBadge === 'function'
    ? renderScheduleStatusBadge(job.status)
    : '';
  return '<div class="research-queue-row week-audit-row' + (selected ? ' is-current' : '') + '" data-id="' + escapeHtmlResearch(job.id) + '">' +
    '<div class="week-audit-info">' +
      '<div class="week-audit-name">#' + escapeHtmlResearch(String(job.customerNumber)) + ' — ' + escapeHtmlResearch(job.address || '—') + '</div>' +
      '<div class="week-audit-meta">' +
        statusBadge +
        (hasResearch ? '<span class="research-has-results">✓ Researched</span>' : '<span class="research-no-results">Not researched</span>') +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderResearchDetail() {
  var job = getSelectedResearchJob();
  var titleEl = document.getElementById('research-selected-title');
  var metaEl = document.getElementById('research-selected-meta');
  var runBtn = document.getElementById('research-run-btn');
  var forwardBtn = document.getElementById('research-forward-btn');
  var outputCard = document.getElementById('research-output-card');
  var noKeyEl = document.getElementById('research-no-key-warn');

  if (titleEl) {
    titleEl.textContent = job
      ? ('#' + job.customerNumber + ' — ' + (job.address || 'No address'))
      : 'Select a job from the queue below';
  }
  if (metaEl) {
    metaEl.textContent = job
      ? ('Research uses customer # and address only — name is not sent to Claude.')
      : '';
  }

  var hasKey = typeof getInterpretApiKey === 'function' && getInterpretApiKey();
  if (noKeyEl) noKeyEl.style.display = hasKey ? 'none' : 'block';
  if (runBtn) {
    runBtn.disabled = !job || !hasKey;
    runBtn.style.opacity = (!job || !hasKey) ? '0.5' : '1';
    runBtn.textContent = '🔍 Run Research';
  }

  if (!job) {
    if (outputCard) outputCard.style.display = 'none';
    if (forwardBtn) { forwardBtn.disabled = true; forwardBtn.style.opacity = '0.5'; }
    return;
  }

  researchEditOutput = researchEditOutput || (job.researchOutput ? normalizeResearchOutput(job.researchOutput) : null);
  var hasOutput = !!(researchEditOutput && (researchEditOutput.findings.length || researchEditOutput.summary));

  if (forwardBtn) {
    forwardBtn.disabled = !hasOutput;
    forwardBtn.style.opacity = hasOutput ? '1' : '0.5';
  }

  if (!hasOutput) {
    if (outputCard) outputCard.style.display = 'none';
    return;
  }

  if (outputCard) outputCard.style.display = 'block';
  renderResearchOutputEditor(researchEditOutput);
}

function renderResearchOutputEditor(output) {
  var findingsEl = document.getElementById('research-findings-list');
  var summaryEl = document.getElementById('research-summary-edit');
  var yearEl = document.getElementById('research-prefill-year');
  var sqftEl = document.getElementById('research-prefill-sqft');
  var coopEl = document.getElementById('research-prefill-coop');
  var notesEl = document.getElementById('research-prefill-notes');
  var tokenEl = document.getElementById('research-token-usage');

  if (summaryEl) summaryEl.value = output.summary || '';
  if (yearEl) yearEl.value = (output.prefill && output.prefill.year) || '';
  if (sqftEl) sqftEl.value = (output.prefill && output.prefill.sqft) || '';
  if (coopEl) coopEl.value = (output.prefill && output.prefill.coop) || '';
  if (notesEl) notesEl.value = (output.prefill && output.prefill.generalNotes) || '';

  if (tokenEl && output.meta) {
    var inTok = output.meta.input_tokens || 0;
    var outTok = output.meta.output_tokens || 0;
    if (inTok || outTok) {
      tokenEl.textContent = 'Tokens: ' + inTok.toLocaleString() + ' in / ' + outTok.toLocaleString() + ' out';
      tokenEl.style.display = 'block';
    } else {
      tokenEl.style.display = 'none';
    }
  }

  if (!findingsEl) return;
  var sorted = sortResearchFindings(output.findings);
  findingsEl.innerHTML = sorted.map(function(f, i) {
    var conf = (f.confidence || 'medium').toLowerCase();
    return '<div class="research-finding-row" data-idx="' + i + '">' +
      '<div class="research-finding-top">' +
        '<span class="research-confidence conf-' + escapeHtmlResearch(conf) + '">' + escapeHtmlResearch(conf) + '</span>' +
        '<span class="research-finding-topic">' + escapeHtmlResearch(f.topic || 'Finding') + '</span>' +
        '<button type="button" class="btn-xs research-edit-finding-btn" data-idx="' + i + '">Edit</button>' +
      '</div>' +
      '<div class="research-finding-value" data-idx="' + i + '">' + escapeHtmlResearch(f.value || '') + '</div>' +
      (f.source ? '<div class="research-finding-source">' + escapeHtmlResearch(f.source) + '</div>' : '') +
    '</div>';
  }).join('');

  findingsEl.querySelectorAll('.research-edit-finding-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.dataset.idx, 10);
      editResearchFinding(idx);
    });
  });
}

function collectResearchEditsFromForm() {
  var output = researchEditOutput ? JSON.parse(JSON.stringify(researchEditOutput)) : { findings: [], prefill: {}, meta: {} };
  var summaryEl = document.getElementById('research-summary-edit');
  var yearEl = document.getElementById('research-prefill-year');
  var sqftEl = document.getElementById('research-prefill-sqft');
  var coopEl = document.getElementById('research-prefill-coop');
  var notesEl = document.getElementById('research-prefill-notes');
  output.summary = summaryEl ? summaryEl.value.trim() : output.summary;
  output.prefill = output.prefill || {};
  output.prefill.year = yearEl ? yearEl.value.trim() : output.prefill.year;
  output.prefill.sqft = sqftEl ? sqftEl.value.trim() : output.prefill.sqft;
  output.prefill.coop = coopEl ? coopEl.value.trim() : output.prefill.coop;
  output.prefill.generalNotes = notesEl ? notesEl.value.trim() : output.prefill.generalNotes;
  output.findings = sortResearchFindings(output.findings);
  return output;
}

function saveResearchEdits() {
  var job = getSelectedResearchJob();
  if (!job) { toast('Select a job first.'); return; }
  var output = collectResearchEditsFromForm();
  researchEditOutput = output;
  if (typeof updateScheduleJob === 'function') {
    updateScheduleJob(job.id, { researchOutput: output });
    refreshScheduleListIfVisible();
    renderResearchQueue();
    toast('Research saved.');
  }
}

function editResearchFinding(idx) {
  if (!researchEditOutput || !researchEditOutput.findings[idx]) return;
  var f = researchEditOutput.findings[idx];
  var newValue = prompt('Edit finding value for "' + (f.topic || 'Finding') + '":', f.value || '');
  if (newValue === null) return;
  f.value = newValue.trim();
  var newConf = prompt('Confidence (high, medium, low):', f.confidence || 'medium');
  if (newConf !== null) {
    var c = newConf.trim().toLowerCase();
    if (RESEARCH_CONFIDENCE_ORDER[c] !== undefined) f.confidence = c;
  }
  renderResearchOutputEditor(researchEditOutput);
}

function runResearchForSelectedJob() {
  var job = getSelectedResearchJob();
  if (!job) { toast('Select a job from the queue first.'); return; }
  var apiKey = typeof getInterpretApiKey === 'function' ? getInterpretApiKey() : '';
  if (!apiKey) { toast('Add API key in More → Interpret Settings first.'); return; }

  var payload = typeof getResearchJobPayload === 'function' ? getResearchJobPayload(job) : null;
  if (!payload || !payload.address) { toast('Job needs an address for research.'); return; }

  var prompt = 'You are a pre-audit property research assistant for the CHESS energy efficiency program.\n\n' +
    'Use web search to gather publicly available information about this property BEFORE a field audit.\n\n' +
    'CUSTOMER REFERENCE (search by address only — do NOT search or reference any customer name):\n' +
    'Customer #: ' + payload.customerNumber + '\n' +
    'Address: ' + payload.address + '\n\n' +
    'Return ONLY valid JSON with this exact structure:\n' +
    '{\n' +
    '  "findings": [\n' +
    '    { "topic": "Year Built", "value": "...", "confidence": "high", "source": "Zillow or source name" }\n' +
    '  ],\n' +
    '  "summary": "Brief overview for the field auditor",\n' +
    '  "prefill": {\n' +
    '    "year": "",\n' +
    '    "sqft": "",\n' +
    '    "coop": "",\n' +
    '    "generalNotes": "Bullet points the auditor should verify on site"\n' +
    '  }\n' +
    '}\n\n' +
    'RULES:\n' +
    '- Sort findings array by confidence: high first, then medium, then low\n' +
    '- confidence must be exactly "high", "medium", or "low"\n' +
    '- Focus on: year built, conditioned sq ft, property type, electric co-op if identifiable, HVAC type clues, insulation hints, solar panels, recent sales/listing details\n' +
    '- Never include or guess a customer name\n' +
    '- Return ONLY JSON — no markdown fences, no prose outside JSON';

  var runBtn = document.getElementById('research-run-btn');
  var tokenEl = document.getElementById('research-token-usage');
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Researching…'; }
  if (tokenEl) tokenEl.style.display = 'none';

  var model = typeof getInterpretModel === 'function' ? getInterpretModel() : 'claude-sonnet-4-20250514';

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      temperature: 0,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
        allowed_callers: ['direct']
      }],
      messages: [{ role: 'user', content: prompt }]
    })
  })
  .then(function(res) {
    if (!res.ok) {
      return res.json().then(function(e) {
        throw new Error((e.error && e.error.message) || ('HTTP ' + res.status));
      });
    }
    return res.json();
  })
  .then(function(data) {
    var textBlock = (data.content || []).find(function(b) { return b.type === 'text'; });
    var raw = textBlock ? textBlock.text : '';
    if (!raw) throw new Error('No text in response');

    var clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    var jsonStart = clean.indexOf('{');
    var jsonEnd = clean.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object in response');
    clean = clean.substring(jsonStart, jsonEnd + 1);

    var parsed;
    try { parsed = JSON.parse(clean); }
    catch(e1) {
      var repaired = clean.replace(/\r\n/g, '\\n').replace(/\r/g, '\\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
      parsed = JSON.parse(repaired);
    }

    var output = normalizeResearchOutput(parsed);
    output.researchedAt = new Date().toISOString();
    if (data.usage) {
      output.meta = {
        model: data.model || model,
        input_tokens: data.usage.input_tokens || 0,
        output_tokens: data.usage.output_tokens || 0,
        total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
      };
    }

    researchEditOutput = output;
    if (typeof updateScheduleJob === 'function') {
      updateScheduleJob(job.id, { researchOutput: output });
      refreshScheduleListIfVisible();
    }
    renderResearchQueue();
    renderResearchDetail();
    toast('Research complete — review and edit before forwarding.');
  })
  .catch(function(err) {
    toast('Research error: ' + err.message);
    console.error(err);
  })
  .finally(function() {
    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '🔍 Run Research'; }
  });
}

function forwardResearchToAudit() {
  var job = getSelectedResearchJob();
  if (!job) { toast('Select a job first.'); return; }
  var output = collectResearchEditsFromForm();
  if (!output || (!output.findings.length && !output.summary)) {
    toast('Run research and review results first.');
    return;
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
      year: output.prefill.year || job.year,
      sqft: output.prefill.sqft || job.sqft,
      coop: output.prefill.coop || job.coop
    });
  }

  S.name = job.name || '';
  S.address = job.address || '';
  S.date = job.date || '';
  S.customerNumber = job.customerNumber != null ? job.customerNumber : null;
  S.scheduleJobId = job.id;
  S.year = (output.prefill && output.prefill.year) || job.year || '';
  S.sqft = (output.prefill && output.prefill.sqft) || job.sqft || '';
  S.coop = (output.prefill && output.prefill.coop) || job.coop || '';
  S.researchNotes = formatResearchNotesText(output);
  var keepPhotos = S.auditId && job.auditId && S.auditId === job.auditId;
  var savedPhotos = keepPhotos ? S.photos.slice() : [];
  S.auditId = job.auditId || null;
  S.dump = '';
  if (output.prefill && output.prefill.generalNotes) {
    S.dump = output.prefill.generalNotes.trim();
  }
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
