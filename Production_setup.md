# Production Setup Guide (Rootful Docker)

This guide covers production deployment using rootful Docker (standard Docker with sudo/root access).

## 🚀 Server Requirements

### Minimum Specifications
- **OS**: Ubuntu 22.04 LTS / Debian 12 (recommended)
- **CPU**: 2 cores (4 cores recommended)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 40GB SSD
- **Network**: Static IP address
- **Domain**: Configured with DNS A records

### Firewall Configuration
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## 📦 Installation Steps

### 1. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    curl \
    git \
    wget \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker (rootful)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# Verify Docker installation
sudo docker --version
sudo docker compose version

# Install certbot for SSL
sudo apt install -y certbot

# Optional: Install monitoring tools
sudo apt install -y htop iotop ncdu
```

### 2. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/scanner
sudo chown $USER:$USER /opt/scanner
cd /opt/scanner

# Clone repository
git clone <your-repository-url> .

# Or if using SSH
git clone git@github.com:yourusername/scanner.git .
```

### 3. Environment Configuration

```bash
# Copy production environment template
cp .env.production .env

# Generate secure passwords and secrets
# For AUTH_SECRET (32 characters minimum)
openssl rand -base64 32

# For POSTGRES_PASSWORD
openssl rand -base64 24

# Edit environment file
nano .env
```

**Required Configuration (.env):**
```bash
# Database Configuration
POSTGRES_USER=scanner_prod
POSTGRES_PASSWORD=<generated-secure-password>
POSTGRES_DB=scanner_production

# Redis Configuration
REDIS_URL=redis://redis:6379

# Scanner API Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Next.js Configuration
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
SCANNER_API_URL=http://scanner:8000

# Database URL (use same password as POSTGRES_PASSWORD)
DATABASE_URL=postgresql://scanner_prod:<same-password>@db:5432/scanner_production

# Authentication (use generated secret)
AUTH_SECRET=<generated-32-char-secret>

# Application
APP_NAME=Zeramos Scanner

# Optional: GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### 4. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Stop any service on port 80
sudo systemctl stop nginx apache2 2>/dev/null

# Request certificate
sudo certbot certonly --standalone \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --email your-email@domain.com \
    --agree-tos \
    --no-eff-email

# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set proper permissions
sudo chown -R $USER:$USER nginx/ssl/
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

#### Option B: Self-Signed (Development/Testing)

```bash
mkdir -p nginx/ssl
cd nginx/ssl

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout privkey.pem \
    -out fullchain.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"

sudo chown $USER:$USER *.pem
chmod 644 fullchain.pem
chmod 600 privkey.pem

cd ../..
```

### 5. Nginx Configuration

```bash
# Update nginx configuration with your domain
nano nginx/nginx.conf

# Find and replace all instances of 'yourdomain.com' with your actual domain
# Save and exit (Ctrl+X, Y, Enter)
```

### 6. Build and Deploy

```bash
# Navigate to docker directory
cd /opt/scanner

# Build production images
sudo docker compose -f docker/docker-compose.prod.yml build

# Start all services
sudo docker compose -f docker/docker-compose.prod.yml up -d

# Check service status
sudo docker compose -f docker/docker-compose.prod.yml ps

# View logs
sudo docker compose -f docker/docker-compose.prod.yml logs -f
```

### 7. Database Initialization

```bash
# Wait for all services to be healthy (30-60 seconds)
watch -n 2 'sudo docker compose -f docker/docker-compose.prod.yml ps'

# Run database migrations
sudo docker compose -f docker/docker-compose.prod.yml exec web pnpm run db:migrate

# Verify database tables
sudo docker compose -f docker/docker-compose.prod.yml exec db \
    psql -U scanner_prod scanner_production -c "\dt"
```

### 8. Verification

```bash
# Test internal health checks
sudo docker compose -f docker/docker-compose.prod.yml exec web curl http://localhost:3000/api/health
sudo docker compose -f docker/docker-compose.prod.yml exec scanner curl http://localhost:8000/health

# Test external access (from your local machine)
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health
curl https://yourdomain.com/api/scanner/health

# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com </dev/null

# Check Docker resource usage
sudo docker stats
```

---

## 🔄 SSL Auto-Renewal Setup

### Create Renewal Script

```bash
# Create renewal hook script
sudo tee /opt/scanner/renew-ssl.sh << 'EOF'
#!/bin/bash

# Renew certificate
certbot renew --quiet

# Copy new certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/scanner/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/scanner/nginx/ssl/

