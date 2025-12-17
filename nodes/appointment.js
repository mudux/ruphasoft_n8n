// FHIR Appointment Node
// n8n custom node with auto-detection + manual override mapping

const { FhirTransformer } = require('../src/utils/fhirTransform');

class FhirAppointment {
  constructor() {
    this.description = {
      displayName: 'FHIR Appointment',
      name: 'fhirAppointment',
      group: ['transform'],
      version: 1,
      description: 'Transform JSON payload to FHIR Appointment resource with intelligent field mapping',
      defaults: {
        name: 'FHIR Appointment',
        color: '#1976D2', // Healthcare blue
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
                  placeholder: 'e.g., appointment_id',
                  description: 'Field name from input JSON'
                },
                {
                  displayName: 'FHIR Path',
                  name: 'fhirPath',
                  type: 'options',
                  options: [
                    { name: 'Appointment ID', value: 'identifier[0].value' },
                    { name: 'Status', value: 'status' },
                    { name: 'Service Type', value: 'serviceType[0].text' },
                    { name: 'Start Date/Time', value: 'start' },
                    { name: 'End Date/Time', value: 'end' },
                    { name: 'Duration (Minutes)', value: 'minutesDuration' },
                    { name: 'Patient Reference', value: 'participant[0].actor.reference' },
                    { name: 'Practitioner Reference', value: 'participant[1].actor.reference' },
                    { name: 'Location Reference', value: 'participant[2].actor.reference' },
                    { name: 'Appointment Reason', value: 'reasonCode[0].text' },
                    { name: 'Comment/Notes', value: 'comment' },
                    { name: 'Priority', value: 'priority' }
                  ],
                  default: 'identifier[0].value',
                  description: 'Target FHIR field path'
                },
                {
                  displayName: 'Transformation',
                  name: 'transformation',
                  type: 'options',
                  options: [
                    { name: 'None', value: '' },
                    { name: 'Format as DateTime (ISO 8601)', value: 'convertToFhirDateTime' },
                    { name: 'Format as Date (YYYY-MM-DD)', value: 'convertToFhirDate' },
                    { name: 'Normalize Status', value: 'normalizeStatus' },
                    { name: 'Format Reference', value: 'formatReference' },
                    { name: 'Uppercase', value: 'toUpperCase' },
                    { name: 'Lowercase', value: 'toLowerCase' },
                    { name: 'Trim Whitespace', value: 'trim' }
                  ],
                  default: '',
                  description: 'Optional data transformation'
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
              description: 'Include auto-detection details in output'
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
