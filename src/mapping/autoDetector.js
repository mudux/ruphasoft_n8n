// Auto-Detection Engine
// Robust field mapping detection for mixed JSON payloads to FHIR resources

const { FHIR_PATTERNS, findBestMatch } = require('./patterns');

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 75,      // Auto-apply with high confidence
  MEDIUM: 50,    // Flag for user review
  LOW: 25        // Ignore or mark as unmapped
};

// Default FHIR field mappings for each resource type
const FHIR_FIELD_PATHS = {
  patient: {
    firstName: 'name[0].given[0]',
    lastName: 'name[0].family',
    fullName: 'name[0].text',
    birthDate: 'birthDate',
    gender: 'gender',
    phone: 'telecom[0].value',
    email: 'telecom[1].value',
    mrn: 'identifier[0].value',
    ssn: 'identifier[1].value',
    address: 'address[0].line[0]',
    city: 'address[0].city',
    state: 'address[0].state',
    zipCode: 'address[0].postalCode',
    country: 'address[0].country'
  },
  appointment: {
    appointmentId: 'identifier[0].value',
    dateTime: 'start',
    status: 'status',
    duration: 'minutesDuration',
    reason: 'reasonCode[0].text',
    practitionerId: 'participant[0].actor.reference',
    patientId: 'participant[1].actor.reference'
  },
  claimResponse: {
    claimId: 'request.identifier.value',
    status: 'status',
    outcome: 'outcome',
    total: 'total[0].amount.value',
    paymentAmount: 'payment.amount.value',
    denialReason: 'error[0].code.text'
  },
  eligibilityResponse: {
    memberId: 'patient.identifier.value',
    planId: 'insurance[0].coverage.identifier.value',
    status: 'status',
    effectiveDate: 'insurance[0].coverage.period.start',
    terminationDate: 'insurance[0].coverage.period.end',
    copay: 'insurance[0].item[0].benefit[0].allowedMoney.value',
    deductible: 'insurance[0].item[0].benefit[1].allowedMoney.value'
  },
  bundle: {
    bundleId: 'identifier.value',
    type: 'type',
    timestamp: 'timestamp'
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
    // Date field transformations
    if (fhirField.includes('Date') || fhirField === 'birthDate') {
      if (typeof value === 'string' && !value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return 'convertToFhirDate';
      }
    }

    // Phone number formatting
    if (fhirField === 'phone') {
      return 'formatPhoneNumber';
    }

    // Gender normalization
    if (fhirField === 'gender') {
      return 'normalizeGender';
    }

    // Name case formatting
    if (fhirField.includes('Name')) {
      return 'formatName';
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
      firstName: 'Patient first/given name',
      lastName: 'Patient family/last name',
      fullName: 'Complete patient name',
      birthDate: 'Date of birth (YYYY-MM-DD)',
      gender: 'Gender (male/female/other/unknown)',
      phone: 'Phone number',
      email: 'Email address',
      mrn: 'Medical record number',
      ssn: 'Social security number',
      address: 'Street address',
      city: 'City name',
      state: 'State/province',
      zipCode: 'ZIP/postal code',
      country: 'Country name'
    };
    return descriptions[field] || `FHIR field: ${field}`;
  }
}

module.exports = { AutoDetector, CONFIDENCE_THRESHOLDS };