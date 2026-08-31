# API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication

Authentication is cookie-based. On login the server sets an httpOnly `access_token`
cookie (the JWT) plus a readable `csrf_token` cookie. Send requests with
`credentials: 'include'` so the browser attaches the cookies automatically — there
is no `Authorization` header.

For state-changing requests (POST/PUT/PATCH/DELETE) on protected routes, echo the
CSRF token in the `X-CSRF-Token` header (value returned by `/auth/login`):

```
X-CSRF-Token: <csrfToken>
```

All responses use the envelope `{ "status": "success", "data": ... }`.

## Endpoints

### Health Check

#### GET /health
Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

---

### Authentication

#### POST /auth/login
Authenticate a user. Sets the `access_token` (httpOnly) and `csrf_token` cookies.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": { "id": "uuid", "name": "User Name", "email": "user@example.com" },
    "csrfToken": "a1b2c3..."
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Missing required fields

#### GET /auth/me
Return the authenticated user (requires the `access_token` cookie).

**Success Response (200):**
```json
{
  "status": "success",
  "data": { "id": "uuid", "name": "User Name", "email": "user@example.com", "isActive": true }
}
```

#### POST /auth/refresh
Re-issue the `access_token` and `csrf_token` cookies while the session is still
valid. Returns the new `csrfToken`. Responds `401` once the session has expired.

#### POST /auth/logout
Clear the auth cookies. Requires `access_token` cookie + `X-CSRF-Token` header.

#### POST /auth/verify-email
Validate the account with the 6-digit code sent by email (requires auth).

**Request Body:**
```json
{ "code": "123456" }
```

**Success (200):** `{ "emailVerified": true }`

O código é enviado automaticamente no registo (`POST /user`), expira em 15 min,
permite 5 tentativas e pode ser reenviado 1x/minuto. Enquanto o email não está
validado, adicionar/votar/sugerir devolve `403`.

#### POST /auth/resend-code
Re-send the verification code (requires auth; max 1 per minute).

**Success (200):** `{ "resentAt": "...", "waitSeconds": 0 }`
**Error:** `429` com o tempo de espera em segundos.

---

### Users

