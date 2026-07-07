// ── RESEARCH TAB (Jobs → Research) ───────────────────────────
// Property lookup via RentCast API (county assessor / public records).

var researchTabInitialized = false;
var selectedResearchJobId = null;
var researchEditOutput = null;
var researchSettingsWired = false;

var RESEARCH_CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 };

var AR_ZIP_COUNTY = {
  '72901': 'Sebastian', '72902': 'Sebastian', '72903': 'Sebastian', '72904': 'Sebastian',
  '72905': 'Sebastian', '72906': 'Sebastian', '72908': 'Sebastian', '72913': 'Sebastian',
  '72914': 'Sebastian', '72916': 'Sebastian', '72917': 'Sebastian', '72918': 'Sebastian',
  '72919': 'Sebastian', '72936': 'Sebastian'
};

var RESEARCH_STREET_SUFFIX_RE =
  /\s+(Dr|Drive|St|Street|Ave|Avenue|Rd|Road|Ln|Lane|Ct|Court|Blvd|Boulevard|Way|Cir|Circle|Pl|Place|Trl|Trail|Hwy|Highway|Pkwy|Parkway)\.?$/i;

function getResearchRentcastApiKey() {
  try { return localStorage.getItem('aft_research_rentcast_api_key') || ''; } catch(e) { return ''; }
}
function setResearchRentcastApiKey(key) {
  try { if (key) localStorage.setItem('aft_research_rentcast_api_key', key); else localStorage.removeItem('aft_research_rentcast_api_key'); } catch(e) {}
}

