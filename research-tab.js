// ── RESEARCH HELPERS (used by Jobs + Audit) ──────────────────
// Format research notes from property fields on schedule jobs.

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

function buildResearchOutputFromJob(job) {
  if (!job) return null;
  return buildResearchOutputFromPrefill({
    propertyType: job.propertyType || '',
    year: job.year || '',
    sqft: job.sqft || '',
    coop: job.coop || '',
    generalNotes: ''
  });
}

function openZillowLookupForAddress(address) {
  var addr = (address || '').trim();
  if (!addr) {
    toast('Enter an address first.');
    return;
  }
  var url = 'https://www.google.com/search?q=' + encodeURIComponent(addr + ' Zillow.com');
  window.open(url, '_blank', 'noopener,noreferrer');
}
