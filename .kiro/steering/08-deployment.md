---
inclusion: manual
---

# Deploy em Produção

Guia para fazer deploy do template em produção.

## Checklist Pré-Deploy

### Backend
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados configurado
- [ ] Migrations executadas
- [ ] Testes passando
- [ ] Build sem erros
- [ ] CORS configurado
- [ ] Rate limiting ativado
- [ ] Logs configurados
- [ ] HTTPS configurado

### Frontend
- [ ] Variáveis de ambiente configuradas
- [ ] API URL configurada
- [ ] Testes passando
- [ ] Build sem erros
- [ ] SEO configurado
- [ ] Analytics configurado (opcional)

## Variáveis de Ambiente

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT
JWT_SECRET="seu-secret-super-seguro"
JWT_EXPIRES_IN="7d"

# CORS
FRONTEND_URL="https://seu-frontend.com"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha"

# Server
PORT=3001
NODE_ENV="production"
```

### Frontend (.env.production)

```env
NEXT_PUBLIC_API_URL="https://api.seu-backend.com"
```

## Build

### Backend

```bash
cd backend
npm install
npm run test
npm run build
```

### Frontend

```bash
cd frontend
npm install
npm run test
npm run build
```

## Deploy com Docker

### Docker Compose

```bash
# Build e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

### Comandos Docker

```bash
# Build backend
docker build -t backend ./backend

# Build frontend
docker build -t frontend ./frontend

# Run backend
docker run -p 3001:3001 --env-file backend/.env backend

# Run frontend
docker run -p 3000:3000 --env-file frontend/.env.production frontend
```

## Deploy em Serviços Cloud

### Vercel (Frontend)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

### Railway (Backend)

1. Conectar repositório no Railway
2. Configurar variáveis de ambiente
3. Deploy automático

### Render (Backend)

1. Conectar repositório no Render
2. Configurar variáveis de ambiente
3. Build command: `npm install && npm run build`
4. Start command: `npm start`

## Banco de Dados

### Migrations em Produção

```bash
# Aplicar migrations
npx prisma migrate deploy

# Gerar client
npx prisma generate
```

### Backup

```bash
# PostgreSQL
pg_dump -U user -d dbname > backup.sql

# Restaurar
psql -U user -d dbname < backup.sql
```

## Monitoramento

### Logs

```typescript
// Use um serviço de logs
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### Health Check

```typescript
// src/app.ts
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

## SSL/HTTPS

### Let's Encrypt (Certbot)

```bash
# Instalar certbot
sudo apt-get install certbot

# Obter certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Renovar automaticamente
sudo certbot renew --dry-run
```

## Recursos

- Consulte `DEPLOYMENT.md` para guia completo
- Consulte `docker-compose.yml` para configuração Docker
- Consulte `CHECKLIST.md` para checklist completo
