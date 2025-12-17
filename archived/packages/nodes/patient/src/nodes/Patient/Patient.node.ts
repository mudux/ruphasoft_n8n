import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import { z } from 'zod';
import {
  FhirValidator,
  FhirTransformer,
  FhirNodeUtils,
  FhirFieldTemplates,
  generatePropertiesFromTemplate,
  FHIR_RESOURCE_TYPES,
  FHIR_VALUE_SETS,
  SMART_DEFAULTS,
  NODE_CATEGORIES,
  BaseFhirResourceSchema,
  HumanNameSchema,
  ContactPointSchema,
  IdentifierSchema,
} from '@fhir-n8n/core';

// FHIR Patient resource schema
const PatientSchema = BaseFhirResourceSchema.extend({
  resourceType: z.literal(FHIR_RESOURCE_TYPES.PATIENT),
  active: z.boolean().optional(),
  name: z.array(HumanNameSchema).optional(),
  telecom: z.array(ContactPointSchema).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
  deceasedBoolean: z.boolean().optional(),
  deceasedDateTime: z.string().datetime().optional(),
  address: z.array(z.object({
    use: z.enum(['home', 'work', 'temp', 'old', 'billing']).optional(),
    type: z.enum(['postal', 'physical', 'both']).optional(),
    text: z.string().optional(),
    line: z.array(z.string()).optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    period: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
  })).optional(),
  maritalStatus: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  }).optional(),
  multipleBirthBoolean: z.boolean().optional(),
  multipleBirthInteger: z.number().int().optional(),
  photo: z.array(z.object({
    contentType: z.string().optional(),
    language: z.string().optional(),
    data: z.string().optional(), // base64Binary
    url: z.string().url().optional(),
    size: z.number().int().optional(),
    hash: z.string().optional(), // base64Binary
    title: z.string().optional(),
    creation: z.string().datetime().optional(),
  })).optional(),
  contact: z.array(z.object({
    relationship: z.array(z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
      text: z.string().optional(),
    })).optional(),
    name: HumanNameSchema.optional(),
    telecom: z.array(ContactPointSchema).optional(),
    address: z.object({
      use: z.enum(['home', 'work', 'temp', 'old', 'billing']).optional(),
      type: z.enum(['postal', 'physical', 'both']).optional(),
      text: z.string().optional(),
      line: z.array(z.string()).optional(),
      city: z.string().optional(),
      district: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
    gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
    organization: z.object({
      reference: z.string().optional(),
      type: z.string().optional(),
      identifier: IdentifierSchema.optional(),
      display: z.string().optional(),
    }).optional(),
    period: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
  })).optional(),
  communication: z.array(z.object({
    language: z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
      text: z.string().optional(),
    }),
    preferred: z.boolean().optional(),
  })).optional(),
  generalPractitioner: z.array(z.object({
    reference: z.string().optional(),
    type: z.string().optional(),
    identifier: IdentifierSchema.optional(),
    display: z.string().optional(),
  })).optional(),
  managingOrganization: z.object({
    reference: z.string().optional(),
    type: z.string().optional(),
    identifier: IdentifierSchema.optional(),
    display: z.string().optional(),
  }).optional(),
  link: z.array(z.object({
    other: z.object({
      reference: z.string().optional(),
      type: z.string().optional(),
      identifier: IdentifierSchema.optional(),
      display: z.string().optional(),
    }),
    type: z.enum(['replaced-by', 'replaces', 'refer', 'seealso']),
  })).optional(),
});

