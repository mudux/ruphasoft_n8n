// FHIR Bundle Node
// n8n custom node with auto-detection + manual override mapping
// Enhanced with Kenya healthcare bundle patterns and semantic entry indexing

const { FhirTransformer } = require('../src/utils/fhirTransform');
const { setValueAtSemanticPath } = require('../src/utils/semanticPaths');
const { applyPreset } = require('../src/utils/transformationPresets');

// Kenya Bundle Templates - Common healthcare bundle patterns
const KENYA_BUNDLE_TEMPLATES = {
  patientRegistration: {
    name: 'Patient Registration',
    description: 'Patient + identifiers + demographics for registration',
    bundleType: 'collection',
    expectedResources: ['Patient'],
    requiredFields: ['firstName', 'lastName', 'birthDate', 'gender'],
    optionalFields: ['nationalId', 'shaNumber', 'nhifNumber', 'phone', 'county']
  },
  appointmentScheduling: {
    name: 'Appointment Scheduling',
    description: 'Patient + Appointment + facility info',
    bundleType: 'collection',
    expectedResources: ['Patient', 'Appointment'],
    requiredFields: ['patientId', 'appointmentDate', 'facilityId'],
    optionalFields: ['practitionerId', 'reason', 'duration']
  },
  claimsSubmission: {
    name: 'Claims Submission',
    description: 'Patient + Claim for insurance submission',
    bundleType: 'transaction',
    expectedResources: ['Patient', 'Claim'],
    requiredFields: ['patientId', 'claimAmount', 'serviceDate', 'insurerId'],
    optionalFields: ['diagnosis', 'procedures', 'facility']
  },
  insuranceEligibility: {
    name: 'Insurance Eligibility Check',
    description: 'Patient + Coverage + EligibilityRequest',
    bundleType: 'collection',
    expectedResources: ['Patient', 'Coverage', 'CoverageEligibilityRequest'],
    requiredFields: ['patientId', 'insurerId', 'memberId'],
    optionalFields: ['serviceType', 'serviceDate']
  },
  custom: {
    name: 'Custom Bundle',
    description: 'Build custom bundle from input data',
    bundleType: 'collection',
    expectedResources: [],
    requiredFields: [],
    optionalFields: []
  }
};

// Semantic entry names based on resource type
const RESOURCE_ENTRY_NAMES = {
  Patient: 'patient_entry',
  Appointment: 'appointment_entry',
  Claim: 'claim_entry',
  ClaimResponse: 'claim_response_entry',
  Coverage: 'coverage_entry',
  CoverageEligibilityRequest: 'eligibility_request_entry',
  CoverageEligibilityResponse: 'eligibility_response_entry',
  Practitioner: 'practitioner_entry',
  Organization: 'organization_entry',
  Location: 'location_entry',
  Encounter: 'encounter_entry',
  Observation: 'observation_entry',
  Condition: 'condition_entry',
  Procedure: 'procedure_entry',
  MedicationRequest: 'medication_request_entry',
  DiagnosticReport: 'diagnostic_report_entry',
  DocumentReference: 'document_reference_entry'
};

// Reference patterns for auto-linking
const REFERENCE_PATTERNS = {
  'Claim.patient': 'Patient',
  'Claim.provider': 'Organization',
  'Claim.insurer': 'Organization',
  'Appointment.participant.actor': ['Patient', 'Practitioner', 'Location'],
  'Coverage.beneficiary': 'Patient',
  'Coverage.payor': 'Organization',
  'CoverageEligibilityRequest.patient': 'Patient',
  'CoverageEligibilityRequest.insurer': 'Organization',
  'Encounter.subject': 'Patient',
  'Observation.subject': 'Patient',
  'Condition.subject': 'Patient',
  'Procedure.subject': 'Patient',
  'MedicationRequest.subject': 'Patient',
  'DiagnosticReport.subject': 'Patient'
};

