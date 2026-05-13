# AWS Deployment Guide - HealthPulse

Complete guide for deploying HealthPulse (Backend + Frontend + n8n) to AWS.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     AWS Environment                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐     ┌──────────────────┐      │
│  │   ALB/NLB       │────▶│  ECS Fargate     │      │
│  │ (Load Balancer) │     │  - Frontend      │      │
│  └─────────────────┘     │  - Backend       │      │
│          ▲               │  - n8n           │      │
│          │               └──────────────────┘      │
│          │                      │                  │
│     Internet                     ▼                  │
│                          ┌──────────────────┐      │
│                          │  MongoDB Atlas   │      │
│                          │  (Managed DB)    │      │
│                          └──────────────────┘      │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │        AWS Services                         │  │
│  │ - ECS Cluster                              │  │
│  │ - CloudWatch (Logging)                     │  │
│  │ - ECR (Container Registry)                 │  │
│  │ - Secrets Manager (Sensitive Data)         │  │
│  │ - RDS or EBS (Storage)                     │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Docker installed locally
- ECR repository created for images
- MongoDB Atlas account (or RDS PostgreSQL/MySQL)
- Domain name (optional, for production)

## Step 1: Prepare Environment Variables

Create `.env.aws` from the template:

```bash
cp .env.aws.example .env.aws
```

Edit `.env.aws` with your AWS details:

```bash
# Production settings
DEBUG=False
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
JWT_SECRET_KEY=your-very-secure-random-string-min-32-chars
CORS_ORIGINS=https://your-domain.com,https://n8n.your-domain.com
N8N_HOST=n8n.your-domain.com
N8N_PROTOCOL=https
WEBHOOK_TUNNEL_URL=https://n8n.your-domain.com/
```

## Step 2: Create ECR Repositories

```bash
# Create repositories for each service
aws ecr create-repository --repository-name healthpulse-backend --region us-east-1
aws ecr create-repository --repository-name healthpulse-frontend --region us-east-1
aws ecr create-repository --repository-name healthpulse-n8n --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

## Step 3: Build and Push Docker Images

```bash
# Backend
docker build -t healthpulse-backend:latest ./healthcare-backend
docker tag healthpulse-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-backend:latest

# Frontend
docker build -t healthpulse-frontend:latest ./healthcare-app
docker tag healthpulse-frontend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-frontend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-frontend:latest

# n8n (use official image or custom)
docker tag n8nio/n8n:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-n8n:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/healthpulse-n8n:latest
```

## Step 4: Store Secrets in AWS Secrets Manager

```bash
# Store sensitive environment variables
aws secretsmanager create-secret --name healthpulse/jwt-secret \
  --secret-string "your-very-secure-jwt-key"

aws secretsmanager create-secret --name healthpulse/mongodb-url \
  --secret-string "mongodb+srv://username:password@cluster..."

aws secretsmanager create-secret --name healthpulse/cors-origins \
  --secret-string "https://your-domain.com,https://n8n.your-domain.com"
```

## Step 5: Deploy to ECS

### Option A: Using AWS CloudFormation

Create `cloudformation-stack.json` or use AWS Copilot:

```bash
# Initialize with AWS Copilot
copilot app init healthpulse
copilot env init --name prod --profile default --default-config
copilot svc init --name backend --dockerfile ./healthcare-backend/Dockerfile
copilot svc deploy
```

### Option B: Manual ECS Deployment

1. Create ECS Cluster in AWS Console
2. Create Task Definition with 3 containers:
   - `healthpulse-backend`
   - `healthpulse-frontend`
   - `healthpulse-n8n`

3. Create ECS Service
4. Configure Load Balancer (ALB/NLB)
5. Set target groups for port routing

### Option C: Using Docker Compose with AWS CLI

```bash
# Deploy docker-compose to ECS
docker compose -f docker-compose.aws.yml config | \
  ecs-cli compose --project-name healthpulse \
  --cluster healthpulse-cluster \
  service create
```

## Step 6: Configure Networking

### Setup ALB (Application Load Balancer)

```bash
# Create security group
aws ec2 create-security-group --group-name healthpulse-alb \
  --description "SecurityGroup for HealthPulse ALB"

# Open ports
aws ec2 authorize-security-group-ingress --group-name healthpulse-alb \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress --group-name healthpulse-alb \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

### Setup Route 53 (DNS)

```bash
# Create Route 53 record
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "healthpulse.your-domain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<ALB_ZONE_ID>",
          "DNSName": "<ALB_DNS_NAME>",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

## Step 7: Import n8n Workflows

Once n8n is running on AWS:

```bash
# Port-forward to n8n (if using bastion host)
ssh -i key.pem -L 5678:n8n-service:5678 ec2-user@bastion

# Run import script
.\import-n8n-workflows.ps1 -N8nUrl "http://localhost:5678"

# Or manually via AWS Console:
# 1. SSH into ECS instance
# 2. Copy workflow files
# 3. Use n8n API to import
```

## Step 8: Set Up CloudWatch Monitoring

```bash
# Create CloudWatch Log Group
aws logs create-log-group --log-group-name /ecs/healthpulse

# Setup alarms
aws cloudwatch put-metric-alarm \
  --alarm-name healthpulse-backend-cpu \
  --alarm-description "Alert on high CPU" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

## Step 9: Configure SSL/TLS

```bash
# Request SSL certificate from AWS Certificate Manager
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names n8n.your-domain.com \
  --validation-method DNS

# Add certificate to ALB listener
# (Done via AWS Console or CLI)
```

## Deployment Verification

### Check Container Health

```bash
# List running tasks
aws ecs list-tasks --cluster healthpulse-cluster

# Describe task
aws ecs describe-tasks --cluster healthpulse-cluster --tasks <TASK_ARN>

# Check logs
aws logs tail /ecs/healthpulse --follow
```

### Test Services

```bash
# Backend API
curl https://api.your-domain.com/docs

# Frontend
curl https://your-domain.com

# n8n
curl https://n8n.your-domain.com
```

## Auto-Scaling Configuration

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/healthpulse-cluster/backend \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --policy-name healthpulse-scale-up \
  --service-namespace ecs \
  --resource-id service/healthpulse-cluster/backend \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## Troubleshooting

### Container won't start

```bash
# Check ECS task logs
aws logs get-log-events \
  --log-group-name /ecs/healthpulse \
  --log-stream-name <LOG_STREAM>
```

### MongoDB connection issues

- Verify security group allows connection from ECS
- Check MongoDB Atlas network access settings
- Verify connection string format

### n8n workflows not syncing

- Check volume mount permissions
- Verify workflow files in ECS task
- Use n8n API to import workflows directly

## Cleanup

```bash
# Stop and remove ECS service
aws ecs update-service --cluster healthpulse-cluster \
  --service backend --desired-count 0

aws ecs delete-service --cluster healthpulse-cluster --service backend

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name healthpulse

# Remove ECR repositories
aws ecr delete-repository --repository-name healthpulse-backend --force
```

## Next Steps

1. ✅ Setup CloudFront for frontend caching
2. ✅ Configure backup strategies for MongoDB
3. ✅ Set up CI/CD pipeline (GitHub Actions / GitLab CI)
4. ✅ Implement health checks and auto-recovery
5. ✅ Setup cost monitoring and alerts

For detailed AWS CLI documentation, visit: https://docs.aws.amazon.com/cli/
For n8n deployment help: https://docs.n8n.io/hosting/installation/
