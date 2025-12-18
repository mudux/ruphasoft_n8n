# FHIR Nodes Workflow Guide

## Overview

This guide explains how to use each of the 5 FHIR transformation nodes, their processing modes, and expected behaviors with practical examples.

## Processing Modes

All FHIR nodes support three processing modes:

### 🤖 Auto-Detection Mode
- **Purpose**: Automatically maps input fields to FHIR resources using pattern matching
- **Use Case**: Quick transformation of well-structured healthcare data
- **Confidence Levels**:
  - High (>75%): Applied automatically
  - Medium (50-75%): Flagged for review
  - Low (<50%): Left unmapped

### ✋ Manual Override Mode
- **Purpose**: Custom field mapping with full control
- **Use Case**: Complex data structures, custom field names, or specific requirements
- **Features**:
  - Multiple field mappings (up to 20+ per node)
  - Data transformations (date formatting, phone formatting, etc.)
  - Override auto-detection results

### 📋 Template Mode
- **Purpose**: Pre-configured mapping templates for specific data sources
- **Use Case**: Reusable configurations for consistent data sources
- **Benefits**: Standardized mappings, reduced configuration time

---

## Node-Specific Workflows

### 1. 🏥 FHIR Patient Node

**Purpose**: Transform patient demographic data into FHIR Patient resources

#### Input Data Patterns (Auto-Detection)
```json
{
  "patient_first_name": "John",
  "patient_last_name": "Doe",
  "dob": "1990-05-15",
  "phone": "(555) 123-4567",
  "mrn": "12345",
  "gender": "M",
  "email": "john.doe@example.com",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "NY",
  "zipcode": "12345"
}
```

#### Expected FHIR Output Structure
```json
{
  "error": false,
  "fhir_resource": {
    "resourceType": "Patient",
    "id": "auto-1234567890-abc123",
    "name": [{"given": ["John"], "family": "Doe"}],
    "birthDate": "1990-05-15",
    "gender": "male",
    "telecom": [
      {"system": "phone", "value": "+15551234567"},
      {"system": "email", "value": "john.doe@example.com"}
    ],
    "address": [{
      "line": ["123 Main St"],
      "city": "Anytown",
      "state": "NY",
      "postalCode": "12345"
    }],
    "identifier": [{"value": "12345"}]
  },
  "validation_summary": {
    "status": "valid_with_warnings",
    "mapped_fields": ["patient_first_name", "patient_last_name", "dob", "phone", "mrn"],
    "warnings": ["Phone number auto-formatted"]
  }
}
```

#### Common Manual Override Scenarios
- **Complex Name Structures**: `full_name` → `name[0].text`
- **Multiple Identifiers**: Map SSN, MRN, and custom IDs separately
- **International Addresses**: Custom address formatting
- **Contact Persons**: Emergency contacts and family members

---

### 2. 📅 FHIR Appointment Node

**Purpose**: Transform scheduling data into FHIR Appointment resources

#### Input Data Patterns (Auto-Detection)
```json
{
  "appointment_id": "APT-2024-001",
  "appointment_datetime": "2024-12-20T10:30:00Z",
  "appointment_status": "booked",
  "patient_id": "Patient/12345",
  "practitioner_id": "Practitioner/dr-smith",
  "duration_minutes": "30",
  "reason": "Annual checkup",
  "location": "Room 101"
}
```

#### Expected FHIR Output Structure
```json
{
  "error": false,
  "fhir_resource": {
    "resourceType": "Appointment",
    "id": "auto-appointment-123",
    "status": "booked",
    "start": "2024-12-20T10:30:00Z",
    "end": "2024-12-20T11:00:00Z",
    "minutesDuration": 30,
    "participant": [
      {
        "actor": {"reference": "Patient/12345"},
        "status": "accepted",
        "required": "required"
      },
      {
        "actor": {"reference": "Practitioner/dr-smith"},
        "status": "accepted"
      }
    ],
    "reasonCode": [{"text": "Annual checkup"}]
  }
}
```

