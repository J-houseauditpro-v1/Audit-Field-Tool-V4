// ── RESEARCH TAB (Jobs → Research) ───────────────────────────
// Claude web search per schedule job — customer # + address only.

var researchTabInitialized = false;
var selectedResearchJobId = null;
var researchEditOutput = null;

var RESEARCH_CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 };
var researchSettingsWired = false;

var RESEARCH_INSTRUCTIONS_BUNDLED =
  'Focus on facts useful for a CHESS energy audit pre-site visit.\n' +
  '- Prioritize year built, conditioned square footage, property type, and electric co-op if identifiable.\n' +
  '- Note HVAC type clues, insulation hints, solar panels, and recent listing/sale details when visible.\n' +
  '- Never search for or include a customer name — use address and customer # reference only.\n' +
  '- Cross-check year built and sq ft across sources when possible; lower confidence if sources disagree.\n' +
  '- Flag anything the field auditor should verify on site in generalNotes.';

var RESEARCH_SOURCE_KEYS = [
  { key: 'real_estate', id: 'research-src-real-estate', label: 'Real estate (Zillow, Redfin, Realtor.com)' },
  { key: 'assessor', id: 'research-src-assessor', label: 'County assessor / property records' },
  { key: 'maps', id: 'research-src-maps', label: 'Maps / satellite (Google Maps, etc.)' },
  { key: 'utility', id: 'research-src-utility', label: 'Electric co-op / utility sites' },
  { key: 'general', id: 'research-src-general', label: 'General web fallback' }
];

function getResearchApiKey() {
  try { return localStorage.getItem('aft_research_api_key') || ''; } catch(e) { return ''; }
}
function setResearchApiKey(key) {
  try { if (key) localStorage.setItem('aft_research_api_key', key); else localStorage.removeItem('aft_research_api_key'); } catch(e) {}
}
function getResearchModel() {
  try { return localStorage.getItem('aft_research_model') || 'claude-sonnet-5'; } catch(e) { return 'claude-sonnet-5'; }
}
function setResearchModel(m) { try { localStorage.setItem('aft_research_model', m); } catch(e) {} }
function getResearchEffort() {
  try { return localStorage.getItem('aft_research_effort') || 'low'; } catch(e) { return 'low'; }
}
function setResearchEffort(v) { try { localStorage.setItem('aft_research_effort', v); } catch(e) {} }
function getResearchTemperature() {
  try { return parseFloat(localStorage.getItem('aft_research_temperature') || '0'); } catch(e) { return 0; }
}
function setResearchTemperature(v) { try { localStorage.setItem('aft_research_temperature', String(v)); } catch(e) {} }
function getResearchMaxTokens() {
  try { return parseInt(localStorage.getItem('aft_research_max_tokens') || '4096', 10); } catch(e) { return 4096; }
}
function setResearchMaxTokens(n) { try { localStorage.setItem('aft_research_max_tokens', String(n)); } catch(e) {} }
function getResearchMaxSearches() {
  try { return parseInt(localStorage.getItem('aft_research_max_searches') || '5', 10); } catch(e) { return 5; }
}
function setResearchMaxSearches(n) { try { localStorage.setItem('aft_research_max_searches', String(n)); } catch(e) {} }
function getResearchSearchTool() {
  try { return localStorage.getItem('aft_research_search_tool') || 'web_search_20250305'; } catch(e) { return 'web_search_20250305'; }
}
function setResearchSearchTool(v) { try { localStorage.setItem('aft_research_search_tool', v); } catch(e) {} }
function getResearchSearchStrategy() {
  try { return localStorage.getItem('aft_research_search_strategy') || 'balanced'; } catch(e) { return 'balanced'; }
}
function setResearchSearchStrategy(v) { try { localStorage.setItem('aft_research_search_strategy', v); } catch(e) {} }
function getResearchSearchSources() {
  var defaults = { real_estate: true, assessor: true, maps: true, utility: true, general: true };
  try {
    var raw = localStorage.getItem('aft_research_search_sources');
    if (!raw) return defaults;
    return Object.assign(defaults, JSON.parse(raw));
  } catch(e) { return defaults; }
}
function setResearchSearchSources(obj) {
  try { localStorage.setItem('aft_research_search_sources', JSON.stringify(obj)); } catch(e) {}
}
function getResearchPreferredDomains() {
  try { return localStorage.getItem('aft_research_preferred_domains') || ''; } catch(e) { return ''; }
}
function setResearchPreferredDomains(text) {
  try { localStorage.setItem('aft_research_preferred_domains', text || ''); } catch(e) {}
}
function getResearchInstructions() {
  try { return localStorage.getItem('aft_research_instructions') || RESEARCH_INSTRUCTIONS_BUNDLED; } catch(e) { return RESEARCH_INSTRUCTIONS_BUNDLED; }
}
function setResearchInstructions(text) {
  try { if (text && text.trim()) localStorage.setItem('aft_research_instructions', text); } catch(e) {}
}
function resetResearchInstructions() {
  try { localStorage.removeItem('aft_research_instructions'); } catch(e) {}
}

