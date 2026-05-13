# n8n Workflow Setup Guide

This guide explains how to set up and deploy the two n8n workflows included in this project.

## Available Workflows

1. **HealthcareApp.json** - Main healthcare chatbot workflow with LLM integration (Google Gemini)
2. **search_disease_kb.json** - Disease knowledge base search workflow

## Local Development

### Start n8n with Docker Compose

```bash
docker compose up -d n8n
```

n8n will be available at: `http://localhost:5678`

### Import Workflows

#### Option 1: Manual Import via UI (Recommended for First Time)

1. Open n8n: http://localhost:5678
2. Click **"+"** → **"Import from file"**
3. Select `n8n workflow/HealthcareApp.json`
4. Click **"Import"**
5. Repeat for `n8n workflow/search_disease_kb.json`

#### Option 2: Automatic Import (Using n8n CLI)

```bash
# Connect to n8n container
docker exec -it healthpulse-n8n n8n import:workflow --input=./workflows/HealthcareApp.json

docker exec -it healthpulse-n8n n8n import:workflow --input=./workflows/search_disease_kb.json
```

### Publishing Workflows

1. Open the workflow in n8n UI
2. Click the **"Save"** button (top right)
3. Toggle the switch to **ON** (to activate/publish the workflow)
4. Click **"Test Workflow"** to verify it works
5. Set up any required credentials (API keys, database connections, etc.)

## AWS Deployment

### Environment Variables Required

Add these to your AWS environment or `.env.aws` file:

```bash
# n8n Configuration
N8N_HOST=your-domain.com          # e.g., n8n.healthpulse.com
N8N_PROTOCOL=https                # Use https for production
WEBHOOK_TUNNEL_URL=https://your-domain.com/  # For webhook tunneling

# Optional n8n Settings
N8N_EDITOR_BASE_URL=https://your-domain.com
N8N_TRUSTED_HOSTS=your-domain.com
```

### Deploy on AWS

Using AWS ECS / Fargate:

```bash
# Build and push images to ECR
docker compose -f docker-compose.aws.yml build
docker tag healthpulse-n8n:latest <AWS_ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/healthpulse-n8n:latest
docker push <AWS_ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/healthpulse-n8n:latest

# Use AWS Copilot or manually create ECS service from docker-compose.aws.yml
docker compose -f docker-compose.aws.yml up --build
```

### Import Workflows on AWS

1. SSH into your ECS instance or container
2. Copy workflow files into the container:
   ```bash
   docker cp "n8n workflow/HealthcareApp.json" <container-id>:/home/node/.n8n/workflows/
   docker cp "n8n workflow/search_disease_kb.json" <container-id>:/home/node/.n8n/workflows/
   ```

3. Or use n8n API to import:
   ```bash
   curl -X POST http://n8n-service:5678/rest/workflows/import \
     -H "Content-Type: application/json" \
     -d @n8n\ workflow/HealthcareApp.json
   ```

## Workflow Configuration

### HealthcareApp Workflow

**Nodes:**
- Google Gemini Chat Model (requires API key)
- Simple Memory (for session context)
- Agent with system prompt

**Required Setup:**
1. Add Google Gemini API credentials in n8n
2. Ensure backend service is running for patient data lookups
3. Test webhook connectivity

### search_disease_kb Workflow

**Nodes:**
- Workflow trigger (callable from HealthcareApp)
- Supabase API call (for disease matching)
- Embedding generation

**Required Setup:**
1. Configure Supabase credentials
2. Ensure disease knowledge base is available
3. Update API endpoint if using custom backend

## Data Persistence

- Local: n8n data stored in Docker volume `n8n_data`
- AWS: Use AWS EBS for persistent storage or RDS for n8n database

## Troubleshooting

### Workflows not loading on startup
- Check volume mounts in docker-compose
- Verify file permissions on workflow files
- Check n8n logs: `docker logs healthpulse-n8n`

### Credentials not loading
- n8n encrypts credentials in DB
- Re-enter credentials after first import
- Use n8n environment variables for sensitive data

### Webhook issues
- Ensure `WEBHOOK_TUNNEL_URL` is correctly configured
- For AWS: use ALB/NLB with proper DNS setup
- Test webhooks via n8n UI

## Next Steps

1. Test workflows locally first
2. Configure all required credentials
3. Publish workflows in n8n UI
4. Deploy to AWS using ECS/Fargate
5. Set up monitoring and logging
