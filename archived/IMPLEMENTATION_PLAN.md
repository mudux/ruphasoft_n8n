# FHIR n8n Custom Nodes - Implementation Plan

## Overview

This document outlines the detailed implementation strategy for creating FHIR-compliant custom nodes for n8n workflow automation. The plan follows KISS/YAGNI principles while building a robust foundation for healthcare data integration.

## Project Structure and Organization

### Monorepo Architecture

```
fhir-n8n-custom-nodes/
├── package.json                    # Root package configuration
├── pnpm-workspace.yaml            # pnpm workspace configuration
├── tsconfig.json                   # TypeScript base configuration
├── .eslintrc.js                   # ESLint configuration
├── jest.config.js                 # Jest testing configuration
├── packages/
│   ├── core/                      # Shared utilities and types
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── types/             # FHIR TypeScript definitions
│   │   │   ├── utils/             # Helper functions
│   │   │   ├── validation/        # Validation engine
│   │   │   ├── generators/        # Field generation system
│   │   │   └── templates/         # Reusable field templates
│   │   └── dist/                  # Compiled output
│   ├── nodes/                     # Individual FHIR resource nodes
│   │   ├── patient/              # Patient resource node
│   │   │   ├── package.json
│   │   │   ├── nodes/
│   │   │   │   ├── Patient/
│   │   │   │   │   ├── Patient.node.ts
│   │   │   │   │   └── Patient.node.json
│   │   │   │   └── index.ts
│   │   │   └── credentials/       # If needed for specific integrations
│   │   ├── observation/          # Observation resource node
│   │   ├── encounter/            # Encounter resource node
│   │   └── ...                   # Other FHIR resource nodes
│   └── cli/                      # Development CLI tools
│       ├── generate-node.ts      # Node generation script
│       └── validate-fhir.ts      # FHIR validation tools
├── tools/                        # Build and development tools
├── examples/                     # Example workflows
├── docs/                        # Documentation
└── tests/                       # Integration tests
```

## Phase 1: Foundation Development (Weeks 1-4)

### Week 1: Project Setup and Core Infrastructure

#### Day 1-2: Environment Setup
```bash
# Initialize project
mkdir fhir-n8n-custom-nodes && cd fhir-n8n-custom-nodes
pnpm init
echo "packages:\n  - 'packages/*'" > pnpm-workspace.yaml

# Install core dependencies
pnpm add -w typescript @types/node
pnpm add -w -D jest @types/jest ts-jest
pnpm add -w -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -w -D prettier eslint-config-prettier

# Install n8n development dependencies
pnpm add -w n8n-workflow n8n-core
pnpm add -w -D @types/n8n

# Install FHIR libraries
pnpm add -w @solarahealth/fhir-r4 zod
```

#### Day 3-5: Core Package Development

**packages/core/package.json**:
```json
{
  "name": "@fhir-n8n/core",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@solarahealth/fhir-r4": "latest",
    "zod": "^3.22.0",
    "n8n-workflow": "latest"
  }
}
```

**Core Utilities Implementation**:

```typescript
// packages/core/src/types/index.ts
export interface FhirNodeConfig {
  resourceType: string;
  version: string;
  fields: FhirFieldDefinition[];
  validation: ValidationConfig;
}

export interface FhirFieldDefinition {
  fhirPath: string;
  fieldName: string;
  fieldType: 'string' | 'number' | 'boolean' | 'date' | 'collection' | 'options';
  required: boolean;
  description?: string;
  valueSet?: string;
  template?: string;
}

// packages/core/src/validation/fhir-validator.ts
import { z } from 'zod';
import { createPatientSchema, createObservationSchema } from '@solarahealth/fhir-r4';

export class FhirValidator {
  private schemas = new Map();

  constructor() {
    this.registerSchema('Patient', createPatientSchema());
    this.registerSchema('Observation', createObservationSchema());
  }

  validate(resourceType: string, data: any): ValidationResult {
    const schema = this.schemas.get(resourceType);
    if (!schema) {
      throw new Error(`No schema registered for resource type: ${resourceType}`);
    }

    const result = schema.safeParse(data);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      errors: result.success ? [] : result.error.issues
    };
  }
}

// packages/core/src/generators/field-generator.ts
import { INodeProperties } from 'n8n-workflow';

export class FhirFieldGenerator {
  generateNodeProperties(config: FhirNodeConfig): INodeProperties[] {
    return config.fields.map(field => this.generateField(field));
  }

  private generateField(field: FhirFieldDefinition): INodeProperties {
    switch (field.fieldType) {
      case 'string':
        return this.generateStringField(field);
      case 'collection':
        return this.generateCollectionField(field);
      case 'options':
        return this.generateOptionsField(field);
      default:
        return this.generateStringField(field);
    }
  }

  private generateStringField(field: FhirFieldDefinition): INodeProperties {
    return {
      displayName: this.formatDisplayName(field.fieldName),
      name: field.fieldName,
      type: 'string',
      required: field.required,
      default: '',
      description: field.description || `FHIR ${field.fhirPath}`
    };
  }
}
```

