// Forgiving FHIR Validator
// Extremely permissive validation with auto-correction and helpful feedback

class ForgivingValidator {
  constructor(resourceType) {
    this.resourceType = resourceType;
    this.warnings = [];
    this.corrections = [];
    this.errors = [];
  }

  // Main validation method - extremely forgiving approach
  validate(fhirResource) {
    this._resetState();

    try {
      // Basic structure validation
      this._validateBasicStructure(fhirResource);

      // Resource-specific validation
      switch (this.resourceType) {
        case 'patient':
          this._validatePatient(fhirResource);
          break;
        case 'appointment':
          this._validateAppointment(fhirResource);
          break;
        case 'claimResponse':
          this._validateClaimResponse(fhirResource);
          break;
        case 'eligibilityResponse':
          this._validateEligibilityResponse(fhirResource);
          break;
        case 'bundle':
          this._validateBundle(fhirResource);
          break;
        default:
          this._warn(`Unknown resource type: ${this.resourceType}`);
      }

      return this._createValidationResult(true, fhirResource);

    } catch (error) {
      this._error(`Critical validation error: ${error.message}`);
      return this._createValidationResult(false, fhirResource);
    }
  }

  // Basic structure validation (very permissive)
  _validateBasicStructure(resource) {
    // Ensure resourceType is set
    if (!resource.resourceType) {
      resource.resourceType = this._capitalizeResourceType(this.resourceType);
      this._correct(`Added missing resourceType: ${resource.resourceType}`);
    }

    // Ensure id exists (generate if missing)
    if (!resource.id) {
      resource.id = this._generateId();
      this._correct(`Generated missing id: ${resource.id}`);
    }
  }

  // Patient validation (forgiving)
  _validatePatient(patient) {
    // Name validation
    if (!patient.name || !Array.isArray(patient.name) || patient.name.length === 0) {
      if (patient.firstName || patient.lastName || patient.fullName) {
        patient.name = this._constructNameFromFields(patient);
        this._correct('Constructed name array from individual name fields');
      } else {
        this._warn('No name information provided');
      }
    }

    // Birth date validation and correction
    if (patient.birthDate) {
      const correctedDate = this._correctDate(patient.birthDate);
      if (correctedDate !== patient.birthDate) {
        patient.birthDate = correctedDate;
        this._correct(`Corrected birth date format: ${correctedDate}`);
      }
    }

    // Gender validation and correction
    if (patient.gender) {
      const correctedGender = this._correctGender(patient.gender);
      if (correctedGender !== patient.gender) {
        patient.gender = correctedGender;
        this._correct(`Corrected gender value: ${correctedGender}`);
      }
    }

    // Telecom validation
    if (patient.phone || patient.email) {
      patient.telecom = this._constructTelecomArray(patient);
      this._correct('Constructed telecom array from phone/email fields');
    }

    // Identifier validation
    if (patient.mrn || patient.ssn) {
      patient.identifier = this._constructIdentifierArray(patient);
      this._correct('Constructed identifier array from mrn/ssn fields');
    }
  }

  // Appointment validation (forgiving)
  _validateAppointment(appointment) {
    // Status validation
    if (!appointment.status) {
      appointment.status = 'booked';
      this._correct('Set default status: booked');
    } else {
      appointment.status = this._correctAppointmentStatus(appointment.status);
    }

    // DateTime validation
    if (appointment.start) {
      appointment.start = this._correctDateTime(appointment.start);
    }

    if (appointment.end && !appointment.minutesDuration) {
      appointment.minutesDuration = this._calculateDuration(appointment.start, appointment.end);
      this._correct(`Calculated duration: ${appointment.minutesDuration} minutes`);
    }
  }

  // ClaimResponse validation (forgiving)
  _validateClaimResponse(claimResponse) {
    // Status validation
    if (!claimResponse.status) {
      claimResponse.status = 'active';
      this._correct('Set default status: active');
    }

    // Outcome validation
    if (!claimResponse.outcome) {
      claimResponse.outcome = 'complete';
      this._correct('Set default outcome: complete');
    }

    // Amount formatting
    if (claimResponse.total) {
      claimResponse.total = this._correctMoneyAmount(claimResponse.total);
    }
  }

  // EligibilityResponse validation (forgiving)
  _validateEligibilityResponse(eligibilityResponse) {
    // Status validation
    if (!eligibilityResponse.status) {
      eligibilityResponse.status = 'active';
      this._correct('Set default status: active');
    }

    // Date corrections
    if (eligibilityResponse.created) {
      eligibilityResponse.created = this._correctDateTime(eligibilityResponse.created);
    }
  }

