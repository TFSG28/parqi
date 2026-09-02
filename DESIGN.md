---
name: Parqi
description: App comunitária para encontrar estacionamento em Portugal
colors:
  brand: "#0647AC"
  brand-deep: "#053A8C"
  accent: "#FF6900"
  on-accent: "#FFFFFF"
  ink: "#111111"
  ink-soft: "#4B5563"
  paper: "#F5F5F7"
  mist: "#EBEBED"
  surface: "#FFFFFF"
  border: "#E3E3E6"
  muted: "#6B7280"
  success: "#059669"
  danger: "#E5303A"
  dark-background: "#111111"
  dark-surface: "#1C1C1E"
  dark-text: "#F0EDE8"
  dark-text-muted: "#878785"
  dark-border: "#2A2A2C"
  dark-muted: "#242426"
  dark-primary: "#FF6900"
  dark-success: "#34D399"
  dark-danger: "#EF4444"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, sans-serif"
    fontSize: "clamp(3rem, 9vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  heading:
    fontFamily: "Barlow Semi Condensed, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
  sign: "22%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  parking-sign:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sign}"
  chip:
    backgroundColor: "{colors.app-card}"
    textColor: "{colors.app-text}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  chip-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  app-card:
    backgroundColor: "{colors.app-card}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Parqi Design System

## Overview

Parqi encontra estacionamento em Portugal com dados públicos e comunidade. A identidade visual vem da sinalética rodoviária europeia: o sinal de estacionamento (quadrado azul, "P" branco, cantos arredondados a 22%) coincide com o azul da marca e é o motivo central em ambas as superfícies. Duas superfícies com registos distintos: **parqi.pt** (frontend/, Next.js + Tailwind 4) é marca, com azul comprometido a dominar o herói e o rodapé; **a app** (mobile/, Expo) é produto, onde o mapa é o herói e a UI flutua sobre ele com chrome mínimo.

## Colors

Estratégia *committed* no site (o azul carrega herói e rodapé; o miolo é branco) e *restrained* na app (neutros claros, azul só em ações primárias e na barra superior).

- `brand` #0647AC é o azul do sinal de estacionamento, igual no site e na app (mobile LIGHT.primary): ações primárias, barras, marca. `brand-deep` #053A8C carrega os blocos de marca do site (herói e rodapé).
- `accent` #FF6900 é a cor de ação (laranja vivo), igual no site e na app: CTAs primários (Rota, Enviar contribuição, FAB de adicionar), rota no mapa do site, estado "em verificação". Texto/ícones sobre laranja usam branco ou `ink` conforme o contexto (branco sobre laranja no site falha o contraste AA em texto pequeno).
- Neutros partilhados: os dois registos usam os mesmos neutros frios do sistema (paper #F5F5F7, texto #111111, bordas #E3E3E6); a fonte de verdade é `mobile/src/theme/colors.ts`, espelhada em `frontend/src/app/globals.css`.
- Semânticos: `success` verde para confiança alta e "Verificado", `danger` para reportar/sinalizado, `accent` para pendente e confiança média.
- Sobre azul usa-se branco ou `paper`; nunca cinzento sobre cor.
- A app tem tema claro/escuro (Sistema/Claro/Escuro em Conta → Preferências, persistido); o site espelha o mesmo tema via `.dark`. No escuro a marca vira laranja (`dark-primary` #FF6900, que contrasta com tinta escura em botões), os cartões passam a #1C1C1E sobre fundo #111111 e o texto a #F0EDE8. Semânticos (success/danger) têm variantes mais claras no escuro.

## Typography

- **Barlow** (corpo) e **Barlow Semi Condensed** (display/headings), uma superfamília desenhada a partir das letras da sinalética rodoviária da Califórnia; é a razão de registo da escolha.
- Site: display fluido com `clamp()`, corpo a 1.125rem, `text-wrap: balance` em h1–h3, linhas de corpo ≤52ch.
- App: fonte de sistema (registo de produto), escala fixa 11–22px, pesos 400/600/700/800 para hierarquia.

## Elevation

- Site: superfícies planas; a profundidade vem do contraste azul/branco, sem sombras.
- App: sombras discretas apenas em elementos que flutuam sobre o mapa (FABs, pílulas, lista): `shadowOpacity` 0.12–0.2, raio 4–6, `elevation` 3–4. Cartões usam borda `app-border` de 1px em vez de sombra.

## Components

- **parking-sign**: o quadrado azul com "P" (rounded 22%). Marca no site (invertido, branco com P azul, quando sobre azul) e glifos de secção.
- **chip**: seleção de opções na app (tipo, lotação, modo). Pílula com borda; selecionada fica azul com texto branco. `hitSlop` de 6 para alvo tátil.
- **app-card**: cartão branco, borda 1px, raio 16. Nunca aninhar cartões. No escuro, cartão #1C1C1E sobre fundo #111111.
- **TrustBar**: barra de confiança 0–10; cor por faixa (≥5 verde, ≥3 laranja, <3 vermelho).
- **StatusBadge**: pílula com ponto colorido; Verificado/Em verificação/Sinalizado/Rejeitado.
- **tab bar**: navegação principal da app no rodapé (Mapa / Pesquisa / Adicionar / Perfil); fundo `surface`, hairline `border`, ativo a azul com ícone preenchido, inativo `muted` com ícone outline.
- **FABs do mapa**: círculos brancos de 48px com ícone azul, sombra discreta; o FAB de adicionar na lista é laranja (`accent`) com ícone `ink`.
- **road-line** (site): separador com traço descontínuo de estrada, uso único por página.
- Botões: verbo + objeto ("Enviar contribuição"), estados disabled a opacity 0.45–0.6, loading com `ActivityIndicator` inline.

## Do's and Don'ts

- **Do**: deixar o mapa dominar na app; UI flutua com chrome mínimo.
- **Do**: usar o motivo do sinal "P" para marca e glifos; é a identidade.
- **Do**: laranja apenas para o que pede atenção (pendente, rota, vértices).
- **Do**: respeitar `prefers-reduced-motion` (site) e alvos táteis ≥44px efetivos (app).
- **Don't**: gradientes, glassmorphism, grelhas de cards idênticos, eyebrows uppercase, numeração 01/02/03 como scaffolding; o criador pediu explicitamente "nada de coisas genéricas de AI".
- **Don't**: cinzento sobre azul; usar `mist` ou branco.
- **Don't**: em dashes na copy; PT-PT com tratamento por "tu".