### Week 2: Patient Node MVP Development

#### Patient Node Implementation

**packages/nodes/patient/package.json**:
```json
{
  "name": "@fhir-n8n/patient",
  "version": "0.1.0",
  "main": "dist/index.js",
  "n8n": {
    "nodes": ["dist/nodes/Patient/Patient.node.js"]
  },
  "dependencies": {
    "@fhir-n8n/core": "workspace:*",
    "n8n-workflow": "latest"
  }
}
```

**Patient Node Core Implementation**:

```typescript
// packages/nodes/patient/nodes/Patient/Patient.node.ts
import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IExecuteFunctions,
  NodeOperationError
} from 'n8n-workflow';

import { FhirValidator, FhirFieldGenerator } from '@fhir-n8n/core';
import type { Patient } from '@solarahealth/fhir-r4';

export class FhirPatientNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FHIR Patient',
    name: 'fhirPatient',
    icon: 'file:patient.svg',
    group: ['healthcare', 'fhir'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Create and manage FHIR Patient resources',
    defaults: {
      name: 'FHIR Patient',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Create Patient',
            value: 'create',
            description: 'Create a new FHIR Patient resource',
          },
          {
            name: 'Update Patient',
            value: 'update',
            description: 'Update an existing FHIR Patient resource',
          },
          {
            name: 'Validate Patient',
            value: 'validate',
            description: 'Validate FHIR Patient data',
          }
        ],
        default: 'create',
      },
      // Patient ID field
      {
        displayName: 'Patient ID',
        name: 'id',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['create', 'update', 'validate']
          }
        },
        default: '',
        description: 'Logical ID of this artifact'
      },
      // Patient active status
      {
        displayName: 'Active',
        name: 'active',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['create', 'update', 'validate']
          }
        },
        default: true,
        description: 'Whether this patient record is in active use'
      },
      // Patient names collection
      {
        displayName: 'Names',
        name: 'name',
        type: 'fixedCollection',
        displayOptions: {
          show: {
            operation: ['create', 'update', 'validate']
          }
        },
        placeholder: 'Add Name',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        options: [
          {
            name: 'nameValues',
            displayName: 'Name',
            values: [
              {
                displayName: 'Use',
                name: 'use',
                type: 'options',
                options: [
                  { name: 'Usual', value: 'usual' },
                  { name: 'Official', value: 'official' },
                  { name: 'Temp', value: 'temp' },
                  { name: 'Nickname', value: 'nickname' },
                  { name: 'Anonymous', value: 'anonymous' },
                  { name: 'Old', value: 'old' },
                  { name: 'Maiden', value: 'maiden' }
                ],
                default: 'usual',
                description: 'Identifies the purpose for this name'
              },
              {
                displayName: 'Family Name',
                name: 'family',
                type: 'string',
                default: '',
                description: 'Family name (surname)'
              },
              {
                displayName: 'Given Names',
                name: 'given',
                type: 'string',
                typeOptions: {
                  multipleValues: true
                },
                default: [],
                description: 'Given names (first name, middle names)'
              },
              {
                displayName: 'Prefix',
                name: 'prefix',
                type: 'string',
                typeOptions: {
                  multipleValues: true
                },
                default: [],
                description: 'Parts that come before the name'
              },
              {
                displayName: 'Suffix',
                name: 'suffix',
                type: 'string',
                typeOptions: {
                  multipleValues: true
                },
                default: [],
                description: 'Parts that come after the name'
              }
            ]
          }
        ]
      },
      // Gender field
      {
        displayName: 'Gender',
        name: 'gender',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['create', 'update', 'validate']
          }
        },
        options: [
          { name: 'Male', value: 'male' },
          { name: 'Female', value: 'female' },
          { name: 'Other', value: 'other' },
          { name: 'Unknown', value: 'unknown' }
        ],
        default: 'unknown',
        description: 'Administrative gender'
      },
      // Birth date field
      {
        displayName: 'Birth Date',
        name: 'birthDate',
        type: 'dateTime',
        displayOptions: {
          show: {
            operation: ['create', 'update', 'validate']
          }
        },
        default: '',
        description: 'Date of birth for the patient'
      },
      // Telecom collection
      {
        displayName: 'Contact Points',
        name: 'telecom',
        type: 'fixedCollection',
        displayOptions: {
          show: {
            operation: ['create', 'update', 'validate']
          }
        },
        placeholder: 'Add Contact',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        options: [
          {
            name: 'telecomValues',
            displayName: 'Contact Point',
            values: [
              {
                displayName: 'System',
                name: 'system',
                type: 'options',
                options: [
                  { name: 'Phone', value: 'phone' },
                  { name: 'Fax', value: 'fax' },
                  { name: 'Email', value: 'email' },
                  { name: 'Pager', value: 'pager' },
                  { name: 'URL', value: 'url' },
                  { name: 'SMS', value: 'sms' },
                  { name: 'Other', value: 'other' }
                ],
                default: 'phone',
                description: 'Telecommunications form for contact point'
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'The actual contact point details'
              },
              {
                displayName: 'Use',
                name: 'use',
                type: 'options',
                options: [
                  { name: 'Home', value: 'home' },
                  { name: 'Work', value: 'work' },
                  { name: 'Temp', value: 'temp' },
                  { name: 'Old', value: 'old' },
                  { name: 'Mobile', value: 'mobile' }
                ],
                default: 'home',
                description: 'Purpose of this contact point'
              }
            ]
          }
        ]
      }
    ]
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const validator = new FhirValidator();

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;

        // Extract patient data from node parameters
        const patientData = this.extractPatientData(i);

        // Transform to FHIR Patient resource
        const fhirPatient = this.transformToFhirPatient(patientData);

        // Validate the FHIR resource
        const validation = validator.validate('Patient', fhirPatient);

        if (!validation.success) {
          throw new NodeOperationError(
            this.getNode(),
            `FHIR validation failed: ${JSON.stringify(validation.errors)}`,
            { itemIndex: i }
          );
        }

        let result;
        switch (operation) {
          case 'create':
          case 'update':
          case 'validate':
            result = {
              operation,
              fhirResource: validation.data,
              resourceType: 'Patient',
              validatedAt: new Date().toISOString(),
              validation: {
                success: true,
                errors: []
              }
            };
            break;
          default:
            throw new NodeOperationError(
              this.getNode(),
              `Unknown operation: ${operation}`,
              { itemIndex: i }
            );
        }

        returnData.push({
          json: result,
          pairedItem: { item: i }
        });

      } catch (error) {
        if (error instanceof NodeOperationError) {
          throw error;
        }
        throw new NodeOperationError(
          this.getNode(),
          `Error processing item ${i}: ${error.message}`,
          { itemIndex: i }
        );
      }
    }

    return [returnData];
  }

  private extractPatientData(itemIndex: number): any {
    return {
      id: this.getNodeParameter('id', itemIndex, '') as string,
      active: this.getNodeParameter('active', itemIndex, true) as boolean,
      name: this.getNodeParameter('name.nameValues', itemIndex, []) as any[],
      gender: this.getNodeParameter('gender', itemIndex, 'unknown') as string,
      birthDate: this.getNodeParameter('birthDate', itemIndex, '') as string,
      telecom: this.getNodeParameter('telecom.telecomValues', itemIndex, []) as any[]
    };
  }

  private transformToFhirPatient(data: any): Patient {
    const patient: Patient = {
      resourceType: 'Patient'
    };

    // Set ID if provided
    if (data.id) {
      patient.id = data.id;
    }

    // Set active status
    if (typeof data.active === 'boolean') {
      patient.active = data.active;
    }

    // Transform names
    if (data.name && Array.isArray(data.name) && data.name.length > 0) {
      patient.name = data.name.map((nameItem: any) => {
        const humanName: any = {};

        if (nameItem.use) humanName.use = nameItem.use;
        if (nameItem.family) humanName.family = nameItem.family;
        if (nameItem.given && Array.isArray(nameItem.given)) {
          humanName.given = nameItem.given.filter((g: string) => g.trim());
        }
        if (nameItem.prefix && Array.isArray(nameItem.prefix)) {
          humanName.prefix = nameItem.prefix.filter((p: string) => p.trim());
        }
        if (nameItem.suffix && Array.isArray(nameItem.suffix)) {
          humanName.suffix = nameItem.suffix.filter((s: string) => s.trim());
        }

        return humanName;
      });
    }

    // Set gender
    if (data.gender && ['male', 'female', 'other', 'unknown'].includes(data.gender)) {
      patient.gender = data.gender;
    }

    // Set birth date
    if (data.birthDate) {
      patient.birthDate = data.birthDate;
    }

    // Transform telecom
    if (data.telecom && Array.isArray(data.telecom) && data.telecom.length > 0) {
      patient.telecom = data.telecom
        .filter((contact: any) => contact.value && contact.value.trim())
        .map((contact: any) => ({
          system: contact.system || 'phone',
          value: contact.value.trim(),
          use: contact.use || 'home'
        }));
    }

    return patient;
  }
}
```

