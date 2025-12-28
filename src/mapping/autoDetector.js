// Auto-Detection Engine
// Robust field mapping detection for mixed JSON payloads to FHIR resources
// Enhanced with Kenya-specific patterns and semantic array indexing

const { FHIR_PATTERNS, findBestMatch } = require('./patterns');

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 75,      // Auto-apply with high confidence
  MEDIUM: 50,    // Flag for user review
  LOW: 25        // Ignore or mark as unmapped
};

// Default FHIR field mappings for each resource type
// Using semantic array indices where applicable (e.g., identifier[sha_number])
const FHIR_FIELD_PATHS = {
  patient: {
    // Name fields
    firstName: 'name[official].given[0]',
    lastName: 'name[official].family',
    middleName: 'name[official].given[1]',
    fullName: 'name[official].text',

    // Demographics
    birthDate: 'birthDate',
    gender: 'gender',
    maritalStatus: 'maritalStatus.coding[0].code',

    // Contact Information - using semantic indices
    phone: 'telecom[primary_phone].value',
    secondaryPhone: 'telecom[secondary_phone].value',
    email: 'telecom[email].value',

    // Standard Identifiers
    mrn: 'identifier[mrn].value',
    ssn: 'identifier[1].value',

    // Kenya-specific Identifiers - semantic indices
    nationalId: 'identifier[national_id].value',
    shaNumber: 'identifier[sha_number].value',
    nhifNumber: 'identifier[nhif_number].value',
    passport: 'identifier[passport].value',
    alienId: 'identifier[alien_id].value',

    // Address - Standard
    address: 'address[home].line[0]',
    city: 'address[home].city',
    state: 'address[home].state',
    zipCode: 'address[home].postalCode',
    country: 'address[home].country',

    // Address - Kenya specific (using extensions)
    county: 'extension[county].valueString',
    subCounty: 'extension[sub_county].valueString',
    ward: 'extension[ward].valueString',
    constituency: 'address[home].district',

    // Emergency Contact
    emergencyName: 'contact[emergency_contact].name.text',
    emergencyPhone: 'contact[emergency_contact].telecom[0].value',
    emergencyRelation: 'contact[emergency_contact].relationship[0].coding[0].code',

    // Insurance/Coverage (stored as extensions)
    insuranceProvider: 'extension[nhif_status].valueString',
    policyNumber: 'identifier[nhif_number].value',

    // Occupation
    occupation: 'extension[occupation].valueString',
    employer: 'contact[employer].organization.display'
  },
  appointment: {
    // Core Identifiers - using semantic indices
    appointmentId: 'identifier[appointment_id].value',
    bookingReference: 'identifier[booking_reference].value',
    externalId: 'identifier[external_id].value',
    mohAppointmentId: 'identifier[moh_appointment].value',

    // Date/Time Fields
    startDateTime: 'start',
    endDateTime: 'end',
    createdDate: 'created',

    // Status and Priority
    status: 'status',
    priority: 'priority',
    cancellationReason: 'cancelationReason.text',

    // Duration
    duration: 'minutesDuration',

    // Reason and Description
    reason: 'reasonCode[0].text',
    description: 'description',
    patientInstruction: 'patientInstruction',

    // Participants - Patient (using semantic indices)
    patientId: 'participant[patient].actor.reference',
    patientName: 'participant[patient].actor.display',
    patientNationalId: 'participant[patient].actor.identifier.value',
    patientShaNumber: 'extension[0].valueString',
    patientNhifNumber: 'extension[1].valueString',

    // Participants - Practitioner
    practitionerId: 'participant[practitioner].actor.reference',
    practitionerName: 'participant[practitioner].actor.display',
    specialty: 'specialty[0].text',

    // Participants - Location/Facility
    locationId: 'participant[location].actor.reference',
    locationName: 'participant[location].actor.display',
    facilityCode: 'extension[facility_code].valueString',

    // Service Type
    serviceType: 'serviceType[0].text',
    serviceCategory: 'serviceCategory[0].text',
    serviceCode: 'serviceType[0].coding[0].code',

    // Kenya-specific Service Types (map to serviceType)
    ancVisit: 'serviceType[0].text',
    pncVisit: 'serviceType[0].text',
    immunization: 'serviceType[0].text',
    labTest: 'serviceType[0].text',
    chronicCare: 'serviceType[0].text',

    // Referral Information
    referralNumber: 'extension[referral_number].valueString',
    referralSource: 'supportingInformation[0].reference',
    appointmentSource: 'extension[appointment_source].valueCode',

    // Slot Reference
    slotId: 'slot[0].reference'
  },
  // ClaimResponse - Enhanced for Kenya Insurance (KHIE: SHA/SHIF/NHIF)
  claimResponse: {
    // Claim Identifiers - using semantic indices
    claimNumber: 'identifier[claim_number].value',
    preauthNumber: 'identifier[preauth_number].value',
    invoiceNumber: 'identifier[invoice_number].value',
    shaClaimRef: 'identifier[sha_claim_ref].value',
    nhifClaimRef: 'identifier[nhif_claim_ref].value',
    shifClaimRef: 'identifier[shif_claim_ref].value',
    externalRef: 'identifier[external_ref].value',

    // Status and Outcome
    status: 'status',
    outcome: 'outcome',
    processNote: 'processNote[0].text',

    // Patient Reference
    patientId: 'patient.identifier.value',
    patientReference: 'patient.reference',

    // Insurer/Payer Reference
    insurerId: 'insurer.identifier.value',
    insurerReference: 'insurer.reference',
    insurerName: 'insurer.display',

    // Original Claim Reference
    requestReference: 'request.reference',
    originalClaimId: 'request.identifier.value',

    // Monetary Amounts - using semantic indices for totals
    submittedAmount: 'total[submitted].amount.value',
    approvedAmount: 'total[approved].amount.value',
    benefitAmount: 'total[approved].amount.value',
    copayAmount: 'total[patient_responsibility].amount.value',
    deductibleAmount: 'total[deductible].amount.value',
    coinsuranceAmount: 'total[coinsurance].amount.value',
    totalAmount: 'total[approved].amount.value',

    // Payment Details
    paymentAmount: 'payment.amount.value',
    paymentDate: 'payment.date',
    paymentMethod: 'payment.type.coding[0].code',
    paymentReference: 'payment.identifier.value',

    // Insurance Scheme (via KHIE)
    insuranceScheme: 'extension[claim_type].valueCode',
    schemeCode: 'type.coding[0].code',
    schemeName: 'type.text',

    // Benefit Category
    benefitCategory: 'extension[benefit_category].valueCode',
    serviceType: 'item[0].productOrService.coding[0].code',

    // Service Line Items (first item by default)
    itemSequence: 'item[0].itemSequence',
    serviceCode: 'item[0].productOrService.coding[0].code',
    serviceName: 'item[0].productOrService.text',
    serviceDate: 'item[0].servicedDate',
    quantity: 'item[0].quantity.value',
    unitPrice: 'item[0].net.value',

    // Adjudication (first item, first adjudication)
    adjudicationCategory: 'item[0].adjudication[benefit_amount].category.coding[0].code',
    adjudicationAmount: 'item[0].adjudication[benefit_amount].amount.value',
    adjudicationCode: 'item[0].adjudication[0].category.coding[0].code',
    adjudicationReason: 'item[0].adjudication[0].reason.text',

    // Error/Denial
    errorCode: 'error[0].code.coding[0].code',
    denialReason: 'error[0].code.text',
    errorMessage: 'error[0].code.coding[0].display',

    // Facility Information
    facilityCode: 'extension[facility_tier].valueString',
    facilityName: 'requestor.display',
    facilityTier: 'extension[facility_tier].valueCode',

    // Dates
    createdDate: 'created',
    processedDate: 'disposition',
    dispositionDate: 'disposition',

    // Coverage/Insurance Reference
    coverageId: 'insurance[primary].coverage.identifier.value',
    coverageReference: 'insurance[primary].coverage.reference',
    policyNumber: 'insurance[primary].coverage.identifier.value',

    // Integrator Source (KHIE, mamaTOTO, LCT, Smart)
    integratorSource: 'extension[integrator_source].valueCode',
    integratorRef: 'extension[integrator_source].valueString'
  },
  // EligibilityResponse - Enhanced for Kenya Insurance (KHIE, mamaTOTO, LCT, Smart)
  eligibilityResponse: {
    // Request/Response Identifiers
    requestId: 'identifier[request_id].value',
    responseId: 'identifier[response_id].value',

    // Patient/Member Identifiers
    memberId: 'patient.identifier.value',
    patientReference: 'patient.reference',
    nationalId: 'patient.identifier.value',

    // Insurance Scheme Identifiers (KHIE - SHA/SHIF/NHIF)
    shaNumber: 'patient.identifier.value',
    nhifNumber: 'patient.identifier.value',
    shifNumber: 'patient.identifier.value',
    householdId: 'extension[household_id].valueString',

    // Private Insurance (LCT, Smart)
    policyNumber: 'insurance[primary_cover].coverage.identifier.value',
    groupNumber: 'insurance[primary_cover].coverage.class.value',
    cardNumber: 'patient.identifier.value',

    // Coverage/Plan Details
    planId: 'insurance[primary_cover].coverage.identifier.value',
    planName: 'insurance[primary_cover].coverage.display',
    planType: 'insurance[primary_cover].coverage.type.coding[0].code',
    coverageClass: 'insurance[primary_cover].coverage.class.value',

    // Status and Outcome
    status: 'status',
    outcome: 'outcome',
    inforce: 'insurance[primary_cover].inforce',

    // Member Status (KHIE-specific)
    memberStatus: 'extension[member_status].valueCode',
    dependentStatus: 'extension[dependent_type].valueCode',
    principalMember: 'extension[principal_member_ref].valueReference.reference',

    // Dates
    effectiveDate: 'insurance[primary_cover].benefitPeriod.start',
    terminationDate: 'insurance[primary_cover].benefitPeriod.end',
    lastContributionDate: 'extension[last_contribution_date].valueDate',
    renewalDate: 'insurance[primary_cover].benefitPeriod.end',
    createdDate: 'created',

    // Benefits and Limits (KES currency) - Outpatient
    copay: 'insurance[primary_cover].item[outpatient].benefit[copay].allowedMoney.value',
    coinsurance: 'insurance[primary_cover].item[outpatient].benefit[coinsurance].allowedUnsignedInt',
    deductible: 'insurance[primary_cover].item[outpatient].benefit[deductible].allowedMoney.value',
    outOfPocketMax: 'insurance[primary_cover].item[outpatient].benefit[out_of_pocket_max].allowedMoney.value',
    benefitLimit: 'insurance[primary_cover].item[outpatient].benefit[annual_limit].allowedMoney.value',
    usedAmount: 'insurance[primary_cover].item[outpatient].benefit[used_amount].usedMoney.value',
    remainingAmount: 'insurance[primary_cover].item[outpatient].benefit[remaining_amount].allowedMoney.value',

    // Benefit Categories (Kenya health packages)
    benefitCategory: 'insurance[primary_cover].item[0].category.coding[0].code',
    benefitCode: 'insurance[primary_cover].item[0].productOrService.coding[0].code',

    // Insurer/Payer
    insurerReference: 'insurer.reference',
    insurerName: 'insurer.display',
    insurerCode: 'insurer.identifier.value',

    // Integrator-specific
    integratorType: 'extension[integrator_source].valueCode',
    facilityCode: 'extension[facility_network].valueString',

    // Error handling
    errorCode: 'error[0].code.coding[0].code',
    errorMessage: 'error[0].code.text'
  },
  bundle: {
    bundleId: 'identifier.value',
    type: 'type',
    timestamp: 'timestamp',
    total: 'total',
    entryType: 'entry[0].resource.resourceType',
    entryId: 'entry[0].resource.id',
    fullUrl: 'entry[0].fullUrl',
    method: 'entry[0].request.method',
    requestUrl: 'entry[0].request.url',
    responseStatus: 'entry[0].response.status'
  }
};

