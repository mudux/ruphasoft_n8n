// FHIR EligibilityResponse Node v2
// n8n custom node with auto-detection + manual override mapping
// Enhanced for Kenya Insurance Eligibility (KHIE, mamaTOTO, LCT, Smart)
// Supports SHA/SHIF/NHIF government schemes and private insurance

const { FhirTransformer } = require('../src/utils/fhirTransform');
const { getEligibilityResponsePresetOptions, applyPreset } = require('../src/utils/transformationPresets');
const { SEMANTIC_INDICES } = require('../src/utils/semanticPaths');

// Kenya Insurance Scheme Templates
const ELIGIBILITY_TEMPLATES = {
  khie_sha: {
    name: 'KHIE - SHA/SHIF',
    description: 'Kenya HIE - Social Health Authority/Social Health Insurance Fund',
    mappings: {
      sha_number: 'patient.identifier.value',
      household_id: 'extension[household_id].valueString',
      member_status: 'extension[member_status].valueCode',
      dependent_type: 'extension[dependent_type].valueCode',
      last_contribution: 'extension[last_contribution_date].valueDate',
      coverage_id: 'insurance[primary_cover].coverage.reference',
      inforce: 'insurance[primary_cover].inforce',
      effective_date: 'insurance[primary_cover].benefitPeriod.start',
      end_date: 'insurance[primary_cover].benefitPeriod.end',
      outpatient_limit: 'insurance[primary_cover].item[outpatient].benefit[annual_limit].allowedMoney.value',
      inpatient_limit: 'insurance[primary_cover].item[inpatient].benefit[annual_limit].allowedMoney.value',
      maternity_limit: 'insurance[primary_cover].item[maternity].benefit[annual_limit].allowedMoney.value'
    }
  },
  khie_nhif: {
    name: 'KHIE - NHIF (Legacy)',
    description: 'Kenya HIE - National Hospital Insurance Fund (Legacy System)',
    mappings: {
      nhif_number: 'patient.identifier.value',
      member_id: 'identifier[response_id].value',
      status: 'status',
      outcome: 'outcome',
      coverage_ref: 'insurance[primary_cover].coverage.reference',
      active: 'insurance[primary_cover].inforce',
      start_date: 'insurance[primary_cover].benefitPeriod.start',
      expiry_date: 'insurance[primary_cover].benefitPeriod.end',
      benefit_limit: 'insurance[primary_cover].item[outpatient].benefit[annual_limit].allowedMoney.value'
    }
  },
  mamatoto: {
    name: 'mamaTOTO',
    description: 'MamaTOTO Maternal Care Eligibility',
    mappings: {
      patient_id: 'patient.reference',
      member_number: 'patient.identifier.value',
      eligibility_status: 'status',
      eligibility_outcome: 'outcome',
      coverage_id: 'insurance[primary_cover].coverage.reference',
      is_eligible: 'insurance[primary_cover].inforce',
      coverage_start: 'insurance[primary_cover].benefitPeriod.start',
      coverage_end: 'insurance[primary_cover].benefitPeriod.end',
      anc_covered: 'insurance[primary_cover].item[maternity].benefit[annual_limit].allowedMoney.value',
      delivery_covered: 'insurance[primary_cover].item[maternity].benefit[copay].allowedMoney.value'
    }
  },
  lct: {
    name: 'LCT (Private Insurance)',
    description: 'LCT Claims Processing - Private Insurance Eligibility',
    mappings: {
      policy_number: 'insurance[primary_cover].coverage.identifier.value',
      member_card: 'patient.identifier.value',
      group_number: 'insurance[primary_cover].coverage.class.value',
      status: 'status',
      outcome: 'outcome',
      coverage_ref: 'insurance[primary_cover].coverage.reference',
      active: 'insurance[primary_cover].inforce',
      effective_date: 'insurance[primary_cover].benefitPeriod.start',
      termination_date: 'insurance[primary_cover].benefitPeriod.end',
      outpatient_copay: 'insurance[primary_cover].item[outpatient].benefit[copay].allowedMoney.value',
      inpatient_copay: 'insurance[primary_cover].item[inpatient].benefit[copay].allowedMoney.value',
      annual_limit: 'insurance[primary_cover].item[outpatient].benefit[annual_limit].allowedMoney.value',
      used_amount: 'insurance[primary_cover].item[outpatient].benefit[used_amount].usedMoney.value',
      remaining: 'insurance[primary_cover].item[outpatient].benefit[remaining_amount].allowedMoney.value'
    }
  },
  smart: {
    name: 'Smart',
    description: 'Smart Insurance Eligibility',
    mappings: {
      subscriber_id: 'patient.identifier.value',
      policy_id: 'insurance[primary_cover].coverage.identifier.value',
      status: 'status',
      outcome: 'outcome',
      coverage_reference: 'insurance[primary_cover].coverage.reference',
      is_active: 'insurance[primary_cover].inforce',
      start_date: 'insurance[primary_cover].benefitPeriod.start',
      end_date: 'insurance[primary_cover].benefitPeriod.end',
      copay: 'insurance[primary_cover].item[outpatient].benefit[copay].allowedMoney.value',
      coinsurance: 'insurance[primary_cover].item[outpatient].benefit[coinsurance].allowedUnsignedInt',
      deductible: 'insurance[primary_cover].item[outpatient].benefit[deductible].allowedMoney.value',
      oop_max: 'insurance[primary_cover].item[outpatient].benefit[out_of_pocket_max].allowedMoney.value'
    }
  },
  international: {
    name: 'International (Generic)',
    description: 'Generic FHIR-compliant eligibility mapping',
    mappings: {
      response_id: 'identifier[response_id].value',
      status: 'status',
      outcome: 'outcome',
      patient_ref: 'patient.reference',
      insurer_ref: 'insurer.reference',
      request_ref: 'request.reference',
      created: 'created',
      coverage_ref: 'insurance[0].coverage.reference',
      inforce: 'insurance[0].inforce',
      benefit_start: 'insurance[0].benefitPeriod.start',
      benefit_end: 'insurance[0].benefitPeriod.end',
      category_code: 'insurance[0].item[0].category.coding[0].code',
      copay: 'insurance[0].item[0].benefit[0].allowedMoney.value',
      deductible: 'insurance[0].item[0].benefit[1].allowedMoney.value'
    }
  }
};