#### POST /user
Create a new user.

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "name": "User Name",
  "email": "user@example.com",
  "isActive": true,
  "emailVerified": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```
Envia automaticamente o código de verificação por email.

**Error Responses:**
- `400 Bad Request`: User already exists or validation error
- `500 Internal Server Error`: Server error

---

### Parking (Estacionamentos)

Modelo de validação **híbrido**: as contribuições da comunidade são auto-validadas
(coordenadas dentro de Portugal, sem duplicados a < 30 m) e entram como `PENDING`;
os votos da comunidade calculam a confiança (0-10) e fazem a transição de estado.
Quando a confiança é negativa, o estacionamento fica `FLAGGED` e entra na fila de
moderação manual (admin).

Estados: `PENDING`, `APPROVED`, `REJECTED`, `FLAGGED`
Fontes: `COMMUNITY`, `OSM`, `GEOAPIFY`
Tipos: `SURFACE`, `UNDERGROUND`, `MULTI_STORY`, `STREET`, `OTHER`
Lotação: `RANGE_1_5`, `RANGE_6_20`, `RANGE_21_50`, `RANGE_51_100`, `RANGE_100_PLUS`

A vista pública do mapa devolve `APPROVED` + `PENDING` (pendentes aparecem com
badge "em verificação"); `FLAGGED`/`REJECTED` ficam escondidos.

#### GET /parking
Lista estacionamentos. Query params:
- `bbox` (opcional): `minLon,minLat,maxLon,maxLat` (ex.: `-8.35,41.40,-8.25,41.50`)
- `type` (opcional): filtrar por `parkingType`
- `page`, `limit` (default 1 e 20, máximo 100)

**Response:** envelope paginado `{ status, data, pagination }`, cada item com
`latitude`, `longitude`, `trustScore`, `status`, `source`, etc.

#### GET /parking/:id
Detalhe de um estacionamento. Inclui `geometry` (GeoJSON Point ou Polygon) e
`status`. `REJECTED` só é visível para o autor ou admin.

#### POST /parking
Criar uma contribuição (requer `access_token` + `X-CSRF-Token`).

**Request Body:**
```json
{
  "name": "Parque da Oliveira",
  "description": "Perto do centro",
  "geometry": { "type": "Point", "coordinates": [-8.291, 41.442] },
  "parkingType": "SURFACE",
  "capacityRange": "RANGE_21_50",
  "isFree": true
}
```
`geometry` aceita `Point`, `Polygon` ou `LineString` (GeoJSON, coordenadas `[lng, lat]`; a linha representa estacionamento ao longo da via).

Campos opcionais de detalhe: `hasPregnantSpaces`, `hasDisabledSpaces`, `hasEvCharging`, `isCovered` (booleanos).

**Sucesso (201):** estacionamento criado com `status: "PENDING"` e `trustScore: 2`. Contas novas (primeiras 3 contribuições) entram com `requiresReview: true` — só o admin aprova.

**Anti-spam / validação:**
- Email **verificado** obrigatório (rejeitado com `403` caso contrário)
- Coordenadas **sempre dentro de Portugal** (rejeitado caso contrário)
- Limite diário de 10 contribuições por utilizador (`429`)
- Honeypot anti-bot: campo escondido `website` — se preenchido, responde 201 falso sem guardar
- Validação contra a rede viária (OSM/Overpass): rejeita autoestradas, túneis, rotundas e "bermas" para `STREET`

**Errors:**
- `400`: coordenadas fora de Portugal / local inválido segundo a rede viária
- `409`: já existe um estacionamento a < 30 m (id em `details.existingId` no erro)
- `429`: limite diário de contribuições atingido

#### PATCH /parking/:id
Editar o próprio estacionamento (autor ou admin). Mesmos campos de criação, todos opcionais (inclui os detalhes e `LineString`). Edições do autor a um parque aprovado voltam a `PENDING` para revalidação.

#### POST /parking/:id/suggest
**Complementar informação de um parque** (requer auth + CSRF). Modelo híbrido por reputação:
- admin/membros confiáveis (reputação >= 5): aplica já (parque volta a `PENDING`)
- restantes: cria `ParkingSuggestion` `PENDING` para o admin decidir

**Request Body** (só os campos alterados + `reason` opcional):
```json
{ "hasDisabledSpaces": true, "reason": "Tem 4 lugares para mobilidade reduzida" }
```

**Success (201):** `{ "applied": true, "spot": {...} }` ou `{ "applied": false, "suggestion": {...} }`.

#### DELETE /parking/:id
Apagar o próprio estacionamento da comunidade (ou admin, incluindo importados).

#### POST /parking/:id/vote
Voto da comunidade (requer auth + CSRF). Recalcula `trustScore` e o estado.

**Request Body:**
```json
{ "value": 1 }
```
ou
```json
{ "value": -1, "reason": "Local já não existe" }
```
`reason` é obrigatória para votos negativos. Regras de confiança: base por fonte
(`COMMUNITY`=2, `OSM`/`GEOAPIFY`=6), upvote +1.5, downvote -2, clamp 0-10.
`PENDING` → `APPROVED` aos 5; `APPROVED` → `FLAGGED` abaixo de 3; `FLAGGED`
recupera aos 5. `REJECTED` não muda automaticamente.

#### GET /parking/moderation
Fila de moderação do admin: contribuições de contas novas (`requiresReview`) ainda pendentes/sinalizadas. Requer role `ADMIN`.

#### GET /parking/suggestions?status=PENDING
Lista sugestões da comunidade (admin). `status`: `PENDING` | `APPROVED` | `REJECTED`.

#### POST /parking/suggestions/:id/decide
Decisão do admin sobre uma sugestão. `{ "action": "APPROVE" | "REJECT", "reason"?: string }`. Aprovar aplica o diff ao parque (volta a `PENDING`).

#### GET /user/me/stats
Estatísticas de contribuições do utilizador autenticado:
`total`, `approved`, `pending`, `rejected`, `flagged`, `approvedRate`, `avgTrustApproved`, `votesGiven`, `votesReceivedUp`, `votesReceivedDown` e `reputation` (`score` 0-10, `isTrusted`, `isNew`, `voteWeight`).

#### POST /parking/:id/moderate
Moderação manual (requer role `ADMIN` + CSRF).

**Request Body:**
```json
{ "action": "APPROVE" }
```
ou
```json
{ "action": "REJECT", "reason": "Duplicado do parque X" }
```
Regista a ação em `ModerationLog`.

---

## Error Format

All errors follow this format:

```json
{
  "message": "Error description in Portuguese"
}
```

## Status Codes

- `200 OK`: Successful GET, PUT, PATCH, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Validation error or business rule violation
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource
- `429 Too Many Requests`: Daily contribution/vote limit reached
- `500 Internal Server Error`: Server error

## Rate Limiting

- **Limit**: 200 requests per 10 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time until reset

## CORS

Allowed origins:
- `http://localhost:3000` (development)
- Configure production URL in `.env`

## Request Examples

### Using cURL

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Create User
curl -X POST http://localhost:3001/user \
  -H "Content-Type: application/json" \
  -d '{"name":"User Name","email":"user@example.com","password":"password123"}'

# Login (save cookies to a jar)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password123"}'

# Authenticated request (send cookies from the jar)
curl -X GET http://localhost:3001/auth/me -b cookies.txt
```

### Using JavaScript (fetch)

```javascript
// Login
const response = await fetch('http://localhost:3001/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  }),
  credentials: 'include'
});

const data = await response.json();
```

## Pagination

For endpoints that return lists, use query parameters:

```
GET /users?page=1&limit=10
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Filtering

Use query parameters for filtering:

```
GET /users?isActive=true&role=admin
```

## Sorting

Use `sortBy` and `order` query parameters:

```
GET /users?sortBy=createdAt&order=desc
```
