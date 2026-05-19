# HealthPulse — AWS EC2 Deployment Guide

## Prerequisites

| What | Minimum |
|------|---------|
| EC2 Instance | `t2.medium` (2 vCPU, 4 GB RAM) |
| OS | Amazon Linux 2023 or Ubuntu 22.04 |
| Storage | 20 GB EBS |
| Security Group | Ports 22, 80, 8000, 5678 open |

---

## Step 1 — Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose **Amazon Linux 2023** or **Ubuntu 22.04**
3. Instance type: **t2.medium** (minimum for running 4 containers)
4. Key pair: Create or select an existing `.pem` key
5. Security Group — add these **Inbound Rules**:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | Frontend (nginx) |
| 8000 | TCP | 0.0.0.0/0 | Backend API (optional, nginx proxies it) |
| 5678 | TCP | Your IP | n8n Editor (restrict to your IP!) |

6. Launch and note your **Public IPv4** address

---

## Step 2 — SSH into the Instance

```bash
# Make key readable
chmod 400 your-key.pem

# Connect
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
# or for Ubuntu:
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

---

## Step 3 — Install Git & Clone the Repo

```bash
# Amazon Linux
sudo yum install -y git

# Ubuntu
# sudo apt-get update && sudo apt-get install -y git

# Clone your repo
git clone https://github.com/YOUR_USERNAME/Healthpulse.git
cd Healthpulse
```

---

## Step 4 — Run the Deploy Script

```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

This script will automatically:
- ✅ Install Docker & Docker Compose
- ✅ Create `.env` with your EC2 public IP
- ✅ Generate a secure JWT secret
- ✅ Build all 4 containers (backend, frontend, n8n, n8n-init)
- ✅ Run health checks

> **⚠️ First run**: After Docker installs, you may need to log out and back in for Docker group permissions:
> ```bash
> exit
> ssh -i your-key.pem ec2-user@YOUR_EC2_IP
> cd Healthpulse
> ./deploy-ec2.sh
> ```

---

## Step 5 — Verify Deployment

Once the script finishes, check:

```bash
# All containers running?
docker compose ps

# Expected output:
# healthpulse-backend    Running   0.0.0.0:8000->8000
# healthpulse-frontend   Running   0.0.0.0:80->80
# healthpulse-n8n        Running   0.0.0.0:5678->5678
# healthpulse-n8n-init   Exited (0)  ← Normal, it's a one-shot

# Test endpoints
curl http://localhost/api/health        # Backend via nginx
curl http://localhost:8000/api/health   # Backend direct
curl http://localhost:5678/healthz      # n8n
```

Then open in your browser:
- **Frontend**: `http://YOUR_EC2_IP`
- **n8n Editor**: `http://YOUR_EC2_IP:5678`

---

## Step 6 — Configure n8n Workflows

1. Open `http://YOUR_EC2_IP:5678` in your browser
2. The two workflows should be auto-imported
3. Open each workflow → **Credentials** → Add your Supabase/API keys
4. **Activate** both workflows

---

## Manual Deployment (Without Script)

If you prefer to do it manually:

```bash
# 1. Install Docker
sudo yum install -y docker
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER

# 2. Install Docker Compose
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p "$DOCKER_CONFIG/cli-plugins"
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

# 3. Log out and back in (for docker group)
exit
# ssh back in...

# 4. Create .env file (edit with your values)
cp .env.aws.example .env
nano .env    # Update MONGODB_URL, JWT_SECRET_KEY, EC2 IP, etc.

# 5. Copy env to backend
cp .env healthcare-backend/.env

# 6. Make scripts executable
chmod +x init-n8n-workflows.sh

# 7. Build & start
docker compose up --build -d

# 8. Check logs
docker compose logs -f
```

---

## Useful Commands

```bash
# View live logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f n8n

# Check n8n workflow import
docker logs healthpulse-n8n-init

# Restart everything
docker compose restart

# Rebuild after code changes
docker compose up --build -d

# Stop everything
docker compose down

# Full reset (removes volumes too)
docker compose down -v
```

---

## Updating After Code Changes

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up --build -d
```

---

## Optional: Add HTTPS with Custom Domain

If you have a domain name:

```bash
# 1. Point your domain A record to EC2 public IP

# 2. Install Certbot
sudo yum install -y certbot python3-certbot-nginx  # Amazon Linux
# sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# 3. Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# 4. Update .env
# CORS_ORIGINS=https://yourdomain.com
# N8N_EDITOR_BASE_URL=https://n8n.yourdomain.com

# 5. Rebuild
docker compose up --build -d
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot connect to Docker daemon` | Run `sudo systemctl start docker` or re-login for group perms |
| Frontend shows blank page | Check `docker compose logs frontend` — nginx config issue |
| Backend 502 error | Backend container may still be starting — wait 30s and retry |
| n8n workflows not imported | Check `docker logs healthpulse-n8n-init` |
| CORS errors in browser | Add your EC2 IP to `CORS_ORIGINS` in `.env` and rebuild |
| Can't access from browser | Check EC2 Security Group inbound rules (ports 80, 5678) |
| Out of memory | Upgrade to `t2.medium` or higher (4 containers need ~3GB RAM) |
