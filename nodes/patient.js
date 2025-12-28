// FHIR Patient Node
// n8n custom node with auto-detection + manual override mapping
// Enhanced with Kenya-specific patterns, semantic array indexing, and template support
// Version 3: Full integration with enhanced core system

const { FhirTransformer } = require('../src/utils/fhirTransform');
const { getAvailableSemanticNames, SEMANTIC_INDICES } = require('../src/utils/semanticPaths');
const { getPresetOptionsForNode, getAvailablePresets } = require('../src/utils/transformationPresets');
const { AutoDetector } = require('../src/mapping/autoDetector');

/**
 * Pre-configured mapping templates for common Kenya healthcare scenarios
 * Follows 80/20 rule - covers most common field naming patterns
 */
const MAPPING_TEMPLATES = {
  // Kenya HMIS standard field naming
  kenya_hmis: {
    name: 'Kenya HMIS Standard',
    description: 'Standard field mapping for Kenya Hospital Management Systems',
    mappings: [
      { sourceField: 'patient_first_name', fhirPath: 'name[official].given[0]', transformation: 'formatName' },
      { sourceField: 'patient_last_name', fhirPath: 'name[official].family', transformation: 'formatName' },
      { sourceField: 'patient_middle_name', fhirPath: 'name[official].given[1]', transformation: 'formatName' },
      { sourceField: 'dob', fhirPath: 'birthDate', transformation: 'formatKenyaDate' },
      { sourceField: 'gender', fhirPath: 'gender', transformation: 'normalizeGender' },
      { sourceField: 'national_id', fhirPath: 'identifier[national_id].value', transformation: 'formatNationalId' },
      { sourceField: 'sha_number', fhirPath: 'identifier[sha_number].value', transformation: 'formatSHANumber' },
      { sourceField: 'nhif_number', fhirPath: 'identifier[nhif_number].value', transformation: 'formatNHIFNumber' },
      { sourceField: 'phone', fhirPath: 'telecom[primary_phone].value', transformation: 'formatPhoneKE' },
      { sourceField: 'email', fhirPath: 'telecom[email].value', transformation: 'toLowerCase' },
      { sourceField: 'county', fhirPath: 'extension[county].valueString', transformation: 'formatName' },
      { sourceField: 'sub_county', fhirPath: 'extension[sub_county].valueString', transformation: 'formatName' },
      { sourceField: 'ward', fhirPath: 'extension[ward].valueString', transformation: 'formatName' },
      { sourceField: 'next_of_kin', fhirPath: 'contact[emergency_contact].name.text', transformation: 'formatName' },
      { sourceField: 'emergency_phone', fhirPath: 'contact[emergency_contact].telecom[0].value', transformation: 'formatPhoneKE' }
    ]
  },

  // Kenya SHA (Social Health Authority) registration format
  kenya_sha: {
    name: 'Kenya SHA Registration',
    description: 'Field mapping for SHA patient registration payloads',
    mappings: [
      { sourceField: 'first_name', fhirPath: 'name[official].given[0]', transformation: 'formatName' },
      { sourceField: 'surname', fhirPath: 'name[official].family', transformation: 'formatName' },
      { sourceField: 'other_names', fhirPath: 'name[official].given[1]', transformation: 'formatName' },
      { sourceField: 'date_of_birth', fhirPath: 'birthDate', transformation: 'formatKenyaDate' },
      { sourceField: 'sex', fhirPath: 'gender', transformation: 'normalizeGender' },
      { sourceField: 'id_number', fhirPath: 'identifier[national_id].value', transformation: 'formatNationalId' },
      { sourceField: 'sha_id', fhirPath: 'identifier[sha_number].value', transformation: 'formatSHANumber' },
      { sourceField: 'mobile_number', fhirPath: 'telecom[primary_phone].value', transformation: 'formatPhoneKE' },
      { sourceField: 'residence_county', fhirPath: 'extension[county].valueString', transformation: 'formatName' },
      { sourceField: 'residence_sub_county', fhirPath: 'extension[sub_county].valueString', transformation: 'formatName' }
    ]
  },

  // MamaTOTO maternal care format
  kenya_mamatoto: {
    name: 'MamaTOTO Maternal Care',
    description: 'Field mapping for MamaTOTO maternal health payloads',
    mappings: [
      { sourceField: 'mother_first_name', fhirPath: 'name[official].given[0]', transformation: 'formatName' },
      { sourceField: 'mother_last_name', fhirPath: 'name[official].family', transformation: 'formatName' },
      { sourceField: 'mother_dob', fhirPath: 'birthDate', transformation: 'formatKenyaDate' },
      { sourceField: 'mother_id', fhirPath: 'identifier[national_id].value', transformation: 'formatNationalId' },
      { sourceField: 'nhif_member_no', fhirPath: 'identifier[nhif_number].value', transformation: 'formatNHIFNumber' },
      { sourceField: 'mother_phone', fhirPath: 'telecom[primary_phone].value', transformation: 'formatPhoneKE' },
      { sourceField: 'partner_phone', fhirPath: 'telecom[secondary_phone].value', transformation: 'formatPhoneKE' },
      { sourceField: 'county_of_residence', fhirPath: 'extension[county].valueString', transformation: 'formatName' },
      { sourceField: 'facility_county', fhirPath: 'address[home].state', transformation: 'formatName' }
    ]
  },

  // Generic international format (backwards compatibility)
  international: {
    name: 'International Standard',
    description: 'Generic FHIR-compliant field mapping for international use',
    mappings: [
      { sourceField: 'firstName', fhirPath: 'name[official].given[0]', transformation: 'formatName' },
      { sourceField: 'lastName', fhirPath: 'name[official].family', transformation: 'formatName' },
      { sourceField: 'birthDate', fhirPath: 'birthDate', transformation: 'convertToFhirDate' },
      { sourceField: 'gender', fhirPath: 'gender', transformation: 'normalizeGender' },
      { sourceField: 'mrn', fhirPath: 'identifier[mrn].value', transformation: 'trim' },
      { sourceField: 'phone', fhirPath: 'telecom[primary_phone].value', transformation: 'formatPhoneNumber' },
      { sourceField: 'email', fhirPath: 'telecom[email].value', transformation: 'toLowerCase' },
      { sourceField: 'address', fhirPath: 'address[home].line[0]', transformation: '' },
      { sourceField: 'city', fhirPath: 'address[home].city', transformation: '' },
      { sourceField: 'state', fhirPath: 'address[home].state', transformation: '' },
      { sourceField: 'zipCode', fhirPath: 'address[home].postalCode', transformation: '' }
    ]
  }
};

