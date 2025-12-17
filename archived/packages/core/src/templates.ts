import { INodeProperties } from 'n8n-workflow';
import { z } from 'zod';
import { FhirFieldTemplate } from './types';
import { FhirTransformer } from './transforms';
import { HumanNameSchema, ContactPointSchema, IdentifierSchema, CodeableConceptSchema, ReferenceSchema } from './validation';

// Common FHIR field templates for reuse across nodes
export const FhirFieldTemplates: Record<string, FhirFieldTemplate> = {
  humanName: {
    name: 'humanName',
    displayName: 'Names',
    description: 'Human names associated with the resource',
    properties: {
      displayName: 'Names',
      name: 'name',
      type: 'fixedCollection',
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
                { name: 'Maiden', value: 'maiden' },
              ],
              default: 'usual',
            },
            {
              displayName: 'Text',
              name: 'text',
              type: 'string',
              default: '',
              description: 'Full name as it should be displayed',
            },
            {
              displayName: 'Family Name',
              name: 'family',
              type: 'string',
              default: '',
              description: 'Family name (surname)',
            },
            {
              displayName: 'Given Names',
              name: 'given',
              type: 'string',
              typeOptions: {
                multipleValues: true,
              },
              default: [],
              description: 'Given names (first name, middle names)',
            },
            {
              displayName: 'Prefix',
              name: 'prefix',
              type: 'string',
              typeOptions: {
                multipleValues: true,
              },
              default: [],
              description: 'Parts that come before the name (e.g., Dr., Mr.)',
            },
            {
              displayName: 'Suffix',
              name: 'suffix',
              type: 'string',
              typeOptions: {
                multipleValues: true,
              },
              default: [],
              description: 'Parts that come after the name (e.g., Jr., PhD)',
            },
          ],
        },
      ],
    },
    transformFunction: FhirTransformer.transformHumanNames,
    validationSchema: z.array(HumanNameSchema),
  },

  contactPoint: {
    name: 'contactPoint',
    displayName: 'Contact Information',
    description: 'Telephone, email, fax, etc.',
    properties: {
      displayName: 'Contact Information',
      name: 'telecom',
      type: 'fixedCollection',
      placeholder: 'Add Contact',
      typeOptions: {
        multipleValues: true,
      },
      default: {},
      options: [
        {
          name: 'contactValues',
          displayName: 'Contact',
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
                { name: 'Other', value: 'other' },
              ],
              default: 'phone',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              description: 'The contact value (phone number, email address, etc.)',
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
                { name: 'Mobile', value: 'mobile' },
              ],
              default: 'home',
            },
            {
              displayName: 'Rank',
              name: 'rank',
              type: 'number',
              default: 1,
              description: 'Preference order (1 = highest)',
            },
          ],
        },
      ],
    },
    transformFunction: FhirTransformer.transformContactPoints,
    validationSchema: z.array(ContactPointSchema),
  },

  identifier: {
    name: 'identifier',
    displayName: 'Identifiers',
    description: 'Business identifiers for the resource',
    properties: {
      displayName: 'Identifiers',
      name: 'identifier',
      type: 'fixedCollection',
      placeholder: 'Add Identifier',
      typeOptions: {
        multipleValues: true,
      },
      default: {},
      options: [
        {
          name: 'identifierValues',
          displayName: 'Identifier',
          values: [
            {
              displayName: 'Use',
              name: 'use',
              type: 'options',
              options: [
                { name: 'Usual', value: 'usual' },
                { name: 'Official', value: 'official' },
                { name: 'Temp', value: 'temp' },
                { name: 'Secondary', value: 'secondary' },
              ],
              default: 'usual',
            },
            {
              displayName: 'System',
              name: 'system',
              type: 'string',
              default: '',
              description: 'Namespace for the identifier (e.g., http://hospital.example.org/patient-ids)',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              description: 'The unique identifier',
              required: true,
            },
          ],
        },
      ],
    },
    transformFunction: FhirTransformer.transformIdentifiers,
    validationSchema: z.array(IdentifierSchema),
  },

  codeableConcept: {
    name: 'codeableConcept',
    displayName: 'Coded Value',
    description: 'A coded concept from a terminology system',
    properties: {
      displayName: 'Coded Value',
      name: 'codeableConcept',
      type: 'collection',
      default: {},
      options: [
        {
          name: 'coding',
          displayName: 'Coding',
          type: 'fixedCollection',
          typeOptions: {
            multipleValues: true,
          },
          default: {},
          options: [
            {
              name: 'codingValues',
              displayName: 'Code',
              values: [
                {
                  displayName: 'System',
                  name: 'system',
                  type: 'string',
                  default: '',
                  description: 'Coding system URI (e.g., http://loinc.org)',
                },
                {
                  displayName: 'Code',
                  name: 'code',
                  type: 'string',
                  default: '',
                  description: 'Code from the system',
                },
                {
                  displayName: 'Display',
                  name: 'display',
                  type: 'string',
                  default: '',
                  description: 'Human readable name for the code',
                },
              ],
            },
          ],
        },
        {
          name: 'text',
          displayName: 'Text',
          type: 'string',
          default: '',
          description: 'Plain text representation',
        },
      ],
    },
    transformFunction: FhirTransformer.transformCodeableConcept,
    validationSchema: CodeableConceptSchema,
  },

  reference: {
    name: 'reference',
    displayName: 'Reference',
    description: 'Reference to another FHIR resource',
    properties: {
      displayName: 'Reference',
      name: 'reference',
      type: 'collection',
      default: {},
      options: [
        {
          name: 'reference',
          displayName: 'Reference',
          type: 'string',
          default: '',
          description: 'Relative or absolute URL reference (e.g., Patient/123)',
        },
        {
          name: 'type',
          displayName: 'Type',
          type: 'string',
          default: '',
          description: 'Type the reference refers to (e.g., Patient)',
        },
        {
          name: 'display',
          displayName: 'Display',
          type: 'string',
          default: '',
          description: 'Human readable description',
        },
      ],
    },
    transformFunction: FhirTransformer.transformReference,
    validationSchema: ReferenceSchema,
  },
};

// Generate properties from template
export function generatePropertiesFromTemplate(
  template: FhirFieldTemplate,
  fieldName?: string,
  customOptions?: Partial<INodeProperties>
): INodeProperties {
  const properties = { ...template.properties };

  if (fieldName) {
    properties.name = fieldName;
  }

  if (customOptions) {
    Object.assign(properties, customOptions);
  }

  return properties;
}