function titleCaseWord(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function parseResearchStreetLine(streetPart, parsed) {
  var streetMatch = (streetPart || '').trim().match(/^(\d+)\s+(.+)$/i);
  if (!streetMatch) return;
  parsed.streetNumber = streetMatch[1];
  var rest = streetMatch[2].trim();
  var suffixMatch = rest.match(RESEARCH_STREET_SUFFIX_RE);
  if (suffixMatch) {
    parsed.streetName = rest.replace(RESEARCH_STREET_SUFFIX_RE, '').trim();
    parsed.streetSuffix = suffixMatch[1];
  } else {
    parsed.streetName = rest;
  }
}

function parseResearchAddress(address) {
  var raw = (address || '').trim().replace(/\s+/g, ' ');
  var parsed = {
    raw: raw,
    streetNumber: '',
    streetName: '',
    streetSuffix: '',
    city: '',
    state: '',
    zip: ''
  };
  if (!raw) return parsed;

  var zipMatch = raw.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) parsed.zip = zipMatch[1];

  if (raw.indexOf(',') !== -1) {
    var parts = raw.split(',').map(function(p) { return p.trim(); }).filter(Boolean);
    if (parts.length) parseResearchStreetLine(parts[0], parsed);
    if (parts.length >= 2) {
      var cityState = parts[1];
      var stateZip = parts.length >= 3 ? parts.slice(2).join(', ') : '';
      var csMatch = cityState.match(/^(.+?)\s+([A-Za-z]{2})$/);
      if (csMatch) {
        parsed.city = csMatch[1].trim();
        parsed.state = csMatch[2].toUpperCase();
      } else {
        parsed.city = cityState;
      }
      if (!parsed.state && stateZip) {
        var szMatch = stateZip.match(/^([A-Za-z]{2})\s*(\d{5})?/);
        if (szMatch) {
          parsed.state = szMatch[1].toUpperCase();
          if (!parsed.zip && szMatch[2]) parsed.zip = szMatch[2];
        }
      }
    }
  } else {
    var noComma = raw.match(/^(\d+\s+.+?)\s+([A-Za-z][A-Za-z\s.'-]+?)\s+([A-Za-z]{2})(?:\s+(\d{5})(?:-\d{4})?)?$/i);
    if (noComma) {
      parseResearchStreetLine(noComma[1], parsed);
      parsed.city = noComma[2].trim();
      parsed.state = noComma[3].toUpperCase();
      if (noComma[4]) parsed.zip = noComma[4];
    } else {
      parseResearchStreetLine(raw, parsed);
    }
  }

  if (parsed.streetName) {
    parsed.streetName = parsed.streetName.split(/\s+/).map(titleCaseWord).join(' ');
  }
  if (parsed.city) {
    parsed.city = parsed.city.split(/\s+/).map(titleCaseWord).join(' ');
  }
  if (parsed.streetSuffix) {
    parsed.streetSuffix = titleCaseWord(parsed.streetSuffix.replace(/\./g, ''));
  }
  return parsed;
}

function buildRentcastStreetLine(parsed, includeSuffix) {
  var parts = [];
  if (parsed.streetNumber) parts.push(parsed.streetNumber);
  if (parsed.streetName) parts.push(parsed.streetName);
  if (includeSuffix !== false && parsed.streetSuffix) parts.push(parsed.streetSuffix);
  return parts.join(' ').trim();
}

function buildRentcastAddressVariants(address) {
  var parsed = parseResearchAddress(address);
  var variants = [];
  var cityStateZip = '';
  if (parsed.city && parsed.state) {
    cityStateZip = parsed.city + ', ' + parsed.state + (parsed.zip ? ' ' + parsed.zip : '');
  }

  var withSuffix = buildRentcastStreetLine(parsed, true);
  var withoutSuffix = buildRentcastStreetLine(parsed, false);

  if (withSuffix && cityStateZip) variants.push(withSuffix + ', ' + cityStateZip);
  if (withoutSuffix && cityStateZip && withoutSuffix !== withSuffix) {
    variants.push(withoutSuffix + ', ' + cityStateZip);
  }
  if (parsed.raw && variants.indexOf(parsed.raw) === -1) variants.push(parsed.raw);

  var seen = {};
  return variants.filter(function(v) {
    var key = v.toLowerCase();
    if (seen[key]) return false;
    seen[key] = true;
    return !!v.trim();
  });
}

function rentcastApiFetch(url, apiKey) {
  return fetch(url, {
    headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey }
  }).then(function(res) {
    return res.json().catch(function() { return {}; }).then(function(data) {
      return { ok: res.ok, status: res.status, data: data };
    });
  });
}

function pickRentcastRecord(data, parsed) {
  var records = Array.isArray(data) ? data : (data && data.id ? [data] : []);
  if (!records.length) return null;
  if (records.length === 1) return records[0];

  var targetNum = parsed.streetNumber;
  if (!targetNum) return records[0];

  var exact = records.filter(function(r) {
    var line1 = (r.addressLine1 || r.formattedAddress || '').toLowerCase();
    return line1.indexOf(targetNum) === 0 || line1.indexOf(' ' + targetNum + ' ') !== -1;
  });
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact[0];
  return records[0];
}

function fetchRentcastProperty(address) {
  var apiKey = getResearchRentcastApiKey();
  if (!apiKey) return Promise.reject(new Error('Add RentCast API key in Settings → Research Settings.'));
  if (!address || !address.trim()) return Promise.reject(new Error('Job needs an address.'));

  var parsed = parseResearchAddress(address);
  var variants = buildRentcastAddressVariants(address);
  var attempts = [];

  function tryAddress(idx) {
    if (idx >= variants.length) return Promise.resolve({ record: null, query: variants[0] || address, attempts: attempts });
    var query = variants[idx];
    var url = 'https://api.rentcast.io/v1/properties?address=' + encodeURIComponent(query);
    return rentcastApiFetch(url, apiKey).then(function(result) {
      attempts.push({ query: query, status: result.status });
      if (result.status === 401 || result.status === 403) {
        throw new Error((result.data && result.data.message) || 'RentCast API key invalid.');
      }
      if (!result.ok && result.status !== 404) {
        throw new Error((result.data && result.data.message) || ('RentCast HTTP ' + result.status));
      }
      var record = pickRentcastRecord(result.data, parsed);
      if (record) return { record: record, query: query, attempts: attempts };
      return tryAddress(idx + 1);
    });
  }

  if (!variants.length) return Promise.reject(new Error('Could not parse address for lookup.'));
  return tryAddress(0);
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '';
  return '$' + Number(n).toLocaleString();
}

function formatDate(iso) {
  if (!iso) return '';
  return String(iso).split('T')[0];
}

function buildResearchOutputFromRentcast(record, payload, meta) {
  var findings = [];
  var notes = [];

  if (record.formattedAddress || record.addressLine1) {
    findings.push({
      topic: 'Address',
      value: record.formattedAddress || record.addressLine1,
      confidence: 'high',
      source: 'RentCast'
    });
  }
  if (record.propertyType) {
    findings.push({ topic: 'Property Type', value: record.propertyType, confidence: 'high', source: 'RentCast' });
  }
  if (record.bedrooms != null || record.bathrooms != null) {
    findings.push({
      topic: 'Beds/Baths',
      value: (record.bedrooms != null ? record.bedrooms : '?') + ' bed / ' + (record.bathrooms != null ? record.bathrooms : '?') + ' bath',
      confidence: 'high',
      source: 'RentCast'
    });
  }
  if (record.squareFootage) {
    findings.push({ topic: 'Square Footage', value: record.squareFootage + ' sq ft', confidence: 'high', source: 'RentCast' });
  }
  if (record.lotSize) {
    findings.push({ topic: 'Lot Size', value: record.lotSize + ' sq ft', confidence: 'high', source: 'RentCast' });
  }
  if (record.yearBuilt) {
    findings.push({ topic: 'Year Built', value: String(record.yearBuilt), confidence: 'high', source: 'RentCast' });
  }
  if (record.county) {
    findings.push({ topic: 'County', value: record.county + (record.countyFips ? ' (FIPS ' + record.countyFips + ')' : ''), confidence: 'high', source: 'RentCast' });
  }
  if (record.subdivision) {
    findings.push({ topic: 'Subdivision', value: record.subdivision, confidence: 'high', source: 'RentCast' });
  }
  if (record.assessorID) {
    findings.push({ topic: 'Parcel / Assessor ID', value: record.assessorID, confidence: 'high', source: 'RentCast' });
  }
  if (record.lastSalePrice || record.lastSaleDate) {
    var sale = formatMoney(record.lastSalePrice);
    if (record.lastSaleDate) sale += (sale ? ' on ' : '') + formatDate(record.lastSaleDate);
    findings.push({ topic: 'Last Sale', value: sale || formatDate(record.lastSaleDate), confidence: 'high', source: 'RentCast' });
  }
  if (record.taxAssessments && typeof record.taxAssessments === 'object') {
    var years = Object.keys(record.taxAssessments).sort().reverse();
    if (years.length) {
      var latest = record.taxAssessments[years[0]];
      if (latest && latest.value) {
        findings.push({ topic: 'Tax Assessment (' + years[0] + ')', value: formatMoney(latest.value), confidence: 'high', source: 'RentCast' });
      }
    }
  }
  if (record.features && typeof record.features === 'object') {
    var featParts = [];
    if (record.features.cooling) featParts.push('cooling: ' + (record.features.coolingType || 'yes'));
    if (record.features.heating) featParts.push('heating: ' + (record.features.heatingType || 'yes'));
    if (record.features.garage) featParts.push('garage: ' + (record.features.garageSpaces || 'yes'));
    if (record.features.fireplace) featParts.push('fireplace');
    if (record.features.floorCount) featParts.push(record.features.floorCount + ' floor(s)');
    if (featParts.length) {
      findings.push({ topic: 'Structure Features', value: featParts.join('; '), confidence: 'medium', source: 'RentCast' });
    }
  }
  if (record.latitude && record.longitude) {
    findings.push({
      topic: 'Coordinates',
      value: record.latitude.toFixed(5) + ', ' + record.longitude.toFixed(5),
      confidence: 'medium',
      source: 'RentCast'
    });
    notes.push('Verify on site — map pin from assessor record.');
  }

  var parsed = parseResearchAddress(payload.address);
  if (parsed.zip && AR_ZIP_COUNTY[parsed.zip]) {
    notes.push('County: ' + AR_ZIP_COUNTY[parsed.zip] + ' — confirm electric co-op on site.');
  }

  var summaryParts = [];
  if (record.propertyType) summaryParts.push(record.propertyType);
  if (record.squareFootage) summaryParts.push(record.squareFootage + ' sq ft');
  if (record.yearBuilt) summaryParts.push('built ' + record.yearBuilt);
  if (record.bedrooms != null) summaryParts.push(record.bedrooms + ' bed');
  var summary = summaryParts.length
    ? ('RentCast assessor record for ' + (record.formattedAddress || payload.address) + ': ' + summaryParts.join(', ') + '.')
    : ('RentCast record found for ' + (record.formattedAddress || payload.address) + '.');

  return normalizeResearchOutput({
    findings: findings,
    summary: summary,
    prefill: {
      year: record.yearBuilt ? String(record.yearBuilt) : '',
      sqft: record.squareFootage ? String(record.squareFootage) : '',
      coop: '',
      generalNotes: notes.join('\n')
    },
    meta: meta || {}
  });
}

function buildResearchNotFoundOutput(payload, query, attempts) {
  var parsed = parseResearchAddress(payload.address);
  var findings = [{
    topic: 'Property Record',
    value: 'No assessor record found in RentCast for this address. Tried: ' + (attempts || []).map(function(a) { return a.query; }).join(' | '),
    confidence: 'low',
    source: 'RentCast'
  }];
  if (parsed.streetNumber && parsed.streetName) {
    findings.push({
      topic: 'Tip',
      value: 'Check address spelling on Schedule tab. RentCast needs street #, name, city, state, zip (e.g. "11006 Maple Park Dr, Fort Smith, AR 72916").',
      confidence: 'low',
      source: 'RentCast'
    });
  }
  return normalizeResearchOutput({
    findings: findings,
    summary: 'RentCast returned no property record for ' + payload.address + '. Verify the address format and try again, or enter sq ft / year built manually.',
    prefill: { year: '', sqft: '', coop: '', generalNotes: 'No RentCast record — verify year built and sq ft on site.' },
    meta: { rentcast: false, query: query, attempts: attempts || [] }
  });
}

function initResearchSettings() {
  if (!researchSettingsWired) {
    researchSettingsWired = true;
    wireResearchSettings();
  }
  refreshResearchSettingsUI();
}

function wireResearchSettings() {
  var keyInput = document.getElementById('research-rentcast-key-input');
  var keySaveBtn = document.getElementById('research-rentcast-key-save');
  var testBtn = document.getElementById('research-rentcast-test-btn');
  var testResult = document.getElementById('research-rentcast-test-result');
  if (!keyInput) return;

  if (keySaveBtn) {
    keySaveBtn.addEventListener('click', function() {
      var key = (keyInput.value || '').trim();
      setResearchRentcastApiKey(key);
      keyInput.value = '';
      renderResearchDetail();
      toast(key ? 'RentCast API key saved.' : 'RentCast API key cleared.');
    });
  }

  if (testBtn && testResult) {
    testBtn.addEventListener('click', function() {
      var key = (keyInput.value || '').trim() || getResearchRentcastApiKey();
      if (!key) { toast('Enter a RentCast API key first.'); return; }
      testBtn.disabled = true;
      testBtn.textContent = '…';
      testResult.style.display = 'none';
      var testAddr = '11006 Maple Park Dr, Fort Smith, AR 72916';
      var url = 'https://api.rentcast.io/v1/properties?address=' + encodeURIComponent(testAddr);
      rentcastApiFetch(url, key)
      .then(function(result) {
        testResult.style.display = 'block';
        if (result.status === 401 || result.status === 403) {
          testResult.style.color = '#e03333';
          testResult.textContent = '✗ Invalid API key';
          return;
        }
        var record = pickRentcastRecord(result.data, parseResearchAddress(testAddr));
        if (record && record.squareFootage) {
          testResult.style.color = '#4caf50';
          testResult.textContent = '✓ Connected — test address: ' + record.squareFootage + ' sq ft, built ' + (record.yearBuilt || '?');
        } else if (record) {
          testResult.style.color = '#4caf50';
          testResult.textContent = '✓ Connected — record found (check sq ft on full lookup)';
        } else {
          testResult.style.color = '#e8a735';
          testResult.textContent = '✓ Key works but no record for test address — try your job address';
        }
      })
      .catch(function(e) {
        testResult.style.display = 'block';
        testResult.style.color = '#e03333';
        testResult.textContent = '✗ Error: ' + e.message;
      })
      .finally(function() { testBtn.disabled = false; testBtn.textContent = 'Test'; });
    });
  }
}

function refreshResearchSettingsUI() {
  var keyInput = document.getElementById('research-rentcast-key-input');
  if (keyInput) keyInput.placeholder = getResearchRentcastApiKey() ? 'Key saved (enter new to replace)' : 'Paste RentCast API key';
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
  return {
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
  var hasResearch = !!(job.researchOutput && job.researchOutput.findings && job.researchOutput.findings.length);
  var statusBadge = typeof renderScheduleStatusBadge === 'function' ? renderScheduleStatusBadge(job.status) : '';
  var displayName = typeof formatScheduleJobDisplayName === 'function' ? formatScheduleJobDisplayName(job) : ('#' + job.customerNumber);
  return '<div class="research-queue-row week-audit-row' + (selected ? ' is-current' : '') + '" data-id="' + escapeHtmlResearch(job.id) + '"><div class="week-audit-info"><div class="week-audit-name research-queue-name">' + escapeHtmlResearch(displayName) + '</div><div class="research-queue-address">' + escapeHtmlResearch(job.address || '—') + '</div><div class="week-audit-meta">' + statusBadge + (hasResearch ? '<span class="research-has-results">✓ Researched</span>' : '<span class="research-no-results">Not researched</span>') + '</div></div></div>';
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
      ? (typeof formatScheduleJobDisplayLine === 'function' ? formatScheduleJobDisplayLine(job) : ('#' + job.customerNumber + ' — ' + (job.address || 'No address')))
      : 'Select a job from the queue below';
  }
  if (metaEl) {
    metaEl.textContent = job ? 'Looks up county assessor data via RentCast — address only, no customer name sent.' : '';
  }

  var hasKey = !!getResearchRentcastApiKey();
  if (noKeyEl) noKeyEl.style.display = hasKey ? 'none' : 'block';
  if (badgeWrap && badgeEl) {
    badgeWrap.style.display = hasKey ? 'block' : 'none';
    badgeEl.textContent = hasKey ? 'RentCast property lookup' : '';
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
  if (tokenEl) {
    if (output.meta && output.meta.rentcastQuery) {
      tokenEl.textContent = 'RentCast query: ' + output.meta.rentcastQuery;
      tokenEl.style.display = 'block';
    } else {
      tokenEl.style.display = 'none';
    }
  }
  if (!findingsEl) return;
  var sorted = sortResearchFindings(output.findings);
  findingsEl.innerHTML = sorted.map(function(f, i) {
    var conf = (f.confidence || 'medium').toLowerCase();
    return '<div class="research-finding-row" data-idx="' + i + '"><div class="research-finding-top"><span class="research-confidence conf-' + escapeHtmlResearch(conf) + '">' + escapeHtmlResearch(conf) + '</span><span class="research-finding-topic">' + escapeHtmlResearch(f.topic || 'Finding') + '</span><button type="button" class="btn-xs research-edit-finding-btn" data-idx="' + i + '">Edit</button></div><div class="research-finding-value" data-idx="' + i + '">' + escapeHtmlResearch(f.value || '') + '</div>' + (f.source ? '<div class="research-finding-source">' + escapeHtmlResearch(f.source) + '</div>' : '') + '</div>';
  }).join('');
  findingsEl.querySelectorAll('.research-edit-finding-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      editResearchFinding(parseInt(btn.dataset.idx, 10));
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
  researchEditOutput = collectResearchEditsFromForm();
  if (typeof updateScheduleJob === 'function') {
    updateScheduleJob(job.id, { researchOutput: researchEditOutput });
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
  if (!getResearchRentcastApiKey()) {
    toast('Add RentCast API key in Settings → Research Settings.');
    if (typeof openSettingsPanel === 'function') openSettingsPanel();
    return;
  }

  var payload = typeof getResearchJobPayload === 'function' ? getResearchJobPayload(job) : null;
  if (!payload || !payload.address) { toast('Job needs an address for research.'); return; }

  var runBtn = document.getElementById('research-run-btn');
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Looking up property…'; }

  fetchRentcastProperty(payload.address)
  .then(function(result) {
    var output;
    if (result.record) {
      output = buildResearchOutputFromRentcast(result.record, payload, {
        rentcast: true,
        rentcastQuery: result.query,
        attempts: result.attempts
      });
      toast('Property record found — ' + (result.record.squareFootage ? result.record.squareFootage + ' sq ft' : 'review results'));
    } else {
      output = buildResearchNotFoundOutput(payload, result.query, result.attempts);
      toast('No RentCast record — check address format on Schedule tab');
    }
    output.researchedAt = new Date().toISOString();
    researchEditOutput = output;
    if (typeof updateScheduleJob === 'function') {
      updateScheduleJob(job.id, { researchOutput: output });
      refreshScheduleListIfVisible();
    }
    renderResearchQueue();
    renderResearchDetail();
  })
  .catch(function(err) {
    toast('Research error: ' + (err.message || String(err)));
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
