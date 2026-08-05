#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# setup-secrets.sh
# Configura os GitHub Environments (quality/production) e
# respetivos secrets para deploy automático em cPanel.
# Requer: gh CLI autenticado (gh auth login)
# ============================================================

if ! command -v gh &> /dev/null; then
  echo "Erro: gh CLI não encontrado. Instala em https://cli.github.com"
  exit 1
fi

if ! gh auth status &> /dev/null; then
  echo "Erro: gh CLI não autenticado. Corre 'gh auth login' primeiro."
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || {
  echo "Erro: não foi possível detetar o repositório. Corre este script dentro da pasta do repo."
  exit 1
}

echo "Repositório detetado: $REPO"
echo ""

echo "============================================================"
echo " Branches"
echo "============================================================"
echo ""

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || {
  echo "Erro: não foi possível detetar a branch atual. Corre este script dentro de um repo git."
  exit 1
}

for BRANCH in quality production; do
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo "Branch '$BRANCH' já existe localmente."
  elif git ls-remote --exit-code --heads origin "$BRANCH" &> /dev/null; then
    echo "Branch '$BRANCH' já existe no remote. A criar tracking branch local..."
    git fetch origin "$BRANCH:$BRANCH"
  else
    read -rp "Branch '$BRANCH' não existe. Criar a partir de main? (s/n): " CREATE_BRANCH
    if [[ "$CREATE_BRANCH" == "s" || "$CREATE_BRANCH" == "S" ]]; then
      git checkout main
      git pull origin main --quiet 2>/dev/null || true
      git checkout -b "$BRANCH"
      git push -u origin "$BRANCH"
      echo "Branch '$BRANCH' criada e enviada para o remote."
    else
      echo "A saltar criação de '$BRANCH'. Lembra-te de a criar manualmente antes de testar o deploy."
    fi
  fi
  echo ""
done

git checkout "$CURRENT_BRANCH" --quiet 2>/dev/null || true

echo ""

ENVIRONMENTS=("quality" "production")

for ENV in "${ENVIRONMENTS[@]}"; do
  echo "============================================================"
  echo " Configurar environment: $ENV"
  echo "============================================================"

  read -rp "Configurar '$ENV' agora? (s/n): " SKIP
  if [[ "$SKIP" != "s" && "$SKIP" != "S" ]]; then
    echo "A saltar $ENV."
    echo ""
    continue
  fi

  # Criar o environment se não existir
  gh api -X PUT "repos/$REPO/environments/$ENV" --silent 2>/dev/null || true

  echo ""
  echo "--- Frontend ($ENV) ---"
  read -rp "FRONTEND_CPANEL_HOST (ex: meusite.pt): " FRONTEND_CPANEL_HOST
  read -rp "FRONTEND_CPANEL_USER: " FRONTEND_CPANEL_USER
  read -rsp "FRONTEND_CPANEL_API_TOKEN: " FRONTEND_CPANEL_API_TOKEN
  echo ""
  read -rp "FRONTEND_DEPLOY_PATH (ex: /home/user/app): " FRONTEND_DEPLOY_PATH
  read -rp "NEXT_PUBLIC_API_URL (ex: https://api.meusite.pt): " NEXT_PUBLIC_API_URL

  echo ""
  echo "--- Backend ($ENV) ---"
  read -rp "BACKEND_CPANEL_HOST (ex: api.meusite.pt): " BACKEND_CPANEL_HOST
  read -rp "BACKEND_CPANEL_USER: " BACKEND_CPANEL_USER
  read -rsp "BACKEND_CPANEL_API_TOKEN: " BACKEND_CPANEL_API_TOKEN
  echo ""
  read -rp "BACKEND_DEPLOY_PATH (ex: /home/user/api): " BACKEND_DEPLOY_PATH

  echo ""
  echo "A guardar secrets em '$ENV'..."

  gh secret set FRONTEND_CPANEL_HOST --env "$ENV" --repo "$REPO" --body "$FRONTEND_CPANEL_HOST"
  gh secret set FRONTEND_CPANEL_USER --env "$ENV" --repo "$REPO" --body "$FRONTEND_CPANEL_USER"
  gh secret set FRONTEND_CPANEL_API_TOKEN --env "$ENV" --repo "$REPO" --body "$FRONTEND_CPANEL_API_TOKEN"
  gh secret set FRONTEND_DEPLOY_PATH --env "$ENV" --repo "$REPO" --body "$FRONTEND_DEPLOY_PATH"

  gh secret set BACKEND_CPANEL_HOST --env "$ENV" --repo "$REPO" --body "$BACKEND_CPANEL_HOST"
  gh secret set BACKEND_CPANEL_USER --env "$ENV" --repo "$REPO" --body "$BACKEND_CPANEL_USER"
  gh secret set BACKEND_CPANEL_API_TOKEN --env "$ENV" --repo "$REPO" --body "$BACKEND_CPANEL_API_TOKEN"
  gh secret set BACKEND_DEPLOY_PATH --env "$ENV" --repo "$REPO" --body "$BACKEND_DEPLOY_PATH"

  gh variable set NEXT_PUBLIC_API_URL --env "$ENV" --repo "$REPO" --body "$NEXT_PUBLIC_API_URL"

  echo ""
  echo "Environment '$ENV' configurado."
  echo ""
done

echo "============================================================"
echo " Concluído."
echo "============================================================"
echo ""
echo "Próximos passos:"
echo "  1. Confirma em GitHub > Settings > Environments que tudo está correto"
echo "  2. Garante que existe a pasta 'tmp/' em cada deploy path no cPanel"
echo "  3. Faz push para a branch 'quality' ou 'production' para testar"
