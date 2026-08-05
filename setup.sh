#!/bin/bash

# Perfect Template Setup Script
# This script installs and updates all dependencies for both backend and frontend

set -e

echo "=========================================="
echo "  Perfect Template - Initial Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node --version)${NC}"
echo ""

# Backend Setup
echo -e "${BLUE}=========================================="
echo "  Setting up Backend"
echo "==========================================${NC}"
echo ""

cd backend

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please edit backend/.env with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo -e "${BLUE}Installing backend dependencies...${NC}"
if ! npm install; then
    echo ""
    echo -e "${YELLOW}⚠ Dependency conflict detected. Attempting to fix...${NC}"
    echo ""
    
    if npm install --legacy-peer-deps; then
        echo -e "${GREEN}✓ Dependencies installed with legacy peer deps${NC}"
    else
        echo -e "${RED}✗ Failed to install backend dependencies${NC}"
        echo ""
        echo "Common fixes:"
        echo "1. Delete node_modules and package-lock.json"
        echo "2. Run: npm install --legacy-peer-deps"
        echo "3. Check package.json for incompatible versions"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
fi

echo ""
echo -e "${GREEN}✓ Backend setup complete!${NC}"

cd ..

# Frontend Setup
echo ""
echo -e "${BLUE}=========================================="
echo "  Setting up Frontend"
echo "==========================================${NC}"
echo ""

cd frontend

# Check if .env.development exists
if [ ! -f .env.development ]; then
    echo -e "${YELLOW}Creating .env.development file from .env.example...${NC}"
    cp .env.example .env.development
    echo -e "${GREEN}✓ .env.development file created${NC}"
else
    echo -e "${GREEN}✓ .env.development file already exists${NC}"
fi

echo ""
echo -e "${BLUE}Installing frontend dependencies...${NC}"
if ! npm install; then
    echo ""
    echo -e "${YELLOW}⚠ Dependency conflict detected. Attempting to fix...${NC}"
    echo ""
    
    if npm install --legacy-peer-deps; then
        echo -e "${GREEN}✓ Dependencies installed with legacy peer deps${NC}"
    else
        echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
        echo ""
        echo "Common fixes:"
        echo "1. Delete node_modules and package-lock.json"
        echo "2. Run: npm install --legacy-peer-deps"
        echo "3. Check package.json for incompatible versions"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
fi

echo ""
echo -e "${GREEN}✓ Frontend setup complete!${NC}"

cd ..

# Final Instructions
echo ""
echo -e "${GREEN}=========================================="
echo "  Setup Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Configure your environment variables:"
echo "   - backend/.env"
echo "   - frontend/.env.development"
echo ""
echo "2. Setup your database:"
echo "   cd backend"
echo "   npm run db-update"
echo ""
echo "3. Start development servers:"
echo "   Backend:  cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "For updating dependencies safely:"
echo "   Run: npm run update-deps (in backend or frontend)"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
