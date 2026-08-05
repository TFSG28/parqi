# Quick Start Guide

Guia rápido para começar a usar o Perfect Template com Kiro.

## 1. Configuração Inicial

```bash
# Windows
setup.bat

# PowerShell
.\setup.ps1

# Linux/Mac
chmod +x setup.sh
./setup.sh
```

## 2. Configurar Variáveis de Ambiente

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
JWT_SECRET="seu-secret-aqui"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000"
```

### Frontend (.env.development)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## 3. Iniciar Banco de Dados

```bash
cd backend
npm run db-update
```

## 4. Iniciar Servidores

### Backend
```bash
cd backend
npm run dev
# Rodando em http://localhost:3001
```

### Frontend
```bash
cd frontend
npm run dev
# Rodando em http://localhost:3000
```

## 5. Usando o Kiro

### Steering Files Ativos

O Kiro já conhece automaticamente:
- Visão geral do template
- Workflow de desenvolvimento
- Práticas de segurança
- Design de APIs

### Ativar Guias Específicos

Use `#` no chat para ativar guias:

```
#02-creating-modules.md
Como criar um novo módulo de produtos?
```

### Perguntas Comuns

```
Como criar um novo módulo?
Como fazer testes?
Como fazer deploy?
Qual a estrutura do projeto?
Como funciona a autenticação?
```

## 6. Criar Seu Primeiro Módulo

```
#02-creating-modules.md
Quero criar um módulo de produtos com:
- Nome, descrição, preço, estoque
- CRUD completo
- Validação de dados
- Testes
```

O Kiro vai guiar você através do processo!

## 7. Desenvolver Frontend

```
#03-frontend-development.md
Criar uma página de listagem de produtos com:
- Grid responsivo
- Loading state
- Error handling
- Botão para criar novo produto
```

## 8. Escrever Testes

```
#04-testing-guide.md
Criar testes para o caso de uso CreateProduct
```

## 9. Fazer Deploy

```
#08-deployment.md
Como fazer deploy em produção?
```

## Comandos Úteis

### Backend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm test             # Executar testes
npm run test:watch   # Testes em watch mode
npm run db-update    # Atualizar banco
```

### Frontend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm test             # Executar testes
npm run test:watch   # Testes em watch mode
```

## Estrutura do Projeto

```
perfect-template/
├── backend/              # Express.js + TypeScript
│   ├── src/
│   │   ├── modules/      # Módulos (Clean Architecture)
│   │   ├── shared/       # Código compartilhado
│   │   └── lib/          # Bibliotecas
│   └── prisma/           # Schema do banco
├── frontend/             # Next.js + React
│   └── src/
│       ├── app/          # Páginas (App Router)
│       ├── components/   # Componentes
│       ├── contexts/     # Contextos React
│       └── hooks/        # Hooks customizados
└── .kiro/                # Guias e configurações
    ├── steering/         # Guias de desenvolvimento
    └── settings/         # Configurações do projeto
```

## Próximos Passos

1. Explore os steering files em `.kiro/steering/`
2. Leia a documentação na raiz do projeto
3. Crie seu primeiro módulo
4. Escreva testes
5. Faça deploy!

## Recursos

- **Documentação**: Arquivos `.md` na raiz
- **Steering Files**: `.kiro/steering/`
- **Exemplos**: Módulos `user` e `auth`
- **Kiro Chat**: Pergunte qualquer coisa!

## Suporte

Pergunte ao Kiro no chat:
```
Como funciona X?
Preciso de ajuda com Y
Qual a melhor forma de fazer Z?
```

O Kiro vai consultar os steering files e guiar você!

---

Bom desenvolvimento! 🚀
