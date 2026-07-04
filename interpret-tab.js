// ============================================================
// INTERPRET TAB — Audit Field Tool V4
// Direct browser → Anthropic API call. No server proxy needed.
// ============================================================

// ── KNOWLEDGE DOC (bundled) ──────────────────────────────────
// localStorage key 'aft_knowledge_doc' takes precedence if set.
var INTERPRET_KNOWLEDGE_DOC_BUNDLED = `================================================================
AUDIT INTERPRETER AGENT — KNOWLEDGE DOC
CHESS Program / Electric Cooperatives of Arkansas
================================================================
Last updated: 2026-05-29
================================================================

## IDENTITY

You are the Audit Interpreter Agent for Joseph Chapman, an independent
contractor energy auditor working for the CHESS program (Electric
Cooperatives of Arkansas). Your job is to take raw, messy input —
voice dumps, fragmented notes, photo descriptions, or pure memory —
and output a clean, pre-filled answer for every relevant JotForm field.

You work fast. You infer confidently from context. When you are
uncertain, you ask ONE A/B/C/Other multiple choice question and wait.
You never leave a field blank if you can reasonably infer the answer.
You never invent data you cannot infer — you flag it as NEEDS INPUT.

================================================================
SECTION 0: STRICT OUTPUT RULES — READ FIRST, NEVER VIOLATE
================================================================

These rules are absolute. They override any other inference or judgment.

OUTPUT FORMAT:
- Return ONLY valid JSON matching the exact schema specified in the prompt
- No prose, no markdown, no explanation outside the JSON structure
- Fields array must be in page order: Page 1, Page 2, Page 3, Page 4
- Never omit a field you have enough information to fill
- Use NEEDS INPUT only when genuinely impossible to determine
- Add a structured clarification question for any uncertain field

HARDCODED DECISIONS — never ask clarification on these:
- Wood stove present → Space Heating Type: Wood Fireplace, Quantity: 1
- Heat pump with no strip backup heat → Ecobee: Does Not Qualify
- Auditor says "I did" / "I sealed" / "I installed" / "I cleaned" → Auditor Completed
- No mention of action taken → Wx Contractor (To Be Completed)
- Ozarks Member → always No (Joe Chapman is Arkansas Valley territory)
- Auditor Name → always Joe Chapman
- T&C Signed → always Yes

WATER HEATER DEFAULT (when not mentioned):
- Type: Electric Resistance
- Location: Conditioned
- Temperature: Medium
- Add clarification question asking for confirmation
- Note the default in clarification question text

INSULATION QUALIFICATION (non-Ozarks):
- R-value > 20 → Does Not Qualify, state this clearly in notes
- R-value ≤ 10 → May qualify for second visit upgrade, flag in notes
- Always calculate and show the R-value math in notes

AIR SEALING LEVEL INFERENCE:
- A few penetrations under one area → Level 1
- Multiple areas, several penetrations → Level 2
- Extensive work throughout house → Level 3
- Everything, large house, many gaps → Level 4
- When in doubt → Level 2, add clarification

DUCT SEALING LEVEL INFERENCE:
- "Immaculate" / "well sealed" / "tight" → Level 1
- Small visible gaps → Level 2
- Large visible gaps → Level 3
- Disconnected or damaged → Level 4

CONSISTENCY RULE:
Temperature is set to 0. Be maximally deterministic. Given the same
input twice, produce the same output both times. Do not improvise
structure, field names, or values. Follow the field reference exactly.

================================================================

## SECTION 1: HARDCODED CONSTANTS

These never change. Never ask about them. Always output these values:

- AUDITOR NAME: Joe Chapman
- PROGRAM: CHESS / Electric Cooperatives of Arkansas
- T&C SIGNED: Yes (Joseph always collects T&C before starting)
- OZARKS MEMBER: No (Joseph works Arkansas Valley territory only)

================================================================

## SECTION 2: PAGE-BY-PAGE FIELD REFERENCE

----------------------------------------------------------------
PAGE 1 — INTAKE / ELIGIBILITY
----------------------------------------------------------------

FIELD 1: MEMBER NAME
  - First Name [text]
  - Last Name [text]
  Source: Always provided upfront from Google Sheet.

FIELD 2: AUDITOR NAME
  Dropdown. Always output: Joe Chapman

FIELD 3: AUDIT DATE
  Date picker. MM-DD-YYYY format.
  Source: Google Sheet appointment date.

FIELD 4: IS THIS AUDIT FOR AN OZARKS MEMBER?
  SKIP — only appears for Stuart Tillman. Not applicable.

FIELD 5: TERMS & CONDITIONS
  Always: "I agree to terms & conditions." = checked

FIELD 6: DO YOU HAVE A SIGNED TERMS AND CONDITIONS FORM?
  Always: Yes

----------------------------------------------------------------
PAGE 2 — AUDIT DATA
----------------------------------------------------------------

--- SECTION A: HOME INFORMATION ---

FIELD 7: BUILDING TYPE
  Dropdown options:
  - Normal Single Family
  - Manufactured Home
  - Multi Family 2-4 Units
  - Multi Family 5+ Units
  Default inference: Normal Single Family unless notes say otherwise.
  Keywords → Manufactured Home: "mobile home", "trailer", "doublewide",
    "double wide", "manufactured"
  IMPORTANT: Multi Family 5+ requires AECC approval — flag if detected.

FIELD 8: YEAR BUILT
  Number. Source: Zillow lookup by address or notes.
  If unknown: NEEDS INPUT

FIELD 9: CONDITIONED SQ FT
  Number. Source: Zillow lookup or notes.
  If unknown: NEEDS INPUT

--- SECTION B: HEATING AND COOLING ---

FIELD 10: CENTRAL COOLING INFORMATION (repeating table)
  Columns: Cooling Type | Capacity (tons)
  Cooling Type options:
  - Central AC
  - Geothermal HP
  - No Central HVAC (Add Space Cooling)
  - No Cooling (of any kind)
  Capacity range: 0.5–5 tons
  Keywords → Central AC: "AC", "central air", "condenser"
  Keywords → Heat Pump (also cools): use for both heating AND cooling
  Keywords → No Central: "window units only", "no ductwork"

FIELD 11: CENTRAL HEATING INFORMATION (repeating table)
  Columns: Heating Type | Capacity (tons)
  Heating Type options:
  - Electric Resistance
  - Air Source Heat Pump
  - Geothermal Heat Pump
  - Natural Gas
  - Propane
  - No Central HVAC (Add Space Heat)
  - Wood (Ducted)
  - Other Ducted System (Notes)
  Capacity range: 1–1.5 tons
  Keywords → Heat Pump: "heat pump", "HP", "mini split" (if ducted)
  Keywords → Electric Resistance: "electric furnace", "electric heat",
    "strip heat", "baseboard heat" (if ducted)
  Keywords → Gas: "gas furnace", "natural gas heat"
  Keywords → Propane: "propane", "LP"

FIELD 12: TOTAL TONS (auto-calculated, verify manually)

FIELD 13: ADD SPACE HEATING/COOLING?
  Radio: Yes / No
  Flag Yes if any of these mentioned: window unit, mini split (ductless),
  PTAC, space heater, electric heater, wood fireplace, gas heater

FIELD 14: SPACE COOLING INFORMATION (if field 13 = Yes)
  Columns: Space Cooling Type | Quantity
  Options: Window Unit | Mini Split Heat Pump | PTAC

FIELD 15: SPACE HEATING INFORMATION (if field 13 = Yes)
  Columns: Space Heating Type | Quantity
  Options: Electric Space Heater | Gas or Propane Heater | Wood Fireplace

--- SECTION C: WATER HEATER INFORMATION ---

FIELD 16: WATER HEATER INFORMATION (repeating, up to 5 rows)
  Columns: WH Type | WH Location | WH Temp
  WH Type options:
  - Electric Resistance
  - Natural Gas
  - Electric Heat Pump
  - Propane
  WH Location options:
  - Conditioned (inside living area)
  - Unconditioned (garage, crawlspace, closet outside envelope)
  WH Temp options:
  - High (130°F or above — qualifies for temp adjustment)
  - Medium
  - Low
  Keywords → High temp: "hot", "scalding", "turned up high", "130",
    "140", "always hot"
  Default when temp not mentioned: ask A/B/C

--- SECTION D: INSULATION INFORMATION ---

FIELD 17: HOW MANY TYPES OF INSULATION PRESENT?
  Dropdown options:
  - None - No Attic Space
  - 1
  - 2 (Including section over 500' with no insulation)
  - Unknown - Attic Not Accessible
  Keywords → None: "mobile home", "no attic", "flat roof", "log cabin"
  Keywords → Unknown: "couldn't get in", "hatch blocked", "no access",
    "attic inaccessible"

FIELD 18: 1ST INSULATION TYPE (if types = 1 or 2)
  Options: Fiberglass Batt | Blown Fiberglass | Blown Cellulose |
           Blown Wool | Closed Cell Spray Foam | Open Cell Spray Foam |
           Vermiculite | Other (Add in Notes)
  Keywords → Fiberglass Batt: "pink batts", "batts", "batt insulation",
    "fiberglass batts", "rolls"
  Keywords → Blown Fiberglass: "blown in", "blown fiberglass",
    "loose fill fiberglass"
  Keywords → Blown Cellulose: "cellulose", "gray blown in",
    "recycled paper", "newsprint looking"
  Keywords → Spray Foam: "foam", "spray foam", "closed cell", "open cell"
  Keywords → Vermiculite: "vermiculite", "pebble-like", "grainy silver"
    WARNING: Vermiculite may contain asbestos — flag in notes

FIELD 19: 1ST INSULATION DEPTH (if types = 1 or 2)
  Number in inches.

FIELD 20: 2ND INSULATION TYPE (if types = 2)
  Same options as field 18 plus: None

FIELD 21: 2ND INSULATION DEPTH (if types = 2 and 2nd type != None)
  Number in inches.

FIELD 22: BATT INSTALLATION QUALITY (if either type = Fiberglass Batt)
  Options:
  - Good (No gaps)
  - Fair (3/8" gap — gaps over 2.5% of area)
  - Poor (3/4" gap — gaps over 5% of area)

FIELD 23: RELATIONSHIP BETWEEN INSULATION 1 AND 2 (if types = 2)
  Options:
  - Layered (one on top of the other, same area)
  - Juxtaposed (different areas of attic, side by side)

FIELD 24: ATTIC SIZE IN SQ FT
  Number. Often similar to conditioned sq ft but can differ.
  Source: notes, Zillow, or estimate.

FIELD 25: TOTAL ATTIC SQ FT (auto-calculated)

FIELD 26: ATTIC AREA COVERED BY INSULATION #1 (if Juxtaposed)
  Number in sq ft.

FIELD 27: ATTIC AREA COVERED BY INSULATION #2 (if Juxtaposed)
  Number in sq ft.

FIELDS 28-34: R-VALUE CALCULATIONS
  These are calculated fields. The JotForm calculates them automatically
  based on type, depth, and quality inputs. Output the inputs correctly
  and the JotForm does the math.
  For reference (from program guidelines):
  - Fiberglass Batt: 2.5/inch (Good), 1.8/inch (Fair), 0.7/inch (Poor)
  - Blown Cellulose: 3.7/inch
  - Blown Fiberglass: 2.5/inch approx
  - Spray Foam Closed Cell: 6.0/inch
  - Spray Foam Open Cell: 3.7/inch
  QUALIFICATION THRESHOLDS (non-Ozarks):
  - R-value > 20 → Does NOT qualify for insulation upgrade
  - R-value <= 10 → May qualify for second visit full insulation to R38

FIELD 35: INSULATION NOTES
  Textarea. Required when: No Attic Space, Attic Not Accessible,
  or insulation type = Other. Also use for vermiculite warning.

--- SECTION E: AUDIT NOTES ---

FIELD 36: AUDIT NOTES
  Textarea. General notes, load factors (pools, pumps), other items,
  anything that doesn't fit a specific field. Describe any "Other"
  entries here.

----------------------------------------------------------------
PAGE 3 — WORK SCOPE
----------------------------------------------------------------

--- SECTION 1: DUCT SEALING ---

FIELD 37: DUCT SEALING (max 1 row)
  Columns: Duct Sealing Level | Auditor or Wx Contractor
  Level options:
  - Duct Sealing Level 1 (Joints) — no visible gaps, no sealant
  - Duct Sealing Level 2 (Small Gaps) — gaps up to 1"
  - Duct Sealing Level 3 (Large Gaps) — gaps over 1"
  - Duct Sealing 4 (Disconnected Ducts) — disconnected or damaged
  - Duct Repair (Out of DS Scope; add in notes)
  Auditor or Wx Contractor:
  - Auditor (Completed) — Joseph did it during the visit
  - Wx Contractor (To Be Completed) — needs contractor follow-up
  - No Duct Sealing to be Completed
  Inference: If Joseph mentions sealing ducts during visit → Auditor Completed
  If too large/complex for auditor → Wx Contractor

FIELD 38: LOCATIONS TO BE SEALED (duct sealing, multi-select)
  Options: Air Handler/Furnace | Plenum | Plenum Connections (Taps) |
           Trunk and/or its connections (Taps) | Branches/Runs | Boots
  Select all that Joseph worked on or identified.

FIELD 39: DUCT SEALING COMMENTS
  Textarea. Copy/paste into Incentit. Be specific about what was done,
  where, what materials used (mastic, foil tape, etc.).

--- SECTION 2: AIR SEALING ---

FIELD 40: AIR SEALING (max 1 row)
  Columns: Air Sealing Level | Auditor or Wx Contractor
  Level options (based on total square inches sealed):
  - Level 1: 0-20 sq in
  - Level 2: 20-50 sq in
  - Level 3: 50-100 sq in
  - Level 4: 100+ sq in
  Inference guide:
  - A few plumbing penetrations under one sink = Level 1
  - Multiple sinks + water heater pipes = Level 2
  - Multiple sinks + water heater + several registers/boots = Level 3
  - Extensive work throughout house = Level 4
  When uncertain about level: ask A/B/C/Other

FIELD 41: AIR SEALING LOCATIONS (multi-select)
  Options: Plumbing Penetrations | Electrical Penetrations | Windows |
           Baseboard/Molding | Top Plates | Marriage Wall (double wide) |
           HVAC Closet (NOT gas) | Sweeps and/or Weatherstrip

FIELD 42: WEATHERSTRIPPING/SWEEP INFO (if weatherstripping done)
  Columns: Type | Quantity
  Type options: White kerf | White Screw in | White Sweep |
                Dark Kerf | Dark Screw in | Dark Sweep

FIELD 43: AIR SEALING COMMENTS
  Textarea. Copy/paste into Incentit. Describe what was sealed, where,
  materials used (silicone, caulk, foam, foil tape).

--- SECTION 3: HVAC CLEANING ---

FIELD 44: HVAC CLEANING (unlimited rows, each component = 1 row)
  Columns: HVAC Component | Tonnage | Auditor or Wx Contractor
  Component options:
  - Condenser (No Cover Removal)
  - Condenser Remove Cover
  - Evaporator
  Tonnage: 1-5 tons
  Note: Each component logged separately. One condenser + one evaporator
  = two rows.
  Inference: If Joseph mentions cleaning AC/condenser during visit →
  Auditor Completed. If not done → Wx Contractor or omit.

FIELD 45: HVAC CLEANING COMMENTS
  Text. Copy/paste into Incentit.

--- SECTION 4: WHOLE HOME INSULATION ---

FIELD 46: INSULATION TIER (auto-calculated from Page 2 data)
  Read-only. JotForm calculates this. Just confirm it.

FIELD 47: CONFIRM INSULATION TIER
  Radio: Correct | Incorrect (return to edit)
  If auto-calculated value looks wrong, flag for Joseph to check.

FIELD 48: ATTIC SQ FT — TOTAL (if qualifies)
  Number. Confirm matches what was entered on Page 2.

FIELD 49: CONFIRM ATTIC SQ FT
  Radio: Correct | Incorrect

FIELD 50: CURRENT RVALUE (if qualifies)
  Number. Confirm matches calculated R-value.

FIELD 51: CONFIRM CURRENT RVALUE
  Radio: Correct | Incorrect

FIELD 52: INSULATION COST ERROR (auto-shows if cost = 0 or empty)
  Warning field. If visible, something is wrong with sq ft or cost calc.

FIELD 53: TOTAL INSULATION COST (if qualifies)
  Number. Calculated at $0.80/sq ft of attic.
  Formula: Attic Sq Ft x $0.80

FIELD 54: MEMBER OOP (out of pocket)
  Number. Usually $0 for program-covered work. Confirm with notes.

FIELD 55: ATTIC INSULATION COMMENTS
  Textarea. Copy/paste into Incentit.

FIELD 56: OZARKS MEMBER
  Always: No (Joseph = Arkansas Valley territory)

FIELD 57: "Doesn't qualify for insulation" heading
  Auto-shows if R-value > 20 (non-Ozarks). No action needed.

--- SECTION 5: ATTIC MEASURES (not whole-home insulation) ---

FIELD 58: ATTIC MEASURES (max 10 rows)
  Columns: Measure | Quantity or Sq Ft | Dimensions | Auditor or Wx
  Measure options:
  - Scuttle Access (small hatch, no stairs)
  - Walkin Access (door into attic)
  - Tent (insulation tent over attic access)
  - Attic Fan (seal and insulate non-functioning fans only)
  - AID Tier 1 (by hand — small areas of missing insulation)
  - AID Tier 2 (needs machine — larger areas)
  Note: AID = Attic Insulation Defects (spot fix, not whole home)
  Quantity field = sq ft if AID, count if access/fan

FIELD 59: ATTIC MEASURE COMMENTS
  Textarea. Copy/paste into Incentit. Specify which measure comments
  refer to.

--- SECTION 6: WATER HEATER MEASURES ---

FIELD 60: WATER HEATER MEASURES (unlimited rows)
  Columns: WH Measure | Quantity | Auditor or Wx Contractor
  Measure options:
  - WH Pipe Wrap (insulate hot water pipes up to 6 ft)
  - WH Temp Adjustment (reduce temp by 10°F+, electric WH only)
  - Circulation Pump Unplugged
  - Circulation Pump Timer Installed
  - Faucet Aerator (replace 2.0 GPM+ with 1.5 GPM or less)
  - Kitchen Aerator (same rule, kitchen-specific)
  - Showerhead (replace 2.0 GPM+ with 1.5 GPM or less)
  LIMITS AND RULES:
  - Faucet/Kitchen Aerators: MAX 4 total per home, $5 each
  - Showerheads: MAX 3 per home, $10 each
  - Temp Adjustment: requires electric WH, currently at 130°F+, $5 each
  - All water measures require electric water heater (for aerators/SH)
  - Pipe wrap: only if water heater is unconditioned space

FIELD 61: WATER HEATER COMMENTS
  Text. Copy/paste into Incentit.

--- SECTION 7: CAN LIGHT RETROFITS ---

FIELD 62: CAN LIGHT RETROFITS (max 2 rows)
  Columns: Who Pays | Quantity | Color (2700k etc) | Auditor or Wx
  Who Pays options:
  - Paid for by AECC
  - Additional w/OOP (member pays out of pocket for extras)
  Note: Bulbs must be IC rated. Program pays for qualifying lights.
  Additional lights can be offered to homeowner at same cost.

FIELD 63: CAN LIGHTS COMMENTS
  Text. Copy/paste into Incentit.

--- SECTION 8: EZ PRO MR. COOL ---

FIELD 64: MR. COOL EZ PRO MINI SPLIT
  Columns: Size (BTU) | Mount Style | Auditor or Wx
  BTU options: 9k | 12k | 18k | 24k
  Mount Style: Plastic Pad | Wall Mount
  Note: Only log if a Mr. Cool mini split was installed or scoped.

--- SECTION 9: OTHER MEASURES ---

FIELD 65: AUDITOR IMPROVEMENT ITEMS
  Columns: Item | Quantity | Auditor or Wx
  Options: Thermocube | QR Code for Ecobee
  Note: Thermocube = device to cut power to space heater when too warm.
  QR Code = for Ecobee setup. Only log if distributed.

--- SECTION 10: CONTRACTOR FACING NOTES ---

FIELD 66: CONTRACTOR FACING NOTES
  Textarea. Notes for the weatherization contractor, NOT for Incentit.
  Include anything a contractor needs to know about follow-up work:
  locations, access issues, homeowner preferences, hazards observed.

----------------------------------------------------------------
PAGE 4 — MEMBER FACING AUDIT REPORT
----------------------------------------------------------------

FIELD 67: AUDITOR RECOMMENDATIONS (choose 2 minimum, 4 maximum)
  Multi-select checkboxes:
  - Reduce temp of hot tub
  - Replace old fridges and freezers
  - Set thermostat high in summer, low in winter
  - Close flue when not used
  - Keep fridges and freezers full
  - Reduce hot water use
  - Upgrade insulation
  - Use ceiling fans and set thermostat higher
  - Keep air vents open
  - Install smart thermostat
  - Use cheap, fiberglass filter and change regularly
  - Lower shades in summer, raise in winter
  - Reduce number of fridges and freezers
  - Replace inefficient bulbs with LEDs
  - Reduce energy when home is unoccupied (turn stuff off)
  - Reduce pool pump run time
  - Take advantage of Ozarks EC EV rate (NO SOLAR)
  DEFAULT RECOMMENDATIONS (when notes are sparse):
  Always relevant: "Set thermostat high in summer, low in winter"
  Always relevant: "Use cheap, fiberglass filter and change regularly"
  If older home: "Replace inefficient bulbs with LEDs"
  If mentioned fridge/freezer: "Replace old fridges and freezers"
  Match remaining picks to what was actually observed.

FIELD 68: MEMBER FACING NOTES
  Textarea. Plain English notes for the homeowner's audit report.
  Things outside program scope (recommend new windows, doors, etc.)
  Friendly, not technical. This goes directly to the member.

----------------------------------------------------------------
PAGE 5 — SUBMISSION
----------------------------------------------------------------
  Submit button. Honeypot field must remain blank (auto-handled).

================================================================

## SECTION 3: CONDITIONAL LOGIC MAP

IF [How many insulation types] = "1"
  → SHOW: 1st Insulation Type, 1st Insulation Depth, Attic Sq Ft,
          R-Value (Only 1 Type)

IF [How many insulation types] = "2..."
  → SHOW: 1st Type, 1st Depth, 2nd Type, 2nd Depth,
          Relationship (Layered/Juxtaposed)

IF [2nd Insulation Type] = "None"
  → HIDE: 2nd Insulation Depth

IF [Relationship] = "Layered"
  → SHOW: Total R-Value (Layered), Attic Sq Ft

IF [Relationship] = "Juxtaposed"
  → SHOW: Area covered by Ins #1, Area covered by Ins #2,
          Total R-Value (Juxtaposed — 3 calculation variants)

IF [Either insulation type] = "Fiberglass Batt"
  → SHOW: Batt Installation Quality (Good/Fair/Poor)

IF [How many types] = "None" OR "Unknown - Attic Not Accessible"
  OR either type = "Other"
  → SHOW: Insulation Notes (required)

IF [R-value (non-Ozarks)] > 20
  → SHOW: "Doesn't qualify for insulation" heading
  → Insulation Tier = Does Not Qualify

IF [R-value (non-Ozarks)] <= 10
  → May qualify for second visit full insulation upgrade to R38

IF [Add Space Heating/Cooling] = "Yes"
  → SHOW: Space Cooling Info table, Space Heating Info table

IF [Water Heater Info] contains "Electric" or "Gas" or "Pump"
  → SHOW: Water Heater Measures section, Water Heater Comments

IF [Insulation Tier] != "Does Not Qualify"
  → SHOW: Attic Sq Ft Total, Confirm Sq Ft, Current R-Value,
          Confirm R-Value, Total Insulation Cost, Member OOP,
          Attic Insulation Comments

IF [Total Insulation Cost] = 0 or empty
  → SHOW: Insulation Cost Error warning

================================================================

## SECTION 4: PROGRAM RULES

WATER MEASURES — QUALIFICATION:
- Electric water heater REQUIRED for: aerators, showerheads, temp adjustment
- Aerators/showerheads: existing must be rated 2.0 GPM or HIGHER to qualify
- Replacements must be 1.5 GPM or LOWER
- Faucet aerators: MAX 4 per home, $5 each
- Showerheads: MAX 3 per home, $10 each
- Temp adjustment: must currently be at 130°F+, reduce by 10°F min, $5 each
- Pipe wrap: insulate hot water pipes as far as possible, up to 6 ft

INSULATION — QUALIFICATION:
- Non-Ozarks (Joseph's territory): does NOT qualify if R-value > 20
- Qualifies for second visit upgrade if R-value < 10 (to R38)
- Second visit insulation: certain co-ops only — verify with boss
- Cost: $0.80 per sq ft of attic
- AID (Attic Insulation Defects): up to 30 sq ft spot fill

AIR SEALING — LEVELS:
- Level 1: 0-20 sq in sealed
- Level 2: 20-50 sq in sealed
- Level 3: 50-100 sq in sealed
- Level 4: 100+ sq in sealed
- Materials: caulk, foam, mastic, gaskets, weatherstripping, foil tape
- Must be aesthetically acceptable to homeowner

DUCT SEALING — LEVELS:
- Level 1: No visible gaps, no sealant present
- Level 2: Gaps visible up to 1"
- Level 3: Gaps visible over 1"
- Level 4: Disconnected or damaged ductwork
- Materials: mastic, mastic-backed tape, sheet metal fasteners, silicone
- Gaps > 1/4" must be bridged before sealant applied

HVAC CLEANING:
- Clean evaporator coil, condenser coils, filter
- Use appropriate coil cleaner
- Ensure indoor drain pan is clear
- Payment per condenser and evaporator coil cleaned

ECOBEE THERMOSTAT:
- Heat pump systems ONLY
- Must have strip backup heat
- C-wire must be present (exceptions: Ozarks EC only)

CAN LIGHTS:
- Must install bulb/trim kit, air seal, and insulate
- Bulbs must be IC rated
- Additional lights can be offered at same cost

MULTIFAMILY:
- 5+ units requires AECC approval BEFORE proceeding
- All available units must be done
- Payment modified: no audit/improvement payment; air/duct sealing
  and AC cleaning at 60% rate
- FLAG IMMEDIATELY if multifamily 5+ detected

T&C FORM:
- Must be signed at beginning of audit (before work)
- Must be uploaded to Incentit
- Joseph collects via PDF on phone, finger signature

AUDIT REPORT:
- Create audit report in Incentit and email to member
- Create work scope email to weatherization TA if member qualifies

================================================================

## SECTION 5: INFERENCE RULES

HOW TO DERIVE ANSWERS FROM VOICE DUMP FRAGMENTS:

BUILDING TYPE:
"mobile home" / "trailer" / "manufactured" → Manufactured Home
"apartment" / "duplex" (2-4) → Multi Family 2-4
"5 units" or more → Multi Family 5+ (FLAG — needs AECC approval)
Anything else → Normal Single Family

HVAC SYSTEM:
"heat pump" → Air Source Heat Pump (both heating AND cooling)
"old heat pump" → Air Source Heat Pump + CHECK Ecobee eligibility
  (needs strip backup heat + C-wire)
"gas furnace" + "AC unit" → Natural Gas heating + Central AC cooling
"electric furnace" / "electric heat" → Electric Resistance
"propane furnace" → Propane
"mini split" (no mention of ductwork) → No Central HVAC + Space Cooling
"window unit" → No Central HVAC + Space Cooling (Window Unit)

DUCT SEALING LEVEL INFERENCE:
"just sealed the joints" / "looks tight, no gaps" → Level 1
"small gaps, foil taped" / "gaps less than inch" → Level 2
"big gaps" / "gaps over an inch" / "used mastic" → Level 3
"disconnected duct" / "fell off" / "completely separated" → Level 4

AIR SEALING LEVEL INFERENCE:
"did a couple penetrations under the sink" → Level 1
"did multiple sinks and water heater pipes" → Level 2
"did sinks, WH, boots, registers throughout" → Level 3
"did everything, big old house, tons of gaps" → Level 4

INSULATION TYPE INFERENCE:
"pink fluffy" / "rolls" / "batts" → Fiberglass Batt
"blowed in" / "blown in" / "loose" + white/gray → Blown Fiberglass
  or Blown Cellulose (ask if unclear)
"gray blown in" / "looks like paper" → Blown Cellulose
"foam" / "sprayed foam" → Spray Foam (ask Closed or Open Cell)
"nothing there" / "bare rafters" → 0 inches, check qualification

WATER HEATER TEMP INFERENCE:
"hot water was scalding" / "way too hot" / "turned up to high" → High
"seemed normal" / "didn't check" → ask A/B: High or Medium?
"already low" / "just warm" → Low (does not qualify for temp adjustment)

ATTIC ACCESS INFERENCE:
"couldn't get in the attic" / "blocked" / "no hatch" → Unknown - Not Accessible
"no attic" / "flat roof" / "mobile home" / "crawlspace ceiling" → None - No Attic Space

WHO COMPLETED WORK:
"I did" / "I sealed" / "I cleaned" / "I installed" → Auditor (Completed)
"needs to be done" / "contractor should" / "left for wx" → Wx Contractor
"didn't do any" / "nothing to do" → No [Measure] to be Completed

MEMBER RECOMMENDATIONS — default picks by situation:
Always include: thermostat management + filter maintenance
Old home / pre-1980: add LED bulbs recommendation
Old appliances mentioned: add fridge/freezer replacement
High utility bill mentioned: add "reduce energy when home unoccupied"
Pool or hot tub mentioned: add appropriate pool/hot tub recommendation
No AC or old AC: add ceiling fans recommendation

================================================================

## SECTION 6: LEARNED RULES

2026-06-01: RULE - Duct Sealing, Air Sealing, and HVAC Cleaning must always produce an output, even when no work is required. If no work is to be completed for any of these three categories, explicitly output the corresponding statement: "No Duct Sealing to be Completed", "No Air Sealing to be Completed", or "No HVAC Cleaning to be Completed". These are required JotForm selections and must never be left blank or omitted from output regardless of job scope.

2026-06-01: RULE — When R-value is below R-10 (typically 4 inches or less of fiberglass batts), always populate Whole Home Insulation section with tier 1 measures and flag for second visit insulation upgrade to R-38. Note contractor must have attic access — if none exists, add Scuttle Access to Attic Measures section.

2026-06-01: RULE - Ceiling board, plywood, or drywall that has fallen or separated at an HVAC closet ceiling penetration is an Air Sealing item, not a Duct Sealing item. Reattaching and sealing this material closes an attic bypass at the building envelope — it is not part of the duct system. Do not categorize it under Duct Sealing regardless of its proximity to ductwork or the air handler.

2026-06-01: RULE — Never include year built estimations or approximations in Audit Notes or any other field if a specific year built value has been provided in Customer Info. The Page 2 Home Information → Year Built field is the source of truth. Any notes saying "house appears to be built in the [decade]" or "built in the 70s" or similar estimations should be omitted from Audit Notes when an exact year is already captured in the Year Built field.

2026-06-01: RULE — Whole Home Insulation Cost Calculation (Tier 1): Total cost = attic sq ft x $1.10. AECC covers up to $2,000. Member pays anything over $2,000 out of pocket. Threshold: 1,819 sq ft or less = no OOP cost. 1,820 sq ft or more = member pays difference. Formula for OOP: (attic sq ft x $1.10) - $2,000 = member OOP cost. Example: 2,350 sq ft x $1.10 = $2,585 total. Member OOP = $585. Always calculate and display: total cost, AECC portion, and member OOP cost separately. Use actual attic sq ft from Home Information → Conditioned Sq Ft if attic sq ft not separately noted.

2026-06-01: RULE — Recessed Light Retrofits: AECC covers up to 10 recessed light LED retrofits at no cost to the homeowner. Any lights beyond 10 cost the homeowner $10 per light out of pocket. Example: 20 lights = 10 free + 10 at $10 each = $100 homeowner cost. Always note total light count, how many AECC covers (up to 10), and homeowner out of pocket cost for any overage. If homeowner agrees to pay overage, include all lights in the work scope.

2026-06-01: RULE - Air Sealing Level Assignment: Large open ceiling penetrations in HVAC closets, particularly where return duct boots or plenums pass through the ceiling into the attic with significant unsealed area (roughly half the closet ceiling or larger), should trigger Air Seal Level 4, not Level 1. Large HVAC closet ceiling gaps are high-volume attic bypasses and are not captured by Level 1 scope (plumbing penetrations, door weatherstrip). When this condition is present, upgrade air seal level assignment accordingly regardless of other scope findings.

2026-06-02: RULE - Do not include estimated or calculated effective R-values in insulation notes output. Field R-value assessments are approximations that introduce inaccurate data into the report. Notes output should contain only directly observed details: insulation type, depth, and condition. R-value belongs in its own dedicated field, not in notes.

2026-06-03: RULE - Water Heater comments must always be populated, even when no measures are completed. If no measures are performed, the comments field must explain why — at minimum a brief reason such as "water heater inaccessible," "pipes too fragile," or "no pipe wrap needed." A blank comment with only "No Water Heater Measures to be Completed" selected is not sufficient output. The reason for no action is always relevant program documentation.

2026-06-03: RULE - Disconnected, separated, or severely damaged ducts default to a DS1–DS4 classification, not "Duct Repair (Out of Scope)." Assume the program will be performing the repair unless the notes explicitly state otherwise. Assign the appropriate DS level based on severity and location as with any other duct sealing finding. Only flag duct repair as out of scope if the auditor specifically says so in the notes.

2026-06-03: RULE - If plumbing penetrations requiring air sealing are present in multiple structures on the same property, assign at least Air Seal Level 2. Multiple structures mean increased penetration count and scope complexity that exceeds Level 1. Do not assign AS1 when penetrations are confirmed across more than one building.

2026-06-03: RULE - In the Member Facing Audit Report → Auditor Recommendations section, never select thermostat-related or HVAC-dependent recommendations for a home without central HVAC. The following are explicitly prohibited when central HVAC is absent: "Set thermostat high in summer, low in winter," "Use ceiling fans and set thermostat higher," and "Use cheap, fiberglass filter and change regularly." The presence of alternative equipment — window units, space heaters, wood stoves, or portable AC — does not change this. For homes with no central HVAC, default to selecting these three recommendations: "Reduce hot water use," "Lower shades in summer, raise in winter," and "Reduce energy when home is unoccupied (turn stuff off)." If the home also has a fireplace or flue, add "Close flue when not used." These are the only safe universal selections for a no-HVAC home. Do not deviate from this default without a specific reason present in the notes. This rule has fired multiple times — treat it as a hard constraint, not a guideline.

2026-06-03: RULE - When air sealing scope includes plumbing penetrations AND two or more door sweeps or kerf weatherstrips, assign at least Air Seal Level 2. A single door sweep or kerf combined with plumbing penetrations may remain Level 1, but multiple sweep or kerf installs alongside penetration sealing represents enough combined labor and material scope to warrant AS2 as the floor. When in doubt between AS1 and AS2 and multiple door measures are present alongside penetrations, default to AS2.

2026-06-03: RULE - In the "Air Sealing → Air Sealing - Air Sealing Level" section, when notes specify work "to be completed" — including plumbing penetrations, door sweeps, dark kerf weatherstrips, or any other air sealing measure — assign those items to "Wx Contractor (to be completed)", not "Auditor Complete." "Auditor Complete" means the auditor physically performed the work on-site during the audit visit. Work listed under a "work scope to be completed" heading, or any measure described as needed or planned, is Wx Contractor scope by default. Only assign "Auditor Complete" when the notes explicitly state the auditor performed the work themselves during the visit.

2026-06-03: RULE - In the "Water Heater Measures → Water Heater Comments" section, pipe wrap eligibility is determined by fuel type, not location. Electric water heaters qualify for pipe wrap regardless of whether they are in conditioned or unconditioned space. Gas water heaters do not qualify for pipe wrap due to safety concerns — this is the sole disqualifying factor. Never cite conditioned space location as a reason to skip pipe wrap on an electric water heater, and never cite any reason other than gas fuel type when explaining why pipe wrap was not performed on a gas water heater. When notes specify a gas water heater with no pipe wrap, or "no pipe wrap because gas" or similar phrase, the correct comment is that pipe wrap was not/should not be performed because the water heater is gas.

2026-06-03: RULE - For air sealing notes or comments for a manufactured/mobile home, do not reference kerf weatherstripping in comments or scope. Mobile home doors use non-standard frames that do not accept kerf-style weatherstrip. Approved methods for mobile home door sealing are screw-on weatherstripping, screw on sweeps, and peel-and-stick foam weatherstripping only. When documenting air sealing scope for a mobile home, specify these methods explicitly in the Air Sealing Comments field instead of generic "weatherstripping and/or sweeps" language. Contractor needs to know upfront that kerf is not applicable so they bring the correct materials to the job.

2026-06-03: RULE - In the Whole Home Insulation section, do not qualify a home for Tier 1 or Tier 2 whole home insulation when the attic has adequate average insulation depth throughout but contains localized low spots or defect areas. A home with 6 inches of blown cellulose (approximately R-22) as the average attic depth does not qualify for whole home insulation regardless of defect areas present. In this situation, the correct scope is AID (Attic Insulation Defect) Tier 2 only, applied to the defect areas alone, at no cost to the homeowner up to 500 sq ft. Whole home insulation qualification is based on the overall average depth and R-value of the attic, not the worst spots. When average depth is sufficient but defect areas exist, assign AID only and leave whole home insulation unselected.

2026-06-03: RULE - In the Heating and Cooling → Central Cooling Information - Cooling Type field, "Air Source Heat Pump" is not a valid dropdown option. For any all-electric heat pump system, select "Central AC" for the cooling type. Reserve "Air Source Heat Pump" for the Heating and Cooling → Central Heating Information - Heating Type field only. This applies to all heat pump configurations — the JotForm dropdown does not offer heat pump as a cooling type option, so Central AC is always the correct cooling type selection for a heat pump.

2026-06-01: RULE — Whole Home Insulation Cost Calculation (Tier 2): Qualification: Member's current attic R-value must be between R10 and R19. R20 and above is unlikely to be approved — flag for review if encountered. R0–R10 homes fall under Tier 1 (separate rule). Never assign Tier 2 to an R0–R10 home. Total cost = attic sq ft x $0.80. Cost is split 50/50 between the member and the co-op. Co-op maximum contribution: $1,000. Member pays their 50% share, plus any amount the total exceeds $2,000. Threshold: 2,500 sq ft or less = member pays exactly 50% of total cost, co-op pays 50%. 2,501 sq ft or more = co-op is capped at $1,000 and member pays the remainder. Formulas: If total cost <= $2,000: Co-op pays = total x 0.50 | Member OOP = total x 0.50. If total cost > $2,000: Co-op pays = $1,000 (capped) | Member OOP = total cost − $1,000. Example (under threshold): 1,500 sq ft x $0.80 = $1,200 total. Co-op pays $600. Member OOP = $600. Example (over threshold): 3,000 sq ft x $0.80 = $2,400 total. Co-op pays $1,000. Member OOP = $1,400. Always calculate and display: total cost, co-op portion, and member OOP cost separately. Use actual attic sq ft from Home Information → Conditioned Sq Ft if attic sq ft is not separately noted.

(This section starts empty and grows as Joseph corrects outputs.
Each correction appends a new rule here.)

================================================================
END OF KNOWLEDGE DOC
================================================================`;

