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

## Success Criteria (Simple)
- [ ] 5 FHIR resource nodes working
- [ ] Visual field mapping functional
- [ ] Standardized output format
- [ ] Frappe site integration ready
- [ ] Basic validation and error handling

## Current Status
**Phase**: Implementation Complete - Ready for Testing

**Deliverables**:
- ✅ Patient node with auto-detection + manual override
- ✅ Forgiving validation system
- ✅ GitHub installation capability
- ✅ Docker testing framework
- ✅ Core transformation pipeline

**Next**: Deploy and test remaining 4 FHIR resources (Appointment, Bundle, ClaimResponse, EligibilityResponse)

---

*Last Updated: 2025-12-17*