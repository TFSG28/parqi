# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

Se você descobrir uma vulnerabilidade de segurança neste projeto, por favor, siga estas etapas:

1. **NÃO** abra uma issue pública
2. Envie um email para [security@example.com] com:
   - Descrição detalhada da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Sugestões de correção (se houver)

3. Aguarde resposta em até 48 horas
4. Trabalhe conosco para resolver o problema antes da divulgação pública

## Security Best Practices

### Autenticação e Autorização
- Tokens JWT com expiração de 7 dias
- Senhas hasheadas com bcrypt (10 salt rounds)
- Validação de tokens em todas as rotas protegidas
- Rate limiting: 200 requisições por 10 minutos

### Proteção de Dados
- Sanitização de inputs com XSS protection
- Validação de dados com Zod
- CORS configurado para domínios específicos
- Headers de segurança com Helmet.js

### Infraestrutura
- Containers rodando como usuário não-root
- Health checks configurados
- Graceful shutdown implementado
- Logs estruturados sem dados sensíveis

### Banco de Dados
- Conexões via Prisma ORM (proteção contra SQL injection)
- Variáveis de ambiente para credenciais
- Backups regulares recomendados

## Security Headers

O template implementa os seguintes headers de segurança:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
```

## Dependências

- Atualizações de segurança são aplicadas regularmente
- Use `npm audit` para verificar vulnerabilidades
- Dependabot configurado no GitHub

## Compliance

Este template segue:
- OWASP Top 10 guidelines
- GDPR considerations (data handling)
- Security by design principles

## Disclosure Policy

- Vulnerabilidades críticas: divulgação após 7 dias da correção
- Vulnerabilidades médias: divulgação após 30 dias da correção
- Vulnerabilidades baixas: divulgação após 90 dias da correção

## Contact

Para questões de segurança: [security@example.com]
