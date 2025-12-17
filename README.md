# FHIR n8n Custom Nodes - Simplified Implementation

## Overview

Simple, YAGNI-focused FHIR transformation nodes for n8n workflow automation. Transforms mixed JSON payloads into FHIR-compliant resources with **robust auto-detection** and **comprehensive manual override** capabilities.

## Core Features

### ✨ Intelligent Auto-Detection
- **Pattern matching** for common healthcare fields
- **Confidence scoring** (auto-apply high confidence, flag medium, ignore low)
- **Smart defaults** with healthcare-aware field recognition

### 🔧 Robust Manual Override
- **Comprehensive field remapping** interface
- **Custom transformations** (date formatting, phone formatting, etc.)
- **Mapping templates** for reuse across workflows

### 🛡️ Forgiving Validation
- **Extremely permissive** validation approach
- **Auto-correction** of common data issues
- **Helpful feedback** without blocking workflows

## Supported Resources (5 Only)

| Resource | Status | Description |
|----------|--------|-------------|
| **Patient** | ✅ Ready | Demographics, identifiers, contact info |
| **Appointment** | 🚧 Planned | Scheduling data transformation |
| **Bundle** | 🚧 Planned | Resource collections |
| **ClaimResponse** | 🚧 Planned | Insurance claim responses |
| **EligibilityResponse** | 🚧 Planned | Insurance eligibility responses |

## Quick Start

### 1. Installation
```bash
# Clone repository
git clone <repository-url>
cd fhir-n8n-custom-nodes

# Install dependencies
npm install
```

### 2. n8n Integration
```bash
# Link to n8n custom nodes directory
ln -s $(pwd) ~/.n8n/custom/

# Or copy nodes to n8n installation
cp -r nodes/* /path/to/n8n/nodes/
```

### 3. Usage Example

**Input JSON:**
```json
{
  "patient_first_name": "John",
  "patient_last_name": "Doe",
  "dob": "1990-05-15",
  "phone": "(555) 123-4567",
  "mrn": "12345"
}
```

**Auto-Detection Result:**
- `patient_first_name` → `name[0].given[0]` (95% confidence)
- `patient_last_name` → `name[0].family` (95% confidence)
- `dob` → `birthDate` (90% confidence)
- `phone` → `telecom[0].value` (85% confidence)
- `mrn` → `identifier[0].value` (100% confidence)

**FHIR Output:**
```json
{
  "error": false,
  "fhir_resource": {
    "resourceType": "Patient",
    "id": "auto-1671234567890-abc123def",
    "name": [{
      "given": ["John"],
      "family": "Doe"
    }],
    "birthDate": "1990-05-15",
    "telecom": [{
      "system": "phone",
      "value": "+15551234567"
    }],
    "identifier": [{
      "value": "12345",
      "system": "http://hospital.example.org/patient-ids"
    }]
  },
  "validation_summary": {
    "status": "valid_with_warnings",
    "mapped_fields": ["patient_first_name", "patient_last_name", "dob", "phone", "mrn"],
    "warnings": ["Phone number auto-formatted"]
  }
}
```

## Node Configuration

### Processing Modes

#### 1. Auto-Detection Only
```javascript
// Node settings
{
  "mode": "auto"
}
```
- Uses pattern matching for field detection
- Applies high-confidence mappings automatically
- No manual configuration needed

#### 2. Manual Override
```javascript
// Node settings
{
  "mode": "manual",
  "manualMappings": {
    "mappingValues": [
      {
        "sourceField": "custom_patient_name",
        "fhirPath": "name[0].text",
        "transformation": "formatName",
        "action": "override"
      }
    ]
  }
}
```
- Override auto-detected mappings
- Add custom field mappings
- Apply data transformations

#### 3. Template Mode
```javascript
// Node settings (planned)
{
  "mode": "template",
  "template": "hospital_adt_feed"
}
```
- Pre-configured mapping templates
- Reusable across similar data sources

### Available Transformations