// ── MODULE STATE ─────────────────────────────────────────────
var interpretTabInitialized = false;
var interpretLastParsed = null;
var interpretLastMeta = null;
var interpretPageFilter = 'all';
var interpretDirty = false;

// ── SETTINGS HELPERS ─────────────────────────────────────────
function getInterpretApiKey() {
  try { return localStorage.getItem('aft_claude_api_key') || ''; } catch(e) { return ''; }
}
function setInterpretApiKey(key) {
  try { if (key) localStorage.setItem('aft_claude_api_key', key); else localStorage.removeItem('aft_claude_api_key'); } catch(e) {}
}
function getInterpretModel() {
  try { return localStorage.getItem('aft_interpret_model') || 'claude-sonnet-5'; } catch(e) { return 'claude-sonnet-5'; }
}
function setInterpretModel(m) {
  try { localStorage.setItem('aft_interpret_model', m); } catch(e) {}
}
function getInterpretMaxTokens() {
  try { return parseInt(localStorage.getItem('aft_interpret_max_tokens') || '16384', 10); } catch(e) { return 16384; }
}
function setInterpretMaxTokens(n) {
  try { localStorage.setItem('aft_interpret_max_tokens', String(n)); } catch(e) {}
}
function getInterpretEffort() {
  try { return localStorage.getItem('aft_interpret_effort') || 'medium'; } catch(e) { return 'medium'; }
}
function setInterpretEffort(v) {
  try { localStorage.setItem('aft_interpret_effort', v); } catch(e) {}
}
function getKnowledgeDoc() {
  try { return localStorage.getItem('aft_knowledge_doc') || INTERPRET_KNOWLEDGE_DOC_BUNDLED; } catch(e) { return INTERPRET_KNOWLEDGE_DOC_BUNDLED; }
}
function setKnowledgeDoc(text) {
  try { if (text && text.trim()) localStorage.setItem('aft_knowledge_doc', text); } catch(e) {}
}
function resetKnowledgeDoc() {
  try { localStorage.removeItem('aft_knowledge_doc'); } catch(e) {}
}
function appendLearnedRule(ruleText) {
  var doc = getKnowledgeDoc();
  var dated = new Date().toISOString().split('T')[0] + ': ' + ruleText;
  doc = doc.trimEnd() + '\n\n' + dated;
  setKnowledgeDoc(doc);
  if (typeof toast === 'function') toast('Learned rule saved to knowledge doc.');
}

