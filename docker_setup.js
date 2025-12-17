#!/usr/bin/env node
// Docker Setup Script for FHIR n8n Custom Nodes

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐳 FHIR n8n Custom Nodes - Docker Setup\n');

// Get Docker container info
function getN8nContainer() {
  try {
    const result = execSync('docker ps --format "table {{.Names}}\\t{{.Image}}" | grep n8n', { encoding: 'utf8' });
    const lines = result.trim().split('\n');

    if (lines.length === 0) {
      throw new Error('No n8n containers found');
    }

    // Parse container info
    const containers = lines.map(line => {
      const [name, image] = line.split('\t');
      return { name: name.trim(), image: image.trim() };
    });

    return containers[0]; // Use first n8n container found
  } catch (error) {
    throw new Error('Failed to find n8n container. Is n8n running in Docker?');
  }
}

// Setup methods
const setupMethods = {
  'copy': {
    name: 'Copy files to running container',
    description: 'Copy nodes directly to running n8n container',
    action: (container) => {
      const containerName = container.name;
      const targetPath = '/home/node/.n8n/custom/fhir-nodes';

      console.log(`📦 Copying files to container: ${containerName}`);

      // Create directory in container
      execSync(`docker exec ${containerName} mkdir -p ${targetPath}`, { stdio: 'inherit' });

      // Copy files
      execSync(`docker cp nodes/ ${containerName}:${targetPath}/`, { stdio: 'inherit' });
      execSync(`docker cp src/ ${containerName}:${targetPath}/`, { stdio: 'inherit' });
      execSync(`docker cp package.json ${containerName}:${targetPath}/`, { stdio: 'inherit' });

      console.log('📦 Installing dependencies...');
      execSync(`docker exec ${containerName} bash -c "cd ${targetPath} && npm install"`, { stdio: 'inherit' });

      console.log('🔄 Restarting container to load custom nodes...');
      execSync(`docker restart ${containerName}`, { stdio: 'inherit' });

      console.log('✅ Setup complete! Container restarted.');
    }
  },

  'volume': {
    name: 'Create docker-compose volume mount',
    description: 'Generate docker-compose configuration for volume mounting',
    action: () => {
      const currentDir = process.cwd();
      const volumeConfig = `
# Add this to your docker-compose.yml n8n service:
services:
  n8n:
    # ... your existing config ...
    volumes:
      # ... your existing volumes ...
      # FHIR Custom Nodes
      - ${currentDir}:/home/node/.n8n/custom/fhir-nodes:ro
    environment:
      # ... your existing environment ...
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
`;

      const configFile = 'docker-compose-fhir-addon.yml';
      fs.writeFileSync(configFile, volumeConfig.trim());

      console.log(`✅ Created configuration: ${configFile}`);
      console.log('\n📋 Next steps:');
      console.log('1. Add the volume mount to your docker-compose.yml');
      console.log('2. Run: docker-compose down && docker-compose up -d');
      console.log('3. Check that FHIR Patient node appears in n8n');
    }
  },

  'dockerfile': {
    name: 'Generate custom Dockerfile',
    description: 'Create Dockerfile with FHIR nodes pre-installed',
    action: () => {
      const dockerfile = `FROM n8nio/n8n:latest

# Copy FHIR nodes
COPY nodes/ /home/node/.n8n/custom/fhir-nodes/nodes/
COPY src/ /home/node/.n8n/custom/fhir-nodes/src/
COPY package.json /home/node/.n8n/custom/fhir-nodes/

# Install dependencies
WORKDIR /home/node/.n8n/custom/fhir-nodes
RUN npm install

# Set custom extensions environment
ENV N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom

# Reset working directory
WORKDIR /home/node

# Use n8n's default entrypoint
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
`;

      fs.writeFileSync('Dockerfile.n8n-fhir', dockerfile);

      const composeExample = `version: '3.8'
services:
  n8n-fhir:
    build:
      context: .
      dockerfile: Dockerfile.n8n-fhir
    # ... add your n8n configuration here ...
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
`;

      fs.writeFileSync('docker-compose-fhir-example.yml', composeExample);

      console.log('✅ Created Dockerfile.n8n-fhir');
      console.log('✅ Created docker-compose-fhir-example.yml');
      console.log('\n📋 Next steps:');
      console.log('1. Customize docker-compose-fhir-example.yml for your needs');
      console.log('2. Run: docker-compose -f docker-compose-fhir-example.yml up --build');
    }
  }
};

// Main setup function
async function setup() {
  try {
    // Check if we're in the right directory
    if (!fs.existsSync('nodes/patient.js')) {
      console.error('❌ Error: Run this script from the fhir-n8n-custom-nodes directory');
      process.exit(1);
    }

    console.log('🔍 Checking Docker environment...\n');

    // Try to find n8n container
    let container = null;
    try {
      container = getN8nContainer();
      console.log(`✅ Found n8n container: ${container.name} (${container.image})`);
    } catch (error) {
      console.log('❌ No running n8n container found');
      console.log('   Will provide alternative setup methods');
    }

    console.log('\n📋 Setup Options:');
    console.log('================\n');

    Object.entries(setupMethods).forEach(([key, method], index) => {
      console.log(`${index + 1}. ${method.name}`);
      console.log(`   ${method.description}\n`);
    });

    // Auto-select method based on availability
    if (container) {
      console.log('🚀 Auto-selecting: Copy files to running container\n');
      setupMethods.copy.action(container);
    } else {
      console.log('🚀 Auto-generating: Volume mount and Dockerfile options\n');
      setupMethods.volume.action();
      setupMethods.dockerfile.action();
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Verification function
function verify() {
  console.log('🔍 Docker Verification\n');

  try {
    const container = getN8nContainer();
    console.log(`✅ n8n container running: ${container.name}`);

    // Check if files exist in container
    try {
      execSync(`docker exec ${container.name} ls /home/node/.n8n/custom/fhir-nodes/nodes/patient.js`, { stdio: 'pipe' });
      console.log('✅ FHIR Patient node file exists in container');
    } catch (error) {
      console.log('❌ FHIR Patient node file not found in container');
    }

    // Check if dependencies are installed
    try {
      execSync(`docker exec ${container.name} ls /home/node/.n8n/custom/fhir-nodes/node_modules`, { stdio: 'pipe' });
      console.log('✅ Dependencies installed in container');
    } catch (error) {
      console.log('❌ Dependencies not found in container');
    }

  } catch (error) {
    console.log('❌ n8n container not found or not running');
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'verify':
    verify();
    break;
  case 'copy':
    try {
      const container = getN8nContainer();
      setupMethods.copy.action(container);
    } catch (error) {
      console.error('❌', error.message);
    }
    break;
  case 'volume':
    setupMethods.volume.action();
    break;
  case 'dockerfile':
    setupMethods.dockerfile.action();
    break;
  default:
    setup();
}