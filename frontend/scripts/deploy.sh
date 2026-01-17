#!/bin/bash
# =============================================================================
# Script de Deploy - Central de Ferramentas GetWork
# =============================================================================
# Uso: ./scripts/deploy.sh [ambiente]
# Ambientes: local, tunnel, production
#
# Exemplos:
#   ./scripts/deploy.sh local      # Desenvolvimento local
#   ./scripts/deploy.sh tunnel     # Cloudflare Tunnel (teste)
#   ./scripts/deploy.sh production # Build de produção

set -e

ENVIRONMENT=${1:-local}

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} Deploy - Central de Ferramentas GetWork${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Funções de log
success() { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verifica se está na pasta correta
if [ ! -f "package.json" ]; then
    error "Execute este script na pasta frontend/"
    exit 1
fi

info "Ambiente selecionado: $ENVIRONMENT"
echo ""

case $ENVIRONMENT in
    local)
        info "Configurando para desenvolvimento local..."
        
        # Cria .env.local se não existir
        if [ ! -f ".env.local" ]; then
            if [ -f ".env.local.example" ]; then
                cp .env.local.example .env.local
            else
                cat > .env.local << EOF
VITE_API_URL=http://localhost:4000
VITE_DEBUG=true
EOF
            fi
            success "Arquivo .env.local criado"
        fi
        
        info "Iniciando servidor de desenvolvimento..."
        echo ""
        echo -e "${GREEN}Frontend: http://localhost:5173${NC}"
        echo -e "${YELLOW}API esperada em: http://localhost:4000${NC}"
        echo ""
        echo -e "Pressione Ctrl+C para parar"
        echo ""
        
        npm run dev
        ;;
        
    tunnel)
        info "Configurando para Cloudflare Tunnel..."
        
        # Verifica se cloudflared está instalado
        if ! command -v cloudflared &> /dev/null; then
            error "cloudflared não encontrado!"
            info "Instale com:"
            echo "  - Mac: brew install cloudflared"
            echo "  - Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
            exit 1
        fi
        success "cloudflared encontrado: $(which cloudflared)"
        
        # Build do projeto
        info "Fazendo build do projeto..."
        npm run build
        success "Build concluído!"
        
        # Inicia preview
        info "Iniciando servidor de preview..."
        echo ""
        echo -e "${GREEN}========================================"
        echo -e " Servidor iniciado!"
        echo -e "========================================${NC}"
        echo ""
        echo -e "${YELLOW}1. Em outro terminal, inicie o túnel:${NC}"
        echo "   cloudflared tunnel --url http://localhost:4173"
        echo ""
        echo -e "${YELLOW}2. Copie a URL gerada (ex: https://xxx.trycloudflare.com)${NC}"
        echo ""
        echo -e "${YELLOW}3. Para a API, inicie outro túnel:${NC}"
        echo "   cloudflared tunnel --url http://localhost:4000"
        echo ""
        echo "Pressione Ctrl+C para parar"
        echo ""
        
        npm run preview
        ;;
        
    production)
        info "Fazendo build de produção..."
        
        # Build
        npm run build
        
        success "Build de produção concluído!"
        echo ""
        echo -e "${GREEN}Arquivos gerados em: dist/${NC}"
        echo ""
        echo -e "${YELLOW}Para testar localmente:${NC}"
        echo "  npm run preview"
        echo ""
        echo -e "${YELLOW}Para deploy:${NC}"
        echo "  - Copie a pasta dist/ para seu servidor"
        echo "  - Ou use com Docker (veja docker-compose.yml)"
        echo ""
        
        # Mostra tamanho dos arquivos
        info "Tamanho dos arquivos:"
        ls -lh dist/assets/
        ;;
        
    *)
        error "Ambiente inválido: $ENVIRONMENT"
        echo "Uso: $0 [local|tunnel|production]"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} Concluído!${NC}"
echo -e "${CYAN}========================================${NC}"