class AutoDetector {
  constructor(resourceType) {
    this.resourceType = resourceType;
    this.fieldMappings = FHIR_FIELD_PATHS[resourceType] || {};
  }

  // Main detection method
  detectMappings(inputPayload) {
    if (!inputPayload || typeof inputPayload !== 'object') {
      return this._createEmptyResult();
    }

    const fieldNames = Object.keys(inputPayload);
    const mappings = [];
    const unmapped = [];

    for (const fieldName of fieldNames) {
      const match = findBestMatch(fieldName, this.resourceType);

      if (match && match.confidence >= CONFIDENCE_THRESHOLDS.LOW) {
        const mapping = this._createMapping(match, inputPayload[fieldName]);
        mappings.push(mapping);
      } else {
        unmapped.push({
          sourceField: fieldName,
          value: inputPayload[fieldName],
          reason: 'No matching pattern found'
        });
      }
    }

    return {
      resourceType: this.resourceType,
      totalFields: fieldNames.length,
      mappedFields: mappings.filter(m => m.confidence >= CONFIDENCE_THRESHOLDS.HIGH).length,
      flaggedFields: mappings.filter(m =>
        m.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM &&
        m.confidence < CONFIDENCE_THRESHOLDS.HIGH
      ).length,
      unmappedFields: unmapped.length,
      mappings: mappings,
      unmapped: unmapped,
      autoApplyable: mappings.filter(m => m.confidence >= CONFIDENCE_THRESHOLDS.HIGH),
      needsReview: mappings.filter(m =>
        m.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM &&
        m.confidence < CONFIDENCE_THRESHOLDS.HIGH
      )
    };
  }

