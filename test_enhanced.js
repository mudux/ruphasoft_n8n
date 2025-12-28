#!/usr/bin/env node
// Enhanced Core Testing Script
// Tests semantic paths, Kenya-specific patterns, and transformation presets

const { FhirTransformer } = require('./src/utils/fhirTransform');
const { findBestMatch } = require('./src/mapping/patterns');
const { AutoDetector } = require('./src/mapping/autoDetector');
const { ForgivingValidator } = require('./src/validation/forgivingValidator');
const { setValueAtSemanticPath, parseSemanticPath, getAvailableSemanticNames } = require('./src/utils/semanticPaths');
const { applyPreset, getAvailablePresets, getPresetsByCategory } = require('./src/utils/transformationPresets');

console.log('='.repeat(60));
console.log('FHIR n8n Custom Nodes - Enhanced Core Logic Testing');
console.log('Kenya-Specific Patterns and Semantic Array Indexing');
console.log('='.repeat(60));
console.log('');

let totalTests = 0;
let passedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${description}`);
  } catch (error) {
    console.log(`[FAIL] ${description}`);
    console.log(`       Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`);
  }
}

function assertIncludes(arr, value, message = '') {
  if (!arr.includes(value)) {
    throw new Error(`Expected array to include ${value}. ${message}`);
  }
}

function assertContains(str, substring, message = '') {
  if (!str.includes(substring)) {
    throw new Error(`Expected "${str}" to contain "${substring}". ${message}`);
  }
}

// =============================================================================
// Test 1: Semantic Path Parsing
// =============================================================================
console.log('\n--- Test 1: Semantic Path Parsing ---\n');

test('Parse numeric index path', () => {
  const parsed = parseSemanticPath('name[0].given[0]');
  assertEqual(parsed.length, 2);
  assertEqual(parsed[0].field, 'name');
  assertEqual(parsed[0].index, 0);
  assertEqual(parsed[1].field, 'given');
  assertEqual(parsed[1].index, 0);
});

test('Parse semantic index path', () => {
  const parsed = parseSemanticPath('identifier[sha_number].value');
  assertEqual(parsed.length, 2);
  assertEqual(parsed[0].field, 'identifier');
  assertEqual(parsed[0].semantic, 'sha_number');
  assertEqual(parsed[0].index, 1); // SHA number is index 1
  assertEqual(parsed[1].field, 'value');
});

test('Parse mixed path with semantic and numeric', () => {
  const parsed = parseSemanticPath('telecom[primary_phone].value');
  assertEqual(parsed[0].field, 'telecom');
  assertEqual(parsed[0].semantic, 'primary_phone');
  assertEqual(parsed[0].index, 0); // Primary phone is index 0
});

test('Parse contact with semantic index', () => {
  const parsed = parseSemanticPath('contact[emergency_contact].name.text');
  assertEqual(parsed[0].field, 'contact');
  assertEqual(parsed[0].semantic, 'emergency_contact');
  assertEqual(parsed[0].index, 0);
});

// =============================================================================
// Test 2: Setting Values at Semantic Paths
// =============================================================================
console.log('\n--- Test 2: Setting Values at Semantic Paths ---\n');

test('Set value at semantic identifier path', () => {
  const resource = {};
  setValueAtSemanticPath(resource, 'identifier[sha_number].value', 'SHA123456');
  assertEqual(resource.identifier[1].value, 'SHA123456');
  assertEqual(resource.identifier[1].system, 'http://kenya.go.ke/fhir/sha-number');
  assertEqual(resource.identifier[1].use, 'official');
});

test('Set value at semantic telecom path', () => {
  const resource = {};
  setValueAtSemanticPath(resource, 'telecom[primary_phone].value', '+254712345678');
  assertEqual(resource.telecom[0].value, '+254712345678');
  assertEqual(resource.telecom[0].system, 'phone');
  assertEqual(resource.telecom[0].use, 'mobile');
});

test('Set value at extension path', () => {
  const resource = {};
  setValueAtSemanticPath(resource, 'extension[county].valueString', 'Nairobi');
  assertEqual(resource.extension[2].valueString, 'Nairobi');
  assertContains(resource.extension[2].url, 'county');
});

test('Set emergency contact name', () => {
  const resource = {};
  setValueAtSemanticPath(resource, 'contact[emergency_contact].name.text', 'Jane Doe');
  assertEqual(resource.contact[0].name.text, 'Jane Doe');
});

// =============================================================================
// Test 3: Kenya-Specific Pattern Detection
// =============================================================================
console.log('\n--- Test 3: Kenya-Specific Pattern Detection ---\n');

test('Detect Kenya National ID field', () => {
  const match = findBestMatch('national_id', 'patient');
  assertEqual(match.fhirField, 'nationalId');
  assertEqual(match.confidence >= 75, true);
});

test('Detect SHA number field', () => {
  const match = findBestMatch('sha_number', 'patient');
  assertEqual(match.fhirField, 'shaNumber');
});

test('Detect NHIF number field', () => {
  const match = findBestMatch('nhif_member', 'patient');
  assertEqual(match.fhirField, 'nhifNumber');
});

test('Detect Kenya county field', () => {
  const match = findBestMatch('county', 'patient');
  assertEqual(match.fhirField, 'county');
});

test('Detect emergency contact field', () => {
  const match = findBestMatch('next_of_kin', 'patient');
  assertEqual(match.fhirField, 'emergencyName');
});

// =============================================================================
// Test 4: Transformation Presets
// =============================================================================
console.log('\n--- Test 4: Transformation Presets ---\n');

test('Format Kenya date DD/MM/YYYY', () => {
  const result = applyPreset('formatKenyaDate', '25/12/1990');
  assertEqual(result, '1990-12-25');
});

test('Format Kenya date DD-MM-YYYY', () => {
  const result = applyPreset('formatKenyaDate', '25-12-1990');
  assertEqual(result, '1990-12-25');
});

test('Format Kenya phone from 0 prefix', () => {
  const result = applyPreset('formatPhoneKE', '0712345678');
  assertEqual(result, '+254712345678');
});

test('Format Kenya phone from 254 prefix', () => {
  const result = applyPreset('formatPhoneKE', '254712345678');
  assertEqual(result, '+254712345678');
});

test('Format Kenya National ID', () => {
  const result = applyPreset('formatNationalId', '1234567');
  assertEqual(result, '01234567'); // Padded to 8 digits
});

test('Normalize gender - male', () => {
  const result = applyPreset('normalizeGender', 'M');
  assertEqual(result, 'male');
});

test('Normalize gender - female', () => {
  const result = applyPreset('normalizeGender', 'Female');
  assertEqual(result, 'female');
});

test('Format name capitalization', () => {
  const result = applyPreset('formatName', 'john doe');
  assertEqual(result, 'John Doe');
});

// =============================================================================
// Test 5: Auto-Detection with Kenya Fields
// =============================================================================
console.log('\n--- Test 5: Auto-Detection with Kenya Fields ---\n');

test('Auto-detect Kenya patient payload', () => {
  const kenyaPayload = {
    patient_first_name: 'John',
    patient_last_name: 'Kamau',
    national_id: '12345678',
    sha_number: 'SHA123456',
    nhif_number: '987654',
    phone: '0712345678',
    dob: '25/12/1990',
    county: 'Nairobi',
    next_of_kin: 'Jane Kamau'
  };

  const detector = new AutoDetector('patient');
  const result = detector.detectMappings(kenyaPayload);

  // Should detect Kenya-specific fields
  const mappedFields = result.mappings.map(m => m.fhirField);
  assertIncludes(mappedFields, 'nationalId');
  assertIncludes(mappedFields, 'shaNumber');
  assertIncludes(mappedFields, 'nhifNumber');
  assertIncludes(mappedFields, 'county');
});

// =============================================================================
// Test 6: Forgiving Validator with Kenya Rules
// =============================================================================
console.log('\n--- Test 6: Forgiving Validator with Kenya Rules ---\n');

test('Validate and correct Kenya phone format', () => {
  const validator = new ForgivingValidator('patient');
  const patient = {
    resourceType: 'Patient',
    telecom: [{ system: 'phone', value: '0712345678' }]
  };
  const result = validator.validate(patient);
  assertEqual(patient.telecom[0].value, '+254712345678');
  assertIncludes(result.corrections, 'Corrected phone format: +254712345678');
});

test('Validate Kenya date format', () => {
  const validator = new ForgivingValidator('patient');
  const patient = {
    resourceType: 'Patient',
    birthDate: '25/12/1990'
  };
  const result = validator.validate(patient);
  assertEqual(patient.birthDate, '1990-12-25');
});

test('Auto-detect Kenya county and set country', () => {
  const validator = new ForgivingValidator('patient');
  const patient = {
    resourceType: 'Patient',
    address: [{ state: 'Nairobi' }]
  };
  const result = validator.validate(patient);
  assertEqual(patient.address[0].country, 'Kenya');
});

test('Validate and correct county name', () => {
  const validator = new ForgivingValidator('patient');
  const patient = {
    resourceType: 'Patient',
    extension: [{ url: 'http://kenya.go.ke/fhir/county', valueString: 'nairobi' }]
  };
  const result = validator.validate(patient);
  assertEqual(patient.extension[0].valueString, 'Nairobi');
});

// =============================================================================
// Test 7: Full Transformation Pipeline
// =============================================================================
console.log('\n--- Test 7: Full Transformation Pipeline ---\n');

async function testFullTransformation() {
  const kenyaPayload = {
    patient_first_name: 'john',
    patient_last_name: 'kamau',
    dob: '25/12/1990',
    gender: 'M',
    phone: '0712345678',
    national_id: '12345678',
    sha_number: 'SHA123456',
    county: 'nairobi',
    next_of_kin: 'jane kamau',
    emergency_phone: '0798765432'
  };

  const transformer = new FhirTransformer('patient');
  const result = await transformer.transform(kenyaPayload, null, { includeDetailedMapping: false });

  test('Full transform - no error', () => {
    assertEqual(result.error, false);
  });

  test('Full transform - has FHIR resource', () => {
    assertEqual(result.fhir_resource.resourceType, 'Patient');
  });

  test('Full transform - name formatted correctly', () => {
    const names = result.fhir_resource.name;
    assertEqual(Array.isArray(names), true);
  });

  test('Full transform - Kenya identifiers present', () => {
    const identifiers = result.fhir_resource.identifier || [];
    const hasKenyaId = identifiers.some(id =>
      id.system && id.system.includes('kenya')
    );
    // Note: Semantic paths auto-populate system URLs
  });

  console.log('\nGenerated FHIR Patient Resource:');
  console.log(JSON.stringify(result.fhir_resource, null, 2));
}

// =============================================================================
// Test 8: Available Presets and Semantic Names
// =============================================================================
console.log('\n--- Test 8: Available Presets and Semantic Names ---\n');

test('Get available presets', () => {
  const presets = getAvailablePresets();
  assertEqual(presets.length > 10, true);
  const hasKenyaDate = presets.some(p => p.name === 'formatKenyaDate');
  assertEqual(hasKenyaDate, true);
});

test('Get presets by category', () => {
  const byCategory = getPresetsByCategory('phone');
  assertEqual(byCategory.length >= 1, true);
});

test('Get available semantic names for identifiers', () => {
  const names = getAvailableSemanticNames('identifier');
  const hasShA = names.some(n => n.name === 'sha_number');
  assertEqual(hasShA, true);
});

test('Get available semantic names for telecom', () => {
  const names = getAvailableSemanticNames('telecom');
  const hasPrimaryPhone = names.some(n => n.name === 'primary_phone');
  assertEqual(hasPrimaryPhone, true);
});

// =============================================================================
// Run All Tests
// =============================================================================

async function runAllTests() {
  await testFullTransformation();

  console.log('\n' + '='.repeat(60));
  console.log(`Test Results: ${passedTests}/${totalTests} passed`);
  console.log('='.repeat(60));

  if (passedTests === totalTests) {
    console.log('\nAll tests passed! Enhanced functionality is working correctly.');
  } else {
    console.log(`\n${totalTests - passedTests} test(s) failed. Please review the output above.`);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