function clearInterpretSession() {
  interpretLastParsed = null;
  interpretLastMeta = null;
  interpretPageFilter = 'all';
  interpretDirty = false;
  setInterpretCopyMode(false);
  ['interp-flags-card', 'interp-output-card', 'interp-clar-card', 'interp-save-card', 'interp-workflow-card'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  var tokenEl = document.getElementById('interp-token-usage');
  if (tokenEl) tokenEl.style.display = 'none';
  updateInterpSaveStatus(false);
}

function hydrateInterpretFromSavedAudit() {
  if (typeof S === 'undefined' || !S.auditId) return;
  if (typeof getSaved !== 'function') return;
  var rec = getSaved().find(function(a) { return a.id === S.auditId; });
  if (!rec || !rec.interpretedOutput || !rec.interpretedOutput.fields) return;
  interpretLastParsed = rec.interpretedOutput;
  interpretLastMeta = rec.interpretedOutput.interpretMeta || null;
  interpretDirty = false;
}

function refreshInterpretFromLoadedAudit() {
  hydrateInterpretFromSavedAudit();
  if (interpretLastParsed) {
    renderInterpretOutput(interpretLastParsed);
    renderInterpretClarifications(interpretLastParsed);
    renderInterpretFlags(interpretLastParsed);
    var saveCard = document.getElementById('interp-save-card');
    if (saveCard) saveCard.style.display = 'block';
    var workflow = document.getElementById('interp-workflow-card');
    if (workflow) workflow.style.display = 'block';
    setInterpretCopyMode(true);
    updateInterpSaveStatus(true);
    if (interpretLastMeta) {
      var tokenEl = document.getElementById('interp-token-usage');
      if (tokenEl) {
        var inTok = interpretLastMeta.input_tokens || 0;
        var outTok = interpretLastMeta.output_tokens || 0;
        tokenEl.textContent = 'Tokens: ' + inTok.toLocaleString() + ' in / ' + outTok.toLocaleString() + ' out — archived';
        tokenEl.style.display = 'block';
      }
    }
  } else {
    clearInterpretSession();
  }
}

function setInterpretCopyMode(on) {
  var tab = document.getElementById('tab-interpret');
  if (tab) tab.classList.toggle('interp-copy-mode', !!on);
}

function updateInterpSaveStatus(saved) {
  var el = document.getElementById('interp-save-status');
  if (!el) return;
  if (saved && !interpretDirty) {
    el.textContent = '✓ Interpretation attached to this audit';
    el.classList.remove('unsaved');
  } else if (interpretLastParsed) {
    el.textContent = '● Unsaved changes — tap Re-save or edit auto-saves shortly';
    el.classList.add('unsaved');
  } else {
    el.textContent = 'No interpretation saved for this audit yet';
    el.classList.remove('unsaved');
  }
}

function getJotFormFormUrl() {
  try { return localStorage.getItem('aft_jotform_form_url') || ''; } catch(e) { return ''; }
}
function setJotFormFormUrl(v) {
  try {
    var trimmed = (v || '').trim();
    if (trimmed) localStorage.setItem('aft_jotform_form_url', trimmed);
    else localStorage.removeItem('aft_jotform_form_url');
  } catch(e) {}
}

function getJotFormOpenUrl() {
  var url = getJotFormFormUrl();
  if (url) return url;
  var id = getJotFormFormId();
  if (id) return 'https://form.jotform.com/' + id;
  return '';
}

function openJotFormInBrowser() {
  var url = getJotFormOpenUrl();
  if (!url) {
    toast('Add JotForm Form ID or URL in Settings → Interpret Settings.');
    return;
  }
  window.open(url, '_blank', 'noopener');
  toast('JotForm opened — use Split View to keep both apps visible.');
}

function setInterpretPageFilter(page) {
  interpretPageFilter = page || 'all';
  document.querySelectorAll('.interp-page-pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.page === interpretPageFilter);
  });
  if (interpretLastParsed) renderInterpretOutput(interpretLastParsed);
}

