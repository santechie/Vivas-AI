# VivasAI Deployment Guide

This project can be automatically deployed from your local machine to your Hetzner server (`178.104.164.176`) hosting the domain `vivasdemo.vikramafoods.com`.

## Prerequisites

- SSH Key access to your Hetzner server (`root@178.104.164.176`) from your local machine.
- Your `.env` file should be configured properly on the remote server (the deploy script excludes `.env` to prevent overwriting production credentials).

## Automated Deployment Process

We have included a `deploy.sh` script in the root of the project that automates the entire process:
1. **Syncing files** to the server using `rsync`.
2. **Installing server dependencies** (Node.js, Nginx, PM2).
3. **Building the frontend** (Vite).
4. **Setting up the backend** (Node.js/Express with PM2).
5. **Configuring Nginx & SSL** (Certbot for Let's Encrypt).

### How to run the deployment

Open your local terminal in the project root and simply execute:

```bash
./deploy.sh
```

That's it! The script will output the progress and let you know once your application is live at `https://vivasdemo.vikramafoods.com`.

## Manual Server Management

If you ever need to SSH into the server to check logs or manage PM2 manually:

```bash
ssh root@178.104.164.176
```

**Check Backend Logs:**
```bash
pm2 logs vivasai-backend
```

**Restart Backend:**
```bash
pm2 restart vivasai-backend
```

**Nginx Configuration File:**
Located at `/etc/nginx/sites-available/vivasdemo.vikramafoods.com`
