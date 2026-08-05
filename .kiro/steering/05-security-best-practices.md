---
inclusion: auto
---

# Práticas de Segurança

Guia de segurança que deve ser seguido em TODAS as implementações.

## Validação de Entrada

### SEMPRE Valide

```typescript
// ✅ BOM - Validação com DTO
export class CreateUserDto {
  name: string;
  email: string;
  password: string;

  validate() {
    if (!this.name || this.name.length < 3) {
      throw new InvalidDataError('Nome inválido');
    }
    if (!this.email || !this.email.includes('@')) {
      throw new InvalidDataError('Email inválido');
    }
    if (!this.password || this.password.length < 6) {
      throw new InvalidDataError('Senha muito curta');
    }
  }
}

// ❌ RUIM - Sem validação
const user = await prisma.user.create({
  data: req.body, // Perigoso!
});
```

## Autenticação

### JWT Token

```typescript
// ✅ BOM - Verificar token
import { authMiddleware } from '@/middlewares/auth.middleware';

router.post('/protected', authMiddleware, controller.method);

// ❌ RUIM - Sem verificação
router.post('/protected', controller.method);
```

### Hash de Senhas

```typescript
// ✅ BOM - Hash com bcrypt
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);

// ❌ RUIM - Senha em texto plano
const user = await prisma.user.create({
  data: { password: password } // Nunca faça isso!
});
```

## Autorização

### Verificar Role

```typescript
// ✅ BOM - Verificar permissão
if (user.role !== 'ADMIN') {
  return res.status(403).json({ message: 'Sem permissão' });
}

// ❌ RUIM - Sem verificação
await prisma.user.delete({ where: { id } });
```

## Proteção de Dados

### NUNCA Exponha Senhas

```typescript
// ✅ BOM - Excluir senha
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
    // password não incluído
  },
});

// ❌ RUIM - Retorna tudo
const user = await prisma.user.findUnique({ where: { id } });
return res.json(user); // Inclui password!
```

### Mensagens de Erro Seguras

```typescript
// ✅ BOM - Mensagem genérica
catch (error) {
  console.error('Erro:', error); // Log interno
  return res.status(500).json({ 
    message: 'Erro interno do servidor' 
  });
}

// ❌ RUIM - Expõe detalhes
catch (error) {
  return res.status(500).json({ 
    message: error.message, // Pode expor informações sensíveis
    stack: error.stack // Nunca exponha stack trace!
  });
}
```

## SQL Injection

### Use Prisma Corretamente

```typescript
// ✅ BOM - Prisma protege automaticamente
const user = await prisma.user.findUnique({
  where: { email: userEmail },
});

// ❌ RUIM - Query raw sem sanitização
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userEmail}
`;
```

## CORS

```typescript
// ✅ BOM - CORS configurado
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// ❌ RUIM - CORS aberto
app.use(cors()); // Permite qualquer origem!
```

## Rate Limiting

```typescript
// ✅ BOM - Rate limit configurado
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições
});

app.use('/api/', limiter);
```

## Variáveis de Ambiente

```typescript
// ✅ BOM - Usar variáveis de ambiente
const secret = process.env.JWT_SECRET;

// ❌ RUIM - Hardcoded
const secret = 'minha-senha-secreta'; // Nunca!
```

## Checklist de Segurança

- [ ] Validação de entrada implementada
- [ ] Senhas com hash (bcrypt)
- [ ] JWT verificado em rotas protegidas
- [ ] Role verificado antes de operações
- [ ] Senhas nunca retornadas em responses
- [ ] Mensagens de erro genéricas
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativado
- [ ] Variáveis de ambiente usadas
- [ ] SQL injection prevenido (use Prisma)
- [ ] HTTPS em produção
- [ ] Logs de segurança implementados

## Recursos

- Consulte `auth.middleware.ts` para exemplo de autenticação
- Consulte `cors.config.ts` para configuração de CORS
- Consulte DTOs para exemplos de validação
