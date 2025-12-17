// FHIR Field Detection Patterns
// Robust pattern matching for common healthcare data fields

const FHIR_PATTERNS = {
  // Patient Resource Patterns
  patient: {
    // Name patterns
    firstName: /^(patient_)?(first|given|fname|forename)_?name$/i,
    lastName: /^(patient_)?(last|family|surname|lname)_?name$/i,
    fullName: /^(patient_)?(full_?name|name|patient_name)$/i,

    // Demographics
    birthDate: /^(birth_?date|dob|date_of_birth|birthday)$/i,
    gender: /^(gender|sex)$/i,

    // Contact Information
    phone: /^(phone|tel|mobile|contact|telephone)$/i,
    email: /^(email|e_mail|mail)$/i,

    // Identifiers
    mrn: /^(mrn|medical_record|patient_id|chart_number)$/i,
    ssn: /^(ssn|social_security|social_security_number)$/i,

    // Address
    address: /^(address|street|addr)$/i,
    city: /^(city|town)$/i,
    state: /^(state|province|region)$/i,
    zipCode: /^(zip|postal|zipcode|postal_code)$/i,
    country: /^(country|nation)$/i
  },

  // Appointment Resource Patterns
  appointment: {
    appointmentId: /^(appointment_?id|appt_?id|visit_id)$/i,
    dateTime: /^(appointment_?(date|time)|appt_?(date|time)|visit_?(date|time))$/i,
    status: /^(appointment_?status|appt_?status|status)$/i,
    duration: /^(duration|length|appointment_length)$/i,
    reason: /^(reason|purpose|appointment_reason)$/i,
    practitionerId: /^(practitioner|provider|doctor|physician)_?id$/i,
    patientId: /^(patient_?id|chart_?number|mrn)$/i
  },

  // ClaimResponse Patterns
  claimResponse: {
    claimId: /^(claim_?id|claim_number|reference)$/i,
    status: /^(status|claim_status|response_status)$/i,
    outcome: /^(outcome|result|disposition)$/i,
    total: /^(total|amount|claim_amount|paid_amount)$/i,
    paymentAmount: /^(payment|paid|reimbursed?)_?amount$/i,
    denialReason: /^(denial|reject|decline)_?reason$/i
  },

  // EligibilityResponse Patterns
  eligibilityResponse: {
    memberId: /^(member_?id|subscriber_?id|patient_?id)$/i,
    planId: /^(plan_?id|insurance_?id|coverage_?id)$/i,
    status: /^(eligibility_?status|status|active)$/i,
    effectiveDate: /^(effective|start|begin)_?date$/i,
    terminationDate: /^(termination|end|expir)_?date$/i,
    copay: /^(copay|copayment|co_pay)$/i,
    deductible: /^(deductible|ded)$/i
  },

  // Bundle Resource Patterns
  bundle: {
    bundleId: /^(bundle_?id|transaction_?id|batch_?id)$/i,
    type: /^(bundle_?type|type|transaction_type)$/i,
    timestamp: /^(timestamp|created|bundle_date|date_created)$/i,
    total: /^(total|count|total_count|entry_count)$/i,
    entryType: /^(entry_?(type|resource_type)|resource_type)$/i,
    entryId: /^(entry_?(id|resource_id)|resource_id)$/i,
    fullUrl: /^(full_?url|entry_url|resource_url)$/i,
    method: /^(method|request_method|http_method)$/i,
    requestUrl: /^(request_?url|url|endpoint)$/i,
    responseStatus: /^(response_?status|status_code|http_status)$/i
  }
};

// Confidence scoring function
function calculateConfidence(fieldName, pattern) {
  if (!fieldName || !pattern) return 0;

  const match = fieldName.match(pattern);
  if (!match) return 0;

  // Exact match gets highest score
  if (match[0] === fieldName) return 100;

  // Partial matches based on pattern complexity
  if (fieldName.toLowerCase().includes(match[0].toLowerCase())) {
    return 85;
  }

  // Pattern matched but not exact
  return 70;
}

// Find best pattern match for a field
function findBestMatch(fieldName, resourceType) {
  if (!FHIR_PATTERNS[resourceType]) return null;

  const patterns = FHIR_PATTERNS[resourceType];
  let bestMatch = null;
  let highestConfidence = 0;

  for (const [fhirField, pattern] of Object.entries(patterns)) {
    const confidence = calculateConfidence(fieldName, pattern);
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = {
        sourceField: fieldName,
        fhirField: fhirField,
        confidence: confidence,
        pattern: pattern.source
      };
    }
  }

  return bestMatch;
}

module.exports = {
  FHIR_PATTERNS,
  calculateConfidence,
  findBestMatch
};