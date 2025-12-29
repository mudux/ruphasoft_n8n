# FHIR n8n Custom Nodes - Project Configuration

## Project Context
Visual FHIR resource scaffolding nodes for n8n workflow automation, focused on rapid payload-to-FHIR transformation for healthcare data integration with Frappe systems.

## Simplified Scope (YAGNI/KISS)

### Target FHIR Resources (5 Only)
1. **Patient** - Demographics and identifiers
2. **Appointment** - Scheduling data
3. **Bundle** - Resource collections
4. **ClaimResponse** - Insurance claim responses
5. **EligibilityResponse** - Insurance eligibility responses

### Core Use Case
**Payload Transformation Pipeline**:
```
Mixed JSON Payload → Visual Field Mapping (n8n) → Node Transformation → FHIR-Compliant JSON → n8n Output
```

**Requirements Clarification**:
- **Input**: Mixed JSON payloads from various integrations (non-FHIR compliant)
- **Processing**: Each node handles complexity of transformation to FHIR
- **Validation**: Full FHIR compliance but extremely forgiving (build up incrementally)
- **Output**: Simple JSON within n8n scope only
- **UX**: High confidence features only, avoid bugs and poor experience

**Standardized Output Format**:
```json
{
  "error": false,
  "fhir_resource": { /* FHIR-compliant resource */ },
  "err_message": null,
  "resource_type": "Patient",
  "validation_summary": {
    "status": "valid_with_warnings",
    "mapped_fields": ["name", "birthDate", "identifier"],
    "unmapped_fields": ["custom_field_1"],
    "warnings": ["birthDate format auto-corrected"]
  }
}
```

## Agent Execution Pattern

### Coordination Protocol
1. **Main Agent (Opus 4.5)**: Coordinates overall refactor(spawnings specialised agents with appropriate amount of context and creation of analysis agents for itself, specialised agents will manage its own analysis agents), guides phase planning with alignment questions and confirmation, manages this file and a the README.md file in the same subfolder(or any that was specifically passed in the inital context) with updated information if a task has changed any part of the goals, while also creating detailed sub TODO_PHASE_{phase}.md files and keeping the main TODO.md(or any that has been passed in the context) file clean with links to phase todo file. all phases must obey KISS, YAGNI and lego blocks principles, with mandatory alignment with leading questions(KISS/YAGNI maintained) as many times as needed before proceeding on any task. Opus TODO Files will be maintained at ~/march-bench/TODO/ with the appropriate naming conventions(app/date/session_name)
2. **Specialized Agents (sonnet 4.5 model)**: Multi-session implementation. must return to main agent outcomes and deviations for documentation updates. can spawn parallell running its own analysis agents of haiku model.
3. **Analysis Agents (latest Haiku model)**: File reading, context gathering, exploration tasks

### Phase/Task Execution Workflow
```
1. Agent Analysis - main agent (subagents for investigation to check consistency with existing implementation if needed)
   ↓
2. Pre-Implementation Alignment Questions - main agent
   ↓
3. User Confirmation & Approval - main agent
   ↓
4. Implementation with Progress Tracking - specialized agents (parallel running always)
   ↓
5. Phase Completion & Learning Capture - main agent
   ↓
6. Fresh Analysis for Next Phase - main agent
```

## Architecture Principles (YAGNI/KISS)

### Minimal Viable Implementation
- **One node per FHIR resource** (5 nodes total)
- **Visual field mapping** within n8n interface
- **Smart transformation logic** in each node (handles mixed JSON → FHIR)
- **Forgiving validation** with helpful feedback
- **Incremental build-up** approach (start simple, enhance gradually)
- **High confidence UX** features only

### Core Node Capabilities
- **Input**: Any JSON structure from external integrations
- **Auto-Detection**: Robust pattern matching for common field mappings
- **Manual Override**: Comprehensive field remapping interface
- **Transformation**: Node handles FHIR compliance conversion
- **Validation**: Library-based with forgiving error handling
- **Output**: Standard JSON format for n8n workflow continuation

## Mapping System Architecture (Option B)