class FhirBundle {
  constructor() {
    this.description = {
      displayName: 'FHIR Bundle',
      name: 'fhirBundle',
      group: ['transform'],
      version: 2, // Version bump for enhanced features
      description: 'Create FHIR Bundles with Kenya healthcare patterns, semantic entry indexing, and auto-reference linking',
      defaults: {
        name: 'FHIR Bundle',
        color: '#1976D2', // Bundle blue
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        // --- Bundle Configuration ---
        {
          displayName: 'Bundle Template',
          name: 'bundleTemplate',
          type: 'options',
          options: [
            { name: 'Custom Bundle', value: 'custom', description: 'Build custom bundle from input data' },
            { name: 'Patient Registration', value: 'patientRegistration', description: 'Patient + identifiers + demographics' },
            { name: 'Appointment Scheduling', value: 'appointmentScheduling', description: 'Patient + Appointment + facility' },
            { name: 'Claims Submission', value: 'claimsSubmission', description: 'Patient + Claim (transaction bundle)' },
            { name: 'Insurance Eligibility', value: 'insuranceEligibility', description: 'Patient + Coverage + EligibilityRequest' }
          ],
          default: 'custom',
          description: 'Select a Kenya healthcare bundle template or create custom'
        },
        {
          displayName: 'Bundle Type',
          name: 'bundleType',
          type: 'options',
          options: [
            { name: 'Collection', value: 'collection', description: 'Simple grouping of resources' },
            { name: 'Transaction', value: 'transaction', description: 'Atomic operations (all succeed or all fail)' },
            { name: 'Batch', value: 'batch', description: 'Independent operations processed together' },
            { name: 'Search Set', value: 'searchset', description: 'Search results' },
            { name: 'Document', value: 'document', description: 'Clinical document' },
            { name: 'Message', value: 'message', description: 'Message exchange' }
          ],
          default: 'collection',
          displayOptions: {
            show: {
              bundleTemplate: ['custom']
            }
          },
          description: 'FHIR Bundle type'
        },
        // --- Entry Detection Mode ---
        {
          displayName: 'Entry Detection',
          name: 'entryDetection',
          type: 'options',
          options: [
            { name: 'Auto-Detect', value: 'auto', description: 'Automatically detect resources from input data' },
            { name: 'Manual Configuration', value: 'manual', description: 'Manually configure entry resources' },
            { name: 'Pass-Through', value: 'passthrough', description: 'Use pre-built resources from input' }
          ],
          default: 'auto',
          description: 'How to detect and build bundle entries'
        },
        // --- Reference Linking ---
        {
          displayName: 'Reference Linking',
          name: 'referenceLinking',
          type: 'options',
          options: [
            { name: 'Auto-Link', value: 'auto', description: 'Automatically link references using urn:uuid' },
            { name: 'Manual', value: 'manual', description: 'Configure reference paths manually' },
            { name: 'None', value: 'none', description: 'No automatic reference linking' }
          ],
          default: 'auto',
          description: 'How to handle cross-resource references within bundle'
        },
        // --- Manual Entry Configuration ---
        {
          displayName: 'Entry Resources',
          name: 'entryResources',
          type: 'fixedCollection',
          displayOptions: {
            show: {
              entryDetection: ['manual']
            }
          },
          placeholder: 'Add Entry Resource',
          default: {},
          typeOptions: {
            multipleValues: true
          },
          options: [
            {
              name: 'entries',
              displayName: 'Entry',
              values: [
                {
                  displayName: 'Resource Type',
                  name: 'resourceType',
                  type: 'options',
                  options: [
                    { name: 'Patient', value: 'Patient' },
                    { name: 'Appointment', value: 'Appointment' },
                    { name: 'Claim', value: 'Claim' },
                    { name: 'ClaimResponse', value: 'ClaimResponse' },
                    { name: 'Coverage', value: 'Coverage' },
                    { name: 'CoverageEligibilityRequest', value: 'CoverageEligibilityRequest' },
                    { name: 'Practitioner', value: 'Practitioner' },
                    { name: 'Organization', value: 'Organization' },
                    { name: 'Location', value: 'Location' },
                    { name: 'Encounter', value: 'Encounter' },
                    { name: 'Observation', value: 'Observation' },
                    { name: 'Condition', value: 'Condition' },
                    { name: 'Procedure', value: 'Procedure' },
                    { name: 'MedicationRequest', value: 'MedicationRequest' },
                    { name: 'DiagnosticReport', value: 'DiagnosticReport' },
                    { name: 'DocumentReference', value: 'DocumentReference' }
                  ],
                  default: 'Patient',
                  description: 'FHIR resource type for this entry'
                },
                {
                  displayName: 'Source Field Prefix',
                  name: 'sourcePrefix',
                  type: 'string',
                  default: '',
                  placeholder: 'e.g., patient_, claim_',
                  description: 'Prefix for input fields (e.g., patient_first_name, claim_amount)'
                },
                {
                  displayName: 'Request Method',
                  name: 'requestMethod',
                  type: 'options',
                  options: [
                    { name: 'POST (Create)', value: 'POST' },
                    { name: 'PUT (Update)', value: 'PUT' },
                    { name: 'DELETE', value: 'DELETE' },
                    { name: 'GET', value: 'GET' }
                  ],
                  default: 'POST',
                  description: 'HTTP method for transaction/batch bundles'
                }
              ]
            }
          ]
        },
        // --- Field Mappings for Auto-Detection ---
        {
          displayName: 'Field Mappings',
          name: 'fieldMappings',
          type: 'fixedCollection',
          displayOptions: {
            show: {
              entryDetection: ['auto', 'manual']
            }
          },
          placeholder: 'Add Field Mapping',
          default: {},
          typeOptions: {
            multipleValues: true
          },
          options: [
            {
              name: 'mappingValues',
              displayName: 'Field Mapping',
              values: [
                {
                  displayName: 'Source Field',
                  name: 'sourceField',
                  type: 'string',
                  default: '',
                  placeholder: 'e.g., patient_first_name',
                  description: 'Field name from input JSON'
                },
                {
                  displayName: 'Target Resource',
                  name: 'targetResource',
                  type: 'options',
                  options: [
                    { name: 'Patient', value: 'Patient' },
                    { name: 'Appointment', value: 'Appointment' },
                    { name: 'Claim', value: 'Claim' },
                    { name: 'Coverage', value: 'Coverage' },
                    { name: 'Organization', value: 'Organization' },
                    { name: 'Practitioner', value: 'Practitioner' }
                  ],
                  default: 'Patient',
                  description: 'Target resource for this field'
                },
                {
                  displayName: 'FHIR Path',
                  name: 'fhirPath',
                  type: 'string',
                  default: '',
                  placeholder: 'e.g., name[official].given[0]',
                  description: 'FHIR path within the resource (supports semantic indices)'
                },
                {
                  displayName: 'Transformation',
                  name: 'transformation',
                  type: 'options',
                  options: [
                    { name: 'None', value: '' },
                    { name: 'Kenya Date (DD/MM/YYYY)', value: 'formatKenyaDate' },
                    { name: 'FHIR Date (YYYY-MM-DD)', value: 'convertToFhirDate' },
                    { name: 'Kenya Phone (+254)', value: 'formatPhoneKE' },
                    { name: 'Capitalize Name', value: 'formatName' },
                    { name: 'Normalize Gender', value: 'normalizeGender' },
                    { name: 'Kenya National ID', value: 'formatNationalId' },
                    { name: 'NHIF Number', value: 'formatNHIFNumber' },
                    { name: 'SHA Number', value: 'formatSHANumber' },
                    { name: 'Format as KES', value: 'formatMoney' },
                    { name: 'Uppercase', value: 'toUpperCase' },
                    { name: 'Trim', value: 'trim' }
                  ],
                  default: '',
                  description: 'Data transformation to apply'
                }
              ]
            }
          ]
        },
        // --- Options ---
        {
          displayName: 'Options',
          name: 'options',
          type: 'collection',
          placeholder: 'Add Option',
          default: {},
          options: [
            {
              displayName: 'Include Detailed Mapping Info',
              name: 'includeDetailedMapping',
              type: 'boolean',
              default: false,
              description: 'Include auto-detection details in output'
            },
            {
              displayName: 'Stop on Validation Error',
              name: 'stopOnError',
              type: 'boolean',
              default: false,
              description: 'Stop execution if validation fails'
            },
            {
              displayName: 'Custom Bundle ID',
              name: 'customId',
              type: 'string',
              default: '',
              placeholder: 'bundle-123',
              description: 'Override auto-generated bundle ID'
            },
            {
              displayName: 'Validate Bundle Integrity',
              name: 'validateIntegrity',
              type: 'boolean',
              default: true,
              description: 'Validate cross-resource references and bundle structure'
            },
            {
              displayName: 'Generate Entry Full URLs',
              name: 'generateFullUrls',
              type: 'boolean',
              default: true,
              description: 'Generate urn:uuid: full URLs for entries'
            },
            {
              displayName: 'Include Request Elements',
              name: 'includeRequestElements',
              type: 'boolean',
              default: true,
              description: 'Include request.method and request.url for transaction/batch bundles'
            }
          ]
        }
      ]
    };
  }