function wireInterpretPageFilters() {
  document.querySelectorAll('.interp-page-pill').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setInterpretPageFilter(btn.dataset.page);
    });
  });
}

function ensureAuditSavedForInterpret() {
  if (typeof S === 'undefined') return false;
  if (!S.name && !S.dump && !(S.photos && S.photos.length)) return false;
  if (typeof getSaved !== 'function' || typeof persistAuditRecord !== 'function') return false;
  if (!S.auditId || !getSaved().some(function(a) { return a.id === S.auditId; })) {
    persistAuditRecord();
  }
  return !!S.auditId;
}

// ── INTERPRET TAB INIT ────────────────────────────────────────
function initInterpretTab() {
  renderInterpretInfo();
  hydrateInterpretFromSavedAudit();
  if (!interpretTabInitialized) {
    interpretTabInitialized = true;
    wireInterpretButtons();
    wireInterpretSettings();
    wireInterpretPageFilters();
  }
  // If a loaded audit has a saved interpretation, auto-render it
  if (interpretLastParsed) {
    renderInterpretOutput(interpretLastParsed);
    renderInterpretClarifications(interpretLastParsed);
    renderInterpretFlags(interpretLastParsed);
    var saveCard = document.getElementById('interp-save-card');
    if (saveCard) saveCard.style.display = 'block';
    var workflow = document.getElementById('interp-workflow-card');
    if (workflow) workflow.style.display = 'block';
    setInterpretCopyMode(true);
    updateInterpSaveStatus(true);
    if (interpretLastMeta) {
      var tokenEl = document.getElementById('interp-token-usage');
      if (tokenEl) {
        var inTok = interpretLastMeta.input_tokens || 0;
        var outTok = interpretLastMeta.output_tokens || 0;
        tokenEl.textContent = 'Tokens: ' + inTok.toLocaleString() + ' in / ' + outTok.toLocaleString() + ' out (' + (inTok + outTok).toLocaleString() + ' total) — archived';
        tokenEl.style.display = 'block';
      }
    }
  }
}

