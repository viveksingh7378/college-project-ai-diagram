#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
#  deploy_ec2.sh — pull latest AI Diagram Agent images and restart
#  Run on the EC2 host after Jenkins has pushed new Docker images.
#
#  Usage:
#    ./deploy_ec2.sh            # deploy latest
#    ./deploy_ec2.sh rollback   # revert to previous images
# ─────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠${NC}  $1"; }
fail() { echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC}  $1"; exit 1; }

SERVICES=(college-ai-diagram-client college-ai-diagram-server)

# ── Rollback mode ────────────────────────────────────────────────────
if [ "$1" = "rollback" ]; then
    warn "Rolling back to previous images..."
    docker compose down
    for svc in "${SERVICES[@]}"; do
        PREV=$(docker images vivek7378/${svc} --format "{{.Tag}}" | grep -v latest | head -1)
        if [ -n "$PREV" ]; then
            log "Re-tagging vivek7378/${svc}:${PREV} as :latest"
            docker tag "vivek7378/${svc}:${PREV}" "vivek7378/${svc}:latest"
        else
            warn "No previous image found for ${svc}"
        fi
    done
    docker compose up -d
    log "Rollback complete"
    exit 0
fi

# ── Normal deploy ────────────────────────────────────────────────────
[ -f .env ] || fail "Missing .env file (copy from .env.example and fill in)"

log "Pulling latest images..."
docker compose pull

log "Restarting stack..."
docker compose up -d --remove-orphans

log "Waiting for health checks..."
sleep 10

log "Current status:"
docker compose ps

log "Deploy complete. Client: http://$(curl -s ifconfig.me 2>/dev/null || echo localhost)"
