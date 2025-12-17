# FHIR n8n Custom Nodes - Docker Testing Guide

## Overview

Complete testing instructions for FHIR custom nodes in **Docker Compose environments only**. This guide assumes you're running n8n in Docker containers.

## Prerequisites

- **Docker & Docker Compose** installed
- **n8n running in Docker** (existing or new setup)
- **Project cloned** to your Docker host

## Quick Setup Options

### Option 1: Volume Mount (Recommended)

Mount the FHIR nodes directly into your existing n8n container.

#### 1. Update your docker-compose.yml

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
      # FHIR Custom Nodes - Add this volume mount
      - ./fhir-n8n-custom-nodes:/home/node/.n8n/custom/fhir-nodes:ro
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
    depends_on:
      - n8n-db

  n8n-db:
    image: postgres:13
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  n8n_data:
  postgres_data:
```

#### 2. Install Dependencies in Container

```bash
# Navigate to your project directory
cd /path/to/fhir-n8n-custom-nodes

# Install dependencies in the running container
docker-compose exec n8n bash -c "cd /home/node/.n8n/custom/fhir-nodes && npm install"

# Restart n8n to load custom nodes
docker-compose restart n8n
```

#### 3. Verify Setup

```bash
# Check if FHIR nodes are loaded
docker-compose exec n8n ls -la /home/node/.n8n/custom/fhir-nodes/nodes/

# Check if dependencies are installed
docker-compose exec n8n ls /home/node/.n8n/custom/fhir-nodes/node_modules/

# View n8n logs
docker-compose logs n8n
```

### Option 2: Custom Docker Image

Build a custom n8n image with FHIR nodes pre-installed.

#### 1. Create Dockerfile.n8n-fhir

```dockerfile
FROM n8nio/n8n:latest

# Copy FHIR nodes
COPY nodes/ /home/node/.n8n/custom/fhir-nodes/nodes/
COPY src/ /home/node/.n8n/custom/fhir-nodes/src/
COPY package.json /home/node/.n8n/custom/fhir-nodes/

# Install dependencies
USER root
WORKDIR /home/node/.n8n/custom/fhir-nodes
RUN npm install && chown -R node:node /home/node/.n8n/custom/

# Set custom extensions environment
ENV N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom

# Reset to node user and working directory
USER node
WORKDIR /home/node

# Use n8n's default entrypoint
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
```

#### 2. Create docker-compose-fhir.yml

```yaml
version: '3.8'
services:
  n8n-fhir:
    build:
      context: .
      dockerfile: Dockerfile.n8n-fhir
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - n8n-db

  n8n-db:
    image: postgres:13
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  n8n_data:
  postgres_data:
```

#### 3. Build and Run

```bash
# Build custom image
docker-compose -f docker-compose-fhir.yml build

# Start services
docker-compose -f docker-compose-fhir.yml up -d

# Check logs
docker-compose -f docker-compose-fhir.yml logs n8n-fhir
```

## Testing Scenarios

### Test 1: Core Logic (Without n8n UI)

Test transformation logic directly in the container:

```bash
# Run core tests in container
docker-compose exec n8n bash -c "cd /home/node/.n8n/custom/fhir-nodes && node test_core.js"
```

**Expected Output:**
```
🧪 FHIR n8n Custom Nodes - Core Logic Testing

