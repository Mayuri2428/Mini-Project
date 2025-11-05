#!/bin/bash

# AttendanceMS Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting AttendanceMS Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
LOG_FILE="./logs/deployment.log"
HEALTH_CHECK_URL="http://localhost:3000/health"
MAX_RETRIES=30
RETRY_INTERVAL=2

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    echo "[ERROR] $1" >> "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
    echo "[INFO] $1" >> "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if required files exist
    if [ ! -f ".env" ]; then
        error ".env file not found. Please copy .env.example to .env and configure it."
    fi
    
    if [ ! -f "package.json" ]; then
        error "package.json not found. Are you in the correct directory?"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        error "Node.js version 16 or higher is required. Current version: $(node --version)"
    fi
    
    # Check if Docker is available (for containerized deployment)
    if command -v docker &> /dev/null; then
        info "Docker is available for containerized deployment"
        DOCKER_AVAILABLE=true
    else
        warning "Docker not found. Will proceed with native deployment"
        DOCKER_AVAILABLE=false
    fi
    
    log "Pre-deployment checks completed successfully"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p data
    mkdir -p logs
    mkdir -p backups
    mkdir -p uploads
    
    # Set proper permissions
    chmod 755 data logs backups uploads
    
    log "Directories created successfully"
}

# Install dependencies
install_dependencies() {
    log "Installing production dependencies..."
    
    # Clean install for production
    npm ci --only=production
    
    log "Dependencies installed successfully"
}

# Database setup
setup_database() {
    log "Setting up database..."
    
    # Run database migrations
    if [ -f "scripts/migrate.js" ]; then
        node scripts/migrate.js
    else
        # Fallback to built-in migration
        node -e "
            import { migrate, ensureDefaultTeacher } from './src/db.js';
            migrate().then(() => ensureDefaultTeacher()).then(() => {
                console.log('Database setup completed');
                process.exit(0);
            }).catch(err => {
                console.error('Database setup failed:', err);
                process.exit(1);
            });
        "
    fi
    
    log "Database setup completed"
}

# Create backup before deployment
create_backup() {
    log "Creating backup before deployment..."
    
    if [ -f "data/app.db" ]; then
        BACKUP_FILE="$BACKUP_DIR/pre_deployment_$(date +%Y%m%d_%H%M%S).db"
        cp "data/app.db" "$BACKUP_FILE"
        log "Backup created: $BACKUP_FILE"
    else
        info "No existing database found, skipping backup"
    fi
}

# Start application
start_application() {
    log "Starting AttendanceMS application..."
    
    if [ "$DOCKER_AVAILABLE" = true ] && [ -f "docker-compose.production.yml" ]; then
        # Docker deployment
        log "Starting with Docker Compose..."
        docker-compose -f docker-compose.production.yml up -d
    else
        # Native deployment
        log "Starting with PM2 or native Node.js..."
        
        if command -v pm2 &> /dev/null; then
            # Use PM2 if available
            pm2 start ecosystem.config.js --env production
        else
            # Fallback to native Node.js
            NODE_ENV=production nohup node src/app.js > logs/app.log 2>&1 &
            echo $! > .pid
        fi
    fi
    
    log "Application start command executed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log "Health check passed! Application is running"
            return 0
        fi
        
        retries=$((retries + 1))
        info "Health check attempt $retries/$MAX_RETRIES failed, retrying in ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    done
    
    error "Health check failed after $MAX_RETRIES attempts"
}

# Post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."
    
    # Warm up cache if available
    if curl -f -s "${HEALTH_CHECK_URL%/health}/api/cache/warmup" > /dev/null 2>&1; then
        log "Cache warmed up successfully"
    fi
    
    # Send deployment notification (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚀 AttendanceMS deployed successfully!"}' \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    log "Post-deployment tasks completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    
    # Remove any temporary files
    rm -f .deployment.tmp
    
    log "Cleanup completed"
}

# Main deployment process
main() {
    log "=== AttendanceMS Production Deployment Started ==="
    
    # Ensure log directory exists
    mkdir -p logs
    
    # Run deployment steps
    pre_deployment_checks
    create_directories
    create_backup
    install_dependencies
    setup_database
    start_application
    
    # Wait a moment for application to start
    sleep 5
    
    health_check
    post_deployment
    cleanup
    
    log "=== AttendanceMS Production Deployment Completed Successfully ==="
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}📊 Application URL: http://localhost:3000${NC}"
    echo -e "${BLUE}📚 API Documentation: http://localhost:3000/api-docs${NC}"
    echo -e "${BLUE}🔍 Health Check: http://localhost:3000/health${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Configure your domain and SSL certificate"
    echo "2. Set up monitoring and alerting"
    echo "3. Configure automated backups"
    echo "4. Review security settings"
    echo ""
    echo -e "${BLUE}📖 For more information, see: README.md${NC}"
}

# Handle script interruption
trap cleanup EXIT

# Run main deployment
main "$@"