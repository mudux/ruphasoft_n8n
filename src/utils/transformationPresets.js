// Transformation Preset Library
// Common healthcare data transformations with Kenya-specific support
// Follows 80/20 rule - handles common cases well

/**
 * Preset categories and their transformations
 */
const TRANSFORMATION_PRESETS = {
  // Date and Time Transformations
  dates: {
    formatKenyaDate: {
      name: 'formatKenyaDate',
      description: 'Convert Kenya date formats (DD/MM/YYYY, DD-MM-YYYY) to FHIR format',
      category: 'dates',
      transform: (value) => {
        if (!value) return null;
        const str = String(value).trim();

        // Already in FHIR format
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }

        // DD/MM/YYYY or DD-MM-YYYY format (Kenya common)
        const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          const day = dmyMatch[1].padStart(2, '0');
          const month = dmyMatch[2].padStart(2, '0');
          const year = dmyMatch[3];
          return `${year}-${month}-${day}`;
        }

        // MM/DD/YYYY format (US style, sometimes used)
        const mdyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (mdyMatch && parseInt(mdyMatch[1]) > 12) {
          // First number > 12, likely DD/MM/YYYY
          const day = mdyMatch[1].padStart(2, '0');
          const month = mdyMatch[2].padStart(2, '0');
          const year = mdyMatch[3];
          return `${year}-${month}-${day}`;
        }

        // Try parsing as Date object
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }

        // Return original if unparseable (forgiving approach)
        return str;
      }
    },

    convertToFhirDate: {
      name: 'convertToFhirDate',
      description: 'Convert any date format to FHIR YYYY-MM-DD',
      category: 'dates',
      transform: (value) => {
        if (!value) return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toISOString().split('T')[0];
      }
    },

    convertToFhirDateTime: {
      name: 'convertToFhirDateTime',
      description: 'Convert to FHIR datetime with timezone',
      category: 'dates',
      transform: (value) => {
        if (!value) return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toISOString();
      }
    }
  },

  // Phone Number Transformations
  phone: {
    formatPhoneKE: {
      name: 'formatPhoneKE',
      description: 'Format Kenya phone numbers (+254...)',
      category: 'phone',
      transform: (value) => {
        if (!value) return null;
        let digits = String(value).replace(/\D/g, '');

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

        // Return with + prefix if already looks like international
        if (digits.length >= 10) {
          return `+${digits}`;
        }

        return value;
      }
    },

    formatPhoneNumber: {
      name: 'formatPhoneNumber',
      description: 'Format phone number with country code',
      category: 'phone',
      transform: (value) => {
        if (!value) return null;
        const digits = String(value).replace(/\D/g, '');

        // US format (10 digits)
        if (digits.length === 10) {
          return `+1${digits}`;
        }

        // Already has country code
        if (digits.length > 10) {
          return `+${digits}`;
        }

        return value;
      }
    }
  },

  // Name Transformations
  names: {
    buildFullName: {
      name: 'buildFullName',
      description: 'Combine first, middle, last names into full name',
      category: 'names',
      // This preset requires multiple fields - handled specially
      multiField: true,
      fields: ['firstName', 'middleName', 'lastName'],
      transform: (values) => {
        const parts = [
          values.firstName,
          values.middleName,
          values.lastName
        ].filter(p => p && String(p).trim());

        return parts.map(p =>
          String(p).trim()
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
        ).join(' ');
      }
    },

    formatName: {
      name: 'formatName',
      description: 'Capitalize names properly',
      category: 'names',
      transform: (value) => {
        if (!value) return null;
        return String(value)
          .split(' ')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      }
    },

    splitFullName: {
      name: 'splitFullName',
      description: 'Split full name into given and family name',
      category: 'names',
      multiOutput: true,
      transform: (value) => {
        if (!value) return { given: null, family: null };
        const parts = String(value).trim().split(/\s+/);

        if (parts.length === 1) {
          return { given: parts[0], family: null };
        }

        return {
          given: parts.slice(0, -1).join(' '),
          family: parts[parts.length - 1]
        };
      }
    }
  },

  // Gender Transformations
  gender: {
    normalizeGender: {
      name: 'normalizeGender',
      description: 'Normalize to FHIR gender values (male/female/other/unknown)',
      category: 'gender',
      transform: (value) => {
        if (!value) return 'unknown';
        const normalized = String(value).toLowerCase().trim();
        const genderMap = {
          'm': 'male', 'male': 'male', 'man': 'male', 'boy': 'male',
          'f': 'female', 'female': 'female', 'woman': 'female', 'girl': 'female',
          'o': 'other', 'other': 'other',
          'u': 'unknown', 'unknown': 'unknown', 'unk': 'unknown', '': 'unknown'
        };
        return genderMap[normalized] || 'unknown';
      }
    }
  },

  // Kenya-specific Identifier Transformations
  identifiers: {
    formatNationalId: {
      name: 'formatNationalId',
      description: 'Format Kenya National ID number',
      category: 'identifiers',
      transform: (value) => {
        if (!value) return null;
        // Kenya National IDs are typically 8 digits
        const digits = String(value).replace(/\D/g, '');
        return digits.padStart(8, '0');
      }
    },

    formatNHIFNumber: {
      name: 'formatNHIFNumber',
      description: 'Format NHIF member number',
      category: 'identifiers',
      transform: (value) => {
        if (!value) return null;
        // NHIF numbers are typically numeric
        return String(value).replace(/\D/g, '');
      }
    },

    formatSHANumber: {
      name: 'formatSHANumber',
      description: 'Format SHA (Social Health Authority) number',
      category: 'identifiers',
      transform: (value) => {
        if (!value) return null;
        // Clean and format SHA number
        return String(value).toUpperCase().trim();
      }
    },

    formatPassport: {
      name: 'formatPassport',
      description: 'Format passport number (uppercase)',
      category: 'identifiers',
      transform: (value) => {
        if (!value) return null;
        return String(value).toUpperCase().replace(/\s/g, '');
      }
    }
  },

  // Address Transformations
  address: {
    formatKenyaAddress: {
      name: 'formatKenyaAddress',
      description: 'Structure Kenya address with county/sub-county/ward',
      category: 'address',
      multiField: true,
      fields: ['street', 'ward', 'subCounty', 'county', 'postalCode'],
      transform: (values) => {
        const lines = [];
        if (values.street) lines.push(String(values.street).trim());
        if (values.ward) lines.push(String(values.ward).trim());

        return {
          line: lines,
          city: values.subCounty ? String(values.subCounty).trim() : null,
          state: values.county ? String(values.county).trim() : null,
          postalCode: values.postalCode ? String(values.postalCode).trim() : null,
          country: 'Kenya'
        };
      }
    }
  },

  // String Utilities
  strings: {
    toUpperCase: {
      name: 'toUpperCase',
      description: 'Convert to uppercase',
      category: 'strings',
      transform: (value) => value ? String(value).toUpperCase() : null
    },

    toLowerCase: {
      name: 'toLowerCase',
      description: 'Convert to lowercase',
      category: 'strings',
      transform: (value) => value ? String(value).toLowerCase() : null
    },

    trim: {
      name: 'trim',
      description: 'Remove leading/trailing whitespace',
      category: 'strings',
      transform: (value) => value ? String(value).trim() : null
    },

    removeSpecialChars: {
      name: 'removeSpecialChars',
      description: 'Remove special characters, keep alphanumeric',
      category: 'strings',
      transform: (value) => value ? String(value).replace(/[^a-zA-Z0-9\s]/g, '') : null
    }
  },

  // Numeric Transformations
  numbers: {
    formatMoney: {
      name: 'formatMoney',
      description: 'Convert to FHIR Money structure (KES)',
      category: 'numbers',
      transform: (value) => {
        if (value === null || value === undefined) return null;
        let numValue = value;
        if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        }
        return {
          value: isNaN(numValue) ? 0 : numValue,
          currency: 'KES'
        };
      }
    },

    formatMoneyUSD: {
      name: 'formatMoneyUSD',
      description: 'Convert to FHIR Money structure (USD)',
      category: 'numbers',
      transform: (value) => {
        if (value === null || value === undefined) return null;
        let numValue = value;
        if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        }
        return {
          value: isNaN(numValue) ? 0 : numValue,
          currency: 'USD'
        };
      }
    }
  },

  // Appointment-specific Transformations
  appointment: {
    formatKenyaDateTime: {
      name: 'formatKenyaDateTime',
      description: 'Convert Kenya date/time formats to FHIR instant (with EAT timezone)',
      category: 'appointment',
      transform: (value) => {
        if (!value) return null;
        const str = String(value).trim();

        // Already in ISO format
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
          // Add timezone if missing
          if (!str.includes('+') && !str.includes('Z')) {
            return str + '+03:00'; // East Africa Time
          }
          return str;
        }

        // Kenya format: DD/MM/YYYY HH:MM or DD-MM-YYYY HH:MM
        const kenyaMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (kenyaMatch) {
          const day = kenyaMatch[1].padStart(2, '0');
          const month = kenyaMatch[2].padStart(2, '0');
          const year = kenyaMatch[3];
          const hour = kenyaMatch[4].padStart(2, '0');
          const minute = kenyaMatch[5];
          const second = kenyaMatch[6] || '00';
          return `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`;
        }

        // Try to parse as Date object
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          // Format with EAT timezone offset
          return date.toISOString().replace('Z', '+03:00');
        }

        return str;
      }
    },

    formatFacilityCode: {
      name: 'formatFacilityCode',
      description: 'Format MOH facility code (5-digit Kenya MFL code)',
      category: 'appointment',
      transform: (value) => {
        if (!value) return null;
        // MOH Master Facility List codes are typically 5 digits
        const digits = String(value).replace(/\D/g, '');
        if (digits.length <= 5) {
          return digits.padStart(5, '0');
        }
        return digits;
      }
    },

    formatServiceType: {
      name: 'formatServiceType',
      description: 'Normalize Kenya healthcare service type codes',
      category: 'appointment',
      transform: (value) => {
        if (!value) return null;
        const normalized = String(value).toUpperCase().trim();

        // Map common service type variations to standard codes
        const serviceMap = {
          'GENERAL': 'GEN',
          'GENERAL CONSULTATION': 'GEN',
          'CONSULT': 'GEN',
          'OPD': 'GEN',
          'OUTPATIENT': 'GEN',
          'ANC': 'ANC',
          'ANTENATAL': 'ANC',
          'ANTENATAL CARE': 'ANC',
          'PNC': 'PNC',
          'POSTNATAL': 'PNC',
          'POSTNATAL CARE': 'PNC',
          'IMMUNIZATION': 'IMM',
          'VACCINATION': 'IMM',
          'VACCINE': 'IMM',
          'LAB': 'LAB',
          'LABORATORY': 'LAB',
          'TEST': 'LAB',
          'IMAGING': 'IMG',
          'RADIOLOGY': 'IMG',
          'XRAY': 'IMG',
          'X-RAY': 'IMG',
          'ULTRASOUND': 'IMG',
          'DENTAL': 'DEN',
          'DENTIST': 'DEN',
          'EYE': 'EYE',
          'OPTICAL': 'EYE',
          'OPHTHALMOLOGY': 'EYE',
          'MENTAL HEALTH': 'MHT',
          'PSYCHIATRY': 'MHT',
          'PSYCHOLOGY': 'MHT',
          'CHRONIC': 'CHR',
          'NCD': 'CHR',
          'DIABETES': 'CHR',
          'HYPERTENSION': 'CHR',
          'EMERGENCY': 'EMR',
          'CASUALTY': 'EMR',
          'SPECIALIST': 'SPC',
          'REFERRAL': 'SPC'
        };

        return serviceMap[normalized] || normalized;
      }
    },

    normalizeAppointmentStatus: {
      name: 'normalizeAppointmentStatus',
      description: 'Normalize to FHIR appointment status values',
      category: 'appointment',
      transform: (value) => {
        if (!value) return 'proposed';
        const normalized = String(value).toLowerCase().trim();

        // FHIR R4 appointment statuses
        const statusMap = {
          'proposed': 'proposed',
          'new': 'proposed',
          'pending': 'pending',
          'awaiting': 'pending',
          'booked': 'booked',
          'confirmed': 'booked',
          'scheduled': 'booked',
          'arrived': 'arrived',
          'checked-in': 'arrived',
          'checkedin': 'arrived',
          'fulfilled': 'fulfilled',
          'completed': 'fulfilled',
          'done': 'fulfilled',
          'cancelled': 'cancelled',
          'canceled': 'cancelled',
          'noshow': 'noshow',
          'no-show': 'noshow',
          'no show': 'noshow',
          'missed': 'noshow',
          'entered-in-error': 'entered-in-error',
          'error': 'entered-in-error',
          'waitlist': 'waitlist',
          'waiting': 'waitlist'
        };

        return statusMap[normalized] || 'proposed';
      }
    },

    validateAppointmentSlot: {
      name: 'validateAppointmentSlot',
      description: 'Validate and format appointment slot duration (minutes)',
      category: 'appointment',
      transform: (value) => {
        if (!value) return 15; // Default 15-minute slot
        let minutes = parseInt(String(value).replace(/\D/g, ''), 10);

        // Validate reasonable slot durations (5 min to 480 min / 8 hours)
        if (isNaN(minutes) || minutes < 5) {
          return 15;
        }
        if (minutes > 480) {
          return 480;
        }
        return minutes;
      }
    },

    formatPractitionerReference: {
      name: 'formatPractitionerReference',
      description: 'Format practitioner reference (Practitioner/ID)',
      category: 'appointment',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Practitioner/')) {
          return id;
        }
        return `Practitioner/${id}`;
      }
    },

    formatPatientReference: {
      name: 'formatPatientReference',
      description: 'Format patient reference (Patient/ID)',
      category: 'appointment',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Patient/')) {
          return id;
        }
        return `Patient/${id}`;
      }
    },

    formatLocationReference: {
      name: 'formatLocationReference',
      description: 'Format location reference (Location/ID)',
      category: 'appointment',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Location/')) {
          return id;
        }
        return `Location/${id}`;
      }
    },

    formatAppointmentPriority: {
      name: 'formatAppointmentPriority',
      description: 'Normalize appointment priority (1-9 scale, 1=highest)',
      category: 'appointment',
      transform: (value) => {
        if (!value) return 5; // Default medium priority
        const str = String(value).toLowerCase().trim();

        // Map text priorities to numeric
        const priorityMap = {
          'stat': 1,
          'emergency': 1,
          'urgent': 2,
          'asap': 3,
          'high': 3,
          'normal': 5,
          'routine': 5,
          'medium': 5,
          'low': 7,
          'elective': 9
        };

        if (priorityMap[str] !== undefined) {
          return priorityMap[str];
        }

        // Try as numeric
        const num = parseInt(str, 10);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          return num;
        }

        return 5;
      }
    }
  },

  // =====================================================
  // ClaimResponse-Specific Transformations
  // Kenya Insurance Claims (KHIE: SHA/SHIF/NHIF)
  // =====================================================
  claimResponse: {
    // Claim Number Formatting
    formatClaimNumber: {
      name: 'formatClaimNumber',
      description: 'Format Kenya insurance claim number (uppercase, no spaces)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        return String(value).toUpperCase().replace(/\s+/g, '').trim();
      }
    },

    formatSHAClaimNumber: {
      name: 'formatSHAClaimNumber',
      description: 'Format SHA (Social Health Authority) claim reference',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        // SHA claim refs typically start with SHA- or are numeric
        const cleaned = String(value).toUpperCase().replace(/\s+/g, '').trim();
        if (!cleaned.startsWith('SHA-') && /^\d+$/.test(cleaned)) {
          return `SHA-${cleaned}`;
        }
        return cleaned;
      }
    },

    formatNHIFClaimNumber: {
      name: 'formatNHIFClaimNumber',
      description: 'Format NHIF claim reference number',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        // NHIF claim refs are typically numeric
        const cleaned = String(value).replace(/\D/g, '').trim();
        return cleaned || String(value).toUpperCase().trim();
      }
    },

    formatPreauthNumber: {
      name: 'formatPreauthNumber',
      description: 'Format pre-authorization reference number',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        return String(value).toUpperCase().replace(/\s+/g, '').trim();
      }
    },

    // Monetary Transformations
    formatBenefitAmount: {
      name: 'formatBenefitAmount',
      description: 'Format benefit amount in KES with FHIR Money structure',
      category: 'claimResponse',
      transform: (value) => {
        if (value === null || value === undefined) return null;
        let numValue = value;
        if (typeof value === 'string') {
          // Remove currency symbols and formatting
          numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        }
        if (typeof value === 'object' && value.value !== undefined) {
          numValue = value.value;
        }
        return {
          value: isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100,
          currency: 'KES'
        };
      }
    },

    formatClaimAmount: {
      name: 'formatClaimAmount',
      description: 'Format submitted claim amount in KES',
      category: 'claimResponse',
      transform: (value) => {
        if (value === null || value === undefined) return null;
        let numValue = value;
        if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        }
        return {
          value: isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100,
          currency: 'KES'
        };
      }
    },

    formatCopayAmount: {
      name: 'formatCopayAmount',
      description: 'Format patient copayment amount in KES',
      category: 'claimResponse',
      transform: (value) => {
        if (value === null || value === undefined) return { value: 0, currency: 'KES' };
        let numValue = value;
        if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        }
        return {
          value: isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100,
          currency: 'KES'
        };
      }
    },

    // Status and Outcome Transformations
    normalizeClaimOutcome: {
      name: 'normalizeClaimOutcome',
      description: 'Normalize to FHIR ClaimResponse outcome (complete/partial/error/queued)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return 'queued';
        const normalized = String(value).toLowerCase().trim();

        const outcomeMap = {
          // Complete/Approved
          'complete': 'complete',
          'completed': 'complete',
          'approved': 'complete',
          'paid': 'complete',
          'accepted': 'complete',
          'success': 'complete',
          // Partial
          'partial': 'partial',
          'partially_approved': 'partial',
          'partially approved': 'partial',
          'partial_payment': 'partial',
          // Error/Denied
          'error': 'error',
          'denied': 'error',
          'rejected': 'error',
          'declined': 'error',
          'failed': 'error',
          // Queued/Pending
          'queued': 'queued',
          'pending': 'queued',
          'processing': 'queued',
          'submitted': 'queued',
          'under_review': 'queued',
          'under review': 'queued'
        };

        return outcomeMap[normalized] || 'queued';
      }
    },

    normalizeClaimStatus: {
      name: 'normalizeClaimStatus',
      description: 'Normalize to FHIR ClaimResponse status (active/cancelled/draft/entered-in-error)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return 'active';
        const normalized = String(value).toLowerCase().trim();

        const statusMap = {
          'active': 'active',
          'approved': 'active',
          'processed': 'active',
          'complete': 'active',
          'paid': 'active',
          'cancelled': 'cancelled',
          'canceled': 'cancelled',
          'voided': 'cancelled',
          'reversed': 'cancelled',
          'draft': 'draft',
          'pending': 'draft',
          'submitted': 'draft',
          'entered-in-error': 'entered-in-error',
          'error': 'entered-in-error',
          'invalid': 'entered-in-error'
        };

        return statusMap[normalized] || 'active';
      }
    },

    // Adjudication Code Parsing
    parseAdjudicationCode: {
      name: 'parseAdjudicationCode',
      description: 'Parse Kenya insurance adjudication codes',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        const code = String(value).toUpperCase().trim();

        // Map Kenya-specific adjudication codes to standard categories
        const codeMap = {
          // Benefit codes
          'BEN': 'benefit',
          'BENEFIT': 'benefit',
          'APPROVED': 'benefit',
          'PAYABLE': 'benefit',
          // Copay codes
          'COP': 'copay',
          'COPAY': 'copay',
          'COPAYMENT': 'copay',
          'PATIENT_SHARE': 'copay',
          // Deductible codes
          'DED': 'deductible',
          'DEDUCTIBLE': 'deductible',
          // Submitted codes
          'SUB': 'submitted',
          'SUBMITTED': 'submitted',
          'CLAIMED': 'submitted',
          // Eligible codes
          'ELG': 'eligible',
          'ELIGIBLE': 'eligible',
          'ALLOWABLE': 'eligible',
          // Tax
          'TAX': 'tax',
          'VAT': 'tax'
        };

        return codeMap[code] || code.toLowerCase();
      }
    },

    // Insurance Scheme Validation
    validateInsuranceScheme: {
      name: 'validateInsuranceScheme',
      description: 'Validate and normalize Kenya insurance scheme (SHA/SHIF/NHIF/Private)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return 'UNKNOWN';
        const normalized = String(value).toUpperCase().trim();

        // Map various scheme names to standard codes
        const schemeMap = {
          // SHA (Social Health Authority)
          'SHA': 'SHA',
          'SOCIAL HEALTH AUTHORITY': 'SHA',
          'SOCIAL_HEALTH_AUTHORITY': 'SHA',
          // SHIF (Social Health Insurance Fund)
          'SHIF': 'SHIF',
          'SOCIAL HEALTH INSURANCE FUND': 'SHIF',
          'SOCIAL_HEALTH_INSURANCE_FUND': 'SHIF',
          // NHIF (National Hospital Insurance Fund)
          'NHIF': 'NHIF',
          'NATIONAL HOSPITAL INSURANCE FUND': 'NHIF',
          'NATIONAL_HOSPITAL_INSURANCE_FUND': 'NHIF',
          // Private
          'PRIVATE': 'PRIVATE',
          'CORPORATE': 'PRIVATE',
          'EMPLOYER': 'PRIVATE',
          'INDIVIDUAL': 'PRIVATE'
        };

        return schemeMap[normalized] || 'PRIVATE';
      }
    },

    // Benefit Category Parsing
    parseBenefitCategory: {
      name: 'parseBenefitCategory',
      description: 'Parse Kenya insurance benefit category codes',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        const normalized = String(value).toUpperCase().trim();

        const categoryMap = {
          // Outpatient
          'OP': 'OP',
          'OUTPATIENT': 'OP',
          'OPD': 'OP',
          // Inpatient
          'IP': 'IP',
          'INPATIENT': 'IP',
          'IPD': 'IP',
          'ADMISSION': 'IP',
          // Maternity
          'MAT': 'MAT',
          'MATERNITY': 'MAT',
          'MATERNAL': 'MAT',
          'ANC': 'MAT',
          'PNC': 'MAT',
          'DELIVERY': 'MAT',
          // Surgical
          'SURG': 'SURG',
          'SURGICAL': 'SURG',
          'SURGERY': 'SURG',
          'OPERATION': 'SURG',
          // Dental
          'DENT': 'DENT',
          'DENTAL': 'DENT',
          // Optical
          'OPT': 'OPT',
          'OPTICAL': 'OPT',
          'EYE': 'OPT',
          'VISION': 'OPT',
          // Chronic
          'CHR': 'CHR',
          'CHRONIC': 'CHR',
          'NCD': 'CHR',
          // Emergency
          'EMR': 'EMR',
          'EMERGENCY': 'EMR',
          'CASUALTY': 'EMR',
          // Rehabilitation
          'REHAB': 'REHAB',
          'REHABILITATION': 'REHAB',
          'PHYSIO': 'REHAB',
          // Mental Health
          'MH': 'MH',
          'MENTAL': 'MH',
          'MENTAL_HEALTH': 'MH',
          'PSYCHIATRY': 'MH'
        };

        return categoryMap[normalized] || normalized;
      }
    },

    // Reference Formatting
    formatClaimReference: {
      name: 'formatClaimReference',
      description: 'Format reference to original Claim (Claim/ID)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Claim/')) {
          return id;
        }
        return `Claim/${id}`;
      }
    },

    formatInsurerReference: {
      name: 'formatInsurerReference',
      description: 'Format insurer/payer reference (Organization/ID)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Organization/')) {
          return id;
        }
        return `Organization/${id}`;
      }
    },

    formatCoverageReference: {
      name: 'formatCoverageReference',
      description: 'Format coverage reference (Coverage/ID)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Coverage/')) {
          return id;
        }
        return `Coverage/${id}`;
      }
    },

    // Error Code Formatting
    formatClaimErrorCode: {
      name: 'formatClaimErrorCode',
      description: 'Format Kenya claim error/denial codes',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        const code = String(value).toUpperCase().replace(/\s+/g, '_').trim();

        // Standard Kenya claim error codes
        const errorMap = {
          'INVALID_MEMBER': 'INV_MBR',
          'EXPIRED_COVERAGE': 'EXP_COV',
          'BENEFIT_EXCEEDED': 'BEN_EXC',
          'PREAUTH_REQUIRED': 'PREAUTH',
          'DUPLICATE_CLAIM': 'DUP_CLM',
          'INVALID_SERVICE': 'INV_SVC',
          'INVALID_DIAGNOSIS': 'INV_DX',
          'FACILITY_NOT_ACCREDITED': 'FAC_NA',
          'WAITING_PERIOD': 'WAIT_PD'
        };

        return errorMap[code] || code;
      }
    },

    // Date Transformations
    formatClaimDate: {
      name: 'formatClaimDate',
      description: 'Format claim processing date (Kenya format to FHIR)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        const str = String(value).trim();

        // Already in FHIR format
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }

        // DD/MM/YYYY or DD-MM-YYYY format (Kenya common)
        const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          const day = dmyMatch[1].padStart(2, '0');
          const month = dmyMatch[2].padStart(2, '0');
          const year = dmyMatch[3];
          return `${year}-${month}-${day}`;
        }

        // Try Date parsing
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }

        return str;
      }
    },

    formatPaymentDate: {
      name: 'formatPaymentDate',
      description: 'Format payment/settlement date',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return null;
        const str = String(value).trim();

        // Already in FHIR format
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }

        // DD/MM/YYYY format
        const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          const day = dmyMatch[1].padStart(2, '0');
          const month = dmyMatch[2].padStart(2, '0');
          const year = dmyMatch[3];
          return `${year}-${month}-${day}`;
        }

        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }

        return str;
      }
    },

    // Service Line Formatting
    formatServiceLineNumber: {
      name: 'formatServiceLineNumber',
      description: 'Format service line item sequence number',
      category: 'claimResponse',
      transform: (value) => {
        if (value === null || value === undefined) return 1;
        const num = parseInt(String(value), 10);
        return isNaN(num) || num < 1 ? 1 : num;
      }
    },

    // Integrator Source Tracking
    formatIntegratorSource: {
      name: 'formatIntegratorSource',
      description: 'Format integrator source identifier (KHIE/mamaTOTO/LCT/Smart)',
      category: 'claimResponse',
      transform: (value) => {
        if (!value) return 'UNKNOWN';
        const normalized = String(value).toUpperCase().trim();

        const integratorMap = {
          'KHIE': 'KHIE',
          'KENYA_HIE': 'KHIE',
          'MAMATOTO': 'MAMATOTO',
          'MAMA_TOTO': 'MAMATOTO',
          'LCT': 'LCT',
          'SMART': 'SMART',
          'SMART_CARE': 'SMART'
        };

        return integratorMap[normalized] || normalized;
      }
    }
  },

  // =====================================================
  // EligibilityResponse-Specific Transformations
  // Kenya Insurance Eligibility (KHIE, mamaTOTO, LCT, Smart)
  // =====================================================
  eligibilityResponse: {
    // Member Number Formatting
    formatNHIFMemberNumber: {
      name: 'formatNHIFMemberNumber',
      description: 'Format NHIF member number (numeric, clean)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        // NHIF member numbers are typically numeric
        return String(value).replace(/\D/g, '').trim();
      }
    },

    formatSHAHouseholdNumber: {
      name: 'formatSHAHouseholdNumber',
      description: 'Format SHA household ID (uppercase, alphanumeric)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        // SHA household IDs are alphanumeric, uppercase
        return String(value).toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
      }
    },

    formatSHIFNumber: {
      name: 'formatSHIFNumber',
      description: 'Format SHIF (Social Health Insurance Fund) member number',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        return String(value).toUpperCase().replace(/\s+/g, '').trim();
      }
    },

    formatPolicyNumber: {
      name: 'formatPolicyNumber',
      description: 'Format private insurance policy number',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        return String(value).toUpperCase().replace(/\s+/g, '').trim();
      }
    },

    // Contribution Status Validation
    validateContributionStatus: {
      name: 'validateContributionStatus',
      description: 'Validate and normalize contribution/payment status',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return 'unknown';
        const normalized = String(value).toLowerCase().trim();

        const statusMap = {
          // Active states
          'active': 'active',
          'current': 'active',
          'paid': 'active',
          'paid_up': 'active',
          'up_to_date': 'active',
          'compliant': 'active',
          // Inactive states
          'inactive': 'inactive',
          'expired': 'inactive',
          'lapsed': 'inactive',
          'terminated': 'inactive',
          // Suspended states (arrears)
          'suspended': 'suspended',
          'arrears': 'suspended',
          'in_arrears': 'suspended',
          'defaulted': 'suspended',
          'pending_payment': 'suspended',
          // Pending states
          'pending': 'pending',
          'pending_activation': 'pending',
          'awaiting': 'pending',
          'processing': 'pending',
          // Unknown
          'unknown': 'unknown'
        };

        return statusMap[normalized] || 'unknown';
      }
    },

    // Benefit Limit Formatting (KES)
    formatBenefitLimit: {
      name: 'formatBenefitLimit',
      description: 'Format coverage/benefit limit in KES',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (value === null || value === undefined) return null;
        let numValue = value;
        if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        }
        if (typeof value === 'object' && value.value !== undefined) {
          numValue = value.value;
        }
        return {
          value: isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100,
          currency: 'KES'
        };
      }
    },

    formatCopayAmount: {
      name: 'formatEligibilityCopay',
      description: 'Format copayment amount in KES',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (value === null || value === undefined) return { value: 0, currency: 'KES' };
        let numValue = value;
        if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        }
        return {
          value: isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100,
          currency: 'KES'
        };
      }
    },

    formatDeductibleAmount: {
      name: 'formatDeductibleAmount',
      description: 'Format deductible amount in KES',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (value === null || value === undefined) return { value: 0, currency: 'KES' };
        let numValue = value;
        if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        }
        return {
          value: isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100,
          currency: 'KES'
        };
      }
    },

    formatCoinsurancePercentage: {
      name: 'formatCoinsurancePercentage',
      description: 'Format coinsurance as percentage (0-100)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (value === null || value === undefined) return 0;
        let numValue = value;
        if (typeof value === 'string') {
          numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
        }
        // Ensure it's a valid percentage
        if (isNaN(numValue)) return 0;
        if (numValue > 100) return 100;
        if (numValue < 0) return 0;
        return Math.round(numValue * 100) / 100;
      }
    },

    // Eligibility Status Interpretation
    parseEligibilityStatus: {
      name: 'parseEligibilityStatus',
      description: 'Interpret eligibility status codes to FHIR values',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return 'active';
        const normalized = String(value).toLowerCase().trim();

        const statusMap = {
          // Active
          'active': 'active',
          'eligible': 'active',
          'approved': 'active',
          'valid': 'active',
          'covered': 'active',
          // Cancelled
          'cancelled': 'cancelled',
          'canceled': 'cancelled',
          'terminated': 'cancelled',
          'voided': 'cancelled',
          // Draft
          'draft': 'draft',
          'pending': 'draft',
          'processing': 'draft',
          // Entered in error
          'entered-in-error': 'entered-in-error',
          'error': 'entered-in-error',
          'invalid': 'entered-in-error'
        };

        return statusMap[normalized] || 'active';
      }
    },

    // Eligibility Outcome Parsing
    parseEligibilityOutcome: {
      name: 'parseEligibilityOutcome',
      description: 'Parse eligibility outcome (complete/partial/error/queued)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return 'queued';
        const normalized = String(value).toLowerCase().trim();

        const outcomeMap = {
          // Complete
          'complete': 'complete',
          'eligible': 'complete',
          'covered': 'complete',
          'approved': 'complete',
          'active': 'complete',
          // Partial
          'partial': 'partial',
          'partially_eligible': 'partial',
          'limited_coverage': 'partial',
          // Error
          'error': 'error',
          'ineligible': 'error',
          'not_covered': 'error',
          'denied': 'error',
          'expired': 'error',
          'suspended': 'error',
          // Queued
          'queued': 'queued',
          'pending': 'queued',
          'processing': 'queued'
        };

        return outcomeMap[normalized] || 'queued';
      }
    },

    // Member Status Normalization
    normalizeMemberStatus: {
      name: 'normalizeMemberStatus',
      description: 'Normalize member status for Kenya insurance (active/inactive/suspended/pending)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return 'unknown';
        const normalized = String(value).toLowerCase().trim();

        const statusMap = {
          'active': 'active',
          'eligible': 'active',
          'current': 'active',
          'valid': 'active',
          'inactive': 'inactive',
          'expired': 'inactive',
          'terminated': 'inactive',
          'lapsed': 'inactive',
          'suspended': 'suspended',
          'arrears': 'suspended',
          'defaulted': 'suspended',
          'pending': 'pending',
          'awaiting_activation': 'pending',
          'processing': 'pending'
        };

        return statusMap[normalized] || 'unknown';
      }
    },

    // Dependent Type Normalization
    normalizeDependentType: {
      name: 'normalizeDependentType',
      description: 'Normalize dependent relationship type',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return 'other';
        const normalized = String(value).toLowerCase().trim();

        const typeMap = {
          'principal': 'principal',
          'primary': 'principal',
          'self': 'principal',
          'main': 'principal',
          'head': 'principal',
          'spouse': 'spouse',
          'wife': 'spouse',
          'husband': 'spouse',
          'partner': 'spouse',
          'child': 'child',
          'son': 'child',
          'daughter': 'child',
          'dependent_child': 'child',
          'parent': 'parent',
          'mother': 'parent',
          'father': 'parent',
          'other': 'other',
          'dependent': 'other'
        };

        return typeMap[normalized] || 'other';
      }
    },

    // Insurance Scheme Validation (KHIE-specific)
    validateInsuranceScheme: {
      name: 'validateEligibilityScheme',
      description: 'Validate Kenya insurance scheme (SHA/SHIF/NHIF/Private)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return 'UNKNOWN';
        const normalized = String(value).toUpperCase().trim();

        const schemeMap = {
          // SHA (Social Health Authority)
          'SHA': 'SHA',
          'SOCIAL HEALTH AUTHORITY': 'SHA',
          'SOCIAL_HEALTH_AUTHORITY': 'SHA',
          // SHIF (Social Health Insurance Fund)
          'SHIF': 'SHIF',
          'SOCIAL HEALTH INSURANCE FUND': 'SHIF',
          // NHIF (Legacy)
          'NHIF': 'NHIF',
          'NATIONAL HOSPITAL INSURANCE FUND': 'NHIF',
          // Private insurers
          'JUBILEE': 'PRIVATE',
          'AAR': 'PRIVATE',
          'RESOLUTION': 'PRIVATE',
          'BRITAM': 'PRIVATE',
          'MADISON': 'PRIVATE',
          'CIC': 'PRIVATE',
          'PRIVATE': 'PRIVATE',
          'CORPORATE': 'PRIVATE'
        };

        return schemeMap[normalized] || 'PRIVATE';
      }
    },

    // Benefit Category Parsing
    parseBenefitCategory: {
      name: 'parseEligibilityBenefitCategory',
      description: 'Parse Kenya health benefit category codes',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const normalized = String(value).toUpperCase().trim();

        const categoryMap = {
          // Outpatient
          'OP': 'OP', 'OUTPATIENT': 'OP', 'OPD': 'OP',
          // Inpatient
          'IP': 'IP', 'INPATIENT': 'IP', 'IPD': 'IP', 'ADMISSION': 'IP',
          // Maternity
          'MAT': 'MAT', 'MATERNITY': 'MAT', 'MATERNAL': 'MAT',
          'ANC': 'MAT', 'PNC': 'MAT', 'DELIVERY': 'MAT',
          // Surgical
          'SURG': 'SURG', 'SURGICAL': 'SURG', 'SURGERY': 'SURG',
          // Dental
          'DENT': 'DENT', 'DENTAL': 'DENT',
          // Optical
          'OPT': 'OPT', 'OPTICAL': 'OPT', 'EYE': 'OPT', 'VISION': 'OPT',
          // Chronic
          'CHR': 'CHR', 'CHRONIC': 'CHR', 'NCD': 'CHR',
          // Emergency
          'EMR': 'EMR', 'EMERGENCY': 'EMR', 'CASUALTY': 'EMR',
          // Mental Health
          'MH': 'MH', 'MENTAL': 'MH', 'MENTAL_HEALTH': 'MH', 'PSYCHIATRY': 'MH',
          // Rehabilitation
          'REHAB': 'REHAB', 'REHABILITATION': 'REHAB', 'PHYSIO': 'REHAB',
          // Pharmacy
          'PHARM': 'PHARM', 'PHARMACY': 'PHARM', 'DRUGS': 'PHARM', 'MEDICATION': 'PHARM',
          // Laboratory
          'LAB': 'LAB', 'LABORATORY': 'LAB', 'DIAGNOSTICS': 'LAB',
          // Radiology
          'RAD': 'RAD', 'RADIOLOGY': 'RAD', 'IMAGING': 'RAD', 'XRAY': 'RAD'
        };

        return categoryMap[normalized] || normalized;
      }
    },

    // Date Transformations for Eligibility
    formatEffectiveDate: {
      name: 'formatEffectiveDate',
      description: 'Format coverage effective/start date',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const str = String(value).trim();

        // Already in FHIR format
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }

        // DD/MM/YYYY format (Kenya common)
        const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          const day = dmyMatch[1].padStart(2, '0');
          const month = dmyMatch[2].padStart(2, '0');
          const year = dmyMatch[3];
          return `${year}-${month}-${day}`;
        }

        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }

        return str;
      }
    },

    formatTerminationDate: {
      name: 'formatTerminationDate',
      description: 'Format coverage termination/end date',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const str = String(value).trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }

        const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          const day = dmyMatch[1].padStart(2, '0');
          const month = dmyMatch[2].padStart(2, '0');
          const year = dmyMatch[3];
          return `${year}-${month}-${day}`;
        }

        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }

        return str;
      }
    },

    formatLastContributionDate: {
      name: 'formatLastContributionDate',
      description: 'Format last contribution/payment date',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const str = String(value).trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }

        const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          const day = dmyMatch[1].padStart(2, '0');
          const month = dmyMatch[2].padStart(2, '0');
          const year = dmyMatch[3];
          return `${year}-${month}-${day}`;
        }

        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }

        return str;
      }
    },

    // Reference Formatting
    formatCoverageReference: {
      name: 'formatEligibilityCoverageRef',
      description: 'Format coverage reference (Coverage/ID)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Coverage/')) {
          return id;
        }
        return `Coverage/${id}`;
      }
    },

    formatInsurerReference: {
      name: 'formatEligibilityInsurerRef',
      description: 'Format insurer organization reference (Organization/ID)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Organization/')) {
          return id;
        }
        return `Organization/${id}`;
      }
    },

    formatPatientReference: {
      name: 'formatEligibilityPatientRef',
      description: 'Format patient reference (Patient/ID)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('Patient/')) {
          return id;
        }
        return `Patient/${id}`;
      }
    },

    formatRequestReference: {
      name: 'formatRequestReference',
      description: 'Format eligibility request reference (CoverageEligibilityRequest/ID)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const id = String(value).trim();
        if (id.startsWith('CoverageEligibilityRequest/')) {
          return id;
        }
        return `CoverageEligibilityRequest/${id}`;
      }
    },

    // Error Code Formatting
    formatEligibilityErrorCode: {
      name: 'formatEligibilityErrorCode',
      description: 'Format Kenya eligibility error/denial codes',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return null;
        const code = String(value).toUpperCase().replace(/\s+/g, '_').trim();

        const errorMap = {
          'INVALID_MEMBER': 'INV_MBR',
          'MEMBER_NOT_FOUND': 'NOT_FOUND',
          'EXPIRED_COVERAGE': 'EXP_COV',
          'CONTRIBUTION_ARREARS': 'ARREARS',
          'MEMBER_SUSPENDED': 'SUSPENDED',
          'SERVICE_NOT_COVERED': 'SVC_NC',
          'FACILITY_NOT_ACCREDITED': 'FAC_NA',
          'WAITING_PERIOD': 'WAIT_PD',
          'PREAUTH_REQUIRED': 'PREAUTH',
          'LIMIT_EXCEEDED': 'LIM_EXC'
        };

        return errorMap[code] || code;
      }
    },

    // Integrator Source Tracking
    formatIntegratorSource: {
      name: 'formatEligibilityIntegratorSource',
      description: 'Format integrator source (KHIE/mamaTOTO/LCT/Smart)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (!value) return 'UNKNOWN';
        const normalized = String(value).toUpperCase().trim();

        const integratorMap = {
          'KHIE': 'KHIE',
          'KENYA_HIE': 'KHIE',
          'MAMATOTO': 'MAMATOTO',
          'MAMA_TOTO': 'MAMATOTO',
          'LCT': 'LCT',
          'SMART': 'SMART',
          'SMART_CARE': 'SMART'
        };

        return integratorMap[normalized] || normalized;
      }
    },

    // Inforce Status Parsing
    parseInforceStatus: {
      name: 'parseInforceStatus',
      description: 'Parse coverage inforce status (boolean)',
      category: 'eligibilityResponse',
      transform: (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;

        const str = String(value).toLowerCase().trim();
        const trueValues = ['true', 'yes', '1', 'active', 'valid', 'inforce', 'covered', 'eligible'];
        return trueValues.includes(str);
      }
    }
  }
};

