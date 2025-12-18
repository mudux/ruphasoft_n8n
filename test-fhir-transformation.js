#!/usr/bin/env node

/**
 * FHIR n8n Custom Nodes - Functional Transformation Test Suite
 *
 * This script tests the actual FHIR transformation functionality
 * for all 5 nodes with realistic healthcare data scenarios.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 FHIR n8n Custom Nodes - Functional Transformation Test Suite');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(message) {
    console.log(`✅ ${message}`);
    passed++;
}

function fail(message) {
    console.log(`❌ ${message}`);
    failed++;
}

function info(message) {
    console.log(`ℹ️  ${message}`);
}

function section(title) {
    console.log(`\n🔸 ${title}`);
    console.log('─'.repeat(60));
}

// Mock n8n execution context for testing
class MockExecuteFunctions {
    constructor(inputData, parameters = {}) {
        this.inputData = inputData;
        this.parameters = parameters;
    }

    getInputData() {
        return [{ json: this.inputData }];
    }

    getNodeParameter(name, itemIndex, defaultValue = null) {
        return this.parameters[name] || defaultValue;
    }
}

// Test data samples for each FHIR resource
const testData = {
    patient: {
        patient_first_name: "John",
        patient_last_name: "Doe",
        dob: "1990-05-15",
        phone: "(555) 123-4567",
        mrn: "MRN-12345",
        gender: "M",
        street: "123 Main St",
        city: "Anytown",
        state: "CA",
        zip: "12345",
        email: "john.doe@example.com"
    },
    appointment: {
        appointment_id: "APPT-001",
        patient_id: "PATIENT-123",
        provider: "Dr. Smith",
        appointment_datetime: "2025-01-15T10:00:00Z",
        status: "scheduled",
        reason: "Annual checkup",
        duration: 30
    },
    bundle: {
        bundle_type: "collection",
        bundle_id: "BUNDLE-001",
        timestamp: "2025-01-15T10:00:00Z",
        resources: [
            { resourceType: "Patient", id: "patient-1" },
            { resourceType: "Appointment", id: "appointment-1" }
        ]
    },
    claimResponse: {
        claim_id: "CLAIM-001",
        patient_id: "PATIENT-123",
        status: "active",
        outcome: "complete",
        created: "2025-01-15",
        insurer: "Blue Cross Blue Shield",
        total_amount: 150.00,
        paid_amount: 135.00,
        adjustment_amount: 15.00
    },
    eligibilityResponse: {
        eligibility_id: "ELIG-001",
        patient_id: "PATIENT-123",
        status: "active",
        outcome: "complete",
        created: "2025-01-15",
        insurer: "Medicare",
        benefit_status: "eligible",
        coverage_start: "2025-01-01",
        coverage_end: "2025-12-31"
    }
};

// Expected FHIR resource types for validation
const expectedResourceTypes = {
    patient: 'Patient',
    appointment: 'Appointment',
    bundle: 'Bundle',
    claimResponse: 'ClaimResponse',
    eligibilityResponse: 'CoverageEligibilityResponse'
};

async function testNodeTransformation(nodeName, resourceType, testInputData) {
    section(`Testing ${nodeName} Transformation`);

    try {
        // Load the compiled node
        const nodePath = `./dist/nodes/Fhir${nodeName}/Fhir${nodeName}.node.js`;
        if (!fs.existsSync(nodePath)) {
            fail(`Node file not found: ${nodePath}`);
            return false;
        }

        const nodeModule = require(nodePath);
        const NodeClass = nodeModule[`Fhir${nodeName}`];

        if (!NodeClass) {
            fail(`Node class Fhir${nodeName} not exported`);
            return false;
        }

        const nodeInstance = new NodeClass();
        pass(`Node ${nodeName} loaded successfully`);

        // Create mock execution context
        const mockContext = new MockExecuteFunctions(testInputData, {
            mode: 'auto',
            options: {}
        });

        // Test execution
        info(`Testing transformation with input: ${JSON.stringify(testInputData, null, 2)}`);

        const result = await nodeInstance.execute.call(mockContext);

        if (!result || !Array.isArray(result) || result.length === 0) {
            fail('Node execution returned invalid result format');
            return false;
        }

        const output = result[0];
        if (!Array.isArray(output) || output.length === 0) {
            fail('Node execution returned empty output array');
            return false;
        }

        const transformedData = output[0].json;
        pass('Node execution completed successfully');

        // Validate output structure
        if (!transformedData) {
            fail('No transformed data returned');
            return false;
        }

        pass('Transformed data structure present');

        // Test required fields
        const requiredFields = [
            'error',
            'fhir_resource',
            'resource_type',
            'validation_summary',
            'mapping_summary',
            'metadata'
        ];

        let structureValid = true;
        for (const field of requiredFields) {
            if (!(field in transformedData)) {
                fail(`Missing required field: ${field}`);
                structureValid = false;
            } else {
                pass(`Required field present: ${field}`);
            }
        }

        if (!structureValid) {
            return false;
        }

        // Test error status
        if (transformedData.error === true) {
            fail(`Transformation failed with error: ${transformedData.err_message}`);
            return false;
        } else {
            pass('Transformation completed without errors');
        }

        // Test FHIR resource
        if (!transformedData.fhir_resource) {
            fail('No FHIR resource generated');
            return false;
        }

        pass('FHIR resource generated');

        // Test resource type
        const expectedType = expectedResourceTypes[resourceType];
        if (transformedData.resource_type !== expectedType) {
            fail(`Wrong resource type. Expected: ${expectedType}, Got: ${transformedData.resource_type}`);
            return false;
        }

        pass(`Correct resource type: ${expectedType}`);

        // Test FHIR resource structure
        const fhirResource = transformedData.fhir_resource;
        if (fhirResource.resourceType !== expectedType) {
            fail(`FHIR resource has wrong resourceType. Expected: ${expectedType}, Got: ${fhirResource.resourceType}`);
            return false;
        }

        pass(`FHIR resource has correct resourceType: ${expectedType}`);

        // Test that resource has an ID
        if (!fhirResource.id) {
            fail('FHIR resource missing required id field');
            return false;
        }

        pass(`FHIR resource has id: ${fhirResource.id}`);

        // Test mapping summary
        const mappingSummary = transformedData.mapping_summary;
        if (!mappingSummary || typeof mappingSummary !== 'object') {
            fail('Missing or invalid mapping summary');
            return false;
        }

        if (mappingSummary.total_input_fields <= 0) {
            fail('Mapping summary shows no input fields processed');
            return false;
        }

        pass(`Mapping summary shows ${mappingSummary.total_input_fields} input fields processed`);

        // Test validation summary
        const validationSummary = transformedData.validation_summary;
        if (!validationSummary || typeof validationSummary !== 'object') {
            fail('Missing or invalid validation summary');
            return false;
        }

        if (!['valid', 'valid_with_warnings', 'invalid'].includes(validationSummary.status)) {
            fail(`Invalid validation status: ${validationSummary.status}`);
            return false;
        }

        pass(`Validation status: ${validationSummary.status}`);

        // Test metadata
        const metadata = transformedData.metadata;
        if (!metadata || typeof metadata !== 'object') {
            fail('Missing or invalid metadata');
            return false;
        }

        if (!metadata.transformation_time || !metadata.resource_id) {
            fail('Metadata missing required fields');
            return false;
        }

        pass('Metadata contains required fields');

        // Show sample of transformed FHIR resource
        info(`Sample FHIR resource structure:`);
        const sampleFields = Object.keys(fhirResource).slice(0, 5);
        sampleFields.forEach(field => {
            const value = fhirResource[field];
            const displayValue = typeof value === 'object' ? '[Object]' : value;
            info(`  ${field}: ${displayValue}`);
        });

        return true;

    } catch (error) {
        fail(`Transformation test failed with error: ${error.message}`);
        console.log(`Stack trace: ${error.stack}`);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting comprehensive FHIR transformation tests...\n');

    const testCases = [
        ['Patient', 'patient', testData.patient],
        ['Appointment', 'appointment', testData.appointment],
        ['Bundle', 'bundle', testData.bundle],
        ['ClaimResponse', 'claimResponse', testData.claimResponse],
        ['EligibilityResponse', 'eligibilityResponse', testData.eligibilityResponse]
    ];

    let allTestsPassed = true;

    for (const [nodeName, resourceType, inputData] of testCases) {
        const testPassed = await testNodeTransformation(nodeName, resourceType, inputData);
        if (!testPassed) {
            allTestsPassed = false;
        }
        console.log(''); // Add spacing between tests
    }

    // Final summary
    section('Final Test Results');

    const total = passed + failed;
    console.log(`Total assertions: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success rate: ${(passed/total*100).toFixed(1)}%`);

    if (allTestsPassed && failed === 0) {
        console.log('\n🎉 All functional tests passed!');
        console.log('✨ Your FHIR transformation nodes are working correctly.');
        console.log('\n📋 Ready for deployment:');
        console.log('   • All 5 nodes migrated to TypeScript ✅');
        console.log('   • Compilation and loading verified ✅');
        console.log('   • FHIR transformation logic tested ✅');
        console.log('   • Output format validation passed ✅');
        console.log('\n🚀 Next step: Deploy to Docker environment');
        console.log('   docker compose -f docker-compose-typescript.yml up -d');
    } else {
        console.log('\n⚠️  Some functional tests failed.');
        console.log('🔍 Review the failures above and fix before deployment.');

        if (failed < passed) {
            console.log('💡 Most tests passed - likely minor issues to resolve.');
        }
    }

    return allTestsPassed;
}

// Self-test: Ensure all test data is valid JSON
section('Pre-flight Checks');

try {
    for (const [key, data] of Object.entries(testData)) {
        JSON.stringify(data);
        pass(`Test data for ${key} is valid JSON`);
    }
} catch (error) {
    fail(`Test data validation failed: ${error.message}`);
    process.exit(1);
}

// Run the test suite
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('\n💥 Test suite crashed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
});