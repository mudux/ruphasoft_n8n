# @fhir-n8n/patient

FHIR Patient resource node for n8n workflow automation.

## Overview

This package provides a comprehensive n8n custom node for creating and managing FHIR R4 Patient resources with visual field mapping. The node includes intelligent form fields, validation, and full FHIR compliance.

## Features

- **Visual Field Mapping**: Drag-and-drop interface for Patient resource creation
- **FHIR R4 Compliance**: Full validation against FHIR Patient resource specification
- **Smart Defaults**: Healthcare-aware default values and configurations
- **Real-time Validation**: Immediate feedback on FHIR compliance
- **Type Safety**: TypeScript integration with comprehensive type checking

## Installation

```bash
npm install @fhir-n8n/patient
```

## Supported Fields

### Demographics
- **Names**: Multiple names with use (usual, official, nickname, etc.)
- **Gender**: Administrative gender (male, female, other, unknown)
- **Birth Date**: Date of birth in YYYY-MM-DD format
- **Deceased**: Deceased status with optional date/time

### Contact Information
- **Telecom**: Phone, email, fax with use and system classification
- **Address**: Multiple addresses with use and type classification

### Identifiers
- **Business Identifiers**: Medical record numbers, SSN, passport, etc.
- **System and Value**: Namespace and unique identifier pairs

### Administrative
- **Active Status**: Whether the patient record is in active use
- **Marital Status**: Coded marital status with terminology binding
- **Multiple Birth**: Birth order for multiple births

### Advanced Fields
- **Photo**: Patient photos with metadata
- **Contact**: Emergency contacts with relationships
- **Communication**: Preferred languages
- **Care Providers**: General practitioners and managing organization
- **Links**: Links to other patient records (replaced-by, replaces, etc.)

## Field Templates

The node uses reusable field templates from `@fhir-n8n/core`:

- **HumanName**: Family, given, prefix, suffix with use context
- **ContactPoint**: System, value, use, rank with period validity
- **Identifier**: System, value, use with type classification
- **Address**: Line, city, state, postal code with use and type
- **CodeableConcept**: Coded values with terminology bindings

## Example Usage

### Basic Patient Creation

```json
{
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Doe",
      "given": ["John", "William"],
      "prefix": ["Mr."]
    }
  ],
  "gender": "male",
  "birthDate": "1985-07-15",
  "telecom": [
    {
      "system": "phone",
      "value": "+1-555-123-4567",
      "use": "home"
    },
    {
      "system": "email",
      "value": "john.doe@example.com",
      "use": "home"
    }
  ],
  "address": [
    {
      "use": "home",
      "type": "both",
      "line": ["123 Main Street", "Apt 4B"],
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62701",
      "country": "USA"
    }
  ]
}
```

### With Identifiers and Marital Status

```json
{
  "active": true,
  "identifier": [
    {
      "use": "usual",
      "system": "http://hospital.example.org/patient-ids",
      "value": "MRN-123456"
    },
    {
      "use": "official",
      "system": "http://hl7.org/fhir/sid/us-ssn",
      "value": "123-45-6789"
    }
  ],
  "maritalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
        "code": "M",
        "display": "Married"
      }
    ],
    "text": "Married"
  }
}
```

## Validation

The node validates all inputs against FHIR R4 Patient resource specification:

### Required Fields
- `resourceType`: Automatically set to "Patient"

### Data Format Validation
- **Birth Date**: YYYY-MM-DD format
- **Identifiers**: System URI format validation
- **Telecom**: Contact format validation (phone, email, URL)
- **Names**: Cardinality and use constraints

### Business Rules
- Resource ID format (alphanumeric, hyphens, periods only)
- Date consistency (birth date before deceased date)
- Identifier uniqueness within system

## Error Handling

Comprehensive error handling with detailed messages:

```typescript
// Validation errors
"FHIR validation failed: birthDate: Invalid date format"

// Missing required parameters
"Missing required parameters: name"

// Business rule violations
"Birth date cannot be in the future"
```

## Integration

### With n8n Workflows
1. Drag "FHIR Patient" node into workflow
2. Configure patient data using visual forms
3. Connect to other FHIR nodes or API endpoints
4. Execute workflow to create FHIR-compliant Patient resources

### With Healthcare Systems
- **EMR Integration**: Create patient records in electronic medical records
- **HIE Connectivity**: Submit to Health Information Exchanges
- **Insurance Systems**: Patient eligibility verification
- **Analytics Platforms**: Healthcare data analysis and reporting

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Watch mode for development
pnpm dev
```

## Testing

```bash
# Run unit tests
pnpm test

# Test with FHIR validation
pnpm test:fhir
```

## License

MIT - see LICENSE file for details