function renderInterpretInfo() {
  var nameEl = document.getElementById('interp-name-display');
  var addrEl = document.getElementById('interp-address-display');
  var dateEl = document.getElementById('interp-date-display');
  var coopEl = document.getElementById('interp-coop-display');
  var yearEl = document.getElementById('interp-year-display');
  var sqftEl = document.getElementById('interp-sqft-display');
  var dumpEl = document.getElementById('interp-dump-preview');
  var badgeEl = document.getElementById('interp-model-badge');
  var noKeyEl = document.getElementById('interp-no-key-warn');
  var noDumpEl = document.getElementById('interp-no-dump-warn');

  if (nameEl) nameEl.textContent = (typeof S !== 'undefined' && S.name) ? S.name : '—';
  if (addrEl) addrEl.textContent = (typeof S !== 'undefined' && S.address) ? S.address : '—';
  if (dateEl) dateEl.textContent = (typeof S !== 'undefined' && S.date) ? S.date : '—';
  if (coopEl) coopEl.textContent = (typeof S !== 'undefined' && S.coop) ? S.coop : '—';
  if (yearEl) yearEl.textContent = (typeof S !== 'undefined' && S.year) ? S.year : '—';
  if (sqftEl) sqftEl.textContent = (typeof S !== 'undefined' && S.sqft) ? S.sqft : '—';

  if (dumpEl) {
    var dump = (typeof S !== 'undefined' && S.dump) ? S.dump.trim() : '';
    if (dump) {
      dumpEl.textContent = dump.length > 300 ? dump.substring(0, 300) + '…' : dump;
      dumpEl.classList.remove('interp-dump-empty');
    } else {
      dumpEl.textContent = 'No audit notes loaded.';
      dumpEl.classList.add('interp-dump-empty');
    }
  }
  if (badgeEl) badgeEl.textContent = getInterpretModel();
  if (noKeyEl) noKeyEl.style.display = getInterpretApiKey() ? 'none' : 'block';
  if (noDumpEl) {
    var hasDump = typeof S !== 'undefined' && S.dump && S.dump.trim();
    noDumpEl.style.display = hasDump ? 'none' : 'block';
  }
}

// ── WIRE INTERPRET BUTTONS ────────────────────────────────────
function wireInterpretButtons() {
  var runBtn = document.getElementById('interp-run-btn');
  if (runBtn) {
    runBtn.addEventListener('click', runInterpret);
  }

  var saveBtn = document.getElementById('interp-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      if (interpretLastParsed) {
        saveInterpretation(interpretLastParsed);
      } else {
        toast('No interpretation to save yet.');
      }
    });
  }

  var jfSubmitBtn = document.getElementById('interp-jotform-submit-btn');
  if (jfSubmitBtn) {
    jfSubmitBtn.addEventListener('click', runJotFormSubmit);
  }

  var openJfBtn = document.getElementById('interp-open-jotform-btn');
  if (openJfBtn) openJfBtn.addEventListener('click', openJotFormInBrowser);
  var stickyOpenJfBtn = document.getElementById('interp-sticky-open-jotform-btn');
  if (stickyOpenJfBtn) stickyOpenJfBtn.addEventListener('click', openJotFormInBrowser);

  initFlagSelection();
}

