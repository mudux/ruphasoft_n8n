# FHIR R4 Resource Specifications for n8n Node Development

**Analysis Date**: 2025-12-15
**Source**: RUPHAsoft HMIS FHIR Implementation
**Purpose**: Guide dynamic n8n node creation for FHIR R4 resources

---

## Executive Summary

This document analyzes FHIR R4 resource specifications from the RUPHAsoft HMIS codebase to guide the creation of dynamic n8n nodes. The analysis covers 9 core FHIR resources with field complexity classifications, validation requirements, and implementation priorities.

**Key Findings**:
- 3 complexity tiers identified (Simple, Complex, Advanced)
- 18+ identifier types across Patient resource alone
- Standardized patterns for CodeableConcept, Reference, and Identifier fields
- Database-driven configuration system already in place

---

## Table of Contents

1. [FHIR Resource Priority Matrix](#1-fhir-resource-priority-matrix)
2. [Core Data Type Patterns](#2-core-data-type-patterns)
3. [Resource Specifications](#3-resource-specifications)
4. [Field Complexity Classification](#4-field-complexity-classification)
5. [Validation Requirements](#5-validation-requirements)
6. [n8n Node Generation Strategy](#6-n8n-node-generation-strategy)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. FHIR Resource Priority Matrix

### Priority 1: Foundation Resources (Implement First)
High usage, minimal dependencies, stable structure.

| Resource | Use Case | Complexity | Dependencies | Est. Fields |
|----------|----------|------------|--------------|-------------|
| **Patient** | Demographics, identifiers | Medium | None | 20-25 |
| **Organization** | Healthcare facilities | Low | None | 12-15 |
| **Practitioner** | Healthcare providers | Low | None | 15-18 |

**Rationale**: These resources have no dependencies and are referenced by all other resources. Patient is critical for HIE integration with 18+ identifier types.

### Priority 2: Clinical Context Resources
Define clinical episodes and encounters.

| Resource | Use Case | Complexity | Dependencies | Est. Fields |
|----------|----------|------------|--------------|-------------|
| **Encounter** | Visits, consultations | Medium | Patient, Practitioner, Organization | 18-22 |
| **EpisodeOfCare** | Care episodes, admissions | Medium | Patient, Practitioner, Organization | 15-20 |

**Rationale**: Core to clinical workflows. Encounter has complex status mappings (10+ Frappe statuses → 8 FHIR statuses).

### Priority 3: Clinical Data Resources
Capture clinical observations and results.

| Resource | Use Case | Complexity | Dependencies | Est. Fields |
|----------|----------|------------|--------------|-------------|
| **Observation** | Vital signs, lab results | High | Patient, Encounter, Practitioner | 25-40 |

**Rationale**: Most complex resource with dynamic component arrays, LOINC coding, and multiple observation categories (vital signs, lab, SOAP notes, imaging).

### Priority 4: Pharmaceutical Resources
Medication management.

| Resource | Use Case | Complexity | Dependencies | Est. Fields |
|----------|----------|------------|--------------|-------------|
| **Medication** | Drug definitions | Medium | Organization (manufacturer) | 15-20 |
| **MedicationRequest** | Prescriptions | High | Patient, Practitioner, Medication, Encounter | 30-35 |

**Rationale**: Complex dosage instructions, timing patterns, and formulary validation. Consider after core resources stable.

### Priority 5: Financial Resources
Insurance and billing.

| Resource | Use Case | Complexity | Dependencies | Est. Fields |
|----------|----------|------------|--------------|-------------|
| **Coverage** | Insurance coverage | Medium | Patient, Organization | 15-20 |
| **Claim** | Insurance claims | Very High | Patient, Organization, Coverage, Encounter, EpisodeOfCare | 40-50 |
| **ClaimResponse** | Claim adjudication | Very High | Claim | 35-45 |

**Rationale**: Implement last due to high complexity and dependency on all other resources. Claim has nested item structures with interventions, diagnoses, and supporting info.

---

## 2. Core Data Type Patterns

### 2.1 Simple Field Types (Direct Mapping)

**Direct JSON primitives** - no special handling required.

```typescript
// String fields
{
  fieldname: "given_name",
  label: "Given Name",
  type: "string",
  required: false,
  maxLength: 255
}

// Date fields
{
  fieldname: "birth_date",
  label: "Date of Birth",
  type: "dateTime",
  required: true,
  format: "YYYY-MM-DD"
}

// Boolean fields
{
  fieldname: "active",
  label: "Active",
  type: "boolean",
  default: true
}

// Numeric fields
{
  fieldname: "sequence",
  label: "Sequence",
  type: "number",
  required: true
}
```

**Implementation**: Standard n8n input types.

---

### 2.2 CodeableConcept Pattern (Complex Object)

**Structure**: Text description + array of coded values from terminologies.

```json
{
  "coding": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
      "code": "NI",
      "display": "National Identifier"
    }
  ],
  "text": "National Identifier"
}
```

**n8n UI Design**:
```typescript
// Option 1: Simplified input (most common use case)
{
  fieldname: "identifier_type",
  label: "Identifier Type",
  type: "options",
  options: [
    { name: "National ID", value: "NI" },
    { name: "Medical Record", value: "MR" },
    { name: "Passport", value: "PPN" }
  ],
  hint: "Automatically generates FHIR CodeableConcept with HL7 v2-0203 system"
}

// Option 2: Advanced mode (for custom coding systems)
{
  fieldname: "custom_coding",
  label: "Custom Coding",
  type: "collection",
  default: {},
  options: [
    { displayName: "System", name: "system", type: "string", required: true },
    { displayName: "Code", name: "code", type: "string", required: true },
    { displayName: "Display", name: "display", type: "string" }
  ]
}
```

**Common Terminologies**:
- `http://terminology.hl7.org/CodeSystem/v2-0203` - Identifier types (28+ codes)
- `http://loinc.org` - Lab/observation codes (90,000+ codes)
- `http://snomed.info/sct` - Clinical terminology (350,000+ concepts)
- `http://terminology.hl7.org/CodeSystem/subscriber-relationship` - Patient relationships

---

### 2.3 Reference Pattern (Resource Links)

**Structure**: Links to other FHIR resources with optional embedded identifier.

```json
{
  "reference": "Patient/12345",
  "type": "Patient",
  "display": "John Doe",
  "identifier": {
    "system": "https://facility.com/fhir/identifier/shanumber",
    "value": "12345",
    "use": "official"
  }
}
```

**n8n UI Design**:
```typescript
// Option 1: Simple reference (most common)
{
  fieldname: "patient",
  label: "Patient",
  type: "resourceSelect",
  resourceType: "Patient",
  required: true,
  hint: "Select or search for patient"
}

// Option 2: Manual reference (for external resources)
{
  fieldname: "patient_reference",
  label: "Patient Reference",
  type: "string",
  placeholder: "Patient/12345",
  required: true,
  hint: "FHIR resource reference (ResourceType/ID)"
}
```

**Reference Types by Resource**:
- Patient → None (root resource)
- Encounter → Patient, Practitioner, Organization, EpisodeOfCare
- Observation → Patient, Encounter, Practitioner
- Claim → Patient, Organization, Coverage, Encounter

---

### 2.4 Identifier Pattern (Business Identifiers)

**Structure**: System + value + use + optional type.

```json
{
  "use": "official",
  "system": "https://facility.com/fhir/identifier/shanumber",
  "value": "SHA-2025-001234",
  "type": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
      "code": "NI",
      "display": "National Identifier"
    }]
  }
}
```

**n8n UI Design**:
```typescript
// Collection of identifiers (array)
{
  fieldname: "identifiers",
  label: "Identifiers",
  type: "fixedCollection",
  typeOptions: {
    multipleValues: true
  },
  default: {},
  options: [
    {
      displayName: "Identifier",
      name: "identifier",
      values: [
        { displayName: "Type", name: "type", type: "options", options: IDENTIFIER_TYPES },
        { displayName: "Value", name: "value", type: "string", required: true },
        { displayName: "Use", name: "use", type: "options",
          options: ["official", "usual", "temp", "secondary"], default: "official" }
      ]
    }
  ]
}
```

**Identifier Types (HL7 v2-0203)**:
- `NI` - National Identifier (passport, national ID)
- `MR` - Medical Record Number
- `PPN` - Passport Number
- `DL` - Driver's License
- `TAX` - Tax ID Number
- `MB` - Member Number (insurance)
- `BR` - Birth Registry Number
- `SS` - Social Security Number

---

### 2.5 Period Pattern (Date Ranges)

**Structure**: Start and end dates for validity periods.

```json
{
  "start": "2025-01-01",
  "end": "2025-12-31"
}
```

**n8n UI Design**:
```typescript
{
  fieldname: "coverage_period",
  label: "Coverage Period",
  type: "collection",
  default: {},
  options: [
    { displayName: "Start Date", name: "start", type: "dateTime", required: true },
    { displayName: "End Date", name: "end", type: "dateTime" }
  ]
}
```

---

### 2.6 Quantity Pattern (Measurements)

**Structure**: Value + unit + system + code.

```json
{
  "value": 98.6,
  "unit": "°F",
  "system": "http://unitsofmeasure.org",
  "code": "[degF]"
}
```

**n8n UI Design**:
```typescript
{
  fieldname: "temperature",
  label: "Temperature",
  type: "collection",
  default: {},
  options: [
    { displayName: "Value", name: "value", type: "number", required: true },
    { displayName: "Unit", name: "unit", type: "options",
      options: ["°F", "°C", "kg", "lbs", "cm", "in"], required: true }
  ],
  hint: "Automatically converts to UCUM code"
}
```

---

## 3. Resource Specifications

### 3.1 Patient Resource

**Purpose**: Patient demographics and identifiers
**Complexity**: Medium (18+ identifier types, complex name/contact patterns)
**Dependencies**: None
**FHIR Profile**: http://hl7.org/fhir/R4/patient.html

#### Required Fields
```typescript
{
  // Minimal valid Patient
  resourceType: "Patient",
  identifier: [
    {
      use: "official",
      system: "https://facility.com/fhir/identifier/shanumber",
      value: "SHA-2025-001234"
    }
  ],
  name: [
    {
      use: "official",
      family: "Doe",
      given: ["John", "Michael"]
    }
  ],
  gender: "male", // male | female | other | unknown
  birthDate: "1990-01-15"
}
```

#### Identifier Priority Chain (RUPHAsoft Implementation)
From `/fhir/patient_resource.py`:

```python
# Priority order for HIE integration (Kenya)
PATIENT_IDENTIFIER_PRIORITY = [
    "sha_number",           # 1. Social Health Authority (HIE primary)
    "mamatoto_id",          # 2. MamaToto HIE
    "national_id",          # 3. National ID (Government)
    "birth_certificate_no", # 4. Birth Certificate (minors)
    "default_insurance_no", # 5. Insurance number
    "passport_number",      # 6. Passport (foreign nationals)
    "kra_pin",              # 7. Tax authority PIN
    "mobile",               # 8. Mobile phone (contact matching)
    "name"                  # 9. Internal system ID (fallback)
]
```

#### n8n Field Configuration
```typescript
const patientFields: INodeProperties[] = [
  // Identifiers (Priority-based collection)
  {
    displayName: "Identifiers",
    name: "identifiers",
    type: "fixedCollection",
    typeOptions: { multipleValues: true },
    default: {},
    options: [
      {
        displayName: "Identifier",
        name: "identifier",
        values: [
          {
            displayName: "Type",
            name: "type",
            type: "options",
            options: [
              { name: "SHA Number (Kenya HIE)", value: "sha_number" },
              { name: "National ID", value: "national_id" },
              { name: "Passport", value: "passport_number" },
              { name: "Birth Certificate", value: "birth_certificate_no" },
              { name: "Insurance Number", value: "insurance_no" },
              { name: "Medical Record Number", value: "internal" }
            ],
            default: "sha_number"
          },
          {
            displayName: "Value",
            name: "value",
            type: "string",
            required: true
          },
          {
            displayName: "Use",
            name: "use",
            type: "options",
            options: ["official", "usual", "temp", "secondary"],
            default: "official"
          }
        ]
      }
    ]
  },

  // Demographics
  {
    displayName: "Family Name",
    name: "family_name",
    type: "string",
    required: true
  },
  {
    displayName: "Given Names",
    name: "given_names",
    type: "string",
    required: true,
    hint: "Comma-separated: John, Michael"
  },
  {
    displayName: "Gender",
    name: "gender",
    type: "options",
    options: [
      { name: "Male", value: "male" },
      { name: "Female", value: "female" },
      { name: "Other", value: "other" },
      { name: "Unknown", value: "unknown" }
    ],
    required: true
  },
  {
    displayName: "Birth Date",
    name: "birthDate",
    type: "dateTime",
    required: true
  },

  // Contact Information (Optional)
  {
    displayName: "Mobile Phone",
    name: "mobile",
    type: "string",
    placeholder: "+254712345678"
  },
  {
    displayName: "Email",
    name: "email",
    type: "string"
  }
];
```

---

### 3.2 Observation Resource

**Purpose**: Clinical observations, vital signs, lab results
**Complexity**: High (dynamic components, LOINC codes, multiple categories)
**Dependencies**: Patient, Encounter (optional), Practitioner (optional)
**FHIR Profile**: http://hl7.org/fhir/R4/observation.html

#### Required Fields
```typescript
{
  resourceType: "Observation",
  status: "final", // registered | preliminary | final | amended
  category: [
    {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/observation-category",
        code: "vital-signs",
        display: "Vital Signs"
      }]
    }
  ],
  code: {
    coding: [{
      system: "http://loinc.org",
      code: "8867-4",
      display: "Heart rate"
    }]
  },
  subject: {
    reference: "Patient/12345",
    type: "Patient"
  },
  effectiveDateTime: "2025-12-15T10:30:00+03:00"
}
```

#### Observation Categories
```typescript
const OBSERVATION_CATEGORIES = [
  { name: "Vital Signs", value: "vital-signs" },
  { name: "Laboratory", value: "laboratory" },
  { name: "Imaging", value: "imaging" },
  { name: "Social History", value: "social-history" },
  { name: "Exam", value: "exam" },
  { name: "Procedure", value: "procedure" },
  { name: "Survey", value: "survey" },
  { name: "Therapy", value: "therapy" },
  { name: "Activity", value: "activity" }
];
```

#### LOINC Code Mappings (from RUPHAsoft)
```python
# Vital Signs LOINC Codes
VITAL_SIGNS_LOINC = {
    "temperature": {"code": "8310-5", "display": "Body temperature"},
    "pulse": {"code": "8867-4", "display": "Heart rate"},
    "respiratory_rate": {"code": "9279-1", "display": "Respiratory rate"},
    "bp_systolic": {"code": "8480-6", "display": "Systolic blood pressure"},
    "bp_diastolic": {"code": "8462-4", "display": "Diastolic blood pressure"},
    "spo2": {"code": "59408-5", "display": "Oxygen saturation"},
    "height": {"code": "8302-2", "display": "Body height"},
    "weight": {"code": "29463-7", "display": "Body weight"},
    "bmi": {"code": "39156-5", "display": "Body mass index"},
    "head_circumference": {"code": "9843-4", "display": "Head circumference"}
}
```

#### Component Array (Multi-part Observations)
```typescript
// Example: Blood Pressure (Systolic + Diastolic)
{
  resourceType: "Observation",
  code: {
    coding: [{
      system: "http://loinc.org",
      code: "85354-9",
      display: "Blood pressure panel"
    }]
  },
  component: [
    {
      code: {
        coding: [{
          system: "http://loinc.org",
          code: "8480-6",
          display: "Systolic blood pressure"
        }]
      },
      valueQuantity: {
        value: 120,
        unit: "mmHg",
        system: "http://unitsofmeasure.org",
        code: "mm[Hg]"
      }
    },
    {
      code: {
        coding: [{
          system: "http://loinc.org",
          code: "8462-4",
          display: "Diastolic blood pressure"
        }]
      },
      valueQuantity: {
        value: 80,
        unit: "mmHg",
        system: "http://unitsofmeasure.org",
        code: "mm[Hg]"
      }
    }
  ]
}
```

---

### 3.3 Encounter Resource

**Purpose**: Healthcare visits, consultations, episodes
**Complexity**: Medium (10+ status mappings, period management)
**Dependencies**: Patient, Practitioner, Organization, EpisodeOfCare (optional)
**FHIR Profile**: http://hl7.org/fhir/R4/encounter.html

#### Required Fields
```typescript
{
  resourceType: "Encounter",
  status: "finished", // planned | arrived | triaged | in-progress | onleave | finished | cancelled
  class: {
    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    code: "AMB", // AMB (ambulatory) | EMER (emergency) | IMP (inpatient)
    display: "ambulatory"
  },
  subject: {
    reference: "Patient/12345",
    type: "Patient"
  }
}
```

#### Status Mappings (RUPHAsoft)
From `/fhir/constants.py`:

```python
ENCOUNTER_STATUS_MAP = {
    # From Patient Encounter docstatus
    "Draft": "planned",
    "Submitted": "finished",
    "Cancelled": "cancelled",

    # From named status fields
    "Open": "in-progress",
    "Scheduled": "planned",
    "Closed": "finished",
    "Completed": "finished",
    "In Progress": "in-progress",
    "Arrived": "arrived",
    "Triaged": "triaged",
    "On Leave": "onleave"
}
```

#### Encounter Class Codes
```typescript
const ENCOUNTER_CLASS_CODES = [
  { name: "Ambulatory (Outpatient)", value: "AMB" },
  { name: "Emergency", value: "EMER" },
  { name: "Inpatient", value: "IMP" },
  { name: "Home Health", value: "HH" },
  { name: "Virtual (Telemedicine)", value: "VR" },
  { name: "Field (Mobile clinic)", value: "FLD" }
];
```

---

### 3.4 Coverage Resource

**Purpose**: Insurance coverage information
**Complexity**: Medium (relationship mappings, payor types)
**Dependencies**: Patient, Organization (payor)
**FHIR Profile**: http://hl7.org/fhir/R4/coverage.html

#### Required Fields
```typescript
{
  resourceType: "Coverage",
  status: "active", // active | cancelled | draft | entered-in-error
  beneficiary: {
    reference: "Patient/12345",
    type: "Patient"
  },
  payor: [
    {
      reference: "Organization/insurance-company-1",
      type: "Organization"
    }
  ]
}
```

#### Relationship Codes
```typescript
const SUBSCRIBER_RELATIONSHIPS = [
  { name: "Self", value: "self" },
  { name: "Spouse", value: "spouse" },
  { name: "Child", value: "child" },
  { name: "Parent", value: "parent" },
  { name: "Other", value: "other" },
  { name: "Injured Party", value: "injured" }
];
```

---

### 3.5 Claim Resource

**Purpose**: Insurance claim submission
**Complexity**: Very High (nested items, diagnoses, interventions)
**Dependencies**: Patient, Organization, Coverage, Encounter/EpisodeOfCare
**FHIR Profile**: http://hl7.org/fhir/R4/claim.html

#### Required Fields (Simplified)
```typescript
{
  resourceType: "Claim",
  status: "active", // active | cancelled | draft | entered-in-error
  type: {
    coding: [{
      system: "http://terminology.hl7.org/CodeSystem/claim-type",
      code: "institutional",
      display: "Institutional"
    }]
  },
  use: "claim", // claim | preauthorization | predetermination
  patient: {
    reference: "Patient/12345",
    type: "Patient"
  },
  created: "2025-12-15T10:00:00+03:00",
  provider: {
    reference: "Organization/hospital-1",
    type: "Organization"
  },
  priority: {
    coding: [{
      system: "http://terminology.hl7.org/CodeSystem/processpriority",
      code: "normal"
    }]
  },
  insurance: [
    {
      sequence: 1,
      focal: true,
      coverage: {
        reference: "Coverage/cov-123"
      }
    }
  ]
}
```

**Note**: Claim is the most complex resource. Consider implementing a wizard-style UI in n8n with multiple steps:
1. Basic claim info (patient, provider, coverage)
2. Add line items (services/procedures)
3. Add diagnoses
4. Review and submit

---

## 4. Field Complexity Classification

### Tier 1: Simple Fields (Direct UI Mapping)
**Characteristics**: Primitive types, no nested structures, direct validation.

| Field Type | Examples | n8n UI Type | Validation |
|------------|----------|-------------|------------|
| String | name, family, given, id | `string` | maxLength, pattern |
| Date | birthDate, effectiveDate | `dateTime` | ISO 8601 format |
| Boolean | active, focal, deceased | `boolean` | true/false |
| Number | sequence, rank, value | `number` | min, max, integer |
| Enum | status, gender, use | `options` | Fixed value list |

**Implementation Effort**: Low
**UI Complexity**: Simple input fields
**Validation**: Built-in HTML5 validation

---

### Tier 2: Complex Fields (Object/Array Structures)
**Characteristics**: Nested objects, requires helper functions, structured data.

| Field Type | Structure | n8n UI Type | Complexity Driver |
|------------|-----------|-------------|-------------------|
| CodeableConcept | coding[] + text | `fixedCollection` | Terminology lookups |
| Reference | reference + type + identifier | `resourceSelect` | Resource resolution |
| Identifier | system + value + use + type | `collection` | System mappings |
| Period | start + end | `collection` | Date validation |
| Quantity | value + unit + system + code | `collection` | Unit conversion |
| ContactPoint | system + value + use | `collection` | Type validation |

**Implementation Effort**: Medium
**UI Complexity**: Nested collections, conditional fields
**Validation**: Custom validators for structure + business rules

---

### Tier 3: Advanced Fields (Dynamic Arrays, Conditional Logic)
**Characteristics**: Variable-length arrays, conditional requirements, complex validation.

| Field Type | Structure | n8n UI Type | Complexity Driver |
|------------|-----------|-------------|-------------------|
| Component[] (Observation) | Array of code + value pairs | `fixedCollection` (multi) | Dynamic value types |
| Item[] (Claim) | Array of line items | `fixedCollection` (multi) | Financial calculations |
| Diagnosis[] | Array of conditions | `fixedCollection` (multi) | Sequencing, types |
| Participant[] (Encounter) | Array of providers | `fixedCollection` (multi) | Role validation |
| Address[] | Array of addresses | `fixedCollection` (multi) | Country-specific formats |

**Implementation Effort**: High
**UI Complexity**: Multi-value collections, dependent field visibility
**Validation**: Cross-field validation, array integrity

---

## 5. Validation Requirements

### 5.1 Resource-Level Validation

#### Patient
```typescript
const validatePatient = (data: any): ValidationResult => {
  const errors = [];

  // Required: At least one identifier
  if (!data.identifier || data.identifier.length === 0) {
    errors.push("At least one identifier is required");
  }

  // Required: Name
  if (!data.name || data.name.length === 0) {
    errors.push("Patient name is required");
  }

  // Required: Gender (FHIR R4 mandatory)
  if (!["male", "female", "other", "unknown"].includes(data.gender)) {
    errors.push("Valid gender is required (male, female, other, unknown)");
  }

  // Birth date format
  if (data.birthDate && !isValidDate(data.birthDate)) {
    errors.push("Birth date must be in YYYY-MM-DD format");
  }

  return { valid: errors.length === 0, errors };
};
```

#### Observation
```typescript
const validateObservation = (data: any): ValidationResult => {
  const errors = [];

  // Required: Status
  const validStatuses = ["registered", "preliminary", "final", "amended", "corrected", "cancelled"];
  if (!validStatuses.includes(data.status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  // Required: Code (LOINC or other system)
  if (!data.code || !data.code.coding || data.code.coding.length === 0) {
    errors.push("Observation code is required");
  }

  // Required: Subject (patient reference)
  if (!data.subject || !data.subject.reference) {
    errors.push("Patient reference is required");
  }

  // Must have value OR component OR dataAbsentReason
  const hasValue = data.valueQuantity || data.valueCodeableConcept ||
                   data.valueString || data.valueBoolean || data.valueRange;
  const hasComponent = data.component && data.component.length > 0;
  const hasDataAbsent = data.dataAbsentReason;

  if (!hasValue && !hasComponent && !hasDataAbsent) {
    errors.push("Observation must have a value, components, or data absent reason");
  }

  return { valid: errors.length === 0, errors };
};
```

### 5.2 Field-Level Validation Patterns

#### Date/DateTime Validation
```typescript
// FHIR date format: YYYY-MM-DD
const isValidDate = (dateStr: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

// FHIR dateTime format: YYYY-MM-DDThh:mm:ss+zz:zz
const isValidDateTime = (dateTimeStr: string): boolean => {
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
  return dateTimeRegex.test(dateTimeStr);
};
```

#### Reference Validation
```typescript
const isValidReference = (reference: string): boolean => {
  // Format: ResourceType/ID
  const referenceRegex = /^[A-Z][a-zA-Z]+\/[A-Za-z0-9\-\.]{1,64}$/;
  return referenceRegex.test(reference);
};
```

---

## 6. n8n Node Generation Strategy

### 6.1 Base Node Structure
```typescript
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class FhirResource implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FHIR Resource',
    name: 'fhirResource',
    icon: 'file:fhir.svg',
    group: ['healthcare'],
    version: 1,
    description: 'Create and manage FHIR R4 resources',
    defaults: {
      name: 'FHIR Resource',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'fhirApi',
        required: true,
      },
    ],
    properties: [
      // Resource type selector
      {
        displayName: 'Resource Type',
        name: 'resourceType',
        type: 'options',
        options: [
          { name: 'Patient', value: 'Patient' },
          { name: 'Observation', value: 'Observation' },
          { name: 'Encounter', value: 'Encounter' },
          { name: 'Coverage', value: 'Coverage' },
          { name: 'Claim', value: 'Claim' },
        ],
        default: 'Patient',
      },

      // Operation selector
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Create', value: 'create' },
          { name: 'Read', value: 'read' },
          { name: 'Update', value: 'update' },
          { name: 'Delete', value: 'delete' },
          { name: 'Search', value: 'search' },
        ],
        default: 'create',
      },

      // Dynamic fields based on resource type + operation
      ...generateDynamicFields()
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const resourceType = this.getNodeParameter('resourceType', i) as string;
      const operation = this.getNodeParameter('operation', i) as string;

      try {
        let result;

        switch (operation) {
          case 'create':
            result = await this.createResource(resourceType, i);
            break;
          case 'read':
            result = await this.readResource(resourceType, i);
            break;
          case 'update':
            result = await this.updateResource(resourceType, i);
            break;
          case 'delete':
            result = await this.deleteResource(resourceType, i);
            break;
          case 'search':
            result = await this.searchResource(resourceType, i);
            break;
        }

        returnData.push({ json: result });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
```

### 6.2 Resource Builder Pattern
```typescript
const buildPatientResource = (params: any): any => {
  const patient: any = {
    resourceType: 'Patient',
    identifier: [],
    name: [],
    gender: params.gender,
    birthDate: params.birthDate,
    active: true,
  };

  // Build identifiers
  if (params.identifiers && params.identifiers.identifier) {
    params.identifiers.identifier.forEach((id: any) => {
      const identifier: any = {
        use: id.use,
        value: id.value,
      };

      // Add system based on type
      const systemMapping = getIdentifierSystemMapping(id.type);
      if (systemMapping) {
        identifier.system = systemMapping.system;

        // Add type if needed
        if (systemMapping.typeCode) {
          identifier.type = {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: systemMapping.typeCode,
              display: systemMapping.display,
            }],
          };
        }
      }

      patient.identifier.push(identifier);
    });
  }

  // Build name
  const name: any = {
    use: 'official',
    family: params.familyName,
    given: params.givenNames.split(',').map((n: string) => n.trim()),
    text: `${params.givenNames} ${params.familyName}`,
  };
  patient.name.push(name);

  // Add telecom if provided
  if (params.mobile) {
    patient.telecom = [{
      system: 'phone',
      value: params.mobile,
      use: 'mobile',
    }];
  }

  return patient;
};
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish base node architecture and implement Priority 1 resources.

**Deliverables**:
- [ ] n8n node skeleton with dynamic field system
- [ ] FHIR credential type (server URL, API key/OAuth)
- [ ] Patient resource (full implementation)
- [ ] Organization resource
- [ ] Practitioner resource
- [ ] Base validation framework
- [ ] Unit tests for resource builders

**Success Criteria**:
- Can create/read/update/delete Patient resources
- Identifier priority system working
- Validation catches 95%+ of malformed requests

---

### Phase 2: Clinical Context (Weeks 3-4)
**Goal**: Enable clinical workflow resources.

**Deliverables**:
- [ ] Encounter resource
- [ ] EpisodeOfCare resource
- [ ] Status mapping system (10+ Frappe → FHIR mappings)
- [ ] Period/timing validation
- [ ] Reference integrity checks

**Success Criteria**:
- Can link Encounters to Patients and Practitioners
- Status transitions validated
- Period end > start validation working

---

### Phase 3: Clinical Data (Weeks 5-7)
**Goal**: Implement complex observation resource.

**Deliverables**:
- [ ] Observation resource (base)
- [ ] LOINC code mapping system (50+ vital sign codes)
- [ ] Component array support (multi-part observations)
- [ ] Value type handling (Quantity, CodeableConcept, String, Boolean, Range)
- [ ] Unit conversion helpers (UCUM system)

**Success Criteria**:
- Can create vital signs with correct LOINC codes
- Blood pressure creates 2-component observation
- Unit validation prevents invalid units

---

### Phase 4: Pharmaceutical (Weeks 8-9)
**Goal**: Medication management resources.

**Deliverables**:
- [ ] Medication resource
- [ ] MedicationRequest resource
- [ ] Dosage instruction builder
- [ ] Timing pattern support
- [ ] Formulary validation hooks

**Success Criteria**:
- Can create prescriptions with dosage instructions
- Timing patterns validate correctly
- Drug interaction warnings (if API available)

---

### Phase 5: Financial (Weeks 10-12)
**Goal**: Complete insurance/billing resources.

**Deliverables**:
- [ ] Coverage resource
- [ ] Claim resource (wizard UI)
- [ ] ClaimResponse resource
- [ ] Line item builder
- [ ] Financial calculations
- [ ] Diagnosis sequencing

**Success Criteria**:
- Can create multi-item claims
- Total calculated correctly
- Diagnosis priority working
- Pre-authorization linking functional

---

### Phase 6: Polish & Optimization (Week 13-14)
**Goal**: Production readiness.

**Deliverables**:
- [ ] Error handling improvements
- [ ] Batch operations support
- [ ] Search parameter builder
- [ ] Performance optimization
- [ ] Documentation
- [ ] Example workflows

**Success Criteria**:
- All resources pass FHIR R4 validation
- Performance: <500ms for simple resources
- Documentation complete
- 10+ example workflows published

---

## Appendix A: Reference Mappings

### A.1 Identifier Type Codes (HL7 v2-0203)
```typescript
const IDENTIFIER_TYPE_CODES = {
  NI: { display: "National Identifier", system: "http://terminology.hl7.org/CodeSystem/v2-0203" },
  MR: { display: "Medical Record Number", system: "http://terminology.hl7.org/CodeSystem/v2-0203" },
  PPN: { display: "Passport Number", system: "http://terminology.hl7.org/CodeSystem/v2-0203" },
  DL: { display: "Driver's License", system: "http://terminology.hl7.org/CodeSystem/v2-0203" },
  TAX: { display: "Tax ID Number", system: "http://terminology.hl7.org/CodeSystem/v2-0203" },
  MB: { display: "Member Number", system: "http://terminology.hl7.org/CodeSystem/v2-0203" },
  BR: { display: "Birth Registry Number", system: "http://terminology.hl7.org/CodeSystem/v2-0203" },
  SS: { display: "Social Security Number", system: "http://terminology.hl7.org/CodeSystem/v2-0203" },
};
```

### A.2 UCUM Unit Codes
```typescript
const UCUM_UNIT_MAPPINGS = {
  temperature_f: { unit: "°F", code: "[degF]" },
  temperature_c: { unit: "°C", code: "Cel" },
  heart_rate: { unit: "beats/minute", code: "/min" },
  respiratory_rate: { unit: "breaths/minute", code: "/min" },
  blood_pressure: { unit: "mmHg", code: "mm[Hg]" },
  oxygen_sat: { unit: "%", code: "%" },
  weight_kg: { unit: "kg", code: "kg" },
  weight_lbs: { unit: "lbs", code: "[lb_av]" },
  height_cm: { unit: "cm", code: "cm" },
  height_in: { unit: "in", code: "[in_i]" },
};
```

### A.3 Status Value Sets
```typescript
const FHIR_STATUS_VALUES = {
  Patient: ["active", "inactive"],
  Practitioner: ["active", "inactive"],
  Organization: ["active", "inactive"],
  Encounter: ["planned", "arrived", "triaged", "in-progress", "onleave", "finished", "cancelled", "entered-in-error"],
  Observation: ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error"],
  EpisodeOfCare: ["planned", "waitlist", "active", "onhold", "finished", "cancelled", "entered-in-error"],
  Coverage: ["active", "cancelled", "draft", "entered-in-error"],
  Claim: ["active", "cancelled", "draft", "entered-in-error"],
};
```

---

## Appendix B: Common Pitfalls

### B.1 Identifier System Mistakes
**Wrong**:
```json
{
  "identifier": [{
    "value": "12345"
  }]
}
```

**Right**:
```json
{
  "identifier": [{
    "use": "official",
    "system": "https://facility.com/fhir/identifier/shanumber",
    "value": "12345",
    "type": {
      "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
        "code": "NI",
        "display": "National Identifier"
      }]
    }
  }]
}
```

### B.2 CodeableConcept Without System
**Wrong**:
```json
{
  "code": {
    "text": "Blood Pressure"
  }
}
```

**Right**:
```json
{
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "85354-9",
      "display": "Blood pressure panel"
    }],
    "text": "Blood Pressure"
  }
}
```

### B.3 Reference Without Type
**Wrong**:
```json
{
  "subject": {
    "reference": "12345"
  }
}
```

**Right**:
```json
{
  "subject": {
    "reference": "Patient/12345",
    "type": "Patient",
    "display": "John Doe"
  }
}
```

---

## Conclusion

This specification provides a comprehensive foundation for building dynamic n8n nodes for FHIR R4 resources. Key takeaways:

1. **Complexity Tiers**: Simple (strings, dates) → Complex (CodeableConcept, Reference) → Advanced (component arrays, conditional logic)

2. **Priority Implementation**: Foundation resources (Patient, Organization, Practitioner) → Clinical context (Encounter, EpisodeOfCare) → Clinical data (Observation) → Pharmaceutical (Medication*) → Financial (Coverage, Claim)

3. **Validation Critical**: Pre-submission validation catches 95%+ of errors before hitting FHIR server

4. **Reusable Patterns**: CodeableConcept, Reference, Identifier patterns repeat across all resources

5. **Database-Driven Config**: RUPHAsoft already has configuration infrastructure (config_manager.py) - consider similar approach for n8n node metadata

**Next Steps**:
1. Review with n8n development team
2. Create proof-of-concept for Patient resource
3. Establish testing framework with FHIR validator
4. Begin Phase 1 implementation

---

**Document Version**: 1.0
**Last Updated**: 2025-12-15
**Contact**: RUPHAsoft Development Team