### Week 3: Testing Framework and Validation

#### Testing Infrastructure

```typescript
// tests/patient.test.ts
import { FhirPatientNode } from '../packages/nodes/patient/nodes/Patient/Patient.node';
import { mock } from 'jest-mock-extended';
import { IExecuteFunctions } from 'n8n-workflow';

describe('FHIR Patient Node', () => {
  let patientNode: FhirPatientNode;
  let mockExecuteFunctions: IExecuteFunctions;

  beforeEach(() => {
    patientNode = new FhirPatientNode();
    mockExecuteFunctions = mock<IExecuteFunctions>();
  });

  describe('Patient Creation', () => {
    it('should create a valid FHIR Patient resource', async () => {
      // Mock node parameters
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        switch (paramName) {
          case 'operation': return 'create';
          case 'id': return 'patient-123';
          case 'active': return true;
          case 'gender': return 'male';
          case 'birthDate': return '1985-03-15';
          case 'name.nameValues': return [{
            use: 'official',
            family: 'Doe',
            given: ['John', 'William']
          }];
          case 'telecom.telecomValues': return [{
            system: 'email',
            value: 'john.doe@example.com',
            use: 'home'
          }];
          default: return undefined;
        }
      });

      mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);

      const result = await patientNode.execute.call(mockExecuteFunctions);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);

      const output = result[0][0].json;
      expect(output.resourceType).toBe('Patient');
      expect(output.fhirResource.id).toBe('patient-123');
      expect(output.fhirResource.gender).toBe('male');
      expect(output.validation.success).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      // Mock invalid data
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        switch (paramName) {
          case 'operation': return 'create';
          case 'gender': return 'invalid-gender'; // Invalid gender value
          default: return undefined;
        }
      });

      mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
      mockExecuteFunctions.getNode.mockReturnValue({} as any);

      await expect(patientNode.execute.call(mockExecuteFunctions))
        .rejects.toThrow('FHIR validation failed');
    });
  });

  describe('Patient Update', () => {
    it('should update existing patient data', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        switch (paramName) {
          case 'operation': return 'update';
          case 'id': return 'existing-patient-123';
          case 'active': return false; // Update to inactive
          default: return undefined;
        }
      });

      mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);

      const result = await patientNode.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.operation).toBe('update');
      expect(result[0][0].json.fhirResource.active).toBe(false);
    });
  });
});
```

