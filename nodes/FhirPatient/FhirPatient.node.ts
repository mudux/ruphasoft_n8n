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
		icon: 'fa:user-md',
		description: 'Transform JSON payload to FHIR Patient resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Patient',
			color: '#2E7D32', // Healthcare green
		},
		inputs: ['main'],
		outputs: ['main'],
		hints: [
			{
				message: '🤖 <strong>Smart FHIR Mapping:</strong> Use auto-detection guidance and manual field mapping to transform your JSON payload into compliant FHIR Patient resources.',
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
								description: 'Enter the field name from your input data (e.g., patient_id, first_name, dob)',
								placeholder: 'patient_id'
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
			async runAutoDetection(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					// Provide Kenya IG-compliant mapping guidance and examples
					return [
						{ name: '🇰🇪 Kenya IG Patient Mapping Guide', value: '', description: 'Auto-detection patterns for Kenya Health Information Exchange' },
						{ name: '📋 Quick Start:', value: '', description: 'Copy the mapping patterns below to your manual fields' },

						// Resource Core
						{ name: '🆔 RESOURCE CORE', value: '', description: 'Patient resource identification' },
						{ name: 'patient_id → id', value: 'patient_id|id|', description: 'Override auto-generated resource ID' },
						{ name: 'active → active', value: 'active|active|', description: 'Patient active status (true/false)' },

						// Kenya HIE Identifiers (Priority)
						{ name: '🏥 KENYA HIE IDENTIFIERS', value: '', description: 'Government and healthcare system IDs' },
						{ name: 'sha_number → identifier[sha_number].value', value: 'sha_number|identifier[sha_number].value|', description: 'SHA Number for Kenya HIE' },
						{ name: 'cr_number → identifier[cr_number].value', value: 'cr_number|identifier[cr_number].value|', description: 'Civil Registration Number' },
						{ name: 'national_id → identifier[national_id].value', value: 'national_id|identifier[national_id].value|', description: 'Kenya National ID' },
						{ name: 'birth_certificate → identifier[birth_certificate].value', value: 'birth_certificate|identifier[birth_certificate].value|', description: 'Birth Certificate Number' },
						{ name: 'passport → identifier[passport].value', value: 'passport|identifier[passport].value|', description: 'Passport Number' },

						// Healthcare Identifiers
						{ name: '🏥 HEALTHCARE IDENTIFIERS', value: '', description: 'Medical and insurance IDs' },
						{ name: 'mrn → identifier[internal].value', value: 'mrn|identifier[internal].value|', description: 'Medical Record Number' },
						{ name: 'insurance_id → identifier[default_insurance_no].value', value: 'insurance_id|identifier[default_insurance_no].value|', description: 'Insurance Member Number' },
						{ name: 'household_number → identifier[household_number].value', value: 'household_number|identifier[household_number].value|', description: 'Household Number' },
						{ name: 'kra_pin → identifier[kra_pin].value', value: 'kra_pin|identifier[kra_pin].value|', description: 'KRA PIN Number' },

						// Demographics
						{ name: '👤 DEMOGRAPHICS', value: '', description: 'Patient demographic information' },
						{ name: 'first_name → name[0].given[0]', value: 'first_name|name[0].given[0]|formatName', description: 'First name with formatting' },
						{ name: 'last_name → name[0].family', value: 'last_name|name[0].family|formatName', description: 'Family name with formatting' },
						{ name: 'middle_name → name[0].given[1]', value: 'middle_name|name[0].given[1]|formatName', description: 'Middle name' },
						{ name: 'full_name → name[0].text', value: 'full_name|name[0].text|', description: 'Full display name' },
						{ name: 'date_of_birth → birthDate', value: 'date_of_birth|birthDate|convertToFhirDate', description: 'Birth date in FHIR format' },
						{ name: 'gender → gender', value: 'gender|gender|normalizeGender', description: 'Gender normalization' },

						// Contact Information
						{ name: '📞 CONTACT INFORMATION', value: '', description: 'Phone, email, and communication' },
						{ name: 'phone → telecom[0].value', value: 'phone|telecom[0].value|formatPhoneNumber', description: 'Primary phone number' },
						{ name: 'mobile → identifier[mobile].value', value: 'mobile|identifier[mobile].value|formatPhoneNumber', description: 'Mobile as identifier' },
						{ name: 'email → telecom[1].value', value: 'email|telecom[1].value|', description: 'Primary email address' },

						// Kenya Address
						{ name: '📍 KENYA ADDRESS', value: '', description: 'Address with Kenya-specific fields' },
						{ name: 'address → address[0].line[0]', value: 'address|address[0].line[0]|', description: 'Primary address line' },
						{ name: 'city → address[0].city', value: 'city|address[0].city|', description: 'City/town' },
						{ name: 'county → address[0].state', value: 'county|address[0].state|', description: 'Kenya county' },
						{ name: 'village_estate → extension[village_estate].valueString', value: 'village_estate|extension[village_estate].valueString|', description: 'Village/estate extension' },

						// Emergency Contact
						{ name: '🚨 EMERGENCY CONTACT', value: '', description: 'Emergency contact person' },
						{ name: 'emergency_contact_name → contact[0].name.text', value: 'emergency_contact_name|contact[0].name.text|', description: 'Emergency contact name' },
						{ name: 'emergency_contact_phone → contact[0].telecom[0].value', value: 'emergency_contact_phone|contact[0].telecom[0].value|formatPhoneNumber', description: 'Emergency contact phone' },
						{ name: 'emergency_contact_relationship → contact[0].relationship[0].text', value: 'emergency_contact_relationship|contact[0].relationship[0].text|', description: 'Relationship to patient' }
					];
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					return [
						{ name: `❌ Error: ${errorMessage}`, value: '', description: 'Failed to load Kenya IG mapping guide' }
					];
				}
			},

			async getPatientFhirPaths(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					// Resource Core
					{ name: 'Resource ID (Override auto-generated)', value: 'id' },
					{ name: 'Active Status', value: 'active' },

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

					// Kenya IG Identifiers - Primary Government IDs
					{ name: 'SHA Number (Kenya HIE)', value: 'identifier[sha_number].value' },
					{ name: 'CR Number (Civil Registration)', value: 'identifier[cr_number].value' },
					{ name: 'National ID (Kenya)', value: 'identifier[national_id].value' },
					{ name: 'Birth Certificate Number', value: 'identifier[birth_certificate].value' },
					{ name: 'Passport Number', value: 'identifier[passport].value' },
					{ name: 'Mamatoto Program ID', value: 'identifier[mamatoto].value' },

					// Kenya IG Identifiers - Healthcare & Insurance
					{ name: 'Medical Record Number (MRN)', value: 'identifier[internal].value' },
					{ name: 'Insurance Member Number', value: 'identifier[default_insurance_no].value' },
					{ name: 'Household Number', value: 'identifier[household_number].value' },
					{ name: 'KRA PIN', value: 'identifier[kra_pin].value' },

					// Kenya IG Identifiers - Contact & System
					{ name: 'Mobile Phone (as identifier)', value: 'identifier[mobile].value' },
					{ name: 'Phone Number (as identifier)', value: 'identifier[phone].value' },
					{ name: 'Email Address (as identifier)', value: 'identifier[email].value' },
					{ name: 'External System ID', value: 'identifier[external_no].value' },
					{ name: 'RUPHAsoft UUID', value: 'identifier[rupha_uuid].value' },

					// Generic Identifier Fields (for custom mappings)
					{ name: 'Identifier[0] - Value', value: 'identifier[0].value' },
					{ name: 'Identifier[0] - System', value: 'identifier[0].system' },
					{ name: 'Identifier[0] - Type Text', value: 'identifier[0].type.text' },
					{ name: 'Identifier[0] - Use', value: 'identifier[0].use' },
					{ name: 'Identifier[1] - Value', value: 'identifier[1].value' },
					{ name: 'Identifier[1] - System', value: 'identifier[1].system' },
					{ name: 'Identifier[2] - Value', value: 'identifier[2].value' },

					// Contact Information
					{ name: 'Phone Number (Primary)', value: 'telecom[0].value' },
					{ name: 'Email Address (Primary)', value: 'telecom[1].value' },
					{ name: 'Telecom[0] - System (phone, email, fax)', value: 'telecom[0].system' },
					{ name: 'Telecom[0] - Use (home, work, mobile)', value: 'telecom[0].use' },
					{ name: 'Telecom[1] - System', value: 'telecom[1].system' },
					{ name: 'Telecom[1] - Use', value: 'telecom[1].use' },

					// Kenya IG Address Extensions
					{ name: 'Address - Line 1', value: 'address[0].line[0]' },
					{ name: 'Address - Line 2', value: 'address[0].line[1]' },
					{ name: 'Address - City', value: 'address[0].city' },
					{ name: 'Address - County (Kenya)', value: 'address[0].state' },
					{ name: 'Address - Postal Code', value: 'address[0].postalCode' },
					{ name: 'Address - Country', value: 'address[0].country' },
					{ name: 'Address - Use (home, work, temp)', value: 'address[0].use' },

					// Kenya IG Extensions
					{ name: 'County Extension', value: 'extension[county].valueString' },
					{ name: 'Village/Estate Extension', value: 'extension[village_estate].valueString' },
					{ name: 'Location Extension', value: 'extension[location].valueString' },
					{ name: 'Biometric Verified Extension', value: 'extension[biometrics_verified].valueBoolean' },

					// Additional Demographics
					{ name: 'Marital Status - Text', value: 'maritalStatus.text' },
					{ name: 'Marital Status - Code', value: 'maritalStatus.coding[0].code' },
					{ name: 'Multiple Birth - Boolean', value: 'multipleBirthBoolean' },
					{ name: 'Multiple Birth - Integer', value: 'multipleBirthInteger' },

					// Contact Person (Emergency Contact)
					{ name: 'Emergency Contact - Name', value: 'contact[0].name.text' },
					{ name: 'Emergency Contact - Relationship', value: 'contact[0].relationship[0].text' },
					{ name: 'Emergency Contact - Phone', value: 'contact[0].telecom[0].value' },
					{ name: 'Emergency Contact - Gender', value: 'contact[0].gender' },

					// Communication Preferences
					{ name: 'Preferred Language - Text', value: 'communication[0].language.text' },
					{ name: 'Preferred Language - Code', value: 'communication[0].language.coding[0].code' },
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