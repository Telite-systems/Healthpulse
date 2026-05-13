# Import n8n workflows automatically (Windows)
# Usage: .\import-n8n-workflows.ps1

param(
    [string]$N8nUrl = "http://localhost:5678"
)

Write-Host "n8n Workflow Import Script" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Target: $N8nUrl" -ForegroundColor Yellow
Write-Host ""

# Check if n8n is accessible
Write-Host "Checking n8n connectivity..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$N8nUrl/api/v1/workflows" -Method Get -ErrorAction Stop
    Write-Host "✓ Connected to n8n" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot connect to n8n at $N8nUrl" -ForegroundColor Red
    Write-Host "Make sure n8n is running: docker compose up -d n8n" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Get all workflow files
$workflowFiles = Get-ChildItem -Path ".\n8n workflow\*.json" -ErrorAction SilentlyContinue

if ($workflowFiles.Count -eq 0) {
    Write-Host "No workflow files found in .\n8n workflow\" -ForegroundColor Red
    exit 1
}

# Import workflows
foreach ($file in $workflowFiles) {
    $workflowName = $file.BaseName
    Write-Host "Importing: $workflowName" -ForegroundColor Yellow
    
    try {
        $workflowContent = Get-Content $file.FullName -Raw | ConvertFrom-Json
        
        $body = $workflowContent | ConvertTo-Json -Depth 100
        
        $response = Invoke-WebRequest -Uri "$N8nUrl/rest/workflows/import" `
            -Method Post `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction Stop
        
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.id) {
            Write-Host "✓ $workflowName imported successfully (ID: $($result.id))" -ForegroundColor Green
        } else {
            Write-Host "⚠ $workflowName response: $($response.Content)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error importing $workflowName : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! Visit $N8nUrl to view and publish your workflows" -ForegroundColor Cyan
