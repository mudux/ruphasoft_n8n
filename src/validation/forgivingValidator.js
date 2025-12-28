// Forgiving FHIR Validator
// Extremely permissive validation with auto-correction and helpful feedback
// Enhanced with Kenya-specific validation rules

const { applyPreset } = require('../utils/transformationPresets');

// Kenya-specific validation patterns
const KENYA_PATTERNS = {
  nationalId: /^\d{7,8}$/,
  nhifNumber: /^\d+$/,
  shaNumber: /^[A-Z0-9]+$/i,
  phoneKE: /^(\+254|0)[17]\d{8}$/,
  county: /^[A-Za-z\s]+$/
};

// Kenya counties for validation
const KENYA_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta', 'Garissa',
  'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka Nithi', 'Embu',
  'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', 'Murang\'a',
  'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia', 'Uasin Gishu',
  'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado',
  'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu',
  'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'
];

class ForgivingValidator {
  constructor(resourceType, options = {}) {
    this.resourceType = resourceType;
    this.warnings = [];
    this.corrections = [];
    this.errors = [];
    this.options = {
      enableKenyaValidation: true, // Default to Kenya-specific validation
      strictIdentifiers: false,   // Warn but don't fail on invalid identifiers
      autoCorrectDates: true,     // Automatically fix date formats
      autoCorrectPhones: true,    // Automatically fix phone formats
      ...options
    };
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

  // Patient validation (forgiving) - Enhanced with Kenya-specific validation
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

    // Birth date validation and correction (use Kenya date format)
    if (patient.birthDate && this.options.autoCorrectDates) {
      const correctedDate = this._correctKenyaDate(patient.birthDate);
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

    // Telecom validation with Kenya phone format
    if (patient.telecom && Array.isArray(patient.telecom)) {
      this._validateTelecomArray(patient.telecom);
    } else if (patient.phone || patient.email) {
      patient.telecom = this._constructTelecomArray(patient);
      this._correct('Constructed telecom array from phone/email fields');
    }

    // Identifier validation with Kenya-specific identifiers
    if (patient.identifier && Array.isArray(patient.identifier)) {
      this._validateIdentifierArray(patient.identifier);
    } else if (patient.mrn || patient.ssn) {
      patient.identifier = this._constructIdentifierArray(patient);
      this._correct('Constructed identifier array from mrn/ssn fields');
    }

    // Validate Kenya-specific extensions
    if (patient.extension && this.options.enableKenyaValidation) {
      this._validateKenyaExtensions(patient.extension);
    }

    // Validate addresses with Kenya geography
    if (patient.address && Array.isArray(patient.address)) {
      this._validateAddressArray(patient.address);
    }

    // Validate emergency contacts
    if (patient.contact && Array.isArray(patient.contact)) {
      this._validateContactArray(patient.contact);
    }
  }

  // Validate telecom array entries
  _validateTelecomArray(telecomArray) {
    for (let i = 0; i < telecomArray.length; i++) {
      const telecom = telecomArray[i];
      if (telecom.system === 'phone' && telecom.value && this.options.autoCorrectPhones) {
        const corrected = this._correctKenyaPhone(telecom.value);
        if (corrected !== telecom.value) {
          telecom.value = corrected;
          this._correct(`Corrected phone format: ${corrected}`);
        }
      }
      // Ensure system is set
      if (!telecom.system && telecom.value) {
        if (telecom.value.includes('@')) {
          telecom.system = 'email';
        } else if (/[\d+()-]/.test(telecom.value)) {
          telecom.system = 'phone';
        }
        this._correct(`Auto-detected telecom system: ${telecom.system}`);
      }
    }
  }

  // Validate identifier array with Kenya-specific systems
  _validateIdentifierArray(identifierArray) {
    for (const identifier of identifierArray) {
      if (!identifier.system) {
        this._warn('Identifier missing system - consider adding system URL');
      }

      // Validate Kenya-specific identifiers
      if (identifier.system && this.options.enableKenyaValidation) {
        if (identifier.system.includes('national-id')) {
          this._validateKenyaNationalId(identifier);
        } else if (identifier.system.includes('nhif')) {
          this._validateKenyaNHIF(identifier);
        } else if (identifier.system.includes('sha')) {
          this._validateKenyaSHA(identifier);
        }
      }
    }
  }

  // Validate Kenya National ID
  _validateKenyaNationalId(identifier) {
    if (identifier.value) {
      const cleaned = identifier.value.replace(/\D/g, '');
      if (!KENYA_PATTERNS.nationalId.test(cleaned)) {
        this._warn(`National ID format may be incorrect: ${identifier.value} (expected 7-8 digits)`);
      } else if (cleaned !== identifier.value) {
        identifier.value = cleaned.padStart(8, '0');
        this._correct(`Formatted National ID: ${identifier.value}`);
      }
    }
  }

  // Validate Kenya NHIF number
  _validateKenyaNHIF(identifier) {
    if (identifier.value) {
      const cleaned = identifier.value.replace(/\D/g, '');
      if (!KENYA_PATTERNS.nhifNumber.test(cleaned)) {
        this._warn(`NHIF number format may be incorrect: ${identifier.value}`);
      } else if (cleaned !== identifier.value) {
        identifier.value = cleaned;
        this._correct(`Formatted NHIF number: ${identifier.value}`);
      }
    }
  }

  // Validate Kenya SHA number
  _validateKenyaSHA(identifier) {
    if (identifier.value) {
      const cleaned = identifier.value.toUpperCase().trim();
      if (cleaned !== identifier.value) {
        identifier.value = cleaned;
        this._correct(`Formatted SHA number: ${identifier.value}`);
      }
    }
  }

  // Validate Kenya-specific extensions
  _validateKenyaExtensions(extensions) {
    for (const ext of extensions) {
      if (ext.url && ext.url.includes('county') && ext.valueString) {
        // Validate county name
        const countyNormalized = ext.valueString.trim();
        const matchedCounty = KENYA_COUNTIES.find(c =>
          c.toLowerCase() === countyNormalized.toLowerCase()
        );
        if (matchedCounty) {
          if (matchedCounty !== ext.valueString) {
            ext.valueString = matchedCounty;
            this._correct(`Corrected county name: ${matchedCounty}`);
          }
        } else {
          this._warn(`Unknown Kenya county: ${ext.valueString}`);
        }
      }
    }
  }

  // Validate address array
  _validateAddressArray(addresses) {
    for (const address of addresses) {
      // Auto-set country for Kenya addresses
      if (!address.country && address.state) {
        const isKenyaCounty = KENYA_COUNTIES.some(c =>
          c.toLowerCase() === (address.state || '').toLowerCase()
        );
        if (isKenyaCounty) {
          address.country = 'Kenya';
          this._correct('Auto-set country to Kenya based on county');
        }
      }
    }
  }

  // Validate contact array (emergency contacts)
  _validateContactArray(contacts) {
    for (const contact of contacts) {
      // Validate contact phone numbers
      if (contact.telecom && Array.isArray(contact.telecom)) {
        this._validateTelecomArray(contact.telecom);
      }
      // Ensure relationship is set
      if (!contact.relationship || contact.relationship.length === 0) {
        this._warn('Emergency contact missing relationship');
      }
    }
  }

  // Correct Kenya date format (DD/MM/YYYY to YYYY-MM-DD)
  _correctKenyaDate(dateValue) {
    if (typeof dateValue !== 'string') {
      dateValue = String(dateValue);
    }

    // Already in correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // Kenya format: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = dateValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Try standard parsing
    return this._correctDate(dateValue);
  }

  // Correct Kenya phone format
  _correctKenyaPhone(phoneValue) {
    if (!phoneValue) return phoneValue;

    let digits = String(phoneValue).replace(/\D/g, '');

    // Handle various Kenya formats
    if (digits.startsWith('254') && digits.length === 12) {
      return `+${digits}`;
    }

    if (digits.startsWith('0') && digits.length === 10) {
      // Convert 0712345678 to +254712345678
      return `+254${digits.substring(1)}`;
    }

    if (digits.length === 9 && /^[17]/.test(digits)) {
      // Just 712345678, add country code
      return `+254${digits}`;
    }

    // Return original if we can't determine format
    return phoneValue;
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

  // EligibilityResponse validation (forgiving) - Enhanced for Kenya Insurance
  _validateEligibilityResponse(eligibilityResponse) {
    // Status validation
    if (!eligibilityResponse.status) {
      eligibilityResponse.status = 'active';
      this._correct('Set default status: active');
    } else {
      eligibilityResponse.status = this._correctEligibilityStatus(eligibilityResponse.status);
    }

    // Outcome validation
    if (!eligibilityResponse.outcome) {
      eligibilityResponse.outcome = 'complete';
      this._correct('Set default outcome: complete');
    } else {
      eligibilityResponse.outcome = this._correctEligibilityOutcome(eligibilityResponse.outcome);
    }

    // Purpose validation (required in FHIR R4)
    if (!eligibilityResponse.purpose || !Array.isArray(eligibilityResponse.purpose)) {
      eligibilityResponse.purpose = ['benefits'];
      this._correct('Set default purpose: benefits');
    }

    // Date corrections
    if (eligibilityResponse.created) {
      eligibilityResponse.created = this._correctDateTime(eligibilityResponse.created);
    } else {
      eligibilityResponse.created = new Date().toISOString();
      this._correct('Added creation timestamp');
    }

    // Validate patient reference
    if (!eligibilityResponse.patient) {
      this._warn('No patient reference provided');
    } else if (!eligibilityResponse.patient.reference && !eligibilityResponse.patient.identifier) {
      this._warn('Patient reference missing reference or identifier');
    }

    // Validate insurer reference
    if (!eligibilityResponse.insurer) {
      this._warn('No insurer reference provided');
    }

    // Validate insurance array with Kenya-specific checks
    if (eligibilityResponse.insurance && Array.isArray(eligibilityResponse.insurance)) {
      this._validateEligibilityInsurance(eligibilityResponse.insurance);
    } else if (!eligibilityResponse.insurance) {
      eligibilityResponse.insurance = [];
      this._warn('No insurance/coverage information provided');
    }

    // Validate Kenya-specific extensions
    if (eligibilityResponse.extension && this.options.enableKenyaValidation) {
      this._validateEligibilityExtensions(eligibilityResponse.extension);
    }

    // Validate error codes if present
    if (eligibilityResponse.error && Array.isArray(eligibilityResponse.error)) {
      this._validateEligibilityErrors(eligibilityResponse.error);
    }
  }

  // Validate eligibility insurance entries
  _validateEligibilityInsurance(insuranceArray) {
    for (let i = 0; i < insuranceArray.length; i++) {
      const insurance = insuranceArray[i];

      // Ensure coverage reference exists
      if (!insurance.coverage) {
        this._warn(`Insurance entry ${i + 1} missing coverage reference`);
      }

      // Validate inforce status (defaults to true for active coverage)
      if (insurance.inforce === undefined) {
        insurance.inforce = true;
        this._correct(`Set default inforce: true for insurance entry ${i + 1}`);
      }

      // Validate benefit period dates
      if (insurance.benefitPeriod) {
        if (insurance.benefitPeriod.start) {
          insurance.benefitPeriod.start = this._correctKenyaDate(insurance.benefitPeriod.start);
        }
        if (insurance.benefitPeriod.end) {
          insurance.benefitPeriod.end = this._correctKenyaDate(insurance.benefitPeriod.end);
        }
      }

      // Validate items (benefit categories)
      if (insurance.item && Array.isArray(insurance.item)) {
        this._validateEligibilityItems(insurance.item);
      }
    }
  }

  // Validate eligibility benefit items
  _validateEligibilityItems(items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Validate category
      if (!item.category) {
        this._warn(`Item ${i + 1} missing benefit category`);
      }

      // Validate benefits array
      if (item.benefit && Array.isArray(item.benefit)) {
        for (const benefit of item.benefit) {
          // Validate money amounts (default to KES)
          if (benefit.allowedMoney) {
            benefit.allowedMoney = this._correctMoneyAmountKES(benefit.allowedMoney);
          }
          if (benefit.usedMoney) {
            benefit.usedMoney = this._correctMoneyAmountKES(benefit.usedMoney);
          }
        }
      }
    }
  }

  // Validate eligibility extensions (Kenya-specific)
  _validateEligibilityExtensions(extensions) {
    for (const ext of extensions) {
      // Validate member status extension
      if (ext.url && ext.url.includes('member-status') && ext.valueCode) {
        ext.valueCode = this._correctMemberStatus(ext.valueCode);
      }

      // Validate dependent type extension
      if (ext.url && ext.url.includes('dependent-type') && ext.valueCode) {
        ext.valueCode = this._correctDependentType(ext.valueCode);
      }

      // Validate last contribution date
      if (ext.url && ext.url.includes('last-contribution-date') && ext.valueDate) {
        ext.valueDate = this._correctKenyaDate(ext.valueDate);
      }

      // Validate integrator source
      if (ext.url && ext.url.includes('integrator-source') && ext.valueCode) {
        ext.valueCode = this._correctIntegratorSource(ext.valueCode);
      }
    }
  }

  // Validate eligibility error codes
  _validateEligibilityErrors(errors) {
    for (const error of errors) {
      if (!error.code) {
        this._warn('Error entry missing code');
      }
    }
  }

  // Correct eligibility status
  _correctEligibilityStatus(status) {
    const normalized = String(status).toLowerCase().trim();
    const statusMap = {
      'active': 'active',
      'eligible': 'active',
      'valid': 'active',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'terminated': 'cancelled',
      'draft': 'draft',
      'pending': 'draft',
      'entered-in-error': 'entered-in-error',
      'error': 'entered-in-error'
    };

    const corrected = statusMap[normalized] || 'active';
    if (corrected !== status) {
      this._correct(`Corrected eligibility status: ${corrected}`);
    }
    return corrected;
  }

  // Correct eligibility outcome
  _correctEligibilityOutcome(outcome) {
    const normalized = String(outcome).toLowerCase().trim();
    const outcomeMap = {
      'complete': 'complete',
      'eligible': 'complete',
      'covered': 'complete',
      'approved': 'complete',
      'partial': 'partial',
      'limited': 'partial',
      'error': 'error',
      'ineligible': 'error',
      'denied': 'error',
      'queued': 'queued',
      'pending': 'queued'
    };

    const corrected = outcomeMap[normalized] || 'complete';
    if (corrected !== outcome) {
      this._correct(`Corrected eligibility outcome: ${corrected}`);
    }
    return corrected;
  }

  // Correct member status (Kenya-specific)
  _correctMemberStatus(status) {
    const normalized = String(status).toLowerCase().trim();
    const statusMap = {
      'active': 'active',
      'eligible': 'active',
      'current': 'active',
      'inactive': 'inactive',
      'expired': 'inactive',
      'suspended': 'suspended',
      'arrears': 'suspended',
      'pending': 'pending'
    };

    const corrected = statusMap[normalized] || status;
    if (corrected !== status) {
      this._correct(`Corrected member status: ${corrected}`);
    }
    return corrected;
  }

  // Correct dependent type
  _correctDependentType(type) {
    const normalized = String(type).toLowerCase().trim();
    const typeMap = {
      'principal': 'principal',
      'primary': 'principal',
      'self': 'principal',
      'spouse': 'spouse',
      'wife': 'spouse',
      'husband': 'spouse',
      'child': 'child',
      'son': 'child',
      'daughter': 'child',
      'parent': 'parent',
      'other': 'other'
    };

    const corrected = typeMap[normalized] || 'other';
    if (corrected !== type) {
      this._correct(`Corrected dependent type: ${corrected}`);
    }
    return corrected;
  }

  // Correct integrator source
  _correctIntegratorSource(source) {
    const normalized = String(source).toUpperCase().trim();
    const sourceMap = {
      'KHIE': 'KHIE',
      'KENYA_HIE': 'KHIE',
      'MAMATOTO': 'MAMATOTO',
      'MAMA_TOTO': 'MAMATOTO',
      'LCT': 'LCT',
      'SMART': 'SMART'
    };

    return sourceMap[normalized] || source;
  }

  // Correct money amount with KES default
  _correctMoneyAmountKES(amount) {
    if (typeof amount === 'number') {
      return {
        value: Math.round(amount * 100) / 100,
        currency: 'KES'
      };
    }

    if (typeof amount === 'string') {
      const numericValue = parseFloat(amount.replace(/[^0-9.-]/g, ''));
      return {
        value: isNaN(numericValue) ? 0 : Math.round(numericValue * 100) / 100,
        currency: 'KES'
      };
    }

    if (typeof amount === 'object') {
      // Ensure currency defaults to KES
      if (!amount.currency) {
        amount.currency = 'KES';
        this._correct('Set default currency: KES');
      }
      // Round value to 2 decimal places
      if (amount.value !== undefined) {
        amount.value = Math.round(amount.value * 100) / 100;
      }
      return amount;
    }

    return { value: 0, currency: 'KES' };
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