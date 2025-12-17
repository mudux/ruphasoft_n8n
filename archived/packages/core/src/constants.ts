// FHIR constants and defaults

// FHIR resource types
export const FHIR_RESOURCE_TYPES = {
  PATIENT: 'Patient',
  OBSERVATION: 'Observation',
  ENCOUNTER: 'Encounter',
  PRACTITIONER: 'Practitioner',
  ORGANIZATION: 'Organization',
  LOCATION: 'Location',
  MEDICATION: 'Medication',
  MEDICATION_REQUEST: 'MedicationRequest',
  DIAGNOSTIC_REPORT: 'DiagnosticReport',
  CLAIM_RESPONSE: 'ClaimResponse',
  COVERAGE: 'Coverage',
  EXPLANATION_OF_BENEFIT: 'ExplanationOfBenefit',
} as const;

// Common FHIR value sets
export const FHIR_VALUE_SETS = {
  GENDER: {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
    UNKNOWN: 'unknown',
  },
  NAME_USE: {
    USUAL: 'usual',
    OFFICIAL: 'official',
    TEMP: 'temp',
    NICKNAME: 'nickname',
    ANONYMOUS: 'anonymous',
    OLD: 'old',
    MAIDEN: 'maiden',
  },
  CONTACT_SYSTEM: {
    PHONE: 'phone',
    FAX: 'fax',
    EMAIL: 'email',
    PAGER: 'pager',
    URL: 'url',
    SMS: 'sms',
    OTHER: 'other',
  },
  CONTACT_USE: {
    HOME: 'home',
    WORK: 'work',
    TEMP: 'temp',
    OLD: 'old',
    MOBILE: 'mobile',
  },
  IDENTIFIER_USE: {
    USUAL: 'usual',
    OFFICIAL: 'official',
    TEMP: 'temp',
    SECONDARY: 'secondary',
  },
  OBSERVATION_STATUS: {
    REGISTERED: 'registered',
    PRELIMINARY: 'preliminary',
    FINAL: 'final',
    AMENDED: 'amended',
    CORRECTED: 'corrected',
    CANCELLED: 'cancelled',
    ENTERED_IN_ERROR: 'entered-in-error',
    UNKNOWN: 'unknown',
  },
  ENCOUNTER_STATUS: {
    PLANNED: 'planned',
    ARRIVED: 'arrived',
    TRIAGED: 'triaged',
    IN_PROGRESS: 'in-progress',
    ONLEAVE: 'onleave',
    FINISHED: 'finished',
    CANCELLED: 'cancelled',
    ENTERED_IN_ERROR: 'entered-in-error',
    UNKNOWN: 'unknown',
  },
  ENCOUNTER_CLASS: {
    AMB: 'AMB',      // Ambulatory
    EMER: 'EMER',    // Emergency
    FLD: 'FLD',      // Field
    HH: 'HH',        // Home health
    IMP: 'IMP',      // Inpatient
    ACUTE: 'ACUTE',  // Inpatient acute
    NONAC: 'NONAC',  // Inpatient non-acute
    OBSENC: 'OBSENC', // Observation encounter
    PRENC: 'PRENC',  // Pre-admission
    SS: 'SS',        // Short stay
    VR: 'VR',        // Virtual
  },
} as const;

// Common terminology systems
export const TERMINOLOGY_SYSTEMS = {
  LOINC: 'http://loinc.org',
  SNOMED: 'http://snomed.info/sct',
  ICD10: 'http://hl7.org/fhir/sid/icd-10',
  CPT: 'http://www.ama-assn.org/go/cpt',
  UCUM: 'http://unitsofmeasure.org',
  HL7_V3_ACT_CODE: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
  HL7_V2_GENDER: 'http://terminology.hl7.org/CodeSystem/v2-0001',
} as const;

// Smart defaults for FHIR resources
export const SMART_DEFAULTS = {
  Patient: {
    active: true,
    gender: FHIR_VALUE_SETS.GENDER.UNKNOWN,
    identifier: [
      {
        use: FHIR_VALUE_SETS.IDENTIFIER_USE.USUAL,
        system: 'http://hospital.example.org/patient-ids',
      },
    ],
  },
  Observation: {
    status: FHIR_VALUE_SETS.OBSERVATION_STATUS.FINAL,
    effectiveDateTime: () => new Date().toISOString(),
    performer: [],
  },
  Encounter: {
    status: FHIR_VALUE_SETS.ENCOUNTER_STATUS.FINISHED,
    class: {
      system: TERMINOLOGY_SYSTEMS.HL7_V3_ACT_CODE,
      code: FHIR_VALUE_SETS.ENCOUNTER_CLASS.AMB,
      display: 'ambulatory',
    },
  },
  Practitioner: {
    active: true,
    identifier: [
      {
        use: FHIR_VALUE_SETS.IDENTIFIER_USE.OFFICIAL,
        system: 'http://hl7.org/fhir/sid/us-npi',
      },
    ],
  },
  Organization: {
    active: true,
    identifier: [
      {
        use: FHIR_VALUE_SETS.IDENTIFIER_USE.OFFICIAL,
        system: 'http://hl7.org/fhir/sid/us-npi',
      },
    ],
  },
} as const;

// Common LOINC codes for observations
export const COMMON_LOINC_CODES = {
  // Vital Signs
  BODY_HEIGHT: {
    code: '8302-2',
    display: 'Body height',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  BODY_WEIGHT: {
    code: '29463-7',
    display: 'Body weight',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  BMI: {
    code: '39156-5',
    display: 'Body mass index (BMI) [Ratio]',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  BLOOD_PRESSURE_SYSTOLIC: {
    code: '8480-6',
    display: 'Systolic blood pressure',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  BLOOD_PRESSURE_DIASTOLIC: {
    code: '8462-4',
    display: 'Diastolic blood pressure',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  HEART_RATE: {
    code: '8867-4',
    display: 'Heart rate',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  RESPIRATORY_RATE: {
    code: '9279-1',
    display: 'Respiratory rate',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  BODY_TEMPERATURE: {
    code: '8310-5',
    display: 'Body temperature',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  OXYGEN_SATURATION: {
    code: '2708-6',
    display: 'Oxygen saturation in Arterial blood',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },

  // Laboratory
  GLUCOSE: {
    code: '33747-0',
    display: 'Glucose [Mass/volume] in Blood',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  CHOLESTEROL_TOTAL: {
    code: '2093-3',
    display: 'Cholesterol [Mass/volume] in Serum or Plasma',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
  HEMOGLOBIN: {
    code: '718-7',
    display: 'Hemoglobin [Mass/volume] in Blood',
    system: TERMINOLOGY_SYSTEMS.LOINC,
  },
} as const;

// Node categories for n8n
export const NODE_CATEGORIES = {
  FHIR_CORE: 'FHIR Core Resources',
  FHIR_CLINICAL: 'FHIR Clinical',
  FHIR_ADMINISTRATIVE: 'FHIR Administrative',
  FHIR_FINANCIAL: 'FHIR Financial',
  FHIR_MEDICATION: 'FHIR Medication',
} as const;