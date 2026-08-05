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
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: User already exists or validation error
- `500 Internal Server Error`: Server error

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
