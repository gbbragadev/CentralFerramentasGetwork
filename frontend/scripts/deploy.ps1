# =============================================================================
# Script de Deploy - Central de Ferramentas GetWork
# =============================================================================
# Uso: .\scripts\deploy.ps1 [ambiente]
# Ambientes: local, tunnel, production
#
# Exemplos:
#   .\scripts\deploy.ps1 local      # Desenvolvimento local
#   .\scripts\deploy.ps1 tunnel     # Cloudflare Tunnel (teste)
#   .\scripts\deploy.ps1 production # Build de produção

param(
    [Parameter(Position=0)]
    [ValidateSet("local", "tunnel", "production")]
    [string]$Environment = "local"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Deploy - Central de Ferramentas GetWork" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cores para output
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Verifica se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Err "Execute este script na pasta frontend/"
    exit 1
}

Write-Info "Ambiente selecionado: $Environment"
Write-Host ""

switch ($Environment) {
    "local" {
        Write-Info "Configurando para desenvolvimento local..."
        
        # Cria .env.local se não existir
        if (-not (Test-Path ".env.local")) {
            Copy-Item ".env.local.example" ".env.local" -ErrorAction SilentlyContinue
            if (-not (Test-Path ".env.local")) {
                @"
VITE_API_URL=http://localhost:4000
VITE_DEBUG=true
"@ | Out-File -FilePath ".env.local" -Encoding utf8
            }
            Write-Success "Arquivo .env.local criado"
        }
        
        Write-Info "Iniciando servidor de desenvolvimento..."
        Write-Host ""
        Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
        Write-Host "API esperada em: http://localhost:4000" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray
        Write-Host ""
        
        npm run dev
    }
    
    "tunnel" {
        Write-Info "Configurando para Cloudflare Tunnel..."
        
        # Verifica se cloudflared está instalado
        $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
        if (-not $cloudflared) {
            Write-Err "cloudflared não encontrado!"
            Write-Info "Instale com: winget install Cloudflare.cloudflared"
            exit 1
        }
        Write-Success "cloudflared encontrado: $($cloudflared.Source)"
        
        # Build do projeto
        Write-Info "Fazendo build do projeto..."
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Falha no build!"
            exit 1
        }
        Write-Success "Build concluído!"
        
        # Inicia preview
        Write-Info "Iniciando servidor de preview..."
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host " Servidor iniciado!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "1. Em outro terminal, inicie o túnel:" -ForegroundColor Yellow
        Write-Host "   cloudflared tunnel --url http://localhost:4173" -ForegroundColor White
        Write-Host ""
        Write-Host "2. Copie a URL gerada (ex: https://xxx.trycloudflare.com)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "3. Para a API, inicie outro túnel:" -ForegroundColor Yellow
        Write-Host "   cloudflared tunnel --url http://localhost:4000" -ForegroundColor White
        Write-Host ""
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray
        Write-Host ""
        
        npm run preview
    }
    
    "production" {
        Write-Info "Fazendo build de produção..."
        
        # Build
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Falha no build!"
            exit 1
        }
        
        Write-Success "Build de produção concluído!"
        Write-Host ""
        Write-Host "Arquivos gerados em: dist/" -ForegroundColor Green
        Write-Host ""
        Write-Host "Para testar localmente:" -ForegroundColor Yellow
        Write-Host "  npm run preview" -ForegroundColor White
        Write-Host ""
        Write-Host "Para deploy:" -ForegroundColor Yellow
        Write-Host "  - Copie a pasta dist/ para seu servidor" -ForegroundColor White
        Write-Host "  - Ou use com Docker (veja docker-compose.yml)" -ForegroundColor White
        Write-Host ""
        
        # Mostra tamanho dos arquivos
        Write-Info "Tamanho dos arquivos:"
        Get-ChildItem -Path "dist/assets" -Recurse | 
            Select-Object Name, @{N='Size(KB)';E={[math]::Round($_.Length/1KB,2)}} |
            Format-Table -AutoSize
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Concluído!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