function buildResearchSearchGuidance() {
  var sources = getResearchSearchSources();
  var enabled = RESEARCH_SOURCE_KEYS.filter(function(s) { return sources[s.key]; }).map(function(s) { return s.label; });
  var strategy = getResearchSearchStrategy();
  var strategyText = {
    quick: 'Use at most 2–3 highly targeted searches. Stop as soon as year built and sq ft are found from a reliable source.',
    balanced: 'Use progressive searches as needed, up to the max search limit. Prefer authoritative property sources first.',
    thorough: 'Conduct multiple progressive searches and cross-reference at least two independent sources for year built, sq ft, and co-op.'
  }[strategy] || strategy;

  var lines = ['SEARCH STRATEGY: ' + strategyText];
  if (enabled.length) lines.push('PRIORITIZE THESE SOURCE TYPES: ' + enabled.join('; '));
  var domains = getResearchPreferredDomains().split(/\r?\n/).map(function(d) { return d.trim(); }).filter(Boolean);
  if (domains.length) lines.push('PREFERRED DOMAINS (when relevant): ' + domains.join(', '));
  var instructions = getResearchInstructions().trim();
  if (instructions) {
    lines.push('');
    lines.push('CUSTOM INSTRUCTIONS:');
    lines.push(instructions);
  }
  return lines.join('\n');
}

function buildResearchPrompt(payload) {
  return 'You are a pre-audit property research assistant for the CHESS energy efficiency program.\n\n' +
    'Use web search to gather publicly available information about this property BEFORE a field audit.\n\n' +
    'CUSTOMER REFERENCE (search by address only — do NOT search or reference any customer name):\n' +
    'Customer #: ' + payload.customerNumber + '\n' +
    'Address: ' + payload.address + '\n\n' +
    buildResearchSearchGuidance() + '\n\n' +
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
    '- Never include or guess a customer name\n' +
    '- Return ONLY JSON — no markdown fences, no prose outside JSON';
}

function buildResearchApiRequest(prompt) {
  var effort = getResearchEffort();
  var useThinking = effort && effort !== '';
  var toolType = getResearchSearchTool();
  var toolConfig = {
    type: toolType,
    name: 'web_search',
    max_uses: getResearchMaxSearches(),
    allowed_callers: ['direct']
  };
  if (toolType === 'web_search_20260209') {
    toolConfig.allowed_callers = ['code_execution_20260120', 'direct'];
  }
  var body = {
    model: getResearchModel(),
    max_tokens: getResearchMaxTokens(),
    temperature: useThinking ? 1 : getResearchTemperature(),
    tools: [toolConfig],
    messages: [{ role: 'user', content: prompt }]
  };
  if (useThinking) {
    body.thinking = { type: 'adaptive' };
    body.output_config = { effort: effort };
  }
  return body;
}

