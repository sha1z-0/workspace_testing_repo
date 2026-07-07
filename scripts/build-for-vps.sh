#!/bin/bash

# Build script for VPS deployment (Linux/Mac)
# Run with: chmod +x scripts/build-for-vps.sh && ./scripts/build-for-vps.sh

echo "🚀 Preparing Finova Workspace for VPS Deployment"
echo "================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo -e "${YELLOW}1️⃣  Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "   ${GREEN}✅ Node.js version: $NODE_VERSION${NC}"
else
    echo -e "   ${RED}❌ Node.js not found! Please install Node.js first.${NC}"
    exit 1
fi

# Step 2: Check npm
echo ""
echo -e "${YELLOW}2️⃣  Checking npm installation...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "   ${GREEN}✅ npm version: $NPM_VERSION${NC}"
else
    echo -e "   ${RED}❌ npm not found!${NC}"
    exit 1
fi

# Step 3: Check environment file
echo ""
echo -e "${YELLOW}3️⃣  Checking environment configuration...${NC}"
if [ -f ".env.production" ]; then
    echo -e "   ${GREEN}✅ .env.production found${NC}"
else
    echo -e "   ${YELLOW}⚠️  .env.production not found!${NC}"
    
    if [ -f ".env.production.example" ]; then
        echo -e "      ${YELLOW}Creating from example...${NC}"
        cp .env.production.example .env.production
        echo -e "   ${YELLOW}⚠️  Please edit .env.production with your actual values!${NC}"
        echo "      Press Enter to continue after editing, or Ctrl+C to abort..."
        read
    else
        echo -e "   ${RED}❌ No .env.production.example found. Create .env.production manually.${NC}"
        exit 1
    fi
fi

# Step 4: Clean previous builds
echo ""
echo -e "${YELLOW}4️⃣  Cleaning previous builds...${NC}"
if [ -d ".next" ]; then
    rm -rf .next
    echo -e "   ${GREEN}✅ Removed .next directory${NC}"
fi
if [ -d "out" ]; then
    rm -rf out
    echo -e "   ${GREEN}✅ Removed out directory${NC}"
fi

# Step 5: Install dependencies
echo ""
echo -e "${YELLOW}5️⃣  Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "   ${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "   ${GREEN}✅ Dependencies installed${NC}"

# Step 6: Build application
echo ""
echo -e "${YELLOW}6️⃣  Building application for production...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "   ${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "   ${GREEN}✅ Build successful!${NC}"

# Step 7: Test build
echo ""
echo -e "${YELLOW}7️⃣  Build verification...${NC}"
if [ -d ".next" ]; then
    echo -e "   ${GREEN}✅ .next directory created${NC}"
    
    # Get build size
    BUILD_SIZE=$(du -sh .next | cut -f1)
    echo -e "   ${CYAN}📦 Build size: $BUILD_SIZE${NC}"
else
    echo -e "   ${RED}❌ .next directory not found after build${NC}"
    exit 1
fi

# Summary
echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}✅ BUILD COMPLETE!${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "   1. Test locally: npm start"
echo "   2. Upload to VPS via Git, FTP, or SCP"
echo "   3. On VPS, run: npm install && npm run build"
echo "   4. Start with PM2: pm2 start npm --name finova -- start"
echo ""
echo -e "${YELLOW}📖 Full deployment guide: HOSTINGER_DEPLOYMENT_COMPLETE.md${NC}"
echo ""