/**
 * Build transformation options from node dropdown
 * Filter out separator values for actual use
 */
function buildTransformationOptions() {
  return [
    { name: 'None', value: '' },
    // Dates
    { name: '-- Dates --', value: '__sep_dates' },
    { name: 'Kenya Date (DD/MM/YYYY)', value: 'formatKenyaDate' },
    { name: 'FHIR Date (YYYY-MM-DD)', value: 'convertToFhirDate' },
    // Phone
    { name: '-- Phone --', value: '__sep_phone' },
    { name: 'Kenya Phone (+254)', value: 'formatPhoneKE' },
    { name: 'International Phone', value: 'formatPhoneNumber' },
    // Names
    { name: '-- Names --', value: '__sep_names' },
    { name: 'Capitalize Name', value: 'formatName' },
    // Gender
    { name: '-- Gender --', value: '__sep_gender' },
    { name: 'Normalize Gender', value: 'normalizeGender' },
    // Kenya Identifiers
    { name: '-- Kenya IDs --', value: '__sep_ke_ids' },
    { name: 'Kenya National ID', value: 'formatNationalId' },
    { name: 'NHIF Number', value: 'formatNHIFNumber' },
    { name: 'SHA Number', value: 'formatSHANumber' },
    { name: 'Passport', value: 'formatPassport' },
    // Text
    { name: '-- Text --', value: '__sep_text' },
    { name: 'Uppercase', value: 'toUpperCase' },
    { name: 'Lowercase', value: 'toLowerCase' },
    { name: 'Trim Whitespace', value: 'trim' },
    { name: 'Remove Special Chars', value: 'removeSpecialChars' }
  ];
}