  // Create mapping object
  _createMapping(match, value) {
    const fhirPath = this.fieldMappings[match.fhirField];
    return {
      sourceField: match.sourceField,
      fhirField: match.fhirField,
      fhirPath: fhirPath || match.fhirField,
      value: value,
      confidence: match.confidence,
      autoDetected: true,
      userOverride: false,
      transformation: this._suggestTransformation(match.fhirField, value),
      status: this._getStatus(match.confidence)
    };
  }

  // Suggest data transformations
  _suggestTransformation(fhirField, value) {
    // Check Kenya-specific transformations first
    const kenyaTransform = this._suggestKenyaTransformation(fhirField, value);
    if (kenyaTransform) {
      return kenyaTransform;
    }

    // Date field transformations
    if (fhirField.includes('Date') || fhirField === 'birthDate') {
      if (typeof value === 'string' && !value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return 'formatKenyaDate'; // Default to Kenya date format
      }
    }

    // Phone number formatting - default to Kenya format
    if (fhirField === 'phone' || fhirField === 'secondaryPhone' || fhirField === 'emergencyPhone') {
      return 'formatPhoneKE';
    }

    // Gender normalization
    if (fhirField === 'gender') {
      return 'normalizeGender';
    }

    // Name case formatting
    if (fhirField.includes('Name') || fhirField.includes('name')) {
      return 'formatName';
    }

    // Identifier formatting
    if (fhirField === 'mrn') {
      return 'trim';
    }

    return null;
  }

