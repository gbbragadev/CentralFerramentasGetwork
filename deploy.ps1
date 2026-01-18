Write-Host "Iniciando deploy do projeto..." -ForegroundColor Cyan

Write-Host "Atualizando repositorio (main)..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no git pull" -ForegroundColor Red
    Pause
    exit 1
}

Write-Host "Entrando na pasta frontend..." -ForegroundColor Yellow
cd frontend

Write-Host "Instalando dependencias..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no npm install" -ForegroundColor Red
    Pause
    exit 1
}

Write-Host "Gerando build do frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no npm run build" -ForegroundColor Red
    Pause
    exit 1
}

cd ..

Write-Host "Parando containers Docker..." -ForegroundColor Yellow
docker-compose down

Write-Host "Subindo containers Docker (build)..." -ForegroundColor Yellow
docker-compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao subir containers Docker" -ForegroundColor Red
    Pause
    exit 1
}

cd frontend

Write-Host "Abrindo aplicacao em http://localhost:3000" -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "Iniciando npm run dev..." -ForegroundColor Green
npm run dev

Pause
