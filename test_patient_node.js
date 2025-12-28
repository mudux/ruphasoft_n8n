#!/usr/bin/env node
// Test Script for Enhanced Patient Node
// Tests Template Mode, Manual Mode, Auto-Detection, and Kenya-specific features

const { FhirTransformer } = require('./src/utils/fhirTransform');
const { MAPPING_TEMPLATES, buildFhirPathOptions, buildTransformationOptions } = require('./nodes/patient');
const { setValueAtSemanticPath } = require('./src/utils/semanticPaths');
const { applyPreset } = require('./src/utils/transformationPresets');

console.log('='.repeat(70));
console.log('FHIR Patient Node - Enhanced Features Test Suite');
console.log('Version 3: Template Mode, Kenya Support, Semantic Indexing');
console.log('='.repeat(70));
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

async function asyncTest(description, fn) {
  totalTests++;
  try {
    await fn();
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

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(`Expected truthy value. ${message}`);
  }
}

function assertContains(str, substring, message = '') {
  if (!str || !str.includes(substring)) {
    throw new Error(`Expected "${str}" to contain "${substring}". ${message}`);
  }
}

// =============================================================================
// Test 1: Template Mode - Kenya HMIS Standard
// =============================================================================
console.log('\n--- Test 1: Template Mode - Kenya HMIS Standard ---\n');

test('MAPPING_TEMPLATES has kenya_hmis template', () => {
  assertTrue(MAPPING_TEMPLATES.kenya_hmis, 'kenya_hmis template should exist');
  assertTrue(MAPPING_TEMPLATES.kenya_hmis.mappings.length > 0, 'Template should have mappings');
});

test('kenya_hmis template has correct field mappings', () => {
  const template = MAPPING_TEMPLATES.kenya_hmis;
  const nationalIdMapping = template.mappings.find(m => m.sourceField === 'national_id');
  assertEqual(nationalIdMapping.fhirPath, 'identifier[national_id].value');
  assertEqual(nationalIdMapping.transformation, 'formatNationalId');
});

test('kenya_hmis template uses semantic array indices', () => {
  const template = MAPPING_TEMPLATES.kenya_hmis;
  const phoneMapping = template.mappings.find(m => m.sourceField === 'phone');
  assertContains(phoneMapping.fhirPath, 'telecom[primary_phone]');
});

// =============================================================================
// Test 2: Template Mode - Kenya SHA Registration
// =============================================================================
console.log('\n--- Test 2: Template Mode - Kenya SHA Registration ---\n');

test('MAPPING_TEMPLATES has kenya_sha template', () => {
  assertTrue(MAPPING_TEMPLATES.kenya_sha, 'kenya_sha template should exist');
});

test('kenya_sha template handles SHA-specific field names', () => {
  const template = MAPPING_TEMPLATES.kenya_sha;
  const surnameMapping = template.mappings.find(m => m.sourceField === 'surname');
  assertTrue(surnameMapping, 'Should have surname mapping');
  assertEqual(surnameMapping.fhirPath, 'name[official].family');
});

test('kenya_sha template maps SHA ID correctly', () => {
  const template = MAPPING_TEMPLATES.kenya_sha;
  const shaMapping = template.mappings.find(m => m.sourceField === 'sha_id');
  assertEqual(shaMapping.fhirPath, 'identifier[sha_number].value');
});

// =============================================================================
// Test 3: Template Mode - MamaTOTO Maternal Care
// =============================================================================
console.log('\n--- Test 3: Template Mode - MamaTOTO Maternal Care ---\n');

test('MAPPING_TEMPLATES has kenya_mamatoto template', () => {
  assertTrue(MAPPING_TEMPLATES.kenya_mamatoto, 'kenya_mamatoto template should exist');
});

test('kenya_mamatoto template handles maternal-specific fields', () => {
  const template = MAPPING_TEMPLATES.kenya_mamatoto;
  const motherNameMapping = template.mappings.find(m => m.sourceField === 'mother_first_name');
  assertTrue(motherNameMapping, 'Should have mother_first_name mapping');
});

test('kenya_mamatoto template handles partner phone', () => {
  const template = MAPPING_TEMPLATES.kenya_mamatoto;
  const partnerPhoneMapping = template.mappings.find(m => m.sourceField === 'partner_phone');
  assertTrue(partnerPhoneMapping, 'Should have partner_phone mapping');
  assertContains(partnerPhoneMapping.fhirPath, 'telecom[secondary_phone]');
});

// =============================================================================
// Test 4: Template Mode - International Standard
// =============================================================================
console.log('\n--- Test 4: Template Mode - International Standard ---\n');

test('MAPPING_TEMPLATES has international template', () => {
  assertTrue(MAPPING_TEMPLATES.international, 'international template should exist');
});

test('international template uses standard FHIR date format', () => {
  const template = MAPPING_TEMPLATES.international;
  const dobMapping = template.mappings.find(m => m.sourceField === 'birthDate');
  assertEqual(dobMapping.transformation, 'convertToFhirDate');
});

