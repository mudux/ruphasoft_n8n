// Manual Override System
// Robust interface for adjusting auto-detected field mappings

class ManualOverride {
  constructor(initialMappings = []) {
    this.mappings = this._cloneMappings(initialMappings);
    this.customMappings = [];
    this.removedMappings = [];
  }

  // Override a specific mapping
  overrideMapping(sourceField, newFhirPath, transformation = null) {
    const existingIndex = this.mappings.findIndex(m => m.sourceField === sourceField);

    if (existingIndex >= 0) {
      // Update existing mapping
      this.mappings[existingIndex] = {
        ...this.mappings[existingIndex],
        fhirPath: newFhirPath,
        transformation: transformation,
        userOverride: true,
        confidence: 100, // User override gets max confidence
        status: 'user_override'
      };
    } else {
      // Create new custom mapping
      this.addCustomMapping(sourceField, newFhirPath, transformation);
    }

    return this.mappings;
  }

  // Add completely new mapping for unmapped fields
  addCustomMapping(sourceField, fhirPath, transformation = null) {
    const customMapping = {
      sourceField: sourceField,
      fhirField: this._extractFieldName(fhirPath),
      fhirPath: fhirPath,
      value: null, // Will be populated during transformation
      confidence: 100,
      autoDetected: false,
      userOverride: true,
      transformation: transformation,
      status: 'custom_mapping'
    };

    this.customMappings.push(customMapping);
    this.mappings.push(customMapping);
    return customMapping;
  }

  // Remove a mapping (ignore field)
  removeMapping(sourceField) {
    const mappingIndex = this.mappings.findIndex(m => m.sourceField === sourceField);

    if (mappingIndex >= 0) {
      const removedMapping = this.mappings.splice(mappingIndex, 1)[0];
      this.removedMappings.push({
        ...removedMapping,
        status: 'removed_by_user'
      });
      return true;
    }

    return false;
  }

  // Restore a removed mapping
  restoreMapping(sourceField) {
    const removedIndex = this.removedMappings.findIndex(m => m.sourceField === sourceField);

    if (removedIndex >= 0) {
      const restoredMapping = this.removedMappings.splice(removedIndex, 1)[0];
      restoredMapping.status = 'restored';
      this.mappings.push(restoredMapping);
      return restoredMapping;
    }

    return null;
  }

  // Bulk update mappings
  bulkUpdate(mappingUpdates) {
    const results = [];

    for (const update of mappingUpdates) {
      try {
        const result = this.overrideMapping(
          update.sourceField,
          update.fhirPath,
          update.transformation
        );
        results.push({ success: true, sourceField: update.sourceField, result });
      } catch (error) {
        results.push({
          success: false,
          sourceField: update.sourceField,
          error: error.message
        });
      }
    }

    return results;
  }

  // Validate mapping configuration
  validateMapping(sourceField, fhirPath) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if source field exists
    if (!sourceField || sourceField.trim() === '') {
      validation.isValid = false;
      validation.errors.push('Source field cannot be empty');
    }

    // Check if FHIR path is valid
    if (!fhirPath || fhirPath.trim() === '') {
      validation.isValid = false;
      validation.errors.push('FHIR path cannot be empty');
    }

    // Check for path format
    if (fhirPath && !this._isValidFhirPath(fhirPath)) {
      validation.warnings.push('FHIR path format may not be valid');
    }

    // Check for duplicate mappings
    const existingMapping = this.mappings.find(m =>
      m.sourceField === sourceField || m.fhirPath === fhirPath
    );

    if (existingMapping) {
      validation.warnings.push('Mapping already exists and will be overridden');
    }

    return validation;
  }

  // Get mapping summary for UI display
  getMappingSummary() {
    return {
      total: this.mappings.length,
      autoDetected: this.mappings.filter(m => m.autoDetected && !m.userOverride).length,
      userOverrides: this.mappings.filter(m => m.userOverride).length,
      customMappings: this.customMappings.length,
      removedMappings: this.removedMappings.length,
      byStatus: this._groupByStatus(),
      byConfidence: this._groupByConfidence()
    };
  }

  // Export mappings for node execution
  exportMappings() {
    return {
      active: this.mappings.filter(m => m.status !== 'removed_by_user'),
      removed: this.removedMappings,
      summary: this.getMappingSummary(),
      metadata: {
        lastModified: new Date().toISOString(),
        totalMappings: this.mappings.length,
        hasUserOverrides: this.mappings.some(m => m.userOverride)
      }
    };
  }

  // Import mappings from saved configuration
  importMappings(savedMappings) {
    try {
      this.mappings = this._cloneMappings(savedMappings.active || []);
      this.removedMappings = this._cloneMappings(savedMappings.removed || []);
      this.customMappings = this.mappings.filter(m => !m.autoDetected);
      return { success: true, imported: this.mappings.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  _cloneMappings(mappings) {
    return JSON.parse(JSON.stringify(mappings));
  }

  _extractFieldName(fhirPath) {
    // Extract field name from path like 'name[0].given[0]' -> 'given'
    const lastPart = fhirPath.split('.').pop();
    return lastPart.replace(/\[\d+\]/, '');
  }

  _isValidFhirPath(path) {
    // Basic FHIR path validation
    const fhirPathPattern = /^[a-zA-Z][a-zA-Z0-9]*(\[\d+\])?(\.[a-zA-Z][a-zA-Z0-9]*(\[\d+\])?)*$/;
    return fhirPathPattern.test(path);
  }

  _groupByStatus() {
    const groups = {};
    for (const mapping of this.mappings) {
      groups[mapping.status] = (groups[mapping.status] || 0) + 1;
    }
    return groups;
  }

  _groupByConfidence() {
    const groups = { high: 0, medium: 0, low: 0 };
    for (const mapping of this.mappings) {
      if (mapping.confidence >= 75) groups.high++;
      else if (mapping.confidence >= 50) groups.medium++;
      else groups.low++;
    }
    return groups;
  }
}

// Helper class for mapping templates
class MappingTemplate {
  static createTemplate(name, mappings, description = '') {
    return {
      name,
      description,
      mappings,
      createdAt: new Date().toISOString()
    };
  }

  static applyTemplate(override, template) {
    const results = override.bulkUpdate(template.mappings);
    return {
      applied: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = { ManualOverride, MappingTemplate };