/**
 * Get a preset by name
 */
function getPreset(name) {
  for (const category of Object.values(TRANSFORMATION_PRESETS)) {
    if (category[name]) {
      return category[name];
    }
  }
  return null;
}

/**
 * Execute a preset transformation
 */
function applyPreset(presetName, value) {
  const preset = getPreset(presetName);
  if (!preset) {
    console.warn(`Unknown transformation preset: ${presetName}`);
    return value;
  }

  try {
    return preset.transform(value);
  } catch (error) {
    console.error(`Error applying preset ${presetName}:`, error.message);
    return value;
  }
}

/**
 * Get all available presets grouped by category
 */
function getAvailablePresets() {
  const presets = [];

  for (const [category, items] of Object.entries(TRANSFORMATION_PRESETS)) {
    for (const [name, preset] of Object.entries(items)) {
      presets.push({
        name,
        description: preset.description,
        category,
        multiField: preset.multiField || false,
        multiOutput: preset.multiOutput || false,
        fields: preset.fields || null
      });
    }
  }

  return presets;
}

/**
 * Get presets for a specific category
 */
function getPresetsByCategory(category) {
  const categoryData = TRANSFORMATION_PRESETS[category];
  if (!categoryData) return [];

  return Object.entries(categoryData).map(([name, preset]) => ({
    name,
    description: preset.description,
    category,
    multiField: preset.multiField || false,
    multiOutput: preset.multiOutput || false,
    fields: preset.fields || null
  }));
}

