// Utility functions for FHIR n8n nodes

import { INodeExecutionData, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { FhirResource, FhirNodeExecutionData, ValidationResult } from './types';

// Error handling utilities
export class FhirNodeError extends NodeOperationError {
  constructor(node: any, message: string, description?: string, httpCode?: string) {
    super(node, message, { description, httpCode });
    this.name = 'FhirNodeError';
  }
}

export class FhirValidationError extends FhirNodeError {
  constructor(node: any, validationResult: ValidationResult) {
    const message = `FHIR validation failed: ${validationResult.errors.join(', ')}`;
    const description = validationResult.warnings.length > 0
      ? `Warnings: ${validationResult.warnings.join(', ')}`
      : undefined;

    super(node, message, description, '400');
    this.name = 'FhirValidationError';
  }
}

// Node execution utilities
export class FhirNodeUtils {
  static createSuccessResponse(
    fhirResource: FhirResource,
    validationResult?: ValidationResult
  ): FhirNodeExecutionData {
    return {
      json: {
        fhirResource,
        resourceType: fhirResource.resourceType,
        validatedAt: new Date().toISOString(),
        validationErrors: validationResult?.errors,
      },
    };
  }

  static createErrorResponse(
    error: string | string[],
    resourceType: string
  ): FhirNodeExecutionData {
    const errors = Array.isArray(error) ? error : [error];

    return {
      json: {
        fhirResource: { resourceType } as FhirResource,
        resourceType,
        validatedAt: new Date().toISOString(),
        validationErrors: errors,
      },
    };
  }

  static handleValidationResult(
    context: IExecuteFunctions,
    validationResult: ValidationResult,
    resourceType: string
  ): FhirNodeExecutionData {
    if (!validationResult.isValid) {
      throw new FhirValidationError(context.getNode(), validationResult);
    }

    return this.createSuccessResponse(validationResult.resource!, validationResult);
  }

  static getParameterSafely<T = any>(
    context: IExecuteFunctions,
    parameterName: string,
    itemIndex: number,
    defaultValue?: T
  ): T {
    try {
      return context.getNodeParameter(parameterName, itemIndex, defaultValue) as T;
    } catch (error) {
      throw new FhirNodeError(
        context.getNode(),
        `Failed to get parameter '${parameterName}': ${error.message}`
      );
    }
  }

  static validateRequiredParameters(
    context: IExecuteFunctions,
    requiredParams: string[],
    itemIndex: number
  ): void {
    const missing: string[] = [];

    for (const param of requiredParams) {
      const value = context.getNodeParameter(param, itemIndex, undefined);
      if (value === undefined || value === null || value === '') {
        missing.push(param);
      }
    }

    if (missing.length > 0) {
      throw new FhirNodeError(
        context.getNode(),
        `Missing required parameters: ${missing.join(', ')}`
      );
    }
  }
}

// Data processing utilities
export class DataUtils {
  static isEmptyValue(value: any): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    if (Array.isArray(value)) {
      return value.length === 0 || value.every(item => this.isEmptyValue(item));
    }

    if (typeof value === 'object') {
      return Object.keys(value).length === 0 ||
             Object.values(value).every(val => this.isEmptyValue(val));
    }

    return false;
  }

  static cleanEmptyValues<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      const cleaned = obj
        .map(item => this.cleanEmptyValues(item))
        .filter(item => !this.isEmptyValue(item));

      return (cleaned.length > 0 ? cleaned : undefined) as T;
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      let hasValue = false;

      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.cleanEmptyValues(value);
        if (!this.isEmptyValue(cleanedValue)) {
          cleaned[key] = cleanedValue;
          hasValue = true;
        }
      }

      return (hasValue ? cleaned : undefined) as T;
    }

    return obj;
  }

  static mergeDeep<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = (result as any)[key];

        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          (result as any)[key] = this.mergeDeep(targetValue, sourceValue);
        } else {
          (result as any)[key] = sourceValue;
        }
      }
    }

    return result;
  }

  private static isObject(item: any): item is object {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

// Logging utilities
export class FhirLogger {
  static logValidationWarnings(warnings: string[], resourceType: string): void {
    if (warnings.length > 0) {
      console.warn(`FHIR ${resourceType} validation warnings:`, warnings);
    }
  }

  static logTransformation(from: string, to: string, data: any): void {
    console.debug(`FHIR transformation ${from} → ${to}:`, {
      inputKeys: Object.keys(data || {}),
      timestamp: new Date().toISOString(),
    });
  }

  static logResourceCreation(resource: FhirResource): void {
    console.info(`Created FHIR ${resource.resourceType} resource:`, {
      resourceType: resource.resourceType,
      id: resource.id,
      timestamp: new Date().toISOString(),
    });
  }
}

// Async utilities
export class AsyncUtils {
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        await this.delay(delayMs * attempt);
      }
    }

    throw lastError!;
  }

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Type guards
export class TypeGuards {
  static isFhirResource(obj: any): obj is FhirResource {
    return obj &&
           typeof obj === 'object' &&
           typeof obj.resourceType === 'string' &&
           obj.resourceType.length > 0;
  }

  static isFhirNodeExecutionData(data: any): data is FhirNodeExecutionData {
    return data &&
           data.json &&
           typeof data.json.resourceType === 'string' &&
           data.json.fhirResource &&
           this.isFhirResource(data.json.fhirResource);
  }
}