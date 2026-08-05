---
inclusion: manual
---

# Padrões de Banco de Dados

Guia para trabalhar com Prisma e banco de dados.

## Schema do Prisma

```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(CLIENT)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relações
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId String
}

enum Role {
  CLIENT
  MANAGER
  PARTNER
  ADMIN
}
```

## Queries Eficientes

### Selecionar Apenas Campos Necessários

```typescript
// ✅ BOM
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// ❌ RUIM - Seleciona tudo
const user = await prisma.user.findUnique({ where: { id } });
```

### Evitar N+1 Queries

```typescript
// ✅ BOM - Uma query com include
const users = await prisma.user.findMany({
  include: {
    workspace: true,
  },
});

// ❌ RUIM - N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId }
  });
}
```

## Transações

```typescript
// ✅ BOM - Usar transação para operações múltiplas
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: userData,
  });
  
  await tx.log.create({
    data: {
      action: 'USER_CREATED',
      userId: user.id,
    },
  });
});

// ❌ RUIM - Operações separadas
const user = await prisma.user.create({ data: userData });
await prisma.log.create({ data: logData }); // Pode falhar
```

## Verificações

```typescript
// ✅ BOM - Verificar existência
const user = await prisma.user.findUnique({ where: { id } });
if (!user) {
  throw new UserNotFoundError();
}

await prisma.user.update({
  where: { id },
  data: updateData,
});

// ❌ RUIM - Sem verificação
await prisma.user.update({
  where: { id },
  data: updateData,
}); // Pode falhar silenciosamente
```

## Unique Constraints

```typescript
// ✅ BOM - Verificar antes de criar
const existing = await prisma.user.findUnique({
  where: { email },
});

if (existing) {
  throw new UserAlreadyExistsError();
}

const user = await prisma.user.create({ data });
```

## Migrations

```bash
# Criar migration
npx prisma migrate dev --name add_user_table

# Aplicar migrations
npx prisma migrate deploy

# Gerar client
npx prisma generate

# Push schema (desenvolvimento)
npx prisma db push
```

## Comandos Úteis

```bash
# Atualizar banco (desenvolvimento)
npm run db-update

# Abrir Prisma Studio
npx prisma studio

# Resetar banco (cuidado!)
npx prisma migrate reset
```

## Recursos

- Consulte `schema.prisma` para modelos existentes
- Consulte repositórios para exemplos de queries
- [Documentação Prisma](https://www.prisma.io/docs)
