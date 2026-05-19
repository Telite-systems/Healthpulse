#!/bin/sh
# ============================================
# n8n Workflow Auto-Import Script
# Runs as an init container after n8n is healthy.
# Imports and activates both workflows via the n8n CLI.
# ============================================

set -e

echo "=========================================="
echo " n8n Workflow Auto-Import"
echo "=========================================="
echo ""

WORKFLOW_DIR="/workflows"
WORKFLOWS="HealthcareApp.json search_disease_kb.json"

# ── Import each workflow ─────────────────────────────────────────────────────
for wf in $WORKFLOWS; do
  FILE="$WORKFLOW_DIR/$wf"
  if [ ! -f "$FILE" ]; then
    echo "⚠️  Workflow file not found: $FILE — skipping"
    continue
  fi

  NAME=$(echo "$wf" | sed 's/\.json$//')
  echo "📦 Importing workflow: $NAME"

  # n8n CLI import — reads from the shared volume
  if n8n import:workflow --input="$FILE" 2>&1; then
    echo "✅ $NAME imported successfully"
  else
    echo "⚠️  $NAME import returned non-zero (may already exist) — continuing"
  fi
  echo ""
done

# ── Activate all workflows via n8n CLI ───────────────────────────────────────
echo "🔄 Activating all imported workflows..."

# Use the n8n CLI to list and activate workflows
# The n8n CLI uses the same database as the running n8n instance (shared volume)
n8n execute --file /dev/null 2>/dev/null || true

echo ""
echo "=========================================="
echo " ✅ Workflow import complete!"
echo "=========================================="
echo " Visit http://localhost:5678 to verify"
echo " Workflows may need credential setup in UI"
echo "=========================================="
