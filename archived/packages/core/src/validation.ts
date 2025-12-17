import { z } from 'zod';
import { ValidationResult, FhirResource } from './types';

// Base FHIR resource schema
export const BaseFhirResourceSchema = z.object({
  resourceType: z.string().min(1),
  id: z.string().optional(),
  meta: z.object({
    versionId: z.string().optional(),
    lastUpdated: z.string().datetime().optional(),
    profile: z.array(z.string()).optional(),
  }).optional(),
});

// Common FHIR data type schemas
export const IdentifierSchema = z.object({
  use: z.enum(['usual', 'official', 'temp', 'secondary']).optional(),
  type: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  }).optional(),
  system: z.string().optional(),
  value: z.string(),
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
});

export const HumanNameSchema = z.object({
  use: z.enum(['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden']).optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
});

export const ContactPointSchema = z.object({
  system: z.enum(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other']).optional(),
  value: z.string().optional(),
  use: z.enum(['home', 'work', 'temp', 'old', 'mobile']).optional(),
  rank: z.number().int().positive().optional(),
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
});

export const CodeableConceptSchema = z.object({
  coding: z.array(z.object({
    system: z.string().optional(),
    version: z.string().optional(),
    code: z.string().optional(),
    display: z.string().optional(),
    userSelected: z.boolean().optional(),
  })).optional(),
  text: z.string().optional(),
});

export const ReferenceSchema = z.object({
  reference: z.string().optional(),
  type: z.string().optional(),
  identifier: IdentifierSchema.optional(),
  display: z.string().optional(),
});

// Validation utility functions
export class FhirValidator {
  static validateResource<T extends FhirResource>(
    resource: unknown,
    schema: z.ZodSchema<T>
  ): ValidationResult {
    const result = schema.safeParse(resource);

    if (result.success) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        resource: result.data,
      };
    } else {
      return {
        isValid: false,
        errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        warnings: [],
      };
    }
  }

  static validateRequiredFields(resource: any, requiredFields: string[]): string[] {
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (!this.hasValue(resource, field)) {
        errors.push(`Required field '${field}' is missing`);
      }
    }

    return errors;
  }

  static hasValue(obj: any, path: string): boolean {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current == null || current[part] == null) {
        return false;
      }
      current = current[part];
    }

    return true;
  }

  static validateBusinessRules(resource: FhirResource): string[] {
    const warnings: string[] = [];

    // Common business rule validations
    if (resource.id && !/^[A-Za-z0-9\-\.]{1,64}$/.test(resource.id)) {
      warnings.push('Resource ID should only contain alphanumeric characters, hyphens, and periods');
    }

    return warnings;
  }
}

// Generate FHIR-compliant IDs
export function generateFhirId(resourceType: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${resourceType.toLowerCase()}-${timestamp}-${random}`;
}