### Week 4: Documentation and Examples

#### User Documentation

```markdown
// docs/user-guides/patient-node.md
# FHIR Patient Node User Guide

## Overview
The FHIR Patient Node allows you to create, update, and validate FHIR Patient resources in your n8n workflows. This node provides a visual interface for mapping patient data while ensuring FHIR R4 compliance.

## Configuration

### Basic Settings
1. **Operation**: Choose whether to create, update, or validate a patient resource
2. **Patient ID**: Unique identifier for the patient (optional for create, required for update)
3. **Active Status**: Whether the patient record is active (defaults to true)

### Patient Demographics
1. **Names**: Add multiple names for the patient
   - **Use**: Purpose of the name (usual, official, nickname, etc.)
   - **Family**: Family name (surname)
   - **Given**: Given names (first, middle names)
   - **Prefix/Suffix**: Name prefixes (Dr., Mr.) and suffixes (Jr., PhD)

2. **Gender**: Administrative gender (male, female, other, unknown)
3. **Birth Date**: Patient's date of birth

### Contact Information
1. **Contact Points**: Phone, email, fax numbers
   - **System**: Type of contact (phone, email, fax, etc.)
   - **Value**: The actual contact information
   - **Use**: Purpose (home, work, mobile, etc.)

## Example Workflows

### Basic Patient Registration
```json
{
  "name": "Patient Registration Workflow",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "patient-registration"
      }
    },
    {
      "name": "FHIR Patient",
      "type": "fhirPatient",
      "parameters": {
        "operation": "create",
        "name": {
          "nameValues": [
            {
              "use": "official",
              "family": "={{$json.lastName}}",
              "given": ["={{$json.firstName}}"]
            }
          ]
        },
        "gender": "={{$json.gender}}",
        "birthDate": "={{$json.dateOfBirth}}",
        "telecom": {
          "telecomValues": [
            {
              "system": "email",
              "value": "={{$json.email}}",
              "use": "home"
            }
          ]
        }
      }
    }
  ]
}
```
```

## Phase 2: Core Resource Expansion (Weeks 5-8)

### Week 5-6: Observation Node Implementation

#### Observation Node Complexity Analysis

The Observation resource is significantly more complex than Patient due to:
1. **Polymorphic value types**: value[x] can be valueQuantity, valueString, valueBoolean, etc.
2. **Complex coding systems**: LOINC, SNOMED CT integration
3. **Component observations**: Multi-part observations like Blood Pressure
4. **Reference handling**: Links to Patient, Practitioner, Encounter resources

#### Observation Node Implementation Strategy

