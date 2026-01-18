# ============================================================
# GetWork Portal - Script de Desenvolvimento
# ============================================================
# Inicia todos os servicos e cria tunnels Cloudflare
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       GetWork Portal - Iniciando Ambiente Dev" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Diretorio do projeto
$projectDir = $PSScriptRoot
Set-Location $projectDir

# ============================================================
# 1. Iniciar Docker
# ============================================================
Write-Host "[1/4] Iniciando containers Docker..." -ForegroundColor Yellow

$dockerDown = docker-compose down 2>&1
$dockerUp = docker-compose up -d 2>&1
Write-Host "      Docker containers iniciados!" -ForegroundColor Green

# Aguardar API ficar pronta
Write-Host "      Aguardando API ficar pronta..." -ForegroundColor Gray
$maxRetries = 30
$retryCount = 0
do {
    Start-Sleep -Seconds 1
    $retryCount++
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.status -eq "ok") {
            Write-Host "      API pronta!" -ForegroundColor Green
            break
        }
    } catch {}
} while ($retryCount -lt $maxRetries)

if ($retryCount -ge $maxRetries) {
    Write-Host "      AVISO: API nao respondeu em 30s" -ForegroundColor Yellow
}

# ============================================================
# 2. Iniciar Frontend
# ============================================================
Write-Host ""
Write-Host "[2/4] Iniciando frontend..." -ForegroundColor Yellow

$frontendDir = Join-Path $projectDir "frontend"
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$frontendDir`" && npm run dev" -PassThru -WindowStyle Minimized

# Aguardar frontend
Start-Sleep -Seconds 5

# Descobrir porta do frontend
$frontendPort = 5173
for ($port = 5173; $port -le 5180; $port++) {
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("localhost", $port)
        $tcpClient.Close()
        $frontendPort = $port
        break
    } catch {}
}

Write-Host "      Frontend rodando na porta $frontendPort" -ForegroundColor Green

# ============================================================
# 3. Criar Cloudflare Tunnels
# ============================================================
Write-Host ""
Write-Host "[3/4] Criando Cloudflare tunnels..." -ForegroundColor Yellow

# Arquivo para capturar URLs
$tunnelUrlsFile = Join-Path $env:TEMP "getwork-tunnels.txt"
"" | Out-File $tunnelUrlsFile -Encoding UTF8

# Tunnel para API (porta 4000)
$apiTunnelLog = Join-Path $env:TEMP "getwork-api-tunnel.log"
$apiTunnelProcess = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel --url http://localhost:4000" -PassThru -WindowStyle Hidden -RedirectStandardError $apiTunnelLog

# Tunnel para Frontend
$frontendTunnelLog = Join-Path $env:TEMP "getwork-frontend-tunnel.log"
$frontendTunnelProcess = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel --url http://localhost:$frontendPort" -PassThru -WindowStyle Hidden -RedirectStandardError $frontendTunnelLog

Write-Host "      Aguardando tunnels serem criados..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Extrair URLs dos logs
$apiUrl = ""
$frontendUrl = ""

if (Test-Path $apiTunnelLog) {
    $apiLogContent = Get-Content $apiTunnelLog -Raw
    if ($apiLogContent -match "https://[a-z0-9-]+\.trycloudflare\.com") {
        $apiUrl = $matches[0]
    }
}

if (Test-Path $frontendTunnelLog) {
    $frontendLogContent = Get-Content $frontendTunnelLog -Raw
    if ($frontendLogContent -match "https://[a-z0-9-]+\.trycloudflare\.com") {
        $frontendUrl = $matches[0]
    }
}

# ============================================================
# 4. Exibir URLs
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "       GetWork Portal - Ambiente Pronto!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URLs Locais:" -ForegroundColor White
Write-Host "    Frontend:  " -NoNewline; Write-Host "http://localhost:$frontendPort" -ForegroundColor Cyan
Write-Host "    API:       " -NoNewline; Write-Host "http://localhost:4000" -ForegroundColor Cyan
Write-Host ""

if ($apiUrl -or $frontendUrl) {
    Write-Host "  URLs Publicas (Cloudflare Tunnel):" -ForegroundColor White
    if ($frontendUrl) {
        Write-Host "    Frontend:  " -NoNewline; Write-Host $frontendUrl -ForegroundColor Magenta
    }
    if ($apiUrl) {
        Write-Host "    API:       " -NoNewline; Write-Host $apiUrl -ForegroundColor Magenta
    }
    Write-Host ""
    Write-Host "  NOTA: URLs publicas mudam a cada execucao" -ForegroundColor DarkGray
} else {
    Write-Host "  Cloudflare tunnels ainda carregando..." -ForegroundColor Yellow
    Write-Host "  Execute novamente ou verifique os logs em:" -ForegroundColor DarkGray
    Write-Host "    $apiTunnelLog" -ForegroundColor DarkGray
    Write-Host "    $frontendTunnelLog" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Pressione ENTER para encerrar todos os servicos..." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Abrir navegador
if ($frontendUrl) {
    Start-Process $frontendUrl
} else {
    Start-Process "http://localhost:$frontendPort"
}

# Aguardar usuario
Read-Host

# ============================================================
# Encerrar processos
# ============================================================
Write-Host ""
Write-Host "Encerrando servicos..." -ForegroundColor Yellow

if ($frontendProcess -and !$frontendProcess.HasExited) {
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
}
if ($apiTunnelProcess -and !$apiTunnelProcess.HasExited) {
    Stop-Process -Id $apiTunnelProcess.Id -Force -ErrorAction SilentlyContinue
}
if ($frontendTunnelProcess -and !$frontendTunnelProcess.HasExited) {
    Stop-Process -Id $frontendTunnelProcess.Id -Force -ErrorAction SilentlyContinue
}

# Parar Docker
docker-compose down

# Limpar arquivos temporarios
Remove-Item $apiTunnelLog -ErrorAction SilentlyContinue
Remove-Item $frontendTunnelLog -ErrorAction SilentlyContinue

Write-Host "Servicos encerrados!" -ForegroundColor Green
Write-Host ""
