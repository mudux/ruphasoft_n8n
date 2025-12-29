import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const { FhirTransformer } = require('../../src/utils/fhirTransform');

export class FhirClaimResponse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FHIR Claim Response',
		name: 'fhirClaimResponse',
		group: ['transform'],
		version: 1,
		icon: 'fa:file-medical',
		description: 'Transform JSON payload to FHIR ClaimResponse resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Claim Response',
			color: '#2E7D32', // Healthcare green
		},
		inputs: ['main'],
		outputs: ['main'],
		hints: [
			{
				message: '🤖 <strong>Smart FHIR Mapping:</strong> Use auto-detection guidance and manual field mapping to transform your JSON payload into compliant FHIR ClaimResponse resources.',
				type: 'info',
				location: 'inputPane',
				whenToDisplay: 'always'
			}
		],
		properties: [
			{
				displayName: 'Mandatory Fields Pre-Populated',
				name: 'mandatoryFieldsNotice',
				type: 'notice',
				default: '',
				description: 'ℹ️ <strong>Mandatory FHIR fields are pre-populated with common mappings.</strong> You can modify, remove, or add mappings as needed. Adjust source field names to match your input data structure.'
			},
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
				default: {
					mappingValues: [
						{
							sourceField: 'claim_response_status',
							fhirPath: 'status',
							transformation: '',
							action: 'override'
						},
						{
							sourceField: 'claim_type',
							fhirPath: 'type',
							transformation: '',
							action: 'override'
						},
						{
							sourceField: 'claim_use',
							fhirPath: 'use',
							transformation: '',
							action: 'override'
						},
						{
							sourceField: 'patient_id',
							fhirPath: 'patient.reference',
							transformation: '',
							action: 'override'
						},
						{
							sourceField: 'created_date',
							fhirPath: 'created',
							transformation: 'convertToFhirDate',
							action: 'override'
						},
						{
							sourceField: 'insurer_name',
							fhirPath: 'insurer.reference',
							transformation: '',
							action: 'override'
						},
						{
							sourceField: 'outcome_code',
							fhirPath: 'outcome',
							transformation: '',
							action: 'override'
						}
					]
				},
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
								description: 'Enter the field name from your input data (e.g., claim_id, status, total_amount)',
								placeholder: 'claim_id'
							},
							{
								displayName: 'FHIR Path',
								name: 'fhirPath',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getClaimResponseFhirPaths'
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
						placeholder: 'claim-response-123',
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
					// Provide Kenya IG-compliant claim response mapping guidance and examples
					return [
						{ name: '🇰🇪 Kenya IG ClaimResponse Mapping Guide', value: '', description: 'Auto-detection patterns for Kenya Health Information Exchange claim responses' },
						{ name: '📋 Quick Start:', value: '', description: 'Copy the mapping patterns below to your manual fields' },

						// Resource Core
						{ name: '🆔 RESOURCE CORE', value: '', description: 'ClaimResponse resource identification' },
						{ name: 'claim_response_id → id', value: 'claim_response_id|id|', description: 'Override auto-generated resource ID' },
						{ name: 'status → status', value: 'status|status|', description: 'Claim response status (active, cancelled, draft, entered-in-error)' },
						{ name: 'outcome → outcome', value: 'outcome|outcome|', description: 'Processing outcome (queued, complete, error, partial)' },

						// Claim References
						{ name: '📄 CLAIM REFERENCES', value: '', description: 'Original claim information' },
						{ name: 'claim_id → request.reference', value: 'claim_id|request.reference|', description: 'Original claim reference (Claim/id)' },
						{ name: 'claim_display → request.display', value: 'claim_display|request.display|', description: 'Original claim display name' },
						{ name: 'requestor_id → requestor.reference', value: 'requestor_id|requestor.reference|', description: 'Requestor reference (Practitioner/id)' },

						// Patient and Insurer
						{ name: '👤 PATIENT & INSURER', value: '', description: 'Patient and insurance information' },
						{ name: 'patient_id → patient.reference', value: 'patient_id|patient.reference|', description: 'Patient reference (Patient/id)' },
						{ name: 'patient_name → patient.display', value: 'patient_name|patient.display|', description: 'Patient display name' },
						{ name: 'insurer_id → insurer.reference', value: 'insurer_id|insurer.reference|', description: 'Insurer reference (Organization/id)' },
						{ name: 'insurer_name → insurer.display', value: 'insurer_name|insurer.display|', description: 'Insurer display name' },

						// Processing Information
						{ name: '⚙️ PROCESSING INFO', value: '', description: 'Claim processing details' },
						{ name: 'created_date → created', value: 'created_date|created|convertToFhirDate', description: 'Response creation date' },
						{ name: 'use → use', value: 'use|use|', description: 'Use code (claim, preauthorization, predetermination)' },
						{ name: 'disposition → disposition', value: 'disposition|disposition|', description: 'Processing disposition text' },

						// Identifiers
						{ name: '🏥 IDENTIFIERS', value: '', description: 'Claim response identifiers' },
						{ name: 'response_identifier → identifier[0].value', value: 'response_identifier|identifier[0].value|', description: 'Response identifier value' },
						{ name: 'response_system → identifier[0].system', value: 'response_system|identifier[0].system|', description: 'Response identifier system' },
						{ name: 'response_use → identifier[0].use', value: 'response_use|identifier[0].use|', description: 'Identifier use (usual, official, temp)' },

						// Financial Information
						{ name: '💰 FINANCIAL DETAILS', value: '', description: 'Payment and adjudication amounts' },
						{ name: 'payment_amount → payment.amount.value', value: 'payment_amount|payment.amount.value|', description: 'Payment amount value' },
						{ name: 'payment_currency → payment.amount.currency', value: 'payment_currency|payment.amount.currency|', description: 'Payment currency code (KES, USD)' },
						{ name: 'payment_date → payment.date', value: 'payment_date|payment.date|convertToFhirDate', description: 'Payment date' },
						{ name: 'payment_type → payment.type.coding[0].code', value: 'payment_type|payment.type.coding[0].code|', description: 'Payment type code' },
						{ name: 'payment_identifier → payment.identifier.value', value: 'payment_identifier|payment.identifier.value|', description: 'Payment identifier' },

						// Item Adjudication
						{ name: '📋 ITEM ADJUDICATION', value: '', description: 'Individual item processing results' },
						{ name: 'item_sequence → item[0].itemSequence', value: 'item_sequence|item[0].itemSequence|', description: 'Item sequence number from claim' },
						{ name: 'adjudication_category → item[0].adjudication[0].category.coding[0].code', value: 'adjudication_category|item[0].adjudication[0].category.coding[0].code|', description: 'Adjudication category code' },
						{ name: 'adjudication_amount → item[0].adjudication[0].amount.value', value: 'adjudication_amount|item[0].adjudication[0].amount.value|', description: 'Adjudicated amount' },
						{ name: 'adjudication_currency → item[0].adjudication[0].amount.currency', value: 'adjudication_currency|item[0].adjudication[0].amount.currency|', description: 'Adjudication currency' },

						// Total Amounts
						{ name: '💵 TOTAL AMOUNTS', value: '', description: 'Summary financial information' },
						{ name: 'total_submitted → total[0].amount.value', value: 'total_submitted|total[0].amount.value|', description: 'Total submitted amount' },
						{ name: 'total_category → total[0].category.coding[0].code', value: 'total_category|total[0].category.coding[0].code|', description: 'Total category code (submitted, eligible, benefit)' },
						{ name: 'total_currency → total[0].amount.currency', value: 'total_currency|total[0].amount.currency|', description: 'Total amount currency' },

						// Pre-Authorization
						{ name: '🔑 PRE-AUTHORIZATION', value: '', description: 'Authorization information' },
						{ name: 'preauth_ref → preAuthRef', value: 'preauth_ref|preAuthRef|', description: 'Pre-authorization reference number' },
						{ name: 'preauth_period_start → preAuthPeriod.start', value: 'preauth_period_start|preAuthPeriod.start|convertToFhirDate', description: 'Pre-auth validity start' },
						{ name: 'preauth_period_end → preAuthPeriod.end', value: 'preauth_period_end|preAuthPeriod.end|convertToFhirDate', description: 'Pre-auth validity end' },

						// Insurance Coverage
						{ name: '🛡️ INSURANCE COVERAGE', value: '', description: 'Insurance plan details' },
						{ name: 'insurance_sequence → insurance[0].sequence', value: 'insurance_sequence|insurance[0].sequence|', description: 'Insurance sequence number' },
						{ name: 'insurance_focal → insurance[0].focal', value: 'insurance_focal|insurance[0].focal|', description: 'Primary coverage indicator' },
						{ name: 'coverage_reference → insurance[0].coverage.reference', value: 'coverage_reference|insurance[0].coverage.reference|', description: 'Coverage reference (Coverage/id)' },
						{ name: 'coverage_display → insurance[0].coverage.display', value: 'coverage_display|insurance[0].coverage.display|', description: 'Coverage display name' },

						// Error Information
						{ name: '❌ ERROR HANDLING', value: '', description: 'Error and rejection details' },
						{ name: 'error_code → error[0].code.coding[0].code', value: 'error_code|error[0].code.coding[0].code|', description: 'Error code' },
						{ name: 'error_text → error[0].code.text', value: 'error_text|error[0].code.text|', description: 'Error description text' },
						{ name: 'error_item_sequence → error[0].itemSequence', value: 'error_item_sequence|error[0].itemSequence|', description: 'Item sequence with error' },

						// Processing Notes
						{ name: '📝 PROCESSING NOTES', value: '', description: 'Additional processing information' },
						{ name: 'process_note → processNote[0].text', value: 'process_note|processNote[0].text|', description: 'Processing note text' },
						{ name: 'note_type → processNote[0].type', value: 'note_type|processNote[0].type|', description: 'Note type (display, print, printoper)' },
						{ name: 'note_number → processNote[0].number', value: 'note_number|processNote[0].number|', description: 'Note sequence number' }
					];
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					return [
						{ name: `❌ Error: ${errorMessage}`, value: '', description: 'Failed to load Kenya IG claim response mapping guide' }
					];
				}
			},

			async getClaimResponseFhirPaths(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					// Core Status and Outcome
					{ name: 'Status', value: 'status' },
					{ name: 'Outcome', value: 'outcome' },
					{ name: 'Disposition', value: 'disposition' },
					{ name: 'Use (claim, preauthorization, predetermination)', value: 'use' },
					{ name: 'Type', value: 'type.coding[0].code' },
					{ name: 'Type - Text', value: 'type.text' },

					// References
					{ name: 'Patient Reference', value: 'patient.reference' },
					{ name: 'Patient Display', value: 'patient.display' },
					{ name: 'Insurer Reference', value: 'insurer.reference' },
					{ name: 'Insurer Display', value: 'insurer.display' },
					{ name: 'Request Reference (Original Claim)', value: 'request.reference' },
					{ name: 'Requestor Reference', value: 'requestor.reference' },

					// Dates
					{ name: 'Created Date', value: 'created' },

					// Identifiers
					{ name: 'Identifier - Value', value: 'identifier[0].value' },
					{ name: 'Identifier - System', value: 'identifier[0].system' },
					{ name: 'Identifier - Use', value: 'identifier[0].use' },

					// Pre-Authorization
					{ name: 'Pre-Auth Reference', value: 'preAuthRef' },
					{ name: 'Pre-Auth Period - Start', value: 'preAuthPeriod.start' },
					{ name: 'Pre-Auth Period - End', value: 'preAuthPeriod.end' },

					// Payment Information
					{ name: 'Payment - Type', value: 'payment.type.coding[0].code' },
					{ name: 'Payment - Amount Value', value: 'payment.amount.value' },
					{ name: 'Payment - Amount Currency', value: 'payment.amount.currency' },
					{ name: 'Payment - Date', value: 'payment.date' },
					{ name: 'Payment - Identifier', value: 'payment.identifier.value' },

					// Item Details
					{ name: 'Item - Sequence', value: 'item[0].itemSequence' },
					{ name: 'Item - Adjudication Category', value: 'item[0].adjudication[0].category.coding[0].code' },
					{ name: 'Item - Adjudication Amount', value: 'item[0].adjudication[0].amount.value' },
					{ name: 'Item - Adjudication Amount Currency', value: 'item[0].adjudication[0].amount.currency' },
					{ name: 'Item - Adjudication Value', value: 'item[0].adjudication[0].value' },
					{ name: 'Item - Note Text', value: 'item[0].noteNumber[0]' },

					// Total Amounts
					{ name: 'Total - Category Code', value: 'total[0].category.coding[0].code' },
					{ name: 'Total - Category Text', value: 'total[0].category.text' },
					{ name: 'Total - Amount Value', value: 'total[0].amount.value' },
					{ name: 'Total - Amount Currency', value: 'total[0].amount.currency' },

					// Add Adjudication Item (Header Level)
					{ name: 'Add Item - Sequence', value: 'addItem[0].itemSequence[0]' },
					{ name: 'Add Item - Provider Reference', value: 'addItem[0].provider[0].reference' },
					{ name: 'Add Item - Product/Service Code', value: 'addItem[0].productOrService.coding[0].code' },
					{ name: 'Add Item - Modifier Code', value: 'addItem[0].modifier[0].coding[0].code' },

					// Error Information
					{ name: 'Error - Code', value: 'error[0].code.coding[0].code' },
					{ name: 'Error - Code Text', value: 'error[0].code.text' },
					{ name: 'Error - Item Sequence', value: 'error[0].itemSequence' },
					{ name: 'Error - Detail Sequence', value: 'error[0].detailSequence' },

					// Processing Notes
					{ name: 'Process Note - Number', value: 'processNote[0].number' },
					{ name: 'Process Note - Type', value: 'processNote[0].type' },
					{ name: 'Process Note - Text', value: 'processNote[0].text' },
					{ name: 'Process Note - Language', value: 'processNote[0].language.coding[0].code' },

					// Insurance Coverage
					{ name: 'Insurance - Sequence', value: 'insurance[0].sequence' },
					{ name: 'Insurance - Focal', value: 'insurance[0].focal' },
					{ name: 'Insurance - Coverage Reference', value: 'insurance[0].coverage.reference' },
					{ name: 'Insurance - Coverage Display', value: 'insurance[0].coverage.display' },
					{ name: 'Insurance - Business Arrangement', value: 'insurance[0].businessArrangement' },
					{ name: 'Insurance - Claim Response Reference', value: 'insurance[0].claimResponse.reference' },

					// Form Information
					{ name: 'Form Code', value: 'formCode.coding[0].code' },
					{ name: 'Form Code Text', value: 'formCode.text' },

					// Communication Request
					{ name: 'Communication Request Reference', value: 'communicationRequest[0].reference' },

					// Funds Reserve
					{ name: 'Funds Reserve Code', value: 'fundsReserve.coding[0].code' },
					{ name: 'Funds Reserve Text', value: 'fundsReserve.text' },

					// Subrogation
					{ name: 'Subrogation', value: 'subrogation' }
				];
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const transformer = new FhirTransformer('claimResponse');

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