  async execute(inputItems) {
    const returnData = [];

    for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
      try {
        const inputData = inputItems[itemIndex].json;

        // Get node parameters
        const bundleTemplate = this.getNodeParameter('bundleTemplate', itemIndex);
        const entryDetection = this.getNodeParameter('entryDetection', itemIndex);
        const referenceLinking = this.getNodeParameter('referenceLinking', itemIndex);
        const options = this.getNodeParameter('options', itemIndex, {});

        // Determine bundle type from template or manual selection
        let bundleType;
        if (bundleTemplate !== 'custom') {
          bundleType = KENYA_BUNDLE_TEMPLATES[bundleTemplate].bundleType;
        } else {
          bundleType = this.getNodeParameter('bundleType', itemIndex);
        }

        // Build the bundle
        const bundleBuilder = new BundleBuilder({
          bundleTemplate,
          bundleType,
          entryDetection,
          referenceLinking,
          options,
          getNodeParameter: this.getNodeParameter.bind(this),
          itemIndex
        });

        const result = await bundleBuilder.build(inputData);

        // Apply custom ID if provided
        if (options.customId && result.fhir_resource) {
          result.fhir_resource.id = options.customId;
          result.metadata.resource_id = options.customId;
        }

        // Handle validation errors
        if (result.error && options.stopOnError) {
          throw new Error(`FHIR Bundle validation failed: ${result.err_message}`);
        }

        // Add processing metadata
        result.metadata.node_execution = {
          itemIndex: itemIndex,
          bundleTemplate: bundleTemplate,
          bundleType: bundleType,
          entryDetection: entryDetection,
          referenceLinking: referenceLinking,
          inputFieldCount: Object.keys(inputData).length,
          timestamp: new Date().toISOString()
        };

        returnData.push({
          json: result,
          index: itemIndex
        });

      } catch (error) {
        if (this.getNodeParameter('options.stopOnError', itemIndex, false)) {
          throw error;
        }

        returnData.push({
          json: this._createErrorOutput(error, itemIndex),
          index: itemIndex
        });
      }
    }

