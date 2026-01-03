#!/bin/bash
# Health Check Script
# Usage: ./scripts/health-check.sh [url]

set -e

BASE_URL=${1:-http://localhost:8000}
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Health Check: $BASE_URL"
echo "================================"

check() {
  local name=$1
  local endpoint=$2
  local response
  
  response=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null) || response="000"
  
  if [[ "$response" == "200" ]]; then
    echo -e "${GREEN}✓${NC} $name ($endpoint)"
    return 0
  else
    echo -e "${RED}✗${NC} $name ($endpoint) - HTTP $response"
    return 1
  fi
}

# Core endpoints
check "Health" "/health"
check "API Root" "/"
check "Docs" "/docs"

# Optional endpoints
check "Ready" "/ready" || true
check "Metrics" "/metrics" || true

echo "================================"

# Overall status
if check "Health" "/health" >/dev/null 2>&1; then
  echo -e "${GREEN}All critical checks passed${NC}"
  exit 0
else
  echo -e "${RED}Critical checks failed${NC}"
  exit 1
fi

