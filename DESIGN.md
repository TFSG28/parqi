---
name: Parqi
description: App comunitária para encontrar estacionamento em Portugal
colors:
  brand: "#3B6BFF"
  brand-deep: "#2A4ED6"
  brand-night: "#1B2F8A"
  accent: "#FF7A00"
  ink: "#15173A"
  ink-soft: "#4D5079"
  paper: "#FDFDFF"
  mist: "#E3E8FF"
  app-background: "#F7F8FA"
  app-card: "#FFFFFF"
  app-text: "#111318"
  app-text-muted: "#6B7280"
  app-border: "#E5E7EB"
  success: "#16A34A"
  danger: "#DC2626"
  dark-background: "#0F1117"
  dark-card: "#1A1D27"
  dark-text: "#F2F3F7"
  dark-text-muted: "#9AA0B4"
  dark-border: "#2A2E3D"
  dark-primary: "#3B6BFF"
  dark-bar: "#2E46C9"
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

- `brand` #3B6BFF é o azul do sinal de estacionamento (versão mais clara e viva): ações primárias, barras, marca.
- `accent` #FF7A00 é a cor de ação (laranja vivo): CTAs primários (Rota, Enviar contribuição, FABs de modo), rota no mapa do site, estado "em verificação". Texto/ícones sobre laranja usam `ink` (branco sobre laranja vivo falha o contraste AA).
- Neutros do site (`ink`, `ink-soft`, `paper`, `mist`) são tintados para o azul da marca; os da app (`app-*`) são neutros frios do sistema.
- Semânticos: `success` verde para confiança alta e "Verificado", `danger` para reportar/sinalizado, `accent` para pendente e confiança média.
- Sobre azul usa-se branco ou `mist`; nunca cinzento sobre cor.
- A app tem tema claro/escuro (Sistema/Claro/Escuro em Conta → Preferências, persistido). No escuro, `dark-primary` mantém o azul da marca (o #3B6BFF contrasta com texto branco em botões) e as barras usam `dark-bar` #2E46C9. Semânticos (success/danger) têm variantes mais claras no escuro.

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
- **app-card**: cartão branco, borda 1px, raio 16. Nunca aninhar cartões.
- **TrustBar**: barra de confiança 0–10; cor por faixa (≥5 verde, ≥3 laranja, <3 vermelho).
- **StatusBadge**: pílula com ponto colorido; Verificado/Em verificação/Sinalizado/Rejeitado.
- **FABs do mapa**: círculos brancos de 48px com ícone azul, sombra discreta.
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