// FHIR Path Options with Semantic Indices for Kenya Insurance
const ELIGIBILITY_FHIR_PATHS = [
  // Response Identifiers
  { name: 'Request ID', value: 'identifier[request_id].value' },
  { name: 'Response ID', value: 'identifier[response_id].value' },

  // Status and Outcome
  { name: 'Status', value: 'status' },
  { name: 'Outcome', value: 'outcome' },
  { name: 'Purpose', value: 'purpose[0]' },
  { name: 'Created Date', value: 'created' },

  // Patient/Member Reference
  { name: 'Patient Reference', value: 'patient.reference' },
  { name: 'Patient Identifier', value: 'patient.identifier.value' },
  { name: 'Patient Display', value: 'patient.display' },

  // Insurer Reference
  { name: 'Insurer Reference', value: 'insurer.reference' },
  { name: 'Insurer Identifier', value: 'insurer.identifier.value' },
  { name: 'Insurer Display', value: 'insurer.display' },

  // Request Reference
  { name: 'Request Reference', value: 'request.reference' },

  // Primary Coverage
  { name: 'Coverage Reference (Primary)', value: 'insurance[primary_cover].coverage.reference' },
  { name: 'Coverage Identifier', value: 'insurance[primary_cover].coverage.identifier.value' },
  { name: 'Coverage Display', value: 'insurance[primary_cover].coverage.display' },
  { name: 'Coverage Inforce', value: 'insurance[primary_cover].inforce' },
  { name: 'Benefit Period Start', value: 'insurance[primary_cover].benefitPeriod.start' },
  { name: 'Benefit Period End', value: 'insurance[primary_cover].benefitPeriod.end' },

  // Secondary Coverage
  { name: 'Coverage Reference (Secondary)', value: 'insurance[secondary_cover].coverage.reference' },
  { name: 'Secondary Inforce', value: 'insurance[secondary_cover].inforce' },

  // Outpatient Benefits
  { name: 'Outpatient Category', value: 'insurance[primary_cover].item[outpatient].category.coding[0].code' },
  { name: 'Outpatient Copay', value: 'insurance[primary_cover].item[outpatient].benefit[copay].allowedMoney.value' },
  { name: 'Outpatient Coinsurance %', value: 'insurance[primary_cover].item[outpatient].benefit[coinsurance].allowedUnsignedInt' },
  { name: 'Outpatient Deductible', value: 'insurance[primary_cover].item[outpatient].benefit[deductible].allowedMoney.value' },
  { name: 'Outpatient Annual Limit', value: 'insurance[primary_cover].item[outpatient].benefit[annual_limit].allowedMoney.value' },
  { name: 'Outpatient Used Amount', value: 'insurance[primary_cover].item[outpatient].benefit[used_amount].usedMoney.value' },
  { name: 'Outpatient Remaining', value: 'insurance[primary_cover].item[outpatient].benefit[remaining_amount].allowedMoney.value' },

  // Inpatient Benefits
  { name: 'Inpatient Category', value: 'insurance[primary_cover].item[inpatient].category.coding[0].code' },
  { name: 'Inpatient Copay', value: 'insurance[primary_cover].item[inpatient].benefit[copay].allowedMoney.value' },
  { name: 'Inpatient Annual Limit', value: 'insurance[primary_cover].item[inpatient].benefit[annual_limit].allowedMoney.value' },
  { name: 'Inpatient Used Amount', value: 'insurance[primary_cover].item[inpatient].benefit[used_amount].usedMoney.value' },

  // Maternity Benefits
  { name: 'Maternity Category', value: 'insurance[primary_cover].item[maternity].category.coding[0].code' },
  { name: 'Maternity Copay', value: 'insurance[primary_cover].item[maternity].benefit[copay].allowedMoney.value' },
  { name: 'Maternity Annual Limit', value: 'insurance[primary_cover].item[maternity].benefit[annual_limit].allowedMoney.value' },

  // Dental Benefits
  { name: 'Dental Category', value: 'insurance[primary_cover].item[dental].category.coding[0].code' },
  { name: 'Dental Annual Limit', value: 'insurance[primary_cover].item[dental].benefit[annual_limit].allowedMoney.value' },

  // Optical Benefits
  { name: 'Optical Category', value: 'insurance[primary_cover].item[optical].category.coding[0].code' },
  { name: 'Optical Annual Limit', value: 'insurance[primary_cover].item[optical].benefit[annual_limit].allowedMoney.value' },

  // Chronic Care Benefits
  { name: 'Chronic Care Category', value: 'insurance[primary_cover].item[chronic].category.coding[0].code' },
  { name: 'Chronic Care Limit', value: 'insurance[primary_cover].item[chronic].benefit[annual_limit].allowedMoney.value' },

  // Out of Pocket Maximum
  { name: 'Out of Pocket Maximum', value: 'insurance[primary_cover].item[outpatient].benefit[out_of_pocket_max].allowedMoney.value' },

  // Kenya-Specific Extensions
  { name: 'Integrator Source', value: 'extension[integrator_source].valueCode' },
  { name: 'Member Status', value: 'extension[member_status].valueCode' },
  { name: 'Dependent Type', value: 'extension[dependent_type].valueCode' },
  { name: 'Last Contribution Date', value: 'extension[last_contribution_date].valueDate' },
  { name: 'SHA Household ID', value: 'extension[household_id].valueString' },
  { name: 'Principal Member Ref', value: 'extension[principal_member_ref].valueReference.reference' },
  { name: 'Facility Network Status', value: 'extension[facility_network].valueString' },

  // Error Handling
  { name: 'Error Code', value: 'error[0].code.coding[0].code' },
  { name: 'Error Display', value: 'error[0].code.coding[0].display' },
  { name: 'Error Text', value: 'error[0].code.text' }
];