| Transformation | Description | Example |
|---------------|-------------|---------|
| `convertToFhirDate` | Format as YYYY-MM-DD | `05/15/1990` → `1990-05-15` |
| `formatPhoneNumber` | Add country code | `5551234567` → `+15551234567` |
| `normalizeGender` | FHIR gender values | `M` → `male` |
| `formatName` | Proper case names | `john doe` → `John Doe` |
| `toUpperCase` | Convert to uppercase | `abc` → `ABC` |
| `toLowerCase` | Convert to lowercase | `ABC` → `abc` |
| `trim` | Remove whitespace | ` text ` → `text` |

## Project Structure

```
fhir-n8n-custom-nodes/
├── nodes/                          # n8n node implementations
│   ├── patient.js                  # Patient resource node ✅
│   └── index.js                    # Node registry
├── src/                            # Core utilities
│   ├── mapping/                    # Field mapping system
│   │   ├── patterns.js             # Pattern matching rules
│   │   ├── autoDetector.js         # Auto-detection engine
│   │   └── manualOverride.js       # Manual mapping interface
│   ├── validation/                 # Validation system
│   │   └── forgivingValidator.js   # Permissive FHIR validator
│   └── utils/                      # Transformation utilities
│       └── fhirTransform.js        # Main transformation pipeline
├── archived/                       # Previous comprehensive implementation
├── package.json                    # Simple dependencies
├── README.md                       # This file
└── CLAUDE.md                       # Project configuration
```

## Development

### Adding New Resources

1. **Create node file** following Patient pattern:
```javascript
// nodes/appointment.js
const { FhirTransformer } = require('../src/utils/fhirTransform');

class FhirAppointment {
  // Follow patient.js structure
}
```

2. **Add field patterns** to `src/mapping/patterns.js`:
```javascript
appointment: {
  appointmentId: /^(appointment_?id|appt_?id)$/i,
  dateTime: /^(appointment_?(date|time))$/i,
  // ... more patterns
}
```

3. **Update package.json** node registry:
```json
{
  "n8n": {
    "nodes": [
      "nodes/patient.js",
      "nodes/appointment.js"
    ]
  }
}
```

### Testing
```bash
# Test pattern matching
node -e "
const { findBestMatch } = require('./src/mapping/patterns');
console.log(findBestMatch('patient_first_name', 'patient'));
"

# Test transformation
node -e "
const { FhirTransformer } = require('./src/utils/fhirTransform');
const transformer = new FhirTransformer('patient');
transformer.transform({patient_first_name: 'John'}).then(console.log);
"
```

## Output Format

All nodes return standardized JSON:

```javascript
{
  "error": false,                    // true if transformation failed
  "fhir_resource": { /* FHIR */ },   // Valid FHIR resource or null
  "err_message": null,               // Error message if error: true
  "resource_type": "Patient",        // FHIR resource type
  "validation_summary": {
    "status": "valid_with_warnings", // valid | valid_with_warnings | invalid | error
    "mapped_fields": ["field1"],     // Successfully mapped fields
    "unmapped_fields": ["field2"],   // Fields that couldn't be mapped
    "warnings": ["message"],         // Non-blocking issues
    "corrections": ["message"]       // Auto-corrections made
  },
  "mapping_summary": {
    "total_input_fields": 5,         // Total fields in input
    "auto_detected": 4,              // Fields auto-detected successfully
    "user_overrides": 1,             // Manual overrides applied
    "high_confidence": 3,            // High confidence mappings
    "needs_review": 1                // Medium confidence mappings
  },
  "metadata": {
    "transformation_time": "ISO date",
    "resource_id": "patient-123",
    "processing_mode": "auto"
  }
}
```

## Philosophy: YAGNI/KISS

This implementation follows strict **You Aren't Gonna Need It (YAGNI)** and **Keep It Simple Stupid (KISS)** principles:

### ✅ What's Included
- 5 specific FHIR resources only
- Essential field mappings
- Robust auto-detection + manual override
- Forgiving validation with auto-correction
- Standard JSON output for n8n workflows

### ❌ What's NOT Included
- Complex FHIR extensions
- Comprehensive specification coverage
- Advanced validation rules
- Multiple output formats
- Experimental features

## Contributing

1. Follow the YAGNI/KISS principles
2. Add only explicitly requested features
3. Maintain extremely forgiving validation approach
4. Test with real healthcare data scenarios
5. Update documentation for any changes

## License

MIT

---

*Simple, focused, and effective FHIR transformation for n8n workflows.*