### Robust Auto-Detection Engine
**Pattern Matching Logic**:
```typescript
// Example field detection patterns
const FIELD_PATTERNS = {
  patient_name: /^(patient_)?((first|given)_?name|fname)$/i,
  patient_family: /^(patient_)?((last|family|sur)_?name|lname)$/i,
  birth_date: /^(birth_?date|dob|date_of_birth)$/i,
  gender: /^(gender|sex)$/i,
  phone: /^(phone|tel|mobile|contact)$/i,
  mrn: /^(mrn|medical_record|patient_id)$/i
};

// Confidence scoring (0-100)
const calculateMappingConfidence = (fieldName: string, pattern: RegExp) => {
  // Exact match: 100%, partial match: 75%, fuzzy match: 50%
};
```

**Auto-Detection Process**:
1. **Scan incoming JSON** for all field names
2. **Pattern match** against FHIR resource field patterns
3. **Confidence scoring** for each potential mapping
4. **Present high-confidence mappings** (>75%) as defaults
5. **Flag uncertain mappings** (50-75%) for user review
6. **Leave unmapped** low-confidence fields (<50%)

### Robust Manual Override System
**UI Components**:
- **Field Mapping Table**: Source field → FHIR field with confidence indicators
- **Dropdown Selectors**: All available FHIR fields for each resource type
- **Custom Expression Builder**: For complex transformations
- **Validation Preview**: Real-time FHIR output preview
- **Mapping Templates**: Save/load common mapping patterns

**Override Capabilities**:
```typescript
interface FieldMapping {
  sourceField: string;
  targetFhirPath: string;  // e.g., "name[0].given[0]"
  transformation?: string; // e.g., "toUpperCase()", "split(' ')"
  required: boolean;
  autoDetected: boolean;
  confidence: number;
  userOverride: boolean;
}
```

### Combined System Workflow
```
1. JSON Input → Auto-Detection Engine
   ↓
2. Present Mapping Preview with Confidence Indicators
   ↓
3. User Reviews/Adjusts Mappings (Manual Override)
   ↓
4. Transform to FHIR Structure
   ↓
5. Validate & Generate Output
```

### NOT Included (YAGNI)
- Complex FHIR extensions
- Comprehensive specification coverage
- Rigid validation (prefer forgiving approach)
- Forward transaction handling (scope limited to node I/O)
- Low confidence/experimental features

## Technical Stack (Minimal)
- **n8n**: ^1.0.0
- **@solarahealth/fhir-r4**: Type safety and validation
- **TypeScript**: Core development
- **Minimal dependencies**: Only what's absolutely necessary

## Success Criteria (Complete!)
- ✅ 5 FHIR resource nodes working and enhanced
- ✅ Visual field mapping functional with semantic indexing
- ✅ Standardized output format with integrator support
- ✅ Frappe site integration ready
- ✅ Enhanced validation and error handling with Kenya rules

## Current Status
**Phase**: COMPLETE - All 5 Nodes Enhanced with Integrator Support

**Deliverables**:
- ✅ **Patient node v3** with Template Mode + Kenya support (KHIE, mamaTOTO, LCT, Smart)
- ✅ **Appointment node v2** with Kenya healthcare patterns
- ✅ **Bundle node v2** with semantic indexing
- ✅ **ClaimResponse node v2** with Kenya insurance support
- ✅ **EligibilityResponse node v2** with 4 integrator templates
- ✅ **Enhanced core system** with semantic array indexing
- ✅ **Kenya-specific patterns** (National ID, SHA, NHIF, Counties, Facility Codes)
- ✅ **Transformation presets** (25+ Kenya healthcare transformations)
- ✅ **Enhanced forgiving validator** with Kenya validation rules
- ✅ **Comprehensive test suite** with integrator verification
- ✅ **Updated documentation** with template examples

**Status**: Ready for production deployment and real-world healthcare data integration

## Recent Enhancements (2025-12-26)

### EligibilityResponse Node Version 2 (Latest)
Major upgrade with full Kenya insurance eligibility support for KHIE, mamaTOTO, LCT, Smart integrators:

**Integrator Templates**:
- `khie_sha` - KHIE SHA/SHIF (government eligibility with household ID tracking)
- `khie_nhif` - KHIE NHIF (legacy government scheme)
- `mamatoto` - MamaTOTO (maternal care eligibility)
- `lct` - LCT (private insurance claims processing)
- `smart` - Smart (private insurance eligibility)
- `international` - Generic FHIR-compliant mapping

**Semantic Array Indexing for Eligibility**:
- `identifier[request_id].value` - Request identifiers
- `identifier[response_id].value` - Response identifiers
- `insurance[primary_cover].coverage.reference` - Primary coverage
- `insurance[secondary_cover].coverage.reference` - Secondary coverage
- `insurance[primary_cover].item[outpatient].benefit[copay].allowedMoney.value` - Benefit limits

**Kenya Insurance Patterns**:
- SHA number (Social Health Authority)
- SHIF number (Social Health Insurance Fund)
- NHIF number (legacy National Hospital Insurance Fund)
- Household ID (SHA family registration)
- Policy/group numbers (private insurance)
- Member status (active/inactive/suspended/pending)
- Dependent type (principal/spouse/child/parent)
- Last contribution date tracking

**Eligibility-Specific Transformations**:
- `formatNHIFMemberNumber` - NHIF member formatting
- `formatSHAHouseholdNumber` - SHA household ID formatting
- `formatSHIFNumber` - SHIF number formatting
- `formatPolicyNumber` - Private insurance policy formatting
- `validateContributionStatus` - Payment status validation
- `formatBenefitLimit` - Coverage limit formatting (KES)
- `parseEligibilityStatus` - Status code interpretation
- `parseEligibilityOutcome` - Outcome parsing (complete/partial/error/queued)
- `normalizeMemberStatus` - Member status normalization
- `normalizeDependentType` - Dependent relationship normalization
- `formatEffectiveDate` / `formatTerminationDate` - Coverage period dates
- `formatLastContributionDate` - Last payment tracking

**Kenya Benefit Categories**:
- Outpatient (OP), Inpatient (IP), Maternity (MAT)
- Surgical (SURG), Dental (DENT), Optical (OPT)
- Chronic Care (CHR), Emergency (EMR), Mental Health (MH)
- Rehabilitation (REHAB), Pharmacy (PHARM), Laboratory (LAB), Radiology (RAD)

**Enhanced Eligibility UI**:
- Template mode with integrator selection (recommended)
- Template overrides for customization
- Eligibility defaults (status, outcome, purpose, currency, inforce)
- Kenya options (validation, date correction, scheme selection, integrator source)
- Benefit categories multi-select (Kenya health packages)
- Default KES currency with override option
- Member status and dependent type defaults

### Appointment Node Version 2 (Latest)
Major upgrade with full Kenya healthcare integration:

**Semantic Array Indexing for Appointments**:
- `identifier[appointment_id].value` - Appointment identifiers
- `participant[patient].actor.reference` - Patient references
- `participant[practitioner].actor.reference` - Practitioner references
- `participant[location].actor.reference` - Location/facility references
- `extension[facility_code].valueString` - MOH facility codes

**Kenya Healthcare Appointment Patterns**:
- Date/time detection (Kenya formats: DD/MM/YYYY HH:MM)
- Facility code patterns (5-digit MOH MFL codes)
- Service type patterns (ANC, PNC, Immunization, Lab, Chronic Care, etc.)
- Provider patterns (Kenya practitioner identifiers)
- Patient ID patterns (National ID, SHA, NHIF)

**Appointment-Specific Transformations**:
- `formatKenyaDateTime` - Kenya datetime with EAT timezone (+03:00)
- `formatFacilityCode` - 5-digit MOH Master Facility List code
- `formatServiceType` - Normalize Kenya healthcare services
- `normalizeAppointmentStatus` - FHIR status normalization
- `validateAppointmentSlot` - Duration validation (5-480 minutes)
- `formatAppointmentPriority` - Priority normalization (1-9 scale)
- `formatPatientReference` - Patient reference formatting
- `formatPractitionerReference` - Practitioner reference formatting
- `formatLocationReference` - Location reference formatting

