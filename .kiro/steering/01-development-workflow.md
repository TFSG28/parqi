---
inclusion: auto
---

# Workflow de Desenvolvimento

Este guia define o processo de desenvolvimento que deve ser seguido ao trabalhar com este template.

## Antes de Escrever Código

### 1. Clarificar Requisitos

Sempre pergunte sobre:
- Qual é o problema exato e comportamento esperado?
- Quais são as expectativas de performance?
- Quais são os casos extremos e cenários de erro?
- Quais são as implicações de segurança?
- Quais formatos de entrada/saída são necessários?
- Quais roles de usuário são afetados? (Client, Manager, Partner, Admin)

### 2. Propor Arquitetura

Antes de implementar, defina:
- Localização dos arquivos (controller, route, service, component)
- Responsabilidades e assinaturas das funções
- Mudanças no schema do banco de dados (se necessário)
- Estratégia de tratamento de erros
- Regras de validação de dados
- Design dos endpoints da API (convenções RESTful)

### 3. Aguardar Aprovação

Não implemente até receber aprovação da arquitetura proposta.

### 4. Após Implementação

Sugira:
- Otimizações de performance
- Abordagens alternativas
- Possíveis problemas de escalabilidade
- Pontos de extensão futura

## Padrões de Código

### Qualidade

- Escreva código pronto para produção seguindo clean code
- Adicione comentários APENAS onde a lógica de negócio é complexa
- Evite abstrações desnecessárias
- Mantenha funções focadas e com propósito único
- Use nomes descritivos para variáveis e funções
- Não use tipo `any`

### Restrições de Output

- NUNCA crie arquivos markdown de resumo (a menos que explicitamente solicitado)
- NUNCA use gradientes em estilização de UI
- NUNCA use emojis em código, comentários ou texto voltado ao usuário
- Todo texto voltado ao usuário DEVE estar em português

## Convenções de UI

### Estilização com Tailwind

- **Modais**: Sempre use `bg-white/30 backdrop-blur-md` para backgrounds
- **Design Responsivo**: Use breakpoints do Tailwind (md:, lg:)
- **Cores**: Use cores do tema definidas (verde, azul) no config do Tailwind
- **Espaçamento**: Use escala de espaçamento consistente do Tailwind
- **Elementos Interativos**: Inclua estados de hover

### Exemplo de Modal
```tsx
<div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center">
  <div className="bg-white rounded-lg shadow-xl p-6">
    {/* Conteúdo do modal */}
  </div>
</div>
```

## Requisitos de Segurança

### Sempre Implemente

1. **Validação de Entrada**
   - Valide e sanitize toda entrada do usuário
   - Use Zod schemas para validação estruturada
   - Rejeite dados inválidos com mensagens claras

2. **Proteção de Dados Sensíveis**
   - NUNCA exponha dados sensíveis em mensagens de erro
   - Hash de senhas com bcryptjs (salt rounds: 10)
   - Use AES-256-CBC para criptografia de documentos

3. **Autenticação e Autorização**
   - Verifique o token JWT (cookie `access_token`) em endpoints protegidos via `authMiddleware`
   - Verifique a role do usuário com `requireRole(...)` antes de permitir operações
   - Proteja pedidos que alteram estado com `csrfMiddleware` (header `X-CSRF-Token` vs cookie `csrf_token`)

### Exemplo de Validação com Zod
```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  }),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>['body'];
```

## Tratamento de Erros

### Use Classes de Erro Customizadas

```typescript
import { ConflictError, NotFoundError, UnauthorizedError } from '../shared/errors/AppError';

// Em use cases
if (existingUser) {
  throw new ConflictError('Usuário já existe');
}

if (!user) {
  throw new NotFoundError('Usuário não encontrado');
}

if (!isPasswordValid) {
  throw new UnauthorizedError('Credenciais inválidas');
}
```

### Controllers Limpos com asyncHandler

```typescript
import { asyncHandler } from '../shared/utils/async-handler';
import { ApiResponse } from '../shared/utils/api-response';

@injectable()
export class UserController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.createUserUseCase.execute(req.body);
    return ApiResponse.created(res, user);
  });
}
```

### Códigos HTTP

- **200** - Sucesso em queries/updates
- **201** - Sucesso na criação de recurso
- **204** - Sem conteúdo (delete bem-sucedido)
- **400** - Dados inválidos (ValidationError)
- **401** - Não autenticado (UnauthorizedError)
- **403** - Não autorizado (ForbiddenError)
- **404** - Recurso não encontrado (NotFoundError)
- **409** - Conflito (ConflictError)
- **500** - Erro interno do servidor

