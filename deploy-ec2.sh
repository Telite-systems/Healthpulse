#!/bin/bash
# ============================================================
# HealthPulse — One-Command AWS EC2 Deployment Script
# ============================================================
# Usage:  chmod +x deploy-ec2.sh && ./deploy-ec2.sh
# Run ON the EC2 instance after cloning the repo.
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        HealthPulse — AWS EC2 Deployment                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. System Updates & Docker Install ───────────────────────
echo "📦 Step 1: Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
  sudo yum update -y 2>/dev/null || sudo apt-get update -y
  sudo yum install -y docker 2>/dev/null || sudo apt-get install -y docker.io
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker $USER
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

if ! docker compose version &> /dev/null; then
  # Install Docker Compose v2 plugin
  DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
  mkdir -p "$DOCKER_CONFIG/cli-plugins"
  curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
    -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
  chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"
  echo "✅ Docker Compose installed"
else
  echo "✅ Docker Compose already installed"
fi

# ── 2. Environment File Setup ────────────────────────────────
echo ""
echo "📋 Step 2: Setting up environment files..."

# Get the EC2 public IP
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_EC2_IP")

if [ ! -f .env ]; then
  cat > .env << ENVEOF
# ============================================
# HealthPulse — AWS Production Environment
# ============================================

# ---- Application ----
APP_NAME=HealthPulse Backend
APP_VERSION=1.0.0
DEBUG=False
HOST=0.0.0.0
PORT=8000

# ---- MongoDB Atlas ----
MONGODB_URL=mongodb+srv://shivanshnegi1219_db_user:J0qB3MpuCvQ7uJOJ@cluster0.6lzk2sm.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=healthpulse

# ---- JWT Authentication ----
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ---- CORS (EC2 IP + optional domain) ----
CORS_ORIGINS=http://${EC2_IP},http://${EC2_IP}:80,http://${EC2_IP}:5678,http://localhost

# ---- Logging ----
LOG_LEVEL=INFO

# ---- n8n ----
N8N_HOST=${EC2_IP}
N8N_PROTOCOL=http
N8N_EDITOR_BASE_URL=http://${EC2_IP}:5678
WEBHOOK_TUNNEL_URL=http://${EC2_IP}:5678/

# ---- Supabase (if used) ----
SUPABASE_SECRET_KEY=
ENVEOF
  echo "✅ Created .env with EC2 IP: ${EC2_IP}"
  echo "⚠️  REVIEW .env before proceeding (especially JWT_SECRET_KEY and MONGODB_URL)"
else
  echo "✅ .env already exists"
fi

# Copy .env for backend container
cp .env healthcare-backend/.env
echo "✅ Copied .env to healthcare-backend/"

# ── 3. Make scripts executable ───────────────────────────────
echo ""
echo "🔧 Step 3: Setting permissions..."
chmod +x init-n8n-workflows.sh
echo "✅ Scripts are executable"

# ── 4. Build & Launch ────────────────────────────────────────
echo ""
echo "🚀 Step 4: Building and starting all services..."
docker compose -f docker-compose.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.yml up --build -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# ── 5. Health Checks ─────────────────────────────────────────
echo ""
echo "🏥 Step 5: Running health checks..."

# Backend health
echo -n "  Backend API:  "
if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
  echo "✅ Healthy"
else
  echo "⚠️  Starting up (may take a few more seconds)"
fi

# Frontend
echo -n "  Frontend:     "
if curl -sf http://localhost:80 > /dev/null 2>&1; then
  echo "✅ Serving on port 80"
else
  echo "⚠️  Starting up..."
fi

# n8n
echo -n "  n8n:          "
if curl -sf http://localhost:5678/healthz > /dev/null 2>&1; then
  echo "✅ Healthy on port 5678"
else
  echo "⚠️  Starting up (n8n takes ~30s)..."
fi

# ── 6. Summary ───────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                ✅ Deployment Complete!                   ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  Frontend:   http://${EC2_IP}                         ║"
echo "║  Backend:    http://${EC2_IP}:8000/api/health          ║"
echo "║  n8n Editor: http://${EC2_IP}:5678                    ║"
echo "║                                                          ║"
echo "║  Next Steps:                                             ║"
echo "║  1. Open n8n → set workflow credentials                  ║"
echo "║  2. Configure EC2 Security Group (ports 80, 5678, 8000)  ║"
echo "║  3. Optional: Add domain + HTTPS via Nginx/Certbot       ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Useful commands:"
echo "  docker compose logs -f          # View all logs"
echo "  docker compose logs -f backend  # Backend logs only"
echo "  docker compose ps               # Service status"
echo "  docker compose restart           # Restart all"
echo "  docker compose down              # Stop all"
echo ""