  // Get mapping status based on confidence
  _getStatus(confidence) {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'auto_apply';
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'needs_review';
    return 'low_confidence';
  }

  // Create empty result
  _createEmptyResult() {
    return {
      resourceType: this.resourceType,
      totalFields: 0,
      mappedFields: 0,
      flaggedFields: 0,
      unmappedFields: 0,
      mappings: [],
      unmapped: [],
      autoApplyable: [],
      needsReview: []
    };
  }

  // Get available FHIR fields for manual override
  getAvailableFhirFields() {
    return Object.keys(this.fieldMappings).map(field => ({
      name: field,
      path: this.fieldMappings[field],
      description: this._getFieldDescription(field)
    }));
  }

  // Get field descriptions for UI
  _getFieldDescription(field) {
    const descriptions = {
      // Name fields
      firstName: 'Patient first/given name',
      lastName: 'Patient family/last name',
      middleName: 'Patient middle name',
      fullName: 'Complete patient name',

      // Demographics
      birthDate: 'Date of birth (YYYY-MM-DD)',
      gender: 'Gender (male/female/other/unknown)',
      maritalStatus: 'Marital status code',

      // Contact
      phone: 'Primary phone number',
      secondaryPhone: 'Secondary/alternative phone',
      email: 'Email address',

      // Standard Identifiers
      mrn: 'Medical record number',
      ssn: 'Social security number',

      // Kenya Identifiers
      nationalId: 'Kenya National ID number',
      shaNumber: 'SHA (Social Health Authority) number',
      nhifNumber: 'NHIF member number',
      passport: 'Passport number',
      alienId: 'Alien/Refugee ID number',

      // Address - Standard
      address: 'Street address',
      city: 'City name',
      state: 'State/province',
      zipCode: 'ZIP/postal code',
      country: 'Country name',

      // Address - Kenya
      county: 'Kenya county',
      subCounty: 'Kenya sub-county',
      ward: 'Kenya ward',
      constituency: 'Electoral constituency',

      // Emergency Contact
      emergencyName: 'Emergency contact/next of kin name',
      emergencyPhone: 'Emergency contact phone number',
      emergencyRelation: 'Relationship to patient',

      // Insurance
      insuranceProvider: 'Insurance provider name',
      policyNumber: 'Insurance policy/member number',

      // Employment
      occupation: 'Patient occupation',
      employer: 'Employer name'
    };

    // Check appointment descriptions if not found in patient descriptions
    if (!descriptions[field] && this.resourceType === 'appointment') {
      return this._getAppointmentFieldDescription(field);
    }

    // Check claimResponse descriptions
    if (!descriptions[field] && this.resourceType === 'claimResponse') {
      return this._getClaimResponseFieldDescription(field);
    }

    // Check eligibilityResponse descriptions
    if (!descriptions[field] && this.resourceType === 'eligibilityResponse') {
      return this._getEligibilityResponseFieldDescription(field);
    }

    return descriptions[field] || `FHIR field: ${field}`;
  }

