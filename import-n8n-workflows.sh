#!/bin/bash
# Import n8n workflows automatically
# Usage: ./import-n8n-workflows.sh

N8N_URL="${N8N_URL:-http://localhost:5678}"
WORKFLOWS_DIR="./n8n workflow"

echo "n8n Workflow Import Script"
echo "========================="
echo "Target: $N8N_URL"
echo ""

# Check if n8n is accessible
echo "Checking n8n connectivity..."
if ! curl -s "$N8N_URL/api/v1/workflows" > /dev/null 2>&1; then
    echo "❌ Cannot connect to n8n at $N8N_URL"
    echo "Make sure n8n is running: docker compose up -d n8n"
    exit 1
fi
echo "✓ Connected to n8n"
echo ""

# Import workflows
for workflow_file in "$WORKFLOWS_DIR"/*.json; do
    if [ -f "$workflow_file" ]; then
        workflow_name=$(basename "$workflow_file" .json)
        echo "Importing: $workflow_name"
        
        # Read and import workflow
        workflow_data=$(cat "$workflow_file")
        response=$(curl -s -X POST "$N8N_URL/rest/workflows/import" \
            -H "Content-Type: application/json" \
            -d "$workflow_data")
        
        if echo "$response" | grep -q "id"; then
            echo "✓ $workflow_name imported successfully"
        else
            echo "⚠ $workflow_name import response: $response"
        fi
    fi
done

echo ""
echo "Done! Visit $N8N_URL to view and publish your workflows"