  // Bundle validation (forgiving)
  _validateBundle(bundle) {
    // Type validation
    if (!bundle.type) {
      bundle.type = 'collection';
      this._correct('Set default type: collection');
    }

    // Timestamp
    if (!bundle.timestamp) {
      bundle.timestamp = new Date().toISOString();
      this._correct('Added current timestamp');
    }

    // Entry array
    if (!bundle.entry) {
      bundle.entry = [];
      this._correct('Initialized empty entry array');
    }
  }

  // Helper methods for data correction

  _constructNameFromFields(patient) {
    const name = {
      use: 'official'
    };

    if (patient.fullName) {
      name.text = patient.fullName;
    }

    if (patient.firstName) {
      name.given = [patient.firstName];
    }

    if (patient.lastName) {
      name.family = patient.lastName;
    }

    return [name];
  }

  _constructTelecomArray(patient) {
    const telecom = [];

    if (patient.phone) {
      telecom.push({
        system: 'phone',
        value: this._formatPhone(patient.phone),
        use: 'home'
      });
    }

    if (patient.email) {
      telecom.push({
        system: 'email',
        value: patient.email.toLowerCase(),
        use: 'home'
      });
    }

    return telecom;
  }

  _constructIdentifierArray(patient) {
    const identifiers = [];

    if (patient.mrn) {
      identifiers.push({
        use: 'usual',
        system: 'http://hospital.example.org/patient-ids',
        value: patient.mrn.toString()
      });
    }

    if (patient.ssn) {
      identifiers.push({
        use: 'secondary',
        system: 'http://hl7.org/fhir/sid/us-ssn',
        value: this._formatSSN(patient.ssn)
      });
    }

    return identifiers;
  }

  _correctDate(dateValue) {
    if (typeof dateValue !== 'string') {
      dateValue = String(dateValue);
    }

    // Already in correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // Try to parse and format common date formats
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Return as-is if can't parse (very forgiving)
    this._warn(`Could not parse date: ${dateValue}`);
    return dateValue;
  }

  _correctDateTime(dateTimeValue) {
    if (typeof dateTimeValue !== 'string') {
      dateTimeValue = String(dateTimeValue);
    }

    const date = new Date(dateTimeValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    this._warn(`Could not parse datetime: ${dateTimeValue}`);
    return dateTimeValue;
  }

  _correctGender(gender) {
    const normalized = gender.toLowerCase().trim();
    const genderMap = {
      'm': 'male',
      'male': 'male',
      'man': 'male',
      'f': 'female',
      'female': 'female',
      'woman': 'female',
      'o': 'other',
      'other': 'other',
      'u': 'unknown',
      'unknown': 'unknown',
      'unk': 'unknown'
    };

    return genderMap[normalized] || 'unknown';
  }

  _correctAppointmentStatus(status) {
    const normalized = status.toLowerCase().trim();
    const statusMap = {
      'scheduled': 'booked',
      'booked': 'booked',
      'confirmed': 'booked',
      'arrived': 'arrived',
      'fulfilled': 'fulfilled',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'noshow': 'noshow',
      'no-show': 'noshow'
    };

    return statusMap[normalized] || 'booked';
  }

  _formatPhone(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Format US phone numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Return as-is if not standard format
    return phone;
  }

  _formatSSN(ssn) {
    const digits = ssn.replace(/\D/g, '');
    if (digits.length === 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    }
    return ssn;
  }

  _correctMoneyAmount(amount) {
    if (typeof amount === 'number') {
      return {
        value: amount,
        currency: 'USD'
      };
    }

    if (typeof amount === 'string') {
      const numericValue = parseFloat(amount.replace(/[$,]/g, ''));
      return {
        value: numericValue,
        currency: 'USD'
      };
    }

    return amount;
  }

  _calculateDuration(start, end) {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return Math.round((endDate - startDate) / (1000 * 60));
    } catch {
      return null;
    }
  }

  _capitalizeResourceType(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  _generateId() {
    return `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // State management methods
  _resetState() {
    this.warnings = [];
    this.corrections = [];
    this.errors = [];
  }

  _warn(message) {
    this.warnings.push(message);
  }

  _correct(message) {
    this.corrections.push(message);
  }

  _error(message) {
    this.errors.push(message);
  }

  _createValidationResult(isValid, resource) {
    return {
      isValid: isValid,
      resource: resource,
      warnings: this.warnings,
      corrections: this.corrections,
      errors: this.errors,
      summary: {
        status: isValid ? (this.warnings.length > 0 ? 'valid_with_warnings' : 'valid') : 'invalid',
        warningCount: this.warnings.length,
        correctionCount: this.corrections.length,
        errorCount: this.errors.length
      }
    };
  }
}

module.exports = { ForgivingValidator };