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
		icon: 'fa:calendar-check',
		description: 'Transform JSON payload to FHIR Appointment resource with intelligent field mapping',
		defaults: {
			name: 'FHIR Appointment',
			color: '#2E7D32', // Healthcare green
		},
		inputs: ['main'],
		outputs: ['main'],
		hints: [
			{
				message: '🤖 <strong>Smart FHIR Mapping:</strong> Use auto-detection guidance and manual field mapping to transform your JSON payload into compliant FHIR Appointment resources.',
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
								description: 'Enter the field name from your input data (e.g., appointment_datetime, patient_id, provider_name)',
								placeholder: 'appointment_datetime'
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
			async runAutoDetection(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					// Provide Kenya IG-compliant appointment mapping guidance and examples
					return [
						{ name: '🇰🇪 Kenya IG Appointment Mapping Guide', value: '', description: 'Auto-detection patterns for Kenya Health Information Exchange appointments' },
						{ name: '📋 Quick Start:', value: '', description: 'Copy the mapping patterns below to your manual fields' },

						// Resource Core
						{ name: '🆔 RESOURCE CORE', value: '', description: 'Appointment resource identification' },
						{ name: 'appointment_id → id', value: 'appointment_id|id|', description: 'Override auto-generated resource ID' },
						{ name: 'status → status', value: 'status|status|', description: 'Appointment status (proposed, pending, booked, arrived, fulfilled, cancelled)' },

						// Kenya HIE Identifiers
						{ name: '🏥 KENYA HIE IDENTIFIERS', value: '', description: 'Healthcare system appointment IDs' },
						{ name: 'fhir_appointment_id → identifier[fhir_resource].value', value: 'fhir_appointment_id|identifier[fhir_resource].value|', description: 'FHIR resource identifier' },
						{ name: 'internal_appointment_id → identifier[internal].value', value: 'internal_appointment_id|identifier[internal].value|', description: 'Internal system appointment ID' },

						// Scheduling Details
						{ name: '📅 SCHEDULING', value: '', description: 'Date, time and duration information' },
						{ name: 'appointment_datetime → start', value: 'appointment_datetime|start|convertToFhirDate', description: 'Appointment start date/time' },
						{ name: 'start_time → start', value: 'start_time|start|convertToFhirDate', description: 'Appointment start time' },
						{ name: 'end_time → end', value: 'end_time|end|convertToFhirDate', description: 'Appointment end time' },
						{ name: 'duration → minutesDuration', value: 'duration|minutesDuration|', description: 'Duration in minutes' },
						{ name: 'created_date → created', value: 'created_date|created|convertToFhirDate', description: 'Creation timestamp' },

						// Appointment Classification
						{ name: '🏥 CLASSIFICATION', value: '', description: 'Appointment type and service details' },
						{ name: 'appointment_type → appointmentType.text', value: 'appointment_type|appointmentType.text|', description: 'Type of appointment' },
						{ name: 'service_category → serviceCategory[0].text', value: 'service_category|serviceCategory[0].text|', description: 'Service category' },
						{ name: 'service_type → serviceType[0].text', value: 'service_type|serviceType[0].text|', description: 'Service type' },
						{ name: 'priority → priority', value: 'priority|priority|', description: 'Appointment priority' },

						// Patient Information
						{ name: '👤 PATIENT REFERENCES', value: '', description: 'Patient identification' },
						{ name: 'patient_id → participant[0].actor.reference', value: 'patient_id|participant[0].actor.reference|', description: 'Patient reference (Patient/id)' },
						{ name: 'patient_name → participant[0].actor.display', value: 'patient_name|participant[0].actor.display|', description: 'Patient display name' },
						{ name: 'patient_status → participant[0].status', value: 'patient_status|participant[0].status|', description: 'Patient participation status' },

						// Provider Information
						{ name: '👩‍⚕️ PROVIDER REFERENCES', value: '', description: 'Healthcare provider information' },
						{ name: 'provider_id → participant[1].actor.reference', value: 'provider_id|participant[1].actor.reference|', description: 'Practitioner reference (Practitioner/id)' },
						{ name: 'provider_name → participant[1].actor.display', value: 'provider_name|participant[1].actor.display|', description: 'Provider display name' },
						{ name: 'provider_status → participant[1].status', value: 'provider_status|participant[1].status|', description: 'Provider participation status' },

						// Location
						{ name: '📍 LOCATION', value: '', description: 'Appointment location details' },
						{ name: 'location_id → participant[2].actor.reference', value: 'location_id|participant[2].actor.reference|', description: 'Location reference (Location/id)' },
						{ name: 'location_name → participant[2].actor.display', value: 'location_name|participant[2].actor.display|', description: 'Location display name' },

						// Clinical Information
						{ name: '🩺 CLINICAL DETAILS', value: '', description: 'Medical reason and notes' },
						{ name: 'reason → reasonCode[0].text', value: 'reason|reasonCode[0].text|', description: 'Reason for appointment' },
						{ name: 'reason_reference → reasonReference[0].reference', value: 'reason_reference|reasonReference[0].reference|', description: 'Reference to condition/observation' },
						{ name: 'description → description', value: 'description|description|', description: 'Appointment description' },
						{ name: 'comment → comment', value: 'comment|comment|', description: 'Additional comments' },
						{ name: 'notes → comment', value: 'notes|comment|', description: 'Appointment notes' },

						// Specialty and Department
						{ name: '🏥 DEPARTMENT/SPECIALTY', value: '', description: 'Clinical specialty information' },
						{ name: 'specialty → specialty[0].text', value: 'specialty|specialty[0].text|', description: 'Medical specialty' },
						{ name: 'department → serviceCategory[0].text', value: 'department|serviceCategory[0].text|', description: 'Hospital department' }
					];
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					return [
						{ name: `❌ Error: ${errorMessage}`, value: '', description: 'Failed to load Kenya IG appointment mapping guide' }
					];
				}
			},

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