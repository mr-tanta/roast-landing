#!/bin/bash

# Manual deployment script for roast-landing with correct environment variables
set -e

echo "🚀 Starting manual deployment with correct environment variables..."

# Get the real secret values
NEXT_PUBLIC_SUPABASE_URL=$(gh secret list | grep NEXT_PUBLIC_SUPABASE_URL > /dev/null && echo "$(gh api repos/:owner/:repo/actions/secrets/NEXT_PUBLIC_SUPABASE_URL 2>/dev/null)" || echo "https://wzkbwfajlcekiazbjdhn.supabase.co")
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(gh secret list | grep NEXT_PUBLIC_SUPABASE_ANON_KEY > /dev/null && echo "set" || echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2J3ZmFqbGNla2lhemJqZGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzI0NzIsImV4cCI6MjA3NDc0ODQ3Mn0.ajt2VPn8ZCS25sIKvkJ4MidllfZ4VuVweNxFiklsl44")
NEXT_PUBLIC_APP_URL="https://tanta.com.ng"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51S1batJ6OiwDDp6nRfROZ17J2vk15WcfpZe4id1TITP5mx2v4kZjqoin8TfXeFmFiMzxPB5LK2x4ZJxJIiF2E8Hu00V3TVao9u"

# AWS Configuration
AWS_REGION="us-east-1"
ECR_REPOSITORY="roast-landing"
IMAGE_TAG="manual-$(date +%s)"
EC2_HOST="107.21.59.129"
APP_PATH="/opt/roast-landing"

echo "🔐 Configuring AWS credentials..."
aws configure set region $AWS_REGION

echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com

ECR_REGISTRY="$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com"

echo "🏗️  Building Docker image with correct build arguments..."
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
  -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
  .

echo "📦 Pushing images to ECR..."
docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

echo "🚢 Deploying to EC2..."
# Create deployment script
cat > /tmp/deploy_script_manual.sh << EOF
#!/bin/bash
set -e

cd $APP_PATH

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Pull latest image
docker pull $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

# Update docker-compose with new image
sed -i "s|image:.*|image: $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG|" docker-compose.prod.yml

# Stop and start containers
docker-compose -f docker-compose.prod.yml down || true
docker-compose -f docker-compose.prod.yml up -d

# Wait for health check
echo "Waiting for application to be healthy..."
sleep 30

# Health check
if curl -f http://localhost:3000/api/health; then
  echo "✅ Application deployment successful!"
  echo "🌐 Live at: https://tanta.com.ng"
else
  echo "❌ Application health check failed!"
  docker-compose -f docker-compose.prod.yml logs
  exit 1
fi
EOF

# Copy and execute deployment script
scp -i ~/.ssh/roast-landing-key.pem -o StrictHostKeyChecking=no /tmp/deploy_script_manual.sh ubuntu@$EC2_HOST:/tmp/
ssh -i ~/.ssh/roast-landing-key.pem -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "
  export ECR_REGISTRY=$ECR_REGISTRY
  export ECR_REPOSITORY=$ECR_REPOSITORY
  export IMAGE_TAG=$IMAGE_TAG
  export APP_PATH=$APP_PATH
  export AWS_REGION=$AWS_REGION
  chmod +x /tmp/deploy_script_manual.sh
  /tmp/deploy_script_manual.sh
"

echo "🎉 Manual deployment completed successfully!"
echo "🌐 Your application is live at: https://tanta.com.ng"
echo "🏥 Health check: https://tanta.com.ng/api/health"