export class Patient implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FHIR Patient',
    name: 'fhirPatient',
    icon: 'fa:user-md',
    group: [NODE_CATEGORIES.FHIR_CORE],
    version: 1,
    description: 'Create and manage FHIR Patient resources with visual field mapping',
    defaults: {
      name: 'FHIR Patient',
      color: '#4A90E2',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      // Resource Identification
      {
        displayName: 'Resource ID',
        name: 'id',
        type: 'string',
        default: '',
        description: 'Logical ID of this resource (auto-generated if empty)',
      },
      {
        displayName: 'Active',
        name: 'active',
        type: 'boolean',
        default: true,
        description: 'Whether this patient record is in active use',
      },

      // Names
      generatePropertiesFromTemplate(FhirFieldTemplates.humanName, 'name', {
        description: 'A name associated with the patient',
      }),

      // Contact Information
      generatePropertiesFromTemplate(FhirFieldTemplates.contactPoint, 'telecom', {
        description: 'A contact detail for the patient',
      }),

      // Identifiers
      generatePropertiesFromTemplate(FhirFieldTemplates.identifier, 'identifier', {
        description: 'An identifier for this patient',
      }),

      // Demographics
      {
        displayName: 'Gender',
        name: 'gender',
        type: 'options',
        options: [
          { name: 'Male', value: FHIR_VALUE_SETS.GENDER.MALE },
          { name: 'Female', value: FHIR_VALUE_SETS.GENDER.FEMALE },
          { name: 'Other', value: FHIR_VALUE_SETS.GENDER.OTHER },
          { name: 'Unknown', value: FHIR_VALUE_SETS.GENDER.UNKNOWN },
        ],
        default: FHIR_VALUE_SETS.GENDER.UNKNOWN,
        description: 'Administrative gender',
      },
      {
        displayName: 'Birth Date',
        name: 'birthDate',
        type: 'dateTime',
        default: '',
        description: 'Date of birth (YYYY-MM-DD format)',
      },

      // Address
      {
        displayName: 'Addresses',
        name: 'address',
        type: 'fixedCollection',
        placeholder: 'Add Address',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        options: [
          {
            name: 'addressValues',
            displayName: 'Address',
            values: [
              {
                displayName: 'Use',
                name: 'use',
                type: 'options',
                options: [
                  { name: 'Home', value: 'home' },
                  { name: 'Work', value: 'work' },
                  { name: 'Temp', value: 'temp' },
                  { name: 'Old', value: 'old' },
                  { name: 'Billing', value: 'billing' },
                ],
                default: 'home',
              },
              {
                displayName: 'Type',
                name: 'type',
                type: 'options',
                options: [
                  { name: 'Postal', value: 'postal' },
                  { name: 'Physical', value: 'physical' },
                  { name: 'Both', value: 'both' },
                ],
                default: 'both',
              },
              {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                default: '',
                description: 'Full address as it should be displayed',
              },
              {
                displayName: 'Line',
                name: 'line',
                type: 'string',
                typeOptions: {
                  multipleValues: true,
                },
                default: [],
                description: 'Street address lines',
              },
              {
                displayName: 'City',
                name: 'city',
                type: 'string',
                default: '',
                description: 'Name of city, town, etc.',
              },
              {
                displayName: 'State',
                name: 'state',
                type: 'string',
                default: '',
                description: 'Sub-unit of country (state, province, etc.)',
              },
              {
                displayName: 'Postal Code',
                name: 'postalCode',
                type: 'string',
                default: '',
                description: 'Postal code for area',
              },
              {
                displayName: 'Country',
                name: 'country',
                type: 'string',
                default: '',
                description: 'Country name',
              },
            ],
          },
        ],
      },

      // Marital Status
      {
        displayName: 'Marital Status',
        name: 'maritalStatus',
        type: 'collection',
        default: {},
        options: [
          {
            name: 'text',
            displayName: 'Text',
            type: 'string',
            default: '',
            description: 'Plain text representation of marital status',
          },
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
                    default: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
                    description: 'Coding system URI',
                  },
                  {
                    displayName: 'Code',
                    name: 'code',
                    type: 'options',
                    options: [
                      { name: 'Single', value: 'S' },
                      { name: 'Married', value: 'M' },
                      { name: 'Divorced', value: 'D' },
                      { name: 'Widowed', value: 'W' },
                      { name: 'Unknown', value: 'UNK' },
                    ],
                    default: 'UNK',
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
        ],
      },

      // Deceased
      {
        displayName: 'Deceased',
        name: 'deceasedBoolean',
        type: 'boolean',
        default: false,
        description: 'Indicates if the individual is deceased',
      },
      {
        displayName: 'Deceased Date',
        name: 'deceasedDateTime',
        type: 'dateTime',
        default: '',
        description: 'Date and time of death',
        displayOptions: {
          show: {
            deceasedBoolean: [true],
          },
        },
      },

      // Multiple Birth
      {
        displayName: 'Multiple Birth',
        name: 'multipleBirthBoolean',
        type: 'boolean',
        default: false,
        description: 'Whether patient is part of a multiple birth',
      },
      {
        displayName: 'Birth Number',
        name: 'multipleBirthInteger',
        type: 'number',
        default: 1,
        description: 'Birth order number (for multiple births)',
        displayOptions: {
          show: {
            multipleBirthBoolean: [true],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const results: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        // Get node parameters
        const nodeData = {
          id: FhirNodeUtils.getParameterSafely(this, 'id', i, ''),
          active: FhirNodeUtils.getParameterSafely(this, 'active', i, true),
          name: FhirNodeUtils.getParameterSafely(this, 'name', i, []),
          telecom: FhirNodeUtils.getParameterSafely(this, 'telecom', i, []),
          identifier: FhirNodeUtils.getParameterSafely(this, 'identifier', i, []),
          gender: FhirNodeUtils.getParameterSafely(this, 'gender', i, FHIR_VALUE_SETS.GENDER.UNKNOWN),
          birthDate: FhirNodeUtils.getParameterSafely(this, 'birthDate', i, ''),
          address: FhirNodeUtils.getParameterSafely(this, 'address', i, []),
          maritalStatus: FhirNodeUtils.getParameterSafely(this, 'maritalStatus', i, {}),
          deceasedBoolean: FhirNodeUtils.getParameterSafely(this, 'deceasedBoolean', i, false),
          deceasedDateTime: FhirNodeUtils.getParameterSafely(this, 'deceasedDateTime', i, ''),
          multipleBirthBoolean: FhirNodeUtils.getParameterSafely(this, 'multipleBirthBoolean', i, false),
          multipleBirthInteger: FhirNodeUtils.getParameterSafely(this, 'multipleBirthInteger', i, undefined),
        };

        // Apply smart defaults
        const patientData = { ...SMART_DEFAULTS.Patient, ...nodeData };

        // Transform to FHIR Patient resource
        const patientResource = this.transformToFhirPatient(patientData);

        // Validate FHIR resource
        const validationResult = FhirValidator.validateResource(patientResource, PatientSchema);

        // Handle validation result
        const response = FhirNodeUtils.handleValidationResult(this, validationResult, FHIR_RESOURCE_TYPES.PATIENT);
        results.push(response);

      } catch (error) {
        if (error instanceof NodeOperationError) {
          throw error;
        }

        throw new NodeOperationError(
          this.getNode(),
          `Failed to create FHIR Patient resource: ${error.message}`,
          { itemIndex: i }
        );
      }
    }

    return [results];
  }

  private transformToFhirPatient(nodeData: any) {
    const baseResource = FhirTransformer.transformBaseResource(nodeData, FHIR_RESOURCE_TYPES.PATIENT);

    const patient = {
      ...baseResource,
      active: nodeData.active,
      name: this.transformNameCollection(nodeData.name),
      telecom: this.transformTelecomCollection(nodeData.telecom),
      identifier: this.transformIdentifierCollection(nodeData.identifier),
      gender: nodeData.gender || undefined,
      birthDate: nodeData.birthDate ? FhirTransformer.formatDate(nodeData.birthDate) : undefined,
      address: this.transformAddressCollection(nodeData.address),
      maritalStatus: this.transformMaritalStatus(nodeData.maritalStatus),
      deceasedBoolean: nodeData.deceasedBoolean || undefined,
      deceasedDateTime: nodeData.deceasedDateTime
        ? FhirTransformer.formatDateTime(nodeData.deceasedDateTime)
        : undefined,
      multipleBirthBoolean: nodeData.multipleBirthBoolean || undefined,
      multipleBirthInteger: nodeData.multipleBirthBoolean ? nodeData.multipleBirthInteger : undefined,
    };

    return FhirTransformer.cleanUndefined(patient);
  }

  private transformNameCollection(nameData: any[]): any[] | undefined {
    if (!Array.isArray(nameData) || nameData.length === 0) {
      return undefined;
    }

    return FhirTransformer.transformHumanNames(
      nameData.map((item: any) => item.nameValues || item).flat()
    );
  }

  private transformTelecomCollection(telecomData: any[]): any[] | undefined {
    if (!Array.isArray(telecomData) || telecomData.length === 0) {
      return undefined;
    }

    return FhirTransformer.transformContactPoints(
      telecomData.map((item: any) => item.contactValues || item).flat()
    );
  }

  private transformIdentifierCollection(identifierData: any[]): any[] | undefined {
    if (!Array.isArray(identifierData) || identifierData.length === 0) {
      return undefined;
    }

    return FhirTransformer.transformIdentifiers(
      identifierData.map((item: any) => item.identifierValues || item).flat()
    );
  }

  private transformAddressCollection(addressData: any[]): any[] | undefined {
    if (!Array.isArray(addressData) || addressData.length === 0) {
      return undefined;
    }

    return addressData
      .map((item: any) => item.addressValues || item)
      .flat()
      .map((address: any) => FhirTransformer.cleanUndefined({
        use: address.use,
        type: address.type,
        text: address.text,
        line: Array.isArray(address.line) ? address.line.filter((l: string) => l) : undefined,
        city: address.city,
        district: address.district,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      }))
      .filter((address: any) => address.text || address.line || address.city);
  }

  private transformMaritalStatus(maritalData: any): any | undefined {
    if (!maritalData || Object.keys(maritalData).length === 0) {
      return undefined;
    }

    return FhirTransformer.cleanUndefined({
      coding: maritalData.coding
        ? maritalData.coding.map((item: any) => item.codingValues || item).flat()
        : undefined,
      text: maritalData.text,
    });
  }
}