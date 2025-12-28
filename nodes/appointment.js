// FHIR Appointment Node
// n8n custom node with auto-detection + manual override mapping
// Enhanced with Kenya-specific patterns, semantic array indexing, and appointment transformations

const { FhirTransformer } = require('../src/utils/fhirTransform');
const { getAvailableSemanticNames } = require('../src/utils/semanticPaths');
const { getAppointmentPresetOptions } = require('../src/utils/transformationPresets');

class FhirAppointment {
  constructor() {
    this.description = {
      displayName: 'FHIR Appointment',
      name: 'fhirAppointment',
      group: ['transform'],
      version: 2, // Version bump for enhanced features
      description: 'Transform JSON payload to FHIR Appointment resource with intelligent field mapping and Kenya-specific support',
      defaults: {
        name: 'FHIR Appointment',
        color: '#1976D2', // Healthcare blue
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        // --- Basic Settings ---
        {
          displayName: 'Processing Mode',
          name: 'mode',
          type: 'options',
          options: [
            {
              name: 'Auto-Detection Only',
              value: 'auto',
              description: 'Use automatic field detection with Kenya-specific patterns'
            },
            {
              name: 'Manual Override',
              value: 'manual',
              description: 'Configure custom field mappings with semantic paths'
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
        // --- Manual Mappings (Enhanced with Semantic Paths) ---
        {
          displayName: 'Manual Mappings',
          name: 'manualMappings',
          type: 'fixedCollection',
          displayOptions: {
            show: {
              mode: ['manual']
            }
          },
          placeholder: 'Add Field Mapping',
          default: {},
          typeOptions: {
            multipleValues: true,
          },
          options: [
            {
              name: 'mappingValues',
              displayName: 'Field Mapping',
              values: [
                {
                  displayName: 'Source Field',
                  name: 'sourceField',
                  type: 'string',
                  default: '',
                  placeholder: 'e.g., appointment_date',
                  description: 'Field name from input JSON'
                },
                {
                  displayName: 'FHIR Path',
                  name: 'fhirPath',
                  type: 'options',
                  options: [
                    // Appointment Identifiers
                    { name: '-- Identifiers --', value: '__sep_ids' },
                    { name: 'Appointment ID', value: 'identifier[appointment_id].value' },
                    { name: 'Booking Reference', value: 'identifier[booking_reference].value' },
                    { name: 'External ID', value: 'identifier[external_id].value' },
                    { name: 'MOH Appointment ID', value: 'identifier[moh_appointment].value' },

                    // Status and Core Fields
                    { name: '-- Status & Core --', value: '__sep_status' },
                    { name: 'Status', value: 'status' },
                    { name: 'Cancellation Reason', value: 'cancelationReason.text' },
                    { name: 'Priority', value: 'priority' },
                    { name: 'Description', value: 'description' },
                    { name: 'Comment/Notes', value: 'comment' },

                    // Date/Time
                    { name: '-- Date/Time --', value: '__sep_datetime' },
                    { name: 'Start DateTime', value: 'start' },
                    { name: 'End DateTime', value: 'end' },
                    { name: 'Duration (Minutes)', value: 'minutesDuration' },
                    { name: 'Created Date', value: 'created' },

                    // Service Type
                    { name: '-- Service Type --', value: '__sep_service' },
                    { name: 'Service Type Text', value: 'serviceType[0].text' },
                    { name: 'Service Type Code', value: 'serviceType[0].coding[0].code' },
                    { name: 'Service Category', value: 'serviceCategory[0].text' },
                    { name: 'Specialty', value: 'specialty[0].text' },
                    { name: 'Appointment Type', value: 'appointmentType.text' },

                    // Reason
                    { name: '-- Reason --', value: '__sep_reason' },
                    { name: 'Reason Text', value: 'reasonCode[0].text' },
                    { name: 'Reason Code', value: 'reasonCode[0].coding[0].code' },
                    { name: 'Reason Reference', value: 'reasonReference[0].reference' },

                    // Participants (using semantic indices)
                    { name: '-- Participants --', value: '__sep_part' },
                    { name: 'Patient Reference', value: 'participant[patient].actor.reference' },
                    { name: 'Patient Display', value: 'participant[patient].actor.display' },
                    { name: 'Practitioner Reference', value: 'participant[practitioner].actor.reference' },
                    { name: 'Practitioner Display', value: 'participant[practitioner].actor.display' },
                    { name: 'Location Reference', value: 'participant[location].actor.reference' },
                    { name: 'Location Display', value: 'participant[location].actor.display' },
                    { name: 'Healthcare Service Ref', value: 'participant[healthcare_service].actor.reference' },

                    // Kenya Patient Identifiers (for patient lookup)
                    { name: '-- Kenya Patient IDs --', value: '__sep_ke_patient' },
                    { name: 'Patient National ID', value: 'participant[patient].actor.identifier.value' },
                    { name: 'Patient SHA Number', value: 'extension[0].valueString' },
                    { name: 'Patient NHIF Number', value: 'extension[1].valueString' },

                    // Kenya Facility/Location
                    { name: '-- Kenya Facility --', value: '__sep_ke_fac' },
                    { name: 'MOH Facility Code', value: 'extension[facility_code].valueString' },
                    { name: 'Facility Name', value: 'participant[location].actor.display' },
                    { name: 'Referral Number', value: 'extension[referral_number].valueString' },
                    { name: 'Appointment Source', value: 'extension[appointment_source].valueCode' },

                    // Slot Reference
                    { name: '-- Slot --', value: '__sep_slot' },
                    { name: 'Slot Reference', value: 'slot[0].reference' },

                    // Supporting Information
                    { name: '-- Supporting Info --', value: '__sep_support' },
                    { name: 'Supporting Info Reference', value: 'supportingInformation[0].reference' },
                    { name: 'Based On (ServiceRequest)', value: 'basedOn[0].reference' },
                    { name: 'Patient Instructions', value: 'patientInstruction' }
                  ],
                  default: 'identifier[appointment_id].value',
                  description: 'Target FHIR field path (supports semantic indices like participant[patient])'
                },
                {
                  displayName: 'Transformation',
                  name: 'transformation',
                  type: 'options',
                  options: [
                    { name: 'None', value: '' },
                    // DateTime
                    { name: '-- DateTime --', value: '__sep_dt' },
                    { name: 'Kenya DateTime (EAT)', value: 'formatKenyaDateTime' },
                    { name: 'Kenya Date (DD/MM/YYYY)', value: 'formatKenyaDate' },
                    { name: 'FHIR DateTime', value: 'convertToFhirDateTime' },
                    // Appointment-specific
                    { name: '-- Appointment --', value: '__sep_apt' },
                    { name: 'Appointment Status', value: 'normalizeAppointmentStatus' },
                    { name: 'Service Type', value: 'formatServiceType' },
                    { name: 'Slot Duration', value: 'validateAppointmentSlot' },
                    { name: 'Priority', value: 'formatAppointmentPriority' },
                    // Facility
                    { name: '-- Facility --', value: '__sep_fac' },
                    { name: 'MOH Facility Code', value: 'formatFacilityCode' },
                    { name: 'Location Reference', value: 'formatLocationReference' },
                    // References
                    { name: '-- References --', value: '__sep_ref' },
                    { name: 'Patient Reference', value: 'formatPatientReference' },
                    { name: 'Practitioner Reference', value: 'formatPractitionerReference' },
                    // Kenya IDs
                    { name: '-- Kenya IDs --', value: '__sep_ids' },
                    { name: 'Kenya National ID', value: 'formatNationalId' },
                    { name: 'SHA Number', value: 'formatSHANumber' },
                    { name: 'NHIF Number', value: 'formatNHIFNumber' },
                    // Text
                    { name: '-- Text --', value: '__sep_text' },
                    { name: 'Uppercase', value: 'toUpperCase' },
                    { name: 'Lowercase', value: 'toLowerCase' },
                    { name: 'Trim Whitespace', value: 'trim' }
                  ],
                  default: '',
                  description: 'Optional data transformation preset'
                },
                {
                  displayName: 'Action',
                  name: 'action',
                  type: 'options',
                  options: [
                    { name: 'Override/Add Mapping', value: 'override' },
                    { name: 'Remove Mapping', value: 'remove' }
                  ],
                  default: 'override',
                  description: 'Action to perform with this mapping'
                }
              ]
            }
          ]
        },
        // --- Advanced Options ---
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
              description: 'Include auto-detection details and confidence scores in output'
            },
            {
              displayName: 'Stop on Validation Error',
              name: 'stopOnError',
              type: 'boolean',
              default: false,
              description: 'Stop execution if validation fails (not recommended with forgiving mode)'
            },
            {
              displayName: 'Custom Resource ID',
              name: 'customId',
              type: 'string',
              default: '',
              placeholder: 'appointment-123',
              description: 'Override auto-generated resource ID'
            },
            {
              displayName: 'Enable Kenya Validation',
              name: 'enableKenyaValidation',
              type: 'boolean',
              default: true,
              description: 'Enable Kenya-specific validation for facility codes and date formats'
            },
            {
              displayName: 'Auto-Correct DateTime',
              name: 'autoCorrectDateTime',
              type: 'boolean',
              default: true,
              description: 'Automatically convert Kenya date/time formats to FHIR format with EAT timezone'
            },
            {
              displayName: 'Default Status',
              name: 'defaultStatus',
              type: 'options',
              options: [
                { name: 'Proposed', value: 'proposed' },
                { name: 'Pending', value: 'pending' },
                { name: 'Booked', value: 'booked' },
                { name: 'Arrived', value: 'arrived' },
                { name: 'Fulfilled', value: 'fulfilled' },
                { name: 'Cancelled', value: 'cancelled' },
                { name: 'No Show', value: 'noshow' },
                { name: 'Waitlist', value: 'waitlist' }
              ],
              default: 'proposed',
              description: 'Default status if not provided in input'
            },
            {
              displayName: 'Default Duration (Minutes)',
              name: 'defaultDuration',
              type: 'number',
              default: 15,
              description: 'Default appointment duration in minutes if not provided'
            },
            {
              displayName: 'Default Timezone',
              name: 'defaultTimezone',
              type: 'string',
              default: '+03:00',
              placeholder: '+03:00',
              description: 'Default timezone offset (East Africa Time is +03:00)'
            }
          ]
        }
      ]
    };
  }

