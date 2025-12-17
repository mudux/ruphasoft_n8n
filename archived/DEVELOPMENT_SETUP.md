# Development Setup Guide

This guide walks you through setting up the development environment for FHIR n8n Custom Nodes.

## Prerequisites

- **Node.js**: 18+ LTS
- **pnpm**: 8.0+ (package manager)
- **TypeScript**: 5.0+ (global installation recommended)
- **n8n**: 1.0+ (for testing)

## Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository (or extract to local directory)
cd /home/frappe/march-bench/n8n_fhir_workflows/fhir-n8n-custom-nodes

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### 2. Package Structure

```
fhir-n8n-custom-nodes/
├── packages/
│   ├── core/                     # Core utilities and types
│   └── nodes/
│       ├── patient/              # Patient resource node
│       ├── observation/          # Observation resource node (future)
│       └── encounter/            # Encounter resource node (future)
├── examples/
│   └── workflows/                # Example n8n workflows
├── docs/                         # Documentation
└── tools/                        # Development tools
```

### 3. Development Workflow

#### Building Packages

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @fhir-n8n/core build
pnpm --filter @fhir-n8n/patient build

# Watch mode for development
pnpm dev                          # All packages
pnpm --filter @fhir-n8n/core dev # Specific package
```

#### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @fhir-n8n/core test

# Watch mode
pnpm test:watch
```

#### Linting and Type Checking

```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm type-check
```

## Testing with n8n

### 1. Install n8n Locally

```bash
# Install n8n globally or in separate directory
npm install -g n8n

# Or install locally for development
npm install n8n
```

### 2. Link Custom Nodes

```bash
# Build the patient node package
pnpm --filter @fhir-n8n/patient build

# Create symlink to n8n custom nodes directory
# Option A: Global n8n installation
ln -s $(pwd)/packages/nodes/patient ~/.n8n/custom

# Option B: Local n8n installation
mkdir -p ./n8n_data/custom
ln -s $(pwd)/packages/nodes/patient ./n8n_data/custom/@fhir-n8n-patient

# Start n8n with custom nodes
n8n start --tunnel
```

### 3. Alternative: Development Mode

```bash
# Start n8n in development mode
npm run dev

# In another terminal, build and watch for changes
pnpm --filter @fhir-n8n/patient dev
```

## Package Development

### Creating New Node Packages

1. **Create Package Structure**:
```bash
mkdir -p packages/nodes/[resource-name]/src/nodes/[ResourceName]
cd packages/nodes/[resource-name]
```

2. **Setup package.json**:
```json
{
  "name": "@fhir-n8n/[resource-name]",
  "version": "0.1.0",
  "description": "FHIR [ResourceName] resource node for n8n",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "@fhir-n8n/core": "workspace:*",
    "@solarahealth/fhir-r4": "^2.0.0"
  },
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": [
      "dist/nodes/[ResourceName]/[ResourceName].node.js"
    ]
  }
}
```

3. **Create Node Implementation**:
   - Follow the Patient node as a template
   - Implement INodeType interface
   - Define FHIR resource schema with Zod
   - Create field properties using templates from core package
   - Implement transformation and validation logic

### Core Package Development

#### Adding New Field Templates

```typescript
// In packages/core/src/templates.ts
export const FhirFieldTemplates: Record<string, FhirFieldTemplate> = {
  // Existing templates...

  newTemplate: {
    name: 'newTemplate',
    displayName: 'New Template',
    description: 'Description of the template',
    properties: {
      // n8n INodeProperties definition
    },
    transformFunction: YourTransformer.transformNewTemplate,
    validationSchema: YourSchema,
  }
};
```

#### Adding New Validation Schemas

```typescript
// In packages/core/src/validation.ts
export const NewSchema = z.object({
  // Zod schema definition
});
```

#### Adding New Transform Functions

```typescript
// In packages/core/src/transforms.ts
export class FhirTransformer {
  // Existing methods...

  static transformNewTemplate(data: any): any {
    // Transformation logic
  }
}
```

## Testing Strategy

### Unit Tests

```bash
# Run unit tests
pnpm test

# Test specific functionality
pnpm --filter @fhir-n8n/core test -- --testNamePattern="validation"
```

### Integration Tests

Create test workflows in `examples/workflows/` and test with actual n8n instance:

```bash
# Start n8n
n8n start

# Import test workflow
# Test node functionality
# Validate FHIR output
```

### FHIR Validation Tests

```typescript
// Test FHIR compliance
import { FhirValidator } from '@fhir-n8n/core';

describe('FHIR Patient Validation', () => {
  it('should validate valid patient resource', () => {
    const patient = { /* valid patient data */ };
    const result = FhirValidator.validateResource(patient, PatientSchema);
    expect(result.isValid).toBe(true);
  });
});
```

## Debugging

### Debug Mode

```bash
# Start n8n in debug mode
DEBUG=n8n:* n8n start

# Or specific debug namespace
DEBUG=n8n:nodes* n8n start
```

### Node Debugging

Add debug logging to your nodes:

```typescript
import { FhirLogger } from '@fhir-n8n/core';

// In your node execute method
FhirLogger.logResourceCreation(fhirResource);
FhirLogger.logValidationWarnings(warnings, resourceType);
```

### Common Issues

1. **TypeScript Compilation Errors**:
   - Check tsconfig.json references
   - Ensure all dependencies are built
   - Verify import paths

2. **n8n Node Not Loading**:
   - Check package.json n8n.nodes path
   - Ensure dist folder exists
   - Verify symlink is correct

3. **FHIR Validation Failures**:
   - Check Zod schema definitions
   - Verify data transformation logic
   - Test with minimal valid examples

## Contributing

### Pull Request Process

1. Create feature branch
2. Add tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit pull request

### Code Style

- Follow existing TypeScript conventions
- Use Prettier for code formatting
- Add JSDoc comments for public APIs
- Write descriptive commit messages

### Documentation Updates

- Update README files for new features
- Add examples for new nodes
- Document breaking changes
- Update API documentation

## Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
pnpm build --analyze

# Clean and rebuild
pnpm clean && pnpm build
```

### Runtime Optimization

- Use lazy loading for large schemas
- Cache frequently used validation schemas
- Optimize transformation functions
- Minimize memory allocations

## Deployment

### Package Publishing

```bash
# Build all packages
pnpm build

# Publish to npm (when ready)
pnpm publish --recursive
```

### n8n Community Nodes

Follow n8n community nodes guidelines for publishing to n8n registry.

## Resources

- [n8n Node Development Documentation](https://docs.n8n.io/integrations/creating-nodes/)
- [FHIR R4 Specification](http://hl7.org/fhir/R4/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Zod Validation Library](https://github.com/colinhacks/zod)
- [pnpm Workspace Documentation](https://pnpm.io/workspaces)