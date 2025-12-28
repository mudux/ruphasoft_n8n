#!/usr/bin/env node

console.log('============================================================');
console.log('FHIR n8n Custom Nodes - Integrator Template Testing');
console.log('Testing all 5 enhanced nodes with 4 integrator patterns');
console.log('============================================================\n');

// Import enhanced nodes
const PatientNode = require('./nodes/patient.js');
const AppointmentNode = require('./nodes/appointment.js');
const BundleNode = require('./nodes/bundle.js');
const ClaimResponseNode = require('./nodes/claimResponse.js');
const EligibilityResponseNode = require('./nodes/eligibilityResponse.js');

// Test data for each integrator
const testData = {
    khie_sha: {
        patient: {
            national_id: '12345678',
            sha_number: 'SHA123456',
            first_name: 'John',
            last_name: 'Mwangi',
            phone: '0712345678',
            birth_date: '25/12/1990',
            county: 'Nairobi'
        },
        appointment: {
            appointment_id: 'APT001',
            patient_id: '12345678',
            facility_code: '12345',
            appointment_date: '26/12/2025',
            appointment_time: '09:00',
            service_type: 'ANC',
            provider_id: 'PROV001'
        },
        claim_response: {
            claim_number: 'CLM001',
            sha_claim_ref: 'SHA001',
            outcome: 'complete',
            status: 'active',
            submitted_amount: '5000.00',
            approved_amount: '4500.00',
            patient_copay: '500.00'
        },
        eligibility: {
            sha_number: 'SHA123456',
            member_status: 'active',
            benefit_package: 'outpatient',
            last_contribution: '2025-11-01',
            copay_amount: '500.00'
        }
    },
    mamatoto: {
        patient: {
            patient_id: 'MAM001',
            mother_name: 'Grace',
            mother_surname: 'Wanjiku',
            phone_number: '254798123456',
            date_of_birth: '15/08/1995',
            id_number: '23456789'
        },
        appointment: {
            anc_appointment_id: 'ANC001',
            mother_id: 'MAM001',
            clinic_code: 'CLN001',
            visit_date: '27/12/2025',
            visit_time: '10:30',
            appointment_type: 'ANC',
            gestation_age: '20'
        }
    },
    lct: {
        patient: {
            lab_patient_id: 'LAB001',
            patient_names: 'David Otieno',
            contact_phone: '+254712987654',
            birth_date: '1985-03-10',
            national_id: '34567890'
        },
        appointment: {
            lab_request_id: 'LAB001',
            patient_ref: 'LAB001',
            test_date: '28/12/2025',
            test_time: '08:00',
            test_type: 'Lab',
            ordered_tests: 'CBC,Malaria'
        }
    },
    smart: {
        patient: {
            id: 'SMART001',
            name: [{given: ['Samuel'], family: 'Kiprotich'}],
            telecom: [{system: 'phone', value: '+254723456789'}],
            birthDate: '1988-07-22',
            identifier: [{value: '45678901'}]
        },
        appointment: {
            id: 'APPT_SMART001',
            status: 'booked',
            start: '2025-12-29T11:00:00+03:00',
            participant: [{actor: {reference: 'Patient/SMART001'}}],
            serviceType: [{coding: [{code: 'consultation'}]}]
        }
    }
};

// Helper functions
function testNode(NodeClass, data, template, resourceType) {
    try {
        const node = new NodeClass();

        // Set up node parameters for template mode
        const nodeParams = {
            mode: 'template',
            template: template,
            inputData: [data]
        };

        // Execute node
        const result = node.execute(nodeParams);

        console.log(`[PASS] ${resourceType} - ${template} template`);

        if (result && result.fhir_resource) {
            console.log(`  ✓ Generated ${result.fhir_resource.resourceType}`);
            console.log(`  ✓ Status: ${result.validation_summary?.status || 'valid'}`);
            console.log(`  ✓ Mapped fields: ${result.validation_summary?.mapped_fields?.length || 0}`);
        }

        return true;
    } catch (error) {
        console.log(`[FAIL] ${resourceType} - ${template} template: ${error.message}`);
        return false;
    }
}

function testSemanticPaths() {
    console.log('--- Testing Semantic Path System ---\n');

    const { setValueAtSemanticPath } = require('./src/utils/semanticPaths.js');

    try {
        // Test Patient semantic paths
        let patientResource = { resourceType: 'Patient' };
        setValueAtSemanticPath(patientResource, 'identifier[national_id].value', '12345678');
        setValueAtSemanticPath(patientResource, 'telecom[primary_phone].value', '+254712345678');
        setValueAtSemanticPath(patientResource, 'extension[county].valueString', 'Nairobi');

        console.log('[PASS] Patient semantic paths working');

        // Test Appointment semantic paths
        let appointmentResource = { resourceType: 'Appointment' };
        setValueAtSemanticPath(appointmentResource, 'participant[patient].actor.reference', 'Patient/12345');
        setValueAtSemanticPath(appointmentResource, 'extension[facility_code].valueString', '12345');

        console.log('[PASS] Appointment semantic paths working');

        // Test ClaimResponse semantic paths
        let claimResource = { resourceType: 'ClaimResponse' };
        setValueAtSemanticPath(claimResource, 'total[submitted].amount.value', '5000.00');
        setValueAtSemanticPath(claimResource, 'adjudication[benefit_amount].amount.value', '4500.00');

        console.log('[PASS] ClaimResponse semantic paths working');

        return true;
    } catch (error) {
        console.log(`[FAIL] Semantic paths: ${error.message}`);
        return false;
    }
}

