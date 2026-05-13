# HealthPulse - Docker & AWS Deployment Quick Start

## 📁 New Files Added

```
├── Dockerfile                           # Backend containerization
├── docker-compose.yml                   # Local dev with MongoDB
├── docker-compose.aws.yml               # AWS production (no local MongoDB)
├── .env.aws.example                     # AWS environment template
├── N8N_SETUP.md                         # n8n workflow setup guide
├── AWS_DEPLOYMENT.md                    # Complete AWS deployment guide
├── import-n8n-workflows.ps1             # Windows: Import n8n workflows
├── import-n8n-workflows.sh              # Linux/Mac: Import n8n workflows
│
├── healthcare-app/
│   ├── Dockerfile                       # Frontend containerization (Nginx)
│   └── .dockerignore
│
└── healthcare-backend/
    ├── Dockerfile                       # Backend containerization (FastAPI)
    └── .dockerignore
```

## 🚀 Quick Start - Local Development

### 1. Start All Services Locally

```bash
cd c:\Healthpulse\Healthpulse

# Start with Docker Compose
docker compose up --build

# Services available at:
# - Frontend:  http://localhost
# - Backend:   http://localhost:8000
# - n8n:       http://localhost:5678
# - MongoDB:   localhost:27017
```

### 2. Import n8n Workflows

**Windows:**
```powershell
.\import-n8n-workflows.ps1
```

**Linux/Mac:**
```bash
chmod +x import-n8n-workflows.sh
./import-n8n-workflows.sh
```

### 3. Access n8n UI

1. Open http://localhost:5678
2. Create admin account
3. Import workflows:
   - HealthcareApp.json
   - search_disease_kb.json
4. Configure credentials and test

## 🌐 AWS Deployment

### Quick Setup

```bash
# 1. Copy and edit AWS env file
cp .env.aws.example .env.aws
# Edit .env.aws with your AWS details

# 2. Login to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 3. Build and push images
docker compose -f docker-compose.aws.yml build
docker tag healthpulse-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-backend:latest
# Repeat for frontend and n8n

# 4. Deploy to ECS
docker compose -f docker-compose.aws.yml up --build
```

> See [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) for detailed step-by-step instructions.

## 📋 What's Included

### Services

- **Backend** (FastAPI + Python)
  - Port: 8000
  - Dockerfile: `healthcare-backend/Dockerfile`
  
- **Frontend** (React + Vite + Nginx)
  - Port: 80
  - Dockerfile: `healthcare-app/Dockerfile`
  
- **n8n** (Workflow Automation)
  - Port: 5678
  - Workflows: `n8n workflow/`
    - HealthcareApp.json (Main chatbot with LLM)
    - search_disease_kb.json (Disease knowledge base)
  
- **MongoDB** (Local only)
  - Port: 27017
  - Not included in AWS compose (use MongoDB Atlas)

### Environment Configuration

| File | Purpose |
|------|---------|
| `healthcare-backend/.env` | Local backend config |
| `.env.aws` | AWS deployment config |
| `.env.aws.example` | AWS config template |

## 🔑 Key Environment Variables

### Backend
```
MONGODB_URL=              # Database connection
JWT_SECRET_KEY=           # Authentication secret
CORS_ORIGINS=             # Allowed frontend domains
DEBUG=                    # Development mode
```

### n8n (AWS)
```
N8N_HOST=                 # Domain name
N8N_PROTOCOL=https        # Use HTTPS in production
WEBHOOK_TUNNEL_URL=       # For external webhooks
```

## 📝 Documentation

- **[N8N_SETUP.md](N8N_SETUP.md)** - Detailed n8n setup and publishing guide
- **[AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)** - Complete AWS deployment walkthrough

## ✅ Pre-Deployment Checklist

- [ ] MongoDB URL configured (local or MongoDB Atlas)
- [ ] JWT_SECRET_KEY set to secure random value
- [ ] CORS_ORIGINS updated with your domain
- [ ] AWS credentials configured (`aws configure`)
- [ ] ECR repositories created
- [ ] n8n workflows tested locally
- [ ] Backend API health check passing
- [ ] Frontend builds without errors

## 🐛 Troubleshooting

### Docker issues
```bash
# Check if Docker is running
docker ps

# View container logs
docker compose logs -f backend

# Stop all services
docker compose down
```

### n8n import fails
```bash
# Verify n8n is accessible
curl http://localhost:5678/api/v1/workflows

# Check script output
.\import-n8n-workflows.ps1 -Verbose
```

### MongoDB connection error
```bash
# Check if MongoDB container is running
docker ps | grep mongodb

# Verify connection string format
# Local: mongodb://localhost:27017
# Atlas: mongodb+srv://username:password@cluster...
```

## 🔒 Security Notes

⚠️ **IMPORTANT:**
- `.env` files should NOT be committed to Git
- Use AWS Secrets Manager for production secrets
- Change default MongoDB credentials
- Enable SSL/TLS on ALB
- Use VPC security groups to restrict traffic
- Never expose `JWT_SECRET_KEY` in code

## 📊 Monitoring & Logs

### Local Development
```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f backend
```

### AWS Production
```bash
# View CloudWatch logs
aws logs tail /ecs/healthpulse --follow

# Get container health status
aws ecs describe-tasks --cluster healthpulse-cluster --tasks <TASK_ARN>
```

## 🔄 Updating Services

### Local
```bash
# Rebuild and restart
docker compose up -d --build
```

### AWS
```bash
# Push new image to ECR
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-backend:latest

# Force ECS task update
aws ecs update-service --cluster healthpulse-cluster \
  --service backend --force-new-deployment
```

## 📞 Support

For issues or questions:
1. Check logs: `docker compose logs -f <service>`
2. Review documentation: [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)
3. Check n8n docs: https://docs.n8n.io/

---

**Last Updated:** 2026-05-13
**Compose Version:** 3.8
**Services:** Backend, Frontend, n8n, MongoDB
