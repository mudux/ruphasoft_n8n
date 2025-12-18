import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const { FhirTransformer } = require('../../src/utils/fhirTransform');

export class FhirAppointment implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FHIR Appointment',
		name: 'fhirAppointment',
		group: ['transform'],
		version: 1,
		description: 'Transform JSON payload to FHIR Appointment resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Appointment',
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
								placeholder: 'appointment_datetime',
								description: 'The field name from your input data'
							},
							{
								displayName: 'FHIR Path',
								name: 'fhirPath',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getAppointmentFhirPaths'
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
						placeholder: 'appointment-123',
						description: 'Override auto-generated resource ID'
					}
				]
			}
		]
	};

	methods = {
		loadOptions: {
			async getAppointmentFhirPaths(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					// Appointment Identification
					{ name: 'Resource ID', value: 'id' },
					{ name: 'Status', value: 'status' },
					{ name: 'Service Category', value: 'serviceCategory[0].text' },
					{ name: 'Service Type', value: 'serviceType[0].text' },
					{ name: 'Appointment Type', value: 'appointmentType.text' },

					// Scheduling
					{ name: 'Start Date/Time', value: 'start' },
					{ name: 'End Date/Time', value: 'end' },
					{ name: 'Minutes Duration', value: 'minutesDuration' },
					{ name: 'Created Date', value: 'created' },

					// Priority and Description
					{ name: 'Priority', value: 'priority' },
					{ name: 'Description', value: 'description' },
					{ name: 'Comment', value: 'comment' },

					// Patient Reference
					{ name: 'Patient Reference', value: 'participant[0].actor.reference' },
					{ name: 'Patient Display', value: 'participant[0].actor.display' },
					{ name: 'Patient Status', value: 'participant[0].status' },
					{ name: 'Patient Required', value: 'participant[0].required' },

					// Practitioner Reference
					{ name: 'Practitioner Reference', value: 'participant[1].actor.reference' },
					{ name: 'Practitioner Display', value: 'participant[1].actor.display' },
					{ name: 'Practitioner Status', value: 'participant[1].status' },

					// Location
					{ name: 'Location Reference', value: 'participant[2].actor.reference' },
					{ name: 'Location Display', value: 'participant[2].actor.display' },

					// Reason and Supporting Information
					{ name: 'Reason Code Text', value: 'reasonCode[0].text' },
					{ name: 'Reason Reference', value: 'reasonReference[0].reference' },
					{ name: 'Supporting Information', value: 'supportingInformation[0].reference' },

					// Identifiers
					{ name: 'Identifier - Value', value: 'identifier[0].value' },
					{ name: 'Identifier - System', value: 'identifier[0].system' },
					{ name: 'Identifier - Use', value: 'identifier[0].use' },

					// Cancellation
					{ name: 'Cancellation Reason', value: 'cancelationReason.text' },

					// Specialty
					{ name: 'Specialty', value: 'specialty[0].text' },

					// Slot Reference
					{ name: 'Slot Reference', value: 'slot[0].reference' },

					// Request Priority
					{ name: 'Requested Period Start', value: 'requestedPeriod[0].start' },
					{ name: 'Requested Period End', value: 'requestedPeriod[0].end' },
				];
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const transformer = new FhirTransformer('appointment');

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
						resource_type: 'Appointment',
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