  // Get suggested transformation for Kenya-specific fields
  _suggestKenyaTransformation(fhirField, value) {
    const kenyaTransformations = {
      // Patient-related
      nationalId: 'formatNationalId',
      shaNumber: 'formatSHANumber',
      nhifNumber: 'formatNHIFNumber',
      passport: 'formatPassport',
      phone: 'formatPhoneKE',
      secondaryPhone: 'formatPhoneKE',
      birthDate: 'formatKenyaDate',

      // Appointment-specific
      startDateTime: 'formatKenyaDateTime',
      endDateTime: 'formatKenyaDateTime',
      createdDate: 'formatKenyaDateTime',
      status: 'normalizeAppointmentStatus',
      priority: 'formatAppointmentPriority',
      duration: 'validateAppointmentSlot',
      facilityCode: 'formatFacilityCode',
      serviceType: 'formatServiceType',
      patientId: 'formatPatientReference',
      practitionerId: 'formatPractitionerReference',
      locationId: 'formatLocationReference',
      patientNationalId: 'formatNationalId',
      patientShaNumber: 'formatSHANumber',
      patientNhifNumber: 'formatNHIFNumber',

      // Kenya-specific service types
      ancVisit: 'formatServiceType',
      pncVisit: 'formatServiceType',
      immunization: 'formatServiceType',
      labTest: 'formatServiceType',
      chronicCare: 'formatServiceType',

      // ClaimResponse-specific transformations
      claimNumber: 'formatClaimNumber',
      preauthNumber: 'formatPreauthNumber',
      shaClaimRef: 'formatSHAClaimNumber',
      nhifClaimRef: 'formatNHIFClaimNumber',
      shifClaimRef: 'formatClaimNumber',
      externalRef: 'formatClaimNumber',
      submittedAmount: 'formatClaimAmount',
      approvedAmount: 'formatBenefitAmount',
      benefitAmount: 'formatBenefitAmount',
      copayAmount: 'formatCopayAmount',
      deductibleAmount: 'formatBenefitAmount',
      coinsuranceAmount: 'formatBenefitAmount',
      totalAmount: 'formatBenefitAmount',
      paymentAmount: 'formatBenefitAmount',
      paymentDate: 'formatPaymentDate',
      processedDate: 'formatClaimDate',
      dispositionDate: 'formatClaimDate',
      serviceDate: 'formatClaimDate',
      adjudicationCode: 'parseAdjudicationCode',
      itemSequence: 'formatServiceLineNumber',

      // EligibilityResponse-specific transformations
      requestId: 'toUpperCase',
      responseId: 'toUpperCase',
      memberId: 'trim',
      householdId: 'formatSHAHouseholdNumber',
      policyNumber: 'formatPolicyNumber',
      groupNumber: 'toUpperCase',
      cardNumber: 'toUpperCase',
      planId: 'toUpperCase',
      planName: 'trim',
      planType: 'toUpperCase',
      inforce: 'parseInforceStatus',
      memberStatus: 'normalizeMemberStatus',
      dependentStatus: 'normalizeDependentType',
      effectiveDate: 'formatEffectiveDate',
      terminationDate: 'formatTerminationDate',
      lastContributionDate: 'formatLastContributionDate',
      renewalDate: 'formatTerminationDate',
      createdDate: 'formatKenyaDate',
      copay: 'formatBenefitLimit',
      coinsurance: 'formatCoinsurancePercentage',
      deductible: 'formatDeductibleAmount',
      outOfPocketMax: 'formatBenefitLimit',
      benefitLimit: 'formatBenefitLimit',
      usedAmount: 'formatBenefitLimit',
      remainingAmount: 'formatBenefitLimit',
      benefitCategory: 'parseEligibilityBenefitCategory',
      benefitCode: 'toUpperCase',
      insurerReference: 'formatEligibilityInsurerRef',
      insurerName: 'trim',
      insurerCode: 'toUpperCase',
      integratorType: 'formatEligibilityIntegratorSource',
      outcome: 'parseEligibilityOutcome',
      status: 'parseEligibilityStatus',
      errorCode: 'formatEligibilityErrorCode',
      errorMessage: 'trim',
      insuranceScheme: 'validateEligibilityScheme',
      coverageReference: 'formatEligibilityCoverageRef',
      requestReference: 'formatRequestReference'
    };
    return kenyaTransformations[fhirField] || null;
  }

