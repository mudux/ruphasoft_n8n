import { format, parseISO } from 'date-fns';
import { FhirResource } from './types';
import { generateFhirId } from './validation';

// Transform n8n form data to FHIR resources
export class FhirTransformer {

  // Transform human names from n8n collection format
  static transformHumanNames(nameData: any[]): any[] {
    if (!Array.isArray(nameData)) return [];

    return nameData.map(name => ({
      use: name.use || 'usual',
      text: name.text,
      family: name.family,
      given: Array.isArray(name.given) ? name.given : (name.given ? [name.given] : []),
      prefix: Array.isArray(name.prefix) ? name.prefix : (name.prefix ? [name.prefix] : []),
      suffix: Array.isArray(name.suffix) ? name.suffix : (name.suffix ? [name.suffix] : []),
      period: name.period ? {
        start: name.period.start ? this.formatDateTime(name.period.start) : undefined,
        end: name.period.end ? this.formatDateTime(name.period.end) : undefined,
      } : undefined,
    })).filter(name => name.family || (name.given && name.given.length > 0));
  }

  // Transform contact points (telecom)
  static transformContactPoints(telecomData: any[]): any[] {
    if (!Array.isArray(telecomData)) return [];

    return telecomData.map(contact => ({
      system: contact.system || 'phone',
      value: contact.value,
      use: contact.use || 'home',
      rank: contact.rank ? parseInt(contact.rank) : undefined,
      period: contact.period ? {
        start: contact.period.start ? this.formatDateTime(contact.period.start) : undefined,
        end: contact.period.end ? this.formatDateTime(contact.period.end) : undefined,
      } : undefined,
    })).filter(contact => contact.value);
  }

  // Transform identifiers
  static transformIdentifiers(identifierData: any[]): any[] {
    if (!Array.isArray(identifierData)) return [];

    return identifierData.map(identifier => ({
      use: identifier.use || 'usual',
      type: identifier.type ? {
        coding: identifier.type.coding || [],
        text: identifier.type.text,
      } : undefined,
      system: identifier.system,
      value: identifier.value,
      period: identifier.period ? {
        start: identifier.period.start ? this.formatDateTime(identifier.period.start) : undefined,
        end: identifier.period.end ? this.formatDateTime(identifier.period.end) : undefined,
      } : undefined,
    })).filter(identifier => identifier.value);
  }

  // Transform CodeableConcept
  static transformCodeableConcept(conceptData: any): any {
    if (!conceptData) return undefined;

    return {
      coding: Array.isArray(conceptData.coding) ? conceptData.coding.map((coding: any) => ({
        system: coding.system,
        version: coding.version,
        code: coding.code,
        display: coding.display,
        userSelected: coding.userSelected,
      })).filter((coding: any) => coding.code) : [],
      text: conceptData.text,
    };
  }

  // Transform Reference
  static transformReference(referenceData: any): any {
    if (!referenceData) return undefined;

    return {
      reference: referenceData.reference,
      type: referenceData.type,
      identifier: referenceData.identifier ? this.transformIdentifiers([referenceData.identifier])[0] : undefined,
      display: referenceData.display,
    };
  }

  // Transform date/time values to FHIR format
  static formatDateTime(dateValue: string | Date): string {
    if (!dateValue) return '';

    try {
      const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
      return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    } catch (error) {
      // Fallback for date-only values
      try {
        const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
        return format(date, 'yyyy-MM-dd');
      } catch {
        return dateValue.toString();
      }
    }
  }

  // Format date-only values
  static formatDate(dateValue: string | Date): string {
    if (!dateValue) return '';

    try {
      const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      return dateValue.toString();
    }
  }

  // Base resource transformation
  static transformBaseResource(nodeData: any, resourceType: string): Partial<FhirResource> {
    return {
      resourceType,
      id: nodeData.id || generateFhirId(resourceType),
      meta: nodeData.meta ? {
        versionId: nodeData.meta.versionId,
        lastUpdated: nodeData.meta.lastUpdated ? this.formatDateTime(nodeData.meta.lastUpdated) : new Date().toISOString(),
        profile: Array.isArray(nodeData.meta.profile) ? nodeData.meta.profile : undefined,
      } : {
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  // Clean undefined values from object
  static cleanUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    if (Array.isArray(obj)) {
      const cleaned = obj.map(item => this.cleanUndefined(item)).filter(item => item !== undefined);
      return cleaned.length > 0 ? cleaned : undefined;
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      let hasValue = false;

      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.cleanUndefined(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
          hasValue = true;
        }
      }

      return hasValue ? cleaned : undefined;
    }

    return obj;
  }
}