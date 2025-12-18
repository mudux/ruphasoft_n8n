// FHIR Transformation Utilities
// Convert mapped data to FHIR resources with forgiving validation

const { AutoDetector } = require('../mapping/autoDetector');
const { ManualOverride } = require('../mapping/manualOverride');
const { ForgivingValidator } = require('../validation/forgivingValidator');

class FhirTransformer {
  constructor(resourceType) {
    this.resourceType = resourceType;
    this.autoDetector = new AutoDetector(resourceType);
    this.validator = new ForgivingValidator(resourceType);
  }

  // Main transformation pipeline
  async transform(inputPayload, userMappings = null, options = {}) {
    try {
      // Step 1: Auto-detect field mappings
      const autoDetectionResult = this.autoDetector.detectMappings(inputPayload);

      // Step 2: Apply manual overrides if provided
      let finalMappings = autoDetectionResult.mappings;
      let overrideResult = null;

      if (userMappings) {
        const manualOverride = new ManualOverride(autoDetectionResult.mappings);
        overrideResult = this._applyUserMappings(manualOverride, userMappings);
        finalMappings = manualOverride.exportMappings().active;
      }

      // Step 3: Transform to FHIR resource
      const fhirResource = this._buildFhirResource(inputPayload, finalMappings);

      // Step 4: Validate and auto-correct
      const validationResult = this.validator.validate(fhirResource);

      // Step 5: Create standardized output
      const output = this._createStandardOutput(
        validationResult,
        autoDetectionResult,
        finalMappings,
        overrideResult,
        options
      );

      return output;

    } catch (error) {
      return this._createErrorOutput(error, inputPayload);
    }
  }

  // Build FHIR resource from mappings
  _buildFhirResource(inputPayload, mappings) {
    const resource = {
      resourceType: this._capitalizeResourceType(this.resourceType)
    };

    for (const mapping of mappings) {
      const sourceValue = inputPayload[mapping.sourceField];

      if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
        let transformedValue = this._transformValue(sourceValue, mapping.transformation);
        this._setResourceValue(resource, mapping.fhirPath, transformedValue);
      }
    }