/**
 * Build template options for dropdown
 */
function buildTemplateOptions() {
  return Object.entries(MAPPING_TEMPLATES).map(([key, template]) => ({
    name: template.name,
    value: key,
    description: template.description
  }));
}

class FhirPatient {
  constructor() {
    this.description = {
      displayName: 'FHIR Patient',
      name: 'fhirPatient',
      group: ['transform'],
      version: 3, // Version bump for template mode and enhanced features
      description: 'Transform JSON payload to FHIR Patient resource with intelligent field mapping, Kenya-specific support, and template-based configuration',
      defaults: {
        name: 'FHIR Patient',
        color: '#2E7D32', // Healthcare green
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        // =====================================================
        // BASIC SETTINGS (Always Visible)
        // =====================================================
        {
          displayName: 'Processing Mode',
          name: 'mode',
          type: 'options',
          options: [
            {
              name: 'Auto-Detection Only',
              value: 'auto',
              description: 'Use automatic field detection with Kenya-specific patterns'
            },
            {
              name: 'Manual Override',
              value: 'manual',
              description: 'Configure custom field mappings with semantic paths'
            },
            {
              name: 'Template Mode',
              value: 'template',
              description: 'Use pre-configured mapping template for common scenarios'
            }
          ],
          default: 'auto',
          description: 'Choose how to handle field mapping'
        },

        // =====================================================
        // TEMPLATE SELECTION (Template Mode Only)
        // =====================================================
        {
          displayName: 'Mapping Template',
          name: 'mappingTemplate',
          type: 'options',
          displayOptions: {
            show: {
              mode: ['template']
            }
          },
          options: [
            {
              name: 'Kenya HMIS Standard',
              value: 'kenya_hmis',
              description: 'Standard field mapping for Kenya Hospital Management Systems'
            },
            {
              name: 'Kenya SHA Registration',
              value: 'kenya_sha',
              description: 'Field mapping for SHA patient registration payloads'
            },
            {
              name: 'MamaTOTO Maternal Care',
              value: 'kenya_mamatoto',
              description: 'Field mapping for MamaTOTO maternal health payloads'
            },
            {
              name: 'International Standard',
              value: 'international',
              description: 'Generic FHIR-compliant field mapping for international use'
            }
          ],
          default: 'kenya_hmis',
          description: 'Select a pre-configured mapping template'
        },
        {
          displayName: 'Template Info',
          name: 'templateInfo',
          type: 'notice',
          displayOptions: {
            show: {
              mode: ['template']
            }
          },
          default: 'Templates provide pre-configured field mappings. Use Template Overrides below to customize specific fields while keeping the template base.',
        },

        // =====================================================
        // TEMPLATE OVERRIDES (Template Mode Only)
        // =====================================================
        {
          displayName: 'Template Overrides',
          name: 'templateOverrides',
          type: 'fixedCollection',
          displayOptions: {
            show: {
              mode: ['template']
            }
          },
          placeholder: 'Add Override',
          default: {},
          typeOptions: {
            multipleValues: true,
          },
          options: [
            {
              name: 'overrideValues',
              displayName: 'Field Override',
              values: [
                {
                  displayName: 'Source Field',
                  name: 'sourceField',
                  type: 'string',
                  default: '',
                  placeholder: 'e.g., my_custom_id_field',
                  description: 'Your input field name that differs from template default'
                },
                {
                  displayName: 'FHIR Path',
                  name: 'fhirPath',
                  type: 'options',
                  options: buildFhirPathOptions(),
                  default: 'identifier[national_id].value',
                  description: 'Target FHIR field to map to'
                },
                {
                  displayName: 'Transformation',
                  name: 'transformation',
                  type: 'options',
                  options: buildTransformationOptions(),
                  default: '',
                  description: 'Optional transformation to apply'
                }
              ]
            }
          ]
        },

        // =====================================================
        // MANUAL MAPPINGS (Manual Mode Only)
        // =====================================================
        {
          displayName: 'Manual Mappings',
          name: 'manualMappings',
          type: 'fixedCollection',
          displayOptions: {
            show: {
              mode: ['manual']
            }
          },
          placeholder: 'Add Field Mapping',
          default: {},
          typeOptions: {
            multipleValues: true,
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
                  displayName: 'FHIR Path',
                  name: 'fhirPath',
                  type: 'options',
                  options: buildFhirPathOptions(),
                  default: 'name[official].given[0]',
                  description: 'Target FHIR field path (supports semantic indices like identifier[sha_number])'
                },
                {
                  displayName: 'Transformation',
                  name: 'transformation',
                  type: 'options',
                  options: buildTransformationOptions(),
                  default: '',
                  description: 'Optional data transformation preset'
                },
                {
                  displayName: 'Action',
                  name: 'action',
                  type: 'options',
                  options: [
                    { name: 'Override/Add Mapping', value: 'override' },
                    { name: 'Remove Mapping', value: 'remove' }
                  ],
                  default: 'override',
                  description: 'Action to perform with this mapping'
                }
              ]
            }
          ]
        },