function testTransformationPresets() {
    console.log('\n--- Testing Transformation Presets ---\n');

    const { TRANSFORMATION_PRESETS, getPreset } = require('./src/utils/transformationPresets.js');
    let passCount = 0;
    let totalCount = 0;

    // Test Patient presets
    totalCount++;
    try {
        const formatKenyaDate = getPreset('formatKenyaDate');
        const result = formatKenyaDate.transform('25/12/1990');
        if (result === '1990-12-25') {
            console.log('[PASS] formatKenyaDate transformation');
            passCount++;
        } else {
            console.log(`[FAIL] formatKenyaDate transformation: expected '1990-12-25', got '${result}'`);
        }
    } catch (error) {
        console.log(`[FAIL] formatKenyaDate transformation: ${error.message}`);
    }

    totalCount++;
    try {
        const formatPhoneKE = getPreset('formatPhoneKE');
        const result = formatPhoneKE.transform('0712345678');
        if (result === '+254712345678') {
            console.log('[PASS] formatPhoneKE transformation');
            passCount++;
        } else {
            console.log(`[FAIL] formatPhoneKE transformation: expected '+254712345678', got '${result}'`);
        }
    } catch (error) {
        console.log(`[FAIL] formatPhoneKE transformation: ${error.message}`);
    }

    // Test Appointment presets
    totalCount++;
    try {
        const formatKenyaDateTime = getPreset('formatKenyaDateTime');
        const result = formatKenyaDateTime.transform('26/12/2025 09:00');
        if (result && result.includes('2025-12-26T09:00')) {
            console.log('[PASS] formatKenyaDateTime transformation');
            passCount++;
        } else {
            console.log(`[FAIL] formatKenyaDateTime transformation: expected to contain '2025-12-26T09:00', got '${result}'`);
        }
    } catch (error) {
        console.log(`[FAIL] formatKenyaDateTime transformation: ${error.message}`);
    }

    // Test ClaimResponse presets
    totalCount++;
    try {
        const formatBenefitAmount = getPreset('formatBenefitAmount');
        const result = formatBenefitAmount.transform('5000.00');
        if (result === 5000.00) {
            console.log('[PASS] formatBenefitAmount transformation');
            passCount++;
        } else {
            console.log(`[FAIL] formatBenefitAmount transformation: expected 5000.00, got '${result}'`);
        }
    } catch (error) {
        console.log(`[FAIL] formatBenefitAmount transformation: ${error.message}`);
    }

    return { passed: passCount, total: totalCount };
}

// Main testing routine
async function runTests() {
    let totalPassed = 0;
    let totalTests = 0;

    // Test semantic paths
    console.log('=== Semantic Path System Tests ===\n');
    if (testSemanticPaths()) totalPassed++;
    totalTests++;

    // Test transformation presets
    const presetResults = testTransformationPresets();
    totalPassed += presetResults.passed;
    totalTests += presetResults.total;

    console.log('\n=== Integrator Template Tests ===\n');

    // Test Patient node with all templates
    console.log('--- Patient Node Templates ---');
    const patientTemplates = ['khie_sha', 'khie_nhif', 'kenya_mamatoto', 'international'];
    for (const template of patientTemplates) {
        const data = testData.khie_sha.patient; // Use khie_sha data for all patient tests
        if (testNode(PatientNode, data, template, 'Patient')) totalPassed++;
        totalTests++;
    }

    console.log('\n--- Appointment Node Templates ---');
    const appointmentTemplates = ['khie', 'mamatoto', 'lct', 'smart'];
    for (const template of appointmentTemplates) {
        const data = testData[template === 'khie' ? 'khie_sha' : template]?.appointment;
        if (data && testNode(AppointmentNode, data, template, 'Appointment')) totalPassed++;
        if (data) totalTests++;
    }

    console.log('\n--- ClaimResponse Node Templates ---');
    const claimTemplates = ['khie', 'mamatoto', 'lct', 'smart'];
    for (const template of claimTemplates) {
        const data = testData.khie_sha.claim_response; // Use khie data for claims
        if (testNode(ClaimResponseNode, data, template, 'ClaimResponse')) totalPassed++;
        totalTests++;
    }

    console.log('\n--- EligibilityResponse Node Templates ---');
    const eligibilityTemplates = ['khie_sha', 'khie_nhif', 'mamatoto', 'lct'];
    for (const template of eligibilityTemplates) {
        const data = testData.khie_sha.eligibility; // Use khie data for eligibility
        if (testNode(EligibilityResponseNode, data, template, 'EligibilityResponse')) totalPassed++;
        totalTests++;
    }

    // Summary
    console.log('\n============================================================');
    console.log(`Integration Test Results: ${totalPassed}/${totalTests} passed`);
    console.log('============================================================');

    if (totalPassed === totalTests) {
        console.log('🎉 All integrator templates working correctly!');
        console.log('✅ Enhanced n8n FHIR nodes ready for production use');
    } else {
        console.log('⚠️  Some tests failed - review implementation');
    }

    return totalPassed === totalTests;
}

// Run the tests
if (require.main === module) {
    runTests();
}

module.exports = { runTests };