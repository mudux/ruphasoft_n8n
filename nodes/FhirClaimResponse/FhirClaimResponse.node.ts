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
		icon: 'file:../../ruphasoft_icon.svg',
		description: 'Transform JSON payload to FHIR ClaimResponse resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Claim Response',
			color: '#2E7D32', // Healthcare green
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Processing Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Auto-Detection Only',
						value: 'auto',
						description: 'Use automatic field detection without manual overrides'
					},
					{
						name: 'Manual Override',
						value: 'manual',
						description: 'Configure custom field mappings'
					},
					{
						name: 'Template Mode',
						value: 'template',
						description: 'Use pre-configured mapping template'
					}
				],
				default: 'auto',
				description: 'Choose how to handle field mapping'
			},
			{
				displayName: 'Manual Mappings',
				name: 'manualMappings',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						mode: ['manual']
					}
				},
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
								placeholder: 'claim_id',
								description: 'The field name from your input data'
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
				const mode = this.getNodeParameter('mode', itemIndex) as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as any;

				// Prepare user mappings for manual override mode
				let userMappings = null;
				if (mode === 'manual') {
					const manualMappings = this.getNodeParameter('manualMappings', itemIndex, {}) as any;
					userMappings = manualMappings.mappingValues || [];
				}

				// Transform the data
				const transformOptions = {
					mode: mode,
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
					processingMode: mode,
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