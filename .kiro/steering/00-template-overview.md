---
inclusion: auto
---

# Perfect Template - Visão Geral

Este é um template full-stack profissional baseado no projeto Lacatoni, seguindo Clean Architecture e princípios SOLID.

## Estrutura do Projeto

```
perfect-template/
├── backend/          # Express.js + TypeScript + Prisma
├── frontend/         # Next.js 16 + React 19 + Tailwind CSS 4
└── .kiro/           # Guias de desenvolvimento e steering files
```

## Stack Tecnológica

### Backend
- **Express.js 5** - Framework web
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para banco de dados
- **TSyringe** - Injeção de dependência
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Nodemailer** - Envio de emails
- **Vitest** - Testes

### Frontend
- **Next.js 16** - Framework React com SSR
- **React 19** - Biblioteca UI
- **Tailwind CSS 4** - Estilização
- **React Hook Form** - Formulários
- **React Icons** - Ícones
- **React Toastify** - Notificações
- **Vitest** - Testes

## Arquitetura

O projeto segue **Clean Architecture** com separação clara de responsabilidades:

### Backend - Camadas
1. **Domain** - Entidades, erros, interfaces (regras de negócio)
2. **Application** - Casos de uso, DTOs (lógica de aplicação)
3. **Infrastructure** - Implementações concretas (repositórios, serviços)
4. **Presentation** - Controllers, rotas (interface HTTP)

### Frontend - Estrutura
1. **Components** - Componentes reutilizáveis (UI + features)
2. **Contexts** - Estado global (Auth, Theme)
3. **Hooks** - Lógica reutilizável
4. **Libs** - Utilitários e clientes HTTP
5. **App** - Páginas e rotas

## Princípios SOLID

- **S**ingle Responsibility - Cada classe tem uma única responsabilidade
- **O**pen/Closed - Aberto para extensão, fechado para modificação
- **L**iskov Substitution - Substituição de tipos base por derivados
- **I**nterface Segregation - Interfaces específicas ao invés de genéricas
- **D**ependency Inversion - Dependa de abstrações, não de implementações

## Injeção de Dependência

O template usa **TSyringe** para DI:

```typescript
// Registrar dependências
container.register<IUserRepository>(
  'UserRepository',
  { useClass: UserRepository }
);

// Usar em controllers
@injectable()
export class UserController {
  constructor(
    @inject('CreateUserUseCase') private createUser: CreateUserUseCase
  ) {}
}

// Exportar controllers resolvidos
export const userController = container.resolve(UserController);
```

## Padrões de Desenvolvimento

### 1. Sempre use TypeScript
- Tipos explícitos para parâmetros e retornos
- Interfaces para contratos
- Evite `any`

### 2. Validação de Dados
- Valide entrada do usuário
- Use DTOs para transferência de dados
- Sanitize dados antes de processar

### 3. Tratamento de Erros
- Erros customizados no domain
- Try-catch em operações assíncronas
- Mensagens em português para usuários

### 4. Testes
- Escreva testes para casos de uso
- Teste endpoints da API
- Teste componentes React
- Execute testes antes do build

### 5. Segurança
- Hash de senhas com bcrypt
- JWT para autenticação
- Validação de tokens
- Verificação de roles

## Próximos Passos

1. Leia `SETUP.md` para configuração inicial
2. Leia `ARCHITECTURE.md` para entender a estrutura
3. Leia `MODULE_TEMPLATE.md` para criar novos módulos
4. Leia `TESTING.md` para escrever testes
5. Consulte os steering files em `.kiro/steering/` para guias específicos

## Documentação Completa

- `SETUP.md` - Configuração e instalação
- `ARCHITECTURE.md` - Arquitetura detalhada
- `API.md` - Documentação da API
- `TESTING.md` - Guia de testes
- `MODULE_TEMPLATE.md` - Como criar módulos
- `CONTRIBUTING.md` - Guia de contribuição
- `DEPLOYMENT.md` - Deploy em produção
- `CHECKLIST.md` - Checklist antes de produção