  // Get appointment-specific field descriptions
  _getAppointmentFieldDescription(field) {
    const descriptions = {
      // Core Identifiers
      appointmentId: 'Unique appointment identifier',
      bookingReference: 'Booking/reservation reference number',
      externalId: 'External system appointment ID',
      mohAppointmentId: 'MOH (Ministry of Health) appointment ID',

      // Date/Time
      startDateTime: 'Appointment start date and time',
      endDateTime: 'Appointment end date and time',
      createdDate: 'Date appointment was created/booked',

      // Status
      status: 'Appointment status (proposed, booked, arrived, fulfilled, cancelled, noshow)',
      priority: 'Priority level (1=highest, 9=lowest)',
      cancellationReason: 'Reason for cancellation',

      // Duration
      duration: 'Appointment duration in minutes',

      // Reason
      reason: 'Reason for the appointment',
      description: 'Description or notes about the appointment',
      patientInstruction: 'Instructions for the patient',

      // Patient
      patientId: 'Patient reference (Patient/ID)',
      patientName: 'Patient display name',
      patientNationalId: 'Patient Kenya National ID',
      patientShaNumber: 'Patient SHA number',
      patientNhifNumber: 'Patient NHIF number',

      // Practitioner
      practitionerId: 'Practitioner reference (Practitioner/ID)',
      practitionerName: 'Practitioner display name',
      specialty: 'Practitioner specialty',

      // Location/Facility
      locationId: 'Location reference (Location/ID)',
      locationName: 'Facility/location display name',
      facilityCode: 'MOH Master Facility List code',

      // Service Type
      serviceType: 'Type of service/appointment',
      serviceCategory: 'Service category',
      serviceCode: 'Service type code',

      // Kenya Service Types
      ancVisit: 'Antenatal Care visit',
      pncVisit: 'Postnatal Care visit',
      immunization: 'Immunization/vaccination',
      labTest: 'Laboratory test',
      chronicCare: 'Chronic disease care (NCD)',

      // Referral
      referralNumber: 'Referral number',
      referralSource: 'Source of referral',
      appointmentSource: 'Booking source/channel',

      // Slot
      slotId: 'Slot reference'
    };
    return descriptions[field] || `FHIR Appointment field: ${field}`;
  }

