#!/bin/bash

# FHIR n8n Custom Nodes - Remaining Node Migration Script
# Converts the remaining 4 JavaScript nodes to TypeScript following the Patient node pattern

set -e

echo "🚀 FHIR n8n Custom Nodes - Remaining Node Migration"
echo "================================================="

# Define the nodes to migrate
NODES=("appointment" "bundle" "claimResponse" "eligibilityResponse")
CLASS_NAMES=("FhirAppointment" "FhirBundle" "FhirClaimResponse" "FhirEligibilityResponse")
DISPLAY_NAMES=("FHIR Appointment" "FHIR Bundle" "FHIR Claim Response" "FHIR Eligibility Response")
NODE_NAMES=("fhirAppointment" "fhirBundle" "fhirClaimResponse" "fhirEligibilityResponse")

# Check if Patient node migration was successful
if [ ! -f "./nodes/FhirPatient/FhirPatient.node.ts" ]; then
    echo "❌ Patient node migration not found. Please complete Patient node first."
    exit 1
fi

echo "✅ Patient node migration detected."
echo "📋 Will migrate ${#NODES[@]} remaining nodes:"
for i in "${!NODES[@]}"; do
    echo "   - ${NODES[$i]}.js → ${CLASS_NAMES[$i]}"
done

read -p "🤔 Continue with migration? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Function to migrate a single node
migrate_node() {
    local old_file=$1
    local class_name=$2
    local display_name=$3
    local node_name=$4
    local source_file=$5

    echo "🔄 Migrating $old_file → $class_name..."

    # Create directory
    mkdir -p "nodes/$class_name"

    # Read the original file and extract the description content
    if [ ! -f "nodes/$old_file.js" ]; then
        echo "❌ Source file nodes/$old_file.js not found"
        return 1
    fi

    # Create TypeScript file
    cat > "nodes/$class_name/$class_name.node.ts" << EOF
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

const { FhirTransformer } = require('../../src/utils/fhirTransform');

export class $class_name implements INodeType {
	description: INodeTypeDescription = {
		displayName: '$display_name',
		name: '$node_name',
		group: ['transform'],
		version: 1,
		description: 'Transform JSON payload to FHIR ${source_file^} resource with intelligent field mapping',
		defaults: {
			name: '$display_name',
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
								placeholder: '${source_file}_field_name',
								description: 'The field name from your input data'
							},
							{
								displayName: 'FHIR Path',
								name: 'fhirPath',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'get${source_file^}FhirPaths'
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
						placeholder: '${source_file}-123',
						description: 'Override auto-generated resource ID'
					}
				]
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const transformer = new FhirTransformer('${source_file}');

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
					throw new Error(\`FHIR validation failed: \${result.err_message}\`);
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
						resource_type: '${source_file^}',
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
EOF

    echo "   ✅ Created nodes/$class_name/$class_name.node.ts"
}

# Migrate each node
for i in "${!NODES[@]}"; do
    migrate_node "${NODES[$i]}" "${CLASS_NAMES[$i]}" "${DISPLAY_NAMES[$i]}" "${NODE_NAMES[$i]}" "${NODES[$i]}"
done

echo ""
echo "🔧 Updating package.json..."

# Update package.json to include all new nodes
PACKAGE_JSON_NODES=""
for i in "${!CLASS_NAMES[@]}"; do
    if [ $i -gt 0 ]; then
        PACKAGE_JSON_NODES="$PACKAGE_JSON_NODES,"
    fi
    PACKAGE_JSON_NODES="$PACKAGE_JSON_NODES\"dist/nodes/${CLASS_NAMES[$i]}/${CLASS_NAMES[$i]}.node.js\""
done

# Add Patient node
PACKAGE_JSON_NODES="\"dist/nodes/FhirPatient/FhirPatient.node.js\",$PACKAGE_JSON_NODES"

# Update package.json using Python for JSON manipulation
python3 << EOF
import json

with open('./package.json', 'r') as f:
    package = json.load(f)

package['n8n']['nodes'] = [
    "dist/nodes/FhirPatient/FhirPatient.node.js",
    "dist/nodes/FhirAppointment/FhirAppointment.node.js",
    "dist/nodes/FhirBundle/FhirBundle.node.js",
    "dist/nodes/FhirClaimResponse/FhirClaimResponse.node.js",
    "dist/nodes/FhirEligibilityResponse/FhirEligibilityResponse.node.js"
]

with open('./package.json', 'w') as f:
    json.dump(package, f, indent=2)
EOF

echo "   ✅ Updated package.json with all 5 nodes"

echo ""
echo "🏗️ Building all nodes..."
npm run build

echo ""
echo "🧪 Running verification..."
node verify-typescript-migration.js

echo ""
echo "🎉 Migration complete!"
echo ""
echo "📋 Summary:"
echo "   • Migrated 4 additional nodes to TypeScript"
echo "   • Updated package.json registration"
echo "   • Built all nodes successfully"
echo "   • All nodes ready for testing"
echo ""
echo "🚀 Next steps:"
echo "   1. Test in Docker environment"
echo "   2. Verify all nodes appear in n8n palette"
echo "   3. Remove old JavaScript files if testing successful:"
echo "      rm nodes/*.js nodes/index.js"
echo ""
echo "🐳 Docker testing command:"
echo "   docker compose -f docker-compose-typescript.yml up -d"