/**
 * Get preset options for n8n dropdown
 * Returns format: [{ name: 'Display Name', value: 'preset_name' }]
 */
function getPresetOptionsForNode() {
  const options = [
    { name: 'None', value: '' },
    { name: '--- Dates ---', value: '__separator_dates' },
    { name: 'Kenya Date (DD/MM/YYYY)', value: 'formatKenyaDate' },
    { name: 'FHIR Date (YYYY-MM-DD)', value: 'convertToFhirDate' },
    { name: 'FHIR DateTime', value: 'convertToFhirDateTime' },
    { name: '--- Phone ---', value: '__separator_phone' },
    { name: 'Kenya Phone (+254)', value: 'formatPhoneKE' },
    { name: 'International Phone', value: 'formatPhoneNumber' },
    { name: '--- Names ---', value: '__separator_names' },
    { name: 'Capitalize Name', value: 'formatName' },
    { name: '--- Gender ---', value: '__separator_gender' },
    { name: 'Normalize Gender', value: 'normalizeGender' },
    { name: '--- Kenya Identifiers ---', value: '__separator_ids' },
    { name: 'Kenya National ID', value: 'formatNationalId' },
    { name: 'NHIF Number', value: 'formatNHIFNumber' },
    { name: 'SHA Number', value: 'formatSHANumber' },
    { name: 'Passport', value: 'formatPassport' },
    { name: '--- Text ---', value: '__separator_text' },
    { name: 'Uppercase', value: 'toUpperCase' },
    { name: 'Lowercase', value: 'toLowerCase' },
    { name: 'Trim Whitespace', value: 'trim' },
    { name: 'Remove Special Chars', value: 'removeSpecialChars' },
    { name: '--- Money ---', value: '__separator_money' },
    { name: 'Format as KES', value: 'formatMoney' },
    { name: 'Format as USD', value: 'formatMoneyUSD' },
    { name: '--- Appointment ---', value: '__separator_appointment' },
    { name: 'Kenya DateTime (EAT)', value: 'formatKenyaDateTime' },
    { name: 'MOH Facility Code', value: 'formatFacilityCode' },
    { name: 'Service Type', value: 'formatServiceType' },
    { name: 'Appointment Status', value: 'normalizeAppointmentStatus' },
    { name: 'Slot Duration', value: 'validateAppointmentSlot' },
    { name: 'Priority', value: 'formatAppointmentPriority' },
    { name: 'Patient Reference', value: 'formatPatientReference' },
    { name: 'Practitioner Reference', value: 'formatPractitionerReference' },
    { name: 'Location Reference', value: 'formatLocationReference' }
  ];

  // Filter out separator items for actual use
  return options.filter(o => !o.value.startsWith('__separator'));
}

