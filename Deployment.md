# Zeramos Scanner - Deployment Guide

## Table of Contents
1. [Development Setup](#development-setup)
2. [Production Deployment](#production-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Database Migrations](#database-migrations)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ with pnpm
- Git
- Rootless Docker configured (already set up)

### Quick Start

1. **Clone and setup environment**
```bash
# Clone repository
git clone <your-repo-url>
cd cyber-scanner-monorepo

# Run rootless setup
bash docker/rootless-setup.sh

# Copy environment files
cp .env.example .env
cp apps/web/.env.local apps/web/.env.local

# Install web dependencies
cd apps/web && pnpm install
```

2. **Start Docker services**
```bash
# From root directory
npm run docker:up

# Verify services are running
npm run check:all
```

3. **Initialize database**
```bash
# Generate Drizzle schema
npm run db:generate

# Push schema to database
npm run db:push
```

4. **Start Next.js development server**
```bash
# In a new terminal
npm run web:dev
```

5. **Access the application**
- Web UI: http://localhost:3000
- Scanner API: http://localhost:8000/docs
- Database: localhost:5432
- Redis: localhost:6379

### Development Workflow

**File changes auto-reload:**
- Scanner API: Hot-reloads via uvicorn --reload
- Next.js: Hot-reloads via next dev
- Database schema: Run `npm run db:push` after changes

**Viewing logs:**
```bash
npm run docker:logs
# or for specific service
docker compose -f docker/docker-compose.dev.yml logs -f scanner
```

---

## Production Deployment

### Server Requirements
- Ubuntu 22.04+ / Debian 12+ (recommended)
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ disk space
- Domain name with DNS configured
- Firewall: Allow ports 80, 443

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install certbot for SSL
sudo apt install certbot -y
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone <your-repo-url>
cd cyber-scanner-monorepo

# Create production environment
cp .env.production .env

# Edit with production values
nano .env
```

**Required environment variables:**
```bash
POSTGRES_USER=scanner_prod
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=scanner_production
REDIS_URL=redis://redis:6379
ALLOWED_ORIGINS=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
SCANNER_API_URL=http://scanner:8000
DATABASE_URL=postgresql://scanner_prod:<password>@db:5432/scanner_production
AUTH_SECRET=<generate-32-char-random-string>
APP_NAME=Zeramos Scanner
```

### Step 3: SSL Certificate Setup

```bash
# Stop any service on port 80
sudo systemctl stop nginx apache2 2>/dev/null

# Generate Let's Encrypt certificate
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --agree-tos \
  -m your-email@domain.com

# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set permissions
sudo chown -R $USER:$USER nginx/ssl/
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### Step 4: Update Nginx Configuration

```bash
# Edit nginx config
nano nginx/nginx.conf

# Replace 'yourdomain.com' with your actual domain
# Save and exit
```

### Step 5: Build and Deploy

```bash
# Build production images
docker compose -f docker/docker-compose.prod.yml build

# Start services
docker compose -f docker/docker-compose.prod.yml up -d

# Check services are running
docker compose -f docker/docker-compose.prod.yml ps

# View logs
docker compose -f docker/docker-compose.prod.yml logs -f
```

### Step 6: Database Initialization

```bash
# Run migrations
docker compose -f docker/docker-compose.prod.yml exec web pnpm run db:migrate

# Verify database
docker compose -f docker/docker-compose.prod.yml exec db psql -U scanner_prod scanner_production -c "\dt"
```

### Step 7: Verify Deployment

```bash
# Test health endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health
curl https://yourdomain.com/api/scanner/health

# Test SSL
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

---

## Environment Configuration

### Development (.env.local)
```bash
DATABASE_URL=postgresql://scanner:dev_password@localhost:5432/scanner
REDIS_URL=redis://localhost:6379
SCANNER_API_URL=http://localhost:8000
AUTH_SECRET=dev_secret_key_change_in_production
NEXT_PUBLIC_BASE_URL=http://localhost:3000
APP_NAME=Zeramos Scanner
NODE_ENV=development
```

### Production (.env)
```bash
# Database
POSTGRES_USER=scanner_prod
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=scanner_production
DATABASE_URL=postgresql://scanner_prod:<password>@db:5432/scanner_production

# Redis
REDIS_URL=redis://redis:6379

# API
ALLOWED_ORIGINS=https://yourdomain.com
SCANNER_API_URL=http://scanner:8000

# Next.js
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Auth
AUTH_SECRET=<32-char-random-string>

# Optional: OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Application
APP_NAME=Zeramos Scanner
```

---

## Database Migrations

### Create Migration
```bash
# Development
npm run db:generate

# This creates a migration file in drizzle/ directory
```

### Apply Migration
```bash
# Development
npm run db:push

# Production
docker compose -f docker/docker-compose.prod.yml exec web pnpm run db:migrate
```

### Rollback
```bash
# Manually connect to database
docker compose -f docker/docker-compose.prod.yml exec db psql -U scanner_prod scanner_production

# Run rollback SQL manually
```

---

## Monitoring

### View Real-time Logs
```bash
# All services
docker compose -f docker/docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker/docker-compose.prod.yml logs -f web
```

### Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df
df -h
```

### Health Checks
```bash
# Automated health monitoring script
cat > health-check.sh << 'EOF'
#!/bin/bash
services=("web" "scanner" "db" "redis" "nginx")
for service in "${services[@]}"; do
  status=$(docker compose -f docker/docker-compose.prod.yml ps $service --format json | jq -r '.[0].Health')
  echo "$service: $status"
done
EOF

chmod +x health-check.sh
./health-check.sh
```

### Setup Monitoring Alerts
```bash
# Create systemd service for health checks
sudo tee /etc/systemd/system/scanner-health.service << EOF
[Unit]
Description=Scanner Health Check
After=docker.service

[Service]
Type=oneshot
ExecStart=/path/to/health-check.sh
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# Create timer
sudo tee /etc/systemd/system/scanner-health.timer << EOF
[Unit]
Description=Run Scanner Health Check every 5 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

# Enable and start
sudo systemctl enable scanner-health.timer
sudo systemctl start scanner-health.timer
```

---

## Troubleshooting

### Common Issues

#### 1. Services not starting
```bash
# Check logs
docker compose -f docker/docker-compose.prod.yml logs

# Check disk space
df -h

# Restart services
docker compose -f docker/docker-compose.prod.yml restart
```

#### 2. Database connection issues
```bash
# Check database is running
docker compose -f docker/docker-compose.prod.yml ps db

# Test connection
docker compose -f docker/docker-compose.prod.yml exec db psql -U scanner_prod scanner_production

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

#### 3. SSL certificate errors
```bash
# Renew certificate
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Restart nginx
docker compose -f docker/docker-compose.prod.yml restart nginx
```

#### 4. Out of memory
```bash
# Check memory usage
free -h
docker stats

# Restart services
docker compose -f docker/docker-compose.prod.yml restart

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 5. Port conflicts
```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting services
sudo systemctl stop nginx apache2
```

### Emergency Procedures

#### Complete Reset (Nuclear Option)
```bash
# ⚠️ WARNING: This deletes ALL data
docker compose -f docker/docker-compose.prod.yml down -v
docker system prune -a -f
rm -rf docker/postgres_data docker/redis_data
docker compose -f docker/docker-compose.prod.yml up -d --build
```

#### Restore from Backup
```bash
# Stop services
docker compose -f docker/docker-compose.prod.yml stop web scanner

# Restore database
cat backups/db_backup.sql | docker compose -f docker/docker-compose.prod.yml exec -T db psql -U scanner_prod scanner_production

# Start services
docker compose -f docker/docker-compose.prod.yml start
```

---

## Auto-renewal Setup (SSL)

```bash
# Create renewal hook
sudo tee /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh << 'EOF'
#!/bin/bash
cd /path/to/cyber-scanner-monorepo
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
docker compose -f docker-compose.prod.yml restart nginx
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh

# Test renewal
sudo certbot renew --dry-run
```

---

## Performance Tuning

### PostgreSQL Optimization
```bash
# Edit postgresql.conf in container
docker compose -f docker/docker-compose.prod.yml exec db vi /var/lib/postgresql/data/postgresql.conf

# Recommended settings for 4GB RAM:
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
work_mem = 16MB
```

### Redis Optimization
Already configured in docker-compose.prod.yml with:
- maxmemory: 512MB
- maxmemory-policy: allkeys-lru

### Nginx Caching
Nginx config includes:
- Gzip compression
- Static file caching (1 year)
- Rate limiting
- Keep-alive connections

---

## Backup Strategy

### Automated Daily Backups
```bash
# Create backup script
cat > /opt/scanner-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/scanner"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker compose -f /path/to/docker-compose.prod.yml exec -T db \
  pg_dump -U scanner_prod scanner_production > $BACKUP_DIR/db_$DATE.sql

# Backup redis
docker compose -f /path/to/docker-compose.prod.yml exec -T redis \
  redis-cli BGSAVE

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/scanner-backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/scanner-backup.sh") | crontab -
```