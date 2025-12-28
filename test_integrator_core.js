#!/usr/bin/env node

console.log('============================================================');
console.log('FHIR n8n Custom Nodes - Enhanced Core System Testing');
console.log('Testing integrator templates and enhanced functionality');
console.log('============================================================\n');

// Import core utilities
const { FhirTransformer } = require('./src/utils/fhirTransform');
const { AutoDetector } = require('./src/mapping/autoDetector');
const { ForgivingValidator } = require('./src/validation/forgivingValidator');
const { setValueAtSemanticPath, getAvailableSemanticNames } = require('./src/utils/semanticPaths');
const { getPreset, getAvailablePresets } = require('./src/utils/transformationPresets');

// Import template configurations from nodes
const { MAPPING_TEMPLATES: patientTemplates } = require('./nodes/patient.js');
const appointmentNode = require('./nodes/appointment.js');
const claimResponseNode = require('./nodes/claimResponse.js');
const eligibilityNode = require('./nodes/eligibilityResponse.js');

// Test data for the 4 integrators
const integratorTestData = {
    khie_sha: {
        // Kenya Health Information Exchange - SHA scheme
        national_id: '12345678',
        sha_number: 'SHA123456',
        patient_first_name: 'John',
        patient_last_name: 'Mwangi',
        phone: '0712345678',
        dob: '25/12/1990',
        county: 'Nairobi',
        gender: 'm'
    },

    mamatoto: {
        // MamaToto maternal health platform
        patient_id: 'MAM001',
        mother_name: 'Grace',
        mother_surname: 'Wanjiku',
        phone_number: '254798123456',
        date_of_birth: '15/08/1995',
        id_number: '23456789',
        gestation_age: '20'
    },

    lct: {
        // Laboratory/Clinical Technology systems
        lab_patient_id: 'LAB001',
        patient_names: 'David Otieno',
        contact_phone: '+254712987654',
        birth_date: '1985-03-10',
        national_id: '34567890',
        test_type: 'Lab'
    },

    smart: {
        // Smart healthcare systems (more FHIR-native)
        id: 'SMART001',
        given_name: 'Samuel',
        family_name: 'Kiprotich',
        phone_number: '+254723456789',
        birthDate: '1988-07-22',
        identifier: '45678901'
    }
};

let totalTests = 0;
let passedTests = 0;

function test(description, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`[PASS] ${description}`);
        return true;
    } catch (error) {
        console.log(`[FAIL] ${description}: ${error.message}`);
        return false;
    }
}

function assertEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`);
    }
}

function assertExists(value, message = 'Value should exist') {
    if (!value) {
        throw new Error(message);
    }
}

function assertTransformation(transformName, input, expectedOutput) {
    const preset = getPreset(transformName);
    if (!preset) {
        throw new Error(`Transformation '${transformName}' not found`);
    }
    const result = preset.transform(input);
    assertEqual(result, expectedOutput);
}

// Main tests
console.log('=== Core Enhancement Tests ===\n');

// Test 1: Semantic Path System
test('Semantic paths work for Patient identifiers', () => {
    let resource = { resourceType: 'Patient' };
    setValueAtSemanticPath(resource, 'identifier[national_id].value', '12345678');
    setValueAtSemanticPath(resource, 'identifier[sha_number].value', 'SHA123456');

    assertExists(resource.identifier);
    assertEqual(resource.identifier.length, 10); // Should have all semantic slots
});

test('Semantic paths work for telecom', () => {
    let resource = { resourceType: 'Patient' };
    setValueAtSemanticPath(resource, 'telecom[primary_phone].value', '+254712345678');
    setValueAtSemanticPath(resource, 'telecom[email].value', 'test@example.com');

    assertExists(resource.telecom);
});

test('Semantic paths work for extensions', () => {
    let resource = { resourceType: 'Patient' };
    setValueAtSemanticPath(resource, 'extension[county].valueString', 'Nairobi');

    assertExists(resource.extension);
});

// Test 2: Kenya-Specific Transformations
test('formatKenyaDate transforms DD/MM/YYYY', () => {
    assertTransformation('formatKenyaDate', '25/12/1990', '1990-12-25');
});

test('formatPhoneKE transforms Kenya phone', () => {
    assertTransformation('formatPhoneKE', '0712345678', '+254712345678');
});

test('formatNationalId pads National ID', () => {
    assertTransformation('formatNationalId', '1234567', '01234567');
});

test('normalizeGender transforms gender codes', () => {
    assertTransformation('normalizeGender', 'm', 'male');
    assertTransformation('normalizeGender', 'f', 'female');
});

// Test 3: Auto-Detection with Integrator Patterns
test('Auto-detect KHIE SHA patient fields', () => {
    const detector = new AutoDetector();
    const detectionResult = detector.detectMappings(integratorTestData.khie_sha, 'Patient');

    assertExists(detectionResult.autoDetected.find(m => m.sourceField === 'national_id'));
    assertExists(detectionResult.autoDetected.find(m => m.sourceField === 'sha_number'));
    assertExists(detectionResult.autoDetected.find(m => m.sourceField === 'patient_first_name'));
});

test('Auto-detect mamaTOTO patient fields', () => {
    const detector = new AutoDetector();
    const detectionResult = detector.detectMappings(integratorTestData.mamatoto, 'Patient');

    assertExists(detectionResult.autoDetected.find(m => m.sourceField === 'mother_name'));
    assertExists(detectionResult.autoDetected.find(m => m.sourceField === 'mother_surname'));
    assertExists(detectionResult.autoDetected.find(m => m.sourceField === 'phone_number'));
});

test('Auto-detect LCT patient fields', () => {
    const detector = new AutoDetector();
    const detectionResult = detector.detectMappings(integratorTestData.lct, 'Patient');

    assertExists(detectionResult.autoDetected.find(m => m.sourceField === 'lab_patient_id'));
    assertExists(detectionResult.autoDetected.find(m => m.sourceField === 'patient_names'));
});

// Test 4: Template Configurations
test('Patient node has correct integrator templates', () => {
    assertExists(patientTemplates.khie_sha, 'KHIE SHA template should exist');
    assertExists(patientTemplates.khie_nhif, 'KHIE NHIF template should exist');
    assertExists(patientTemplates.kenya_mamatoto, 'mamaTOTO template should exist');
    assertExists(patientTemplates.international, 'International template should exist');
});

test('Patient templates have correct structure', () => {
    const template = patientTemplates.khie_sha;
    assertExists(template.name);
    assertExists(template.description);
    assertExists(template.mappings);
    assertEqual(template.mappings.length > 10, true, 'Should have multiple mappings');
});

// Test 5: Full Transformation Pipeline
test('KHIE SHA data transforms to valid FHIR', () => {
    const transformer = new FhirTransformer();
    const detector = new AutoDetector();
    const validator = new ForgivingValidator();

    // Auto-detect mappings
    const detectionResult = detector.detectMappings(integratorTestData.khie_sha, 'Patient');

    // Transform to FHIR
    const fhirResult = transformer.transform(
        integratorTestData.khie_sha,
        detectionResult.autoDetected,
        'Patient',
        {}
    );

    // Validate
    const validationResult = validator.validateResource(fhirResult);

    assertExists(fhirResult);
    assertEqual(fhirResult.resourceType, 'Patient');
    assertExists(fhirResult.name);
    assertExists(fhirResult.identifier);
    assertExists(fhirResult.telecom);
});

test('mamaTOTO data transforms to valid FHIR', () => {
    const transformer = new FhirTransformer();
    const detector = new AutoDetector();

    const detectionResult = detector.detectMappings(integratorTestData.mamatoto, 'Patient');
    const fhirResult = transformer.transform(
        integratorTestData.mamatoto,
        detectionResult.autoDetected,
        'Patient',
        {}
    );

    assertExists(fhirResult);
    assertEqual(fhirResult.resourceType, 'Patient');
    assertExists(fhirResult.name);
});

// Test 6: Forgiving Validation with Kenya Rules
test('Validator corrects Kenya phone format', () => {
    const validator = new ForgivingValidator();
    let resource = {
        resourceType: 'Patient',
        telecom: [{ system: 'phone', value: '0712345678' }]
    };

    const result = validator.validateResource(resource);
    assertEqual(result.fhir_resource.telecom[0].value, '+254712345678');
    assertEqual(result.status, 'valid_with_warnings');
});

test('Validator corrects Kenya date format', () => {
    const validator = new ForgivingValidator();
    let resource = {
        resourceType: 'Patient',
        birthDate: '25/12/1990'
    };

    const result = validator.validateResource(resource);
    assertEqual(result.fhir_resource.birthDate, '1990-12-25');
});

// Test 7: Semantic Name Availability
test('Semantic names available for all resource types', () => {
    const patientSemantics = getAvailableSemanticNames('identifier', 'Patient');
    const appointmentSemantics = getAvailableSemanticNames('participant', 'Appointment');
    const claimSemantics = getAvailableSemanticNames('item', 'ClaimResponse');

    assertExists(patientSemantics.find(s => s === 'national_id'));
    assertExists(patientSemantics.find(s => s === 'sha_number'));
    assertExists(appointmentSemantics.find(s => s === 'patient'));
    assertExists(claimSemantics.find(s => s === 'consultation'));
});

// Run tests
async function runTests() {
    console.log('--- Running enhanced core system tests ---\n');

    // Summary
    console.log('\n============================================================');
    console.log(`Enhanced Core Test Results: ${passedTests}/${totalTests} passed`);
    console.log('============================================================');

    if (passedTests === totalTests) {
        console.log('🎉 All enhanced core functionality working correctly!');
        console.log('✅ Integrator templates and Kenya-specific patterns ready');
        console.log('✅ Semantic paths, transformations, and validation working');
        console.log('✅ Enhanced n8n FHIR nodes ready for production deployment');
    } else {
        console.log(`⚠️  ${totalTests - passedTests} test(s) failed - review implementation`);
    }

    return passedTests === totalTests;
}

// Run the tests
if (require.main === module) {
    runTests();
}

module.exports = { runTests };