## Operações de Banco de Dados

### Boas Práticas com Prisma

```typescript
// ✅ BOM - Seleciona apenas campos necessários
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
    // Não seleciona password
  },
});

// ✅ BOM - Usa include para evitar N+1
const users = await prisma.user.findMany({
  include: {
    workspace: true,
  },
});

// ✅ BOM - Verifica existência antes de atualizar
const user = await prisma.user.findUnique({ where: { id } });
if (!user) {
  throw new NotFoundError('Usuário não encontrado');
}

// ✅ BOM - Usa transação para operações múltiplas
await prisma.$transaction(async (tx) => {
  await tx.user.create({ data: userData });
  await tx.log.create({ data: logData });
});

// ❌ RUIM - Seleciona tudo (incluindo password)
const user = await prisma.user.findUnique({ where: { id } });

// ❌ RUIM - N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId }
  });
}
```

## Design de API

### Convenções RESTful

```
GET    /user           - Lista todos os usuários
GET    /user/:id       - Busca um usuário específico
POST   /user           - Cria um novo usuário
PUT    /user/:id       - Atualiza um usuário completo
PATCH  /user/:id       - Atualiza parcialmente um usuário
DELETE /user/:id       - Remove um usuário
```

### Estrutura de Resposta com ApiResponse

```typescript
// Sucesso
return ApiResponse.success(res, data);

// Criação
return ApiResponse.created(res, user);

// Sem conteúdo
return ApiResponse.noContent(res);

// Paginação
return ApiResponse.paginated(res, users, page, limit, total);
```

### Validação em Rotas

```typescript
import { validate } from '../shared/middleware/validation.middleware';
import { CreateUserSchema } from '../dtos/CreateUser.dto';

router.post('/user', validate(CreateUserSchema), controller.create);
```

## Logging

### Use Logger Estruturado

```typescript
import { logger } from '../shared/utils/logger';

// Info
logger.info('Usuário criado', { userId: user.id });

// Error
logger.error('Erro ao criar usuário', { error: err.message });

// Debug (só em desenvolvimento)
logger.debug('Dados recebidos', { data: req.body });
```

## Variáveis de Ambiente

### Use env Validado

```typescript
import { env } from './config/env';

// Type-safe e validado na inicialização
const port = env.PORT;
const secret = env.JWT_SECRET;
const dbUrl = env.DATABASE_URL;
```

## Testes

### Quando Escrever Testes

- ✅ Lógica de negócio (casos de uso)
- ✅ Endpoints da API (controllers)
- ✅ Comportamento de componentes
- ✅ Tratamento de erros
- ✅ Casos extremos

### Padrão AAA

```typescript
it('deve criar um usuário com sucesso', async () => {
  // Arrange (Preparar)
  const userData = {
    name: 'João Silva',
    email: 'joao@example.com',
    password: 'senha123',
  };

  // Act (Executar)
  const result = await createUserUseCase.execute(userData);

  // Assert (Verificar)
  expect(result).toBeDefined();
  expect(result.email).toBe(userData.email);
});
```

## Checklist Antes de Commit

- [ ] Código segue padrões de clean code
- [ ] Validação de entrada implementada com Zod
- [ ] Tratamento de erros com classes customizadas
- [ ] Mensagens em português
- [ ] Testes escritos e passando
- [ ] Sem dados sensíveis expostos
- [ ] Logger usado ao invés de console.log
- [ ] Tipos TypeScript corretos (sem any)
- [ ] Documentação atualizada (se necessário)

## Checklist Antes de Deploy

- [ ] Todos os testes passando
- [ ] Build sem erros
- [ ] Variáveis de ambiente configuradas e validadas
- [ ] Migrations do banco executadas
- [ ] Logs estruturados configurados
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativado
- [ ] HTTPS configurado
- [ ] Backup do banco configurado
- [ ] Graceful shutdown implementado

## Recursos

- Consulte `SENIOR_IMPROVEMENTS.md` para melhorias implementadas
- Consulte `backend/IMPROVEMENTS.md` para detalhes técnicos
- Consulte `MODULE_TEMPLATE.md` para criar novos módulos
- Consulte `TESTING.md` para guia de testes
- Consulte `API.md` para documentação da API
- Consulte `CHECKLIST.md` para checklist completo