/**
 * Get preset options specifically for appointment node
 * Returns format: [{ name: 'Display Name', value: 'preset_name' }]
 */
function getAppointmentPresetOptions() {
  return [
    { name: 'None', value: '' },
    { name: '--- DateTime ---', value: '__sep_dt' },
    { name: 'Kenya DateTime (EAT)', value: 'formatKenyaDateTime' },
    { name: 'Kenya Date (DD/MM/YYYY)', value: 'formatKenyaDate' },
    { name: 'FHIR DateTime', value: 'convertToFhirDateTime' },
    { name: '--- Appointment ---', value: '__sep_apt' },
    { name: 'Appointment Status', value: 'normalizeAppointmentStatus' },
    { name: 'Service Type', value: 'formatServiceType' },
    { name: 'Slot Duration', value: 'validateAppointmentSlot' },
    { name: 'Priority', value: 'formatAppointmentPriority' },
    { name: '--- Facility ---', value: '__sep_fac' },
    { name: 'MOH Facility Code', value: 'formatFacilityCode' },
    { name: 'Location Reference', value: 'formatLocationReference' },
    { name: '--- References ---', value: '__sep_ref' },
    { name: 'Patient Reference', value: 'formatPatientReference' },
    { name: 'Practitioner Reference', value: 'formatPractitionerReference' },
    { name: '--- Kenya IDs ---', value: '__sep_ids' },
    { name: 'Kenya National ID', value: 'formatNationalId' },
    { name: 'SHA Number', value: 'formatSHANumber' },
    { name: 'NHIF Number', value: 'formatNHIFNumber' },
    { name: '--- Text ---', value: '__sep_text' },
    { name: 'Uppercase', value: 'toUpperCase' },
    { name: 'Lowercase', value: 'toLowerCase' },
    { name: 'Trim Whitespace', value: 'trim' }
  ].filter(o => !o.value.startsWith('__sep'));
}

