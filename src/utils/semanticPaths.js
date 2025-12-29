// Semantic Path Handler for FHIR Resources
// Supports named array indices like identifier[sha_number], telecom[primary_phone]
// Follows KISS principle - handles common Kenya healthcare patterns only

/**
 * Semantic Array Index Definitions
 * Maps semantic names to array indices and required structure
 */
const SEMANTIC_INDICES = {
  // Patient Identifiers
  identifier: {
    mrn: { index: 0, system: 'http://hospital.example.org/patient-ids', use: 'usual' },
    sha_number: { index: 1, system: 'http://kenya.go.ke/fhir/sha-number', use: 'official' },
    nhif_number: { index: 2, system: 'http://kenya.go.ke/fhir/nhif-number', use: 'secondary' },
    national_id: { index: 3, system: 'http://kenya.go.ke/fhir/national-id', use: 'official' },
    passport: { index: 4, system: 'http://hl7.org/fhir/sid/passport', use: 'secondary' },
    alien_id: { index: 5, system: 'http://kenya.go.ke/fhir/alien-id', use: 'secondary' }
  },

  // Telecom (Contact Information)
  telecom: {
    primary_phone: { index: 0, system: 'phone', use: 'mobile' },
    secondary_phone: { index: 1, system: 'phone', use: 'home' },
    work_phone: { index: 2, system: 'phone', use: 'work' },
    email: { index: 3, system: 'email', use: 'home' },
    work_email: { index: 4, system: 'email', use: 'work' }
  },

  // Name structures
  name: {
    official: { index: 0, use: 'official' },
    nickname: { index: 1, use: 'nickname' },
    maiden: { index: 2, use: 'maiden' }
  },

  // Address structures
  address: {
    home: { index: 0, use: 'home' },
    work: { index: 1, use: 'work' },
    temporary: { index: 2, use: 'temp' }
  },

  // Contact (Emergency/Next of Kin)
  contact: {
    emergency_contact: { index: 0, purpose: 'emergency' },
    next_of_kin: { index: 1, purpose: 'next-of-kin' },
    employer: { index: 2, purpose: 'employer' }
  },

  // Extension patterns for Kenya
  extension: {
    nhif_status: {
      index: 0,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/nhif-status'
    },
    sha_status: {
      index: 1,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/sha-status'
    },
    county: {
      index: 2,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/county'
    },
    sub_county: {
      index: 3,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/sub-county'
    },
    ward: {
      index: 4,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/ward'
    },
    occupation: {
      index: 5,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/occupation'
    },
    // Appointment-specific extensions
    facility_code: {
      index: 6,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/moh-facility-code'
    },
    appointment_source: {
      index: 7,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/appointment-source'
    },
    referral_number: {
      index: 8,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/referral-number'
    }
  },

  // Appointment Identifiers
  appointment_identifier: {
    appointment_id: { index: 0, system: 'http://hospital.example.org/appointment-ids', use: 'usual' },
    booking_reference: { index: 1, system: 'http://hospital.example.org/booking-refs', use: 'official' },
    external_id: { index: 2, system: 'http://external.system/appointment-ids', use: 'secondary' },
    moh_appointment: { index: 3, system: 'http://kenya.go.ke/fhir/moh-appointment-id', use: 'official' }
  },

  // Appointment Participants
  participant: {
    patient: { index: 0, type: 'Patient', required: true },
    practitioner: { index: 1, type: 'Practitioner', required: false },
    location: { index: 2, type: 'Location', required: false },
    healthcare_service: { index: 3, type: 'HealthcareService', required: false },
    device: { index: 4, type: 'Device', required: false }
  },

  // Service Types for Kenya Healthcare
  serviceType: {
    general_consultation: { index: 0, code: 'GEN', display: 'General Consultation' },
    anc_visit: { index: 1, code: 'ANC', display: 'Antenatal Care Visit' },
    pnc_visit: { index: 2, code: 'PNC', display: 'Postnatal Care Visit' },
    immunization: { index: 3, code: 'IMM', display: 'Immunization' },
    lab_test: { index: 4, code: 'LAB', display: 'Laboratory Test' },
    imaging: { index: 5, code: 'IMG', display: 'Imaging/Radiology' },
    dental: { index: 6, code: 'DEN', display: 'Dental Services' },
    eye_care: { index: 7, code: 'EYE', display: 'Eye Care Services' },
    mental_health: { index: 8, code: 'MHT', display: 'Mental Health' },
    chronic_care: { index: 9, code: 'CHR', display: 'Chronic Disease Management' },
    emergency: { index: 10, code: 'EMR', display: 'Emergency Services' },
    specialist: { index: 11, code: 'SPC', display: 'Specialist Consultation' }
  },

  // Reason Codes for Kenya Healthcare
  reasonCode: {
    routine_checkup: { index: 0, code: 'ROUTINE', display: 'Routine Checkup' },
    follow_up: { index: 1, code: 'FOLLOWUP', display: 'Follow-up Visit' },
    new_complaint: { index: 2, code: 'NEWCOMP', display: 'New Complaint' },
    referral: { index: 3, code: 'REFERRAL', display: 'Referral' },
    emergency: { index: 4, code: 'EMERGENCY', display: 'Emergency' },
    scheduled_procedure: { index: 5, code: 'PROCEDURE', display: 'Scheduled Procedure' },
    results_review: { index: 6, code: 'RESULTS', display: 'Results Review' }
  },

  // =====================================================
  // ClaimResponse-Specific Semantic Indices
  // =====================================================

  // ClaimResponse Identifiers (via KHIE for SHA/SHIF/NHIF)
  claim_identifier: {
    claim_number: { index: 0, system: 'http://kenya.go.ke/fhir/claim-number', use: 'official' },
    preauth_number: { index: 1, system: 'http://kenya.go.ke/fhir/preauth-number', use: 'secondary' },
    invoice_number: { index: 2, system: 'http://hospital.example.org/invoice-number', use: 'usual' },
    sha_claim_ref: { index: 3, system: 'http://kenya.go.ke/fhir/sha-claim-ref', use: 'official' },
    nhif_claim_ref: { index: 4, system: 'http://kenya.go.ke/fhir/nhif-claim-ref', use: 'official' },
    shif_claim_ref: { index: 5, system: 'http://kenya.go.ke/fhir/shif-claim-ref', use: 'official' },
    external_ref: { index: 6, system: 'http://external.integrator/claim-ref', use: 'secondary' }
  },

  // ClaimResponse Total Categories (submitted, approved, patient responsibility)
  total: {
    submitted: { index: 0, category: 'submitted', code: 'submitted', display: 'Submitted Amount' },
    approved: { index: 1, category: 'benefit', code: 'benefit', display: 'Approved Benefit' },
    patient_responsibility: { index: 2, category: 'copay', code: 'copay', display: 'Patient Copay' },
    deductible: { index: 3, category: 'deductible', code: 'deductible', display: 'Deductible' },
    coinsurance: { index: 4, category: 'coinsurance', code: 'coinsurance', display: 'Coinsurance' }
  },

  // ClaimResponse Item (Service Line Items)
  item: {
    consultation: { index: 0, category: 'consultation', code: 'CONSULT' },
    lab_service: { index: 1, category: 'laboratory', code: 'LAB' },
    radiology: { index: 2, category: 'radiology', code: 'RAD' },
    pharmacy: { index: 3, category: 'pharmacy', code: 'PHARM' },
    procedure: { index: 4, category: 'procedure', code: 'PROC' },
    nursing: { index: 5, category: 'nursing', code: 'NURS' },
    room_board: { index: 6, category: 'room', code: 'ROOM' },
    maternity: { index: 7, category: 'maternity', code: 'MAT' },
    surgical: { index: 8, category: 'surgical', code: 'SURG' },
    dental: { index: 9, category: 'dental', code: 'DENT' },
    optical: { index: 10, category: 'optical', code: 'OPT' }
  },

  // Adjudication Categories (per item)
  adjudication: {
    benefit_amount: { index: 0, category: 'benefit', code: 'benefit', display: 'Benefit Amount' },
    copay: { index: 1, category: 'copay', code: 'copay', display: 'Copayment' },
    deductible: { index: 2, category: 'deductible', code: 'deductible', display: 'Deductible' },
    submitted: { index: 3, category: 'submitted', code: 'submitted', display: 'Submitted Amount' },
    eligible: { index: 4, category: 'eligible', code: 'eligible', display: 'Eligible Amount' },
    tax: { index: 5, category: 'tax', code: 'tax', display: 'Tax' }
  },

  // Insurance Array (primary, secondary)
  insurance: {
    primary: { index: 0, focal: true, sequence: 1 },
    secondary: { index: 1, focal: false, sequence: 2 },
    tertiary: { index: 2, focal: false, sequence: 3 }
  },

  // Kenya Insurance Scheme Types (via KHIE integrator)
  insurance_scheme: {
    sha: { code: 'SHA', display: 'Social Health Authority', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    shif: { code: 'SHIF', display: 'Social Health Insurance Fund', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    nhif: { code: 'NHIF', display: 'National Hospital Insurance Fund', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    private: { code: 'PRIVATE', display: 'Private Insurance', system: 'http://kenya.go.ke/fhir/insurance-scheme' }
  },

  // Kenya Benefit Categories
  benefit_category: {
    outpatient: { code: 'OP', display: 'Outpatient Services', system: 'http://kenya.go.ke/fhir/benefit-category' },
    inpatient: { code: 'IP', display: 'Inpatient Services', system: 'http://kenya.go.ke/fhir/benefit-category' },
    maternity: { code: 'MAT', display: 'Maternity Services', system: 'http://kenya.go.ke/fhir/benefit-category' },
    surgical: { code: 'SURG', display: 'Surgical Services', system: 'http://kenya.go.ke/fhir/benefit-category' },
    dental: { code: 'DENT', display: 'Dental Services', system: 'http://kenya.go.ke/fhir/benefit-category' },
    optical: { code: 'OPT', display: 'Optical Services', system: 'http://kenya.go.ke/fhir/benefit-category' },
    chronic: { code: 'CHR', display: 'Chronic Disease Management', system: 'http://kenya.go.ke/fhir/benefit-category' },
    emergency: { code: 'EMR', display: 'Emergency Services', system: 'http://kenya.go.ke/fhir/benefit-category' },
    rehabilitation: { code: 'REHAB', display: 'Rehabilitation Services', system: 'http://kenya.go.ke/fhir/benefit-category' },
    mental_health: { code: 'MH', display: 'Mental Health Services', system: 'http://kenya.go.ke/fhir/benefit-category' }
  },

  // ClaimResponse Error Codes
  claim_error: {
    invalid_member: { index: 0, code: 'INV_MBR', display: 'Invalid Member ID' },
    expired_coverage: { index: 1, code: 'EXP_COV', display: 'Coverage Expired' },
    benefit_exceeded: { index: 2, code: 'BEN_EXC', display: 'Benefit Limit Exceeded' },
    preauth_required: { index: 3, code: 'PREAUTH', display: 'Pre-authorization Required' },
    duplicate_claim: { index: 4, code: 'DUP_CLM', display: 'Duplicate Claim' },
    invalid_service: { index: 5, code: 'INV_SVC', display: 'Invalid Service Code' },
    invalid_diagnosis: { index: 6, code: 'INV_DX', display: 'Invalid Diagnosis Code' },
    facility_not_accredited: { index: 7, code: 'FAC_NA', display: 'Facility Not Accredited' },
    waiting_period: { index: 8, code: 'WAIT_PD', display: 'Waiting Period Not Met' }
  },

  // ClaimResponse Extensions (Kenya-specific)
  claim_extension: {
    claim_type: {
      index: 0,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/claim-type'
    },
    benefit_category: {
      index: 1,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/benefit-category'
    },
    facility_tier: {
      index: 2,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/facility-tier'
    },
    integrator_source: {
      index: 3,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/integrator-source'
    },
    processing_notes: {
      index: 4,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/processing-notes'
    }
  },

  // =====================================================
  // EligibilityResponse-Specific Semantic Indices
  // Enhanced for Kenya Insurance (KHIE, mamaTOTO, LCT, Smart)
  // =====================================================

  // EligibilityResponse Identifiers
  eligibility_identifier: {
    request_id: { index: 0, system: 'http://kenya.go.ke/fhir/eligibility-request-id', use: 'official' },
    response_id: { index: 1, system: 'http://kenya.go.ke/fhir/eligibility-response-id', use: 'official' },
    transaction_id: { index: 2, system: 'http://integrator.example.org/transaction-id', use: 'secondary' }
  },

  // Member/Patient Identifiers in Eligibility Context
  eligibility_member_identifier: {
    sha_number: { index: 0, system: 'http://kenya.go.ke/fhir/sha-number', use: 'official' },
    nhif_number: { index: 1, system: 'http://kenya.go.ke/fhir/nhif-number', use: 'official' },
    shif_number: { index: 2, system: 'http://kenya.go.ke/fhir/shif-number', use: 'official' },
    household_id: { index: 3, system: 'http://kenya.go.ke/fhir/sha-household-id', use: 'secondary' },
    national_id: { index: 4, system: 'http://kenya.go.ke/fhir/national-id', use: 'official' },
    policy_number: { index: 5, system: 'http://insurance.example.org/policy-number', use: 'usual' },
    member_card: { index: 6, system: 'http://insurance.example.org/member-card', use: 'secondary' }
  },

  // Coverage/Insurance entries in EligibilityResponse
  eligibility_insurance: {
    primary_cover: { index: 0, focal: true },
    secondary_cover: { index: 1, focal: false },
    tertiary_cover: { index: 2, focal: false }
  },

  // Benefit Item Categories (Kenya Health Packages)
  eligibility_item: {
    outpatient: { index: 0, category: 'outpatient', code: 'OP', display: 'Outpatient Services' },
    inpatient: { index: 1, category: 'inpatient', code: 'IP', display: 'Inpatient Services' },
    maternity: { index: 2, category: 'maternity', code: 'MAT', display: 'Maternity Services' },
    surgical: { index: 3, category: 'surgical', code: 'SURG', display: 'Surgical Services' },
    dental: { index: 4, category: 'dental', code: 'DENT', display: 'Dental Services' },
    optical: { index: 5, category: 'optical', code: 'OPT', display: 'Optical Services' },
    chronic: { index: 6, category: 'chronic', code: 'CHR', display: 'Chronic Disease Management' },
    emergency: { index: 7, category: 'emergency', code: 'EMR', display: 'Emergency Services' },
    mental_health: { index: 8, category: 'mental_health', code: 'MH', display: 'Mental Health Services' },
    rehabilitation: { index: 9, category: 'rehabilitation', code: 'REHAB', display: 'Rehabilitation Services' },
    pharmacy: { index: 10, category: 'pharmacy', code: 'PHARM', display: 'Pharmacy Benefits' },
    laboratory: { index: 11, category: 'laboratory', code: 'LAB', display: 'Laboratory Services' },
    radiology: { index: 12, category: 'radiology', code: 'RAD', display: 'Radiology/Imaging' }
  },

  // Benefit Types within Items (copay, deductible, limit, etc.)
  eligibility_benefit: {
    copay: { index: 0, type: 'copay', code: 'copay', display: 'Copayment' },
    coinsurance: { index: 1, type: 'coinsurance', code: 'coinsurance', display: 'Coinsurance Percentage' },
    deductible: { index: 2, type: 'deductible', code: 'deductible', display: 'Deductible Amount' },
    annual_limit: { index: 3, type: 'benefit', code: 'benefit', display: 'Annual Benefit Limit' },
    visit_limit: { index: 4, type: 'visit', code: 'visit', display: 'Visit Limit' },
    used_amount: { index: 5, type: 'used', code: 'used', display: 'Amount Used' },
    remaining_amount: { index: 6, type: 'remaining', code: 'remaining', display: 'Remaining Balance' },
    out_of_pocket_max: { index: 7, type: 'oop', code: 'oop', display: 'Out of Pocket Maximum' }
  },

  // Kenya Insurance Scheme Codes (via KHIE integrator)
  eligibility_scheme: {
    sha: { code: 'SHA', display: 'Social Health Authority', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    shif: { code: 'SHIF', display: 'Social Health Insurance Fund', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    nhif: { code: 'NHIF', display: 'National Hospital Insurance Fund (Legacy)', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    private_jubilee: { code: 'JUB', display: 'Jubilee Insurance', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    private_aar: { code: 'AAR', display: 'AAR Insurance', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    private_resolution: { code: 'RES', display: 'Resolution Insurance', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    private_britam: { code: 'BRI', display: 'Britam Insurance', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    private_madison: { code: 'MAD', display: 'Madison Insurance', system: 'http://kenya.go.ke/fhir/insurance-scheme' },
    private_other: { code: 'OTH', display: 'Other Private Insurance', system: 'http://kenya.go.ke/fhir/insurance-scheme' }
  },

  // Member Status Codes
  eligibility_member_status: {
    active: { code: 'active', display: 'Active Member' },
    inactive: { code: 'inactive', display: 'Inactive Member' },
    suspended: { code: 'suspended', display: 'Suspended (Arrears)' },
    pending: { code: 'pending', display: 'Pending Activation' },
    terminated: { code: 'terminated', display: 'Terminated' },
    deceased: { code: 'deceased', display: 'Deceased' }
  },

  // Dependent Relationship Types
  eligibility_dependent_type: {
    principal: { code: 'principal', display: 'Principal Member' },
    spouse: { code: 'spouse', display: 'Spouse' },
    child: { code: 'child', display: 'Child' },
    parent: { code: 'parent', display: 'Parent' },
    other_dependent: { code: 'other', display: 'Other Dependent' }
  },

  // Eligibility Error Codes
  eligibility_error: {
    invalid_member: { index: 0, code: 'INV_MBR', display: 'Invalid Member ID' },
    expired_coverage: { index: 1, code: 'EXP_COV', display: 'Coverage Expired' },
    contribution_arrears: { index: 2, code: 'ARREARS', display: 'Contribution Arrears' },
    member_suspended: { index: 3, code: 'SUSPENDED', display: 'Member Suspended' },
    not_found: { index: 4, code: 'NOT_FOUND', display: 'Member Not Found' },
    facility_not_accredited: { index: 5, code: 'FAC_NA', display: 'Facility Not Accredited' },
    service_not_covered: { index: 6, code: 'SVC_NC', display: 'Service Not Covered' },
    waiting_period: { index: 7, code: 'WAIT_PD', display: 'Waiting Period Not Met' },
    preauth_required: { index: 8, code: 'PREAUTH', display: 'Pre-authorization Required' },
    limit_exceeded: { index: 9, code: 'LIM_EXC', display: 'Benefit Limit Exceeded' }
  },

  // EligibilityResponse Extensions (Kenya-specific)
  eligibility_extension: {
    integrator_source: {
      index: 0,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/integrator-source'
    },
    member_status: {
      index: 1,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/member-status'
    },
    dependent_type: {
      index: 2,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/dependent-type'
    },
    last_contribution_date: {
      index: 3,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/last-contribution-date'
    },
    household_id: {
      index: 4,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/sha-household-id'
    },
    principal_member_ref: {
      index: 5,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/principal-member-reference'
    },
    facility_network: {
      index: 6,
      url: 'http://kenya.go.ke/fhir/StructureDefinition/facility-network-status'
    }
  }
};

/**
 * Parse a path part that may contain semantic array index
 * Examples:
 *   'identifier[sha_number]' -> { field: 'identifier', index: 1, semantic: 'sha_number', meta: {...} }
 *   'telecom[primary_phone]' -> { field: 'telecom', index: 0, semantic: 'primary_phone', meta: {...} }
 *   'name[0]' -> { field: 'name', index: 0, semantic: null, meta: null }
 */
function parseSemanticPathPart(part) {
  // Check for array notation
  const arrayMatch = part.match(/^([^[]+)\[([^\]]+)\]$/);

  if (!arrayMatch) {
    // No array notation - simple field
    return { field: part, index: null, semantic: null, meta: null };
  }

  const field = arrayMatch[1];
  const indexOrName = arrayMatch[2];

  // Check if it's a numeric index
  if (/^\d+$/.test(indexOrName)) {
    return {
      field,
      index: parseInt(indexOrName, 10),
      semantic: null,
      meta: null
    };
  }

  // It's a semantic name - look up the definition
  const semanticDef = SEMANTIC_INDICES[field];
  if (semanticDef && semanticDef[indexOrName]) {
    const meta = semanticDef[indexOrName];
    return {
      field,
      index: meta.index,
      semantic: indexOrName,
      meta
    };
  }

  // Unknown semantic name - treat as index 0 with warning
  console.warn(`Unknown semantic index: ${field}[${indexOrName}], defaulting to index 0`);
  return {
    field,
    index: 0,
    semantic: indexOrName,
    meta: null,
    warning: `Unknown semantic index: ${indexOrName}`
  };
}

/**
 * Parse full FHIR path with semantic indices
 * Example: 'identifier[sha_number].value' -> array of parsed parts
 */
function parseSemanticPath(fhirPath) {
  const parts = fhirPath.split('.');
  return parts.map(parseSemanticPathPart);
}

/**
 * Set value at FHIR path with semantic index support
 * Automatically populates required metadata (system, use, url) for semantic indices
 */
function setValueAtSemanticPath(resource, fhirPath, value) {
  const parsedParts = parseSemanticPath(fhirPath);
  let current = resource;

  for (let i = 0; i < parsedParts.length - 1; i++) {
    const { field, index, meta } = parsedParts[i];

    if (index !== null) {
      // Array handling
      if (!current[field]) {
        current[field] = [];
      }

      // Ensure array has enough elements
      while (current[field].length <= index) {
        current[field].push({});
      }

      // Apply semantic metadata if present
      if (meta) {
        applySemanticMeta(current[field][index], field, meta);
      }

      current = current[field][index];
    } else {
      // Object handling
      if (!current[field]) {
        current[field] = {};
      }
      current = current[field];
    }
  }

  // Handle final part
  const lastPart = parsedParts[parsedParts.length - 1];
  const { field, index, meta } = lastPart;

  if (index !== null) {
    if (!current[field]) current[field] = [];
    while (current[field].length <= index) {
      current[field].push(null);
    }

    // If setting to a primitive value in an array with semantic meta
    if (meta && typeof value !== 'object') {
      // Create object with metadata and value
      const obj = {};
      applySemanticMeta(obj, field, meta);
      obj.value = value;
      current[field][index] = obj;
    } else {
      current[field][index] = value;
      if (meta && typeof current[field][index] === 'object') {
        applySemanticMeta(current[field][index], field, meta);
      }
    }
  } else {
    current[field] = value;
  }

  return resource;
}

/**
 * Apply semantic metadata to an object based on field type
 */
function applySemanticMeta(obj, field, meta) {
  switch (field) {
    case 'identifier':
    case 'appointment_identifier':
      if (meta.system) obj.system = meta.system;
      if (meta.use) obj.use = meta.use;
      break;

    case 'telecom':
      if (meta.system) obj.system = meta.system;
      if (meta.use) obj.use = meta.use;
      break;

    case 'name':
      if (meta.use) obj.use = meta.use;
      break;

    case 'address':
      if (meta.use) obj.use = meta.use;
      break;

    case 'contact':
      if (meta.purpose) {
        obj.relationship = obj.relationship || [];
        if (!obj.relationship.some(r => r.coding?.[0]?.code === meta.purpose)) {
          obj.relationship.push({
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
              code: meta.purpose === 'emergency' ? 'C' :
                    meta.purpose === 'next-of-kin' ? 'N' : 'E'
            }]
          });
        }
      }
      break;

    case 'extension':
      if (meta.url) obj.url = meta.url;
      break;

    // Appointment-specific participant handling
    case 'participant':
      if (meta.type) {
        obj.actor = obj.actor || {};
        obj.actor.type = meta.type;
        obj.required = meta.required ? 'required' : 'optional';
        obj.status = obj.status || 'accepted';
      }
      break;

    // Service type handling for appointments
    case 'serviceType':
      if (meta.code && meta.display) {
        obj.coding = obj.coding || [];
        if (!obj.coding.some(c => c.code === meta.code)) {
          obj.coding.push({
            system: 'http://kenya.go.ke/fhir/CodeSystem/service-type',
            code: meta.code,
            display: meta.display
          });
        }
        obj.text = obj.text || meta.display;
      }
      break;

    // Reason code handling for appointments
    case 'reasonCode':
      if (meta.code && meta.display) {
        obj.coding = obj.coding || [];
        if (!obj.coding.some(c => c.code === meta.code)) {
          obj.coding.push({
            system: 'http://kenya.go.ke/fhir/CodeSystem/appointment-reason',
            code: meta.code,
            display: meta.display
          });
        }
        obj.text = obj.text || meta.display;
      }
      break;

    // =====================================================
    // ClaimResponse-Specific Semantic Metadata
    // =====================================================

    // ClaimResponse identifiers
    case 'claim_identifier':
      if (meta.system) obj.system = meta.system;
      if (meta.use) obj.use = meta.use;
      break;

    // ClaimResponse total categories
    case 'total':
      if (meta.category) {
        obj.category = obj.category || {};
        obj.category.coding = obj.category.coding || [];
        if (!obj.category.coding.some(c => c.code === meta.code)) {
          obj.category.coding.push({
            system: 'http://terminology.hl7.org/CodeSystem/adjudication',
            code: meta.code,
            display: meta.display
          });
        }
      }
      break;

    // ClaimResponse item (service line)
    case 'item':
      if (meta.category) {
        obj.productOrService = obj.productOrService || {};
        obj.productOrService.coding = obj.productOrService.coding || [];
        if (!obj.productOrService.coding.some(c => c.code === meta.code)) {
          obj.productOrService.coding.push({
            system: 'http://kenya.go.ke/fhir/CodeSystem/service-category',
            code: meta.code,
            display: meta.category
          });
        }
      }
      break;

    // Adjudication categories
    case 'adjudication':
      if (meta.category) {
        obj.category = obj.category || {};
        obj.category.coding = obj.category.coding || [];
        if (!obj.category.coding.some(c => c.code === meta.code)) {
          obj.category.coding.push({
            system: 'http://terminology.hl7.org/CodeSystem/adjudication',
            code: meta.code,
            display: meta.display
          });
        }
      }
      break;

    // Insurance ordering
    case 'insurance':
      if (meta.focal !== undefined) obj.focal = meta.focal;
      if (meta.sequence !== undefined) obj.sequence = meta.sequence;
      break;

    // ClaimResponse extensions
    case 'claim_extension':
      if (meta.url) obj.url = meta.url;
      break;

    // Claim error codes
    case 'claim_error':
      if (meta.code && meta.display) {
        obj.code = obj.code || {};
        obj.code.coding = obj.code.coding || [];
        if (!obj.code.coding.some(c => c.code === meta.code)) {
          obj.code.coding.push({
            system: 'http://kenya.go.ke/fhir/CodeSystem/claim-error',
            code: meta.code,
            display: meta.display
          });
        }
      }
      break;

    // =====================================================
    // EligibilityResponse-Specific Semantic Metadata
    // =====================================================

    // Eligibility identifiers
    case 'eligibility_identifier':
      if (meta.system) obj.system = meta.system;
      if (meta.use) obj.use = meta.use;
      break;

    // Member identifiers in eligibility context
    case 'eligibility_member_identifier':
      if (meta.system) obj.system = meta.system;
      if (meta.use) obj.use = meta.use;
      break;

    // Eligibility insurance entries
    case 'eligibility_insurance':
      if (meta.focal !== undefined) obj.focal = meta.focal;
      break;

    // Eligibility benefit items (health package categories)
    case 'eligibility_item':
      if (meta.category && meta.code) {
        obj.category = obj.category || {};
        obj.category.coding = obj.category.coding || [];
        if (!obj.category.coding.some(c => c.code === meta.code)) {
          obj.category.coding.push({
            system: 'http://kenya.go.ke/fhir/CodeSystem/benefit-category',
            code: meta.code,
            display: meta.display
          });
        }
      }
      break;

    // Eligibility benefit types (copay, deductible, limit)
    case 'eligibility_benefit':
      if (meta.type && meta.code) {
        obj.type = obj.type || {};
        obj.type.coding = obj.type.coding || [];
        if (!obj.type.coding.some(c => c.code === meta.code)) {
          obj.type.coding.push({
            system: 'http://terminology.hl7.org/CodeSystem/benefit-type',
            code: meta.code,
            display: meta.display
          });
        }
      }
      break;

    // Eligibility error codes
    case 'eligibility_error':
      if (meta.code && meta.display) {
        obj.code = obj.code || {};
        obj.code.coding = obj.code.coding || [];
        if (!obj.code.coding.some(c => c.code === meta.code)) {
          obj.code.coding.push({
            system: 'http://kenya.go.ke/fhir/CodeSystem/eligibility-error',
            code: meta.code,
            display: meta.display
          });
        }
      }
      break;

    // Eligibility extensions
    case 'eligibility_extension':
      if (meta.url) obj.url = meta.url;
      break;
  }
}

/**
 * Get value at semantic path (for reading)
 */
function getValueAtSemanticPath(resource, fhirPath) {
  const parsedParts = parseSemanticPath(fhirPath);
  let current = resource;

  for (const { field, index } of parsedParts) {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (index !== null) {
      if (!Array.isArray(current[field])) return undefined;
      current = current[field][index];
    } else {
      current = current[field];
    }
  }

  return current;
}

/**
 * Validate a semantic path string
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
function validateSemanticPath(fhirPath) {
  const result = { valid: true, errors: [], warnings: [] };

  try {
    const parsed = parseSemanticPath(fhirPath);

    for (const part of parsed) {
      if (part.warning) {
        result.warnings.push(part.warning);
      }
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Invalid path syntax: ${error.message}`);
  }

  return result;
}

/**
 * Get all available semantic names for a field type
 */
function getAvailableSemanticNames(fieldType) {
  const defs = SEMANTIC_INDICES[fieldType];
  if (!defs) return [];

  return Object.entries(defs).map(([name, meta]) => ({
    name,
    index: meta.index,
    description: formatSemanticDescription(fieldType, name, meta)
  }));
}

/**
 * Format description for semantic name
 */
function formatSemanticDescription(fieldType, name, meta) {
  switch (fieldType) {
    case 'identifier':
      return `${name.replace(/_/g, ' ')} (system: ${meta.system})`;
    case 'telecom':
      return `${meta.use} ${meta.system}`;
    case 'name':
      return `${meta.use} name`;
    case 'address':
      return `${meta.use} address`;
    case 'contact':
      return `${meta.purpose} contact`;
    case 'extension':
      return `Extension: ${meta.url}`;
    default:
      return name;
  }
}

module.exports = {
  SEMANTIC_INDICES,
  parseSemanticPathPart,
  parseSemanticPath,
  setValueAtSemanticPath,
  getValueAtSemanticPath,
  validateSemanticPath,
  getAvailableSemanticNames,
  applySemanticMeta
};
