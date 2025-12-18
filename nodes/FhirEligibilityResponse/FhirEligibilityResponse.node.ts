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
		description: 'Transform JSON payload to FHIR CoverageEligibilityResponse resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Eligibility Response',
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
								placeholder: 'eligibility_status',
								description: 'The field name from your input data'
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