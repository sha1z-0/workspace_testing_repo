#!/bin/bash
# Hostinger VPS Deployment Script for Finova Workspace

echo "🚀 Finova Workspace - Hostinger Deployment"
echo "==========================================="
echo ""

# Check if running on VPS
if [ ! -d "/var/www" ]; then
    echo "⚠️  Warning: This doesn't look like a Linux VPS"
    echo "   Make sure you're running this on your Hostinger VPS"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Set variables
PROJECT_NAME="finova-workspace"
PROJECT_DIR="/home/$USER/$PROJECT_NAME"
PORT=3000

echo "📦 Step 1: Installing dependencies..."
cd "$PROJECT_DIR" || exit
npm install

echo "🔨 Step 2: Building production app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Check errors above."
    exit 1
fi

echo "✅ Build successful!"
echo ""

echo "🔧 Step 3: Setting up PM2..."
# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 globally..."
    sudo npm install -g pm2
fi

# Stop existing PM2 process if running
pm2 stop "$PROJECT_NAME" 2>/dev/null || true
pm2 delete "$PROJECT_NAME" 2>/dev/null || true

# Start with ecosystem config
echo "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot (only run once)
if ! pm2 startup | grep -q "already"; then
    echo "Setting up PM2 to start on boot..."
    pm2 startup
fi

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo "📝 Next Steps:"
echo "1. Configure Nginx reverse proxy (see HOSTINGER_DEPLOYMENT_COMPLETE.md)"
echo "2. Set up SSL certificate with Certbot"
echo "3. Update Supabase redirect URLs in dashboard"
echo ""
echo "📌 Useful Commands:"
echo "   pm2 logs $PROJECT_NAME     - View logs"
echo "   pm2 restart $PROJECT_NAME  - Restart app"
echo "   pm2 stop $PROJECT_NAME     - Stop app"
echo "   pm2 delete $PROJECT_NAME   - Remove from PM2"
echo ""