        // =====================================================
        // KENYA-SPECIFIC OPTIONS
        // =====================================================
        {
          displayName: 'Kenya Options',
          name: 'kenyaOptions',
          type: 'collection',
          placeholder: 'Configure Kenya Settings',
          default: {},
          options: [
            {
              displayName: 'Enable Kenya Validation',
              name: 'enableKenyaValidation',
              type: 'boolean',
              default: true,
              description: 'Enable Kenya-specific validation for IDs, phones, and counties'
            },
            {
              displayName: 'Auto-Correct Kenya Dates',
              name: 'autoCorrectDates',
              type: 'boolean',
              default: true,
              description: 'Automatically convert DD/MM/YYYY dates to FHIR format'
            },
            {
              displayName: 'Auto-Correct Kenya Phones',
              name: 'autoCorrectPhones',
              type: 'boolean',
              default: true,
              description: 'Automatically format phone numbers to +254 format'
            },
            {
              displayName: 'Validate County Names',
              name: 'validateCounties',
              type: 'boolean',
              default: true,
              description: 'Validate and correct Kenya county names against official list'
            }
          ]
        },

        // =====================================================
        // ADVANCED OPTIONS
        // =====================================================
        {
          displayName: 'Advanced Options',
          name: 'options',
          type: 'collection',
          placeholder: 'Add Option',
          default: {},
          options: [
            {
              displayName: 'Include Detection Details',
              name: 'includeDetailedMapping',
              type: 'boolean',
              default: false,
              description: 'Include auto-detection details and confidence scores in output'
            },
            {
              displayName: 'Include Confidence Scores',
              name: 'includeConfidenceScores',
              type: 'boolean',
              default: false,
              description: 'Add confidence indicators for each mapped field'
            },
            {
              displayName: 'Stop on Validation Error',
              name: 'stopOnError',
              type: 'boolean',
              default: false,
              description: 'Stop execution if validation fails (not recommended with forgiving mode)'
            },
            {
              displayName: 'Custom Resource ID',
              name: 'customId',
              type: 'string',
              default: '',
              placeholder: 'patient-123',
              description: 'Override auto-generated resource ID'
            },
            {
              displayName: 'Preserve Unmapped Fields',
              name: 'preserveUnmapped',
              type: 'boolean',
              default: false,
              description: 'Include unmapped input fields in extensions'
            }
          ]
        }
      ]
    };
  }

  async execute(inputItems) {
    const returnData = [];
    const transformer = new FhirTransformer('patient');

    for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
      try {
        const inputData = inputItems[itemIndex].json;

        // Get node parameters
        const mode = this.getNodeParameter('mode', itemIndex);
        const options = this.getNodeParameter('options', itemIndex, {});
        const kenyaOptions = this.getNodeParameter('kenyaOptions', itemIndex, {});

        // Prepare user mappings based on mode
        let userMappings = null;

        if (mode === 'manual') {
          // Manual mode: use user-defined mappings
          const manualMappings = this.getNodeParameter('manualMappings', itemIndex, {});
          userMappings = manualMappings.mappingValues || [];
        } else if (mode === 'template') {
          // Template mode: load template and apply overrides
          const templateName = this.getNodeParameter('mappingTemplate', itemIndex);
          const template = MAPPING_TEMPLATES[templateName];

          if (template) {
            // Start with template mappings
            userMappings = template.mappings.map(m => ({
              ...m,
              action: 'override'
            }));

            // Apply template overrides
            const templateOverrides = this.getNodeParameter('templateOverrides', itemIndex, {});
            const overrides = templateOverrides.overrideValues || [];

            for (const override of overrides) {
              // Find and replace matching mapping or add new one
              const existingIndex = userMappings.findIndex(m => m.fhirPath === override.fhirPath);
              if (existingIndex >= 0) {
                userMappings[existingIndex] = { ...override, action: 'override' };
              } else {
                userMappings.push({ ...override, action: 'override' });
              }
            }
          }
        }
        // Auto mode: userMappings stays null, uses auto-detection only

        // Build transform options including Kenya-specific settings
        const transformOptions = {
          mode: mode,
          includeDetailedMapping: options.includeDetailedMapping || false,
          includeConfidenceScores: options.includeConfidenceScores || false,
          customId: options.customId || null,
          preserveUnmapped: options.preserveUnmapped || false,
          // Kenya-specific options passed to validator
          kenyaValidation: {
            enabled: kenyaOptions.enableKenyaValidation !== false,
            autoCorrectDates: kenyaOptions.autoCorrectDates !== false,
            autoCorrectPhones: kenyaOptions.autoCorrectPhones !== false,
            validateCounties: kenyaOptions.validateCounties !== false
          }
        };

        // Transform the data
        const result = await transformer.transform(inputData, userMappings, transformOptions);

        // Apply custom ID if provided
        if (options.customId && result.fhir_resource) {
          result.fhir_resource.id = options.customId;
          result.metadata.resource_id = options.customId;
        }

        // Add confidence scores if requested
        if (options.includeConfidenceScores && result.mapping_summary) {
          result.confidence_report = this._buildConfidenceReport(result);
        }

        // Handle validation errors based on options
        if (result.error && options.stopOnError) {
          throw new Error(`FHIR validation failed: ${result.err_message}`);
        }

        // Add processing metadata
        result.metadata.node_execution = {
          itemIndex: itemIndex,
          processingMode: mode,
          templateUsed: mode === 'template' ? this.getNodeParameter('mappingTemplate', itemIndex) : null,
          inputFieldCount: Object.keys(inputData).length,
          kenyaValidationEnabled: kenyaOptions.enableKenyaValidation !== false,
          timestamp: new Date().toISOString(),
          nodeVersion: 3
        };

        returnData.push({
          json: result,
          index: itemIndex
        });

      } catch (error) {
        if (this.getNodeParameter('options.stopOnError', itemIndex, false)) {
          throw error;
        }

        // Return error in standard format
        returnData.push({
          json: {
            error: true,
            fhir_resource: null,
            err_message: error.message,
            resource_type: 'Patient',
            validation_summary: {
              status: 'error',
              mapped_fields: [],
              unmapped_fields: [],
              skipped_mappings: [],
              warnings: [],
              corrections: []
            },
            mapping_summary: {
              total_input_fields: 0,
              auto_detected: 0,
              user_overrides: 0,
              high_confidence: 0,
              needs_review: 0,
              successfully_applied: 0,
              skipped_due_to_missing_fields: 0
            },
            metadata: {
              transformation_time: new Date().toISOString(),
              resource_id: null,
              processing_mode: 'error',
              node_execution: {
                itemIndex: itemIndex,
                error: error.message,
                nodeVersion: 3
              }
            }
          },
          index: itemIndex
        });
      }
    }

    return [returnData];
  }

  /**
   * Build confidence report for mapped fields
   * Provides visibility into auto-detection quality
   */
  _buildConfidenceReport(result) {
    const report = {
      overall_confidence: 'high',
      high_confidence_count: result.mapping_summary.high_confidence || 0,
      needs_review_count: result.mapping_summary.needs_review || 0,
      field_confidence: []
    };

    // Calculate overall confidence
    const total = report.high_confidence_count + report.needs_review_count;
    if (total > 0) {
      const ratio = report.high_confidence_count / total;
      if (ratio >= 0.8) {
        report.overall_confidence = 'high';
      } else if (ratio >= 0.5) {
        report.overall_confidence = 'medium';
      } else {
        report.overall_confidence = 'low';
      }
    }

    return report;
  }
}

