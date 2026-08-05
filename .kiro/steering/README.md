# Steering Files - Perfect Template

Esta pasta contém guias de desenvolvimento e steering files para o Perfect Template.

## Arquivos Disponíveis

### Auto-Incluídos (Sempre Ativos)

Estes arquivos são automaticamente incluídos no contexto do Kiro:

- **00-template-overview.md** - Visão geral do template, stack tecnológica e arquitetura
- **01-development-workflow.md** - Workflow de desenvolvimento, padrões de código e checklist
- **05-security-best-practices.md** - Práticas de segurança obrigatórias
- **07-api-design.md** - Convenções e padrões para APIs RESTful

### Manuais (Ativar com #)

Estes arquivos devem ser ativados manualmente quando necessário usando `#` no chat:

- **02-creating-modules.md** - Guia passo a passo para criar novos módulos
- **03-frontend-development.md** - Desenvolvimento de componentes e páginas
- **04-testing-guide.md** - Guia rápido de testes com Vitest
- **06-database-patterns.md** - Padrões de banco de dados com Prisma
- **08-deployment.md** - Guia de deploy em produção
- **09-troubleshooting.md** - Soluções para problemas comuns
- **10-observability.md** - Monitoring, métricas e health checks
- **11-performance.md** - Otimização de performance e caching

## Como Usar

### No Chat do Kiro

Para ativar um steering file manual, use `#` seguido do nome:

```
#02-creating-modules.md
```

Ou simplesmente mencione o tópico:

```
Como criar um novo módulo?
```

O Kiro automaticamente ativará o steering file relevante.

## Estrutura dos Steering Files

Cada steering file contém:

```markdown
---
inclusion: auto | manual
---

# Título

Conteúdo do guia...
```

- **inclusion: auto** - Sempre incluído no contexto
- **inclusion: manual** - Incluído apenas quando solicitado

## Quando Usar Cada Guia

### Iniciando um Projeto
1. Leia `00-template-overview.md` para entender a estrutura
2. Siga `SETUP.md` (na raiz) para configuração inicial
3. Consulte `01-development-workflow.md` para workflow

### Desenvolvendo Features
1. Use `02-creating-modules.md` para criar novos módulos backend
2. Use `03-frontend-development.md` para componentes frontend
3. Use `04-testing-guide.md` para escrever testes
4. Sempre siga `05-security-best-practices.md`

### Trabalhando com Dados
1. Consulte `06-database-patterns.md` para queries eficientes
2. Consulte `07-api-design.md` para endpoints RESTful

### Deploy e Manutenção
1. Use `08-deployment.md` para fazer deploy
2. Use `09-troubleshooting.md` para resolver problemas

## Documentação Adicional

Além dos steering files, consulte também:

- `SETUP.md` - Configuração e instalação
- `ARCHITECTURE.md` - Arquitetura detalhada
- `API.md` - Documentação completa da API
- `TESTING.md` - Guia completo de testes
- `MODULE_TEMPLATE.md` - Template para novos módulos
- `CONTRIBUTING.md` - Guia de contribuição
- `DEPLOYMENT.md` - Deploy detalhado
- `CHECKLIST.md` - Checklist antes de produção

## Contribuindo

Para adicionar novos steering files:

1. Crie arquivo em `.kiro/steering/`
2. Use numeração sequencial (10-, 11-, etc.)
3. Adicione frontmatter com `inclusion`
4. Atualize este README

## Suporte

Para dúvidas ou problemas:
1. Consulte os steering files relevantes
2. Consulte a documentação na raiz do projeto
3. Pergunte ao Kiro no chat