  // Get ClaimResponse-specific field descriptions
  _getClaimResponseFieldDescription(field) {
    const descriptions = {
      // Claim Identifiers
      claimNumber: 'Claim number/reference',
      preauthNumber: 'Pre-authorization reference number',
      invoiceNumber: 'Invoice/bill number',
      shaClaimRef: 'SHA (Social Health Authority) claim reference',
      nhifClaimRef: 'NHIF claim reference number',
      shifClaimRef: 'SHIF (Social Health Insurance Fund) claim reference',
      externalRef: 'External integrator reference',

      // Status and Outcome
      status: 'Claim status (active/cancelled/draft/entered-in-error)',
      outcome: 'Claim outcome (complete/partial/error/queued)',
      processNote: 'Processing notes/comments',

      // Patient Reference
      patientId: 'Patient/member identifier',
      patientReference: 'Patient FHIR reference (Patient/ID)',

      // Insurer/Payer Reference
      insurerId: 'Insurer/payer identifier',
      insurerReference: 'Insurer FHIR reference (Organization/ID)',
      insurerName: 'Insurer/payer display name',

      // Original Claim Reference
      requestReference: 'Original claim FHIR reference (Claim/ID)',
      originalClaimId: 'Original claim identifier',

      // Monetary Amounts
      submittedAmount: 'Submitted/claimed amount (KES)',
      approvedAmount: 'Approved/allowed amount (KES)',
      benefitAmount: 'Benefit/coverage amount (KES)',
      copayAmount: 'Patient copayment amount (KES)',
      deductibleAmount: 'Deductible amount (KES)',
      coinsuranceAmount: 'Coinsurance amount (KES)',
      totalAmount: 'Total payment amount (KES)',

      // Payment Details
      paymentAmount: 'Payment/reimbursement amount (KES)',
      paymentDate: 'Payment/settlement date',
      paymentMethod: 'Payment method/type',
      paymentReference: 'Payment reference number',

      // Insurance Scheme (via KHIE)
      insuranceScheme: 'Insurance scheme (SHA/SHIF/NHIF/Private)',
      schemeCode: 'Insurance scheme code',
      schemeName: 'Insurance scheme display name',

      // Benefit Category
      benefitCategory: 'Benefit category (OP/IP/MAT/SURG/etc.)',
      serviceType: 'Service type code',

      // Service Line Items
      itemSequence: 'Service line item sequence number',
      serviceCode: 'Service/procedure code',
      serviceName: 'Service/procedure description',
      serviceDate: 'Date of service',
      quantity: 'Service quantity/units',
      unitPrice: 'Unit price/rate',

      // Adjudication
      adjudicationCategory: 'Adjudication category (benefit/copay/deductible)',
      adjudicationAmount: 'Adjudication amount (KES)',
      adjudicationCode: 'Adjudication code',
      adjudicationReason: 'Adjudication reason/notes',

      // Error/Denial
      errorCode: 'Error/denial code',
      denialReason: 'Denial reason description',
      errorMessage: 'Error message/details',

      // Facility Information
      facilityCode: 'Facility MOH code',
      facilityName: 'Facility display name',
      facilityTier: 'Facility tier/level',

      // Dates
      createdDate: 'Claim creation/submission date',
      processedDate: 'Claim processing date',
      dispositionDate: 'Disposition/decision date',

      // Coverage/Insurance Reference
      coverageId: 'Coverage/policy identifier',
      coverageReference: 'Coverage FHIR reference (Coverage/ID)',
      policyNumber: 'Insurance policy/member number',

      // Integrator Source
      integratorSource: 'Integrator source (KHIE/mamaTOTO/LCT/Smart)',
      integratorRef: 'Integrator reference identifier'
    };
    return descriptions[field] || `FHIR ClaimResponse field: ${field}`;
  }

