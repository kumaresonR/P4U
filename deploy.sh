#!/bin/bash
set -e

# ============================================
#  Planext4U — Production Deployment Script
#  Run this on your Hostinger VPS
# ============================================

DOMAIN="planext4u.com"
PROJECT_DIR="/opt/planext4u"
REPO_URL="https://github.com/YOUR_USERNAME/planext4u.git"  # <-- Change this

echo "=========================================="
echo "  Planext4U Production Deployment"
echo "=========================================="

# ── Step 1: System Setup ──
echo ""
echo "[1/8] Installing system dependencies..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# ── Step 2: Install Docker ──
echo ""
echo "[2/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes."
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    sudo apt install -y docker-compose-plugin
fi

# ── Step 3: Install Node.js (for building frontend) ──
echo ""
echo "[3/8] Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# ── Step 4: Firewall Setup ──
echo ""
echo "[4/8] Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# ── Step 5: Clone/Pull Project ──
echo ""
echo "[5/8] Setting up project..."
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    git pull origin main
else
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:$USER "$PROJECT_DIR"
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# ── Step 6: Build Frontend ──
echo ""
echo "[6/8] Building frontend..."
cd "$PROJECT_DIR/planext4u"
npm ci
VITE_API_URL="https://${DOMAIN}/api/v1" npm run build
cd "$PROJECT_DIR"

# ── Step 7: SSL Certificate (first time only) ──
echo ""
echo "[7/8] Setting up SSL..."
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    echo "Obtaining SSL certificate..."
    # Start nginx temporarily without SSL for the challenge
    docker compose -f docker-compose.prod.yml up -d nginx
    docker compose -f docker-compose.prod.yml run --rm certbot \
        certbot certonly --webroot \
        --webroot-path=/var/www/certbot \
        --email admin@${DOMAIN} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN} \
        -d www.${DOMAIN}
    docker compose -f docker-compose.prod.yml down
fi

# ── Step 8: Deploy Everything ──
echo ""
echo "[8/8] Starting all services..."
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo ""
echo "Waiting for services to start..."
sleep 10

# ── Run Database Migrations ──
echo ""
echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Frontend:  https://${DOMAIN}"
echo "  API:       https://${DOMAIN}/api/v1"
echo "  Database:  PostgreSQL on localhost:5432"
echo "  Redis:     Redis on localhost:6379"
echo ""
echo "  Useful commands:"
echo "    docker compose -f docker-compose.prod.yml logs -f        # View logs"
echo "    docker compose -f docker-compose.prod.yml ps             # Service status"
echo "    docker compose -f docker-compose.prod.yml exec app sh    # Shell into backend"
echo "    docker compose -f docker-compose.prod.yml down           # Stop everything"
echo "    docker compose -f docker-compose.prod.yml up -d --build  # Rebuild & restart"
echo ""
