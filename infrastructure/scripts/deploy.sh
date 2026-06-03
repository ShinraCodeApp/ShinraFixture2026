#!/bin/bash
# ShinraFixture 2026 - Production Deployment Script

set -euo pipefail

# ── Config ─────────────────────────────────────────────
APP_NAME="shinra-fixture-2026"
DOCKER_REGISTRY="your-registry.io"
VERSION="${1:-latest}"
ENVIRONMENT="${2:-production}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠ $1${NC}"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ✗ $1${NC}"; exit 1; }

notify_slack() {
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"$1\"}" "$SLACK_WEBHOOK" > /dev/null
  fi
}

# ── Pre-deployment Checks ───────────────────────────────
log "Starting deployment of ShinraFixture 2026 v${VERSION}"
notify_slack "🚀 Deploying ShinraFixture 2026 v${VERSION} to ${ENVIRONMENT}"

# Check required tools
command -v docker >/dev/null 2>&1 || error "Docker is not installed"
command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"

# Check environment file
if [ ! -f ".env" ]; then
  error ".env file not found. Copy .env.example and fill in values"
fi

# ── Backup ─────────────────────────────────────────────
log "Creating database backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec shinra_postgres pg_dump -U shinra shinra_db > "./backups/${BACKUP_FILE}" || warn "Backup failed (continuing)"
log "Backup saved: ${BACKUP_FILE}"

# ── Pull New Images ────────────────────────────────────
log "Pulling latest images..."
docker-compose pull --quiet

# ── Build Images ───────────────────────────────────────
log "Building application images..."
docker-compose build --no-cache --parallel

# ── Run Database Migrations ────────────────────────────
log "Running database migrations..."
docker-compose run --rm api npx prisma migrate deploy || error "Migration failed"
log "Migrations completed"

# ── Rolling Restart ────────────────────────────────────
log "Starting rolling update..."
docker-compose up -d --remove-orphans

# ── Health Checks ──────────────────────────────────────
log "Waiting for services to be healthy..."
TIMEOUT=120
ELAPSED=0
while ! docker-compose exec -T api wget -q --spider http://localhost:4000/health 2>/dev/null; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    error "Health check timeout after ${TIMEOUT}s"
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  log "Waiting... ${ELAPSED}s"
done

log "API is healthy!"

# ── Cleanup ────────────────────────────────────────────
log "Cleaning up old Docker resources..."
docker system prune -f --filter "until=24h" > /dev/null

# ── Done ───────────────────────────────────────────────
log "✅ Deployment successful! ShinraFixture 2026 v${VERSION} is live"
notify_slack "✅ ShinraFixture 2026 v${VERSION} deployed successfully to ${ENVIRONMENT}!"

# Print service status
docker-compose ps