# Set permissions
chown $USER:$USER /opt/scanner/nginx/ssl/*.pem
chmod 644 /opt/scanner/nginx/ssl/fullchain.pem
chmod 600 /opt/scanner/nginx/ssl/privkey.pem

# Reload nginx
cd /opt/scanner
docker compose -f docker/docker-compose.prod.yml restart nginx

# Log completion
echo "SSL certificate renewed: $(date)" >> /var/log/ssl-renewal.log
EOF

# Make executable
sudo chmod +x /opt/scanner/renew-ssl.sh

# Test renewal (dry run)
sudo /opt/scanner/renew-ssl.sh
```

### Setup Automated Renewal (Cron)

```bash
# Add to root crontab
sudo crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /opt/scanner/renew-ssl.sh

# Or add to Let's Encrypt renewal hooks
sudo tee /etc/letsencrypt/renewal-hooks/post/reload-scanner.sh << 'EOF'
#!/bin/bash
/opt/scanner/renew-ssl.sh
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-scanner.sh
```

---

## 📊 Monitoring Setup

### Health Check Script

```bash
# Create health check script
sudo tee /opt/scanner/health-check.sh << 'EOF'
#!/bin/bash

COMPOSE_FILE="/opt/scanner/docker/docker-compose.prod.yml"
LOG_FILE="/var/log/scanner-health.log"

echo "=== Health Check: $(date) ===" >> $LOG_FILE

# Check all services
services=("db" "redis" "scanner" "web" "nginx")

for service in "${services[@]}"; do
    status=$(docker compose -f $COMPOSE_FILE ps $service --format json 2>/dev/null | jq -r '.[0].Health // .[0].State')
    echo "$service: $status" >> $LOG_FILE
    
    if [ "$status" != "healthy" ] && [ "$status" != "running" ]; then
        echo "WARNING: $service is $status" | tee -a $LOG_FILE
        # Optional: Send alert (email, Slack, etc.)
        # You can add notification logic here
    fi
done

# Check disk space
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 80 ]; then
    echo "WARNING: Disk usage is ${disk_usage}%" | tee -a $LOG_FILE
fi

# Check memory usage
memory_usage=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d. -f1)
if [ $memory_usage -gt 85 ]; then
    echo "WARNING: Memory usage is ${memory_usage}%" | tee -a $LOG_FILE
fi

echo "" >> $LOG_FILE
EOF

sudo chmod +x /opt/scanner/health-check.sh

# Add to crontab (runs every 5 minutes)
(sudo crontab -l 2>/dev/null; echo "*/5 * * * * /opt/scanner/health-check.sh") | sudo crontab -
```

### Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/scanner << 'EOF'
/var/log/scanner-health.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}

/var/log/ssl-renewal.log {
    monthly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF
```

---

## 💾 Backup Setup

### Automated Database Backups

```bash
# Create backup directory
sudo mkdir -p /opt/backups/scanner
sudo chown $USER:$USER /opt/backups/scanner

# Create backup script
sudo tee /opt/scanner/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/scanner"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_FILE="/opt/scanner/docker/docker-compose.prod.yml"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
echo "Starting database backup: $DATE"
docker compose -f $COMPOSE_FILE exec -T db \
    pg_dump -U scanner_prod scanner_production \
    > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Backup Redis (if needed for cache recovery)
docker compose -f $COMPOSE_FILE exec -T redis redis-cli SAVE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

# Log completion
echo "Backup completed: $DATE"
echo "Backup size: $(du -h $BACKUP_DIR/db_backup_$DATE.sql.gz | cut -f1)"
EOF

sudo chmod +x /opt/scanner/backup.sh

# Add to crontab (runs daily at 3 AM)
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /opt/scanner/backup.sh >> /var/log/scanner-backup.log 2>&1") | sudo crontab -

# Test backup
sudo /opt/scanner/backup.sh
```

### Restore from Backup

```bash
# List available backups
ls -lh /opt/backups/scanner/

# Stop services
sudo docker compose -f /opt/scanner/docker/docker-compose.prod.yml stop web scanner

# Restore database
gunzip -c /opt/backups/scanner/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
    sudo docker compose -f /opt/scanner/docker/docker-compose.prod.yml exec -T db \
    psql -U scanner_prod scanner_production

# Restart services
sudo docker compose -f /opt/scanner/docker/docker-compose.prod.yml start web scanner
```

---

## 🔧 Maintenance Commands

### Update Application

