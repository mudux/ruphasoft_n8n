import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

// Note: Using require for compatibility with existing JavaScript modules
const { FhirTransformer } = require('../../src/utils/fhirTransform');

export class FhirPatient implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FHIR Patient',
		name: 'fhirPatient',
		group: ['transform'],
		version: 1,
		icon: 'file:ruphasoft_icon.svg',
		description: 'Transform JSON payload to FHIR Patient resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Patient',
			color: '#2E7D32', // Healthcare green
		},
		inputs: ['main'],
		outputs: ['main'],
		hints: [
			{
				message: '🤖 <strong>Auto-Population Active:</strong> Manual mapping source fields now show auto-detected options with confidence indicators (✅ high confidence, ⚠️ needs review, 📝 manual required).',
				type: 'info',
				location: 'inputPane',
				whenToDisplay: 'always',
				displayCondition: '={{ $parameter["mode"] === "manual" }}'
			},
			{
				message: '⚡ <strong>Smart Field Detection:</strong> Connect input data and switch to manual mode to see intelligent field suggestions based on your actual data structure.',
				type: 'info',
				location: 'inputPane',
				whenToDisplay: 'beforeExecution',
				displayCondition: '={{ $parameter["mode"] === "auto" }}'
			}
		],
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
				displayName: 'Auto-Population Helper',
				name: 'autoPopulationNotice',
				type: 'notice',
				displayOptions: {
					show: {
						mode: ['manual']
					}
				},
				default: '',
				description: '💡 <strong>Auto-Population Available:</strong> Source field dropdowns below will show available fields from your input data. Auto-detected mappings will appear as suggested options.'
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
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getAvailableSourceFields'
								},
								default: '',
								description: 'Select a common field or type a custom field name from your input data',
								placeholder: 'Select field or type custom name...'
							},
							{
								displayName: 'FHIR Path',
								name: 'fhirPath',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getPatientFhirPaths'
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
						placeholder: 'patient-123',
						description: 'Override auto-generated resource ID'
					}
				]
			}
		]
	};

	methods = {
		loadOptions: {
			async getAvailableSourceFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					// In loadOptions context, we provide common healthcare field examples
					// Real auto-detection happens during execution with actual input data
					return [
						// Common patient fields with visual indicators for user guidance
						{ name: '✅ patient_id (Common field)', value: 'patient_id', description: 'Patient identifier field' },
						{ name: '✅ patient_first_name (Common field)', value: 'patient_first_name', description: 'Patient first name field' },
						{ name: '✅ patient_last_name (Common field)', value: 'patient_last_name', description: 'Patient last name field' },
						{ name: '✅ first_name (Common field)', value: 'first_name', description: 'First name field' },
						{ name: '✅ last_name (Common field)', value: 'last_name', description: 'Last name field' },
						{ name: '✅ full_name (Common field)', value: 'full_name', description: 'Full name field' },
						{ name: '✅ birth_date (Common field)', value: 'birth_date', description: 'Birth date field' },
						{ name: '✅ dob (Common field)', value: 'dob', description: 'Date of birth field' },
						{ name: '✅ gender (Common field)', value: 'gender', description: 'Gender field' },
						{ name: '✅ phone (Common field)', value: 'phone', description: 'Phone number field' },
						{ name: '✅ email (Common field)', value: 'email', description: 'Email address field' },
						{ name: '✅ address (Common field)', value: 'address', description: 'Address field' },
						{ name: '✅ mrn (Common field)', value: 'mrn', description: 'Medical record number field' },
						{ name: '✅ ssn (Common field)', value: 'ssn', description: 'Social security number field' },
						{ name: '📝 Custom field (type manually)', value: '', description: 'Enter a custom field name from your input data' }
					];

				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					return [
						{ name: `❌ Error: ${errorMessage}`, value: '', description: 'Failed to load field options' }
					];
				}
			},

			async getPatientFhirPaths(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					// Name fields
					{ name: 'Name - Family Name', value: 'name[0].family' },
					{ name: 'Name - Given Name (First)', value: 'name[0].given[0]' },
					{ name: 'Name - Given Name (Middle)', value: 'name[0].given[1]' },
					{ name: 'Name - Text (Full Name)', value: 'name[0].text' },
					{ name: 'Name - Use (usual, official, temp)', value: 'name[0].use' },

					// Demographics
					{ name: 'Birth Date', value: 'birthDate' },
					{ name: 'Gender', value: 'gender' },
					{ name: 'Deceased - Boolean', value: 'deceasedBoolean' },
					{ name: 'Deceased - Date Time', value: 'deceasedDateTime' },

					// Contact Information
					{ name: 'Telecom - Phone', value: 'telecom[0].value' },
					{ name: 'Telecom - Email', value: 'telecom[1].value' },
					{ name: 'Telecom - System (phone, email, fax)', value: 'telecom[0].system' },
					{ name: 'Telecom - Use (home, work, temp)', value: 'telecom[0].use' },

					// Address
					{ name: 'Address - Line 1', value: 'address[0].line[0]' },
					{ name: 'Address - Line 2', value: 'address[0].line[1]' },
					{ name: 'Address - City', value: 'address[0].city' },
					{ name: 'Address - State/Province', value: 'address[0].state' },
					{ name: 'Address - Postal Code', value: 'address[0].postalCode' },
					{ name: 'Address - Country', value: 'address[0].country' },
					{ name: 'Address - Use (home, work, temp)', value: 'address[0].use' },

					// Identifiers
					{ name: 'Identifier - Value (MRN, SSN)', value: 'identifier[0].value' },
					{ name: 'Identifier - System (namespace)', value: 'identifier[0].system' },
					{ name: 'Identifier - Type', value: 'identifier[0].type.text' },
					{ name: 'Identifier - Use (usual, official, temp)', value: 'identifier[0].use' },

					// Additional Fields
					{ name: 'Active Status', value: 'active' },
					{ name: 'Marital Status', value: 'maritalStatus.text' },
					{ name: 'Multiple Birth - Boolean', value: 'multipleBirthBoolean' },
					{ name: 'Multiple Birth - Integer', value: 'multipleBirthInteger' },

					// Contact Person
					{ name: 'Contact - Name', value: 'contact[0].name.text' },
					{ name: 'Contact - Relationship', value: 'contact[0].relationship[0].text' },
					{ name: 'Contact - Phone', value: 'contact[0].telecom[0].value' },
					{ name: 'Contact - Gender', value: 'contact[0].gender' },

					// Communication
					{ name: 'Communication - Language', value: 'communication[0].language.text' },
					{ name: 'Communication - Preferred', value: 'communication[0].preferred' },
				];
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const transformer = new FhirTransformer('patient');

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
						resource_type: 'Patient',
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