#!/bin/bash

# FHIR n8n Custom Nodes - Production Deployment Script
# Completely automated deployment pulling everything from GitHub

set -e

echo "🚀 FHIR n8n Production Deployment"
echo "================================="

# Configuration
REPO_URL="https://github.com/mudux/ruphasoft_n8n.git"
DEPLOY_DIR="fhir-n8n-production"
COMPOSE_FILE="docker-compose-production.yml"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create deployment directory
echo "📁 Setting up deployment directory..."
if [ -d "$DEPLOY_DIR" ]; then
    echo "⚠️  Directory $DEPLOY_DIR already exists. Remove it? (y/N)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$DEPLOY_DIR"
    else
        echo "❌ Deployment cancelled."
        exit 1
    fi
fi

mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"
echo "✅ Created deployment directory: $DEPLOY_DIR"

# Download deployment files from GitHub
echo "📥 Downloading deployment configuration from GitHub..."

# Download docker-compose-production.yml
curl -sS -o "$COMPOSE_FILE" "https://raw.githubusercontent.com/mudux/ruphasoft_n8n/main/$COMPOSE_FILE"
if [ $? -eq 0 ] && [ -f "$COMPOSE_FILE" ]; then
    echo "✅ Downloaded $COMPOSE_FILE"
else
    echo "❌ Failed to download $COMPOSE_FILE. Check repository URL."
    exit 1
fi

# Download .env.example
curl -sS -o ".env.example" "https://raw.githubusercontent.com/mudux/ruphasoft_n8n/main/.env.example"
if [ $? -eq 0 ] && [ -f ".env.example" ]; then
    echo "✅ Downloaded .env.example"
else
    echo "❌ Failed to download .env.example. Check repository URL."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env

    # Generate secure random values
    echo "🔐 Generating secure credentials..."

    # Generate random password
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

    # Generate encryption key (32 chars minimum)
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    # Generate JWT secret (32 chars minimum)
    JWT_SECRET=$(openssl rand -hex 32)

    # Update .env file with generated values
    sed -i "s/your-secure-password-here/$POSTGRES_PASSWORD/g" .env
    sed -i "s/your-encryption-key-here-32-chars-minimum/$ENCRYPTION_KEY/g" .env
    sed -i "s/your-jwt-secret-here-32-chars-minimum/$JWT_SECRET/g" .env

    echo "✅ Generated secure credentials in .env file"
else
    echo "✅ Using existing .env file"
fi

# Create demo-data directories
echo "📂 Creating demo data directories..."
mkdir -p n8n/demo-data/credentials
mkdir -p n8n/demo-data/workflows
mkdir -p shared
echo "✅ Created directory structure"

# Show configuration summary
echo ""
echo "📋 Deployment Configuration Summary"
echo "===================================="
echo "Deployment Directory: $(pwd)"
echo "Docker Compose File: $COMPOSE_FILE"
echo "Environment File: .env"
echo "Repository: $REPO_URL"
echo ""

# Ask for deployment confirmation
echo "🤔 Ready to deploy FHIR n8n production stack?"
echo "This will:"
echo "  • Start PostgreSQL database"
echo "  • Clone FHIR nodes from GitHub"
echo "  • Build TypeScript nodes"
echo "  • Start n8n with FHIR nodes"
echo "  • Start Ollama (optional AI)"
echo "  • Start Qdrant (vector database)"
echo ""
echo "Continue? (y/N)"
read -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    echo "💡 To deploy later, run: docker compose -f $COMPOSE_FILE up -d"
    exit 0
fi

# Deploy the stack
echo "🚀 Deploying FHIR n8n production stack..."
echo "This may take 5-10 minutes for first deployment..."

# Pull images first
echo "📦 Pulling Docker images..."
docker compose -f "$COMPOSE_FILE" pull

# Start deployment
echo "🔄 Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for setup completion
echo "⏳ Waiting for setup to complete..."
echo "📊 Monitoring setup progress..."

# Monitor setup container
setup_container="n8n-setup-typescript"
main_container="n8n-production"

# Wait for setup to complete (max 10 minutes)
timeout=600
elapsed=0
while [ $elapsed -lt $timeout ]; do
    # Check if setup container exists and is running
    if docker ps --format "table {{.Names}}" | grep -q "$setup_container"; then
        echo "⏳ Setup in progress... ($elapsed/${timeout}s)"
        sleep 10
        elapsed=$((elapsed + 10))
    else
        # Setup container finished, check if it was successful
        setup_exit_code=$(docker inspect "$setup_container" --format='{{.State.ExitCode}}' 2>/dev/null || echo "1")
        if [ "$setup_exit_code" = "0" ]; then
            echo "✅ Setup completed successfully!"
            break
        else
            echo "❌ Setup failed. Check logs:"
            docker logs "$setup_container"
            exit 1
        fi
    fi
done

if [ $elapsed -ge $timeout ]; then
    echo "⏰ Setup timeout reached. Check logs:"
    docker logs "$setup_container"
    exit 1
fi

# Wait for main n8n to be ready
echo "⏳ Waiting for n8n to start..."
sleep 20

# Check if n8n is running
if docker ps --format "table {{.Names}}" | grep -q "$main_container"; then
    echo "✅ n8n is running!"
else
    echo "❌ n8n failed to start. Check logs:"
    docker logs "$main_container"
    exit 1
fi

# Show deployment summary
echo ""
echo "🎉 Deployment Completed Successfully!"
echo "====================================="
echo ""
echo "🌐 n8n Interface: http://localhost:5678"
echo "📊 Services Status:"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}"

echo ""
echo "📋 FHIR Nodes Available:"
echo "  • FHIR Patient"
echo "  • FHIR Appointment"
echo "  • FHIR Bundle"
echo "  • FHIR Claim Response"
echo "  • FHIR Eligibility Response"

echo ""
echo "🔧 Management Commands:"
echo "  View logs: docker logs $main_container"
echo "  Stop stack: docker compose -f $COMPOSE_FILE down"
echo "  Restart: docker compose -f $COMPOSE_FILE restart"
echo "  Update: docker compose -f $COMPOSE_FILE pull && docker compose -f $COMPOSE_FILE up -d"

echo ""
echo "🎯 Next Steps:"
echo "  1. Open http://localhost:5678 in your browser"
echo "  2. Complete n8n initial setup"
echo "  3. Look for FHIR nodes in the Transform section"
echo "  4. Create your first FHIR transformation workflow"

echo ""
echo "📚 Documentation:"
echo "  • Production Guide: https://github.com/mudux/ruphasoft_n8n/blob/main/PRODUCTION_DEPLOYMENT_GUIDE.md"
echo "  • Migration Summary: https://github.com/mudux/ruphasoft_n8n/blob/main/MIGRATION_SUCCESS_SUMMARY.md"

echo ""
echo "✨ FHIR n8n Production Stack is ready!"