# @fhir-n8n/core

Core utilities and types for FHIR n8n custom nodes.

## Features

- **FHIR Resource Types**: TypeScript interfaces for FHIR R4 resources
- **Validation Engine**: Zod-based schema validation with detailed error reporting
- **Transformation Utilities**: Convert n8n form data to compliant FHIR resources
- **Field Templates**: Reusable UI templates for common FHIR patterns
- **Error Handling**: Specialized error classes for FHIR validation failures
- **Constants**: FHIR value sets, terminology systems, and smart defaults

## Usage

```typescript
import {
  FhirValidator,
  FhirTransformer,
  FhirFieldTemplates,
  FHIR_RESOURCE_TYPES,
  PatientSchema
} from '@fhir-n8n/core';

// Validate FHIR resource
const result = FhirValidator.validateResource(patientData, PatientSchema);

// Transform n8n data to FHIR
const names = FhirTransformer.transformHumanNames(nodeData.name);

// Use field templates
const nameField = generatePropertiesFromTemplate(FhirFieldTemplates.humanName);
```

## Core Components

### Validation
- `FhirValidator`: Main validation class with resource and business rule validation
- `BaseFhirResourceSchema`: Base Zod schema for all FHIR resources
- Data type schemas: `IdentifierSchema`, `HumanNameSchema`, `ContactPointSchema`, etc.

### Transformation
- `FhirTransformer`: Transform n8n form data to FHIR-compliant structures
- Date/time formatting utilities
- Clean undefined values and empty collections

### Templates
- `FhirFieldTemplates`: Pre-built n8n field definitions for FHIR patterns
- `generatePropertiesFromTemplate()`: Create customized field properties

### Error Handling
- `FhirNodeError`: Base error class for FHIR nodes
- `FhirValidationError`: Specialized validation error with detailed messages
- `FhirNodeUtils`: Utility functions for consistent error handling

## Available Templates

- `humanName`: HumanName array with use, family, given, prefix, suffix
- `contactPoint`: ContactPoint array for telecom (phone, email, etc.)
- `identifier`: Identifier array for business identifiers
- `codeableConcept`: CodeableConcept for coded values
- `reference`: Reference to other FHIR resources

## FHIR Compliance

All utilities follow FHIR R4 specification:
- Proper cardinality enforcement (0..1, 0..*, 1..1, etc.)
- Required field validation
- Data type constraints (date formats, code systems, etc.)
- Business rule validation

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Watch mode
pnpm dev
```