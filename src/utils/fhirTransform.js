// FHIR Transformation Utilities
// Convert mapped data to FHIR resources with forgiving validation
// Enhanced with semantic path support and Kenya-specific transformations

const { AutoDetector } = require('../mapping/autoDetector');
const { ManualOverride } = require('../mapping/manualOverride');
const { ForgivingValidator } = require('../validation/forgivingValidator');
const { setValueAtSemanticPath, parseSemanticPath } = require('./semanticPaths');
const { applyPreset, getPreset, getAvailablePresets } = require('./transformationPresets');

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

      // Extract transformation metadata before validation (which may modify the resource)
      const transformationMeta = fhirResource._transformationMeta || { appliedMappings: [], skippedMappings: [] };
      delete fhirResource._transformationMeta; // Clean up before validation

      // Step 4: Validate and auto-correct
      const validationResult = this.validator.validate(fhirResource);

      // Step 5: Create standardized output
      const output = this._createStandardOutput(
        validationResult,
        autoDetectionResult,
        finalMappings,
        overrideResult,
        transformationMeta,
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

    // Track which mappings were applied vs skipped
    const appliedMappings = [];
    const skippedMappings = [];

    for (const mapping of mappings) {
      const sourceValue = inputPayload[mapping.sourceField];

      if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
        let transformedValue = this._transformValue(sourceValue, mapping.transformation);
        this._setResourceValue(resource, mapping.fhirPath, transformedValue);
        appliedMappings.push(mapping);
      } else {
        // Track mappings that were skipped due to missing source fields
        skippedMappings.push({
          ...mapping,
          skipReason: sourceValue === undefined ? 'source_field_not_found' : 'source_field_empty'
        });
        console.warn(`FHIR Transform Warning: Mapping skipped for '${mapping.sourceField}' → '${mapping.fhirPath}' (${sourceValue === undefined ? 'field not found in input' : 'field is empty/null'})`);
      }
    }

    // Attach metadata to resource for use in output generation
    resource._transformationMeta = {
      appliedMappings,
      skippedMappings
    };

    return resource;
  }

  // Set value at FHIR path (handles nested structures with semantic indices)
  // Supports both numeric indices (name[0]) and semantic indices (identifier[sha_number])
  _setResourceValue(resource, fhirPath, value) {
    // Use the semantic path handler for full support
    return setValueAtSemanticPath(resource, fhirPath, value);
  }

  // Parse path part - kept for backwards compatibility
  // Supports both numeric (name[0]) and semantic (identifier[sha_number]) indices
  _parsePathPart(part) {
    const match = part.match(/^([^[]+)\[([^\]]+)\]$/);
    if (match) {
      const indexOrName = match[2];
      // Check if it's a numeric index
      if (/^\d+$/.test(indexOrName)) {
        return { field: match[1], index: parseInt(indexOrName, 10), semantic: null };
      }
      // It's a semantic name
      return { field: match[1], index: null, semantic: indexOrName };
    }
    return { field: part, index: null, semantic: null };
  }

  // Transform individual values based on transformation type
  // First checks for presets, then falls back to built-in transformations
  _transformValue(value, transformation) {
    if (!transformation) return value;

    // Try to apply as a preset first
    const preset = getPreset(transformation);
    if (preset) {
      try {
        return applyPreset(transformation, value);
      } catch (error) {
        console.warn(`Preset ${transformation} failed, falling back to built-in:`, error.message);
      }
    }

    // Fall back to built-in transformations for backwards compatibility
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
        // Unknown transformation - try as preset one more time
        return applyPreset(transformation, value) || value;
    }
  }

  // Transformation helpers (kept for backwards compatibility)
  _convertToFhirDate(value) {
    // Use Kenya date format preset for better date handling
    return applyPreset('formatKenyaDate', value) || (() => {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
    })();
  }

  _formatPhoneNumber(value) {
    // Use Kenya phone format preset
    return applyPreset('formatPhoneKE', value) || (() => {
      const digits = String(value).replace(/\D/g, '');
      if (digits.length === 10) {
        return `+1${digits}`;
      }
      return value;
    })();
  }

  _normalizeGender(value) {
    return applyPreset('normalizeGender', value) || (() => {
      const normalized = String(value).toLowerCase().trim();
      const genderMap = {
        'm': 'male', 'male': 'male',
        'f': 'female', 'female': 'female',
        'o': 'other', 'other': 'other'
      };
      return genderMap[normalized] || 'unknown';
    })();
  }

  _formatName(value) {
    return applyPreset('formatName', value) || (() => {
      return String(value)
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    })();
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
  _createStandardOutput(validationResult, autoDetectionResult, mappings, overrideResult, transformationMeta, options) {
    const appliedMappings = transformationMeta.appliedMappings || [];
    const skippedMappings = transformationMeta.skippedMappings || [];

    // Create detailed warnings for skipped mappings
    const transformationWarnings = skippedMappings.map(skipped =>
      `Manual mapping '${skipped.sourceField}' → '${skipped.fhirPath}' was skipped: ${skipped.skipReason === 'source_field_not_found' ? 'Source field not found in input data' : 'Source field is empty or null'}`
    );

    // Combine validation warnings with transformation warnings
    const allWarnings = [...(validationResult.warnings || []), ...transformationWarnings];

    const output = {
      error: !validationResult.isValid,
      fhir_resource: validationResult.resource,
      err_message: validationResult.errors.length > 0 ? validationResult.errors.join('; ') : null,
      resource_type: this._capitalizeResourceType(this.resourceType),
      validation_summary: {
        status: validationResult.summary.status,
        mapped_fields: appliedMappings.map(m => m.sourceField),
        unmapped_fields: [
          ...autoDetectionResult.unmapped.map(u => u.sourceField),
          ...skippedMappings.map(s => s.sourceField)
        ],
        skipped_mappings: skippedMappings.map(s => ({
          sourceField: s.sourceField,
          fhirPath: s.fhirPath,
          reason: s.skipReason,
          userOverride: s.userOverride || false
        })),
        warnings: allWarnings,
        corrections: validationResult.corrections
      },
      mapping_summary: {
        total_input_fields: autoDetectionResult.totalFields,
        auto_detected: autoDetectionResult.mappedFields,
        user_overrides: overrideResult ? overrideResult.appliedChanges : 0,
        high_confidence: autoDetectionResult.autoApplyable.length,
        needs_review: autoDetectionResult.needsReview.length,
        successfully_applied: appliedMappings.length,
        skipped_due_to_missing_fields: skippedMappings.length
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
  // Returns combined list of presets and built-in transformations
  static getAvailableTransformations() {
    // Get all presets from the preset library
    const presets = getAvailablePresets().map(p => ({
      name: p.name,
      description: p.description,
      category: p.category,
      isPreset: true
    }));

    // Add legacy built-in transformations for backwards compatibility
    const builtIn = [
      { name: 'convertToFhirDate', description: 'Convert to YYYY-MM-DD date format', category: 'dates', isPreset: false },
      { name: 'formatPhoneNumber', description: 'Format phone number with country code', category: 'phone', isPreset: false },
      { name: 'normalizeGender', description: 'Normalize to FHIR gender values', category: 'gender', isPreset: false },
      { name: 'formatName', description: 'Capitalize names properly', category: 'names', isPreset: false },
      { name: 'toUpperCase', description: 'Convert to uppercase', category: 'strings', isPreset: false },
      { name: 'toLowerCase', description: 'Convert to lowercase', category: 'strings', isPreset: false },
      { name: 'trim', description: 'Remove leading/trailing whitespace', category: 'strings', isPreset: false }
    ];

    // Merge, preferring presets over built-in when names match
    const presetNames = new Set(presets.map(p => p.name));
    const mergedBuiltIn = builtIn.filter(b => !presetNames.has(b.name));

    return [...presets, ...mergedBuiltIn];
  }

  // Get transformations grouped by category for UI
  static getTransformationsByCategory() {
    const all = FhirTransformer.getAvailableTransformations();
    const grouped = {};

    for (const t of all) {
      const category = t.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(t);
    }

    return grouped;
  }
}

module.exports = { FhirTransformer };