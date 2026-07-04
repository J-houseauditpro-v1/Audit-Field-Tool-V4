# AUDIT FIELD TOOL (AFT) — TECHNICAL HANDOFF DOCUMENT

For migration/import tool design. Generated from live codebase inspection.

- **Repository:** https://github.com/J-houseauditpro-v1/Audit-Field-Tool-V4
- **Deployed PWA:** https://j-houseauditpro-v1.github.io/Audit-Field-Tool-V4/
- **Architecture:** Vanilla HTML/CSS/JS Progressive Web App (PWA). No React, no backend server. All data is client-side (localStorage + IndexedDB). Claude API and JotForm API are called directly from the browser.

**NOTE ON "CURRENT" CODE STATE:**
- GitHub `main` branch (deployed to Pages): includes tab bar refactor, delete-audit fix, service worker v53. Does NOT yet include full backup/restore (PR #3 pending merge).
- Branch `cursor/full-backup-restore-4b41` (PR #3): adds Full Backup, Weekly Backup, Restore from Backup, service worker v54. This document describes V4 schema and behavior including PR #3 features where they exist in code, and notes deployment gaps.

---

## 1. VERSION HISTORY

**IMPORTANT:** V1 and V2 are NOT represented in this repository. There is no V1/V2 source code, schema definition, or migration logic beyond UI copy and import heuristics. Everything below about pre-repo versions is inferred from comments, import functions, and user-facing text — not from actual V1/V2 code in git.

### AFT V1 (pre-repo, inferred)

- **Status:** Fully gone from this codebase. No code, no schema file, no import path labeled V1.
- **Likely characteristics (inferred only):** Early field tool, possibly plain text / manual notes. Unknown storage format. Not recoverable from this repo.

### AFT V2 / V3 (pre-repo, partially recoverable via JSON export)

- **Status:** Not in this repo. May still exist as:
  - Old PWA installs on devices (if user never cleared site data)
  - Exported JSON files named/labeled as aft_saved exports
  - NOT accessible via current GitHub Pages deployment unless user manually imports JSON

**Storage format** (from `importV2V3Audits()` in script.js and UI copy in index.html):
- Primary key: localStorage `aft_saved` — JSON array of audit record objects
- Current session: localStorage `aft_current` — in-progress audit state
- Photos: stored in old app's IndexedDB (NOT included in JSON export). Import explicitly sets `photosNotImported:true` when photo metadata exists in JSON but image bytes cannot transfer.
- Photo format in old app: almost certainly base64 JPEG data URLs in IndexedDB (same pattern as V3 rewrite in this repo), but unverified for V2 specifically.

**Import path in V4:** Audits tab → "Import V2/V3 Audits" → `importV2V3Audits(file)` in script.js
- Accepts: JSON file that is either a raw array OR wrapped as `{ saved: [...] }`, `{ audits: [...] }`, or `{ aft_saved: [...] }`
- Dedupes by `rec.id` (skips if id already exists)
- Normalizes: `rec.voiceDump = rec.voiceDump || rec.dump`; `rec.photos = rec.photos || []`; `rec.source = 'V2V3Import'`
- Does NOT import photo image bytes

### "Pre-bundle legacy" 3-file export system (predates weekly bundles)

- **Status:** Partially supported in V4 export paths; import UI is JSON-only and incomplete.

Described in script.js comments (`initLegacyImport`, `exportSavedPhotoPDF`, `generateTCPDFFromRecord`):
- Format: JSON file + separate Photo PDF + separate T&C PDF per audit
- JSON had customer + voiceDump; photos/signatures were NOT in structured photo store
- V4 stores attached PDFs in IndexedDB `legacyFiles` object store as base64 data URLs (`photoPdfDataUrl`, `tcPdfDataUrl`) keyed by `auditId`
- V4 import UI ("Import Legacy Audit") ONLY accepts JSON — does NOT accept the companion PDFs. Sets `legacyPhotoPdf:false`, `legacyTcPdf:false` always. PDF passthrough export only works if PDFs were previously stored via `saveLegacyFiles()` (no UI for that today).

### AFT V3 rewrite (first commit in repo: a63fa1f "Add files via upload")

- **Status:** Superseded. Code header still says "AUDIT FIELD TOOL v3 — COMPLETE REWRITE" in script.js line 2.

**What it was:**
- Single-page PWA, same general tab model (voice/photos/audits/export/T&C)
- IndexedDB database: `AuditFieldToolDB` version 2
  - Object store `photos`: keyPath `id`, stores full photo records with dataUrl
  - Object store `legacyFiles`: keyPath `auditId`, stores PDF data URLs
- Saved audits: localStorage key `aft_saved` (JSON array)
- Current audit: localStorage key `aft_current` (JSON object matching S state)
- NO interpret tab, NO customers tab, NO contacts/notes
- Weekly "JSON-only" lean export for external "Jarvis Audit Tool" interpreter (`bundleType: 'json-only'`) — removed in PR #3 branch, replaced by full backup

**Photo storage in V3 rewrite:**
- IndexedDB `photos` store record shape: `{ id, auditId, dataUrl, note, category, ts, markupStrokes }`
- `dataUrl`: base64 JPEG data URL (after `compressImage()` — max width 1200px, quality 0.75)
- NOT raw Blobs (Safari/iOS reliability)

### AFT V4 (current — repo f526583 onward)

- **Status:** Live on GitHub Pages from `main`. Active development branch adds full backup.

**Changes from V3 rewrite baseline:**
- Added interpret-tab.js (Claude API interpreter → JotForm field mapping)
- Added customers-tab.js (Google Sheets customer list)
- Added contacts-tab.js + notes-tab.js + idb-contacts-notes.js (Settings → Contacts/Notes)
- IndexedDB upgraded to `AuditFieldToolDB` version 3: added `audits` object store
- Saved audits migrated from localStorage `aft_saved` to IndexedDB `audits` store (with one-time migration on startup)
- Tab bar reorganized: settings gear in header, 7 tabs (More tab removed from tab row)
- Full-fidelity backup/restore (PR #3, pending merge to main)
- Service worker cache: aft-v53 on main, aft-v54 on backup branch

**Storage format V4 (current):**
- Current in-progress audit: localStorage `aft_current` → JSON serialization of global S object
- Saved audit list: in-memory `_savedAudits` array synced to IndexedDB `audits` store (keyPath `id`)
- Photo bytes: IndexedDB `photos` store (keyPath `id`), base64 JPEG data URLs
- Legacy PDF bytes: IndexedDB `legacyFiles` store (keyPath `auditId`), base64 PDF data URLs
- Contacts: separate IndexedDB database `AFTContacts`, store `contacts`, keyPath `id`
- Notes: separate IndexedDB database `AFTNotes`, store `notes`, keyPath `id`
- Settings: various localStorage keys (see section 2)

**Versions still installed/accessible:**
- V4 PWA: yes, at GitHub Pages URL; persists per-device in browser storage
- V3 rewrite PWA: possibly on devices that installed before V4 upgrade; same origin would upgrade in place; old localStorage aft_saved migrates once if IDB audits store empty
- V2/V3 old apps: only if still installed as separate bookmarks/origins (unknown URL); data recoverable only via exported JSON files
- V1: assumed gone

---

## 2. CURRENT AFT V4 DATA SCHEMA

### 2A. RUNTIME STATE OBJECT (global `S` in script.js)

This is the "current audit" being edited. Persisted to localStorage as `aft_current`.

```javascript
var S = {
  name: '',           // customer name (UI: #f-name)
  address: '',        // (UI: #f-address)
  date: '',           // ISO date from <input type="date"> (UI: #f-date)
  year: '',           // year built (UI: #f-year)
  sqft: '',           // conditioned sq ft (UI: #f-sqft)
  coop: '',           // co-op name from dropdown (UI: #f-coop)
  dump: '',           // GENERAL AUDIT NOTES ("voice dump"). NOT per-photo.
  photos: [],         // photo METADATA objects. Image bytes NOT stored here.
  auditId: null,      // links to saved audit record id when saved/loaded
  tcSignature: null   // PNG data URL of customer signature canvas
};
```

Field mapping from S to saved record customer object (`persistAuditRecord` in script.js):
- S.name → customer.name
- S.address → customer.address
- S.date → customer.date
- S.year → customer.yearBuilt
- S.sqft → customer.sqFt
- S.coop → customer.coop
- S.dump → voiceDump

### 2B. PHOTO METADATA (in S.photos[] AND audit.photos[])

```javascript
{
  id: Number,           // Date.now()*1000 + random — unique photo id, also IDB key
  auditId: String,      // parent audit id e.g. "audit-1717334400000"
  note: String,         // per-photo note text
  category: String,     // one of PHOTO_CATEGORIES[].id values
  ts: String,           // ISO timestamp when photo captured
  markupStrokes: Array  // optional red pen markup overlay
}
```

PHOTO_CATEGORIES ids: `hvac`, `other_hvac`, `condenser`, `duct`, `air`, `water`, `insulation`, `attic_measures`, `thermostat`, `lights`, `exterior`, `general`

markupStrokes stroke object:
```javascript
{ color: '#e03333', width: 4, points: [{ x: 0.0-1.0, y: 0.0-1.0 }, ...] }
```

### 2C. INDEXEDDB PHOTO RECORD (AuditFieldToolDB → photos store)

- Database: AuditFieldToolDB (version 3)
- Object store: photos
- Key path: id (Number)

```javascript
{
  id: Number,
  auditId: String,
  dataUrl: String,      // base64 JPEG — "data:image/jpeg;base64,..."
  note: String,
  category: String,
  ts: String,
  markupStrokes: Array
}
```

Relationship: audit.photos[] holds metadata only. Image bytes live ONLY in IndexedDB photos store keyed by photo.id.

### 2D. SAVED AUDIT RECORD (IndexedDB audits store + _savedAudits)

```javascript
{
  id: String,
  customer: {
    name: String,
    address: String,
    date: String,
    yearBuilt: String,    // NOTE: S.year in runtime
    sqFt: String,         // NOTE: S.sqft in runtime
    coop: String
  },
  voiceDump: String,
  photos: Array,          // metadata only, not image bytes
  tcSignature: String|null,
  savedAt: String,
  source: String,

  // Optional:
  interpretedOutput: {
    fields: [{ page, section, field, value }],
    clarifications: [{ question, fieldPage, fieldSection, fieldName, options }],
    notes: String,
    interpretMeta: { model, input_tokens, output_tokens, total_tokens, interpretedAt }
  },
  legacyImport: Boolean,
  legacyPhotoPdf: Boolean,
  legacyTcPdf: Boolean,
  photosNotImported: Boolean
}
```

**CRITICAL:** `persistAuditRecord()` rebuilds the entire record WITHOUT copying `interpretedOutput` from existing record. Autosave after interpretation WIPES interpretedOutput.

### 2E. INDEXEDDB legacyFiles store

- Key path: auditId

```javascript
{ auditId: String, photoPdfDataUrl: String|null, tcPdfDataUrl: String|null }
```

### 2F. FULL BACKUP ZIP SCHEMA (PR #3 branch)

manifest.json: `bundleType` = "full-backup" | "weekly-backup", plus auditCount, photoCount, exportedAt, audits[] with file paths.

- audits/{id}.json — full audit record
- photos/{id}.json — { id, auditId, dataUrl, note, category, ts, markupStrokes }
- legacy/{id}.json — { auditId, photoPdfDataUrl, tcPdfDataUrl }

### 2G. LEAN EXPORT SCHEMA (buildLeanAudit — per-row JSON export)

Text-only photo notes, no images, no signatures, no interpreted output.

### 2H. localStorage KEYS

- aft_current, aft_auditor_name
- aft_claude_api_key, aft_interpret_model, aft_interpret_max_tokens, aft_interpret_effort, aft_knowledge_doc
- aft_jotform_form_id, aft_jotform_api_key, aft_jotform_field_map
- aft_gs_sheet_id, aft_gs_range, aft_gs_api_key, aft_gs_col_map, aft_customers_cache
- aft_saved (deprecated, migrated to IDB)

### 2I. CONTACTS (AFTContacts IDB — not in audit backup)

```javascript
{ id, name, phone, email, relationship_type, how_met, trust_level, business_potential, tags, notes, created_at, updated_at }
```

### 2J. NOTES (AFTNotes IDB — not in audit backup)

```javascript
{ id, title, content, tags, is_task, task_complete, created_at, updated_at }
```

### 2K. NOTES vs PHOTO NOTES vs VOICE DUMP

1. **voiceDump / S.dump** — General audit notes on Audit Data tab. Sent to Claude Interpret.
2. **photo.note** — Per-photo caption on Photos tab. NOT sent to Interpret.
3. **Settings → Notes** — Personal notes unrelated to audits.

---

## 3. THE INTERPRET TAB

**File:** interpret-tab.js

### Input

ONLY reads from global `S` object:
- Required: `aft_claude_api_key`, non-empty `S.dump`
- Optional: S.name, S.address, S.date, S.year, S.sqft, S.coop
- NOT sent: photo images, photo notes, T&C signature

Could accept other formats only if code populates S first, or prompt is rebuilt.

### System prompt / logic

1. **INTERPRET_KNOWLEDGE_DOC_BUNDLED** (~758 lines in interpret-tab.js) — JotForm field reference, inference rules, learned rules. Overridable via localStorage `aft_knowledge_doc`.

2. **Runtime prompt** from `runInterpret()` — customer info + RAW AUDIT NOTES (S.dump) + JSON output schema.

API: POST https://api.anthropic.com/v1/messages

Models: claude-sonnet-5 (default), claude-sonnet-4-6, claude-haiku-4-5-20251001

### Output

```javascript
{
  fields: [{ page, section, field, value }],
  clarifications: [{ question, fieldPage, fieldSection, fieldName, options: [{ label, text, value }] }],
  notes: String
}
```

Saved via `saveInterpretation()` to `audit.interpretedOutput`. Submittable to JotForm via `runJotFormSubmit()`.

---

## 4. WHAT EXISTS FOR IMPORT/EXPORT TODAY

### Export

- **Full Backup** (PR #3): all audits + photos + legacy PDFs → zip
- **Weekly Backup** (PR #3): same, one week
- **Weekly T&C + Photos**: PDF zip for scheduler
- **Per-audit row:** lean JSON, photo PDF, T&C PDF
- **Audits tab 📷:** photo images zip
- **Dead code (no UI):** exportCurrent, exportAll, exportHTML, exportPhotoPDF
- **JotForm submit:** external API, not file export

### Import

- **Restore from Backup** (PR #3): full-backup or weekly-backup zip
- **Import V2/V3:** JSON metadata only, no photos
- **Import Legacy:** JSON only, no PDFs
- **Customers:** Google Sheets fetch (not audit import)
- **No:** CSV, manual paste, PDF extraction, contacts/notes import

---

## 5. GAPS

1. **Plain text from Notes app** — no paste/import parser; manual entry only
2. **V2/V3 JSON** — metadata only; no photo bytes; skips duplicates instead of upsert
3. **Legacy 3-file (JSON+PDFs)** — import UI JSON-only; PDFs not wired
4. **PDF/image extraction** — does not exist
5. **Interpret on migrated data** — no bulk interpret; photo notes not in prompt
6. **Full backup** — V4-to-V4 only; rejects V2/V3 JSON; no contacts/notes/settings
7. **persistAuditRecord bug** — wipes interpretedOutput on autosave
8. **No server/desktop migration utility** — must produce browser-compatible files

### Recommended migration tool capabilities (not implemented)

1. Unified import wizard (backup zip, V2/V3 JSON + photo sidecar, legacy triple-file, manual bundle)
2. Normalization layer → canonical V4 audit + IDB photo records
3. Upsert by id with overwrite option
4. Post-import validation report
5. Fix persistAuditRecord to preserve interpretedOutput
6. Optionally include photoNotes in Interpret prompt

---

## FILE REFERENCE

| File | Purpose |
|------|---------|
| index.html | All tab UI |
| script.js | Core state, IDB, audits, photos, export, import, T&C |
| interpret-tab.js | Claude interpreter, JotForm, knowledge doc |
| customers-tab.js | Google Sheets customers |
| contacts-tab.js / notes-tab.js | Contacts/Notes UI |
| idb-contacts-notes.js | Contacts/Notes IDB |
| style.css | Styling |
| sw.js | Service worker (CACHE = aft-v54 on backup branch) |
| manifest.json | PWA manifest |

**Key functions:** initPhotoDB, savePhotoToDB, getPhotoFromDB, getSaved, setSaved, persistAuditRecord, loadAudit, importV2V3Audits, restoreFromBackupFile, exportBackupBundle, runInterpret, saveInterpretation, buildLeanAudit, exportWeekSchedulerBundle

---

*End of handoff document.*