```typescript
// packages/nodes/observation/nodes/Observation/Observation.node.ts
export class FhirObservationNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FHIR Observation',
    name: 'fhirObservation',
    icon: 'file:observation.svg',
    group: ['healthcare', 'fhir'],
    version: 1,
    subtitle: '={{$parameter["observationType"]}}',
    description: 'Create and manage FHIR Observation resources',
    defaults: {
      name: 'FHIR Observation',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      // Operation selection
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Create Observation', value: 'create' },
          { name: 'Update Observation', value: 'update' },
          { name: 'Validate Observation', value: 'validate' }
        ],
        default: 'create',
      },
      // Observation type selection (determines field visibility)
      {
        displayName: 'Observation Type',
        name: 'observationType',
        type: 'options',
        options: [
          { name: 'Vital Signs', value: 'vital-signs' },
          { name: 'Laboratory', value: 'laboratory' },
          { name: 'Imaging', value: 'imaging' },
          { name: 'Physical Exam', value: 'exam' },
          { name: 'Custom', value: 'custom' }
        ],
        default: 'vital-signs',
        description: 'Type of observation - affects available fields'
      },
      // Common fields for all observations
      {
        displayName: 'Observation ID',
        name: 'id',
        type: 'string',
        default: '',
        description: 'Logical ID of this artifact'
      },
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        required: true,
        options: [
          { name: 'Registered', value: 'registered' },
          { name: 'Preliminary', value: 'preliminary' },
          { name: 'Final', value: 'final' },
          { name: 'Amended', value: 'amended' },
          { name: 'Corrected', value: 'corrected' },
          { name: 'Cancelled', value: 'cancelled' },
          { name: 'Entered in Error', value: 'entered-in-error' },
          { name: 'Unknown', value: 'unknown' }
        ],
        default: 'final'
      },
      // Subject reference (Patient)
      {
        displayName: 'Subject (Patient)',
        name: 'subject',
        type: 'string',
        required: true,
        placeholder: 'Patient/patient-123',
        description: 'Reference to the patient this observation is about'
      },
      // Effective date/time
      {
        displayName: 'Effective Date/Time',
        name: 'effectiveDateTime',
        type: 'dateTime',
        default: '',
        description: 'Clinically relevant time/time-period for observation'
      },
      // Observation code (LOINC-based for vital signs)
      {
        displayName: 'Observation Code',
        name: 'code',
        type: 'options',
        displayOptions: {
          show: {
            observationType: ['vital-signs']
          }
        },
        options: [
          { name: 'Blood Pressure', value: '85354-9' },
          { name: 'Body Temperature', value: '8310-5' },
          { name: 'Heart Rate', value: '8867-4' },
          { name: 'Respiratory Rate', value: '9279-1' },
          { name: 'Body Weight', value: '29463-7' },
          { name: 'Body Height', value: '8302-2' },
          { name: 'BMI', value: '39156-5' },
          { name: 'Oxygen Saturation', value: '2708-6' }
        ],
        default: '8310-5',
        description: 'LOINC code for the observation'
      },
      // Custom code fields for non-vital signs
      {
        displayName: 'Custom Code System',
        name: 'customCodeSystem',
        type: 'string',
        displayOptions: {
          show: {
            observationType: ['custom', 'laboratory', 'imaging']
          }
        },
        default: 'http://loinc.org',
        description: 'Code system URL (e.g., LOINC, SNOMED CT)'
      },
      {
        displayName: 'Custom Code',
        name: 'customCode',
        type: 'string',
        displayOptions: {
          show: {
            observationType: ['custom', 'laboratory', 'imaging']
          }
        },
        default: '',
        description: 'Observation code'
      },
      {
        displayName: 'Custom Display',
        name: 'customDisplay',
        type: 'string',
        displayOptions: {
          show: {
            observationType: ['custom', 'laboratory', 'imaging']
          }
        },
        default: '',
        description: 'Human-readable observation name'
      },
      // Value type selection
      {
        displayName: 'Value Type',
        name: 'valueType',
        type: 'options',
        options: [
          { name: 'Quantity (with unit)', value: 'valueQuantity' },
          { name: 'String', value: 'valueString' },
          { name: 'Boolean', value: 'valueBoolean' },
          { name: 'Integer', value: 'valueInteger' },
          { name: 'Range', value: 'valueRange' },
          { name: 'CodeableConcept', value: 'valueCodeableConcept' }
        ],
        default: 'valueQuantity',
        description: 'Type of value for this observation'
      },
      // Quantity value fields
      {
        displayName: 'Value',
        name: 'quantityValue',
        type: 'number',
        displayOptions: {
          show: {
            valueType: ['valueQuantity']
          }
        },
        default: 0,
        description: 'Numerical value'
      },
      {
        displayName: 'Unit',
        name: 'quantityUnit',
        type: 'string',
        displayOptions: {
          show: {
            valueType: ['valueQuantity']
          }
        },
        default: '',
        placeholder: 'e.g., kg, cm, °C, bpm',
        description: 'Unit of measurement'
      },
      {
        displayName: 'Unit System',
        name: 'quantitySystem',
        type: 'string',
        displayOptions: {
          show: {
            valueType: ['valueQuantity']
          }
        },
        default: 'http://unitsofmeasure.org',
        description: 'Unit system (typically UCUM)'
      },
      {
        displayName: 'Unit Code',
        name: 'quantityCode',
        type: 'string',
        displayOptions: {
          show: {
            valueType: ['valueQuantity']
          }
        },
        default: '',
        placeholder: 'e.g., kg, cm, Cel, /min',
        description: 'Unit code (UCUM format)'
      },
      // String value
      {
        displayName: 'String Value',
        name: 'stringValue',
        type: 'string',
        displayOptions: {
          show: {
            valueType: ['valueString']
          }
        },
        default: '',
        description: 'Text value for the observation'
      },
      // Boolean value
      {
        displayName: 'Boolean Value',
        name: 'booleanValue',
        type: 'boolean',
        displayOptions: {
          show: {
            valueType: ['valueBoolean']
          }
        },
        default: false,
        description: 'True/false value for the observation'
      },
      // Component observations (for complex observations like BP)
      {
        displayName: 'Components',
        name: 'component',
        type: 'fixedCollection',
        displayOptions: {
          show: {
            observationType: ['vital-signs']
          }
        },
        placeholder: 'Add Component',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description: 'Component observations (e.g., systolic/diastolic BP)',
        options: [
          {
            name: 'componentValues',
            displayName: 'Component',
            values: [
              {
                displayName: 'Component Code',
                name: 'code',
                type: 'options',
                options: [
                  { name: 'Systolic BP', value: '8480-6' },
                  { name: 'Diastolic BP', value: '8462-4' }
                ],
                default: '8480-6'
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'number',
                default: 0
              },
              {
                displayName: 'Unit',
                name: 'unit',
                type: 'string',
                default: 'mmHg'
              }
            ]
          }
        ]
      }
    ]
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // Implementation similar to Patient node but handling Observation complexity
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const validator = new FhirValidator();

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const observationData = this.extractObservationData(i);
        const fhirObservation = this.transformToFhirObservation(observationData);

        const validation = validator.validate('Observation', fhirObservation);

        if (!validation.success) {
          throw new NodeOperationError(
            this.getNode(),
            `FHIR validation failed: ${JSON.stringify(validation.errors)}`,
            { itemIndex: i }
          );
        }

        const result = {
          operation,
          fhirResource: validation.data,
          resourceType: 'Observation',
          validatedAt: new Date().toISOString(),
          validation: {
            success: true,
            errors: []
          }
        };

        returnData.push({
          json: result,
          pairedItem: { item: i }
        });

      } catch (error) {
        // Error handling similar to Patient node
        if (error instanceof NodeOperationError) {
          throw error;
        }
        throw new NodeOperationError(
          this.getNode(),
          `Error processing item ${i}: ${error.message}`,
          { itemIndex: i }
        );
      }
    }

    return [returnData];
  }

  private extractObservationData(itemIndex: number): any {
    const observationType = this.getNodeParameter('observationType', itemIndex) as string;
    const valueType = this.getNodeParameter('valueType', itemIndex) as string;

    const data: any = {
      id: this.getNodeParameter('id', itemIndex, '') as string,
      status: this.getNodeParameter('status', itemIndex) as string,
      subject: this.getNodeParameter('subject', itemIndex) as string,
      effectiveDateTime: this.getNodeParameter('effectiveDateTime', itemIndex, '') as string,
      observationType,
      valueType
    };

    // Extract code based on observation type
    if (observationType === 'vital-signs') {
      data.code = this.getNodeParameter('code', itemIndex) as string;
    } else {
      data.customCode = {
        system: this.getNodeParameter('customCodeSystem', itemIndex, '') as string,
        code: this.getNodeParameter('customCode', itemIndex, '') as string,
        display: this.getNodeParameter('customDisplay', itemIndex, '') as string
      };
    }

    // Extract value based on value type
    switch (valueType) {
      case 'valueQuantity':
        data.value = {
          value: this.getNodeParameter('quantityValue', itemIndex) as number,
          unit: this.getNodeParameter('quantityUnit', itemIndex, '') as string,
          system: this.getNodeParameter('quantitySystem', itemIndex, '') as string,
          code: this.getNodeParameter('quantityCode', itemIndex, '') as string
        };
        break;
      case 'valueString':
        data.value = this.getNodeParameter('stringValue', itemIndex, '') as string;
        break;
      case 'valueBoolean':
        data.value = this.getNodeParameter('booleanValue', itemIndex, false) as boolean;
        break;
    }

    // Extract components if present
    if (observationType === 'vital-signs') {
      data.component = this.getNodeParameter('component.componentValues', itemIndex, []) as any[];
    }

    return data;
  }

  private transformToFhirObservation(data: any): Observation {
    const observation: any = {
      resourceType: 'Observation',
      status: data.status,
      subject: {
        reference: data.subject
      }
    };

    if (data.id) {
      observation.id = data.id;
    }

    if (data.effectiveDateTime) {
      observation.effectiveDateTime = data.effectiveDateTime;
    }

    // Set observation code
    if (data.observationType === 'vital-signs') {
      observation.code = this.getLoincCodeableConcept(data.code);
    } else if (data.customCode) {
      observation.code = {
        coding: [{
          system: data.customCode.system,
          code: data.customCode.code,
          display: data.customCode.display
        }]
      };
    }

    // Set value based on type
    switch (data.valueType) {
      case 'valueQuantity':
        observation.valueQuantity = {
          value: data.value.value,
          unit: data.value.unit,
          system: data.value.system,
          code: data.value.code
        };
        break;
      case 'valueString':
        observation.valueString = data.value;
        break;
      case 'valueBoolean':
        observation.valueBoolean = data.value;
        break;
    }

    // Add components for complex observations
    if (data.component && Array.isArray(data.component) && data.component.length > 0) {
      observation.component = data.component.map((comp: any) => ({
        code: this.getLoincCodeableConcept(comp.code),
        valueQuantity: {
          value: comp.value,
          unit: comp.unit,
          system: 'http://unitsofmeasure.org',
          code: comp.unit === 'mmHg' ? 'mm[Hg]' : comp.unit
        }
      }));
    }

    return observation as Observation;
  }

  private getLoincCodeableConcept(loincCode: string): any {
    // Mapping of LOINC codes to display names
    const loincMapping: Record<string, string> = {
      '85354-9': 'Blood pressure panel',
      '8310-5': 'Body temperature',
      '8867-4': 'Heart rate',
      '9279-1': 'Respiratory rate',
      '29463-7': 'Body weight',
      '8302-2': 'Body height',
      '39156-5': 'Body mass index (BMI)',
      '2708-6': 'Oxygen saturation',
      '8480-6': 'Systolic blood pressure',
      '8462-4': 'Diastolic blood pressure'
    };

    return {
      coding: [{
        system: 'http://loinc.org',
        code: loincCode,
        display: loincMapping[loincCode] || 'Unknown observation'
      }]
    };
  }
}
```

