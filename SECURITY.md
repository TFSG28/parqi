# Política de Segurança

## Reportar uma vulnerabilidade

Se encontrares uma vulnerabilidade no Parqi:

1. **Não** abras uma issue pública.
2. Escreve para **geral@parqi.pt** com a descrição, passos para reproduzir e impacto.
3. Respondemos assim que possível e trabalhamos contigo antes de qualquer divulgação.

## Medidas em vigor

- **Autenticação**: JWT (cookie httpOnly na web, Bearer na app), palavras-passe com bcrypt, verificação de email obrigatória para ações da comunidade, recuperação de palavra-passe por código com expiração e limite de tentativas.
- **Anti-abuso**: rate limiting global e dedicado (registo, login, recuperação), limites diários de contribuições e votos, honeypot anti-bot, validação geográfica (Portugal) e viária, revisão manual de contas novas, suspensão de contas.
- **Proteção de dados**: sanitização XSS de inputs, validação Zod em todos os endpoints, CSRF double-submit na web, headers de segurança (Helmet), Prisma ORM (sem SQL injection), RGPD (eliminação de conta com anonimização de contribuições).