    return [returnData];
  }

  _createErrorOutput(error, itemIndex) {
    return {
      error: true,
      fhir_resource: null,
      err_message: error.message,
      resource_type: 'Bundle',
      validation_summary: {
        status: 'error',
        mapped_fields: [],
        unmapped_fields: [],
        warnings: [],
        corrections: []
      },
      mapping_summary: {
        total_input_fields: 0,
        auto_detected: 0,
        user_overrides: 0,
        entries_created: 0,
        references_linked: 0
      },
      metadata: {
        transformation_time: new Date().toISOString(),
        resource_id: null,
        processing_mode: 'error',
        node_execution: {
          itemIndex: itemIndex,
          error: error.message
        }
      }
    };
  }
}

/**
 * Bundle Builder - Handles bundle creation logic
 */
class BundleBuilder {
  constructor(config) {
    this.bundleTemplate = config.bundleTemplate;
    this.bundleType = config.bundleType;
    this.entryDetection = config.entryDetection;
    this.referenceLinking = config.referenceLinking;
    this.options = config.options;
    this.getNodeParameter = config.getNodeParameter;
    this.itemIndex = config.itemIndex;

    this.warnings = [];
    this.corrections = [];
    this.errors = [];
    this.entryUuids = new Map(); // resourceType -> uuid
    this.entriesCreated = 0;
    this.referencesLinked = 0;
  }

  async build(inputData) {
    try {
      // Initialize bundle structure
      const bundle = this._initializeBundle();

      // Build entries based on detection mode
      let entries;
      switch (this.entryDetection) {
        case 'auto':
          entries = await this._buildEntriesAuto(inputData);
          break;
        case 'manual':
          entries = await this._buildEntriesManual(inputData);
          break;
        case 'passthrough':
          entries = this._buildEntriesPassthrough(inputData);
          break;
        default:
          entries = await this._buildEntriesAuto(inputData);
      }

      bundle.entry = entries;
      bundle.total = entries.length;

      // Link references if enabled
      if (this.referenceLinking === 'auto') {
        this._autoLinkReferences(bundle);
      }

      // Validate bundle integrity if enabled
      if (this.options.validateIntegrity) {
        this._validateBundleIntegrity(bundle);
      }

      return this._createSuccessOutput(bundle, inputData);

    } catch (error) {
      this.errors.push(error.message);
      return this._createFailureOutput(error, inputData);
    }
  }

