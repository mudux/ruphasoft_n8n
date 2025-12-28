// FHIR Field Detection Patterns
// Robust pattern matching for common healthcare data fields
// Enhanced with Kenya-specific patterns (SHA, NHIF, National ID)

const FHIR_PATTERNS = {
  // Patient Resource Patterns
  patient: {
    // Name patterns
    firstName: /^(patient_)?(first|given|fname|forename|other)_?name$/i,
    lastName: /^(patient_)?(last|family|surname|lname)_?name$/i,
    middleName: /^(patient_)?(middle|second)_?name$/i,
    fullName: /^(patient_)?(full_?name|name|patient_name)$/i,

    // Demographics
    birthDate: /^(birth_?date|dob|date_of_birth|birthday)$/i,
    gender: /^(gender|sex)$/i,

    // Contact Information
    phone: /^(phone|tel|mobile|contact|telephone|cell|primary_?phone)$/i,
    secondaryPhone: /^(secondary_?phone|alt_?phone|home_?phone|work_?phone)$/i,
    email: /^(email|e_mail|mail|email_?address)$/i,

    // Standard Identifiers
    mrn: /^(mrn|medical_record|patient_id|chart_number|hospital_?id)$/i,
    ssn: /^(ssn|social_security|social_security_number)$/i,

    // Kenya-specific Identifiers
    nationalId: /^(national_?id|id_?number|kenya_?id|citizen_?id)$/i,
    shaNumber: /^(sha_?number|sha_?id|social_?health_?authority)$/i,
    nhifNumber: /^(nhif_?number|nhif_?id|nhif_?member)$/i,
    passport: /^(passport|passport_?number|travel_?doc)$/i,
    alienId: /^(alien_?id|foreign_?id|refugee_?id)$/i,

    // Address - Standard
    address: /^(address|street|addr|address_?line)$/i,
    city: /^(city|town|urban_?center)$/i,
    state: /^(state|province|region)$/i,
    zipCode: /^(zip|postal|zipcode|postal_?code)$/i,
    country: /^(country|nation)$/i,

    // Address - Kenya specific
    county: /^(county|kenya_?county)$/i,
    subCounty: /^(sub_?county|subcounty|division)$/i,
    ward: /^(ward|location|sub_?location)$/i,
    constituency: /^(constituency|electoral)$/i,

    // Emergency Contact
    emergencyName: /^(emergency_?contact|next_?of_?kin|nok_?name|kin_?name)$/i,
    emergencyPhone: /^(emergency_?phone|nok_?phone|kin_?phone|kin_?contact)$/i,
    emergencyRelation: /^(emergency_?relation|nok_?relation|kin_?relation|relationship)$/i,

    // Insurance/Coverage
    insuranceProvider: /^(insurance_?provider|insurer|payer|coverage_?provider)$/i,
    policyNumber: /^(policy_?number|member_?number|insurance_?id|coverage_?id)$/i,

    // Occupation/Employment
    occupation: /^(occupation|job|profession|employment)$/i,
    employer: /^(employer|company|organization|workplace)$/i,

    // Marital Status
    maritalStatus: /^(marital_?status|married|civil_?status)$/i
  },

  // Appointment Resource Patterns (Enhanced for Kenya healthcare)
  appointment: {
    // Core Identifiers
    appointmentId: /^(appointment_?id|appt_?id|visit_?id|booking_?id|schedule_?id)$/i,
    bookingReference: /^(booking_?(ref|reference|number)|reservation_?(id|number))$/i,
    externalId: /^(external_?id|source_?id|legacy_?id)$/i,
    mohAppointmentId: /^(moh_?(id|appointment)|ministry_?id)$/i,

    // Date/Time Fields
    startDateTime: /^(start|appointment|visit|booking)_?(date|time|datetime)$/i,
    endDateTime: /^(end|finish|completion)_?(date|time|datetime)$/i,
    createdDate: /^(created|booked|registered)_?(date|time|at)$/i,

    // Status and Priority
    status: /^(appointment_?status|appt_?status|booking_?status|status)$/i,
    priority: /^(priority|urgency|importance)$/i,
    cancellationReason: /^(cancel|cancellation)_?reason$/i,

    // Duration
    duration: /^(duration|length|minutes|time_?slot|slot_?duration)$/i,

    // Reason and Description
    reason: /^(reason|purpose|appointment_?reason|visit_?reason|chief_?complaint)$/i,
    description: /^(description|notes|comment|remarks|details)$/i,
    patientInstruction: /^(patient_?instructions?|pre_?visit|preparation|instructions?)$/i,

    // Participants - Patient
    patientId: /^(patient_?id|chart_?number|mrn|patient_?number)$/i,
    patientName: /^(patient_?name|patient|client_?name)$/i,
    patientNationalId: /^(patient_?national_?id|patient_?id_?number|patient_?kenya_?id)$/i,
    patientShaNumber: /^(patient_?sha|sha_?number|sha_?id)$/i,
    patientNhifNumber: /^(patient_?nhif|nhif_?number|nhif_?id|nhif_?member)$/i,

    // Participants - Practitioner/Provider
    practitionerId: /^(practitioner|provider|doctor|physician|clinician)_?id$/i,
    practitionerName: /^(practitioner|provider|doctor|physician|clinician)_?name$/i,
    specialty: /^(specialty|speciality|specialization|department)$/i,

    // Participants - Location/Facility
    locationId: /^(location_?id|facility_?id|clinic_?id|room_?id)$/i,
    locationName: /^(location_?name|facility_?name|clinic_?name|venue)$/i,
    facilityCode: /^(facility_?code|mfl_?code|moh_?code|kmhfl_?code)$/i,

    // Service Type - Kenya Healthcare
    serviceType: /^(service_?type|appointment_?type|visit_?type|service)$/i,
    serviceCategory: /^(service_?category|category|department)$/i,
    serviceCode: /^(service_?code|procedure_?code|cpt_?code)$/i,

    // Kenya-specific Service Types
    ancVisit: /^(anc|antenatal|prenatal)_?(visit|check|appointment)$/i,
    pncVisit: /^(pnc|postnatal|postpartum)_?(visit|check|appointment)$/i,
    immunization: /^(immunization|vaccination|vaccine)_?(visit|appointment)?$/i,
    labTest: /^(lab|laboratory)_?(test|visit|appointment)?$/i,
    chronicCare: /^(chronic|ncd|diabetes|hypertension)_?(care|clinic|visit)?$/i,

    // Referral Information
    referralNumber: /^(referral_?(number|id|code)|ref_?number)$/i,
    referralSource: /^(referral_?(source|from)|referred_?by|source_?facility)$/i,
    appointmentSource: /^(appointment_?source|booking_?source|source|channel)$/i,

    // Slot Reference
    slotId: /^(slot_?id|time_?slot_?id|schedule_?slot)$/i
  },

  // ClaimResponse Patterns - Enhanced for Kenya Insurance (KHIE: SHA/SHIF/NHIF)
  claimResponse: {
    // Claim Identifiers
    claimNumber: /^(claim_?(number|id|ref)|claim_reference|response_id)$/i,
    preauthNumber: /^(preauth|pre_?auth|prior_?auth|authorization)_?(number|id|ref)?$/i,
    invoiceNumber: /^(invoice|bill)_?(number|id|ref)?$/i,
    shaClaimRef: /^(sha_?(claim|ref|id|number)|social_?health_?authority)$/i,
    nhifClaimRef: /^(nhif_?(claim|ref|id|number))$/i,
    shifClaimRef: /^(shif_?(claim|ref|id|number)|social_?health_?insurance)$/i,
    externalRef: /^(external|integrator|source)_?(ref|id|reference)?$/i,

    // Status and Outcome
    status: /^(claim_?)?status$/i,
    outcome: /^(outcome|result|disposition|decision)$/i,
    processNote: /^(process|processing)_?(note|notes|comment|remarks)?$/i,

    // Patient Reference
    patientId: /^(patient_?id|member_?id|beneficiary_?id|mrn)$/i,
    patientReference: /^patient_?(reference|ref)?$/i,

    // Insurer/Payer Reference
    insurerId: /^(insurer|payer|insurance)_?(id|code)?$/i,
    insurerReference: /^(insurer|payer)_?(reference|ref)?$/i,
    insurerName: /^(insurer|payer|insurance)_?name$/i,

    // Original Claim Reference
    requestReference: /^(request|claim)_?(reference|ref)?$/i,
    originalClaimId: /^(original|source)_?claim_?(id|ref)?$/i,

    // Monetary Amounts
    submittedAmount: /^(submitted|claimed|billed|invoice)_?(amount|total)?$/i,
    approvedAmount: /^(approved|allowed|eligible|payable)_?(amount|total)?$/i,
    benefitAmount: /^(benefit|coverage|insurance)_?(amount|payment|paid)?$/i,
    copayAmount: /^(copay|co_?pay|copayment|patient_?share)_?(amount)?$/i,
    deductibleAmount: /^(deductible|ded)_?(amount)?$/i,
    coinsuranceAmount: /^(coinsurance|co_?insurance)_?(amount)?$/i,
    totalAmount: /^total_?(amount|paid|payment)?$/i,

    // Payment Details
    paymentAmount: /^(payment|paid|reimbursed?|settled?)_?(amount)?$/i,
    paymentDate: /^(payment|paid|settlement|remittance)_?date$/i,
    paymentMethod: /^(payment|pay)_?(method|type|mode)$/i,
    paymentReference: /^(payment|remittance)_?(reference|ref|id|number)?$/i,

    // Insurance Scheme (via KHIE)
    insuranceScheme: /^(insurance|coverage)_?(scheme|type|plan)?$/i,
    schemeCode: /^(scheme|plan)_?code$/i,
    schemeName: /^(scheme|plan)_?name$/i,

    // Benefit Category
    benefitCategory: /^(benefit|service)_?(category|type|class)?$/i,
    serviceType: /^(service|care)_?(type|category)$/i,

    // Service Line Items
    itemSequence: /^(item|line|service)_?(sequence|number|seq)?$/i,
    serviceCode: /^(service|procedure|cpt)_?code$/i,
    serviceName: /^(service|procedure)_?(name|description)?$/i,
    serviceDate: /^(service|treatment|encounter)_?date$/i,
    quantity: /^(quantity|qty|units)$/i,
    unitPrice: /^(unit_?price|rate|charge)$/i,

    // Adjudication
    adjudicationCategory: /^(adjudication|adj)_?(category|type)?$/i,
    adjudicationAmount: /^(adjudication|adj)_?(amount|value)?$/i,
    adjudicationCode: /^(adjudication|adj)_?code$/i,
    adjudicationReason: /^(adjudication|adj)_?(reason|note)?$/i,

    // Error/Denial
    errorCode: /^(error|denial|reject|decline)_?code$/i,
    denialReason: /^(denial|reject|decline|error)_?(reason|message|detail)?$/i,
    errorMessage: /^error_?(message|detail|text)?$/i,

    // Facility Information
    facilityCode: /^(facility|provider|hospital)_?code$/i,
    facilityName: /^(facility|provider|hospital)_?name$/i,
    facilityTier: /^(facility|provider)_?(tier|level|category)$/i,

    // Dates
    createdDate: /^(created|creation|submission)_?date$/i,
    processedDate: /^(processed|processing|adjudication)_?date$/i,
    dispositionDate: /^(disposition|decision)_?date$/i,

    // Coverage/Insurance Reference
    coverageId: /^(coverage|insurance|policy)_?id$/i,
    coverageReference: /^coverage_?(reference|ref)?$/i,
    policyNumber: /^(policy|member|card)_?number$/i,

    // Integrator Source (KHIE, mamaTOTO, LCT, Smart)
    integratorSource: /^(integrator|source|channel)_?(code|id|name)?$/i,
    integratorRef: /^(integrator|source)_?(reference|ref)?$/i
  },

  // EligibilityResponse Patterns - Enhanced for Kenya Insurance (KHIE, mamaTOTO, LCT, Smart)
  eligibilityResponse: {
    // Request/Response Identifiers
    requestId: /^(request_?id|eligibility_?request_?id|query_?id|transaction_?id)$/i,
    responseId: /^(response_?id|eligibility_?response_?id|result_?id)$/i,

    // Patient/Member Identifiers
    memberId: /^(member_?id|subscriber_?id|beneficiary_?id|patient_?id)$/i,
    patientReference: /^(patient_?ref|patient_?reference|patient_?link)$/i,
    nationalId: /^(national_?id|id_?number|kenya_?id)$/i,

    // Insurance Scheme Identifiers (KHIE - SHA/SHIF/NHIF)
    shaNumber: /^(sha_?number|sha_?id|sha_?member|social_?health)$/i,
    nhifNumber: /^(nhif_?number|nhif_?id|nhif_?member)$/i,
    shifNumber: /^(shif_?number|shif_?id|shif_?member)$/i,
    householdId: /^(household_?id|family_?id|sha_?household)$/i,

    // Private Insurance (LCT, Smart)
    policyNumber: /^(policy_?number|policy_?id|insurance_?policy)$/i,
    groupNumber: /^(group_?number|group_?id|employer_?group)$/i,
    cardNumber: /^(card_?number|member_?card|insurance_?card)$/i,

    // Coverage/Plan Details
    planId: /^(plan_?id|insurance_?id|coverage_?id|scheme_?id)$/i,
    planName: /^(plan_?name|scheme_?name|insurance_?name|coverage_?name)$/i,
    planType: /^(plan_?type|scheme_?type|coverage_?type|tier)$/i,
    coverageClass: /^(coverage_?class|benefit_?class|package_?type)$/i,

    // Status and Outcome
    status: /^(eligibility_?status|member_?status|coverage_?status|status)$/i,
    outcome: /^(outcome|result|eligibility_?result|decision)$/i,
    inforce: /^(inforce|in_?force|active|is_?active|coverage_?active)$/i,

    // Member Status (KHIE-specific)
    memberStatus: /^(member_?status|beneficiary_?status|contribution_?status)$/i,
    dependentStatus: /^(dependent_?status|dependent_?type|relation_?type)$/i,
    principalMember: /^(principal_?member|primary_?member|head_?of_?household)$/i,

    // Dates
    effectiveDate: /^(effective_?date|start_?date|coverage_?start|begin_?date)$/i,
    terminationDate: /^(termination_?date|end_?date|coverage_?end|expiry_?date)$/i,
    lastContributionDate: /^(last_?contribution|last_?payment|contribution_?date)$/i,
    renewalDate: /^(renewal_?date|next_?renewal|renewal_?due)$/i,
    createdDate: /^(created|created_?date|response_?date|query_?date)$/i,

    // Benefits and Limits (KES currency)
    copay: /^(copay|copayment|co_?pay|patient_?share)$/i,
    coinsurance: /^(coinsurance|co_?insurance|percentage_?share)$/i,
    deductible: /^(deductible|ded|annual_?deductible)$/i,
    outOfPocketMax: /^(oop_?max|out_?of_?pocket|max_?oop|pocket_?limit)$/i,
    benefitLimit: /^(benefit_?limit|coverage_?limit|annual_?limit|max_?benefit)$/i,
    usedAmount: /^(used_?amount|utilized|consumed|spent_?amount)$/i,
    remainingAmount: /^(remaining|balance|available_?amount|remaining_?benefit)$/i,

    // Benefit Categories (Kenya health packages)
    benefitCategory: /^(benefit_?category|service_?category|benefit_?type)$/i,
    benefitCode: /^(benefit_?code|service_?code|package_?code)$/i,

    // Insurer/Payer
    insurerReference: /^(insurer_?ref|payer_?ref|insurer_?reference)$/i,
    insurerName: /^(insurer_?name|payer_?name|insurance_?company)$/i,
    insurerCode: /^(insurer_?code|payer_?code|scheme_?code)$/i,

    // Integrator-specific
    integratorType: /^(integrator|integrator_?type|source_?system)$/i,
    facilityCode: /^(facility_?code|mfl_?code|facility_?id)$/i,

    // Error handling
    errorCode: /^(error_?code|rejection_?code|denial_?code)$/i,
    errorMessage: /^(error_?message|rejection_?reason|denial_?reason)$/i
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