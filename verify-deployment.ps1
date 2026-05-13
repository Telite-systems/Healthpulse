#!/usr/bin/env pwsh
# Deployment verification script for HealthPulse
# Tests all services locally before AWS deployment

param(
    [string]$Environment = "local"  # "local" or "aws"
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }
function Write-Warning-Custom { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Write-Info "═══════════════════════════════════════════════════════"
Write-Info "   HealthPulse Deployment Verification Script"
Write-Info "═══════════════════════════════════════════════════════"
Write-Info ""
Write-Info "Environment: $Environment"
Write-Info ""

$baseUrl = if ($Environment -eq "aws") { "https://your-domain.com" } else { "http://localhost" }
$backendUrl = if ($Environment -eq "aws") { "https://api.your-domain.com" } else { "http://localhost:8000" }
$n8nUrl = if ($Environment -eq "aws") { "https://n8n.your-domain.com" } else { "http://localhost:5678" }

$checks = @()

# ============ Docker Checks ============
Write-Info "🔍 Docker Status"
Write-Info "─────────────────────────────────────────────────────"

try {
    $dockerVersion = docker --version
    Write-Success "✓ Docker installed: $dockerVersion"
    $checks += $true
} catch {
    Write-Error-Custom "✗ Docker not installed or not in PATH"
    $checks += $false
}

# ============ Container Checks ============
Write-Info ""
Write-Info "🔍 Container Status"
Write-Info "─────────────────────────────────────────────────────"

if ($Environment -eq "local") {
    $containers = @(
        @{name="healthpulse-backend"; port=8000},
        @{name="healthpulse-frontend"; port=80},
        @{name="healthpulse-n8n"; port=5678},
        @{name="healthpulse-mongodb"; port=27017}
    )
} else {
    $containers = @(
        @{name="healthpulse-backend"; port=8000},
        @{name="healthpulse-frontend"; port=80},
        @{name="healthpulse-n8n"; port=5678}
    )
}

foreach ($container in $containers) {
    try {
        $running = docker ps --filter "name=$($container.name)" --format "{{.State}}"
        if ($running -eq "running") {
            Write-Success "✓ $($container.name) is running"
            $checks += $true
        } else {
            Write-Warning-Custom "⚠ $($container.name) is not running"
            $checks += $false
        }
    } catch {
        Write-Warning-Custom "⚠ Could not check $($container.name)"
        $checks += $false
    }
}

# ============ Service Connectivity Checks ============
Write-Info ""
Write-Info "🔍 Service Connectivity"
Write-Info "─────────────────────────────────────────────────────"

# Backend API
Write-Info "Testing Backend..."
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/docs" -SkipCertificateCheck -ErrorAction Stop -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Success "✓ Backend API responsive (HTTP $($response.StatusCode))"
        $checks += $true
    }
} catch {
    Write-Warning-Custom "⚠ Backend API not responding"
    $checks += $false
}

# Frontend
Write-Info "Testing Frontend..."
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -SkipCertificateCheck -ErrorAction Stop -TimeoutSec 5
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 304) {
        Write-Success "✓ Frontend responsive (HTTP $($response.StatusCode))"
        $checks += $true
    }
} catch {
    Write-Warning-Custom "⚠ Frontend not responding"
    $checks += $false
}

# n8n
Write-Info "Testing n8n..."
try {
    $response = Invoke-WebRequest -Uri "$n8nUrl/api/v1/workflows" -SkipCertificateCheck -ErrorAction Stop -TimeoutSec 5
    Write-Success "✓ n8n responsive (HTTP $($response.StatusCode))"
    $checks += $true
} catch {
    Write-Warning-Custom "⚠ n8n not responding"
    $checks += $false
}

# ============ n8n Workflows Check ============
Write-Info ""
Write-Info "🔍 n8n Workflows"
Write-Info "─────────────────────────────────────────────────────"

$workflowFiles = @("HealthcareApp.json", "search_disease_kb.json")
foreach ($file in $workflowFiles) {
    $path = ".\n8n workflow\$file"
    if (Test-Path $path) {
        Write-Success "✓ Workflow file found: $file"
        $checks += $true
    } else {
        Write-Error-Custom "✗ Workflow file missing: $file"
        $checks += $false
    }
}

# ============ Environment Files Check ============
Write-Info ""
Write-Info "🔍 Configuration Files"
Write-Info "─────────────────────────────────────────────────────"

$envFiles = @(
    @{path=".\healthcare-backend\.env"; name="Backend .env"},
    @{path=".\.env.aws.example"; name="AWS env template"}
)

foreach ($envFile in $envFiles) {
    if (Test-Path $envFile.path) {
        Write-Success "✓ $($envFile.name) found"
        $checks += $true
    } else {
        Write-Warning-Custom "⚠ $($envFile.name) missing"
        $checks += $false
    }
}

# ============ Docker Compose Files Check ============
Write-Info ""
Write-Info "🔍 Docker Compose Files"
Write-Info "─────────────────────────────────────────────────────"

$composeFiles = @("docker-compose.yml", "docker-compose.aws.yml")
foreach ($file in $composeFiles) {
    if (Test-Path $file) {
        Write-Success "✓ $file found"
        $checks += $true
    } else {
        Write-Error-Custom "✗ $file missing"
        $checks += $false
    }
}

# ============ Dockerfile Check ============
Write-Info ""
Write-Info "🔍 Dockerfiles"
Write-Info "─────────────────────────────────────────────────────"

$dockerfiles = @(
    @{path=".\healthcare-backend\Dockerfile"; name="Backend Dockerfile"},
    @{path=".\healthcare-app\Dockerfile"; name="Frontend Dockerfile"}
)

foreach ($dockerfile in $dockerfiles) {
    if (Test-Path $dockerfile.path) {
        Write-Success "✓ $($dockerfile.name) found"
        $checks += $true
    } else {
        Write-Error-Custom "✗ $($dockerfile.name) missing"
        $checks += $false
    }
}

# ============ Summary ============
Write-Info ""
Write-Info "═══════════════════════════════════════════════════════"

$passed = @($checks | Where-Object { $_ -eq $true }).Count
$failed = @($checks | Where-Object { $_ -eq $false }).Count
$total = $checks.Count

Write-Info "Verification Results:"
Write-Info "  Total Checks:  $total"
Write-Success "  Passed:        $passed"
if ($failed -gt 0) {
    Write-Error-Custom "  Failed:        $failed"
}

$percentage = [math]::Round(($passed / $total) * 100)
Write-Info "  Score:         $percentage%"

Write-Info ""

if ($failed -eq 0) {
    Write-Success "✓ All checks passed! Ready for deployment."
    exit 0
} elseif ($percentage -ge 70) {
    Write-Warning-Custom "⚠ Most checks passed. Review warnings above."
    exit 1
} else {
    Write-Error-Custom "✗ Critical checks failed. Fix issues before deployment."
    exit 2
}