#### Common Manual Override Scenarios
- **Multiple Participants**: Patients, practitioners, locations
- **Recurring Appointments**: Series scheduling
- **Complex Status Mapping**: Custom appointment states
- **Resource References**: Link to other FHIR resources

---

### 3. 📦 FHIR Bundle Node

**Purpose**: Transform transaction/collection data into FHIR Bundle resources

#### Input Data Patterns (Auto-Detection)
```json
{
  "transaction_id": "TXN-2024-12345",
  "bundle_type": "transaction",
  "timestamp": "2024-12-20T14:30:00Z",
  "total_entries": "3",
  "patient_resource_id": "Patient/12345",
  "full_url": "http://example.com/Patient/12345",
  "method": "POST",
  "request_url": "Patient",
  "response_status": "201"
}
```

#### Expected FHIR Output Structure
```json
{
  "error": false,
  "fhir_resource": {
    "resourceType": "Bundle",
    "id": "auto-bundle-789",
    "type": "transaction",
    "timestamp": "2024-12-20T14:30:00Z",
    "total": 3,
    "entry": [
      {
        "fullUrl": "http://example.com/Patient/12345",
        "resource": {"resourceType": "Patient"},
        "request": {
          "method": "POST",
          "url": "Patient"
        },
        "response": {
          "status": "201"
        }
      }
    ]
  }
}
```

#### Common Manual Override Scenarios
- **Batch Operations**: Multiple resource entries
- **Transaction Bundles**: CRUD operations with dependencies
- **Search Result Bundles**: Query result collections
- **Document Bundles**: Clinical document compositions

---

### 4. 💰 FHIR ClaimResponse Node

**Purpose**: Transform insurance claim response data into FHIR ClaimResponse resources

#### Input Data Patterns (Auto-Detection)
```json
{
  "claim_id": "CLM-2024-567",
  "claim_status": "active",
  "outcome": "complete",
  "total_amount": "150.00",
  "payment_amount": "120.00",
  "patient_id": "Patient/12345",
  "insurer": "Insurance-ABC",
  "created_date": "2024-12-20"
}
```

#### Expected FHIR Output Structure
```json
{
  "error": false,
  "fhir_resource": {
    "resourceType": "ClaimResponse",
    "id": "auto-claimresponse-456",
    "status": "active",
    "outcome": "complete",
    "patient": {"reference": "Patient/12345"},
    "insurer": {"reference": "Insurance-ABC"},
    "created": "2024-12-20",
    "total": [
      {
        "category": {"text": "Total"},
        "amount": {"value": 150.00, "currency": "USD"}
      }
    ],
    "payment": {
      "amount": {"value": 120.00, "currency": "USD"}
    }
  }
}
```

#### Common Manual Override Scenarios
- **Complex Adjudication**: Line-item processing details
- **Multiple Totals**: Different amount categories
- **Error Handling**: Processing errors and notes
- **Insurance Coverage**: Multiple insurance sources

---

### 5. 🏥 FHIR EligibilityResponse Node

**Purpose**: Transform insurance eligibility data into FHIR EligibilityResponse resources

#### Input Data Patterns (Auto-Detection)
```json
{
  "member_id": "MBR-789",
  "plan_id": "PLAN-ABC-001",
  "eligibility_status": "active",
  "effective_date": "2024-01-01",
  "termination_date": "2024-12-31",
  "copay": "25.00",
  "deductible": "500.00",
  "patient_id": "Patient/12345"
}
```

#### Expected FHIR Output Structure
```json
{
  "error": false,
  "fhir_resource": {
    "resourceType": "CoverageEligibilityResponse",
    "id": "auto-eligibility-321",
    "status": "active",
    "purpose": ["validation"],
    "patient": {"reference": "Patient/12345"},
    "servicedPeriod": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "insurance": [{
      "coverage": {"reference": "Coverage/PLAN-ABC-001"},
      "inforce": true,
      "benefitPeriod": {
        "start": "2024-01-01",
        "end": "2024-12-31"
      },
      "item": [
        {
          "category": {"text": "Copay"},
          "benefit": [{
            "allowedMoney": {"value": 25.00, "currency": "USD"}
          }]
        },
        {
          "category": {"text": "Deductible"},
          "benefit": [{
            "usedMoney": {"value": 500.00, "currency": "USD"}
          }]
        }
      ]
    }]
  }
}
```

