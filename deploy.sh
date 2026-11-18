#!/bin/bash

# VivasAI Deployment Script
# This script deploys the application from the local machine to the Hetzner server

SERVER_IP="178.104.164.176"
SERVER_USER="root"
DOMAIN="vivasdemo.vikramafoods.com"
REMOTE_DIR="/var/www/vivasai"

echo "========================================"
echo "🚀 Starting Deployment to $SERVER_IP..."
echo "========================================"

# Step 1: Create the remote directory if it doesn't exist
echo "📁 Ensuring remote directory exists..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_DIR"

# Step 2: Sync files using rsync
echo "🔄 Transferring files to server..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' --exclude '.env' --exclude 'backend/uploads/crop_health/imported' ./ $SERVER_USER@$SERVER_IP:$REMOTE_DIR

# Step 3: Remote Server Setup
echo "⚙️ Setting up dependencies on the server..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
  # Update and install dependencies
  apt update && apt install -y curl git nginx

  # Install Node.js (v20)
  if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  fi

  # Install PM2
  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
  fi

  # Setup Backend
  echo "📦 Setting up Backend..."
  cd /var/www/vivasai/backend
  npm install
  # Start or restart PM2 process
  PORT=5005 pm2 restart vivasai-backend || PORT=5005 pm2 start server.js --name "vivasai-backend"
  pm2 save

  # Setup Frontend
  echo "🎨 Setting up Frontend..."
  cd /var/www/vivasai/frontend
  npm install
  npm run build

  # Configure Nginx
  echo "🌐 Configuring Nginx..."
  cat > /etc/nginx/sites-available/vivasdemo.vikramafoods.com << 'NGINX_CONF'
server {
    listen 80;
    server_name vivasdemo.vikramafoods.com;
    client_max_body_size 50M;

    location / {
        root /var/www/vivasai/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /uploads/ {
        alias /var/www/vivasai/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /api/ {
        proxy_pass http://localhost:5005;
        client_max_body_size 50M;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_CONF

  ln -sf /etc/nginx/sites-available/vivasdemo.vikramafoods.com /etc/nginx/sites-enabled/
  nginx -t && systemctl restart nginx

  # Setup SSL with Certbot
  echo "🔒 Setting up SSL..."
  apt install -y certbot python3-certbot-nginx
  certbot --nginx -d vivasdemo.vikramafoods.com --non-interactive --agree-tos -m admin@vikramafoods.com
EOF

echo "========================================"
echo "✅ Deployment Complete!"
echo "🌐 Your app should be live at: https://$DOMAIN"
echo "========================================"