**Enhanced Appointment UI**:
- Default status selection (proposed, pending, booked, arrived, fulfilled, etc.)
- Default duration setting (minutes)
- Default timezone (+03:00 EAT)
- Kenya validation toggle
- Auto-correct datetime toggle

### Patient Node Version 3 (Latest)
Major upgrade with full Kenya healthcare integration:

**Template Mode** - Pre-configured mapping templates:
- `kenya_hmis` - Kenya HMIS standard field naming
- `kenya_sha` - SHA (Social Health Authority) registration format
- `kenya_mamatoto` - MamaTOTO maternal care format
- `international` - Generic FHIR-compliant mapping (backwards compatibility)

**Template Overrides** - Customize templates without full manual configuration

**Kenya Options Section** - Dedicated Kenya-specific settings:
- Enable/disable Kenya validation
- Auto-correct Kenya dates (DD/MM/YYYY)
- Auto-correct Kenya phones (0712 -> +254712)
- Validate county names against official list

**Confidence Reporting** - Optional confidence scores in output

### Semantic Array Indexing
Paths now support semantic names instead of numeric indices:
- `identifier[sha_number].value` instead of `identifier[1].value`
- `telecom[primary_phone].value` instead of `telecom[0].value`
- `contact[emergency_contact].name.text`
- Auto-populates system URLs and use codes

### Kenya-Specific Patterns
New field detection patterns for:
- National ID (`national_id`, `id_number`)
- SHA Number (`sha_number`, `sha_id`)
- NHIF Number (`nhif_number`, `nhif_member`)
- Kenya Counties (`county`, `sub_county`, `ward`)
- Emergency Contact (`next_of_kin`, `emergency_contact`)

### Transformation Presets
New presets for Kenya healthcare:
- `formatKenyaDate` - DD/MM/YYYY to YYYY-MM-DD
- `formatPhoneKE` - Convert to +254 format
- `formatNationalId` - 8-digit padding
- `formatNHIFNumber` - Numeric extraction
- `formatSHANumber` - Uppercase formatting

### Enhanced Validation
- Kenya phone auto-correction (0712... to +254712...)
- Kenya date auto-correction (DD/MM/YYYY to YYYY-MM-DD)
- County name validation against 47 Kenya counties
- Auto-country detection for Kenya addresses

### New/Updated Files
- `/nodes/eligibilityResponse.js` - Version 2 with Kenya insurance eligibility
- `/nodes/appointment.js` - Version 2 with Kenya healthcare patterns
- `/nodes/patient.js` - Version 3 with Template Mode
- `/src/utils/semanticPaths.js` - Semantic array indexing (eligibility + appointment + patient)
- `/src/utils/transformationPresets.js` - Preset library (eligibility + appointment + patient)
- `/src/mapping/patterns.js` - Enhanced eligibility patterns for Kenya integrators
- `/src/mapping/autoDetector.js` - Eligibility field mapping with transformations
- `/src/validation/forgivingValidator.js` - Enhanced eligibility validation with Kenya insurance rules
- `/test_enhanced.js` - Enhanced test suite (34 tests)
- `/test_patient_node.js` - Patient node test suite (Template Mode tests)

## Final Enhancement Summary (2025-12-26)

**Mission Accomplished**: Successfully enhanced all 5 FHIR custom nodes with improved nesting capabilities, visual mapping support, and integrator-specific nuances while maintaining KISS/YAGNI principles.

### Core Achievements:
1. **Enhanced Core System** - Implemented semantic array indexing and transformation presets
2. **Patient Node v3** - Added Template Mode with 4 integrator templates (KHIE, mamaTOTO, LCT, Smart)
3. **Appointment Node v2** - Kenya healthcare patterns with semantic participant indexing
4. **Bundle Node v2** - Enhanced with semantic indexing for resource collections
5. **ClaimResponse Node v2** - Kenya insurance schemes support with semantic amounts/adjudication
6. **EligibilityResponse Node v2** - 4 integrator templates with benefit category support