#### Common Manual Override Scenarios
- **Multiple Benefits**: Various coverage categories
- **Complex Eligibility**: Conditional coverage rules
- **Prior Authorization**: Pre-auth requirements
- **Network Status**: In-network vs out-of-network

---

## Processing Mode Behaviors

### Auto-Detection Mode Expected Results

| Input Quality | Expected Mapped Fields | Unmapped Fields | Validation Status |
|---------------|----------------------|----------------|-------------------|
| **High Quality Healthcare Data** | 70-90% | 10-30% | valid_with_warnings |
| **Standard EHR Export** | 60-80% | 20-40% | valid_with_warnings |
| **Custom/Legacy Data** | 30-60% | 40-70% | valid_with_corrections |
| **Non-Healthcare Data** | 0-20% | 80-100% | valid (minimal resource) |

### Manual Override Advantages

- **Precision Control**: Exact field mapping specification
- **Data Transformations**: Built-in transformation functions
- **Complex Mappings**: Nested object handling
- **Validation Override**: Custom validation rules

### Template Mode Benefits

- **Consistency**: Standardized mappings across workflows
- **Efficiency**: Rapid deployment for known data sources
- **Maintenance**: Centralized configuration management
- **Quality**: Pre-tested, validated mappings

---

## Troubleshooting Common Issues

### ❌ "0 Auto-Detected Fields"
**Cause**: Using non-healthcare data (like n8n workflow JSON)
**Solution**: Use healthcare-specific field names:
- `transaction_id` instead of `name`
- `bundle_type` instead of `nodes`
- `patient_first_name` instead of generic `firstName`

### ❌ "Missing Add Field Mapping Button"
**Cause**: Outdated node deployment
**Solution**: Redeploy with latest code that includes `multipleValues: true`

### ❌ "FHIR Path Dropdown Empty"
**Cause**: Missing loadOptions methods
**Solution**: Ensure latest node code with implemented loadOptions methods

### ❌ "Validation Errors"
**Cause**: Missing required FHIR fields
**Solution**: Enable "Include Detailed Mapping Info" to see required fields

---

## Best Practices

### 🎯 Data Preparation
1. **Use Healthcare Field Names**: Follow medical record conventions
2. **Consistent Date Formats**: ISO 8601 preferred (`2024-12-20T10:30:00Z`)
3. **Reference Format**: Use FHIR reference format (`ResourceType/id`)

### 🎯 Processing Mode Selection
- **Auto**: Well-structured EHR data, initial testing
- **Manual**: Custom integrations, complex data sources
- **Template**: Production deployments, standardized sources

### 🎯 Workflow Design
1. **Data Validation**: Add validation nodes after FHIR transformation
2. **Error Handling**: Check `error` flag in output
3. **Resource Linking**: Use consistent reference patterns
4. **Batch Processing**: Use Bundle node for multiple resources

### 🎯 Performance Optimization
- **Field Selection**: Only map required fields for your use case
- **Batch Size**: Process 10-50 records per workflow execution
- **Caching**: Use n8n caching for repeated transformations
- **Resource References**: Minimize deep object traversal

---

## Next Steps

1. **Start with Examples**: Import and test the provided workflow examples
2. **Customize Mappings**: Adapt manual overrides for your data sources
3. **Create Templates**: Build reusable templates for common scenarios
4. **Integration Testing**: Validate outputs with your FHIR server
5. **Production Deployment**: Scale to production data volumes

For more examples and advanced use cases, see the `/examples` directory and the additional workflow files in this guide.