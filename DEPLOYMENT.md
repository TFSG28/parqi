# Deployment Guide

## Docker Deployment

### Prerequisites
- Docker
- Docker Compose

### Quick Start

1. Clone the repository
2. Configure environment variables
3. Run with Docker Compose

```bash
docker-compose up -d
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- MySQL: localhost:3306

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs -f
```

---

## Manual Deployment

### Backend Deployment

#### 1. Prepare Server
```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt-get install mysql-server
```

#### 2. Setup Application
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with production values
npm run build
npm run db-update
```

#### 3. Start with PM2
```bash
npm install -g pm2
pm2 start dist/index.js --name backend
pm2 save
pm2 startup
```

#### 4. Configure Nginx
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Frontend Deployment

#### 1. Build Application
```bash
cd frontend
npm install
npm run build
```

#### 2. Start with PM2
```bash
pm2 start npm --name frontend -- start
pm2 save
```

#### 3. Configure Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Cloud Deployment

### Vercel (Frontend)

1. Install Vercel CLI
```bash
npm i -g vercel
```

2. Deploy
```bash
cd frontend
vercel
```

3. Set environment variables in Vercel dashboard

### Railway (Backend)

1. Create account at railway.app
2. Create new project
3. Connect GitHub repository
4. Add MySQL database
5. Set environment variables
6. Deploy

### AWS EC2

#### Backend
1. Launch EC2 instance (Ubuntu 22.04)
2. Install Node.js and MySQL
3. Clone repository
4. Setup as described in Manual Deployment
5. Configure security groups (ports 80, 443, 3001)

#### Frontend
1. Build static files: `npm run build`
2. Upload to S3
3. Configure CloudFront
4. Set custom domain

---

## Environment Variables

### Production Backend (.env)
```env
DATABASE_URL="mysql://user:password@host:3306/database"
JWT_SECRET="generate-strong-secret-key"
FRONT_URL="https://yourdomain.com"
PORT=3001
NODE_ENV=production
```

### Production Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
```

---

## SSL/HTTPS Setup

### Using Certbot (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
```

Auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## Database Backup

### Automated Backup Script

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="perfect_template"
DB_USER="user"
DB_PASS="password"

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

---

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
pm2 status
```

### Health Checks
```bash
# Backend
curl http://localhost:3001/health

# Frontend
curl http://localhost:3000
```

---

## Scaling

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy)
- Multiple backend instances
- Shared database
- External session/cache store if needed (e.g. Redis)

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Add caching layer
- Use CDN for static assets

---

## Rollback

### PM2
```bash
pm2 stop backend
pm2 delete backend
# Deploy previous version
pm2 start dist/index.js --name backend
```

### Docker
```bash
docker-compose down
# Checkout previous version
git checkout <previous-commit>
docker-compose up -d
```

---

## Troubleshooting

### Backend Not Starting
1. Check logs: `pm2 logs backend`
2. Verify environment variables
3. Check database connection
4. Verify port availability

### Database Connection Issues
1. Check DATABASE_URL
2. Verify MySQL is running
3. Check firewall rules
4. Test connection: `mysql -u user -p`

### Frontend Build Errors
1. Clear cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check environment variables
4. Verify API URL is accessible