✅ patient_first_name → firstName (95% confidence)
✅ patient_last_name → lastName (95% confidence)
✅ dob → birthDate (90% confidence)
...
```

### Test 2: n8n UI Integration

#### 1. Access n8n Interface

```bash
# Open browser to n8n
echo "n8n available at: http://localhost:5678"
echo "Username: admin"
echo "Password: password"
```

#### 2. Create Test Workflow

1. **Add Manual Trigger Node**
2. **Add FHIR Patient Node** (should appear in node palette)
3. **Configure test data:**

```json
{
  "patient_first_name": "John",
  "patient_last_name": "Doe",
  "dob": "1990-05-15",
  "phone": "(555) 123-4567",
  "mrn": "12345"
}
```

#### 3. Execute and Verify

**Expected FHIR Output:**
```json
{
  "error": false,
  "fhir_resource": {
    "resourceType": "Patient",
    "name": [{ "given": ["John"], "family": "Doe" }],
    "birthDate": "1990-05-15",
    "telecom": [{ "system": "phone", "value": "+15551234567" }],
    "identifier": [{ "value": "12345" }]
  },
  "validation_summary": {
    "status": "valid_with_warnings",
    "mapped_fields": ["patient_first_name", "patient_last_name", "dob", "phone", "mrn"]
  }
}
```

### Test 3: Manual Override Mode

**Test Data:**
```json
{
  "custom_patient_name": "Jane Smith",
  "birth_year": "1985",
  "contact_phone": "555-987-6543",
  "patient_gender": "F"
}
```

**Node Configuration:**
- Processing Mode: `Manual Override`
- Manual Mappings:

| Source Field | FHIR Path | Transformation |
|-------------|-----------|----------------|
| `custom_patient_name` | `name[0].text` | `formatName` |
| `patient_gender` | `gender` | `normalizeGender` |
| `contact_phone` | `telecom[0].value` | `formatPhoneNumber` |

### Test 4: Error Handling

**Invalid Data:**
```json
{
  "invalid_date": "not-a-date",
  "invalid_phone": "abc",
  "empty_field": ""
}
```

**Expected Behavior:**
- ✅ **No crashes** (extremely forgiving)
- ✅ **Auto-corrections** applied where possible
- ✅ **Helpful warnings** in validation summary
- ✅ **Valid FHIR structure** generated with minimal data

## Docker-Specific Troubleshooting

### Node Not Appearing in n8n

**Check volume mount:**
```bash
# Verify files are accessible in container
docker-compose exec n8n ls -la /home/node/.n8n/custom/fhir-nodes/

# Check directory structure
docker-compose exec n8n find /home/node/.n8n/custom/ -name "*.js"
```

**Check environment:**
```bash
# Verify custom extensions path
docker-compose exec n8n env | grep N8N_CUSTOM_EXTENSIONS

# Check n8n logs for loading errors
docker-compose logs n8n | grep -i custom
docker-compose logs n8n | grep -i error
```

### Dependency Issues

**Install/reinstall dependencies:**
```bash
# Remove node_modules and reinstall
docker-compose exec n8n bash -c "
cd /home/node/.n8n/custom/fhir-nodes &&
rm -rf node_modules &&
npm install
"

# Restart container
docker-compose restart n8n
```

**Check specific dependencies:**
```bash
# Verify FHIR library installation
docker-compose exec n8n bash -c "
cd /home/node/.n8n/custom/fhir-nodes &&
npm list @solarahealth/fhir-r4
"
```

### Permission Issues

**Fix file permissions:**
```bash
# Ensure proper ownership in container
docker-compose exec -u root n8n chown -R node:node /home/node/.n8n/custom/

# Restart container
docker-compose restart n8n
```

### Container Resource Issues

**Check container resources:**
```bash
# Monitor resource usage
docker stats

# Check if container is running out of memory
docker-compose logs n8n | grep -i "out of memory"
```

## Automation Scripts

### Automated Docker Setup

```bash
# Make setup script executable
chmod +x docker_setup.js

# Run automated setup (detects your Docker environment)
node docker_setup.js

# Verify setup
node docker_setup.js verify
```

### Quick Test Commands

```bash
# Full test suite
npm run test-docker

# Core logic only
npm run test-core-docker

# Setup verification
npm run verify-docker
```

## Production Docker Deployment

### Environment Variables

```bash
# Required environment variables for production
N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=your_username
N8N_BASIC_AUTH_PASSWORD=your_secure_password
N8N_HOST=your-domain.com
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://your-domain.com/
```

### Health Checks

```yaml
# Add to your docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5678/healthz"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Performance Testing

### Load Testing in Docker

```bash
# Test multiple concurrent transformations
docker-compose exec n8n bash -c "
cd /home/node/.n8n/custom/fhir-nodes &&
for i in {1..10}; do
  node test_core.js &
done
wait
"
```

### Memory Usage Monitoring

```bash
# Monitor container memory usage during tests
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" n8n
```

## Success Criteria

- ✅ **FHIR Patient node** appears in n8n node palette
- ✅ **Auto-detection** works with >85% accuracy for common fields
- ✅ **Manual override** allows custom field mapping
- ✅ **Forgiving validation** accepts imperfect data gracefully
- ✅ **Standard output** format consistent across all tests
- ✅ **No container crashes** even with invalid data
- ✅ **Resource usage** reasonable (<500MB RAM for basic operations)

## Next Steps

1. **Test with your real data** patterns
2. **Create workflow templates** for common use cases
3. **Add remaining FHIR resources** (Appointment, Bundle, etc.)
4. **Setup monitoring** for production deployment

---

**Docker-native FHIR transformation ready! 🐳🏥**