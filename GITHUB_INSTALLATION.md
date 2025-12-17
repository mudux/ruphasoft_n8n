# n8n Custom Nodes - GitHub Installation

## Overview

n8n supports installing custom nodes directly from GitHub repositories using npm. This is the **cleanest and most maintainable** approach for Docker environments.

## Installation Methods

### Method 1: Docker Environment Variable (Recommended)

Add the GitHub repository to your n8n Docker container using environment variables.

#### docker-compose.yml
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      # Install FHIR nodes from GitHub
      - N8N_COMMUNITY_PACKAGES_ENABLED=true
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
    volumes:
      - n8n_data:/home/node/.n8n
    command: >
      sh -c "
        npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git &&
        n8n start
      "

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

### Method 2: Custom Dockerfile

Create a custom n8n image with FHIR nodes pre-installed from GitHub.

#### Dockerfile
```dockerfile
FROM n8nio/n8n:latest

# Switch to root to install packages
USER root

# Install FHIR nodes from GitHub
RUN npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git

# Set environment for custom nodes
ENV N8N_COMMUNITY_PACKAGES_ENABLED=true

# Switch back to node user
USER node

# Use default n8n entrypoint
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  n8n:
    build: .
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
```

### Method 3: Runtime Installation

Install during container runtime using n8n's package management.

```bash
# Enter running n8n container
docker-compose exec n8n bash

# Install FHIR nodes from GitHub
npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git

# Restart n8n (from host)
docker-compose restart n8n
```

## Package Preparation for GitHub Installation

### Update package.json for n8n Compatibility

```json
{
  "name": "fhir-n8n-custom-nodes",
  "version": "1.0.0",
  "description": "FHIR transformation nodes for n8n with auto-detection and manual override",
  "main": "index.js",
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [],
    "nodes": [
      "dist/nodes/Patient/Patient.node.js"
    ]
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "node test_core.js"
  },
  "keywords": [
    "n8n",
    "n8n-community-node-package",
    "fhir",
    "healthcare",
    "transformation"
  ],
  "dependencies": {
    "@solarahealth/fhir-r4": "^0.1.0"
  },
  "devDependencies": {
    "n8n-workflow": "^1.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/fhir-n8n-custom-nodes.git"
  },
  "license": "MIT"
}
```

### Create TypeScript Build Configuration

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "commonjs",
    "lib": ["ES2019"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "test_core.js"
  ]
}
```

### Reorganize for TypeScript Build

Move nodes to src structure for proper compilation:

```
src/
├── nodes/
│   └── Patient/
│       ├── Patient.node.ts
│       └── index.ts
├── mapping/
│   ├── patterns.ts
│   ├── autoDetector.ts
│   └── manualOverride.ts
├── validation/
│   └── forgivingValidator.ts
└── utils/
    └── fhirTransform.ts
```

## Installation Commands for Users

### For Docker Compose Users

```bash
# Method 1: Environment variable
export FHIR_NODES_REPO="https://github.com/your-org/fhir-n8n-custom-nodes.git"

# Update docker-compose.yml to include installation command
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    command: >
      sh -c "
        npm install -g ${FHIR_NODES_REPO} &&
        n8n start
      "
```

### For Existing n8n Containers

```bash
# Install in running container
docker-compose exec n8n npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git

# Restart to load nodes
docker-compose restart n8n
```

### For Kubernetes/Helm

```yaml
# values.yaml
extraInitContainers:
  - name: install-fhir-nodes
    image: n8nio/n8n:latest
    command:
      - npm
      - install
      - -g
      - https://github.com/your-org/fhir-n8n-custom-nodes.git
    volumeMounts:
      - name: n8n-data
        mountPath: /home/node/.n8n
```

## Testing GitHub Installation

### Quick Installation Test

```bash
# Test installation in temporary container
docker run --rm -it n8nio/n8n:latest bash -c "
  npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git &&
  node -e 'console.log(require(\"/usr/local/lib/node_modules/fhir-n8n-custom-nodes/package.json\").name)'
"
```

### Verification Commands

```bash
# Check if package is installed
docker-compose exec n8n npm list -g fhir-n8n-custom-nodes

# Check if nodes are loaded
docker-compose exec n8n ls /usr/local/lib/node_modules/fhir-n8n-custom-nodes/

# Verify in n8n UI
echo "Check http://localhost:5678 for 'FHIR Patient' node"
```

## Advantages of GitHub Installation

### ✅ Benefits
- **Clean deployment** - No file copying or volume mounts
- **Version control** - Proper semantic versioning
- **Easy updates** - `npm update` to get latest version
- **Dependency management** - npm handles all dependencies
- **Distribution** - Easy sharing with other teams
- **CI/CD friendly** - Integrates with automated deployments

### 🔄 Update Process
```bash
# Update to latest version
docker-compose exec n8n npm update -g fhir-n8n-custom-nodes

# Or install specific version
docker-compose exec n8n npm install -g fhir-n8n-custom-nodes@1.2.0

# Restart to load updates
docker-compose restart n8n
```

### 📦 Publishing to npm Registry (Optional)

For even easier installation, publish to npm:

```bash
# Build and publish to npm
npm run build
npm publish

# Users can then install with:
# npm install -g fhir-n8n-custom-nodes
```

## Migration from Volume Mount

If you're currently using volume mounts, migrate to GitHub installation:

### 1. Remove Volume Mount
```yaml
# Remove this from docker-compose.yml
volumes:
  # - ./fhir-n8n-custom-nodes:/home/node/.n8n/custom/fhir-nodes:ro  # Remove this
```

### 2. Add GitHub Installation
```yaml
# Add this to docker-compose.yml
command: >
  sh -c "
    npm install -g https://github.com/your-org/fhir-n8n-custom-nodes.git &&
    n8n start
  "
```

### 3. Restart Services
```bash
docker-compose down
docker-compose up -d
```

## Troubleshooting GitHub Installation

### Common Issues

**Permission Errors:**
```bash
# Install as root, then switch to node user
USER root
RUN npm install -g your-package
USER node
```

**Package Not Found:**
```bash
# Verify repository URL
curl -I https://github.com/your-org/fhir-n8n-custom-nodes.git

# Check package.json structure
cat package.json | grep -A 10 '"n8n":'
```

**Nodes Not Loading:**
```bash
# Check n8n logs
docker-compose logs n8n | grep -i "custom\|node"

# Verify installation location
docker-compose exec n8n find /usr/local/lib/node_modules -name "*fhir*"
```

---

**GitHub installation provides the cleanest deployment experience for n8n custom nodes! 🚀**