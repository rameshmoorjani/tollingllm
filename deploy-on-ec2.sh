#!/bin/bash
# TollingLLM EC2 Deployment Script
# Run this on the EC2 instance after it's launched

set -e

echo "========================================="
echo "TollingLLM EC2 Deployment Script"
echo "========================================="
echo ""

# Update system
echo "[1/8] Updating system packages..."
sudo yum update -y
sudo yum install -y git docker python3-pip tmux

# Install Docker
echo "[2/8] Starting Docker..."
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
echo "[3/8] Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone or update application
echo "[4/8] Cloning/updating TollingLLM repository..."
if [ ! -d /opt/tolling-llm ]; then
    cd /opt
    sudo git clone https://github.com/ramesaliyev/TollingLLM.git tolling-llm
    sudo chown -R ec2-user:ec2-user tolling-llm
else
    cd /opt/tolling-llm
    sudo git pull
    sudo chown -R ec2-user:ec2-user .
fi

cd /opt/tolling-llm

# Create .env file
echo "[5/8] Creating production environment configuration..."
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

# Build Docker image locally (if needed)
echo "[6/8] Building Docker image..."
docker build -f docker/Dockerfile.apprunner -t tolling-llm:latest . 2>&1 | grep -E "FINISHED|error" || true

# Start services
echo "[7/8] Starting Docker Compose services..."
docker-compose up -d

# Wait and check status
echo "[8/8] Waiting for services to initialize..."
sleep 10

echo ""
echo "========================================="
echo "✓ DEPLOYMENT COMPLETE"
echo "========================================="
echo ""
echo "Services Status:"
docker-compose ps
echo ""
echo "Application URLs:"
echo "  Frontend (React):  http://$(hostname -I | awk '{print $1}'):3000"
echo "  Backend API:       http://$(hostname -I | awk '{print $1}'):5000"
echo "  Health Check:      http://$(hostname -I | awk '{print $1}'):5000/api/health"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""