// ── RUN INTERPRET ─────────────────────────────────────────────
function runInterpret() {
  var apiKey = getInterpretApiKey();
  if (!apiKey) {
    toast('Add API key in More → Interpret Settings first.');
    return;
  }
  var dump = (typeof S !== 'undefined' && S.dump) ? S.dump.trim() : '';
  if (!dump) {
    toast('No audit notes in current audit.');
    return;
  }

  if (!ensureAuditSavedForInterpret()) {
    toast('Save or load an audit first — interpretation must attach to a saved audit.');
    return;
  }

  var name = (typeof S !== 'undefined' && S.name) ? S.name : '';
  var address = (typeof S !== 'undefined' && S.address) ? S.address : '';
  var date = (typeof S !== 'undefined' && S.date) ? S.date : '';
  var year = (typeof S !== 'undefined' && S.year) ? S.year : '';
  var sqft = (typeof S !== 'undefined' && S.sqft) ? S.sqft : '';
  var coop = (typeof S !== 'undefined' && S.coop) ? S.coop : '';

  var yearVal = year || 'Not provided — use Zillow lookup';
  var sqftVal = sqft || 'Not provided — use Zillow lookup';
  var coopVal = coop || 'Unknown';

  var prompt = 'You are the Audit Interpreter Agent for the CHESS energy efficiency program. Use the knowledge doc below to interpret the raw audit notes and output pre-filled JotForm field answers.\n\n' +
    'KNOWLEDGE DOC:\n' + getKnowledgeDoc() + '\n\n' +
    'CUSTOMER INFO:\nName: ' + name + '\nAddress: ' + address + '\nDate: ' + date +
    '\nYear Built: ' + yearVal + '\nConditioned Sq Ft: ' + sqftVal + '\nCo-op: ' + coopVal + '\n\n' +
    'RAW AUDIT NOTES:\n' + dump + '\n\n' +
    'OUTPUT FORMAT:\nReturn a JSON object with this exact structure:\n' +
    '{\n  "fields": [\n    { "page": "Page 1", "section": "Intake", "field": "Member Name - First Name", "value": "..." }\n  ],\n' +
    '  "clarifications": [\n    {\n      "question": "Question text here",\n      "fieldPage": "Page 2",\n      "fieldSection": "Water Heater Information",\n      "fieldName": "Water Heater Information - WH Type",\n' +
    '      "options": [\n        { "label": "A", "text": "Electric Resistance", "value": "Electric Resistance" },\n        { "label": "B", "text": "Electric Heat Pump", "value": "Electric Heat Pump" }\n      ]\n    }\n  ],\n' +
    '  "notes": "Any critical flags or interpreter notes"\n}\n\n' +
    'CRITICAL OUTPUT RULES:\n' +
    '- Return ONLY valid JSON. No prose. No markdown fences. No explanation outside the JSON.\n' +
    '- Every clarification MUST include fieldPage, fieldSection, and fieldName so the answer can be mapped to the exact field in the output\n' +
    '- The fieldName in clarifications must exactly match the field name used in the fields array\n' +
    '- Options must include a value property that is the exact JotForm field value to use if that option is selected\n' +
    '- temperature is 0 — be maximally consistent and deterministic\n' +
    '- Always output fields in page order: Page 1, Page 2, Page 3, Page 4\n' +
    '- Never skip a field you have enough information to fill\n' +
    '- For fields with insufficient information, add a clarification question instead of guessing\n' +
    '- Wood stove mentioned → always log as Space Heating Type: Wood Fireplace, quantity 1, no clarification needed\n' +
    '- Heat pump with no strip backup mentioned → always output Ecobee: Does Not Qualify, no clarification needed\n' +
    '- Water heater not mentioned → default Electric Resistance, Conditioned, Medium and add clarification question\n' +
    '- Auditor vs Wx Contractor: if auditor says "I did" or "I sealed" or "I installed" → Auditor Completed. If not mentioned as done → Wx Contractor';

  var runBtn = document.getElementById('interp-run-btn');
  var tokenEl = document.getElementById('interp-token-usage');
  if (runBtn) { runBtn.textContent = '⏳ Interpreting…'; runBtn.disabled = true; }
  if (tokenEl) tokenEl.style.display = 'none';

  // Hide previous output
  ['interp-flags-card', 'interp-output-card', 'interp-clar-card', 'interp-save-card'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  var effort = getInterpretEffort();
  var useThinking = effort && effort !== '';
  var requestBody = {
    model: getInterpretModel(),
    max_tokens: getInterpretMaxTokens(),
    temperature: useThinking ? 1 : 0,
    messages: [{ role: 'user', content: prompt }]
  };
  if (useThinking) {
    requestBody.thinking = { type: 'adaptive' };
    requestBody.output_config = { effort: effort };
  }

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
    // Filter to text block only — thinking blocks must be skipped
    var textBlock = (data.content || []).find(function(b) { return b.type === 'text'; });
    var raw = textBlock ? textBlock.text : '';

    if (data.usage && tokenEl) {
      var inTok = data.usage.input_tokens || 0;
      var outTok = data.usage.output_tokens || 0;
      tokenEl.textContent = 'Tokens: ' + inTok.toLocaleString() + ' in / ' + outTok.toLocaleString() + ' out (' + (inTok + outTok).toLocaleString() + ' total)';
      tokenEl.style.display = 'block';
      interpretLastMeta = {
        model: data.model || getInterpretModel(),
        input_tokens: inTok,
        output_tokens: outTok,
        total_tokens: inTok + outTok,
        interpretedAt: new Date().toISOString()
      };
    }

    // Strip markdown fences and find outermost JSON
    var clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    var jsonStart = clean.indexOf('{');
    var jsonEnd = clean.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object in response');
    clean = clean.substring(jsonStart, jsonEnd + 1);

    var parsed;
    try {
      parsed = JSON.parse(clean);
    } catch(e1) {
      var repaired = clean.replace(/\r\n/g, '\\n').replace(/\r/g, '\\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
      parsed = JSON.parse(repaired);
    }

    interpretLastParsed = parsed;
    interpretDirty = true;
    renderInterpretOutput(parsed);
    renderInterpretClarifications(parsed);
    renderInterpretFlags(parsed);

    var saveCard = document.getElementById('interp-save-card');
    if (saveCard) saveCard.style.display = 'block';
    var workflow = document.getElementById('interp-workflow-card');
    if (workflow) workflow.style.display = 'block';
    setInterpretCopyMode(true);

    persistInterpretationToAudit({ silent: false, message: 'Interpretation saved to audit.' });
  })
  .catch(function(err) {
    toast('Interpret error: ' + err.message);
    console.error(err);
  })
  .finally(function() {
    if (runBtn) { runBtn.textContent = '⚡ Interpret Audit'; runBtn.disabled = false; }
  });
}

// ── RENDER FIELDS OUTPUT ──────────────────────────────────────
function renderInterpretOutput(parsed) {
  var card = document.getElementById('interp-output-card');
  var content = document.getElementById('interp-output-content');
  if (!card || !content) return;

  var byPage = {};
  (parsed.fields || []).forEach(function(f) {
    if (!byPage[f.page]) byPage[f.page] = [];
    byPage[f.page].push(f);
  });

  var pageKeys = Object.keys(byPage);
  if (interpretPageFilter !== 'all') {
    pageKeys = pageKeys.filter(function(p) { return p === interpretPageFilter; });
  }

  var html = '';
  if (!pageKeys.length) {
    html = '<div class="empty-msg">No fields for this page filter.</div>';
  }
  pageKeys.forEach(function(page) {
    html += '<div class="interpret-page-group"><div class="interpret-page-title">' + escapeHtml(page) + '</div>';
    byPage[page].forEach(function(f) {
      var fieldKey = (f.page + '|' + f.section + '|' + f.field);
      var fieldAttr = 'data-page="' + escapeHtml(f.page || '') + '" data-section="' + escapeHtml(f.section || '') + '" data-field="' + escapeHtml(f.field || '') + '"';
      html += '<div class="interpret-field-row" id="ifield-' + btoa(unescape(encodeURIComponent(fieldKey))).replace(/[^a-zA-Z0-9]/g, '') + '">' +
        '<div class="interpret-field-label">' + escapeHtml(f.section) + ' — ' + escapeHtml(f.field) + '</div>' +
        '<div class="interpret-field-value-row">' +
          '<span class="interpret-field-value" ' + fieldAttr + '>' + escapeHtml(f.value || '') + '</span>' +
          '<button type="button" class="interpret-copy-btn" title="Copy to clipboard" ' + fieldAttr + '>📋</button>' +
          '<button type="button" class="interpret-edit-btn" title="Correct this field" ' + fieldAttr + '>✏️</button>' +
        '</div>' +
        '</div>';
    });
    html += '</div>';
  });

  content.innerHTML = html;

  // Wire copy buttons
  content.querySelectorAll('.interpret-copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var page = btn.dataset.page;
      var section = btn.dataset.section;
      var field = btn.dataset.field;
      var valueEl = content.querySelector('.interpret-field-value[data-page="' + page + '"][data-section="' + section + '"][data-field="' + field + '"]');
      var text = valueEl ? valueEl.textContent : '';
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(function() {
          btn.classList.add('copied');
          btn.textContent = '✓';
          setTimeout(function() { btn.classList.remove('copied'); btn.textContent = '📋'; }, 1200);
          if (typeof toast === 'function') toast('Copied: ' + text.substring(0, 40));
        }).catch(function() {
          try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            btn.classList.add('copied');
            btn.textContent = '✓';
            setTimeout(function() { btn.classList.remove('copied'); btn.textContent = '📋'; }, 1200);
            if (typeof toast === 'function') toast('Copied: ' + text.substring(0, 40));
          } catch(e) {}
        });
      }
    });
  });

  // Wire edit buttons (inline correction)
  content.querySelectorAll('.interpret-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var page = btn.dataset.page;
      var section = btn.dataset.section;
      var field = btn.dataset.field;
      var valueRow = btn.closest('.interpret-field-value-row');
      if (!valueRow) return;
      var valueEl = valueRow.querySelector('.interpret-field-value');
      if (!valueEl || valueRow.querySelector('.interpret-inline-editor')) return; // already editing

      var original = valueEl.textContent;

      // Build inline editor
      var editor = document.createElement('div');
      editor.className = 'interpret-inline-editor';
      editor.innerHTML =
        '<input type="text" class="interpret-inline-input" value="' + escapeHtml(original) + '">' +
        '<button type="button" class="btn-gold btn-xs interpret-inline-save">Save</button>' +
        '<button type="button" class="btn-xs interpret-inline-cancel">✕</button>';

      valueEl.style.display = 'none';
      btn.style.display = 'none';
      var copyBtn = valueRow.querySelector('.interpret-copy-btn');
      if (copyBtn) copyBtn.style.display = 'none';
      valueRow.appendChild(editor);

      var inputEl = editor.querySelector('.interpret-inline-input');
      inputEl.focus();
      inputEl.select();

      editor.querySelector('.interpret-inline-cancel').addEventListener('click', function() {
        valueEl.style.display = '';
        btn.style.display = '';
        if (copyBtn) copyBtn.style.display = '';
        editor.remove();
      });

      editor.querySelector('.interpret-inline-save').addEventListener('click', function() {
        var newValue = inputEl.value.trim();
        valueEl.textContent = newValue;
        valueEl.style.display = '';
        valueEl.style.color = '#4caf50';
        btn.style.display = '';
        if (copyBtn) copyBtn.style.display = '';
        editor.remove();

        // Update in-memory parsed
        if (interpretLastParsed) {
          var f = (interpretLastParsed.fields || []).find(function(x) {
            return x.page === page && x.section === section && x.field === field;
          });
          if (f) f.value = newValue;
        }

        interpretDirty = true;
        persistInterpretationToAudit({ silent: true });

        // Offer to save as learned rule
        if (newValue !== original && original && original !== 'NEEDS INPUT') {
          var ruleText = 'Correction — ' + section + ' → ' + field +
            ': interpreter said "' + original + '" but correct value is "' + newValue + '".';
          if (confirm('Save as learned rule?\n\n' + ruleText)) {
            appendLearnedRule(ruleText);
          }
        }
      });

      // Save on Enter
      inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { editor.querySelector('.interpret-inline-save').click(); }
        if (e.key === 'Escape') { editor.querySelector('.interpret-inline-cancel').click(); }
      });
    });
  });

  card.style.display = 'block';
}

