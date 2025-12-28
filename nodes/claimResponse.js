// FHIR ClaimResponse Node v2
// n8n custom node with auto-detection + manual override mapping
// Enhanced with Kenya-specific insurance patterns (KHIE: SHA/SHIF/NHIF)
// Supports 4 integrators: KHIE, mamaTOTO, LCT, Smart

const { FhirTransformer } = require('../src/utils/fhirTransform');
const { getAvailableSemanticNames } = require('../src/utils/semanticPaths');
const { getClaimResponsePresetOptions } = require('../src/utils/transformationPresets');

class FhirClaimResponse {
  constructor() {
    this.description = {
      displayName: 'FHIR ClaimResponse',
      name: 'fhirClaimResponse',
      group: ['transform'],
      version: 2, // Version bump for enhanced features
      description: 'Transform JSON payload to FHIR ClaimResponse resource with Kenya insurance support (KHIE: SHA/SHIF/NHIF)',
      defaults: {
        name: 'FHIR ClaimResponse',
        color: '#1565C0', // Blue for insurance/claims
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        // --- Basic Settings ---
        {
          displayName: 'Processing Mode',
          name: 'mode',
          type: 'options',
          options: [
            {
              name: 'Auto-Detection Only',
              value: 'auto',
              description: 'Use automatic field detection with Kenya insurance patterns'
            },
            {
              name: 'Manual Override',
              value: 'manual',
              description: 'Configure custom field mappings with semantic paths'
            },
            {
              name: 'Template Mode',
              value: 'template',
              description: 'Use pre-configured integrator template'
            }
          ],
          default: 'auto',
          description: 'Choose how to handle field mapping'
        },

        // --- Template Selection (for Template Mode) ---
        {
          displayName: 'Integrator Template',
          name: 'integratorTemplate',
          type: 'options',
          displayOptions: {
            show: {
              mode: ['template']
            }
          },
          options: [
            {
              name: 'KHIE (SHA/SHIF/NHIF Government)',
              value: 'khie',
              description: 'Kenya HIE - Government insurance schemes'
            },
            {
              name: 'mamaTOTO (Maternal Care)',
              value: 'mamatoto',
              description: 'Maternal health claims processing'
            },
            {
              name: 'LCT (Claims Processing)',
              value: 'lct',
              description: 'Linda Claims Technology format'
            },
            {
              name: 'Smart (FHIR Native)',
              value: 'smart',
              description: 'SMART on FHIR compliant format'
            }
          ],
          default: 'khie',
          description: 'Select integrator-specific mapping template'
        },

        // --- Insurance Scheme Selection ---
        {
          displayName: 'Insurance Scheme',
          name: 'insuranceScheme',
          type: 'options',
          options: [
            { name: 'Auto-Detect', value: 'auto' },
            { name: 'SHA (Social Health Authority)', value: 'SHA' },
            { name: 'SHIF (Social Health Insurance Fund)', value: 'SHIF' },
            { name: 'NHIF (National Hospital Insurance Fund)', value: 'NHIF' },
            { name: 'Private Insurance', value: 'PRIVATE' }
          ],
          default: 'auto',
          description: 'Select Kenya insurance scheme (or auto-detect from payload)'
        },

        // --- Default Claim Settings ---
        {
          displayName: 'Default Settings',
          name: 'defaultSettings',
          type: 'collection',
          placeholder: 'Add Default Setting',
          default: {},
          options: [
            {
              displayName: 'Default Outcome',
              name: 'defaultOutcome',
              type: 'options',
              options: [
                { name: 'Queued (Pending)', value: 'queued' },
                { name: 'Complete (Approved)', value: 'complete' },
                { name: 'Partial (Partially Approved)', value: 'partial' },
                { name: 'Error (Denied)', value: 'error' }
              ],
              default: 'queued',
              description: 'Default claim outcome if not specified'
            },
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
              description: 'Default claim status if not specified'
            },
            {
              displayName: 'Default Currency',
              name: 'defaultCurrency',
              type: 'string',
              default: 'KES',
              description: 'Default currency for monetary amounts'
            },
            {
              displayName: 'Default Benefit Category',
              name: 'defaultBenefitCategory',
              type: 'options',
              options: [
                { name: 'Outpatient (OP)', value: 'OP' },
                { name: 'Inpatient (IP)', value: 'IP' },
                { name: 'Maternity (MAT)', value: 'MAT' },
                { name: 'Surgical (SURG)', value: 'SURG' },
                { name: 'Dental (DENT)', value: 'DENT' },
                { name: 'Optical (OPT)', value: 'OPT' },
                { name: 'Chronic Care (CHR)', value: 'CHR' },
                { name: 'Emergency (EMR)', value: 'EMR' },
                { name: 'Rehabilitation (REHAB)', value: 'REHAB' },
                { name: 'Mental Health (MH)', value: 'MH' }
              ],
              default: 'OP',
              description: 'Default benefit category'
            }
          ]
        },

        // --- Manual Mappings (Enhanced) ---
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
                  placeholder: 'e.g., claim_id, approved_amount',
                  description: 'Field name from input JSON'
                },
                {
                  displayName: 'FHIR Path',
                  name: 'fhirPath',
                  type: 'options',
                  options: [
                    // Claim Identifiers
                    { name: '-- Claim Identifiers --', value: '__sep_ids' },
                    { name: 'Claim Number', value: 'identifier[claim_number].value' },
                    { name: 'Pre-auth Number', value: 'identifier[preauth_number].value' },
                    { name: 'Invoice Number', value: 'identifier[invoice_number].value' },
                    { name: 'SHA Claim Ref', value: 'identifier[sha_claim_ref].value' },
                    { name: 'NHIF Claim Ref', value: 'identifier[nhif_claim_ref].value' },
                    { name: 'SHIF Claim Ref', value: 'identifier[shif_claim_ref].value' },
                    { name: 'External Ref', value: 'identifier[external_ref].value' },

                    // Status and Outcome
                    { name: '-- Status/Outcome --', value: '__sep_status' },
                    { name: 'Status', value: 'status' },
                    { name: 'Outcome', value: 'outcome' },
                    { name: 'Process Note', value: 'processNote[0].text' },
                    { name: 'Disposition', value: 'disposition' },

                    // References
                    { name: '-- References --', value: '__sep_refs' },
                    { name: 'Patient Reference', value: 'patient.reference' },
                    { name: 'Patient ID', value: 'patient.identifier.value' },
                    { name: 'Insurer Reference', value: 'insurer.reference' },
                    { name: 'Insurer Name', value: 'insurer.display' },
                    { name: 'Request Reference', value: 'request.reference' },
                    { name: 'Original Claim ID', value: 'request.identifier.value' },

                    // Monetary Amounts
                    { name: '-- Amounts --', value: '__sep_amounts' },
                    { name: 'Submitted Amount', value: 'total[submitted].amount.value' },
                    { name: 'Approved Amount', value: 'total[approved].amount.value' },
                    { name: 'Copay Amount', value: 'total[patient_responsibility].amount.value' },
                    { name: 'Deductible Amount', value: 'total[deductible].amount.value' },

                    // Payment
                    { name: '-- Payment --', value: '__sep_payment' },
                    { name: 'Payment Amount', value: 'payment.amount.value' },
                    { name: 'Payment Date', value: 'payment.date' },
                    { name: 'Payment Reference', value: 'payment.identifier.value' },

                    // Service Line Item (first)
                    { name: '-- Service Line --', value: '__sep_item' },
                    { name: 'Item Sequence', value: 'item[0].itemSequence' },
                    { name: 'Service Code', value: 'item[0].productOrService.coding[0].code' },
                    { name: 'Service Name', value: 'item[0].productOrService.text' },
                    { name: 'Service Date', value: 'item[0].servicedDate' },
                    { name: 'Quantity', value: 'item[0].quantity.value' },
                    { name: 'Unit Price', value: 'item[0].net.value' },

                    // Adjudication (first item)
                    { name: '-- Adjudication --', value: '__sep_adj' },
                    { name: 'Benefit Amount', value: 'item[0].adjudication[benefit_amount].amount.value' },
                    { name: 'Copay', value: 'item[0].adjudication[copay].amount.value' },
                    { name: 'Deductible', value: 'item[0].adjudication[deductible].amount.value' },
                    { name: 'Adjudication Reason', value: 'item[0].adjudication[0].reason.text' },

                    // Error/Denial
                    { name: '-- Error/Denial --', value: '__sep_error' },
                    { name: 'Error Code', value: 'error[0].code.coding[0].code' },
                    { name: 'Denial Reason', value: 'error[0].code.text' },

                    // Insurance
                    { name: '-- Insurance --', value: '__sep_ins' },
                    { name: 'Coverage Reference', value: 'insurance[primary].coverage.reference' },
                    { name: 'Policy Number', value: 'insurance[primary].coverage.identifier.value' },

                    // Extensions
                    { name: '-- Extensions --', value: '__sep_ext' },
                    { name: 'Claim Type', value: 'extension[claim_type].valueCode' },
                    { name: 'Benefit Category', value: 'extension[benefit_category].valueCode' },
                    { name: 'Facility Tier', value: 'extension[facility_tier].valueCode' },
                    { name: 'Integrator Source', value: 'extension[integrator_source].valueCode' },
                    { name: 'Processing Notes', value: 'extension[processing_notes].valueString' },

                    // Dates
                    { name: '-- Dates --', value: '__sep_dates' },
                    { name: 'Created Date', value: 'created' },
                    { name: 'Processed Date', value: 'disposition' }
                  ],
                  default: 'identifier[claim_number].value',
                  description: 'Target FHIR field path (supports semantic indices)'
                },
                {
                  displayName: 'Transformation',
                  name: 'transformation',
                  type: 'options',
                  options: [
                    { name: 'None', value: '' },
                    // Claim Numbers
                    { name: '-- Claim Numbers --', value: '__sep_clm' },
                    { name: 'Claim Number', value: 'formatClaimNumber' },
                    { name: 'SHA Claim Number', value: 'formatSHAClaimNumber' },
                    { name: 'NHIF Claim Number', value: 'formatNHIFClaimNumber' },
                    { name: 'Pre-auth Number', value: 'formatPreauthNumber' },
                    // Amounts
                    { name: '-- Amounts (KES) --', value: '__sep_amt' },
                    { name: 'Benefit Amount', value: 'formatBenefitAmount' },
                    { name: 'Claim Amount', value: 'formatClaimAmount' },
                    { name: 'Copay Amount', value: 'formatCopayAmount' },
                    // Status/Outcome
                    { name: '-- Status/Outcome --', value: '__sep_sts' },
                    { name: 'Claim Outcome', value: 'normalizeClaimOutcome' },
                    { name: 'Claim Status', value: 'normalizeClaimStatus' },
                    // Insurance
                    { name: '-- Insurance --', value: '__sep_ins' },
                    { name: 'Insurance Scheme', value: 'validateInsuranceScheme' },
                    { name: 'Benefit Category', value: 'parseBenefitCategory' },
                    { name: 'Adjudication Code', value: 'parseAdjudicationCode' },
                    // References
                    { name: '-- References --', value: '__sep_ref' },
                    { name: 'Claim Reference', value: 'formatClaimReference' },
                    { name: 'Insurer Reference', value: 'formatInsurerReference' },
                    { name: 'Coverage Reference', value: 'formatCoverageReference' },
                    { name: 'Patient Reference', value: 'formatPatientReference' },
                    // Dates
                    { name: '-- Dates --', value: '__sep_dt' },
                    { name: 'Claim Date', value: 'formatClaimDate' },
                    { name: 'Payment Date', value: 'formatPaymentDate' },
                    { name: 'Kenya Date (DD/MM/YYYY)', value: 'formatKenyaDate' },
                    // Error
                    { name: '-- Error --', value: '__sep_err' },
                    { name: 'Error Code', value: 'formatClaimErrorCode' },
                    // Other
                    { name: '-- Other --', value: '__sep_oth' },
                    { name: 'Line Number', value: 'formatServiceLineNumber' },
                    { name: 'Integrator Source', value: 'formatIntegratorSource' },
                    { name: 'Uppercase', value: 'toUpperCase' },
                    { name: 'Lowercase', value: 'toLowerCase' },
                    { name: 'Trim Whitespace', value: 'trim' }
                  ],
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

        // --- Kenya-Specific Options ---
        {
          displayName: 'Kenya Options',
          name: 'kenyaOptions',
          type: 'collection',
          placeholder: 'Add Kenya Option',
          default: {},
          options: [
            {
              displayName: 'Enable Kenya Validation',
              name: 'enableKenyaValidation',
              type: 'boolean',
              default: true,
              description: 'Enable Kenya-specific validation for insurance schemes and amounts'
            },
            {
              displayName: 'Auto-Correct Dates',
              name: 'autoCorrectDates',
              type: 'boolean',
              default: true,
              description: 'Automatically convert Kenya date formats (DD/MM/YYYY) to FHIR format'
            },
            {
              displayName: 'Auto-Format Amounts',
              name: 'autoFormatAmounts',
              type: 'boolean',
              default: true,
              description: 'Automatically format monetary amounts with KES currency'
            },
            {
              displayName: 'Validate Insurance Scheme',
              name: 'validateScheme',
              type: 'boolean',
              default: true,
              description: 'Validate insurance scheme against Kenya schemes (SHA/SHIF/NHIF)'
            }
          ]
        },

        // --- Advanced Options ---
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
              description: 'Include auto-detection details and confidence scores in output'
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
              placeholder: 'claimresponse-123',
              description: 'Override auto-generated resource ID'
            },
            {
              displayName: 'Include Confidence Scores',
              name: 'includeConfidence',
              type: 'boolean',
              default: false,
              description: 'Include field mapping confidence scores in output'
            }
          ]
        }
      ]
    };
  }

  async execute(inputItems) {
    const returnData = [];
    const transformer = new FhirTransformer('claimResponse');

    for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
      try {
        const inputData = inputItems[itemIndex].json;

        // Get node parameters
        const mode = this.getNodeParameter('mode', itemIndex);
        const options = this.getNodeParameter('options', itemIndex, {});
        const defaultSettings = this.getNodeParameter('defaultSettings', itemIndex, {});
        const kenyaOptions = this.getNodeParameter('kenyaOptions', itemIndex, {});
        const insuranceScheme = this.getNodeParameter('insuranceScheme', itemIndex, 'auto');

        // Prepare user mappings for manual override mode
        let userMappings = null;
        if (mode === 'manual') {
          const manualMappings = this.getNodeParameter('manualMappings', itemIndex, {});
          userMappings = manualMappings.mappingValues || [];
        } else if (mode === 'template') {
          const template = this.getNodeParameter('integratorTemplate', itemIndex, 'khie');
          userMappings = this._getTemplateMappings(template);
        }

        // Pre-process input data with default settings
        const processedInput = this._applyDefaultSettings(inputData, defaultSettings, insuranceScheme);

        // Transform the data
        const transformOptions = {
          mode: mode,
          includeDetailedMapping: options.includeDetailedMapping || false,
          customId: options.customId || null
        };

        const result = await transformer.transform(processedInput, userMappings, transformOptions);

        // Apply custom ID if provided
        if (options.customId && result.fhir_resource) {
          result.fhir_resource.id = options.customId;
          result.metadata.resource_id = options.customId;
        }

        // Apply Kenya-specific post-processing
        if (kenyaOptions.enableKenyaValidation !== false && result.fhir_resource) {
          this._applyKenyaPostProcessing(result.fhir_resource, defaultSettings, insuranceScheme);
        }

        // Handle validation errors based on options
        if (result.error && options.stopOnError) {
          throw new Error(`FHIR validation failed: ${result.err_message}`);
        }

        // Add processing metadata
        result.metadata.node_execution = {
          itemIndex: itemIndex,
          processingMode: mode,
          inputFieldCount: Object.keys(inputData).length,
          timestamp: new Date().toISOString(),
          insuranceScheme: insuranceScheme,
          integratorTemplate: mode === 'template' ? this.getNodeParameter('integratorTemplate', itemIndex, 'khie') : null
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
            resource_type: 'ClaimResponse',
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

  // Get template mappings for specific integrators
  _getTemplateMappings(template) {
    const templates = {
      // KHIE - Government insurance (SHA/SHIF/NHIF)
      khie: [
        { sourceField: 'claim_ref', fhirPath: 'identifier[claim_number].value', transformation: 'formatClaimNumber', action: 'override' },
        { sourceField: 'preauth_ref', fhirPath: 'identifier[preauth_number].value', transformation: 'formatPreauthNumber', action: 'override' },
        { sourceField: 'claim_status', fhirPath: 'status', transformation: 'normalizeClaimStatus', action: 'override' },
        { sourceField: 'claim_outcome', fhirPath: 'outcome', transformation: 'normalizeClaimOutcome', action: 'override' },
        { sourceField: 'member_id', fhirPath: 'patient.identifier.value', transformation: '', action: 'override' },
        { sourceField: 'insurer_code', fhirPath: 'insurer.reference', transformation: 'formatInsurerReference', action: 'override' },
        { sourceField: 'submitted_amount', fhirPath: 'total[submitted].amount.value', transformation: 'formatClaimAmount', action: 'override' },
        { sourceField: 'approved_amount', fhirPath: 'total[approved].amount.value', transformation: 'formatBenefitAmount', action: 'override' },
        { sourceField: 'copay_amount', fhirPath: 'total[patient_responsibility].amount.value', transformation: 'formatCopayAmount', action: 'override' },
        { sourceField: 'payment_amount', fhirPath: 'payment.amount.value', transformation: 'formatBenefitAmount', action: 'override' },
        { sourceField: 'payment_date', fhirPath: 'payment.date', transformation: 'formatPaymentDate', action: 'override' },
        { sourceField: 'scheme_type', fhirPath: 'extension[claim_type].valueCode', transformation: 'validateInsuranceScheme', action: 'override' },
        { sourceField: 'benefit_category', fhirPath: 'extension[benefit_category].valueCode', transformation: 'parseBenefitCategory', action: 'override' }
      ],

      // mamaTOTO - Maternal care claims
      mamatoto: [
        { sourceField: 'claim_id', fhirPath: 'identifier[claim_number].value', transformation: 'formatClaimNumber', action: 'override' },
        { sourceField: 'status', fhirPath: 'status', transformation: 'normalizeClaimStatus', action: 'override' },
        { sourceField: 'result', fhirPath: 'outcome', transformation: 'normalizeClaimOutcome', action: 'override' },
        { sourceField: 'patient_id', fhirPath: 'patient.reference', transformation: 'formatPatientReference', action: 'override' },
        { sourceField: 'total_claimed', fhirPath: 'total[submitted].amount.value', transformation: 'formatClaimAmount', action: 'override' },
        { sourceField: 'total_approved', fhirPath: 'total[approved].amount.value', transformation: 'formatBenefitAmount', action: 'override' },
        { sourceField: 'patient_share', fhirPath: 'total[patient_responsibility].amount.value', transformation: 'formatCopayAmount', action: 'override' },
        { sourceField: 'service_date', fhirPath: 'item[0].servicedDate', transformation: 'formatClaimDate', action: 'override' },
        { sourceField: 'service_type', fhirPath: 'item[0].productOrService.text', transformation: '', action: 'override' }
      ],

      // LCT - Claims processing
      lct: [
        { sourceField: 'claimNumber', fhirPath: 'identifier[claim_number].value', transformation: 'formatClaimNumber', action: 'override' },
        { sourceField: 'authorizationNumber', fhirPath: 'identifier[preauth_number].value', transformation: 'formatPreauthNumber', action: 'override' },
        { sourceField: 'claimStatus', fhirPath: 'status', transformation: 'normalizeClaimStatus', action: 'override' },
        { sourceField: 'adjudicationResult', fhirPath: 'outcome', transformation: 'normalizeClaimOutcome', action: 'override' },
        { sourceField: 'patientMemberNumber', fhirPath: 'patient.identifier.value', transformation: '', action: 'override' },
        { sourceField: 'payerCode', fhirPath: 'insurer.reference', transformation: 'formatInsurerReference', action: 'override' },
        { sourceField: 'claimedAmount', fhirPath: 'total[submitted].amount.value', transformation: 'formatClaimAmount', action: 'override' },
        { sourceField: 'approvedAmount', fhirPath: 'total[approved].amount.value', transformation: 'formatBenefitAmount', action: 'override' },
        { sourceField: 'memberLiability', fhirPath: 'total[patient_responsibility].amount.value', transformation: 'formatCopayAmount', action: 'override' },
        { sourceField: 'settlementAmount', fhirPath: 'payment.amount.value', transformation: 'formatBenefitAmount', action: 'override' },
        { sourceField: 'settlementDate', fhirPath: 'payment.date', transformation: 'formatPaymentDate', action: 'override' },
        { sourceField: 'denialCode', fhirPath: 'error[0].code.coding[0].code', transformation: 'formatClaimErrorCode', action: 'override' },
        { sourceField: 'denialReason', fhirPath: 'error[0].code.text', transformation: '', action: 'override' }
      ],

      // Smart - FHIR native format
      smart: [
        { sourceField: 'id', fhirPath: 'identifier[claim_number].value', transformation: '', action: 'override' },
        { sourceField: 'status', fhirPath: 'status', transformation: '', action: 'override' },
        { sourceField: 'outcome', fhirPath: 'outcome', transformation: '', action: 'override' },
        { sourceField: 'patient', fhirPath: 'patient.reference', transformation: '', action: 'override' },
        { sourceField: 'insurer', fhirPath: 'insurer.reference', transformation: '', action: 'override' },
        { sourceField: 'request', fhirPath: 'request.reference', transformation: '', action: 'override' },
        { sourceField: 'totalValue', fhirPath: 'total[approved].amount.value', transformation: 'formatBenefitAmount', action: 'override' },
        { sourceField: 'paymentAmount', fhirPath: 'payment.amount.value', transformation: 'formatBenefitAmount', action: 'override' },
        { sourceField: 'paymentDate', fhirPath: 'payment.date', transformation: '', action: 'override' },
        { sourceField: 'created', fhirPath: 'created', transformation: '', action: 'override' }
      ]
    };

    return templates[template] || templates.khie;
  }

  // Apply default settings to input data
  _applyDefaultSettings(inputData, defaultSettings, insuranceScheme) {
    const processed = { ...inputData };

    // Apply default outcome if not present
    if (!processed.outcome && !processed.claim_outcome && !processed.result && defaultSettings.defaultOutcome) {
      processed._defaultOutcome = defaultSettings.defaultOutcome;
    }

    // Apply default status if not present
    if (!processed.status && !processed.claim_status && defaultSettings.defaultStatus) {
      processed._defaultStatus = defaultSettings.defaultStatus;
    }

    // Apply insurance scheme if specified
    if (insuranceScheme !== 'auto' && !processed.scheme_type && !processed.insuranceScheme) {
      processed._insuranceScheme = insuranceScheme;
    }

    // Apply default benefit category
    if (!processed.benefit_category && !processed.benefitCategory && defaultSettings.defaultBenefitCategory) {
      processed._benefitCategory = defaultSettings.defaultBenefitCategory;
    }

    return processed;
  }

  // Apply Kenya-specific post-processing
  _applyKenyaPostProcessing(resource, defaultSettings, insuranceScheme) {
    // Ensure currency is KES if not specified
    const currency = defaultSettings.defaultCurrency || 'KES';

    // Process totals
    if (resource.total && Array.isArray(resource.total)) {
      resource.total.forEach(total => {
        if (total.amount && !total.amount.currency) {
          total.amount.currency = currency;
        }
      });
    }

    // Process payment
    if (resource.payment && resource.payment.amount && !resource.payment.amount.currency) {
      resource.payment.amount.currency = currency;
    }

    // Process item adjudications
    if (resource.item && Array.isArray(resource.item)) {
      resource.item.forEach(item => {
        if (item.adjudication && Array.isArray(item.adjudication)) {
          item.adjudication.forEach(adj => {
            if (adj.amount && !adj.amount.currency) {
              adj.amount.currency = currency;
            }
          });
        }
        if (item.net && !item.net.currency) {
          item.net.currency = currency;
        }
      });
    }

    // Add insurance scheme extension if specified
    if (insuranceScheme !== 'auto' && insuranceScheme) {
      resource.extension = resource.extension || [];
      const existingScheme = resource.extension.find(e =>
        e.url === 'http://kenya.go.ke/fhir/StructureDefinition/claim-type'
      );
      if (!existingScheme) {
        resource.extension.push({
          url: 'http://kenya.go.ke/fhir/StructureDefinition/claim-type',
          valueCode: insuranceScheme
        });
      }
    }

    // Ensure use is 'claim' for ClaimResponse
    if (!resource.use) {
      resource.use = 'claim';
    }

    // Add type if not present (institutional claim)
    if (!resource.type) {
      resource.type = {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: 'institutional',
          display: 'Institutional'
        }]
      };
    }
  }
}

module.exports = {
  description: new FhirClaimResponse().description,
  execute: async function(inputItems) {
    const node = new FhirClaimResponse();
    node.getNodeParameter = this.getNodeParameter.bind(this);
    return await node.execute.call(node, inputItems);
  }
};