```bash
cd /opt/scanner

# Pull latest changes
git pull origin main

# Rebuild and restart services
sudo docker compose -f docker/docker-compose.prod.yml up -d --build

# Run migrations if needed
sudo docker compose -f docker/docker-compose.prod.yml exec web pnpm run db:migrate

# Check logs
sudo docker compose -f docker/docker-compose.prod.yml logs -f --tail=100
```

### View Logs

```bash
# All services
sudo docker compose -f docker/docker-compose.prod.yml logs -f

# Specific service
sudo docker compose -f docker/docker-compose.prod.yml logs -f web
sudo docker compose -f docker/docker-compose.prod.yml logs -f scanner
sudo docker compose -f docker/docker-compose.prod.yml logs -f nginx

# Last 100 lines
sudo docker compose -f docker/docker-compose.prod.yml logs --tail=100
```

### Restart Services

```bash
# All services
sudo docker compose -f docker/docker-compose.prod.yml restart

# Specific service
sudo docker compose -f docker/docker-compose.prod.yml restart web
sudo docker compose -f docker/docker-compose.prod.yml restart scanner
```

### Clean Up Resources

```bash
# Remove unused images
sudo docker image prune -a

# Remove unused volumes (CAREFUL!)
sudo docker volume prune

# Remove unused networks
sudo docker network prune

# Full cleanup (CAREFUL!)
sudo docker system prune -a
```

---

## 🚨 Troubleshooting

### Services Won't Start

```bash
# Check logs
sudo docker compose -f docker/docker-compose.prod.yml logs

# Check disk space
df -h

# Check memory
free -h

# Restart Docker daemon
sudo systemctl restart docker

# Rebuild from scratch
sudo docker compose -f docker/docker-compose.prod.yml down
sudo docker compose -f docker/docker-compose.prod.yml up -d --build
```

### Database Connection Issues

```bash
# Check database is running
sudo docker compose -f docker/docker-compose.prod.yml ps db

# Connect to database
sudo docker compose -f docker/docker-compose.prod.yml exec db \
    psql -U scanner_prod scanner_production

# Check logs
sudo docker compose -f docker/docker-compose.prod.yml logs db

# Restart database
sudo docker compose -f docker/docker-compose.prod.yml restart db
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# Renew certificate manually
sudo certbot renew --force-renewal

# Copy new certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Restart nginx
sudo docker compose -f docker/docker-compose.prod.yml restart nginx
```

### Performance Issues

```bash
# Check resource usage
sudo docker stats

# Check system resources
htop

# Check disk I/O
sudo iotop

# Increase Docker resources if needed
# Edit /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json
```

**Example daemon.json:**
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
```

```bash
# Restart Docker daemon
sudo systemctl restart docker
```

---

## 📈 Scaling

### Horizontal Scaling (Multiple Instances)

```bash
# Scale scanner service (3 instances)
sudo docker compose -f docker/docker-compose.prod.yml up -d --scale scanner=3

# Scale web service (2 instances)
sudo docker compose -f docker/docker-compose.prod.yml up -d --scale web=2

# Note: This requires updating nginx configuration to load balance
```

### Vertical Scaling (More Resources)

Edit `docker/docker-compose.prod.yml` to increase resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'      # Increased from 2
      memory: 4G     # Increased from 2G
```

---

## 🔐 Security Hardening

### Docker Security

```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Scan images for vulnerabilities
sudo docker scan scanner_api_prod
sudo docker scan scanner_web_prod

# Use read-only root filesystem where possible
# Add to docker-compose.prod.yml:
# read_only: true
```

### System Security

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Harden SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

---

## 📞 Support & Monitoring

### System Email Alerts (Optional)

```bash
# Install mailutils
sudo apt install mailutils

# Configure postfix for sending emails
sudo dpkg-reconfigure postfix

# Test email
echo "Test email from scanner server" | mail -s "Test" your-email@domain.com
```

### Monitoring with Portainer (Optional)

```bash
# Install Portainer
sudo docker volume create portainer_data
sudo docker run -d \
    -p 9443:9443 \
    --name portainer \
    --restart=always \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data \
    portainer/portainer-ce:latest

# Access at: https://your-server-ip:9443
```

---

## ✅ Production Checklist

Before going live:

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Environment variables properly configured
- [ ] Database backups scheduled
- [ ] Health monitoring enabled
- [ ] Log rotation configured
- [ ] Firewall rules applied
- [ ] Domain DNS configured
- [ ] Services health checked
- [ ] Performance tested
- [ ] Security hardening applied
- [ ] Documentation updated
- [ ] Team access configured
- [ ] Monitoring alerts set up

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)