### Week 7-8: Encounter Node and Integration Testing

#### Encounter Node Implementation
Similar complexity to Observation but focused on:
- Episode of care management
- Provider and location references
- Status transitions and workflows
- Diagnosis and reason codes

#### Integration Testing Strategy
```typescript
// tests/integration/workflow.test.ts
describe('FHIR Workflow Integration', () => {
  it('should create complete patient episode workflow', async () => {
    // Test full workflow: Patient → Encounter → Observation
    const workflow = {
      nodes: [
        { type: 'fhirPatient', operation: 'create' },
        { type: 'fhirEncounter', operation: 'create' },
        { type: 'fhirObservation', operation: 'create' }
      ]
    };

    // Execute workflow and validate FHIR resource relationships
    const result = await executeWorkflow(workflow);
    expect(result.encounter.subject.reference).toBe(`Patient/${result.patient.id}`);
    expect(result.observation.encounter.reference).toBe(`Encounter/${result.encounter.id}`);
  });
});
```

## Phase 3: Production Readiness (Weeks 9-12)

### Week 9-10: Advanced Features and Optimization

#### Extension Support
```typescript
// packages/core/src/extensions/extension-handler.ts
export class FhirExtensionHandler {
  addExtensionField(resourceType: string, extensionUrl: string): INodeProperties {
    return {
      displayName: `Extension: ${this.getExtensionDisplayName(extensionUrl)}`,
      name: `extension_${this.sanitizeUrl(extensionUrl)}`,
      type: 'string',
      description: `Custom extension: ${extensionUrl}`
    };
  }

  transformExtensions(nodeData: any, resourceType: string): any[] {
    const extensions = [];

    Object.keys(nodeData).forEach(key => {
      if (key.startsWith('extension_')) {
        const url = this.restoreUrl(key);
        extensions.push({
          url,
          valueString: nodeData[key]
        });
      }
    });

    return extensions;
  }
}
```

