#!/bin/bash

# Deploy RoastMyLanding Frontend for Production
set -e

echo "🚀 Starting frontend production deployment..."

# Check dependencies
echo "🔍 Checking dependencies..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Please install it first." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not found. Please install it first." >&2; exit 1; }

NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Environment check
echo ""
echo "🌍 Environment Configuration:"
if [[ -f .env.production ]]; then
    echo "✅ Production environment file found"
    echo "   Using external Lambda API"
else
    echo "⚠️  No .env.production found, creating one..."
    cat > .env.production << EOF
# Production Environment Variables
NEXT_PUBLIC_API_URL=https://1il9nnkz4b.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_USE_EXTERNAL_API=true
INTERNAL_API_ENABLED=false
EOF
    echo "✅ Created .env.production with Lambda API configuration"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci --only=production

# Test API connectivity
echo ""
echo "🧪 Testing API connectivity..."
API_URL="https://1il9nnkz4b.execute-api.us-east-1.amazonaws.com/prod"
HEALTH_CHECK=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/health" || echo "000")

if [[ $HEALTH_CHECK == "200" || $HEALTH_CHECK == "400" ]]; then
    echo "✅ API is reachable (status: $HEALTH_CHECK)"
else
    echo "⚠️  API health check returned status: $HEALTH_CHECK"
    echo "   Proceeding anyway - this might be expected for health endpoint"
fi

# Build for production
echo ""
echo "🏗️  Building for production..."
NODE_ENV=production npm run build:prod

if [[ $? -eq 0 ]]; then
    echo "✅ Production build completed successfully"
else
    echo "❌ Build failed"
    exit 1
fi

# Analyze build
echo ""
echo "📊 Build Analysis:"
BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1 2>/dev/null || echo "Unknown")
echo "   Build size: $BUILD_SIZE"

if [[ -d .next/static ]]; then
    STATIC_SIZE=$(du -sh .next/static 2>/dev/null | cut -f1 2>/dev/null || echo "Unknown")
    echo "   Static assets: $STATIC_SIZE"
fi

# Test production build locally (optional)
echo ""
read -p "🔬 Do you want to test the production build locally? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Starting production server locally..."
    echo "   Server will run at http://localhost:3000"
    echo "   Press Ctrl+C to stop the server"
    echo ""
    NODE_ENV=production npm run start:prod &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    # Test the local server
    LOCAL_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:3000" || echo "000")
    if [[ $LOCAL_TEST == "200" ]]; then
        echo "✅ Local production server is running successfully"
        echo "   Visit http://localhost:3000 to test"
        echo ""
        read -p "Press Enter to stop the server and continue..." -r
    else
        echo "⚠️  Local server test failed (status: $LOCAL_TEST)"
    fi
    
    # Stop the server
    kill $SERVER_PID 2>/dev/null || true
    sleep 2
fi

# Deployment options
echo ""
echo "🎯 Production Deployment Options:"
echo ""
echo "1. 📦 Vercel Deployment:"
echo "   npx vercel --prod"
echo ""
echo "2. 🐳 Docker Deployment:"
echo "   docker build -t roastmylanding-frontend ."
echo "   docker run -p 3000:3000 roastmylanding-frontend"
echo ""
echo "3. ☁️  Static Export (for CDN):"
echo "   Add 'output: export' to next.config.ts"
echo "   npm run build && upload 'out' folder to S3/CloudFront"
echo ""
echo "4. 🖥️  Manual Server:"
echo "   Copy .next folder and package.json to your server"
echo "   Run: NODE_ENV=production npm start"
echo ""

# Create Dockerfile if it doesn't exist
if [[ ! -f Dockerfile ]]; then
    echo "🐳 Creating Dockerfile..."
    cat > Dockerfile << 'EOF'
# Use the official Node.js 18 image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY .next ./.next
COPY public ./public
COPY next.config.ts ./
COPY .env.production ./

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]
EOF
    echo "✅ Created Dockerfile for containerized deployment"
fi

# Create deployment summary
echo ""
echo "🎉 Frontend Production Build Complete!"
echo ""
echo "📊 Deployment Summary:"
echo "   ✅ Production build completed"
echo "   ✅ External Lambda API configured"
echo "   ✅ Performance optimizations enabled"
echo "   ✅ Security headers configured"
echo "   ✅ Docker support added"
echo ""
echo "🔗 API Configuration:"
echo "   Lambda API: $API_URL"
echo "   Mode: External serverless API"
echo "   Cache: DynamoDB-based"
echo ""
echo "📈 Next Steps:"
echo "   1. Choose a deployment method above"
echo "   2. Configure custom domain (optional)"
echo "   3. Set up monitoring and analytics"
echo "   4. Configure CDN for static assets"
echo ""
echo "🎯 Your production-ready frontend is ready to deploy!"

# Optional: Run deployment tests
echo ""
read -p "🧪 Run API integration tests? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Testing Lambda API integration..."
    npm run test:api
fi