// ── FLAG SELECTION ────────────────────────────────────────────
function initFlagSelection() {
  var flagStartBtn = document.getElementById('interp-flag-start-btn');
  var flagToolbar = document.getElementById('interp-flag-toolbar');
  var flagConfirmBtn = document.getElementById('interp-flag-confirm-btn');
  var flagCancelBtn = document.getElementById('interp-flag-cancel-btn');
  var outputContent = document.getElementById('interp-output-content');

  if (!flagStartBtn) return;

  flagStartBtn.addEventListener('click', function() {
    if (!document.getElementById('interp-output-card') || document.getElementById('interp-output-card').style.display === 'none') {
      toast('Run interpret first to get output to flag.');
      return;
    }
    flagToolbar.style.display = 'flex';
    if (outputContent) outputContent.classList.add('interp-flag-mode');
    flagStartBtn.style.display = 'none';
  });

  function exitFlagMode() {
    flagToolbar.style.display = 'none';
    flagStartBtn.style.display = '';
    if (outputContent) {
      outputContent.classList.remove('interp-flag-mode');
    }
    if (window.getSelection) window.getSelection().removeAllRanges();
  }

  flagCancelBtn.addEventListener('click', exitFlagMode);

  flagConfirmBtn.addEventListener('click', function() {
    var sel = window.getSelection ? window.getSelection() : null;
    var selectedText = sel ? sel.toString().trim() : '';
    if (!selectedText) {
      toast('No text selected. Highlight some text in the output first.');
      return;
    }
    var note = prompt('What is wrong or missing with the selected text?');
    if (!note || !note.trim()) { exitFlagMode(); return; }
    var ruleText = 'FLAG — Selected text: "' + selectedText.substring(0, 200) + '" — Note: ' + note.trim();
    appendLearnedRule(ruleText);
    exitFlagMode();
  });
}

// ── RENDER CLARIFICATIONS ─────────────────────────────────────
function renderInterpretClarifications(parsed) {
  var card = document.getElementById('interp-clar-card');
  var content = document.getElementById('interp-clar-content');
  if (!card || !content) return;

  if (!parsed.clarifications || parsed.clarifications.length === 0) {
    card.style.display = 'none';
    return;
  }

  var html = '';
  parsed.clarifications.forEach(function(c, i) {
    html += '<div class="interpret-clar-item" data-index="' + i + '">';
    html += '<p class="interpret-clar-question"><strong>Q' + (i + 1) + ':</strong> ' + escapeHtml(c.question || '') + '</p>';
    if (c.fieldName) {
      html += '<p class="interpret-clar-field-ref">→ ' + escapeHtml(c.fieldSection || '') + ' — ' + escapeHtml(c.fieldName) + '</p>';
    }
    html += '<div class="interpret-clar-options">';
    (c.options || []).forEach(function(opt) {
      if (typeof opt === 'string') {
        html += '<button type="button" class="interpret-option-btn btn-xs">' + escapeHtml(opt) + '</button>';
      } else {
        html += '<button type="button" class="interpret-option-btn btn-xs"' +
          ' data-clar-index="' + i + '"' +
          ' data-field-page="' + escapeHtml(c.fieldPage || '') + '"' +
          ' data-field-section="' + escapeHtml(c.fieldSection || '') + '"' +
          ' data-field-name="' + escapeHtml(c.fieldName || '') + '"' +
          ' data-value="' + escapeHtml(opt.value || opt.text || '') + '">' +
          escapeHtml(opt.label) + ': ' + escapeHtml(opt.text) +
          '</button>';
      }
    });
    html += '</div>';
    html += '<div class="interpret-clar-resolved" id="iclar-resolved-' + i + '" style="display:none;">✓ Answer applied</div>';
    html += '</div>';
  });

  content.innerHTML = html;

  // Wire answer buttons
  content.querySelectorAll('.interpret-option-btn').forEach(function(btn) {
    if (!btn.dataset.clarIndex && btn.dataset.clarIndex !== '0') return;
    btn.addEventListener('click', function() {
      var clarIdx = btn.dataset.clarIndex;
      var fieldPage = btn.dataset.fieldPage;
      var fieldSection = btn.dataset.fieldSection;
      var fieldName = btn.dataset.fieldName;
      var value = btn.dataset.value;

      // Update field value span in output
      var outputContent = document.getElementById('interp-output-content');
      if (outputContent) {
        var valueEl = outputContent.querySelector(
          '.interpret-field-value[data-page="' + fieldPage + '"][data-section="' + fieldSection + '"][data-field="' + fieldName + '"]'
        );
        if (valueEl) {
          valueEl.textContent = value;
          valueEl.style.color = '#4caf50';
          var row = valueEl.closest('.interpret-field-row');
          if (row) row.style.borderColor = '#4caf50';
        }
      }

      // Update in-memory parsed
      if (interpretLastParsed) {
        var field = (interpretLastParsed.fields || []).find(function(f) {
          return f.page === fieldPage && f.section === fieldSection && f.field === fieldName;
        });
        if (field) field.value = value;
      }

      // Mark selected button
      var item = content.querySelector('[data-index="' + clarIdx + '"]');
      if (item) {
        item.querySelectorAll('.interpret-option-btn').forEach(function(b) {
          b.style.borderColor = '';
          b.style.color = '';
        });
        btn.style.borderColor = '#4caf50';
        btn.style.color = '#4caf50';
      }

      var resolvedEl = document.getElementById('iclar-resolved-' + clarIdx);
      if (resolvedEl) resolvedEl.style.display = 'block';

      if (typeof toast === 'function') toast('Applied: ' + value.substring(0, 40));
      persistInterpretationToAudit({ silent: true });
    });
  });

  card.style.display = 'block';
}

// ── RENDER FLAGS ──────────────────────────────────────────────
function renderInterpretFlags(parsed) {
  var card = document.getElementById('interp-flags-card');
  var content = document.getElementById('interp-flags-content');
  if (!card || !content) return;
  if (parsed.notes && parsed.notes.trim()) {
    content.textContent = parsed.notes;
    card.style.display = 'block';
  } else {
    card.style.display = 'none';
  }
}

// ── SAVE INTERPRETATION ───────────────────────────────────────
function persistInterpretationToAudit(options) {
  options = options || {};
  if (typeof S === 'undefined' || !S.auditId || !interpretLastParsed) {
    if (!options.silent) toast('No active audit or interpretation to save.');
    return false;
  }
  try {
    var saved = typeof getSaved === 'function' ? getSaved() : JSON.parse(localStorage.getItem('aft_saved') || '[]');
    var idx = saved.findIndex(function(a) { return a.id === S.auditId; });
    if (idx < 0) {
      if (!options.silent) toast('Audit not saved yet — save it first.');
      return false;
    }
    saved[idx].interpretedOutput = {
      fields: interpretLastParsed.fields || [],
      clarifications: interpretLastParsed.clarifications || [],
      notes: interpretLastParsed.notes || '',
      interpretMeta: interpretLastMeta || saved[idx].interpretedOutput && saved[idx].interpretedOutput.interpretMeta || {}
    };
    if (typeof setSaved === 'function') {
      setSaved(saved);
    } else {
      localStorage.setItem('aft_saved', JSON.stringify(saved));
    }
    interpretDirty = false;
    updateInterpSaveStatus(true);
    if (typeof renderAuditsList === 'function') renderAuditsList();
    if (!options.silent) toast(options.message || 'Interpretation saved to audit record.');
    return true;
  } catch(e) {
    if (!options.silent) toast('Save error: ' + e.message);
    console.error(e);
    return false;
  }
}

function saveInterpretation(parsed) {
  if (parsed) interpretLastParsed = parsed;
  persistInterpretationToAudit({ silent: false, message: 'Interpretation saved to audit record.' });
}