  // Get EligibilityResponse-specific field descriptions
  _getEligibilityResponseFieldDescription(field) {
    const descriptions = {
      // Request/Response Identifiers
      requestId: 'Eligibility request identifier',
      responseId: 'Eligibility response identifier',

      // Patient/Member Identifiers
      memberId: 'Insurance member/subscriber identifier',
      patientReference: 'Patient FHIR reference (Patient/ID)',
      nationalId: 'Kenya National ID number',

      // Insurance Scheme Identifiers (KHIE - SHA/SHIF/NHIF)
      shaNumber: 'SHA (Social Health Authority) member number',
      nhifNumber: 'NHIF member number',
      shifNumber: 'SHIF (Social Health Insurance Fund) member number',
      householdId: 'SHA household/family identifier',

      // Private Insurance (LCT, Smart)
      policyNumber: 'Insurance policy number',
      groupNumber: 'Employer group/corporate number',
      cardNumber: 'Insurance member card number',

      // Coverage/Plan Details
      planId: 'Insurance plan/scheme identifier',
      planName: 'Insurance plan display name',
      planType: 'Coverage type (basic/comprehensive/premium)',
      coverageClass: 'Coverage class/benefit package',

      // Status and Outcome
      status: 'Eligibility response status (active/cancelled/draft)',
      outcome: 'Eligibility outcome (complete/partial/error/queued)',
      inforce: 'Coverage currently in force (true/false)',

      // Member Status (KHIE-specific)
      memberStatus: 'Member status (active/inactive/suspended/pending)',
      dependentStatus: 'Dependent relationship (principal/spouse/child/parent)',
      principalMember: 'Reference to principal/primary member',

      // Dates
      effectiveDate: 'Coverage effective/start date',
      terminationDate: 'Coverage termination/end date',
      lastContributionDate: 'Last contribution/payment date',
      renewalDate: 'Coverage renewal date',
      createdDate: 'Response creation date',

      // Benefits and Limits (KES currency)
      copay: 'Copayment amount (KES)',
      coinsurance: 'Coinsurance percentage (0-100)',
      deductible: 'Deductible amount (KES)',
      outOfPocketMax: 'Out-of-pocket maximum (KES)',
      benefitLimit: 'Annual benefit limit (KES)',
      usedAmount: 'Amount utilized/spent (KES)',
      remainingAmount: 'Remaining benefit balance (KES)',

      // Benefit Categories (Kenya health packages)
      benefitCategory: 'Benefit category (OP/IP/MAT/SURG/DENT/OPT/CHR/EMR)',
      benefitCode: 'Specific benefit/service code',

      // Insurer/Payer
      insurerReference: 'Insurer FHIR reference (Organization/ID)',
      insurerName: 'Insurance company display name',
      insurerCode: 'Insurance company code',

      // Integrator-specific
      integratorType: 'Integrator source (KHIE/mamaTOTO/LCT/Smart)',
      facilityCode: 'Facility network status/code',

      // Error handling
      errorCode: 'Eligibility error/denial code',
      errorMessage: 'Error message/description'
    };
    return descriptions[field] || `FHIR EligibilityResponse field: ${field}`;
  }
}

module.exports = { AutoDetector, CONFIDENCE_THRESHOLDS };