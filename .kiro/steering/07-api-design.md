---
inclusion: auto
---

# Design de API

Convenções e padrões para design de APIs RESTful.

## Convenções RESTful

```
GET    /resource           - Lista todos
GET    /resource/:id       - Busca um específico
POST   /resource           - Cria novo
PUT    /resource/:id       - Atualiza completo
PATCH  /resource/:id       - Atualiza parcial
DELETE /resource/:id       - Remove
```

## Estrutura de Endpoints

### Recursos Aninhados

```
GET    /workspace/:workspaceId/users
POST   /workspace/:workspaceId/users
GET    /workspace/:workspaceId/users/:userId
```

### Ações Especiais

```
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /user/:id/activate
POST   /user/:id/deactivate
```

## Códigos de Status HTTP

### Sucesso (2xx)
- **200 OK** - Sucesso em GET, PUT, PATCH, DELETE
- **201 Created** - Sucesso em POST (criação)
- **204 No Content** - Sucesso sem corpo de resposta

### Erro do Cliente (4xx)
- **400 Bad Request** - Dados inválidos
- **401 Unauthorized** - Não autenticado
- **403 Forbidden** - Sem permissão
- **404 Not Found** - Recurso não encontrado
- **409 Conflict** - Conflito (ex: email já existe)
- **422 Unprocessable Entity** - Validação falhou

### Erro do Servidor (5xx)
- **500 Internal Server Error** - Erro interno
- **503 Service Unavailable** - Serviço indisponível

## Estrutura de Resposta

### Sucesso - Objeto Único

```json
{
  "id": "123",
  "name": "João Silva",
  "email": "joao@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Sucesso - Lista

```json
{
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### Erro

```json
{
  "message": "Usuário não encontrado"
}
```

### Erro com Detalhes

```json
{
  "message": "Dados inválidos",
  "errors": [
    { "field": "email", "message": "Email inválido" },
    { "field": "password", "message": "Senha muito curta" }
  ]
}
```

## Headers

### Autenticação

Cookie-based: o `access_token` (httpOnly) é enviado automaticamente pelo browser
com `credentials: 'include'`. Não há header `Authorization`.

Para pedidos que alteram estado (POST/PUT/PATCH/DELETE), enviar o token CSRF:

```
X-CSRF-Token: <csrfToken>
```

### Content Type

```
Content-Type: application/json
```

### CORS

```
Access-Control-Allow-Origin: https://frontend.com
Access-Control-Allow-Credentials: true
```

## Paginação

```
GET /users?page=1&limit=10
```

Resposta:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

## Filtros

```
GET /users?role=ADMIN&isActive=true
GET /products?minPrice=10&maxPrice=100
GET /users?search=joão
```

## Ordenação

```
GET /users?sortBy=createdAt&order=desc
GET /products?sortBy=price&order=asc
```

## Versionamento

```
/api/v1/users
/api/v2/users
```

## Exemplo Completo

```typescript
// GET /api/users?page=1&limit=10&role=ADMIN&sortBy=createdAt&order=desc
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where = role ? { role } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: order },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      data: users,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});
```

## Recursos

- Consulte `API.md` para documentação completa
- Consulte controllers existentes para exemplos