  _initializeBundle() {
    const bundleId = this.options.customId || this._generateUuid();

    return {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: new Date().toISOString()
      },
      type: this.bundleType,
      timestamp: new Date().toISOString(),
      entry: []
    };
  }

  /**
   * Auto-detect resources from input data based on field patterns
   */
  async _buildEntriesAuto(inputData) {
    const entries = [];
    const template = KENYA_BUNDLE_TEMPLATES[this.bundleTemplate];

    // Get field mappings from node config
    let fieldMappingsConfig = {};
    try {
      fieldMappingsConfig = this.getNodeParameter('fieldMappings', this.itemIndex, {});
    } catch (e) {
      // Ignore if not available
    }
    const userMappings = fieldMappingsConfig.mappingValues || [];

    // Detect resource types from input data
    const detectedResources = this._detectResourceTypes(inputData, template, userMappings);

    // Build resources for each detected type
    for (const [resourceType, fields] of Object.entries(detectedResources)) {
      if (Object.keys(fields).length === 0) continue;

      const resource = await this._buildResource(resourceType, fields);
      const entry = this._createEntry(resourceType, resource);
      entries.push(entry);
      this.entriesCreated++;
    }

    return entries;
  }

  /**
   * Build entries from manual configuration
   */
  async _buildEntriesManual(inputData) {
    const entries = [];
    let entryConfig = {};
    try {
      entryConfig = this.getNodeParameter('entryResources', this.itemIndex, {});
    } catch (e) {
      // Ignore if not available
    }
    const configuredEntries = entryConfig.entries || [];

    for (const config of configuredEntries) {
      const resourceType = config.resourceType;
      const sourcePrefix = config.sourcePrefix || '';
      const requestMethod = config.requestMethod || 'POST';

      // Extract fields for this resource based on prefix
      const fields = this._extractFieldsByPrefix(inputData, sourcePrefix);

      if (Object.keys(fields).length === 0) {
        this.warnings.push(`No fields found for ${resourceType} with prefix "${sourcePrefix}"`);
        continue;
      }

      const resource = await this._buildResource(resourceType, fields);
      const entry = this._createEntry(resourceType, resource, requestMethod);
      entries.push(entry);
      this.entriesCreated++;
    }

    return entries;
  }

  /**
   * Pass through pre-built resources from input
   */
  _buildEntriesPassthrough(inputData) {
    const entries = [];

    // Check for pre-built entries in input
    if (inputData.entry && Array.isArray(inputData.entry)) {
      for (const inputEntry of inputData.entry) {
        if (inputEntry.resource) {
          const resourceType = inputEntry.resource.resourceType || 'Unknown';
          const entry = this._createEntry(resourceType, inputEntry.resource);

          // Preserve existing fullUrl if present
          if (inputEntry.fullUrl) {
            entry.fullUrl = inputEntry.fullUrl;
          }

          // Preserve request elements if present
          if (inputEntry.request) {
            entry.request = inputEntry.request;
          }

          entries.push(entry);
          this.entriesCreated++;
        }
      }
    }

    // Check for single resource
    if (inputData.resourceType && inputData.resourceType !== 'Bundle') {
      const entry = this._createEntry(inputData.resourceType, inputData);
      entries.push(entry);
      this.entriesCreated++;
    }

    return entries;
  }

  /**
   * Detect resource types from input data patterns
   */
  _detectResourceTypes(inputData, template, userMappings) {
    const resources = {};

    // Initialize expected resources from template
    if (template && template.expectedResources) {
      for (const resourceType of template.expectedResources) {
        resources[resourceType] = {};
      }
    }

    // Apply user mappings first (highest priority)
    for (const mapping of userMappings) {
      const { sourceField, targetResource, fhirPath, transformation } = mapping;
      if (!sourceField || !targetResource || !fhirPath) continue;

      const value = inputData[sourceField];
      if (value === undefined || value === null) continue;

      if (!resources[targetResource]) {
        resources[targetResource] = {};
      }

      // Apply transformation if specified
      const transformedValue = transformation ? applyPreset(transformation, value) : value;
      resources[targetResource][fhirPath] = transformedValue;
    }

    // Auto-detect remaining fields based on patterns
    const patientPatterns = this._getPatientFieldPatterns();
    const appointmentPatterns = this._getAppointmentFieldPatterns();
    const claimPatterns = this._getClaimFieldPatterns();
    const coveragePatterns = this._getCoverageFieldPatterns();

    for (const [fieldName, value] of Object.entries(inputData)) {
      if (value === undefined || value === null) continue;

      // Skip if already mapped by user
      if (userMappings.some(m => m.sourceField === fieldName)) continue;

      // Try to match to resource patterns
      const patientMatch = this._matchFieldPattern(fieldName, patientPatterns);
      if (patientMatch) {
        if (!resources['Patient']) resources['Patient'] = {};
        resources['Patient'][patientMatch.fhirPath] = this._transformValue(value, patientMatch.transformation);
        continue;
      }

      const appointmentMatch = this._matchFieldPattern(fieldName, appointmentPatterns);
      if (appointmentMatch) {
        if (!resources['Appointment']) resources['Appointment'] = {};
        resources['Appointment'][appointmentMatch.fhirPath] = this._transformValue(value, appointmentMatch.transformation);
        continue;
      }

      const claimMatch = this._matchFieldPattern(fieldName, claimPatterns);
      if (claimMatch) {
        if (!resources['Claim']) resources['Claim'] = {};
        resources['Claim'][claimMatch.fhirPath] = this._transformValue(value, claimMatch.transformation);
        continue;
      }

      const coverageMatch = this._matchFieldPattern(fieldName, coveragePatterns);
      if (coverageMatch) {
        if (!resources['Coverage']) resources['Coverage'] = {};
        resources['Coverage'][coverageMatch.fhirPath] = this._transformValue(value, coverageMatch.transformation);
      }
    }

    return resources;
  }

  /**
   * Build a FHIR resource from detected fields
   */
  async _buildResource(resourceType, fields) {
    const resource = {
      resourceType: resourceType,
      id: this._generateUuid()
    };

    // Store UUID for reference linking
    this.entryUuids.set(resourceType, resource.id);

    // Set fields using semantic paths
    for (const [fhirPath, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        setValueAtSemanticPath(resource, fhirPath, value);
      }
    }

    return resource;
  }

  /**
   * Create a bundle entry with semantic naming
   */
  _createEntry(resourceType, resource, requestMethod = 'POST') {
    const entryName = RESOURCE_ENTRY_NAMES[resourceType] || `${resourceType.toLowerCase()}_entry`;
    const uuid = resource.id || this._generateUuid();

    const entry = {
      _semanticName: entryName,
      resource: resource
    };

    // Add fullUrl if enabled
    if (this.options.generateFullUrls !== false) {
      entry.fullUrl = `urn:uuid:${uuid}`;
    }

    // Add request elements for transaction/batch bundles
    if ((this.bundleType === 'transaction' || this.bundleType === 'batch') &&
        this.options.includeRequestElements !== false) {
      entry.request = {
        method: requestMethod,
        url: resourceType
      };
    }

    return entry;
  }

  /**
   * Auto-link references between resources in the bundle
   */
  _autoLinkReferences(bundle) {
    for (const entry of bundle.entry) {
      const resource = entry.resource;
      if (!resource) continue;

      const resourceType = resource.resourceType;

      // Find applicable reference patterns
      for (const [refPath, targetTypes] of Object.entries(REFERENCE_PATTERNS)) {
        const [sourceType, ...pathParts] = refPath.split('.');
        if (sourceType !== resourceType) continue;

        const targetTypeArray = Array.isArray(targetTypes) ? targetTypes : [targetTypes];

        // Find target entry and link
        for (const targetType of targetTypeArray) {
          const targetEntry = bundle.entry.find(e =>
            e.resource && e.resource.resourceType === targetType
          );

          if (targetEntry && targetEntry.fullUrl) {
            const refValue = { reference: targetEntry.fullUrl };
            this._setNestedValue(resource, pathParts.join('.'), refValue);
            this.referencesLinked++;
            break;
          }
        }
      }
    }
  }

  /**
   * Validate bundle integrity
   */
  _validateBundleIntegrity(bundle) {
    // Check for required entries based on bundle type
    if (bundle.type === 'transaction' || bundle.type === 'batch') {
      for (const entry of bundle.entry) {
        if (!entry.request || !entry.request.method) {
          this.warnings.push(`Entry missing request.method for ${bundle.type} bundle`);
        }
      }
    }

    // Validate internal references
    const entryUrls = new Set(bundle.entry.map(e => e.fullUrl).filter(Boolean));
    for (const entry of bundle.entry) {
      const resource = entry.resource;
      if (!resource) continue;

      // Find reference fields and validate
      const refs = this._findReferences(resource);
      for (const ref of refs) {
        if (ref.startsWith('urn:uuid:') && !entryUrls.has(ref)) {
          this.warnings.push(`Unresolved reference: ${ref}`);
        }
      }
    }

    // Check total matches entry count
    if (bundle.total !== bundle.entry.length) {
      bundle.total = bundle.entry.length;
      this.corrections.push('Corrected bundle.total to match entry count');
    }
  }

  /**
   * Find all references in a resource
   */
  _findReferences(obj, refs = []) {
    if (!obj || typeof obj !== 'object') return refs;

    if (obj.reference && typeof obj.reference === 'string') {
      refs.push(obj.reference);
    }

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          this._findReferences(item, refs);
        }
      } else if (typeof value === 'object') {
        this._findReferences(value, refs);
      }
    }

    return refs;
  }

  /**
   * Extract fields from input by prefix
   */
  _extractFieldsByPrefix(inputData, prefix) {
    const fields = {};
    const prefixLower = prefix.toLowerCase();

    for (const [fieldName, value] of Object.entries(inputData)) {
      if (fieldName.toLowerCase().startsWith(prefixLower)) {
        // Remove prefix and convert to camelCase
        const cleanName = fieldName.slice(prefix.length);
        fields[cleanName] = value;
      }
    }

    return fields;
  }

  /**
   * Field pattern definitions for auto-detection
   */
  _getPatientFieldPatterns() {
    return {
      // Name patterns
      firstName: { pattern: /^(patient_)?(first|given|fname)_?name$/i, fhirPath: 'name[official].given[0]', transformation: 'formatName' },
      lastName: { pattern: /^(patient_)?(last|family|surname|lname)_?name$/i, fhirPath: 'name[official].family', transformation: 'formatName' },
      fullName: { pattern: /^(patient_)?(full_?name|name)$/i, fhirPath: 'name[official].text', transformation: 'formatName' },

      // Demographics
      birthDate: { pattern: /^(patient_)?(birth_?date|dob|date_of_birth)$/i, fhirPath: 'birthDate', transformation: 'formatKenyaDate' },
      gender: { pattern: /^(patient_)?(gender|sex)$/i, fhirPath: 'gender', transformation: 'normalizeGender' },

      // Contact
      phone: { pattern: /^(patient_)?(phone|mobile|tel|contact)$/i, fhirPath: 'telecom[primary_phone].value', transformation: 'formatPhoneKE' },
      email: { pattern: /^(patient_)?(email|e_?mail)$/i, fhirPath: 'telecom[email].value', transformation: null },

      // Kenya Identifiers
      nationalId: { pattern: /^(patient_)?(national_?id|id_?number|kenya_?id)$/i, fhirPath: 'identifier[national_id].value', transformation: 'formatNationalId' },
      shaNumber: { pattern: /^(patient_)?(sha_?number|sha_?id)$/i, fhirPath: 'identifier[sha_number].value', transformation: 'formatSHANumber' },
      nhifNumber: { pattern: /^(patient_)?(nhif_?number|nhif_?id)$/i, fhirPath: 'identifier[nhif_number].value', transformation: 'formatNHIFNumber' },
      mrn: { pattern: /^(patient_)?(mrn|medical_record|patient_id)$/i, fhirPath: 'identifier[mrn].value', transformation: 'trim' },

      // Address - Kenya
      county: { pattern: /^(patient_)?county$/i, fhirPath: 'extension[county].valueString', transformation: null },
      subCounty: { pattern: /^(patient_)?sub_?county$/i, fhirPath: 'extension[sub_county].valueString', transformation: null },
      ward: { pattern: /^(patient_)?ward$/i, fhirPath: 'extension[ward].valueString', transformation: null }
    };
  }

  _getAppointmentFieldPatterns() {
    return {
      appointmentDate: { pattern: /^(appointment_)?(date|start|datetime)$/i, fhirPath: 'start', transformation: 'convertToFhirDateTime' },
      appointmentEnd: { pattern: /^(appointment_)?end$/i, fhirPath: 'end', transformation: 'convertToFhirDateTime' },
      status: { pattern: /^(appointment_)?status$/i, fhirPath: 'status', transformation: null },
      duration: { pattern: /^(appointment_)?duration$/i, fhirPath: 'minutesDuration', transformation: null },
      reason: { pattern: /^(appointment_)?reason$/i, fhirPath: 'reasonCode[0].text', transformation: null },
      description: { pattern: /^(appointment_)?(description|notes?)$/i, fhirPath: 'description', transformation: null },
      serviceType: { pattern: /^(appointment_)?service_?type$/i, fhirPath: 'serviceType[0].text', transformation: null }
    };
  }

  _getClaimFieldPatterns() {
    return {
      claimAmount: { pattern: /^(claim_)?(amount|total|claim_amount)$/i, fhirPath: 'total.value', transformation: null },
      claimCurrency: { pattern: /^(claim_)?currency$/i, fhirPath: 'total.currency', transformation: 'toUpperCase' },
      serviceDate: { pattern: /^(claim_)?(service_?date|date_of_service)$/i, fhirPath: 'billablePeriod.start', transformation: 'formatKenyaDate' },
      claimType: { pattern: /^(claim_)?type$/i, fhirPath: 'type.coding[0].code', transformation: null },
      priority: { pattern: /^(claim_)?priority$/i, fhirPath: 'priority.coding[0].code', transformation: null },
      diagnosis: { pattern: /^(claim_)?diagnosis$/i, fhirPath: 'diagnosis[0].diagnosisCodeableConcept.text', transformation: null },
      procedure: { pattern: /^(claim_)?procedure$/i, fhirPath: 'procedure[0].procedureCodeableConcept.text', transformation: null }
    };
  }

  _getCoverageFieldPatterns() {
    return {
      memberId: { pattern: /^(coverage_)?(member_?id|subscriber_?id)$/i, fhirPath: 'subscriberId', transformation: null },
      planId: { pattern: /^(coverage_)?(plan_?id|policy_?number)$/i, fhirPath: 'identifier[0].value', transformation: null },
      insurerName: { pattern: /^(coverage_)?(insurer|payer)_?name$/i, fhirPath: 'payor[0].display', transformation: null },
      effectiveDate: { pattern: /^(coverage_)?(effective|start)_?date$/i, fhirPath: 'period.start', transformation: 'formatKenyaDate' },
      endDate: { pattern: /^(coverage_)?(end|termination)_?date$/i, fhirPath: 'period.end', transformation: 'formatKenyaDate' },
      status: { pattern: /^(coverage_)?status$/i, fhirPath: 'status', transformation: null },
      relationship: { pattern: /^(coverage_)?relationship$/i, fhirPath: 'relationship.coding[0].code', transformation: null }
    };
  }

  /**
   * Match field name against patterns
   */
  _matchFieldPattern(fieldName, patterns) {
    for (const [key, config] of Object.entries(patterns)) {
      if (config.pattern.test(fieldName)) {
        return config;
      }
    }
    return null;
  }

  /**
   * Apply transformation to value
   */
  _transformValue(value, transformation) {
    if (!transformation || !value) return value;
    try {
      return applyPreset(transformation, value);
    } catch (e) {
      this.warnings.push(`Transformation failed for ${transformation}: ${e.message}`);
      return value;
    }
  }

  /**
   * Set nested value in object
   */
  _setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Generate UUID
   */
  _generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Create success output
   */
  _createSuccessOutput(bundle, inputData) {
    // Remove internal _semanticName from entries before output
    const cleanBundle = JSON.parse(JSON.stringify(bundle));
    for (const entry of cleanBundle.entry) {
      delete entry._semanticName;
    }

    const output = {
      error: false,
      fhir_resource: cleanBundle,
      err_message: null,
      resource_type: 'Bundle',
      validation_summary: {
        status: this.errors.length > 0 ? 'invalid' : (this.warnings.length > 0 ? 'valid_with_warnings' : 'valid'),
        mapped_fields: Object.keys(inputData),
        unmapped_fields: [],
        warnings: this.warnings,
        corrections: this.corrections
      },
      mapping_summary: {
        total_input_fields: Object.keys(inputData).length,
        auto_detected: this.entryDetection === 'auto' ? this.entriesCreated : 0,
        user_overrides: this.entryDetection === 'manual' ? this.entriesCreated : 0,
        entries_created: this.entriesCreated,
        references_linked: this.referencesLinked
      },
      metadata: {
        transformation_time: new Date().toISOString(),
        resource_id: cleanBundle.id,
        processing_mode: 'success',
        bundle_template: this.bundleTemplate,
        entry_semantic_names: bundle.entry.map(e => e._semanticName || 'unknown')
      }
    };

    // Include detailed mapping if requested
    if (this.options.includeDetailedMapping) {
      output.detailed_mapping = {
        entry_uuids: Object.fromEntries(this.entryUuids),
        reference_patterns_applied: this.referencesLinked
      };
    }

    return output;
  }

  /**
   * Create failure output
   */
  _createFailureOutput(error, inputData) {
    return {
      error: true,
      fhir_resource: null,
      err_message: error.message,
      resource_type: 'Bundle',
      validation_summary: {
        status: 'error',
        mapped_fields: [],
        unmapped_fields: Object.keys(inputData),
        warnings: this.warnings,
        corrections: []
      },
      mapping_summary: {
        total_input_fields: Object.keys(inputData).length,
        auto_detected: 0,
        user_overrides: 0,
        entries_created: 0,
        references_linked: 0
      },
      metadata: {
        transformation_time: new Date().toISOString(),
        resource_id: null,
        processing_mode: 'error'
      }
    };
  }
}

module.exports = {
  description: new FhirBundle().description,
  execute: async function(inputItems) {
    const node = new FhirBundle();
    node.getNodeParameter = this.getNodeParameter.bind(this);
    return await node.execute.call(node, inputItems);
  }
};
