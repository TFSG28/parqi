# .kiro Folder

Esta pasta contém configurações e guias específicos para o Kiro AI Assistant.

## Estrutura

```
.kiro/
├── steering/          # Guias de desenvolvimento
│   ├── README.md      # Índice dos steering files
│   ├── 00-*.md        # Auto-incluídos
│   ├── 01-*.md        # Auto-incluídos
│   └── 02-*.md        # Manuais
├── settings/          # Configurações do projeto
│   └── kiro.json      # Metadados do projeto
└── README.md          # Este arquivo
```

## Steering Files

Os steering files são guias que ajudam o Kiro a entender o projeto e seguir as convenções corretas.

### Auto-Incluídos

Estes arquivos são sempre carregados no contexto do Kiro:

- **00-template-overview.md** - Visão geral do template
- **01-development-workflow.md** - Workflow de desenvolvimento
- **05-security-best-practices.md** - Práticas de segurança
- **07-api-design.md** - Design de APIs

### Manuais

Estes arquivos são carregados apenas quando necessário:

- **02-creating-modules.md** - Criar novos módulos
- **03-frontend-development.md** - Desenvolvimento frontend
- **04-testing-guide.md** - Guia de testes
- **06-database-patterns.md** - Padrões de banco de dados
- **08-deployment.md** - Deploy em produção
- **09-troubleshooting.md** - Solução de problemas

Para ativar um steering file manual, use `#` no chat:

```
#02-creating-modules.md
```

## Settings

O arquivo `settings/kiro.json` contém metadados sobre o projeto:

- Stack tecnológica
- Arquitetura e padrões
- Convenções de código
- Configurações de segurança
- Documentação disponível
- Scripts e comandos

## Como Usar

### Para Desenvolvedores

1. Leia os steering files para entender as convenções
2. Consulte os guias quando precisar de ajuda
3. Use o Kiro no chat para tirar dúvidas

### Para o Kiro

Os steering files guiam o Kiro para:

- Seguir as convenções do projeto
- Gerar código consistente
- Aplicar boas práticas de segurança
- Manter a arquitetura limpa
- Escrever testes adequados

## Personalizando

Você pode adicionar seus próprios steering files:

1. Crie um arquivo `.md` em `steering/`
2. Adicione frontmatter com `inclusion: auto` ou `manual`
3. Escreva o conteúdo do guia
4. Atualize `steering/README.md`

Exemplo:

```markdown
---
inclusion: manual
---

# Meu Guia Customizado

Conteúdo do guia...
```

## Recursos

- Consulte `steering/README.md` para lista completa de guias
- Consulte `settings/kiro.json` para configurações do projeto
- Pergunte ao Kiro no chat para ajuda específica

## Suporte

Para dúvidas sobre os steering files ou configurações:

1. Consulte a documentação na raiz do projeto
2. Leia os steering files relevantes
3. Pergunte ao Kiro no chat
