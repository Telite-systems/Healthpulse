#!/bin/bash
# ============================================================
# HealthPulse — Post-Deploy Health Check Script
# ============================================================
# Checks that all services are responding correctly.
# Used by both CI/CD pipeline and manual verification.
#
# Usage: ./scripts/health-check.sh
# Exit:  0 = all healthy, 1 = one or more failed
# ============================================================

set -uo pipefail

MAX_RETRIES="${HEALTH_CHECK_RETRIES:-12}"
RETRY_DELAY="${HEALTH_CHECK_DELAY:-5}"
FAILED=0

echo "🏥 HealthPulse — Service Health Checks"
echo "   Max retries: $MAX_RETRIES | Delay: ${RETRY_DELAY}s"
echo ""

# ── Health check function ────────────────────────────────────
check_service() {
  local name="$1"
  local url="$2"
  local expected_code="${3:-200}"

  for i in $(seq 1 "$MAX_RETRIES"); do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
      echo "  ✅ $name — HTTP $HTTP_CODE (attempt $i/$MAX_RETRIES)"
      return 0
    fi

    if [ "$i" -lt "$MAX_RETRIES" ]; then
      echo "  ⏳ $name — HTTP $HTTP_CODE (attempt $i/$MAX_RETRIES, retrying in ${RETRY_DELAY}s...)"
      sleep "$RETRY_DELAY"
    fi
  done

  echo "  ❌ $name — FAILED (HTTP $HTTP_CODE after $MAX_RETRIES attempts)"
  return 1
}

# ── Run checks ──────────────────────────────────────────────
check_service "Backend API (port 8000)" "http://localhost:8000/api/health" || FAILED=1
check_service "Frontend    (port 80)"   "http://localhost:80"              || FAILED=1
check_service "n8n         (port 5678)" "http://localhost:5678/healthz"    || FAILED=1

# ── Summary ─────────────────────────────────────────────────
echo ""
if [ $FAILED -eq 0 ]; then
  echo "✅ All services healthy!"
else
  echo "❌ One or more services failed health checks"
  echo ""
  echo "📋 Docker container status:"
  docker compose ps 2>/dev/null || docker ps
  echo ""
  echo "📋 Recent logs from failing containers:"
  docker compose logs --tail=15 2>/dev/null || true
fi

exit $FAILED