/**
 * Get preset options specifically for ClaimResponse node
 * Returns format: [{ name: 'Display Name', value: 'preset_name' }]
 */
function getClaimResponsePresetOptions() {
  return [
    { name: 'None', value: '' },
    { name: '--- Claim Numbers ---', value: '__sep_clm' },
    { name: 'Claim Number', value: 'formatClaimNumber' },
    { name: 'SHA Claim Number', value: 'formatSHAClaimNumber' },
    { name: 'NHIF Claim Number', value: 'formatNHIFClaimNumber' },
    { name: 'Pre-auth Number', value: 'formatPreauthNumber' },
    { name: '--- Amounts (KES) ---', value: '__sep_amt' },
    { name: 'Benefit Amount', value: 'formatBenefitAmount' },
    { name: 'Claim Amount', value: 'formatClaimAmount' },
    { name: 'Copay Amount', value: 'formatCopayAmount' },
    { name: '--- Status/Outcome ---', value: '__sep_sts' },
    { name: 'Claim Outcome', value: 'normalizeClaimOutcome' },
    { name: 'Claim Status', value: 'normalizeClaimStatus' },
    { name: '--- Insurance ---', value: '__sep_ins' },
    { name: 'Insurance Scheme', value: 'validateInsuranceScheme' },
    { name: 'Benefit Category', value: 'parseBenefitCategory' },
    { name: 'Adjudication Code', value: 'parseAdjudicationCode' },
    { name: '--- References ---', value: '__sep_ref' },
    { name: 'Claim Reference', value: 'formatClaimReference' },
    { name: 'Insurer Reference', value: 'formatInsurerReference' },
    { name: 'Coverage Reference', value: 'formatCoverageReference' },
    { name: 'Patient Reference', value: 'formatPatientReference' },
    { name: '--- Dates ---', value: '__sep_dt' },
    { name: 'Claim Date', value: 'formatClaimDate' },
    { name: 'Payment Date', value: 'formatPaymentDate' },
    { name: 'Kenya Date (DD/MM/YYYY)', value: 'formatKenyaDate' },
    { name: '--- Error Handling ---', value: '__sep_err' },
    { name: 'Error Code', value: 'formatClaimErrorCode' },
    { name: '--- Service Lines ---', value: '__sep_svc' },
    { name: 'Line Number', value: 'formatServiceLineNumber' },
    { name: '--- Integrator ---', value: '__sep_int' },
    { name: 'Integrator Source', value: 'formatIntegratorSource' },
    { name: '--- Text ---', value: '__sep_txt' },
    { name: 'Uppercase', value: 'toUpperCase' },
    { name: 'Lowercase', value: 'toLowerCase' },
    { name: 'Trim Whitespace', value: 'trim' }
  ].filter(o => !o.value.startsWith('__sep'));
}