    return resource;
  }

  // Set value at FHIR path (handles nested structures)
  _setResourceValue(resource, fhirPath, value) {
    const parts = fhirPath.split('.');
    let current = resource;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const { field, index } = this._parsePathPart(part);

      if (!current[field]) {
        current[field] = index !== null ? [] : {};
      }

      if (index !== null) {
        // Array handling
        while (current[field].length <= index) {
          current[field].push({});
        }
        current = current[field][index];
      } else {
        current = current[field];
      }
    }

    // Set final value
    const lastPart = parts[parts.length - 1];
    const { field, index } = this._parsePathPart(lastPart);

    if (index !== null) {
      if (!current[field]) current[field] = [];
      while (current[field].length <= index) {
        current[field].push(null);
      }
      current[field][index] = value;
    } else {
      current[field] = value;
    }
  }

  // Parse path part like 'name[0]' -> {field: 'name', index: 0}
  _parsePathPart(part) {
    const match = part.match(/^([^[]+)\[(\d+)\]$/);
    if (match) {
      return { field: match[1], index: parseInt(match[2], 10) };
    }
    return { field: part, index: null };
  }

  // Transform individual values based on transformation type
  _transformValue(value, transformation) {
    if (!transformation) return value;

    switch (transformation) {
      case 'convertToFhirDate':
        return this._convertToFhirDate(value);
      case 'formatPhoneNumber':
        return this._formatPhoneNumber(value);
      case 'normalizeGender':
        return this._normalizeGender(value);
      case 'formatName':
        return this._formatName(value);
      case 'toUpperCase':
        return String(value).toUpperCase();
      case 'toLowerCase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      default:
        return value;
    }
  }

  // Transformation helpers
  _convertToFhirDate(value) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
  }

  _formatPhoneNumber(value) {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    return value;
  }

  _normalizeGender(value) {
    const normalized = String(value).toLowerCase().trim();
    const genderMap = {
      'm': 'male', 'male': 'male',
      'f': 'female', 'female': 'female',
      'o': 'other', 'other': 'other'
    };
    return genderMap[normalized] || 'unknown';
  }

  _formatName(value) {
    return String(value)
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  // Apply user mappings
  _applyUserMappings(manualOverride, userMappings) {
    const results = [];

    for (const userMapping of userMappings) {
      if (userMapping.action === 'override') {
        manualOverride.overrideMapping(
          userMapping.sourceField,
          userMapping.fhirPath,
          userMapping.transformation
        );
        results.push({ action: 'override', field: userMapping.sourceField, success: true });
      } else if (userMapping.action === 'remove') {
        const success = manualOverride.removeMapping(userMapping.sourceField);
        results.push({ action: 'remove', field: userMapping.sourceField, success });
      } else if (userMapping.action === 'add') {
        manualOverride.addCustomMapping(
          userMapping.sourceField,
          userMapping.fhirPath,
          userMapping.transformation
        );
        results.push({ action: 'add', field: userMapping.sourceField, success: true });
      }
    }

    return {
      appliedChanges: results.filter(r => r.success).length,
      failedChanges: results.filter(r => !r.success).length,
      details: results
    };
  }

  // Create standardized output format
  _createStandardOutput(validationResult, autoDetectionResult, mappings, overrideResult, options) {
    const output = {
      error: !validationResult.isValid,
      fhir_resource: validationResult.resource,
      err_message: validationResult.errors.length > 0 ? validationResult.errors.join('; ') : null,
      resource_type: this._capitalizeResourceType(this.resourceType),
      validation_summary: {
        status: validationResult.summary.status,
        mapped_fields: mappings.map(m => m.sourceField),
        unmapped_fields: autoDetectionResult.unmapped.map(u => u.sourceField),
        warnings: validationResult.warnings,
        corrections: validationResult.corrections
      },
      mapping_summary: {
        total_input_fields: autoDetectionResult.totalFields,
        auto_detected: autoDetectionResult.mappedFields,
        user_overrides: overrideResult ? overrideResult.appliedChanges : 0,
        high_confidence: autoDetectionResult.autoApplyable.length,
        needs_review: autoDetectionResult.needsReview.length
      },
      metadata: {
        transformation_time: new Date().toISOString(),
        resource_id: validationResult.resource.id,
        processing_mode: options.mode || 'standard'
      }
    };

    // Include detailed mapping info if requested
    if (options.includeDetailedMapping) {
      output.detailed_mapping = {
        auto_detection_result: autoDetectionResult,
        final_mappings: mappings,
        override_result: overrideResult
      };
    }

    return output;
  }

  // Create error output
  _createErrorOutput(error, inputPayload) {
    return {
      error: true,
      fhir_resource: null,
      err_message: error.message,
      resource_type: this._capitalizeResourceType(this.resourceType),
      validation_summary: {
        status: 'error',
        mapped_fields: [],
        unmapped_fields: Object.keys(inputPayload || {}),
        warnings: [],
        corrections: []
      },
      mapping_summary: {
        total_input_fields: Object.keys(inputPayload || {}).length,
        auto_detected: 0,
        user_overrides: 0,
        high_confidence: 0,
        needs_review: 0
      },
      metadata: {
        transformation_time: new Date().toISOString(),
        resource_id: null,
        processing_mode: 'error'
      }
    };
  }

  _capitalizeResourceType(type) {
    // Handle special FHIR resource type mappings
    const typeMapping = {
      'eligibilityResponse': 'CoverageEligibilityResponse',
      'claimResponse': 'ClaimResponse'
    };

    if (typeMapping[type]) {
      return typeMapping[type];
    }

    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  // Get available transformations for UI
  static getAvailableTransformations() {
    return [
      { name: 'convertToFhirDate', description: 'Convert to YYYY-MM-DD date format' },
      { name: 'formatPhoneNumber', description: 'Format phone number with country code' },
      { name: 'normalizeGender', description: 'Normalize to FHIR gender values' },
      { name: 'formatName', description: 'Capitalize names properly' },
      { name: 'toUpperCase', description: 'Convert to uppercase' },
      { name: 'toLowerCase', description: 'Convert to lowercase' },
      { name: 'trim', description: 'Remove leading/trailing whitespace' }
    ];
  }
}

module.exports = { FhirTransformer };