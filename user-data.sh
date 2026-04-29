#!/bin/bash
# Auto-run deployment script for EC2 user-data

set -e

echo "================================"
echo "TollingLLM Auto-Deployment"
echo "================================"

# Update and install essentials
echo "[1/6] Installing dependencies..."
yum update -y
yum install -y git docker python3 curl

# Start Docker
echo "[2/6] Starting Docker..."
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
echo "[3/6] Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repository
echo "[4/6] Cloning TollingLLM..."
cd /opt
git clone https://github.com/ramesaliyev/TollingLLM.git tolling-llm 2>/dev/null || {
  if [ -d tolling-llm ]; then
    cd tolling-llm && git pull
  else
    mkdir -p tolling-llm
  fi
}

cd /opt/tolling-llm

# Create production environment
echo "[5/6] Configuring production environment..."
cat > .env << 'EOF'
NODE_ENV=production
MONGODB_URI=mongodb://admin:password@mongodb:27017/tolling_db?authSource=admin
MONGODB_DATABASE=tolling_db
MONGODB_COLLECTION=transactions
AWS_REGION=us-east-1
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
API_HOST=0.0.0.0
API_PORT=5000
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
EOF

# Start services
echo "[6/6] Starting application..."
docker-compose up -d

# Wait for services
sleep 15

echo ""
echo "================================"
echo "✓ DEPLOYMENT COMPLETE"
echo "================================"
echo ""
docker-compose ps
echo ""
echo "Access application at: http://$(ec2-metadata --public-ipv4 | cut -d ' ' -f 2):3000"
echo ""
