#!/bin/bash

# Hedge Fund Trading Platform - Production Deployment Script

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hedge-fund-trading-platform"
ENVIRONMENT=${1:-"production"}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Copying from .env.example..."
        cp .env.example .env
        log_error "Please configure your .env file with production values before deploying!"
        exit 1
    fi

    # Check if required environment variables are set
    required_vars=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=your-" .env; then
            log_error "Required environment variable ${var} is not set in .env file!"
            exit 1
        fi
    done

    log_success "Pre-deployment checks passed!"
}

# Create backup
create_backup() {
    log_info "Creating backup of current deployment..."

    mkdir -p "$BACKUP_DIR"

    # Backup database if it exists
    if docker ps | grep -q "${PROJECT_NAME}_db"; then
        log_info "Backing up database..."
        docker exec ${PROJECT_NAME}_db_1 pg_dump -U postgres hedge_fund_db > "$BACKUP_DIR/database_backup.sql" 2>/dev/null || true
    fi

    # Backup configuration files
    cp .env "$BACKUP_DIR/.env.backup" 2>/dev/null || true
    cp docker-compose.yml "$BACKUP_DIR/docker-compose.yml.backup" 2>/dev/null || true

    log_success "Backup created at $BACKUP_DIR"
}

# Build and deploy
deploy() {
    log_info "Starting deployment to $ENVIRONMENT environment..."

    # Set environment variable
    export ENVIRONMENT=$ENVIRONMENT

    # Pull latest changes if in git repository
    if [ -d ".git" ]; then
        log_info "Pulling latest changes..."
        git pull origin main 2>/dev/null || log_warning "Could not pull from git. Continuing with local files."
    fi

    # Build and start services
    log_info "Building and starting services..."

    if command -v docker-compose &> /dev/null; then
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
    else
        docker compose down
        docker compose build --no-cache
        docker compose up -d
    fi

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30

    # Health check
    if health_check; then
        log_success "Deployment completed successfully!"
        post_deployment_info
    else
        log_error "Deployment failed! Check logs with: docker-compose logs"
        exit 1
    fi
}

# Health check
health_check() {
    log_info "Running health checks..."

    # Check if all services are running
    if command -v docker-compose &> /dev/null; then
        services=$(docker-compose ps --services --filter "status=running")
    else
        services=$(docker compose ps --services --filter "status=running")
    fi

    expected_services=("api" "frontend" "db" "redis")
    for service in "${expected_services[@]}"; do
        if ! echo "$services" | grep -q "^${service}$"; then
            log_error "Service $service is not running!"
            return 1
        fi
    done

    # Check API health endpoint
    if ! curl -f -s http://localhost:8000/health > /dev/null; then
        log_error "API health check failed!"
        return 1
    fi

    # Check frontend
    if ! curl -f -s -I http://localhost:3000 > /dev/null; then
        log_error "Frontend health check failed!"
        return 1
    fi

    log_success "All health checks passed!"
    return 0
}

# Post-deployment information
post_deployment_info() {
    echo
    log_success "🚀 Deployment completed successfully!"
    echo
    echo "📊 Service URLs:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • API: http://localhost:8000"
    echo "  • API Docs: http://localhost:8000/docs"
    echo "  • Health Check: http://localhost:8000/health"
    echo
    echo "📈 Monitoring:"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • Grafana: http://localhost:3001 (admin/admin)"
    echo "  • Kibana: http://localhost:5601"
    echo
    echo "🔧 Management Commands:"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Stop services: docker-compose down"
    echo "  • Restart: docker-compose restart"
    echo "  • Update: ./deploy.sh"
    echo
    echo "💾 Backup location: $BACKUP_DIR"
    echo
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous deployment..."

    if [ -d "$BACKUP_DIR" ]; then
        # Restore configuration files
        cp "$BACKUP_DIR/.env.backup" .env 2>/dev/null || true
        cp "$BACKUP_DIR/docker-compose.yml.backup" docker-compose.yml 2>/dev/null || true

        # Restore database if backup exists
        if [ -f "$BACKUP_DIR/database_backup.sql" ]; then
            log_info "Restoring database..."
            docker exec -i ${PROJECT_NAME}_db_1 psql -U postgres hedge_fund_db < "$BACKUP_DIR/database_backup.sql" 2>/dev/null || true
        fi

        log_success "Rollback completed!"
    else
        log_error "No backup found for rollback!"
        exit 1
    fi
}

# Main deployment flow
main() {
    echo "🏛️  Hedge Fund Trading Platform - Production Deployment"
    echo "=================================================="
    echo

    case "${2:-deploy}" in
        "deploy")
            pre_deployment_checks
            create_backup
            deploy
            ;;
        "rollback")
            rollback
            ;;
        "health")
            health_check
            ;;
        *)
            echo "Usage: $0 [environment] [command]"
            echo "Commands: deploy (default), rollback, health"
            echo "Environments: production (default), staging, development"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