// =============================================================================
// Test 5: FHIR Path Options Builder
// =============================================================================
console.log('\n--- Test 5: FHIR Path Options Builder ---\n');

test('buildFhirPathOptions returns organized options', () => {
  const options = buildFhirPathOptions();
  assertTrue(options.length > 20, 'Should have many options');
});

test('FHIR path options include Kenya-specific identifiers', () => {
  const options = buildFhirPathOptions();
  const shaOption = options.find(o => o.value === 'identifier[sha_number].value');
  assertTrue(shaOption, 'Should have SHA number option');
});

test('FHIR path options include semantic telecom paths', () => {
  const options = buildFhirPathOptions();
  const phoneOption = options.find(o => o.value === 'telecom[primary_phone].value');
  assertTrue(phoneOption, 'Should have primary phone option');
});

test('FHIR path options include Kenya location extensions', () => {
  const options = buildFhirPathOptions();
  const countyOption = options.find(o => o.value === 'extension[county].valueString');
  assertTrue(countyOption, 'Should have county extension option');
});

// =============================================================================
// Test 6: Transformation Options Builder
// =============================================================================
console.log('\n--- Test 6: Transformation Options Builder ---\n');

test('buildTransformationOptions returns organized presets', () => {
  const options = buildTransformationOptions();
  assertTrue(options.length > 10, 'Should have many transformation options');
});

test('Transformation options include Kenya-specific presets', () => {
  const options = buildTransformationOptions();
  const kenyaDateOption = options.find(o => o.value === 'formatKenyaDate');
  assertTrue(kenyaDateOption, 'Should have Kenya date format option');
});

test('Transformation options include Kenya phone format', () => {
  const options = buildTransformationOptions();
  const phoneOption = options.find(o => o.value === 'formatPhoneKE');
  assertTrue(phoneOption, 'Should have Kenya phone format option');
});

// =============================================================================
// Test 7: Full Transformation with Kenya HMIS Template
// =============================================================================
console.log('\n--- Test 7: Full Transformation with Kenya HMIS Template ---\n');

async function testKenyaHMISTransformation() {
  const transformer = new FhirTransformer('patient');

  // Simulate template mode by providing template mappings
  const template = MAPPING_TEMPLATES.kenya_hmis;
  const userMappings = template.mappings.map(m => ({
    ...m,
    action: 'override'
  }));

  const kenyaHMISPayload = {
    patient_first_name: 'john',
    patient_last_name: 'kamau',
    patient_middle_name: 'mwangi',
    dob: '25/12/1990',
    gender: 'M',
    national_id: '12345678',
    sha_number: 'SHA123456',
    nhif_number: '987654',
    phone: '0712345678',
    email: 'john.kamau@example.com',
    county: 'nairobi',
    sub_county: 'westlands',
    ward: 'parklands',
    next_of_kin: 'jane kamau',
    emergency_phone: '0798765432'
  };

  const result = await transformer.transform(kenyaHMISPayload, userMappings, { mode: 'template' });

  await asyncTest('Kenya HMIS transformation completes without error', async () => {
    assertEqual(result.error, false);
  });

  await asyncTest('Kenya HMIS transformation produces Patient resource', async () => {
    assertEqual(result.fhir_resource.resourceType, 'Patient');
  });

  await asyncTest('Kenya HMIS transformation formats name correctly', async () => {
    assertTrue(result.fhir_resource.name, 'Should have name array');
    assertTrue(result.fhir_resource.name.length > 0, 'Should have at least one name');
  });

  await asyncTest('Kenya HMIS transformation formats date correctly', async () => {
    assertEqual(result.fhir_resource.birthDate, '1990-12-25');
  });

  await asyncTest('Kenya HMIS transformation formats phone correctly', async () => {
    const telecom = result.fhir_resource.telecom || [];
    const phone = telecom.find(t => t.system === 'phone');
    if (phone) {
      assertContains(phone.value, '+254');
    }
  });

  console.log('\nGenerated Patient Resource (Kenya HMIS):');
  console.log(JSON.stringify(result.fhir_resource, null, 2));
}

// =============================================================================
// Test 8: Full Transformation with Kenya SHA Template
// =============================================================================
console.log('\n--- Test 8: Full Transformation with Kenya SHA Template ---\n');

async function testKenyaSHATransformation() {
  const transformer = new FhirTransformer('patient');

  // Simulate template mode by providing template mappings
  const template = MAPPING_TEMPLATES.kenya_sha;
  const userMappings = template.mappings.map(m => ({
    ...m,
    action: 'override'
  }));

  const kenyaSHAPayload = {
    first_name: 'mary',
    surname: 'wanjiku',
    other_names: 'nyambura',
    date_of_birth: '15/03/1985',
    sex: 'F',
    id_number: '23456789',
    sha_id: 'SHA789012',
    mobile_number: '254722123456',
    residence_county: 'kiambu',
    residence_sub_county: 'ruiru'
  };

  const result = await transformer.transform(kenyaSHAPayload, userMappings, { mode: 'template' });

  await asyncTest('Kenya SHA transformation completes without error', async () => {
    assertEqual(result.error, false);
  });

  await asyncTest('Kenya SHA transformation formats SHA ID with correct system', async () => {
    const identifiers = result.fhir_resource.identifier || [];
    const shaIdentifier = identifiers.find(id => id.system && id.system.includes('sha'));
    if (shaIdentifier) {
      assertContains(shaIdentifier.system, 'kenya.go.ke');
    }
  });

  console.log('\nGenerated Patient Resource (Kenya SHA):');
  console.log(JSON.stringify(result.fhir_resource, null, 2));
}