#### Custom Profile Support
```typescript
// packages/core/src/profiles/profile-manager.ts
export class FhirProfileManager {
  private profiles = new Map<string, FhirProfile>();

  registerProfile(profile: FhirProfile): void {
    this.profiles.set(profile.url, profile);
  }

  getProfileFields(profileUrl: string): INodeProperties[] {
    const profile = this.profiles.get(profileUrl);
    if (!profile) {
      throw new Error(`Profile not found: ${profileUrl}`);
    }

    return profile.elements.map(element =>
      this.fieldGenerator.generateField(element)
    );
  }

  validateAgainstProfile(resource: any, profileUrl: string): ValidationResult {
    // Custom profile validation logic
    const profile = this.profiles.get(profileUrl);
    return this.profileValidator.validate(resource, profile);
  }
}
```

### Week 11-12: Documentation and Distribution

#### NPM Package Configuration
```json
// package.json (root)
{
  "name": "@fhir-n8n/monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "publish:all": "pnpm -r publish"
  }
}

// packages/nodes/patient/package.json
{
  "name": "@fhir-n8n/patient",
  "version": "1.0.0",
  "main": "dist/index.js",
  "n8n": {
    "nodes": [
      "dist/nodes/Patient/Patient.node.js"
    ]
  },
  "keywords": [
    "n8n",
    "n8n-nodes-module",
    "fhir",
    "healthcare",
    "patient"
  ]
}
```

