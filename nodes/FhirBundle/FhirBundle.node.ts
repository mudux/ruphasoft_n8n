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
		icon: 'fa:archive',
		description: 'Transform JSON payload to FHIR Bundle resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Bundle',
			color: '#2E7D32', // Healthcare green
		},
		inputs: ['main'],
		outputs: ['main'],
		hints: [
			{
				message: '🤖 <strong>Smart FHIR Mapping:</strong> Use auto-detection guidance and manual field mapping to transform your JSON payload into compliant FHIR Bundle resources.',
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
							sourceField: 'bundle_type',
							fhirPath: 'type',
							transformation: '',
							action: 'override'
						},
						{
							sourceField: 'resources',
							fhirPath: 'entry',
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
								description: 'Enter the field name from your input data (e.g., bundle_type, entries, timestamp)',
								placeholder: 'bundle_type'
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
			async runAutoDetection(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					// Provide Kenya IG-compliant bundle mapping guidance and examples
					return [
						{ name: '🇰🇪 Kenya IG Bundle Mapping Guide', value: '', description: 'Auto-detection patterns for Kenya Health Information Exchange bundles' },
						{ name: '📋 Quick Start:', value: '', description: 'Copy the mapping patterns below to your manual fields' },

						// Resource Core
						{ name: '🆔 RESOURCE CORE', value: '', description: 'Bundle resource identification' },
						{ name: 'bundle_id → id', value: 'bundle_id|id|', description: 'Override auto-generated resource ID' },
						{ name: 'bundle_type → type', value: 'bundle_type|type|', description: 'Bundle type (document, message, transaction, batch, collection)' },

						// Bundle Metadata
						{ name: '📊 BUNDLE METADATA', value: '', description: 'Bundle-level information' },
						{ name: 'timestamp → timestamp', value: 'timestamp|timestamp|convertToFhirDate', description: 'Bundle creation timestamp' },
						{ name: 'total → total', value: 'total|total|', description: 'Total number of matches (for search bundles)' },

						// Bundle Identifiers
						{ name: '🏥 BUNDLE IDENTIFIERS', value: '', description: 'Bundle identification for HIE' },
						{ name: 'bundle_identifier → identifier.value', value: 'bundle_identifier|identifier.value|', description: 'Bundle identifier value' },
						{ name: 'bundle_system → identifier.system', value: 'bundle_system|identifier.system|', description: 'Bundle identifier system' },

						// Entry Management
						{ name: '📦 ENTRY MANAGEMENT', value: '', description: 'Bundle entry configuration' },
						{ name: 'entry_count → total', value: 'entry_count|total|', description: 'Number of entries in bundle' },
						{ name: 'entry_url_0 → entry[0].fullUrl', value: 'entry_url_0|entry[0].fullUrl|', description: 'First entry full URL' },
						{ name: 'entry_resource_type_0 → entry[0].resource.resourceType', value: 'entry_resource_type_0|entry[0].resource.resourceType|', description: 'First entry resource type' },
						{ name: 'entry_resource_id_0 → entry[0].resource.id', value: 'entry_resource_id_0|entry[0].resource.id|', description: 'First entry resource ID' },

						// Transaction/Batch Operations
						{ name: '🔄 TRANSACTION OPERATIONS', value: '', description: 'For transaction/batch bundles' },
						{ name: 'entry_request_method_0 → entry[0].request.method', value: 'entry_request_method_0|entry[0].request.method|', description: 'HTTP method (POST, PUT, GET, DELETE)' },
						{ name: 'entry_request_url_0 → entry[0].request.url', value: 'entry_request_url_0|entry[0].request.url|', description: 'Request URL' },
						{ name: 'entry_response_status_0 → entry[0].response.status', value: 'entry_response_status_0|entry[0].response.status|', description: 'Response status' },
						{ name: 'entry_response_location_0 → entry[0].response.location', value: 'entry_response_location_0|entry[0].response.location|', description: 'Response location header' },

						// Search Results
						{ name: '🔍 SEARCH RESULTS', value: '', description: 'For search result bundles' },
						{ name: 'entry_search_mode_0 → entry[0].search.mode', value: 'entry_search_mode_0|entry[0].search.mode|', description: 'Search mode (match, include, outcome)' },
						{ name: 'entry_search_score_0 → entry[0].search.score', value: 'entry_search_score_0|entry[0].search.score|', description: 'Search relevance score' },

						// Bundle Links
						{ name: '🔗 PAGINATION LINKS', value: '', description: 'Bundle pagination and navigation' },
						{ name: 'link_relation_0 → link[0].relation', value: 'link_relation_0|link[0].relation|', description: 'Link relation (self, next, prev, first, last)' },
						{ name: 'link_url_0 → link[0].url', value: 'link_url_0|link[0].url|', description: 'Link URL' },
						{ name: 'next_page → link[next].url', value: 'next_page|link[1].url|', description: 'Next page URL for pagination' },

						// Metadata and Context
						{ name: '📋 META INFORMATION', value: '', description: 'Bundle metadata' },
						{ name: 'version_id → meta.versionId', value: 'version_id|meta.versionId|', description: 'Bundle version ID' },
						{ name: 'last_updated → meta.lastUpdated', value: 'last_updated|meta.lastUpdated|convertToFhirDate', description: 'Last updated timestamp' },
						{ name: 'source → meta.source', value: 'source|meta.source|', description: 'Bundle source system' },
						{ name: 'profile → meta.profile[0]', value: 'profile|meta.profile[0]|', description: 'Bundle profile URL' },

						// Signature (for document bundles)
						{ name: '✍️ DIGITAL SIGNATURE', value: '', description: 'Document bundle signatures' },
						{ name: 'signature_type → signature.type[0].code', value: 'signature_type|signature.type[0].code|', description: 'Signature type code' },
						{ name: 'signature_when → signature.when', value: 'signature_when|signature.when|convertToFhirDate', description: 'When signed' },
						{ name: 'signature_who → signature.who.reference', value: 'signature_who|signature.who.reference|', description: 'Who signed (reference)' },
						{ name: 'signature_data → signature.data', value: 'signature_data|signature.data|', description: 'Base64 signature data' }
					];
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					return [
						{ name: `❌ Error: ${errorMessage}`, value: '', description: 'Failed to load Kenya IG bundle mapping guide' }
					];
				}
			},

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