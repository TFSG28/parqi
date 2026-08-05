#Requires -Version 5.1
<#
============================================================
setup-secrets.ps1
Configura os GitHub Environments (quality/production) e
respetivos secrets para deploy automático em cPanel.
Requer: gh CLI autenticado (gh auth login)
============================================================
#>

$ErrorActionPreference = "Stop"

function Test-GhInstalled {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "Erro: gh CLI não encontrado. Instala com 'winget install --id GitHub.cli'" -ForegroundColor Red
        exit 1
    }
}

function Test-GhAuth {
    gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro: gh CLI não autenticado. Corre 'gh auth login' primeiro." -ForegroundColor Red
        exit 1
    }
}

Test-GhInstalled
Test-GhAuth

$REPO = (gh repo view --json nameWithOwner -q .nameWithOwner 2>$null)
if (-not $REPO) {
    Write-Host "Erro: não foi possível detetar o repositório. Corre este script dentro da pasta do repo." -ForegroundColor Red
    exit 1
}

Write-Host "Repositório detetado: $REPO"
Write-Host ""

Write-Host "============================================================"
Write-Host " Branches"
Write-Host "============================================================"
Write-Host ""

$CURRENT_BRANCH = (git rev-parse --abbrev-ref HEAD 2>$null)
if (-not $CURRENT_BRANCH) {
    Write-Host "Erro: não foi possível detetar a branch atual. Corre este script dentro de um repo git." -ForegroundColor Red
    exit 1
}

foreach ($BRANCH in @("quality", "production")) {
    git show-ref --verify --quiet "refs/heads/$BRANCH" 2>$null
    $localExists = ($LASTEXITCODE -eq 0)

    if ($localExists) {
        Write-Host "Branch '$BRANCH' já existe localmente."
    }
    else {
        git ls-remote --exit-code --heads origin $BRANCH 2>$null | Out-Null
        $remoteExists = ($LASTEXITCODE -eq 0)

        if ($remoteExists) {
            Write-Host "Branch '$BRANCH' já existe no remote. A criar tracking branch local..."
            git fetch origin "${BRANCH}:${BRANCH}"
        }
        else {
            $createBranch = Read-Host "Branch '$BRANCH' não existe. Criar a partir de main? (s/n)"
            if ($createBranch -eq "s" -or $createBranch -eq "S") {
                git checkout main
                git pull origin main --quiet 2>$null
                git checkout -b $BRANCH
                git push -u origin $BRANCH
                Write-Host "Branch '$BRANCH' criada e enviada para o remote."
            }
            else {
                Write-Host "A saltar criação de '$BRANCH'. Lembra-te de a criar manualmente antes de testar o deploy."
            }
        }
    }
    Write-Host ""
}

git checkout $CURRENT_BRANCH --quiet 2>$null

Write-Host ""

$ENVIRONMENTS = @("quality", "production")

foreach ($ENV in $ENVIRONMENTS) {
    Write-Host "============================================================"
    Write-Host " Configurar environment: $ENV"
    Write-Host "============================================================"

    $skip = Read-Host "Configurar '$ENV' agora? (s/n)"
    if ($skip -ne "s" -and $skip -ne "S") {
        Write-Host "A saltar $ENV."
        Write-Host ""
        continue
    }

    # Criar o environment se não existir
    gh api -X PUT "repos/$REPO/environments/$ENV" --silent 2>$null | Out-Null

    Write-Host ""
    $CPANEL_HOST = Read-Host "CPANEL_HOST (ex: meusite.pt)"
    $CPANEL_USER = Read-Host "CPANEL_USER"
    $CPANEL_API_TOKEN_SECURE = Read-Host "CPANEL_API_TOKEN" -AsSecureString
    $CPANEL_API_TOKEN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($CPANEL_API_TOKEN_SECURE)
    )
    $CPANEL_DEPLOY_PATH = Read-Host "CPANEL_DEPLOY_PATH (ex: /home/user/app)"
    $NEXT_PUBLIC_API_URL = Read-Host "NEXT_PUBLIC_API_URL (deixa vazio se não aplicável)"

    Write-Host ""
    Write-Host "A guardar secrets em '$ENV'..."

    $CPANEL_HOST       | gh secret set CPANEL_HOST       --env $ENV --repo $REPO
    $CPANEL_USER       | gh secret set CPANEL_USER       --env $ENV --repo $REPO
    $CPANEL_API_TOKEN  | gh secret set CPANEL_API_TOKEN  --env $ENV --repo $REPO
    $CPANEL_DEPLOY_PATH | gh secret set CPANEL_DEPLOY_PATH --env $ENV --repo $REPO

    if ($NEXT_PUBLIC_API_URL) {
        $NEXT_PUBLIC_API_URL | gh variable set NEXT_PUBLIC_API_URL --env $ENV --repo $REPO
    }

    Write-Host ""
    Write-Host "Environment '$ENV' configurado." -ForegroundColor Green
    Write-Host ""
}

Write-Host "============================================================"
Write-Host " Concluído." -ForegroundColor Green
Write-Host "============================================================"
Write-Host ""
Write-Host "Próximos passos:"
Write-Host "  1. Confirma em GitHub > Settings > Environments que tudo está correto"
Write-Host "  2. Garante que existe a pasta 'tmp/' em cada deploy path no cPanel"
Write-Host "  3. Faz push para a branch 'quality' ou 'production' para testar"