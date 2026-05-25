#!/bin/bash

# Job Search Portal v2.0 - Enterprise Setup Script
# This script automates the setup of the multi-user job search portal

set -e

echo "========================================"
echo "Job Search Portal v2.0 - Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Please install Node.js 16+${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install npm${NC}"
    exit 1
fi

if ! command -v mysql &> /dev/null; then
    echo -e "${RED}MySQL not found. Please install MySQL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env created. Please edit it with your settings.${NC}"
    echo ""
    echo "Edit .env now with:"
    echo "  - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    echo "  - JWT_SECRET (generate: openssl rand -base64 32)"
    echo "  - APIFY_API_KEY (optional)"
    echo ""
    echo "Then run this script again."
    exit 0
fi

echo -e "${YELLOW}Loading .env configuration...${NC}"
export $(cat .env | grep -v '#' | xargs)

# Get database credentials
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_NAME=${DB_NAME:-job_search_portal}
DB_PASSWORD=${DB_PASSWORD:-}

echo "Database: $DB_HOST / $DB_NAME"
echo "User: $DB_USER"
echo ""

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! mysql -h "$DB_HOST" -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} -e "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}✗ Cannot connect to MySQL${NC}"
    echo "Check your DB_HOST, DB_USER, DB_PASSWORD in .env"
    exit 1
fi
echo -e "${GREEN}✓ Database connection OK${NC}"
echo ""

# Create database
echo -e "${YELLOW}Creating database and tables...${NC}"
mysql -h "$DB_HOST" -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME;
USE $DB_NAME;
$(cat schema.sql)
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database and tables created${NC}"
else
    echo -e "${RED}✗ Failed to create database${NC}"
    exit 1
fi
echo ""

# Install npm packages
echo -e "${YELLOW}Installing npm packages...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ npm packages installed${NC}"
else
    echo -e "${RED}✗ Failed to install npm packages${NC}"
    exit 1
fi
echo ""

# Generate JWT_SECRET if not set
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-very-secret-key-change-this-in-production" ]; then
    echo -e "${YELLOW}Generating JWT_SECRET...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Update .env
    if grep -q "^JWT_SECRET=" .env; then
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    else
        echo "JWT_SECRET=$JWT_SECRET" >> .env
    fi
    echo -e "${GREEN}✓ JWT_SECRET generated and saved${NC}"
fi
echo ""

# Create data directory
mkdir -p data
echo -e "${GREEN}✓ Data directory created${NC}"
echo ""

# Verify installation
echo -e "${YELLOW}Verifying installation...${NC}"
node -e "
const pool = require('./db');
const auth = require('./auth');
pool.getConnection().then(conn => {
  conn.execute('SELECT 1').then(() => {
    console.log('✓ Database connection: OK');
    conn.release();
    process.exit(0);
  });
}).catch(err => {
  console.error('✗ Database connection failed:', err.message);
  process.exit(1);
});
"

if [ $? -ne 0 ]; then
    exit 1
fi

echo ""
echo -e "${GREEN}========================================"
echo "Setup Complete! ✓"
echo "========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review your .env configuration"
echo "2. Start the server:  node server.js"
echo "3. Open:              http://localhost:4173"
echo ""
echo "Documentation:"
echo "  - Setup Guide:      SETUP_ENTERPRISE.md"
echo "  - Frontend:         FRONTEND_INTEGRATION.js"
echo "  - API Reference:    SETUP_ENTERPRISE.md (API Endpoints)"
echo ""
echo "First time users:"
echo "1. Register at /register"
echo "2. Login at /login"
echo "3. Search and save jobs"
echo ""