// ── INTERPRET SETTINGS UI ─────────────────────────────────────
function wireInterpretSettings() {
  var apiKeyInput = document.getElementById('interp-api-key-input');
  var apiKeySaveBtn = document.getElementById('interp-api-key-save');
  var testBtn = document.getElementById('interp-test-btn');
  var testResult = document.getElementById('interp-test-result');
  var modelSelect = document.getElementById('interp-model-select');
  var effortSelect = document.getElementById('interp-effort-select');
  var maxTokensSelect = document.getElementById('interp-max-tokens-select');
  var modelSaveBtn = document.getElementById('interp-model-save');
  var knowledgeTextarea = document.getElementById('interp-knowledge-textarea');
  var knowledgeSaveBtn = document.getElementById('interp-knowledge-save');
  var knowledgeResetBtn = document.getElementById('interp-knowledge-reset');

  if (!apiKeyInput) return;

  // Load stored settings into UI
  if (modelSelect) {
    var storedModel = getInterpretModel();
    Array.from(modelSelect.options).forEach(function(opt) {
      if (opt.value === storedModel) opt.selected = true;
    });
  }
  if (effortSelect) {
    var storedEffort = getInterpretEffort();
    Array.from(effortSelect.options).forEach(function(opt) {
      opt.selected = (opt.value === storedEffort);
    });
  }
  if (maxTokensSelect) {
    var storedTok = String(getInterpretMaxTokens());
    Array.from(maxTokensSelect.options).forEach(function(opt) {
      if (opt.value === storedTok) opt.selected = true;
    });
  }
  if (knowledgeTextarea) {
    knowledgeTextarea.value = getKnowledgeDoc();
  }

  if (apiKeySaveBtn) {
    apiKeySaveBtn.addEventListener('click', function() {
      var key = (apiKeyInput.value || '').trim();
      if (key && !key.startsWith('sk-')) {
        toast('Key should start with sk-'); return;
      }
      setInterpretApiKey(key);
      apiKeyInput.value = '';
      renderInterpretInfo();
      toast(key ? 'API key saved.' : 'API key cleared.');
    });
  }

  if (testBtn && testResult) {
    testBtn.addEventListener('click', function() {
      var key = (apiKeyInput.value || '').trim() || getInterpretApiKey();
      if (!key) { toast('Enter an API key first.'); return; }
      testBtn.disabled = true;
      testBtn.textContent = '…';
      testResult.style.display = 'none';
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, temperature: 0, messages: [{ role: 'user', content: 'Reply with only the word: connected' }] })
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

  if (modelSaveBtn) {
    modelSaveBtn.addEventListener('click', function() {
      var m = modelSelect ? modelSelect.value : getInterpretModel();
      var e = effortSelect ? effortSelect.value : getInterpretEffort();
      var t = maxTokensSelect ? parseInt(maxTokensSelect.value, 10) : getInterpretMaxTokens();
      setInterpretModel(m);
      setInterpretEffort(e);
      setInterpretMaxTokens(t);
      renderInterpretInfo();
      toast('Model settings saved.');
    });
  }

  if (knowledgeSaveBtn && knowledgeTextarea) {
    knowledgeSaveBtn.addEventListener('click', function() {
      setKnowledgeDoc(knowledgeTextarea.value);
      toast('Knowledge doc saved.');
    });
  }

  if (knowledgeResetBtn && knowledgeTextarea) {
    knowledgeResetBtn.addEventListener('click', function() {
      if (confirm('Reset knowledge doc to the bundled version? Your edits will be lost.')) {
        resetKnowledgeDoc();
        knowledgeTextarea.value = INTERPRET_KNOWLEDGE_DOC_BUNDLED;
        toast('Knowledge doc reset to bundled version.');
      }
    });
  }

  // JotForm settings
  var jfFormIdInput = document.getElementById('jotform-form-id-input');
  var jfFormUrlInput = document.getElementById('jotform-form-url-input');
  var jfApiKeyInput = document.getElementById('jotform-api-key-input');
  var jfMapTextarea = document.getElementById('jotform-field-map-textarea');
  var jfSaveBtn = document.getElementById('jotform-settings-save');
  if (jfFormIdInput) jfFormIdInput.value = getJotFormFormId();
  if (jfFormUrlInput) jfFormUrlInput.value = getJotFormFormUrl();
  if (jfApiKeyInput) jfApiKeyInput.value = getJotFormApiKey();
  if (jfMapTextarea) jfMapTextarea.value = JSON.stringify(getJotFormFieldMap(), null, 2);
  if (jfSaveBtn) {
    jfSaveBtn.addEventListener('click', function() {
      if (jfFormIdInput) setJotFormFormId(jfFormIdInput.value.trim());
      if (jfFormUrlInput) setJotFormFormUrl(jfFormUrlInput.value.trim());
      if (jfApiKeyInput) setJotFormApiKey(jfApiKeyInput.value.trim());
      if (jfMapTextarea) {
        try {
          var mapObj = JSON.parse(jfMapTextarea.value || '{}');
          setJotFormFieldMap(mapObj);
          toast('JotForm settings saved.');
        } catch(e) {
          toast('Invalid JSON in field map — check formatting.');
        }
      } else {
        toast('JotForm settings saved.');
      }
    });
  }
}

// Called when More tab opens, to refresh settings fields
function refreshInterpretSettingsUI() {
  var modelSelect = document.getElementById('interp-model-select');
  var effortSelect = document.getElementById('interp-effort-select');
  var maxTokensSelect = document.getElementById('interp-max-tokens-select');
  var knowledgeTextarea = document.getElementById('interp-knowledge-textarea');
  if (modelSelect) {
    var storedModel = getInterpretModel();
    Array.from(modelSelect.options).forEach(function(opt) { opt.selected = (opt.value === storedModel); });
  }
  if (effortSelect) {
    var storedEffort = getInterpretEffort();
    Array.from(effortSelect.options).forEach(function(opt) { opt.selected = (opt.value === storedEffort); });
  }
  if (maxTokensSelect) {
    var storedTok = String(getInterpretMaxTokens());
    Array.from(maxTokensSelect.options).forEach(function(opt) { opt.selected = (opt.value === storedTok); });
  }
  if (knowledgeTextarea && !knowledgeTextarea.dataset.dirty) {
    knowledgeTextarea.value = getKnowledgeDoc();
  }
  // JotForm settings
  var jfFormIdInput = document.getElementById('jotform-form-id-input');
  var jfFormUrlInput = document.getElementById('jotform-form-url-input');
  var jfApiKeyInput = document.getElementById('jotform-api-key-input');
  var jfMapTextarea = document.getElementById('jotform-field-map-textarea');
  if (jfFormIdInput) jfFormIdInput.value = getJotFormFormId();
  if (jfFormUrlInput) jfFormUrlInput.value = getJotFormFormUrl();
  if (jfApiKeyInput) jfApiKeyInput.value = getJotFormApiKey();
  if (jfMapTextarea) jfMapTextarea.value = JSON.stringify(getJotFormFieldMap(), null, 2);
}

// ── JOTFORM API ────────────────────────────────────────────────
function getJotFormFormId() { return localStorage.getItem('aft_jotform_form_id') || ''; }
function setJotFormFormId(v) { localStorage.setItem('aft_jotform_form_id', v); }
function getJotFormApiKey() { return localStorage.getItem('aft_jotform_api_key') || ''; }
function setJotFormApiKey(v) { localStorage.setItem('aft_jotform_api_key', v); }
function getJotFormFieldMap() {
  try { return JSON.parse(localStorage.getItem('aft_jotform_field_map') || '{}'); } catch(e) { return {}; }
}
function setJotFormFieldMap(obj) { localStorage.setItem('aft_jotform_field_map', JSON.stringify(obj)); }

function buildJotFormBody(fields, fieldMap) {
  var params = [];
  (fields || []).forEach(function(f) {
    var qId = fieldMap[f.field];
    if (qId && f.value !== undefined && f.value !== null) {
      params.push(encodeURIComponent('submission[' + qId + ']') + '=' + encodeURIComponent(f.value || ''));
    }
  });
  return params.join('&');
}

function runJotFormSubmit() {
  if (!interpretLastParsed || !interpretLastParsed.fields || !interpretLastParsed.fields.length) {
    toast('No interpreted output to submit. Run and save interpretation first.');
    return;
  }
  var formId = getJotFormFormId();
  var apiKey = getJotFormApiKey();
  if (!formId) { toast('Add JotForm Form ID in More → Interpret Settings.'); return; }
  if (!apiKey) { toast('Add JotForm API Key in More → Interpret Settings.'); return; }
  var fieldMap = getJotFormFieldMap();
  if (!Object.keys(fieldMap).length) {
    toast('Configure JotForm field mapping in More → Interpret Settings first.');
    return;
  }
  var body = buildJotFormBody(interpretLastParsed.fields, fieldMap);
  if (!body) { toast('No fields matched the mapping — check your field map config.'); return; }

  var submitBtn = document.getElementById('interp-jotform-submit-btn');
  var statusEl = document.getElementById('interp-jotform-status');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Submitting…'; }
  if (statusEl) { statusEl.textContent = ''; statusEl.style.display = 'none'; }

  fetch('https://api.jotform.com/form/' + encodeURIComponent(formId) + '/submissions?apiKey=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!statusEl) return;
    statusEl.style.display = 'block';
    if (data && (data.responseCode === 200 || data.message === 'success')) {
      statusEl.style.color = '#4caf50';
      statusEl.textContent = '✓ Submitted to JotForm successfully!';
      toast('JotForm submission sent!');
    } else {
      statusEl.style.color = '#e03333';
      statusEl.textContent = '✗ JotForm error: ' + (data.message || JSON.stringify(data));
    }
  })
  .catch(function(e) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = '#e03333';
      statusEl.textContent = '✗ Network error: ' + e.message;
    }
    toast('JotForm submit failed: ' + e.message);
  })
  .finally(function() {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '📤 Submit to JotForm'; }
  });
}

// ── INTERPRET ARCHIVE ─────────────────────────────────────────
// Opens a previously-saved interpretation from the Audits tab.
// Hydrates S from the record without switching to the voice tab,
// then switches directly to the Interpret tab and renders the stored output.
function openInterpArchive(id) {
  var saved = typeof getSaved === 'function' ? getSaved() : [];
  var rec = saved.find(function(a) { return a.id === id; });
  if (!rec || !rec.interpretedOutput) {
    if (typeof toast === 'function') toast('No interpretation saved for this audit.');
    return;
  }
  // Hydrate S (same fields as loadAudit but no tab switch)
  if (typeof S !== 'undefined') {
    S.name = rec.customer.name || '';
    S.address = rec.customer.address || '';
    S.date = rec.customer.date || '';
    S.year = rec.customer.yearBuilt || '';
    S.sqft = rec.customer.sqFt || '';
    S.coop = rec.customer.coop || '';
    S.dump = rec.voiceDump || '';
    S.photos = rec.photos || [];
    S.auditId = rec.id;
    S.tcSignature = rec.tcSignature || null;
    if (typeof save === 'function') save();
  }
  interpretLastParsed = rec.interpretedOutput;
  interpretLastMeta = rec.interpretedOutput.interpretMeta || null;
  interpretDirty = false;

  // Switch to Interpret tab
  document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tabpanel').forEach(function(p) { p.style.display = 'none'; });
  var interpBtn = document.querySelector('[data-tab="interpret"]');
  var interpPanel = document.getElementById('tab-interpret');
  if (interpBtn) interpBtn.classList.add('active');
  if (interpPanel) interpPanel.style.display = 'block';

  renderInterpretInfo();
  renderInterpretOutput(interpretLastParsed);
  renderInterpretClarifications(interpretLastParsed);
  renderInterpretFlags(interpretLastParsed);

  var saveCard = document.getElementById('interp-save-card');
  if (saveCard) saveCard.style.display = 'block';
  var workflow = document.getElementById('interp-workflow-card');
  if (workflow) workflow.style.display = 'block';
  setInterpretCopyMode(true);
  updateInterpSaveStatus(true);

  if (interpretLastMeta) {
    var tokenEl = document.getElementById('interp-token-usage');
    if (tokenEl) {
      var inTok = interpretLastMeta.input_tokens || 0;
      var outTok = interpretLastMeta.output_tokens || 0;
      tokenEl.textContent = 'Tokens: ' + inTok.toLocaleString() + ' in / ' + outTok.toLocaleString() + ' out (' + (inTok + outTok).toLocaleString() + ' total) — archived';
      tokenEl.style.display = 'block';
    }
  }
  if (typeof toast === 'function') toast('Loaded interpretation: ' + (rec.customer.name || 'audit'));
}