function initResearchSettings() {
  if (!researchSettingsWired) {
    researchSettingsWired = true;
    wireResearchSettings();
  }
  refreshResearchSettingsUI();
}

function wireResearchSettings() {
  var apiKeyInput = document.getElementById('research-api-key-input');
  var apiKeySaveBtn = document.getElementById('research-api-key-save');
  var testBtn = document.getElementById('research-test-btn');
  var testResult = document.getElementById('research-test-result');
  var settingsSaveBtn = document.getElementById('research-settings-save');
  var instructionsResetBtn = document.getElementById('research-instructions-reset');
  if (!apiKeyInput) return;

  if (apiKeySaveBtn) {
    apiKeySaveBtn.addEventListener('click', function() {
      var key = (apiKeyInput.value || '').trim();
      if (key && !key.startsWith('sk-')) {
        toast('Key should start with sk-'); return;
      }
      setResearchApiKey(key);
      apiKeyInput.value = '';
      renderResearchDetail();
      toast(key ? 'Research API key saved.' : 'Research API key cleared.');
    });
  }

  if (testBtn && testResult) {
    testBtn.addEventListener('click', function() {
      var key = (apiKeyInput.value || '').trim() || getResearchApiKey();
      if (!key) { toast('Enter a Research API key first.'); return; }
      testBtn.disabled = true;
      testBtn.textContent = '…';
      testResult.style.display = 'none';
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          temperature: 0,
          messages: [{ role: 'user', content: 'Reply with only the word: connected' }]
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var text = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text.trim() : '';
        testResult.style.display = 'block';
        testResult.style.color = text.toLowerCase().includes('connected') ? '#4caf50' : '#e03333';
        testResult.textContent = text.toLowerCase().includes('connected') ? '✓ Connected' : '✗ Unexpected response: ' + text;
      })
      .catch(function(e) {
        testResult.style.display = 'block';
        testResult.style.color = '#e03333';
        testResult.textContent = '✗ Error: ' + e.message;
      })
      .finally(function() { testBtn.disabled = false; testBtn.textContent = 'Test'; });
    });
  }

  if (settingsSaveBtn) {
    settingsSaveBtn.addEventListener('click', saveResearchSettingsFromForm);
  }

  if (instructionsResetBtn) {
    instructionsResetBtn.addEventListener('click', function() {
      if (confirm('Reset research instructions to the bundled version? Your edits will be lost.')) {
        resetResearchInstructions();
        var ta = document.getElementById('research-instructions-textarea');
        if (ta) ta.value = RESEARCH_INSTRUCTIONS_BUNDLED;
        toast('Research instructions reset.');
      }
    });
  }
}

function saveResearchSettingsFromForm() {
  var modelSelect = document.getElementById('research-model-select');
  var effortSelect = document.getElementById('research-effort-select');
  var tempSelect = document.getElementById('research-temperature-select');
  var maxTokensSelect = document.getElementById('research-max-tokens-select');
  var toolSelect = document.getElementById('research-search-tool-select');
  var strategySelect = document.getElementById('research-search-strategy-select');
  var maxSearchesSelect = document.getElementById('research-max-searches-select');
  var domainsTextarea = document.getElementById('research-domains-textarea');
  var instructionsTextarea = document.getElementById('research-instructions-textarea');

  if (modelSelect) setResearchModel(modelSelect.value);
  if (effortSelect) setResearchEffort(effortSelect.value);
  if (tempSelect) setResearchTemperature(parseFloat(tempSelect.value));
  if (maxTokensSelect) setResearchMaxTokens(parseInt(maxTokensSelect.value, 10));
  if (toolSelect) setResearchSearchTool(toolSelect.value);
  if (strategySelect) setResearchSearchStrategy(strategySelect.value);
  if (maxSearchesSelect) setResearchMaxSearches(parseInt(maxSearchesSelect.value, 10));
  if (domainsTextarea) setResearchPreferredDomains(domainsTextarea.value);

  var sources = {};
  RESEARCH_SOURCE_KEYS.forEach(function(s) {
    var el = document.getElementById(s.id);
    sources[s.key] = el ? !!el.checked : true;
  });
  setResearchSearchSources(sources);
  if (instructionsTextarea) setResearchInstructions(instructionsTextarea.value);

  renderResearchDetail();
  toast('Research settings saved.');
}