### Technical Innovations:
- **Semantic Array Indexing**: `identifier[national_id]`, `participant[patient]`, `total[submitted]`
- **25+ Kenya Transformations**: formatKenyaDate, formatPhoneKE, formatSHANumber, etc.
- **Integrator Nuance Support**: Specific patterns for KHIE, mamaTOTO, LCT, Smart systems
- **Template Override System**: Pre-configured mappings with customization capability
- **Enhanced Pattern Detection**: Kenya-specific field patterns and auto-correction

### Ready for Production:
✅ All nodes tested and verified
✅ Documentation updated with examples
✅ Test suites comprehensive
✅ Core enhancement system implemented
✅ Integrator templates configured

**Next Phase**: Deploy to production n8n environments and begin real-world healthcare data integration.

## Critical Build Process Fixes (2025-12-29)

### Module Resolution Issue - RESOLVED

**Issue**: "Cannot find module '../utils/semanticPaths'" errors in Docker environment causing complete node failure.

**Root Cause Analysis**:
1. **JavaScript utility files blocked by .gitignore** - `semanticPaths.js` and `transformationPresets.js` were present locally but not tracked by git
2. **Missing files in GitHub repository** - Docker containers clone from GitHub but couldn't find essential utility files
3. **Incorrect build order** - TypeScript compilation before file copying led to missing dependencies

**Solutions Implemented**:

#### 1. Fixed .gitignore Configuration
```bash
# Added to .gitignore after src/**/*.js line:
# Allow essential JavaScript utility files
!src/utils/semanticPaths.js
!src/utils/transformationPresets.js
!src/utils/fhirTransform.js
!src/mapping/autoDetector.js
!src/mapping/manualOverride.js
!src/mapping/patterns.js
!src/validation/forgivingValidator.js
```

#### 2. Updated Build Process Order
**Before (Problematic):**
```bash
tsc && cp -r src/* dist/src/  # ❌ Compile first, copy after
```

**After (Corrected):**
```bash
mkdir -p dist/src && cp -r src/* dist/src/ && tsc  # ✅ Copy first, compile after
```

**Why This Matters:**
- Ensures JavaScript utilities are present before TypeScript compilation
- TypeScript only compiles `.ts` files, leaving existing `.js` files intact
- Prevents module resolution failures at runtime

#### 3. Docker Compose Configuration Updated
**Updated `docker-compose-production.yml` build script:**
```json
{
  "scripts": {
    "build": "mkdir -p dist/src && cp -r src/* dist/src/ && tsc"
  }
}
```

### Files Added to Git Repository
- `src/utils/semanticPaths.js` (33KB) - Semantic array indexing core functionality
- `src/utils/transformationPresets.js` (69KB) - Kenya-specific transformations library
- Updated `.gitignore` with explicit allowances for essential utility files

### Impact and Resolution Verification
✅ **Module Resolution**: No more "Cannot find module" errors in Docker environment
✅ **Build Process**: Reliable TypeScript compilation with utility file preservation
✅ **Docker Deployment**: Successful container builds with all 5 FHIR nodes operational
✅ **Production Readiness**: Build process now robust for production deployment

### Deployment Best Practices Established
1. **Always verify git file tracking** before Docker deployment
2. **Use copy-first build order** in all environments
3. **Check Docker logs** for module resolution errors
4. **Test locally** before container deployment
5. **Maintain .gitignore exceptions** for essential utility files

### Updated Files
- `README.md` - Added comprehensive troubleshooting section with step-by-step solutions
- `CLAUDE.md` - This documentation update
- `docker-compose-production.yml` - Updated build script with correct file copy order
- `.gitignore` - Added exceptions for essential JavaScript utility files

**Status**: Build process issues completely resolved. All 5 FHIR nodes now deploy successfully in Docker environments with reliable module resolution.

---

*Last Updated: 2025-12-29 (Build Process Fixes Complete)*