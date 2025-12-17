#!/usr/bin/env node
// Quick Core Testing Script
// Test FHIR transformation logic without n8n

const { FhirTransformer } = require('./src/utils/fhirTransform');
const { findBestMatch } = require('./src/mapping/patterns');
const { AutoDetector } = require('./src/mapping/autoDetector');

console.log('🧪 FHIR n8n Custom Nodes - Core Logic Testing\n');

// Test 1: Pattern Matching
console.log('📋 Test 1: Pattern Matching');
console.log('============================');

const testFields = [
  'patient_first_name',
  'patient_last_name',
  'dob',
  'phone',
  'mrn',
  'unknown_field'
];

testFields.forEach(field => {
  const match = findBestMatch(field, 'patient');
  if (match) {
    console.log(`✅ ${field} → ${match.fhirField} (${match.confidence}% confidence)`);
  } else {
    console.log(`❌ ${field} → No match found`);
  }
});

console.log('\n📋 Test 2: Auto-Detection Engine');
console.log('=================================');

const testPayload = {
  patient_first_name: 'John',
  patient_last_name: 'Doe',
  dob: '1990-05-15',
  phone: '(555) 123-4567',
  mrn: '12345',
  unknown_field: 'should_be_ignored',
  empty_field: '',
  null_field: null
};

const detector = new AutoDetector('patient');
const detectionResult = detector.detectMappings(testPayload);

console.log(`Total fields: ${detectionResult.totalFields}`);
console.log(`Auto-detected: ${detectionResult.mappedFields}`);
console.log(`High confidence: ${detectionResult.autoApplyable.length}`);
console.log(`Needs review: ${detectionResult.needsReview.length}`);
console.log(`Unmapped: ${detectionResult.unmappedFields}`);

console.log('\nDetected Mappings:');
detectionResult.mappings.forEach(mapping => {
  console.log(`  ${mapping.sourceField} → ${mapping.fhirPath} (${mapping.confidence}%)`);
});

console.log('\n📋 Test 3: Full Transformation');
console.log('==============================');

async function testTransformation() {
  try {
    const transformer = new FhirTransformer('patient');
    const result = await transformer.transform(testPayload, null, { includeDetailedMapping: false });

    console.log('Transformation Status:', result.validation_summary.status);
    console.log('Mapped Fields:', result.validation_summary.mapped_fields);
    console.log('Unmapped Fields:', result.validation_summary.unmapped_fields);

    if (result.validation_summary.warnings.length > 0) {
      console.log('Warnings:', result.validation_summary.warnings);
    }

    if (result.validation_summary.corrections.length > 0) {
      console.log('Auto-corrections:', result.validation_summary.corrections);
    }

    console.log('\n📄 Generated FHIR Resource:');
    console.log(JSON.stringify(result.fhir_resource, null, 2));

  } catch (error) {
    console.error('❌ Transformation failed:', error.message);
  }
}

// Test 4: Manual Override
console.log('\n📋 Test 4: Manual Override');
console.log('==========================');

async function testManualOverride() {
  try {
    const customPayload = {
      custom_patient_name: 'jane smith',
      birth_year: '1985',
      contact_phone: '555-987-6543',
      patient_sex: 'F'
    };

    const userMappings = [
      {
        sourceField: 'custom_patient_name',
        fhirPath: 'name[0].text',
        transformation: 'formatName',
        action: 'override'
      },
      {
        sourceField: 'patient_sex',
        fhirPath: 'gender',
        transformation: 'normalizeGender',
        action: 'override'
      }
    ];

    const transformer = new FhirTransformer('patient');
    const result = await transformer.transform(customPayload, userMappings);

    console.log('Manual Override Status:', result.validation_summary.status);
    console.log('User Overrides Applied:', result.mapping_summary.user_overrides);

    console.log('\n📄 FHIR Resource with Manual Overrides:');
    console.log(JSON.stringify(result.fhir_resource, null, 2));

  } catch (error) {
    console.error('❌ Manual override test failed:', error.message);
  }
}

// Test 5: Error Handling
console.log('\n📋 Test 5: Error Handling (Invalid Data)');
console.log('========================================');

async function testErrorHandling() {
  try {
    const invalidPayload = {
      invalid_date: 'not-a-date',
      invalid_phone: 'abc',
      missing_data: null
    };

    const transformer = new FhirTransformer('patient');
    const result = await transformer.transform(invalidPayload);

    console.log('Error Handling Status:', result.validation_summary.status);
    console.log('Warnings:', result.validation_summary.warnings);
    console.log('Auto-corrections:', result.validation_summary.corrections);

    console.log('\n📄 FHIR Resource (with auto-generated fields):');
    console.log(JSON.stringify(result.fhir_resource, null, 2));

  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  await testTransformation();
  await testManualOverride();
  await testErrorHandling();

  console.log('\n🎉 Core testing complete!');
  console.log('\nNext steps:');
  console.log('1. If all tests passed, proceed to n8n integration testing');
  console.log('2. Follow TESTING_GUIDE.md for full n8n workflow testing');
  console.log('3. Report any failures or unexpected behavior');
}

runTests().catch(console.error);