class FhirEligibilityResponse {
  constructor() {
    this.description = {
      displayName: 'FHIR EligibilityResponse v2',
      name: 'fhirEligibilityResponse',
      group: ['transform'],
      version: 2,
      subtitle: '={{$parameter["mode"]}} - {{$parameter["template"] || "auto"}}',
      description: 'Transform JSON to FHIR CoverageEligibilityResponse with Kenya insurance support (SHA/SHIF/NHIF, mamaTOTO, LCT, Smart)',
      defaults: {
        name: 'FHIR EligibilityResponse',
        color: '#2E7D32', // Healthcare green
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        // ============================================
        // Processing Mode Selection
        // ============================================
        {
          displayName: 'Processing Mode',
          name: 'mode',
          type: 'options',
          options: [
            {
              name: 'Template Mode',
              value: 'template',
              description: 'Use pre-configured integrator template (recommended)'
            },
            {
              name: 'Auto-Detection Only',
              value: 'auto',
              description: 'Use automatic field detection without manual overrides'
            },
            {
              name: 'Manual Override',
              value: 'manual',
              description: 'Configure custom field mappings'
            }
          ],
          default: 'template',
          description: 'Choose how to handle field mapping'
        },

        // ============================================
        // Template Selection
        // ============================================
        {
          displayName: 'Integrator Template',
          name: 'template',
          type: 'options',
          displayOptions: {
            show: {
              mode: ['template']
            }
          },
          options: [
            { name: 'KHIE - SHA/SHIF (Government)', value: 'khie_sha' },
            { name: 'KHIE - NHIF (Legacy)', value: 'khie_nhif' },
            { name: 'mamaTOTO (Maternal Care)', value: 'mamatoto' },
            { name: 'LCT (Private Insurance)', value: 'lct' },
            { name: 'Smart', value: 'smart' },
            { name: 'International (Generic)', value: 'international' }
          ],
          default: 'khie_sha',
          description: 'Select integrator-specific mapping template'
        },

        // ============================================
        // Template Overrides
        // ============================================
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
          description: 'Override specific template mappings without full manual configuration',
          options: [
            {
              name: 'overrideValues',
              displayName: 'Override',
              values: [
                {
                  displayName: 'Source Field',
                  name: 'sourceField',
                  type: 'string',
                  default: '',
                  placeholder: 'e.g., custom_member_id',
                  description: 'Field name from input JSON'
                },
                {
                  displayName: 'FHIR Path',
                  name: 'fhirPath',
                  type: 'options',
                  options: ELIGIBILITY_FHIR_PATHS,
                  default: 'patient.identifier.value',
                  description: 'Target FHIR field path (semantic indexing supported)'
                },
                {
                  displayName: 'Transformation',
                  name: 'transformation',
                  type: 'options',
                  options: getEligibilityResponsePresetOptions(),
                  default: '',
                  description: 'Optional data transformation'
                }
              ]
            }
          ]
        },

        // ============================================
        // Manual Mappings (Full Control)
        // ============================================
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
                  placeholder: 'e.g., member_id',
                  description: 'Field name from input JSON'
                },
                {
                  displayName: 'FHIR Path',
                  name: 'fhirPath',
                  type: 'options',
                  options: ELIGIBILITY_FHIR_PATHS,
                  default: 'patient.identifier.value',
                  description: 'Target FHIR field path (semantic indexing supported)'
                },
                {
                  displayName: 'Transformation',
                  name: 'transformation',
                  type: 'options',
                  options: getEligibilityResponsePresetOptions(),
                  default: '',
                  description: 'Optional data transformation'
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

        // ============================================
        // Eligibility Defaults
        // ============================================
        {
          displayName: 'Eligibility Defaults',
          name: 'eligibilityDefaults',
          type: 'collection',
          placeholder: 'Add Default',
          default: {},
          description: 'Default values for eligibility response fields',
          options: [
            {
              displayName: 'Default Status',
              name: 'defaultStatus',
              type: 'options',
              options: [
                { name: 'Active', value: 'active' },
                { name: 'Cancelled', value: 'cancelled' },
                { name: 'Draft', value: 'draft' },
                { name: 'Entered in Error', value: 'entered-in-error' }
              ],
              default: 'active',
              description: 'Default eligibility status if not provided'
            },
            {
              displayName: 'Default Outcome',
              name: 'defaultOutcome',
              type: 'options',
              options: [
                { name: 'Complete (Eligible)', value: 'complete' },
                { name: 'Partial (Limited Coverage)', value: 'partial' },
                { name: 'Error (Not Eligible)', value: 'error' },
                { name: 'Queued (Pending)', value: 'queued' }
              ],
              default: 'complete',
              description: 'Default outcome if not provided'
            },
            {
              displayName: 'Default Purpose',
              name: 'defaultPurpose',
              type: 'options',
              options: [
                { name: 'Benefits', value: 'benefits' },
                { name: 'Auth Requirements', value: 'auth-requirements' },
                { name: 'Discovery', value: 'discovery' },
                { name: 'Validation', value: 'validation' }
              ],
              default: 'benefits',
              description: 'Default eligibility purpose'
            },
            {
              displayName: 'Default Currency',
              name: 'defaultCurrency',
              type: 'options',
              options: [
                { name: 'KES (Kenya Shillings)', value: 'KES' },
                { name: 'USD (US Dollars)', value: 'USD' },
                { name: 'EUR (Euros)', value: 'EUR' }
              ],
              default: 'KES',
              description: 'Default currency for monetary amounts'
            },
            {
              displayName: 'Default Inforce',
              name: 'defaultInforce',
              type: 'boolean',
              default: true,
              description: 'Default coverage inforce status'
            },
            {
              displayName: 'Default Member Status',
              name: 'defaultMemberStatus',
              type: 'options',
              options: [
                { name: 'Active', value: 'active' },
                { name: 'Inactive', value: 'inactive' },
                { name: 'Suspended', value: 'suspended' },
                { name: 'Pending', value: 'pending' }
              ],
              default: 'active',
              description: 'Default member status (Kenya-specific)'
            },
            {
              displayName: 'Default Dependent Type',
              name: 'defaultDependentType',
              type: 'options',
              options: [
                { name: 'Principal Member', value: 'principal' },
                { name: 'Spouse', value: 'spouse' },
                { name: 'Child', value: 'child' },
                { name: 'Parent', value: 'parent' },
                { name: 'Other', value: 'other' }
              ],
              default: 'principal',
              description: 'Default dependent relationship type'
            }
          ]
        },

        // ============================================
        // Benefit Categories Configuration
        // ============================================
        {
          displayName: 'Benefit Categories',
          name: 'benefitCategories',
          type: 'multiOptions',
          options: [
            { name: 'Outpatient (OP)', value: 'outpatient' },
            { name: 'Inpatient (IP)', value: 'inpatient' },
            { name: 'Maternity (MAT)', value: 'maternity' },
            { name: 'Surgical (SURG)', value: 'surgical' },
            { name: 'Dental (DENT)', value: 'dental' },
            { name: 'Optical (OPT)', value: 'optical' },
            { name: 'Chronic Care (CHR)', value: 'chronic' },
            { name: 'Emergency (EMR)', value: 'emergency' },
            { name: 'Mental Health (MH)', value: 'mental_health' },
            { name: 'Rehabilitation (REHAB)', value: 'rehabilitation' },
            { name: 'Pharmacy (PHARM)', value: 'pharmacy' },
            { name: 'Laboratory (LAB)', value: 'laboratory' },
            { name: 'Radiology (RAD)', value: 'radiology' }
          ],
          default: ['outpatient', 'inpatient', 'maternity'],
          description: 'Benefit categories to include in response (Kenya health packages)'
        },

        // ============================================
        // Kenya Options
        // ============================================
        {
          displayName: 'Kenya Options',
          name: 'kenyaOptions',
          type: 'collection',
          placeholder: 'Add Kenya Option',
          default: {},
          description: 'Kenya-specific eligibility options',
          options: [
            {
              displayName: 'Enable Kenya Validation',
              name: 'enableKenyaValidation',
              type: 'boolean',
              default: true,
              description: 'Enable Kenya-specific validation rules'
            },
            {
              displayName: 'Auto-Correct Dates',
              name: 'autoCorrectDates',
              type: 'boolean',
              default: true,
              description: 'Auto-correct DD/MM/YYYY to YYYY-MM-DD'
            },
            {
              displayName: 'Insurance Scheme',
              name: 'insuranceScheme',
              type: 'options',
              options: [
                { name: 'SHA (Social Health Authority)', value: 'SHA' },
                { name: 'SHIF (Social Health Insurance Fund)', value: 'SHIF' },
                { name: 'NHIF (Legacy)', value: 'NHIF' },
                { name: 'Private Insurance', value: 'PRIVATE' }
              ],
              default: 'SHA',
              description: 'Default insurance scheme for KHIE'
            },
            {
              displayName: 'Include Household ID',
              name: 'includeHouseholdId',
              type: 'boolean',
              default: true,
              description: 'Include SHA household ID in extensions'
            },
            {
              displayName: 'Include Last Contribution',
              name: 'includeLastContribution',
              type: 'boolean',
              default: true,
              description: 'Include last contribution date tracking'
            },
            {
              displayName: 'Integrator Source',
              name: 'integratorSource',
              type: 'options',
              options: [
                { name: 'KHIE', value: 'KHIE' },
                { name: 'mamaTOTO', value: 'MAMATOTO' },
                { name: 'LCT', value: 'LCT' },
                { name: 'Smart', value: 'SMART' }
              ],
              default: 'KHIE',
              description: 'Mark integrator source in extensions'
            }
          ]
        },

        // ============================================
        // General Options
        // ============================================
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
              displayName: 'Include Confidence Scores',
              name: 'includeConfidenceScores',
              type: 'boolean',
              default: false,
              description: 'Include field mapping confidence scores in output'
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
              placeholder: 'eligibility-response-123',
              description: 'Override auto-generated resource ID'
            },
            {
              displayName: 'Generate Request Reference',
              name: 'generateRequestRef',
              type: 'boolean',
              default: false,
              description: 'Auto-generate request reference if not provided'
            }
          ]
        }
      ]
    };
  }

  async execute(inputItems) {
    const returnData = [];
    const transformer = new FhirTransformer('eligibilityResponse');

    for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
      try {
        const inputData = inputItems[itemIndex].json;

        // Get node parameters
        const mode = this.getNodeParameter('mode', itemIndex);
        const options = this.getNodeParameter('options', itemIndex, {});
        const eligibilityDefaults = this.getNodeParameter('eligibilityDefaults', itemIndex, {});
        const kenyaOptions = this.getNodeParameter('kenyaOptions', itemIndex, {});
        const benefitCategories = this.getNodeParameter('benefitCategories', itemIndex, ['outpatient', 'inpatient', 'maternity']);

        // Prepare user mappings based on mode
        let userMappings = null;
        let templateName = null;

        if (mode === 'template') {
          templateName = this.getNodeParameter('template', itemIndex);
          const template = ELIGIBILITY_TEMPLATES[templateName];

          if (template) {
            // Convert template mappings to user mappings format
            userMappings = Object.entries(template.mappings).map(([sourceField, fhirPath]) => ({
              sourceField,
              fhirPath,
              action: 'override'
            }));

            // Apply template overrides
            const templateOverrides = this.getNodeParameter('templateOverrides', itemIndex, {});
            if (templateOverrides.overrideValues && templateOverrides.overrideValues.length > 0) {
              for (const override of templateOverrides.overrideValues) {
                // Find and replace existing mapping or add new one
                const existingIndex = userMappings.findIndex(m => m.sourceField === override.sourceField);
                if (existingIndex >= 0) {
                  userMappings[existingIndex] = {
                    sourceField: override.sourceField,
                    fhirPath: override.fhirPath,
                    transformation: override.transformation,
                    action: 'override'
                  };
                } else {
                  userMappings.push({
                    sourceField: override.sourceField,
                    fhirPath: override.fhirPath,
                    transformation: override.transformation,
                    action: 'override'
                  });
                }
              }
            }
          }
        } else if (mode === 'manual') {
          const manualMappings = this.getNodeParameter('manualMappings', itemIndex, {});
          userMappings = manualMappings.mappingValues || [];
        }

        // Apply transformations to user mappings
        if (userMappings) {
          for (const mapping of userMappings) {
            if (mapping.transformation && inputData[mapping.sourceField] !== undefined) {
              const transformed = applyPreset(mapping.transformation, inputData[mapping.sourceField]);
              if (transformed !== undefined) {
                inputData[`__transformed_${mapping.sourceField}`] = transformed;
              }
            }
          }
        }

        // Transform options
        const transformOptions = {
          mode: mode,
          includeDetailedMapping: options.includeDetailedMapping || false,
          includeConfidenceScores: options.includeConfidenceScores || false,
          customId: options.customId || null,
          defaults: {
            status: eligibilityDefaults.defaultStatus || 'active',
            outcome: eligibilityDefaults.defaultOutcome || 'complete',
            purpose: eligibilityDefaults.defaultPurpose || 'benefits',
            currency: eligibilityDefaults.defaultCurrency || 'KES',
            inforce: eligibilityDefaults.defaultInforce !== false,
            memberStatus: eligibilityDefaults.defaultMemberStatus || 'active',
            dependentType: eligibilityDefaults.defaultDependentType || 'principal'
          },
          kenyaOptions: {
            enableKenyaValidation: kenyaOptions.enableKenyaValidation !== false,
            autoCorrectDates: kenyaOptions.autoCorrectDates !== false,
            insuranceScheme: kenyaOptions.insuranceScheme || 'SHA',
            includeHouseholdId: kenyaOptions.includeHouseholdId !== false,
            includeLastContribution: kenyaOptions.includeLastContribution !== false,
            integratorSource: kenyaOptions.integratorSource || 'KHIE'
          },
          benefitCategories: benefitCategories
        };

        // Transform the data
        const result = await transformer.transform(inputData, userMappings, transformOptions);

        // Post-process FHIR resource with eligibility-specific enhancements
        if (result.fhir_resource) {
          this._enhanceEligibilityResponse(result.fhir_resource, transformOptions, inputData);
        }

        // Apply custom ID if provided
        if (options.customId && result.fhir_resource) {
          result.fhir_resource.id = options.customId;
          result.metadata.resource_id = options.customId;
        }

        // Handle validation errors based on options
        if (result.error && options.stopOnError) {
          throw new Error(`FHIR validation failed: ${result.err_message}`);
        }

        // Add processing metadata
        result.metadata.node_execution = {
          itemIndex: itemIndex,
          processingMode: mode,
          templateUsed: templateName || null,
          inputFieldCount: Object.keys(inputData).length,
          benefitCategoriesIncluded: benefitCategories,
          kenyaOptionsApplied: transformOptions.kenyaOptions,
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

        // Return error in standard format
        returnData.push({
          json: {
            error: true,
            fhir_resource: null,
            err_message: error.message,
            resource_type: 'CoverageEligibilityResponse',
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
              high_confidence: 0,
              needs_review: 0
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
          },
          index: itemIndex
        });
      }
    }

    return [returnData];
  }

  /**
   * Enhance eligibility response with Kenya-specific data
   */
  _enhanceEligibilityResponse(resource, options, inputData) {
    // Ensure proper resource type
    resource.resourceType = 'CoverageEligibilityResponse';

    // Apply defaults
    if (!resource.status) {
      resource.status = options.defaults.status;
    }

    if (!resource.outcome) {
      resource.outcome = options.defaults.outcome;
    }

    if (!resource.purpose || resource.purpose.length === 0) {
      resource.purpose = [options.defaults.purpose];
    }

    if (!resource.created) {
      resource.created = new Date().toISOString();
    }

    // Initialize insurance array if needed
    if (!resource.insurance) {
      resource.insurance = [];
    }

    // Ensure primary insurance entry exists
    if (resource.insurance.length === 0) {
      resource.insurance.push({
        coverage: {},
        inforce: options.defaults.inforce,
        item: []
      });
    }

    // Set default inforce
    if (resource.insurance[0].inforce === undefined) {
      resource.insurance[0].inforce = options.defaults.inforce;
    }

    // Add benefit category items if not present
    this._addBenefitCategoryItems(resource, options);

    // Add Kenya-specific extensions
    if (options.kenyaOptions.enableKenyaValidation) {
      this._addKenyaExtensions(resource, options, inputData);
    }

    // Ensure currency is set for all money fields
    this._ensureCurrency(resource, options.defaults.currency);
  }

  /**
   * Add benefit category items based on configuration
   */
  _addBenefitCategoryItems(resource, options) {
    const categoryMapping = {
      outpatient: { code: 'OP', display: 'Outpatient Services' },
      inpatient: { code: 'IP', display: 'Inpatient Services' },
      maternity: { code: 'MAT', display: 'Maternity Services' },
      surgical: { code: 'SURG', display: 'Surgical Services' },
      dental: { code: 'DENT', display: 'Dental Services' },
      optical: { code: 'OPT', display: 'Optical Services' },
      chronic: { code: 'CHR', display: 'Chronic Disease Management' },
      emergency: { code: 'EMR', display: 'Emergency Services' },
      mental_health: { code: 'MH', display: 'Mental Health Services' },
      rehabilitation: { code: 'REHAB', display: 'Rehabilitation Services' },
      pharmacy: { code: 'PHARM', display: 'Pharmacy Benefits' },
      laboratory: { code: 'LAB', display: 'Laboratory Services' },
      radiology: { code: 'RAD', display: 'Radiology/Imaging' }
    };

    // Get existing item categories
    const existingCategories = new Set(
      (resource.insurance[0].item || [])
        .filter(i => i.category && i.category.coding && i.category.coding[0])
        .map(i => i.category.coding[0].code)
    );

    // Add missing benefit categories
    for (const category of options.benefitCategories) {
      const catInfo = categoryMapping[category];
      if (catInfo && !existingCategories.has(catInfo.code)) {
        if (!resource.insurance[0].item) {
          resource.insurance[0].item = [];
        }

        resource.insurance[0].item.push({
          category: {
            coding: [{
              system: 'http://kenya.go.ke/fhir/CodeSystem/benefit-category',
              code: catInfo.code,
              display: catInfo.display
            }]
          },
          benefit: []
        });
      }
    }
  }

  /**
   * Add Kenya-specific extensions
   */
  _addKenyaExtensions(resource, options, inputData) {
    if (!resource.extension) {
      resource.extension = [];
    }

    const existingUrls = new Set(resource.extension.map(e => e.url));

    // Add integrator source extension
    const integratorUrl = 'http://kenya.go.ke/fhir/StructureDefinition/integrator-source';
    if (!existingUrls.has(integratorUrl)) {
      resource.extension.push({
        url: integratorUrl,
        valueCode: options.kenyaOptions.integratorSource
      });
    }

    // Add member status extension
    const memberStatusUrl = 'http://kenya.go.ke/fhir/StructureDefinition/member-status';
    if (!existingUrls.has(memberStatusUrl)) {
      resource.extension.push({
        url: memberStatusUrl,
        valueCode: options.defaults.memberStatus
      });
    }

    // Add dependent type extension
    const dependentTypeUrl = 'http://kenya.go.ke/fhir/StructureDefinition/dependent-type';
    if (!existingUrls.has(dependentTypeUrl)) {
      resource.extension.push({
        url: dependentTypeUrl,
        valueCode: options.defaults.dependentType
      });
    }

    // Add household ID if applicable (SHA)
    if (options.kenyaOptions.includeHouseholdId && inputData.household_id) {
      const householdUrl = 'http://kenya.go.ke/fhir/StructureDefinition/sha-household-id';
      if (!existingUrls.has(householdUrl)) {
        resource.extension.push({
          url: householdUrl,
          valueString: inputData.household_id
        });
      }
    }

    // Add last contribution date if applicable
    if (options.kenyaOptions.includeLastContribution && inputData.last_contribution) {
      const contributionUrl = 'http://kenya.go.ke/fhir/StructureDefinition/last-contribution-date';
      if (!existingUrls.has(contributionUrl)) {
        resource.extension.push({
          url: contributionUrl,
          valueDate: inputData.last_contribution
        });
      }
    }
  }

  /**
   * Ensure currency is set on all money fields
   */
  _ensureCurrency(resource, defaultCurrency) {
    const processMoney = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      if (obj.allowedMoney && !obj.allowedMoney.currency) {
        obj.allowedMoney.currency = defaultCurrency;
      }
      if (obj.usedMoney && !obj.usedMoney.currency) {
        obj.usedMoney.currency = defaultCurrency;
      }

      // Recursively process nested objects
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object') {
          if (Array.isArray(obj[key])) {
            obj[key].forEach(item => processMoney(item));
          } else {
            processMoney(obj[key]);
          }
        }
      }
    };

    processMoney(resource);
  }
}

module.exports = {
  description: new FhirEligibilityResponse().description,
  execute: async function(inputItems) {
    const node = new FhirEligibilityResponse();
    node.getNodeParameter = this.getNodeParameter.bind(this);
    return await node.execute.call(node, inputItems);
  }
};