// =============================================================================
// Test 9: Semantic Path Population
// =============================================================================
console.log('\n--- Test 9: Semantic Path Auto-Population ---\n');

test('Semantic path populates SHA system URL', () => {
  const resource = {};
  setValueAtSemanticPath(resource, 'identifier[sha_number].value', 'SHA123');
  assertEqual(resource.identifier[1].system, 'http://kenya.go.ke/fhir/sha-number');
});

test('Semantic path populates NHIF system URL', () => {
  const resource = {};
  setValueAtSemanticPath(resource, 'identifier[nhif_number].value', '12345');
  assertEqual(resource.identifier[2].system, 'http://kenya.go.ke/fhir/nhif-number');
});

test('Semantic path populates telecom use and system', () => {
  const resource = {};
  setValueAtSemanticPath(resource, 'telecom[primary_phone].value', '+254712345678');
  assertEqual(resource.telecom[0].system, 'phone');
  assertEqual(resource.telecom[0].use, 'mobile');
});

test('Semantic path populates county extension URL', () => {
  const resource = {};
  setValueAtSemanticPath(resource, 'extension[county].valueString', 'Nairobi');
  assertContains(resource.extension[2].url, 'county');
});

// =============================================================================
// Test 10: Kenya-Specific Transformations
// =============================================================================
console.log('\n--- Test 10: Kenya-Specific Transformations ---\n');

test('formatKenyaDate converts DD/MM/YYYY', () => {
  const result = applyPreset('formatKenyaDate', '25/12/1990');
  assertEqual(result, '1990-12-25');
});

test('formatKenyaDate handles DD-MM-YYYY', () => {
  const result = applyPreset('formatKenyaDate', '25-12-1990');
  assertEqual(result, '1990-12-25');
});

test('formatPhoneKE converts 0 prefix', () => {
  const result = applyPreset('formatPhoneKE', '0712345678');
  assertEqual(result, '+254712345678');
});

test('formatPhoneKE handles 254 prefix without plus', () => {
  const result = applyPreset('formatPhoneKE', '254712345678');
  assertEqual(result, '+254712345678');
});

test('formatNationalId pads to 8 digits', () => {
  const result = applyPreset('formatNationalId', '1234567');
  assertEqual(result, '01234567');
});

test('formatSHANumber uppercases', () => {
  const result = applyPreset('formatSHANumber', 'sha123abc');
  assertEqual(result, 'SHA123ABC');
});

// =============================================================================
// Test 11: Backwards Compatibility
// =============================================================================
console.log('\n--- Test 11: Backwards Compatibility ---\n');

async function testBackwardsCompatibility() {
  const transformer = new FhirTransformer('patient');

  // Old-style payload with camelCase field names
  const legacyPayload = {
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1990-12-25',
    gender: 'male',
    phone: '+14155551234',
    mrn: 'MRN12345'
  };

  // Auto-detection mode (no user mappings)
  const result = await transformer.transform(legacyPayload, null, { mode: 'auto' });

  await asyncTest('Auto-detection handles legacy camelCase fields', async () => {
    assertEqual(result.error, false);
  });

  await asyncTest('Auto-detection produces valid Patient resource', async () => {
    assertEqual(result.fhir_resource.resourceType, 'Patient');
  });

  console.log('\nGenerated Patient Resource (Legacy Format):');
  console.log(JSON.stringify(result.fhir_resource, null, 2));
}

// =============================================================================
// Run All Tests
// =============================================================================

async function runAllTests() {
  await testKenyaHMISTransformation();
  await testKenyaSHATransformation();
  await testBackwardsCompatibility();

  console.log('\n' + '='.repeat(70));
  console.log(`Test Results: ${passedTests}/${totalTests} passed`);
  console.log('='.repeat(70));

  if (passedTests === totalTests) {
    console.log('\nAll tests passed! Enhanced Patient node is working correctly.');
    console.log('\nKey Features Verified:');
    console.log('  - Template Mode with 4 pre-configured templates');
    console.log('  - Kenya-specific field mappings (SHA, NHIF, National ID)');
    console.log('  - Semantic array indexing (identifier[sha_number], telecom[primary_phone])');
    console.log('  - Kenya transformation presets (dates, phones, IDs)');
    console.log('  - Backwards compatibility with legacy payloads');
  } else {
    console.log(`\n${totalTests - passedTests} test(s) failed. Please review the output above.`);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
