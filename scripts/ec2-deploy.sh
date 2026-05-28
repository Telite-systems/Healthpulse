#!/bin/bash
# ============================================================
# HealthPulse — EC2 Deployment Script (for CI/CD)
# ============================================================
# This script is designed to be called by GitHub Actions via SSH.
# Unlike deploy-ec2.sh (first-time setup), this handles
# incremental deployments only.
#
# Usage: ./scripts/ec2-deploy.sh [branch]
# ============================================================

set -euo pipefail

BRANCH="${1:-main}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     HealthPulse — EC2 Incremental Deploy               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Project: $PROJECT_DIR"
echo "🌿 Branch:  $BRANCH"
echo "🕐 Time:    $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

cd "$PROJECT_DIR"

# ── 1. Pull latest code ─────────────────────────────────────
echo "📥 Step 1: Pulling latest code..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "✅ Code updated to $(git log -1 --format='%h — %s')"

# ── 2. Sync environment files ───────────────────────────────
echo ""
echo "📋 Step 2: Syncing environment files..."
if [ -f .env ]; then
  cp .env healthcare-backend/.env
  echo "✅ .env synced to healthcare-backend/"
else
  echo "⚠️  No root .env found — skipping sync"
fi

# ── 3. Make scripts executable ──────────────────────────────
echo ""
echo "🔧 Step 3: Setting permissions..."
chmod +x init-n8n-workflows.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true
echo "✅ Permissions set"

# ── 4. Rebuild containers ──────────────────────────────────
echo ""
echo "🐳 Step 4: Rebuilding containers..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up --build -d
echo "✅ Containers rebuilt and started"

# ── 5. Health checks ────────────────────────────────────────
echo ""
echo "🏥 Step 5: Running health checks..."
"$SCRIPT_DIR/health-check.sh"
HEALTH_EXIT=$?

# ── 6. Clean up ─────────────────────────────────────────────
echo ""
echo "🧹 Step 6: Cleaning up old images..."
docker image prune -f > /dev/null 2>&1
echo "✅ Cleanup complete"

# ── Summary ─────────────────────────────────────────────────
echo ""
if [ $HEALTH_EXIT -eq 0 ]; then
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║            ✅ Deployment Successful!                    ║"
  echo "╚══════════════════════════════════════════════════════════╝"
else
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║       ⚠️  Deployment completed with warnings            ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  echo "📋 Container status:"
  docker compose ps
  exit 1
fi
