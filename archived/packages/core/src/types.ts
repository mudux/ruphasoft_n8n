import { INodeProperties, INodeExecutionData } from 'n8n-workflow';
import { z } from 'zod';

// Base FHIR resource interface
export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
}

// n8n node execution result for FHIR resources
export interface FhirNodeExecutionData extends INodeExecutionData {
  json: {
    fhirResource: FhirResource;
    resourceType: string;
    validatedAt: string;
    validationErrors?: string[];
  };
}

// Field complexity levels for UI generation
export enum FieldComplexity {
  SIMPLE = 'simple',      // Basic string, number, date fields
  COMPLEX = 'complex',    // Objects, arrays, coded values
  ADVANCED = 'advanced'   // Extensions, profiles, references
}

// FHIR field specification for dynamic generation
export interface FhirFieldSpec {
  fieldName: string;
  fieldType: string;
  cardinality: string;    // 0..1, 0..*, 1..1, etc.
  complexity: FieldComplexity;
  description: string;
  terminology?: {
    system: string;       // e.g., http://loinc.org
    valueSet?: string;    // e.g., http://hl7.org/fhir/ValueSet/gender
  };
  defaultValue?: any;
}

// Template for common FHIR patterns
export interface FhirFieldTemplate {
  name: string;
  displayName: string;
  description: string;
  properties: INodeProperties;
  transformFunction: (value: any) => any;
  validationSchema: z.ZodSchema;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  resource?: FhirResource;
}

// Node configuration for FHIR resources
export interface FhirNodeConfig {
  resourceType: string;
  displayName: string;
  description: string;
  requiredFields: string[];
  fieldSpecs: Record<string, FhirFieldSpec>;
  templates: FhirFieldTemplate[];
}