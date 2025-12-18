# FHIR Nodes Example Workflows

This directory contains comprehensive example workflows demonstrating all aspects of the FHIR transformation nodes.

## 📋 Complete Example Collection

### 🏥 Patient Resource Examples

| File | Processing Mode | Description | Key Features |
|------|-----------------|-------------|--------------|
| `patient-transformation-workflow.json` | Auto | Basic patient transformation | Simple demographic mapping |
| `patient-complex-manual-workflow.json` | Manual | Complex patient data | 15+ field mappings, transformations, contacts |

### 📅 Appointment Resource Examples

| File | Processing Mode | Description | Key Features |
|------|-----------------|-------------|--------------|
| `appointment-auto-detection-workflow.json` | Auto | Standard scheduling data | Auto-detection of appointment fields |
| `appointment-manual-override-workflow.json` | Manual | Custom appointment mapping | Participant mapping, complex scheduling |

### 📦 Bundle Resource Examples

| File | Processing Mode | Description | Key Features |
|------|-----------------|-------------|--------------|
| `bundle-auto-detection-workflow.json` | Auto | Healthcare transaction data | Transaction bundle auto-detection |
| `bundle-template-workflow.json` | Template | Template-based transformation | Pre-configured bundle mappings |

### 💰 ClaimResponse Resource Examples

| File | Processing Mode | Description | Key Features |
|------|-----------------|-------------|--------------|
| `claimresponse-auto-workflow.json` | Auto | Simple claim processing | Basic claim response fields |
| `claimresponse-manual-override-workflow.json` | Manual | Complex adjudication | Payment details, line items, notes |

### 🏥 EligibilityResponse Resource Examples

| File | Processing Mode | Description | Key Features |
|------|-----------------|-------------|--------------|
| `eligibilityresponse-auto-workflow.json` | Auto | Standard eligibility check | Benefits analysis, coverage details |
| `eligibilityresponse-manual-workflow.json` | Manual | Complex eligibility mapping | Multiple benefits, prior auth |

### 🔧 Advanced Workflow Examples

| File | Description | Key Features |
|------|-------------|--------------|
| `multi-resource-workflow.json` | Complete healthcare pipeline | Patient → Appointment → ClaimResponse → Bundle |
| `error-handling-workflow.json` | Error handling and validation | Error analysis, debugging, recommendations |

---

## 🚀 Quick Start Guide

### 1. Import Any Example
1. Copy the JSON content from any example file
2. In n8n, go to **Workflows** → **Import from URL or Clipboard**
3. Paste the JSON content
4. Click **Import workflow**

### 2. Execute the Workflow
1. Click the **Execute Workflow** button
2. Observe the transformation results
3. Check the output for FHIR resources and validation summaries

### 3. Customize for Your Data
1. Modify the **Set** node data to match your input format
2. Adjust **Manual Override** mappings if needed
3. Enable **Include Detailed Mapping Info** for debugging

---

## 📊 Expected Results by Processing Mode

### 🤖 Auto-Detection Mode

**Input Quality → Expected Results:**
- **High-quality healthcare data**: 70-90% fields mapped
- **Standard EHR exports**: 60-80% fields mapped
- **Custom/legacy data**: 30-60% fields mapped
- **Non-healthcare data**: 0-20% fields mapped

**Example Auto-Detection Success:**
```json
{
  "mapping_summary": {
    "total_input_fields": 10,
    "auto_detected": 8,
    "high_confidence": 6,
    "needs_review": 2
  }
}
```

### ✋ Manual Override Mode

**Perfect for:**
- Complex data structures
- Custom field names
- Specific transformation requirements
- Legacy system integration

**Example Manual Override:**
```json
{
  "manualMappings": {
    "mappingValues": [
      {
        "sourceField": "custom_patient_name",
        "fhirPath": "name[0].text",
        "transformation": "formatName",
        "action": "override"
      }
    ]
  }
}
```

### 📋 Template Mode

**Benefits:**
- Pre-configured mappings
- Consistent transformations
- Reduced setup time
- Standardized outputs

---

## 🔍 Troubleshooting Common Issues