/**
 * Get preset options specifically for EligibilityResponse node
 * Returns format: [{ name: 'Display Name', value: 'preset_name' }]
 */
function getEligibilityResponsePresetOptions() {
  return [
    { name: 'None', value: '' },
    { name: '--- Member Numbers ---', value: '__sep_mbr' },
    { name: 'NHIF Member Number', value: 'formatNHIFMemberNumber' },
    { name: 'SHA Household Number', value: 'formatSHAHouseholdNumber' },
    { name: 'SHIF Number', value: 'formatSHIFNumber' },
    { name: 'Policy Number', value: 'formatPolicyNumber' },
    { name: 'SHA Number', value: 'formatSHANumber' },
    { name: '--- Status ---', value: '__sep_sts' },
    { name: 'Eligibility Status', value: 'parseEligibilityStatus' },
    { name: 'Eligibility Outcome', value: 'parseEligibilityOutcome' },
    { name: 'Member Status', value: 'normalizeMemberStatus' },
    { name: 'Contribution Status', value: 'validateContributionStatus' },
    { name: 'Inforce Status', value: 'parseInforceStatus' },
    { name: '--- Member Types ---', value: '__sep_dep' },
    { name: 'Dependent Type', value: 'normalizeDependentType' },
    { name: '--- Insurance Scheme ---', value: '__sep_ins' },
    { name: 'Insurance Scheme', value: 'validateEligibilityScheme' },
    { name: 'Benefit Category', value: 'parseEligibilityBenefitCategory' },
    { name: '--- Benefits (KES) ---', value: '__sep_ben' },
    { name: 'Benefit Limit', value: 'formatBenefitLimit' },
    { name: 'Copay Amount', value: 'formatEligibilityCopay' },
    { name: 'Deductible Amount', value: 'formatDeductibleAmount' },
    { name: 'Coinsurance %', value: 'formatCoinsurancePercentage' },
    { name: '--- References ---', value: '__sep_ref' },
    { name: 'Coverage Reference', value: 'formatEligibilityCoverageRef' },
    { name: 'Patient Reference', value: 'formatEligibilityPatientRef' },
    { name: 'Insurer Reference', value: 'formatEligibilityInsurerRef' },
    { name: 'Request Reference', value: 'formatRequestReference' },
    { name: '--- Dates ---', value: '__sep_dt' },
    { name: 'Effective Date', value: 'formatEffectiveDate' },
    { name: 'Termination Date', value: 'formatTerminationDate' },
    { name: 'Last Contribution Date', value: 'formatLastContributionDate' },
    { name: 'Kenya Date (DD/MM/YYYY)', value: 'formatKenyaDate' },
    { name: '--- Error Handling ---', value: '__sep_err' },
    { name: 'Error Code', value: 'formatEligibilityErrorCode' },
    { name: '--- Integrator ---', value: '__sep_int' },
    { name: 'Integrator Source', value: 'formatEligibilityIntegratorSource' },
    { name: '--- Text ---', value: '__sep_txt' },
    { name: 'Uppercase', value: 'toUpperCase' },
    { name: 'Lowercase', value: 'toLowerCase' },
    { name: 'Trim Whitespace', value: 'trim' }
  ].filter(o => !o.value.startsWith('__sep'));
}

module.exports = {
  TRANSFORMATION_PRESETS,
  getPreset,
  applyPreset,
  getAvailablePresets,
  getPresetsByCategory,
  getPresetOptionsForNode,
  getAppointmentPresetOptions,
  getClaimResponsePresetOptions,
  getEligibilityResponsePresetOptions
};