/**
 * Build FHIR path options for dropdown
 * Organized by category with semantic array indices
 */
function buildFhirPathOptions() {
  return [
    // Names (using semantic indices)
    { name: '-- Names --', value: '__sep_names' },
    { name: 'First Name', value: 'name[official].given[0]' },
    { name: 'Middle Name', value: 'name[official].given[1]' },
    { name: 'Last Name', value: 'name[official].family' },
    { name: 'Full Name', value: 'name[official].text' },

    // Demographics
    { name: '-- Demographics --', value: '__sep_demo' },
    { name: 'Birth Date', value: 'birthDate' },
    { name: 'Gender', value: 'gender' },
    { name: 'Marital Status', value: 'maritalStatus.coding[0].code' },

    // Contact Information
    { name: '-- Contact --', value: '__sep_contact' },
    { name: 'Primary Phone', value: 'telecom[primary_phone].value' },
    { name: 'Secondary Phone', value: 'telecom[secondary_phone].value' },
    { name: 'Work Phone', value: 'telecom[work_phone].value' },
    { name: 'Email', value: 'telecom[email].value' },

    // Standard Identifiers
    { name: '-- Standard IDs --', value: '__sep_std_ids' },
    { name: 'Medical Record Number', value: 'identifier[mrn].value' },
    { name: 'SSN', value: 'identifier[1].value' },

    // Kenya-specific Identifiers
    { name: '-- Kenya IDs --', value: '__sep_ke_ids' },
    { name: 'Kenya National ID', value: 'identifier[national_id].value' },
    { name: 'SHA Number', value: 'identifier[sha_number].value' },
    { name: 'NHIF Number', value: 'identifier[nhif_number].value' },
    { name: 'Passport', value: 'identifier[passport].value' },
    { name: 'Alien ID', value: 'identifier[alien_id].value' },

    // Address
    { name: '-- Address --', value: '__sep_addr' },
    { name: 'Address Line', value: 'address[home].line[0]' },
    { name: 'City', value: 'address[home].city' },
    { name: 'State/Province', value: 'address[home].state' },
    { name: 'ZIP Code', value: 'address[home].postalCode' },
    { name: 'Country', value: 'address[home].country' },

    // Kenya Address Extensions
    { name: '-- Kenya Location --', value: '__sep_ke_loc' },
    { name: 'County', value: 'extension[county].valueString' },
    { name: 'Sub-County', value: 'extension[sub_county].valueString' },
    { name: 'Ward', value: 'extension[ward].valueString' },

    // Emergency Contact
    { name: '-- Emergency Contact --', value: '__sep_emerg' },
    { name: 'Emergency Contact Name', value: 'contact[emergency_contact].name.text' },
    { name: 'Emergency Contact Phone', value: 'contact[emergency_contact].telecom[0].value' },
    { name: 'Emergency Contact Relation', value: 'contact[emergency_contact].relationship[0].coding[0].code' },

    // Additional Info
    { name: '-- Additional --', value: '__sep_add' },
    { name: 'Occupation', value: 'extension[occupation].valueString' }
  ];
}

module.exports = {
  description: new FhirPatient().description,
  execute: async function(inputItems) {
    const node = new FhirPatient();
    node.getNodeParameter = this.getNodeParameter.bind(this);
    return await node.execute.call(node, inputItems);
  },
  // Export for testing and external use
  MAPPING_TEMPLATES,
  buildFhirPathOptions,
  buildTransformationOptions
};
