import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const { FhirTransformer } = require('../../src/utils/fhirTransform');

export class FhirEligibilityResponse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FHIR Eligibility Response',
		name: 'fhirEligibilityResponse',
		group: ['transform'],
		version: 1,
		icon: 'fa:shield-alt',
		description: 'Transform JSON payload to FHIR CoverageEligibilityResponse resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Eligibility Response',
			color: '#2E7D32', // Healthcare green
		},
		inputs: ['main'],
		outputs: ['main'],
		hints: [
			{
				message: '🤖 <strong>Smart FHIR Mapping:</strong> Use auto-detection guidance and manual field mapping to transform your JSON payload into compliant FHIR CoverageEligibilityResponse resources.',
				type: 'info',
				location: 'inputPane',
				whenToDisplay: 'always'
			}
		],
		properties: [
			{
				displayName: 'Auto-Detection Helper',
				name: 'autoDetectionResults',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'runAutoDetection'
				},
				default: '',
				description: '🔍 <strong>Click the dropdown to see mapping examples</strong> and auto-detection guidance. Copy useful mapping patterns to the fields below.',
				placeholder: 'Click here for auto-detection guidance and mapping examples...'
			},
			{
				displayName: 'Field Mappings',
				name: 'manualMappings',
				type: 'fixedCollection',
				placeholder: 'Add field mapping',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Field Mappings',
						name: 'mappingValues',
						values: [
							{
								displayName: 'Source Field',
								name: 'sourceField',
								type: 'string',
								default: '',
								description: 'Enter the field name from your input data (e.g., eligibility_status, member_id, coverage_id)',
								placeholder: 'eligibility_status'
							},
							{
								displayName: 'FHIR Path',
								name: 'fhirPath',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getEligibilityResponseFhirPaths'
								},
								default: '',
								description: 'The FHIR resource path to map to'
							},
							{
								displayName: 'Transformation',
								name: 'transformation',
								type: 'options',
								options: [
									{ name: 'None', value: '' },
									{ name: 'Format Name (Proper Case)', value: 'formatName' },
									{ name: 'Convert to FHIR Date', value: 'convertToFhirDate' },
									{ name: 'Format Phone Number', value: 'formatPhoneNumber' },
									{ name: 'Normalize Gender', value: 'normalizeGender' },
									{ name: 'To Upper Case', value: 'toUpperCase' },
									{ name: 'To Lower Case', value: 'toLowerCase' },
									{ name: 'Trim Whitespace', value: 'trim' }
								],
								default: '',
								description: 'Optional transformation to apply to the field value'
							},
							{
								displayName: 'Action',
								name: 'action',
								type: 'options',
								options: [
									{ name: 'Override Auto-Detection', value: 'override' },
									{ name: 'Add New Mapping', value: 'add' },
									{ name: 'Remove Field', value: 'remove' }
								],
								default: 'override',
								description: 'How to handle this mapping'
							}
						]
					}
				]
			},
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
						description: 'Whether to include detailed mapping analysis in output'
					},
					{
						displayName: 'Stop on Validation Error',
						name: 'stopOnError',
						type: 'boolean',
						default: false,
						description: 'Whether to halt execution on FHIR validation errors'
					},
					{
						displayName: 'Custom Resource ID',
						name: 'customId',
						type: 'string',
						default: '',
						placeholder: 'eligibility-response-123',
						description: 'Override auto-generated resource ID'
					}
				]
			}
		]
	};

	methods = {
		loadOptions: {
			async runAutoDetection(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					// Provide Kenya IG-compliant eligibility response mapping guidance and examples
					return [
						{ name: '🇰🇪 Kenya IG Eligibility Response Mapping Guide', value: '', description: 'Auto-detection patterns for Kenya Health Information Exchange eligibility responses' },
						{ name: '📋 Quick Start:', value: '', description: 'Copy the mapping patterns below to your manual fields' },

						// Resource Core
						{ name: '🆔 RESOURCE CORE', value: '', description: 'Eligibility response resource identification' },
						{ name: 'eligibility_response_id → id', value: 'eligibility_response_id|id|', description: 'Override auto-generated resource ID' },
						{ name: 'status → status', value: 'status|status|', description: 'Response status (active, cancelled, draft, entered-in-error)' },
						{ name: 'outcome → outcome', value: 'outcome|outcome|', description: 'Processing outcome (queued, complete, error, partial)' },

						// Kenya HIE Identifiers
						{ name: '🏥 KENYA HIE IDENTIFIERS', value: '', description: 'Healthcare system eligibility response IDs' },
						{ name: 'fhir_eligibility_id → identifier[fhir_resource].value', value: 'fhir_eligibility_id|identifier[fhir_resource].value|', description: 'FHIR resource identifier' },
						{ name: 'internal_eligibility_id → identifier[internal].value', value: 'internal_eligibility_id|identifier[internal].value|', description: 'Internal system eligibility ID' },
						{ name: 'insurer_reference_id → identifier[insurer_ref].value', value: 'insurer_reference_id|identifier[insurer_ref].value|', description: 'Insurer reference number' },

						// Request Processing
						{ name: '📋 REQUEST PROCESSING', value: '', description: 'Eligibility request processing details' },
						{ name: 'purpose → purpose[0]', value: 'purpose|purpose[0]|', description: 'Request purpose (auth-requirements, benefits, discovery, validation)' },
						{ name: 'disposition → disposition', value: 'disposition|disposition|', description: 'Human readable result description' },
						{ name: 'created_date → created', value: 'created_date|created|convertToFhirDate', description: 'Response creation date' },

						// References
						{ name: '👤 PATIENT REFERENCES', value: '', description: 'Patient identification for eligibility check' },
						{ name: 'patient_id → patient.reference', value: 'patient_id|patient.reference|', description: 'Patient reference (Patient/id)' },
						{ name: 'patient_name → patient.display', value: 'patient_name|patient.display|', description: 'Patient display name' },

						// Insurer Information
						{ name: '🏥 INSURER REFERENCES', value: '', description: 'Insurance provider information' },
						{ name: 'insurer_id → insurer.reference', value: 'insurer_id|insurer.reference|', description: 'Insurer reference (Organization/id)' },
						{ name: 'insurer_name → insurer.display', value: 'insurer_name|insurer.display|', description: 'Insurer organization name' },

						// Request Reference
						{ name: '📄 REQUEST REFERENCE', value: '', description: 'Original eligibility request' },
						{ name: 'request_id → request.reference', value: 'request_id|request.reference|', description: 'Original request reference (CoverageEligibilityRequest/id)' },
						{ name: 'request_display → request.display', value: 'request_display|request.display|', description: 'Request display name' },

						// Service Period
						{ name: '📅 SERVICE PERIOD', value: '', description: 'Eligibility check period' },
						{ name: 'service_date → servicedDate', value: 'service_date|servicedDate|convertToFhirDate', description: 'Single service date' },
						{ name: 'service_start → servicedPeriod.start', value: 'service_start|servicedPeriod.start|convertToFhirDate', description: 'Service period start' },
						{ name: 'service_end → servicedPeriod.end', value: 'service_end|servicedPeriod.end|convertToFhirDate', description: 'Service period end' },

						// Insurance Coverage
						{ name: '🛡️ INSURANCE COVERAGE', value: '', description: 'Coverage details and status' },
						{ name: 'coverage_id → insurance[0].coverage.reference', value: 'coverage_id|insurance[0].coverage.reference|', description: 'Coverage reference (Coverage/id)' },
						{ name: 'coverage_name → insurance[0].coverage.display', value: 'coverage_name|insurance[0].coverage.display|', description: 'Coverage display name' },
						{ name: 'coverage_inforce → insurance[0].inforce', value: 'coverage_inforce|insurance[0].inforce|', description: 'Coverage is currently in force (true/false)' },

						// Benefit Period
						{ name: '📅 BENEFIT PERIOD', value: '', description: 'Insurance benefit period' },
						{ name: 'benefit_start → insurance[0].benefitPeriod.start', value: 'benefit_start|insurance[0].benefitPeriod.start|convertToFhirDate', description: 'Benefit period start date' },
						{ name: 'benefit_end → insurance[0].benefitPeriod.end', value: 'benefit_end|insurance[0].benefitPeriod.end|convertToFhirDate', description: 'Benefit period end date' },

						// Benefit Categories
						{ name: '🏥 BENEFIT CATEGORIES', value: '', description: 'Service benefit categories' },
						{ name: 'benefit_category → insurance[0].item[0].category.coding[0].code', value: 'benefit_category|insurance[0].item[0].category.coding[0].code|', description: 'Benefit category code' },
						{ name: 'benefit_category_name → insurance[0].item[0].category.coding[0].display', value: 'benefit_category_name|insurance[0].item[0].category.coding[0].display|', description: 'Benefit category display name' },
						{ name: 'benefit_network → insurance[0].item[0].network.coding[0].code', value: 'benefit_network|insurance[0].item[0].network.coding[0].code|', description: 'Network code (in, out)' },

						// Financial Benefits
						{ name: '💰 FINANCIAL BENEFITS', value: '', description: 'Benefit amounts and limits' },
						{ name: 'benefit_type → insurance[0].item[0].benefit[0].type.coding[0].code', value: 'benefit_type|insurance[0].item[0].benefit[0].type.coding[0].code|', description: 'Benefit type (benefit, deductible, copay)' },
						{ name: 'allowed_amount → insurance[0].item[0].benefit[0].allowedMoney.value', value: 'allowed_amount|insurance[0].item[0].benefit[0].allowedMoney.value|', description: 'Allowed monetary amount' },
						{ name: 'allowed_currency → insurance[0].item[0].benefit[0].allowedMoney.currency', value: 'allowed_currency|insurance[0].item[0].benefit[0].allowedMoney.currency|', description: 'Currency code (KES, USD)' },
						{ name: 'used_amount → insurance[0].item[0].benefit[0].usedMoney.value', value: 'used_amount|insurance[0].item[0].benefit[0].usedMoney.value|', description: 'Used monetary amount' },

						// Error Handling
						{ name: '❌ ERROR INFORMATION', value: '', description: 'Error codes and messages' },
						{ name: 'error_code → error[0].code.coding[0].code', value: 'error_code|error[0].code.coding[0].code|', description: 'Error code' },
						{ name: 'error_message → error[0].code.coding[0].display', value: 'error_message|error[0].code.coding[0].display|', description: 'Error message' },
						{ name: 'error_system → error[0].code.coding[0].system', value: 'error_system|error[0].code.coding[0].system|', description: 'Error code system' },

						// Pre-Authorization
						{ name: '✅ PRE-AUTHORIZATION', value: '', description: 'Pre-authorization references' },
						{ name: 'preauth_reference → preAuthRef[0]', value: 'preauth_reference|preAuthRef[0]|', description: 'Pre-authorization reference number' }
					];
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					return [
						{ name: `❌ Error: ${errorMessage}`, value: '', description: 'Failed to load Kenya IG eligibility response mapping guide' }
					];
				}
			},

			async getEligibilityResponseFhirPaths(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					// Core Response Fields
					{ name: 'Status (active, cancelled, draft, entered-in-error)', value: 'status' },
					{ name: 'Outcome (queued, complete, error, partial)', value: 'outcome' },
					{ name: 'Disposition', value: 'disposition' },
					{ name: 'Purpose (auth-requirements, benefits, discovery, validation)', value: 'purpose[0]' },

					// References
					{ name: 'Patient Reference', value: 'patient.reference' },
					{ name: 'Patient Display Name', value: 'patient.display' },
					{ name: 'Insurer Reference', value: 'insurer.reference' },
					{ name: 'Insurer Display Name', value: 'insurer.display' },
					{ name: 'Request Reference', value: 'request.reference' },
					{ name: 'Request Display Name', value: 'request.display' },

					// Dates and Service
					{ name: 'Created Date', value: 'created' },
					{ name: 'Serviced - Date', value: 'servicedDate' },
					{ name: 'Serviced - Period Start', value: 'servicedPeriod.start' },
					{ name: 'Serviced - Period End', value: 'servicedPeriod.end' },

					// Insurance Coverage
					{ name: 'Insurance - Coverage Reference', value: 'insurance[0].coverage.reference' },
					{ name: 'Insurance - Coverage Display', value: 'insurance[0].coverage.display' },
					{ name: 'Insurance - Inforce (boolean)', value: 'insurance[0].inforce' },
					{ name: 'Insurance - Benefit Period Start', value: 'insurance[0].benefitPeriod.start' },
					{ name: 'Insurance - Benefit Period End', value: 'insurance[0].benefitPeriod.end' },

					// Benefit Information (First Item)
					{ name: 'Benefit - Type Code', value: 'insurance[0].item[0].category.coding[0].code' },
					{ name: 'Benefit - Type Display', value: 'insurance[0].item[0].category.coding[0].display' },
					{ name: 'Benefit - Type System', value: 'insurance[0].item[0].category.coding[0].system' },
					{ name: 'Benefit - Network Code', value: 'insurance[0].item[0].network.coding[0].code' },
					{ name: 'Benefit - Network Display', value: 'insurance[0].item[0].network.coding[0].display' },
					{ name: 'Benefit - Term Code', value: 'insurance[0].item[0].term.coding[0].code' },
					{ name: 'Benefit - Term Display', value: 'insurance[0].item[0].term.coding[0].display' },

					// Financial Information
					{ name: 'Benefit - Financial Type Code', value: 'insurance[0].item[0].benefit[0].type.coding[0].code' },
					{ name: 'Benefit - Financial Type Display', value: 'insurance[0].item[0].benefit[0].type.coding[0].display' },
					{ name: 'Benefit - Allowed Unsigned Int', value: 'insurance[0].item[0].benefit[0].allowedUnsignedInt' },
					{ name: 'Benefit - Allowed String', value: 'insurance[0].item[0].benefit[0].allowedString' },
					{ name: 'Benefit - Allowed Money Value', value: 'insurance[0].item[0].benefit[0].allowedMoney.value' },
					{ name: 'Benefit - Allowed Money Currency', value: 'insurance[0].item[0].benefit[0].allowedMoney.currency' },
					{ name: 'Benefit - Used Unsigned Int', value: 'insurance[0].item[0].benefit[0].usedUnsignedInt' },
					{ name: 'Benefit - Used Money Value', value: 'insurance[0].item[0].benefit[0].usedMoney.value' },
					{ name: 'Benefit - Used Money Currency', value: 'insurance[0].item[0].benefit[0].usedMoney.currency' },

					// Error Fields
					{ name: 'Error - Code', value: 'error[0].code.coding[0].code' },
					{ name: 'Error - Display', value: 'error[0].code.coding[0].display' },
					{ name: 'Error - System', value: 'error[0].code.coding[0].system' },

					// Form Information
					{ name: 'Form - Code', value: 'form.coding[0].code' },
					{ name: 'Form - Display', value: 'form.coding[0].display' },
					{ name: 'Form - System', value: 'form.coding[0].system' },

					// Identifiers
					{ name: 'Identifier - Value', value: 'identifier[0].value' },
					{ name: 'Identifier - System', value: 'identifier[0].system' },
					{ name: 'Identifier - Type Text', value: 'identifier[0].type.text' },
					{ name: 'Identifier - Use', value: 'identifier[0].use' },

					// Additional Fields
					{ name: 'Pre-Auth Reference', value: 'preAuthRef[0]' },
				];
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const transformer = new FhirTransformer('eligibilityResponse');

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const inputData = items[itemIndex].json;

				// Get node parameters
				const options = this.getNodeParameter('options', itemIndex, {}) as any;

				// Get user mappings (always in manual mode now)
				const manualMappings = this.getNodeParameter('manualMappings', itemIndex, {}) as any;
				const userMappings = manualMappings.mappingValues || [];

				// Transform the data
				const transformOptions = {
					mode: 'manual',
					includeDetailedMapping: options.includeDetailedMapping || false,
					customId: options.customId || null
				};

				const result = await transformer.transform(inputData, userMappings, transformOptions);

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
					processingMode: 'manual',
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

				// Return error in standard format
				returnData.push({
					json: {
						error: true,
						fhir_resource: null,
						err_message: (error as Error).message,
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
								error: (error as Error).message
							}
						}
					},
					index: itemIndex
				});
			}
		}

		return [returnData];
	}
}