# n8n Node User Interface Elements Reference

## Overview
n8n provides a comprehensive set of predefined UI components (based on JSON configuration) that allows users to input all sorts of data types. This reference covers all available UI elements.

## Basic UI Elements

### String
Basic text input field:

```javascript
{
    displayName: 'Name', // The value the user sees in the UI
    name: 'name', // The name used to reference the element UI within the code
    type: 'string',
    required: true, // Whether the field is required or not
    default: 'n8n',
    description: 'The name of the user',
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

### Password Field
String field for inputting passwords:

```javascript
{
    displayName: 'Password',
    name: 'password',
    type: 'string',
    required: true,
    typeOptions: {
        password: true,
    },
    default: '',
    description: `User's password`,
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

### Multi-line String
String field with more than one row:

```javascript
{
    displayName: 'Description',
    name: 'description',
    type: 'string',
    required: true,
    typeOptions: {
        rows: 4,
    },
    default: '',
    description: 'Description',
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## Drag and Drop Support
Users can drag and drop data values to map them to fields. Dragging and dropping creates an expression to load the data value. n8n supports this automatically.

Add extra configuration option to support dragging and dropping data keys:

- `requiresDataPath: 'single'`: for fields that require a single string.
- `requiresDataPath: 'multiple'`: for fields that can accept a comma-separated list of string.

## Number
Number field with decimal points:

```javascript
{
    displayName: 'Amount',
    name: 'amount',
    type: 'number',
    required: true,
    typeOptions: {
        maxValue: 10,
        minValue: 0,
        numberPrecision: 2,
    },
    default: 10.00,
    description: 'Your current amount',
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## Collection
Use the collection type when you need to display optional fields:

```javascript
{
    displayName: 'Filters',
    name: 'filters',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    options: [
        {
            displayName: 'Type',
            name: 'type',
            type: 'options',
            options: [
                {
                    name: 'Automated',
                    value: 'automated',
                },
                {
                    name: 'Past',
                    value: 'past',
                },
                {
                    name: 'Upcoming',
                    value: 'upcoming',
                },
            ],
            default: '',
        },
    ],
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## DateTime
The dateTime type provides a date picker:

```javascript
{
    displayName: 'Modified Since',
    name: 'modified_since',
    type: 'dateTime',
    default: '',
    description: 'The date and time when the file was last modified',
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## Boolean
The boolean type adds a toggle for entering true or false:

```javascript
{
    displayName: 'Wait for Image',
    name: 'waitForImage',
    type: 'boolean',
    default: true, // Initial state of the toggle
    description: 'Whether to wait for the image or not',
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## Color
The color type provides a color selector:

```javascript
{
    displayName: 'Background Color',
    name: 'backgroundColor',
    type: 'color',
    default: '', // Initially selected color
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## Options
The options type adds an options list. Users can select a single value:

```javascript
{
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    options: [
        {
            name: 'Image',
            value: 'image',
        },
        {
            name: 'Template',
            value: 'template',
        },
    ],
    default: 'image', // The initially selected option
    description: 'Resource to consume',
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## Multi-options
The multiOptions type adds an options list. Users can select more than one value:

```javascript
{
    displayName: 'Events',
    name: 'events',
    type: 'multiOptions',
    options: [
        {
            name: 'Plan Created',
            value: 'planCreated',
        },
        {
            name: 'Plan Deleted',
            value: 'planDeleted',
        },
    ],
    default: [], // Initially selected options
    description: 'The events to be monitored',
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## Filter
Use this component to evaluate, match, or filter incoming data:

```javascript
{
    displayName: 'Conditions',
    name: 'conditions',
    placeholder: 'Add Condition',
    type: 'filter',
    default: {},
    typeOptions: {
        filter: {
            // Use the user options (below) to determine filter behavior
            caseSensitive: '={{!$parameter.options.ignoreCase}}',
            typeValidation: '={{$parameter.options.looseTypeValidation ? "loose" : "strict"}}',
        },
    },
},
{
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add option',
    default: {},
    options: [
        {
            displayName: 'Ignore Case',
            description: 'Whether to ignore letter case when evaluating conditions',
            name: 'ignoreCase',
            type: 'boolean',
            default: true,
        },
        {
            displayName: 'Less Strict Type Validation',
            description: 'Whether to try casting value types based on the selected operator',
            name: 'looseTypeValidation',
            type: 'boolean',
            default: true,
        },
    ],
}
```

## Assignment Collection (Drag and Drop)
Use the drag and drop component when you want users to pre-fill name and value parameters with a single drag interaction:

```javascript
{
    displayName: 'Fields to Set',
    name: 'assignments',
    type: 'assignmentCollection',
    default: {},
}
```

## Fixed Collection
Use the fixedCollection type to group fields that are semantically related:

```javascript
{
    displayName: 'Metadata',
    name: 'metadataUi',
    placeholder: 'Add Metadata',
    type: 'fixedCollection',
    default: '',
    typeOptions: {
        multipleValues: true,
    },
    description: '',
    options: [
        {
            name: 'metadataValues',
            displayName: 'Metadata',
            values: [
                {
                    displayName: 'Name',
                    name: 'name',
                    type: 'string',
                    default: 'Name of the metadata key to add.',
                },
                {
                    displayName: 'Value',
                    name: 'value',
                    type: 'string',
                    default: '',
                    description: 'Value to set for the metadata key.',
                },
            ],
        },
    ],
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## Resource Locator
The resource locator element helps users find a specific resource in an external service:

```javascript
{
    displayName: 'Card',
    name: 'cardID',
    type: 'resourceLocator',
    default: '',
    description: 'Get a card',
    modes: [
        {
            displayName: 'ID',
            name: 'id',
            type: 'string',
            hint: 'Enter an ID',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '^[0-9]',
                        errorMessage: 'The ID must start with a number',
                    },
                },
            ],
            placeholder: '12example',
            // How to use the ID in API call
            url: '=http://api-base-url.com/?id={{$value}}',
        },
        {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            hint: 'Enter a URL',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '^http',
                        errorMessage: 'Invalid URL',
                    },
                },
            ],
            placeholder: 'https://example.com/card/12example/',
            // How to get the ID from the URL
            extractValue: {
                type: 'regex',
                regex: 'example.com/card/([0-9]*.*)/',
            },
        },
        {
            displayName: 'List',
            name: 'list',
            type: 'list',
            typeOptions: {
                // You must always provide a search method
                // Write this method within the methods object in your base file
                // The method must populate the list, and handle searching if searchable: true
                searchListMethod: 'searchMethod',
                // If you want users to be able to search the list
                searchable: true,
                // Set to true if you want to force users to search
                // When true, users can't browse the list
                // Or false if users can browse a list
                searchFilterRequired: true,
            },
        },
    ],
    displayOptions: {
        // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ],
        },
    },
}
```

## Resource Mapper
For insert, update, or upsert operations, provides a way to get data into the required format directly within the node:

```javascript
{
    displayName: 'Columns',
    name: 'columns', // The name used to reference the element UI within the code
    type: 'resourceMapper', // The UI element type
    default: {
        // mappingMode can be defined in the component (mappingMode: 'defineBelow')
        // or you can attempt automatic mapping (mappingMode: 'autoMapInputData')
        mappingMode: 'defineBelow',
        // Important: always set default value to null
        value: null,
    },
    required: true,
    // See "Resource mapper type options interface" below for the full typeOptions specification
    typeOptions: {
        resourceMapper: {
            resourceMapperMethod: 'getMappingColumns',
            mode: 'update',
            fieldWords: {
                singular: 'column',
                plural: 'columns',
            },
            addAllFields: true,
            multiKeyMatch: true,
            supportAutoMap: true,
            matchingFieldsLabels: {
                title: 'Custom matching columns title',
                description: 'Help text for custom matching columns',
                hint: 'Below-field hint for custom matching columns',
            },
        },
    },
}
```

### Resource Mapper Type Options Interface
The typeOptions section must implement the following interface:

```typescript
export interface ResourceMapperTypeOptions {
    // The name of the method where you fetch the schema
    // Refer to the Resource mapper method section for more detail
    resourceMapperMethod: string;
    // Choose the mode for your operation
    // Supported modes: add, update, upsert
    mode: 'add' | 'update' | 'upsert';
    // Specify labels for fields in the UI
    fieldWords?: { singular: string; plural: string };
    // Whether n8n should display a UI input for every field when node first added to workflow
    // Default is true
    addAllFields?: boolean;
    // Specify a message to show if no fields are fetched from the service
    // (the call is successful but the response is empty)
    noFieldsError?: string;
    // Whether to support multi-key column matching
    // multiKeyMatch is for update and upsert only
    // Default is false
    // If true, the node displays a multi-select dropdown for the matching column selector
    multiKeyMatch?: boolean;
    // Whether to support automatic mapping
    // If false, n8n hides the mapping mode selector field and sets mappingMode to defineBelow
    supportAutoMap?: boolean;
    // Custom labels for the matching columns selector
    matchingFieldsLabels?: {
        title?: string;
        description?: string;
        hint?: string;
    };
}
```

### Resource Mapper Method
This method contains your node-specific logic for fetching the data schema:

```typescript
interface ResourceMapperField {
    // Field ID as in the service
    id: string;
    // Field label
    displayName: string;
    // Whether n8n should pre-select the field as a matching field
    // A matching field is a column used to identify the rows to modify
    defaultMatch: boolean;
    // Whether the field can be used as a matching field
    canBeUsedToMatch?: boolean;
    // Whether the field is required by the schema
    required: boolean;
    // Whether to display the field in the UI
    // If false, can't be used for matching or mapping
    display: boolean;
    // The data type for the field
    // These correspond to UI element types
    // Supported types: string, number, dateTime, boolean, time, array, object, options
    type?: FieldType;
    // Added at runtime if the field is removed from mapping by the user
    removed?: boolean;
    // Specify options for enumerated types
    options?: INodePropertyOptions[];
}
```

## JSON
JSON editor field:

```javascript
{
    displayName: 'Content (JSON)',
    name: 'content',
    type: 'json',
    default: '',
    description: '',
    displayOptions: { // the resources and operations to display this element with
        show: {
            resource: [
                // comma-separated list of resource names
            ],
            operation: [
                // comma-separated list of operation names
            ]
        }
    },
}
```

## HTML
The HTML editor allows users to create HTML templates in their workflows:

```javascript
{
    displayName: 'HTML Template', // The value the user sees in the UI
    name: 'html', // The name used to reference the element UI within the code
    type: 'string',
    typeOptions: {
        editor: 'htmlEditor',
    },
    default: placeholder, // Loads n8n's placeholder HTML template
    noDataExpression: true, // Prevent using an expression for the field
    description: 'HTML template to render',
}
```

## Notice
Display a yellow box with a hint or extra info:

```javascript
{
  displayName: 'Your text here',
  name: 'notice',
  type: 'notice',
  default: '',
}
```

## Hints
There are two types of hints: parameter hints and node hints.

### Parameter Hints
Small lines of text below a user input field:

```javascript
{
    displayName: 'URL',
    name: 'url',
    type: 'string',
    hint: 'Enter a URL',
    ...
}
```

### Node Hints
More powerful and flexible option than Notice. Display longer hints in the input panel, output panel, or node details view:

```javascript
description: INodeTypeDescription = {
    ...
    hints: [
        {
            // The hint message. You can use HTML.
            message: "This node has many input items. Consider enabling <b>Execute Once</b> in the node's settings.",
            // Choose from: info, warning, danger. The default is 'info'.
            // Changes the color. info (grey), warning (yellow), danger (red)
            type: 'info',
            // Choose from: inputPane, outputPane, ndv. By default n8n displays the hint in both the input and output panels.
            location: 'outputPane',
            // Choose from: always, beforeExecution, afterExecution. The default is 'always'
            whenToDisplay: 'beforeExecution',
            // Optional. An expression. If it resolves to true, n8n displays the message. Defaults to true.
            displayCondition: '={{ $parameter["operation"] === "select" && $input.all().length > 1 }}'
        }
    ]
    ...
}
```

### Dynamic Hints for Programmatic-Style Nodes
Create dynamic messages that include information from the node execution:

```javascript
if (operation === 'select' && items.length > 1 && !node.executeOnce) {
    // Expects two parameters: NodeExecutionData and an array of hints
    return new NodeExecutionOutput(
        [returnData],
        [
            {
                message: `This node ran ${items.length} times, once for each input item. To run for the first item only, enable <b>Execute once</b> in the node settings.`,
                location: 'outputPane',
            },
        ],
    );
}
return [returnData];
```

## Examples and References

### Live Examples
- **CardDescription.ts and Trello.node.ts**: Resource locator with search and `searchFilterRequired: true`
- **GoogleDrive.node.ts**: Resource locator where users can browse the list or search
- **Postgres node (version 2)**: Resource mapper using database schema
- **Google Sheets node (version 2)**: Resource mapper using schema-less service
- **Compare Datasets node**: Examples of drag and drop support
- **Html.node.ts**: HTML editor implementation
- **Split Out node**: Dynamic hint in programmatic-style node
- **If node**: Filter component with collection options

---

**Source**: [n8n Node User Interface Elements Documentation](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-ui-elements/)