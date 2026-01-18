# ============================================================
# GetWork Portal - Script de Desenvolvimento com Tunnels
# ============================================================

$Host.UI.RawUI.WindowTitle = "GetWork Portal - Dev Server"
$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       GetWork Portal - Iniciando Ambiente" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

# ============================================================
# 1. Limpar processos anteriores
# ============================================================
Write-Host "[1/5] Limpando processos anteriores..." -ForegroundColor Yellow
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# ============================================================
# 2. Iniciar Docker
# ============================================================
Write-Host "[2/5] Iniciando Docker..." -ForegroundColor Yellow
docker-compose down 2>$null | Out-Null
docker-compose up -d 2>&1 | Out-Null

# Aguardar API
Write-Host "      Aguardando API..." -ForegroundColor Gray
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 2
        if ($health.status -eq "ok") {
            Write-Host "      API pronta!" -ForegroundColor Green
            break
        }
    } catch {}
}

# ============================================================
# 3. Criar Tunnel da API primeiro (para pegar a URL)
# ============================================================
Write-Host "[3/5] Criando Tunnel da API..." -ForegroundColor Yellow

$apiTunnelLog = Join-Path $env:TEMP "getwork-api-tunnel.log"
Remove-Item $apiTunnelLog -Force -ErrorAction SilentlyContinue

$apiTunnelProcess = Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel --url http://localhost:4000" `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardError $apiTunnelLog

# Aguardar URL da API
$apiTunnelUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $apiTunnelLog) {
        $content = Get-Content $apiTunnelLog -Raw
        if ($content -match "(https://[a-z0-9-]+\.trycloudflare\.com)") {
            $apiTunnelUrl = $matches[1]
            Write-Host "      API Tunnel: $apiTunnelUrl" -ForegroundColor Green
            break
        }
    }
}

# ============================================================
# 4. Iniciar Frontend com URL da API
# ============================================================
Write-Host "[4/5] Iniciando Frontend..." -ForegroundColor Yellow

$frontendDir = Join-Path $projectDir "frontend"

# Criar arquivo .env.local temporário com a URL da API
$envFile = Join-Path $frontendDir ".env.local"
if ($apiTunnelUrl) {
    "VITE_API_URL=$apiTunnelUrl" | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "      Configurado VITE_API_URL=$apiTunnelUrl" -ForegroundColor Gray
}

# Iniciar frontend em processo separado
$frontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c cd /d `"$frontendDir`" && npm run dev -- --port 3000 --host" `
    -PassThru -WindowStyle Minimized

Start-Sleep -Seconds 6
Write-Host "      Frontend iniciado na porta 3000!" -ForegroundColor Green

# ============================================================
# 5. Criar Tunnel do Frontend
# ============================================================
Write-Host "[5/5] Criando Tunnel do Frontend..." -ForegroundColor Yellow

$frontendTunnelLog = Join-Path $env:TEMP "getwork-frontend-tunnel.log"
Remove-Item $frontendTunnelLog -Force -ErrorAction SilentlyContinue

$frontendTunnelProcess = Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel --url http://localhost:3000" `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardError $frontendTunnelLog

# Aguardar URL do Frontend
$frontendTunnelUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $frontendTunnelLog) {
        $content = Get-Content $frontendTunnelLog -Raw
        if ($content -match "(https://[a-z0-9-]+\.trycloudflare\.com)") {
            $frontendTunnelUrl = $matches[1]
            break
        }
    }
}

# ============================================================
# Exibir URLs
# ============================================================
Clear-Host
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "       GetWork Portal - ONLINE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  ACESSO LOCAL:" -ForegroundColor White
Write-Host "    Frontend:  " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "    API:       " -NoNewline; Write-Host "http://localhost:4000" -ForegroundColor Cyan
Write-Host ""

if ($frontendTunnelUrl) {
    Write-Host "  ACESSO PUBLICO (Cloudflare Tunnel):" -ForegroundColor White
    Write-Host ""
    Write-Host "    >>> " -NoNewline -ForegroundColor Yellow
    Write-Host $frontendTunnelUrl -ForegroundColor Magenta
    Write-Host ""

    if ($apiTunnelUrl) {
        Write-Host "    API: $apiTunnelUrl" -ForegroundColor DarkGray
    }

    Write-Host ""
    $frontendTunnelUrl | Set-Clipboard
    Write-Host "  (URL copiada para clipboard)" -ForegroundColor DarkGray

    # Abrir navegador
    Start-Process $frontendTunnelUrl
} else {
    Write-Host "  Tunnel ainda carregando..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Servidor rodando. Pressione Ctrl+C para encerrar." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# ============================================================
# Manter rodando
# ============================================================
try {
    while ($true) {
        Start-Sleep -Seconds 10

        # Mostrar URL do frontend se ainda nao temos
        if (-not $frontendTunnelUrl -and (Test-Path $frontendTunnelLog)) {
            $content = Get-Content $frontendTunnelLog -Raw
            if ($content -match "(https://[a-z0-9-]+\.trycloudflare\.com)") {
                $frontendTunnelUrl = $matches[1]
                Write-Host ""
                Write-Host "  URL PUBLICA: $frontendTunnelUrl" -ForegroundColor Magenta
                $frontendTunnelUrl | Set-Clipboard
            }
        }
    }
} finally {
    Write-Host ""
    Write-Host "Encerrando..." -ForegroundColor Yellow

    # Limpar .env.local
    Remove-Item $envFile -Force -ErrorAction SilentlyContinue

    # Parar processos
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($apiTunnelProcess -and -not $apiTunnelProcess.HasExited) {
        Stop-Process -Id $apiTunnelProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendTunnelProcess -and -not $frontendTunnelProcess.HasExited) {
        Stop-Process -Id $frontendTunnelProcess.Id -Force -ErrorAction SilentlyContinue
    }

    # Parar Docker
    docker-compose down 2>&1 | Out-Null

    # Limpar logs
    Remove-Item $apiTunnelLog -Force -ErrorAction SilentlyContinue
    Remove-Item $frontendTunnelLog -Force -ErrorAction SilentlyContinue

    Write-Host "Encerrado!" -ForegroundColor Green
}
