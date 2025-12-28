# FHIR n8n Custom Nodes - Enhanced Docker Implementation

> **TL;DR**: Transform any JSON to FHIR resources in n8n with intelligent auto-detection, 4 integrator templates (KHIE, mamaTOTO, LCT, Smart), semantic array indexing, and Kenya-specific healthcare patterns. Docker-native, extremely forgiving validation, GitHub installable.

**Part of**: [N8N FHIR Bundle Router Workflow System](../README.md)

## Overview

Enhanced, YAGNI-focused FHIR transformation nodes for **n8n Docker environments**. Transforms mixed JSON payloads into FHIR-compliant resources with:
- **Robust auto-detection** with confidence scoring
- **Comprehensive manual override** capabilities
- **4 integrator templates** for Kenya healthcare systems
- **Semantic array indexing** (`identifier[national_id]` instead of `identifier[0]`)
- **25+ Kenya-specific transformations** (SHA, NHIF, National ID, counties, etc.)

> **Docker Only**: This implementation is designed exclusively for Docker Compose environments.

## Quick Install

```bash
# Install in existing n8n Docker container
docker-compose exec n8n npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git
docker-compose restart n8n
# Look for "FHIR Patient" node in n8n palette
```

## Table of Contents

- [Core Features](#core-features)
- [Quick Start](#quick-start)
- [Node Configuration](#node-configuration)
- [FHIR Resources](#supported-resources-5-enhanced)
- [Installation](#installation-for-users)
- [Testing](#testing-in-docker)
- [Development](#development)
- [Output Format](#output-format)
- [Documentation](#documentation-links)

## Core Features

### Intelligent Auto-Detection
- **Pattern matching** for common healthcare fields
- **Confidence scoring** (auto-apply high confidence, flag medium, ignore low)
- **Smart defaults** with healthcare-aware field recognition

### Robust Manual Override
- **Comprehensive field remapping** interface
- **Custom transformations** (date formatting, phone formatting, etc.)
- **Mapping templates** for reuse across workflows

### Forgiving Validation
- **Extremely permissive** validation approach
- **Auto-correction** of common data issues
- **Helpful feedback** without blocking workflows

### Integrator Templates (v2/v3)
- **4 Built-in Templates**: KHIE (Kenya Health Information Exchange), mamaTOTO (Maternal Health), LCT (Lab/Clinical Technology), Smart (FHIR-native systems)
- **Template Mode**: Pre-configured field mappings for common healthcare integrators
- **Kenya-Specific Support**: SHA/NHIF schemes, National ID, MOH facility codes, counties
- **Semantic Array Indexing**: Use `identifier[national_id]` instead of `identifier[0]`

## Supported Resources (5 Enhanced)

| Resource | Version | Status | Description |
|----------|---------|--------|-------------|
| **Patient** | v3 | ✅ Enhanced | Demographics, identifiers, contact info with Template Mode |
| **Appointment** | v2 | ✅ Enhanced | Scheduling data with Kenya healthcare patterns |
| **Bundle** | v2 | ✅ Enhanced | Resource collections with semantic indexing |
| **ClaimResponse** | v2 | ✅ Enhanced | Insurance claim responses with Kenya schemes |
| **EligibilityResponse** | v2 | ✅ Enhanced | Insurance eligibility with 4 integrator templates |

**Latest Enhancement (2025-12-26)**: All nodes upgraded with semantic array indexing, Kenya-specific transformations, and integrator-specific templates for KHIE, mamaTOTO, LCT, and Smart systems.

## Quick Start

### Method 1: Automated Production Deployment (Recommended)

**One-command deployment** - pulls everything from GitHub and sets up complete stack:

```bash
# Automated deployment (everything from GitHub)
curl -sSL https://raw.githubusercontent.com/mudux/ruphasoft_n8n/main/deploy-production.sh | bash
```

**Or manual deployment**:
```bash
# Download deployment script
curl -O https://raw.githubusercontent.com/mudux/ruphasoft_n8n/main/deploy-production.sh
chmod +x deploy-production.sh

# Run deployment
./deploy-production.sh
```

**Includes**: n8n + 5 TypeScript FHIR nodes + PostgreSQL + Ollama + Qdrant

**No local files needed** - everything pulled from GitHub automatically.

### Method 2: Manual Production Setup

If you prefer manual control:

```bash
# Create deployment directory
mkdir fhir-n8n-production && cd fhir-n8n-production

# Download configuration files
curl -O https://raw.githubusercontent.com/mudux/ruphasoft_n8n/main/docker-compose-production.yml
curl -O https://raw.githubusercontent.com/mudux/ruphasoft_n8n/main/.env.example

# Setup environment
cp .env.example .env
nano .env  # Edit with secure credentials

# Deploy
docker compose -f docker-compose-production.yml up -d
```

See: [Production Deployment Guide](PRODUCTION_DEPLOYMENT_GUIDE.md) for detailed instructions.

### Method 3: Development/Testing

Simple n8n instance with TypeScript FHIR nodes only:

```bash
# Quick test deployment
docker compose -f docker-compose-typescript.yml up -d
```

### Method 4: Debug/Troubleshooting

If you're having issues with the TypeScript compilation, use the debug version:

```bash
# Debug the setup process with detailed logging
docker compose -f docker-compose-debug.yml up

# View detailed logs
docker logs n8n-debug-setup

# Inspect the container interactively
docker exec -it n8n-debug-setup /bin/sh
```

This will show detailed information about:
- Repository structure analysis
- TypeScript file detection
- Build process debugging
- Compilation verification

### Method 5: Legacy Manual Installation

```bash
# Clone repository
git clone <repository-url>
cd fhir-n8n-custom-nodes

# Option A: Volume mount
# Add to docker-compose.yml:
# - ./fhir-n8n-custom-nodes:/home/node/.n8n/custom/fhir-nodes:ro

# Option B: Copy to running container
npm run docker-setup
```

### 3. Usage Example

**Kenya HMIS Input (KHIE Integrator):**
```json
{
  "national_id": "12345678",
  "sha_number": "SHA123456",
  "patient_first_name": "John",
  "patient_last_name": "Mwangi",
  "phone": "0712345678",
  "dob": "25/12/1990",
  "county": "Nairobi",
  "gender": "m"
}
```

**Enhanced Auto-Detection (Template Mode):**
- `national_id` → `identifier[national_id].value` (100% confidence) + formatNationalId
- `sha_number` → `identifier[sha_number].value` (100% confidence) + formatSHANumber
- `patient_first_name` → `name[official].given[0]` (100% confidence) + formatName
- `phone` → `telecom[primary_phone].value` (100% confidence) + formatPhoneKE
- `dob` → `birthDate` (100% confidence) + formatKenyaDate

**Enhanced FHIR Output:**
```json
{
  "error": false,
  "fhir_resource": {
    "resourceType": "Patient",
    "id": "auto-1735257271105-ken123abc",
    "name": [{
      "use": "official",
      "given": ["John"],
      "family": "Mwangi"
    }],
    "birthDate": "1990-12-25",
    "gender": "male",
    "telecom": [{
      "system": "phone",
      "use": "mobile",
      "value": "+254712345678"
    }],
    "identifier": [
      {
        "system": "http://kenya.go.ke/fhir/national-id",
        "use": "official",
        "value": "12345678"
      },
      {
        "system": "http://kenya.go.ke/fhir/sha-number",
        "use": "official",
        "value": "SHA123456"
      }
    ],
    "extension": [{
      "url": "http://kenya.go.ke/fhir/StructureDefinition/county",
      "valueString": "Nairobi"
    }],
    "address": [{
      "country": "KE"
    }]
  },
  "validation_summary": {
    "status": "valid_with_warnings",
    "mapped_fields": ["national_id", "sha_number", "patient_first_name", "patient_last_name", "phone", "dob", "county", "gender"],
    "auto_corrections": ["Phone formatted to +254 format", "Date converted from DD/MM/YYYY", "Gender normalized", "National ID padded"],
    "integrator": "khie_sha",
    "template_used": "Kenya HMIS Standard"
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

#### 3. Template Mode (New!)
```javascript
// Node settings
{
  "mode": "template",
  "template": "khie_sha"
}
```
- **4 Built-in Integrator Templates**: KHIE (SHA/NHIF schemes), mamaTOTO (maternal health), LCT (lab systems), Smart (FHIR-native)
- **Pre-configured field mappings** for common healthcare data sources
- **Template overrides** allow customization without full manual setup
- **Kenya-specific patterns** with automatic transformations

### Available Transformations

| Transformation | Description | Example |
|---------------|-------------|---------|
| `formatKenyaDate` | Kenya date formats to FHIR | `25/12/1990` → `1990-12-25` |
| `formatPhoneKE` | Kenya phone to +254 format | `0712345678` → `+254712345678` |
| `formatNationalId` | Kenya National ID padding | `1234567` → `01234567` |
| `formatSHANumber` | SHA number formatting | `sha123` → `SHA123` |
| `formatNHIFNumber` | NHIF number extraction | `NHIF-123456` → `123456` |
| `formatKenyaDateTime` | Kenya datetime with EAT | `26/12/2025 09:00` → `2025-12-26T09:00:00+03:00` |
| `formatFacilityCode` | MOH facility code format | `12345` → `12345` (validated 5-digit) |
| `normalizeGender` | FHIR gender values | `m` → `male`, `f` → `female` |
| `formatName` | Proper case names | `john mwangi` → `John Mwangi` |
| `toUpperCase` | Convert to uppercase | `nairobi` → `NAIROBI` |
| `toLowerCase` | Convert to lowercase | `EMAIL@EXAMPLE.COM` → `email@example.com` |
| `trim` | Remove whitespace | ` patient name ` → `patient name` |

## Project Structure

```
fhir-n8n-custom-nodes/
├── nodes/                          # Enhanced n8n node implementations
│   ├── patient.js                  # Patient resource node v3 ✅ (Template Mode)
│   ├── appointment.js              # Appointment resource node v2 ✅ (Kenya patterns)
│   ├── bundle.js                   # Bundle resource node v2 ✅ (Semantic indexing)
│   ├── claimResponse.js            # ClaimResponse node v2 ✅ (Kenya insurance)
│   ├── eligibilityResponse.js      # EligibilityResponse node v2 ✅ (4 integrators)
│   └── index.js                    # Node registry
├── src/                            # Enhanced core utilities
│   ├── mapping/                    # Enhanced field mapping system
│   │   ├── patterns.js             # Enhanced patterns (Kenya + integrators)
│   │   ├── autoDetector.js         # Enhanced auto-detection engine
│   │   └── manualOverride.js       # Manual mapping interface
│   ├── validation/                 # Enhanced validation system
│   │   └── forgivingValidator.js   # Enhanced permissive FHIR validator
│   └── utils/                      # Enhanced transformation utilities
│       ├── fhirTransform.js        # Main transformation pipeline
│       ├── semanticPaths.js        # Semantic array indexing (v2)
│       └── transformationPresets.js # Kenya-specific transformations (v2)
├── test-data/                      # Comprehensive test datasets
│   ├── kenya-patient-samples.json  # Kenya patient test data
│   ├── kenya-appointment-samples.json # Kenya appointment test data
│   ├── kenya-bundle-samples.json   # Kenya bundle test data
│   ├── kenya-claim-samples.json    # Kenya claim response data
│   └── kenya-eligibility-samples.json # Kenya eligibility data
├── archived/                       # Previous implementation (reference)
├── docker_setup.js                 # Docker setup automation
├── test_core.js                    # Core logic testing
├── test_enhanced.js                # Enhanced core testing (v2)
├── test_enhanced_verification.js   # System verification (v2)
├── package.json                    # Dependencies
├── README.md                       # This file (updated)
├── CLAUDE.md                       # Project configuration (updated)
├── DOCKER_TESTING_GUIDE.md         # Complete Docker testing instructions
└── GITHUB_INSTALLATION.md          # GitHub installation guide
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

### Testing in Docker
```bash
# Test core logic without n8n UI
npm test

# Docker-specific testing
npm run docker-verify

# Full testing guide
# See: DOCKER_TESTING_GUIDE.md
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

## Installation for Users

### GitHub Installation (Easiest)
```bash
# For existing n8n Docker containers
docker-compose exec n8n npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git
docker-compose restart n8n
```

### Docker Compose Integration
```yaml
# Add to your docker-compose.yml
services:
  n8n:
    image: n8nio/n8n:latest
    command: >
      sh -c "
        npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git &&
        n8n start
      "
```

See `GITHUB_INSTALLATION.md` for complete installation options.

## Documentation Links

### Parent Project
- **[N8N FHIR Bundle Router System](../README.md)** - Central routing, credential management, workflow architecture

### Custom Nodes Documentation
- **[GitHub Installation Guide](GITHUB_INSTALLATION.md)** - Complete GitHub installation methods
- **[Docker Testing Guide](DOCKER_TESTING_GUIDE.md)** - Comprehensive Docker testing instructions
- **[Project Configuration](CLAUDE.md)** - Development setup and agent coordination
- **[Production Deployment Guide](PRODUCTION_DEPLOYMENT_GUIDE.md)** - Production setup instructions

### Reference Documentation
- **[Archived Implementation](archived/)** - Previous comprehensive implementation (reference only)
- **[UI Enhancement Opportunities](UI_ENHANCEMENT_OPPORTUNITIES.md)** - UI improvement ideas and roadmap
- **[N8N UI Elements Reference](N8N_UI_ELEMENTS_REFERENCE.md)** - n8n UI component documentation
- **[N8N Build Reference](N8N_BUILD_REFERENCE.yml)** - Build configuration reference
- **[N8N Compliance Audit](N8N_COMPLIANCE_AUDIT.md)** - Compliance and audit documentation

### Integrator Documentation
- **[INTEGRATOR_DOCS/](../INTEGRATOR_DOCS/)** - Complete guides for KHIE, mamaTOTO, LCT, Smart integrators

## Contributing

1. Follow the YAGNI/KISS principles
2. Add only explicitly requested features
3. Maintain extremely forgiving validation approach
4. Test with real healthcare data scenarios
5. Update documentation for any changes

## License

MIT

---

*Enhanced, focused, and effective FHIR transformation for n8n workflows with Kenya healthcare support.*

*Last Updated: 2025-12-26 - All 5 nodes enhanced with semantic indexing, 4 integrator templates (KHIE, mamaTOTO, LCT, Smart), and 25+ Kenya-specific transformations.*