function refreshResearchSettingsUI() {
  var modelSelect = document.getElementById('research-model-select');
  var effortSelect = document.getElementById('research-effort-select');
  var tempSelect = document.getElementById('research-temperature-select');
  var maxTokensSelect = document.getElementById('research-max-tokens-select');
  var toolSelect = document.getElementById('research-search-tool-select');
  var strategySelect = document.getElementById('research-search-strategy-select');
  var maxSearchesSelect = document.getElementById('research-max-searches-select');
  var domainsTextarea = document.getElementById('research-domains-textarea');
  var instructionsTextarea = document.getElementById('research-instructions-textarea');

  if (modelSelect) {
    var model = getResearchModel();
    Array.from(modelSelect.options).forEach(function(opt) { opt.selected = (opt.value === model); });
  }
  if (effortSelect) {
    var effort = getResearchEffort();
    Array.from(effortSelect.options).forEach(function(opt) { opt.selected = (opt.value === effort); });
  }
  if (tempSelect) {
    var temp = String(getResearchTemperature());
    Array.from(tempSelect.options).forEach(function(opt) { opt.selected = (opt.value === temp); });
  }
  if (maxTokensSelect) {
    var tok = String(getResearchMaxTokens());
    Array.from(maxTokensSelect.options).forEach(function(opt) { opt.selected = (opt.value === tok); });
  }
  if (toolSelect) {
    var tool = getResearchSearchTool();
    Array.from(toolSelect.options).forEach(function(opt) { opt.selected = (opt.value === tool); });
  }
  if (strategySelect) {
    var strategy = getResearchSearchStrategy();
    Array.from(strategySelect.options).forEach(function(opt) { opt.selected = (opt.value === strategy); });
  }
  if (maxSearchesSelect) {
    var maxS = String(getResearchMaxSearches());
    Array.from(maxSearchesSelect.options).forEach(function(opt) { opt.selected = (opt.value === maxS); });
  }
  if (domainsTextarea) domainsTextarea.value = getResearchPreferredDomains();
  if (instructionsTextarea && !instructionsTextarea.dataset.dirty) {
    instructionsTextarea.value = getResearchInstructions();
  }

  var sources = getResearchSearchSources();
  RESEARCH_SOURCE_KEYS.forEach(function(s) {
    var el = document.getElementById(s.id);
    if (el) el.checked = !!sources[s.key];
  });
}

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
  var badgeWrap = document.getElementById('research-model-badge-wrap');
  var badgeEl = document.getElementById('research-model-badge');

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

  var hasKey = !!getResearchApiKey();
  if (noKeyEl) noKeyEl.style.display = hasKey ? 'none' : 'block';
  if (badgeWrap && badgeEl) {
    badgeWrap.style.display = 'block';
    var effort = getResearchEffort();
    badgeEl.textContent = getResearchModel() + (effort ? ' · effort ' + effort : '');
  }
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
  var apiKey = getResearchApiKey();
  if (!apiKey) {
    toast('Add a Research API key in Settings → Research Settings first.');
    if (typeof openSettingsPanel === 'function') openSettingsPanel();
    return;
  }

  var payload = typeof getResearchJobPayload === 'function' ? getResearchJobPayload(job) : null;
  if (!payload || !payload.address) { toast('Job needs an address for research.'); return; }

  var prompt = buildResearchPrompt(payload);

  var runBtn = document.getElementById('research-run-btn');
  var tokenEl = document.getElementById('research-token-usage');
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Researching…'; }
  if (tokenEl) tokenEl.style.display = 'none';

  var requestBody = buildResearchApiRequest(prompt);

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(requestBody)
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
        model: data.model || getResearchModel(),
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
