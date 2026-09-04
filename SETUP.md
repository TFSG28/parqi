# Setup Guide

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# DB VARS
DATABASE_URL="mysql://user:password@localhost:3306/database_name"
DATABASE_USER="user"
DATABASE_PASSWORD="password"
DATABASE_NAME="database_name"
DATABASE_HOST="localhost"
DATABASE_PORT=3306

# APP VARS
JWT_SECRET="your-super-secret-jwt-key-change-this-min-64-chars"
ENCRYPTION_KEY="your-encryption-key-32-bytes-hex-format"

# EMAIL
IP_SERVER="localhost"
EMAIL="your-email@example.com"
EMAIL_PASS="your-email-password"

# Domain
FRONT_URL="http://localhost:3000"
```

Generate Prisma client and push schema:
```bash
npm run db-update
```

Start development server:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.development
```

Start development server:
```bash
npm run dev
```

## Creating a New Module

Follow Clean Architecture structure:

```
modules/
└── [feature-name]/
    ├── application/
    │   ├── dtos/
    │   │   └── Create[Feature].dto.ts
    │   └── usecases/
    │       └── Create[Feature].usecase.ts
    ├── domain/
    │   ├── entities/
    │   │   └── [Feature].entity.ts
    │   ├── errors/
    │   │   └── [Feature]NotFound.error.ts
    │   └── repositories/
    │       └── I[Feature].repository.ts
    ├── infrastructure/
    │   └── repositories/
    │       └── [Feature].repository.ts
    └── presentation/
        ├── controllers/
        │   └── [feature].controller.ts
        └── routes/
            └── [feature].routes.ts
```

### Steps:

1. Create domain layer (entities, interfaces, errors)
2. Create application layer (DTOs, use cases)
3. Create infrastructure layer (repository implementations)
4. Create presentation layer (controllers, routes)
5. Register in DI container (`shared/container/container.ts`)
6. Add tokens (`shared/container/tokens.ts`)
7. Register routes (`shared/routes/index.ts`)

## Database Migrations

After modifying `prisma/schema.prisma`:

```bash
npm run db-update
```

## Production Build

### Backend
```bash
npm run build
npm start
```

### Frontend
```bash
npm run build
npm start
```

## Environment Variables

### Backend (.env)
- `DATABASE_URL` - MySQL connection string
- `DATABASE_USER` - Database user
- `DATABASE_PASSWORD` - Database password
- `DATABASE_NAME` - Database name
- `DATABASE_HOST` - Database host
- `DATABASE_PORT` - Database port
- `JWT_SECRET` - Secret for JWT tokens (min 64 chars)
- `ENCRYPTION_KEY` - AES-256 encryption key (32 bytes hex)
- `IP_SERVER` - Server IP address
- `EMAIL` - Email for notifications
- `EMAIL_PASS` - Email password
- `FRONT_URL` - Frontend URL for CORS

### Frontend (.env.development)
- `NEXT_PUBLIC_API_URL` - Backend API URL

### Mobile (.env)
Vars `EXPO_PUBLIC_*` são embutidas no bundle em build-time.
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_MAP_PROVIDER` - `osm` | `google` | `mapbox` (default `mapbox`)
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` - Token Mapbox (provider `mapbox`)
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps SDK (provider `google`)
- `EXPO_PUBLIC_CARTO_API_KEY` - API key CARTO para tiles dark/light do mapa OSM
  (grátis até 5M pedidos/mês: carto.com/basemaps/apikey; vai na URL como `?key=`;
  sem key os tiles mostram o watermark "API key required")
- `EXPO_PUBLIC_PROJECT_ID` - Expo project ID (notificações)