### ❌ "0 Auto-Detected Fields"
**Problem**: Testing with non-healthcare data
**Examples**:
- ✅ **Good**: `"patient_first_name": "John"`
- ❌ **Bad**: `"name": "John"`
- ✅ **Good**: `"appointment_datetime": "2024-12-20T10:30:00Z"`
- ❌ **Bad**: `"created": "2024-12-20T10:30:00Z"`

**Solution**: Use healthcare-specific field names that match the patterns in `/src/mapping/patterns.js`

### ❌ "Missing Add Field Mapping Button"
**Problem**: Node deployment doesn't include latest fixes
**Solution**: Redeploy with latest code that includes `multipleValues: true`

### ❌ "FHIR Path Dropdown Empty"
**Problem**: Missing loadOptions methods
**Solution**: Ensure deployment includes the latest nodes with loadOptions implementations

### ❌ "Validation Errors"
**Problem**: Missing required FHIR fields
**Solution**: Enable "Include Detailed Mapping Info" to see validation details

---

## 📈 Data Quality Best Practices

### 🎯 Input Data Preparation

**Date Formats** (Recommended):
```json
{
  "birth_date": "1990-05-15",           // YYYY-MM-DD
  "appointment_datetime": "2024-12-20T10:30:00Z"  // ISO 8601
}
```

**Phone Number Formats**:
```json
{
  "phone": "555-123-4567",             // US format
  "phone_international": "+1-555-123-4567"  // International
}
```

**Reference Formats**:
```json
{
  "patient_reference": "Patient/12345",
  "practitioner_reference": "Practitioner/dr-smith"
}
```

### 🎯 Field Naming Conventions

**High Auto-Detection Confidence**:
- `patient_first_name`, `patient_last_name` (95% confidence)
- `appointment_id`, `appointment_datetime` (95% confidence)
- `claim_id`, `claim_status` (90% confidence)
- `member_id`, `plan_id` (90% confidence)

**Medium Confidence** (Manual Review Recommended):
- `name`, `date`, `status` (50-75% confidence)
- Generic field names without context

---

## 🧪 Testing Your Own Data

### Step 1: Start with Auto-Detection
1. Use one of the auto-detection examples as a template
2. Replace the Set node data with your actual data
3. Run the workflow to see auto-detection results

### Step 2: Add Manual Overrides
1. For unmapped fields, switch to Manual Override mode
2. Add mappings for fields that weren't auto-detected
3. Apply transformations as needed

### Step 3: Create Templates
1. Once you have working mappings, save them as templates
2. Reuse templates for similar data sources
3. Share templates across your team

### Step 4: Production Integration
1. Use the multi-resource workflow as a model
2. Add error handling and validation
3. Integrate with your FHIR server or downstream systems

---

## 🎓 Learning Path

**Beginner**: Start with these examples
1. `patient-transformation-workflow.json`
2. `appointment-auto-detection-workflow.json`
3. `bundle-auto-detection-workflow.json`

**Intermediate**: Move to these examples
1. `patient-complex-manual-workflow.json`
2. `claimresponse-manual-override-workflow.json`
3. `eligibilityresponse-manual-workflow.json`

**Advanced**: Master these workflows
1. `multi-resource-workflow.json`
2. `error-handling-workflow.json`
3. Create your own custom templates

---

## 📚 Additional Resources

- **Main Documentation**: [FHIR_NODES_WORKFLOWS_GUIDE.md](../FHIR_NODES_WORKFLOWS_GUIDE.md)
- **Pattern Reference**: [../src/mapping/patterns.js](../src/mapping/patterns.js)
- **Transformation Functions**: [../src/utils/fhirTransform.js](../src/utils/fhirTransform.js)
- **UI Fix Documentation**: [../MULTIPLE_MAPPINGS_FIX.md](../MULTIPLE_MAPPINGS_FIX.md)

## ⚡ Quick Reference

**Import Workflow**: Copy JSON → n8n Import → Paste → Execute
**Check Output**: Look for `error: false` and `fhir_resource` object
**Debug Issues**: Enable "Include Detailed Mapping Info"
**Add Mappings**: Switch to Manual Override mode
**Save Templates**: Export successful configurations

Happy FHIR transformation! 🎉