  async execute(inputItems) {
    const returnData = [];
    const transformer = new FhirTransformer('appointment');

    for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
      try {
        const inputData = inputItems[itemIndex].json;

        // Get node parameters
        const mode = this.getNodeParameter('mode', itemIndex);
        const options = this.getNodeParameter('options', itemIndex, {});

        // Prepare user mappings for manual override mode
        let userMappings = null;
        if (mode === 'manual') {
          const manualMappings = this.getNodeParameter('manualMappings', itemIndex, {});
          userMappings = manualMappings.mappingValues || [];
        }

        // Transform the data
        const transformOptions = {
          mode: mode,
          includeDetailedMapping: options.includeDetailedMapping || false,
          customId: options.customId || null,
          enableKenyaValidation: options.enableKenyaValidation !== false,
          autoCorrectDateTime: options.autoCorrectDateTime !== false,
          defaultStatus: options.defaultStatus || 'proposed',
          defaultDuration: options.defaultDuration || 15,
          defaultTimezone: options.defaultTimezone || '+03:00'
        };

        const result = await transformer.transform(inputData, userMappings, transformOptions);

        // Apply custom ID if provided
        if (options.customId && result.fhir_resource) {
          result.fhir_resource.id = options.customId;
          result.metadata.resource_id = options.customId;
        }

        // Apply default status if not present
        if (result.fhir_resource && !result.fhir_resource.status) {
          result.fhir_resource.status = options.defaultStatus || 'proposed';
        }

        // Apply default duration if not present
        if (result.fhir_resource && !result.fhir_resource.minutesDuration) {
          result.fhir_resource.minutesDuration = options.defaultDuration || 15;
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
          timestamp: new Date().toISOString(),
          kenyaValidation: options.enableKenyaValidation !== false,
          timezone: options.defaultTimezone || '+03:00'
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
            err_message: error.message,
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
                error: error.message
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

module.exports = {
  description: new FhirAppointment().description,
  execute: async function(inputItems) {
    const node = new FhirAppointment();
    node.getNodeParameter = this.getNodeParameter.bind(this);
    return await node.execute.call(node, inputItems);
  }
};
