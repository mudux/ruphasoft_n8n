import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const { FhirTransformer } = require('../../src/utils/fhirTransform');

export class FhirBundle implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FHIR Bundle',
		name: 'fhirBundle',
		group: ['transform'],
		version: 1,
		description: 'Transform JSON payload to FHIR Bundle resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Bundle',
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
								placeholder: 'bundle_type',
								description: 'The field name from your input data'
							},
							{
								displayName: 'FHIR Path',
								name: 'fhirPath',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getBundleFhirPaths'
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
						placeholder: 'bundle-123',
						description: 'Override auto-generated resource ID'
					}
				]
			}
		]
	};

	methods = {
		loadOptions: {
			async getBundleFhirPaths(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					// Bundle Core Fields
					{ name: 'Bundle Type (document, message, transaction, etc.)', value: 'type' },
					{ name: 'Bundle Identifier - Value', value: 'identifier.value' },
					{ name: 'Bundle Identifier - System', value: 'identifier.system' },
					{ name: 'Timestamp', value: 'timestamp' },
					{ name: 'Total (Total number of matches)', value: 'total' },

					// Entry Fields
					{ name: 'Entry - Full URL', value: 'entry[0].fullUrl' },
					{ name: 'Entry - Resource Type', value: 'entry[0].resource.resourceType' },
					{ name: 'Entry - Resource ID', value: 'entry[0].resource.id' },
					{ name: 'Entry - Request Method', value: 'entry[0].request.method' },
					{ name: 'Entry - Request URL', value: 'entry[0].request.url' },
					{ name: 'Entry - Response Status', value: 'entry[0].response.status' },
					{ name: 'Entry - Response Location', value: 'entry[0].response.location' },
					{ name: 'Entry - Search Mode', value: 'entry[0].search.mode' },
					{ name: 'Entry - Search Score', value: 'entry[0].search.score' },

					// Link Fields
					{ name: 'Link - Relation', value: 'link[0].relation' },
					{ name: 'Link - URL', value: 'link[0].url' },

					// Meta Fields
					{ name: 'Meta - Version ID', value: 'meta.versionId' },
					{ name: 'Meta - Last Updated', value: 'meta.lastUpdated' },
					{ name: 'Meta - Source', value: 'meta.source' },
					{ name: 'Meta - Profile', value: 'meta.profile[0]' },
					{ name: 'Meta - Security', value: 'meta.security[0].code' },
					{ name: 'Meta - Tag', value: 'meta.tag[0].code' },

					// Signature Fields
					{ name: 'Signature - Type', value: 'signature.type[0].code' },
					{ name: 'Signature - When', value: 'signature.when' },
					{ name: 'Signature - Who Reference', value: 'signature.who.reference' },
					{ name: 'Signature - Data', value: 'signature.data' },
				];
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const transformer = new FhirTransformer('bundle');

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