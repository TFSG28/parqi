---
inclusion: manual
---

# Troubleshooting

Soluções para problemas comuns.

## Problemas de Instalação

### Erro: "Cannot find module"

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro: Prisma Client não gerado

```bash
cd backend
npx prisma generate
```

### Erro: Porta já em uso

```bash
# Encontrar processo
lsof -i :3000  # ou :3001

# Matar processo
kill -9 <PID>
```

## Problemas de Banco de Dados

### Erro: "Can't reach database server"

1. Verificar se o banco está rodando
2. Verificar DATABASE_URL no .env
3. Verificar credenciais

### Erro: Migration falhou

```bash
# Resetar banco (cuidado!)
npx prisma migrate reset

# Ou aplicar manualmente
npx prisma db push
```

### Erro: "Unique constraint failed"

```typescript
// Verificar antes de criar
const existing = await prisma.user.findUnique({
  where: { email },
});

if (existing) {
  throw new UserAlreadyExistsError();
}
```

## Problemas de Autenticação

### Token JWT inválido

1. Verificar JWT_SECRET no .env
2. Verificar se o token (cookie `access_token`) não expirou
3. Confirmar que o browser envia cookies (`credentials: 'include'`) e que o CORS tem `credentials: true`
4. Em pedidos que alteram estado, verificar o header `X-CSRF-Token` contra o cookie `csrf_token`

### CORS Error

```typescript
// Verificar configuração CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

## Problemas de Build

### TypeScript Errors

```bash
# Verificar tipos
npm run lint

# Limpar e rebuildar
rm -rf dist
npm run build
```

### Testes Falhando

```bash
# Executar testes com verbose
npm test -- --reporter=verbose

# Executar teste específico
npm test -- CreateUser.usecase.spec.ts
```

## Problemas de Performance

### Queries Lentas

```typescript
// Usar select para campos específicos
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// Usar include para evitar N+1
const users = await prisma.user.findMany({
  include: {
    workspace: true,
  },
});
```

### Memory Leaks

```typescript
// Limpar listeners
useEffect(() => {
  const handler = () => {};
  window.addEventListener('resize', handler);
  
  return () => {
    window.removeEventListener('resize', handler);
  };
}, []);
```

## Problemas de Deploy

### Build falha em produção

1. Verificar variáveis de ambiente
2. Verificar versão do Node.js
3. Verificar logs de erro

### Aplicação não inicia

1. Verificar PORT no .env
2. Verificar se todas as dependências foram instaladas
3. Verificar logs do servidor

## Logs Úteis

```typescript
// Backend
console.log('Variáveis de ambiente:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? 'Configurado' : 'Não configurado',
});

// Frontend
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

## Comandos Úteis

```bash
# Verificar versões
node --version
npm --version

# Limpar cache npm
npm cache clean --force

# Verificar portas em uso
netstat -ano | findstr :3000

# Ver logs Docker
docker-compose logs -f

# Reiniciar serviços
docker-compose restart
```

## Recursos

- Consulte documentação oficial das bibliotecas
- Consulte issues no GitHub do projeto
- Consulte Stack Overflow