#### User Documentation Structure
```
docs/
├── getting-started/
│   ├── installation.md
│   ├── first-workflow.md
│   └── healthcare-concepts.md
├── nodes/
│   ├── patient.md
│   ├── observation.md
│   ├── encounter.md
│   └── ...
├── examples/
│   ├── patient-registration.md
│   ├── vital-signs-monitoring.md
│   ├── lab-results-processing.md
│   └── insurance-workflow.md
├── advanced/
│   ├── custom-profiles.md
│   ├── extensions.md
│   └── validation-customization.md
└── api/
    ├── core-api.md
    └── field-generator-api.md
```

## Quality Assurance and Testing Strategy

### Test Coverage Requirements
- **Unit Tests**: >90% coverage for all node logic
- **Integration Tests**: Full workflow testing with healthcare scenarios
- **FHIR Compliance Tests**: Validation against official FHIR test suites
- **Performance Tests**: Load testing with typical healthcare data volumes

### Healthcare Data Testing
```typescript
// tests/fixtures/healthcare-data.ts
export const HEALTHCARE_TEST_DATA = {
  patients: [
    {
      scenario: 'typical_adult_patient',
      input: {
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1985-03-15',
        email: 'john.doe@example.com'
      },
      expectedFhir: {
        resourceType: 'Patient',
        gender: 'male',
        birthDate: '1985-03-15'
        // ... complete expected FHIR structure
      }
    },
    {
      scenario: 'pediatric_patient_with_guardian',
      // ... pediatric-specific test data
    }
  ],
  observations: [
    {
      scenario: 'blood_pressure_reading',
      input: {
        patientId: 'patient-123',
        systolic: 120,
        diastolic: 80,
        dateTime: '2025-12-15T10:30:00Z'
      },
      expectedFhir: {
        resourceType: 'Observation',
        component: [
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8480-6' }] },
            valueQuantity: { value: 120, unit: 'mmHg' }
          }
        ]
      }
    }
  ]
};
```

## Deployment and Distribution Strategy

### Development Distribution
- **GitHub Repository**: Public repository with comprehensive documentation
- **NPM Registry**: Individual packages published to NPM for easy installation
- **n8n Community**: Integration with n8n community package registry

### Enterprise Distribution
- **Private Registry**: Support for private npm registries
- **Custom Builds**: Configurable builds for specific healthcare organizations
- **Support Packages**: Professional support and customization services

## Success Metrics and KPIs

### Technical Metrics
- **FHIR Compliance Rate**: 100% validation success against R4 specification
- **Performance Benchmarks**:
  - Node loading time: <1 second
  - Validation time: <100ms per resource
  - Memory usage: <50MB per node instance
- **Error Rates**: <1% validation errors in production use

### User Adoption Metrics
- **Download Statistics**: NPM download counts and growth rates
- **Community Engagement**: GitHub stars, issues, pull requests
- **Usage Analytics**: Workflow creation and execution statistics
- **User Feedback**: NPS scores and user satisfaction surveys

### Healthcare Impact Metrics
- **Integration Success**: Number of successful EMR/HIE integrations
- **Data Quality**: Accuracy of FHIR resource generation
- **Workflow Efficiency**: Time savings in healthcare data processing
- **Compliance Achievement**: Successful audits and certifications

## Risk Management and Mitigation

### Technical Risks
1. **FHIR Specification Changes**:
   - Monitor FHIR specification updates
   - Maintain backward compatibility layers
   - Automated testing against new FHIR versions

2. **n8n Platform Dependencies**:
   - Abstract n8n-specific code behind interfaces
   - Maintain compatibility with multiple n8n versions
   - Monitor n8n roadmap and breaking changes

3. **TypeScript Library Dependencies**:
   - Pin dependency versions in production builds
   - Maintain fallback implementations
   - Regular security audits

### Healthcare Domain Risks
1. **Compliance Requirements**:
   - Regular review with healthcare legal experts
   - Audit trail implementation
   - Privacy and security documentation

2. **Data Accuracy**:
   - Comprehensive validation at multiple levels
   - Healthcare domain expert review
   - Real-world testing with healthcare partners

3. **Interoperability**:
   - Testing with major EMR systems
   - Conformance to healthcare standards
   - Regular validation against FHIR test suites

## Conclusion

This implementation plan provides a comprehensive roadmap for creating FHIR-compliant custom nodes for n8n, balancing technical complexity with user experience. The phased approach ensures steady progress while maintaining high quality standards throughout the development process.

The combination of modern TypeScript tooling, robust FHIR libraries, and n8n's visual workflow paradigm creates an opportunity to significantly improve healthcare data integration workflows while maintaining strict compliance with industry standards.

Success will be measured not only by technical metrics but by the real-world impact on healthcare organizations' ability to integrate and transform healthcare data efficiently and accurately.

---

*This implementation plan will be updated as development progresses and new requirements emerge. All phases include continuous feedback loops and iterative improvement processes.*