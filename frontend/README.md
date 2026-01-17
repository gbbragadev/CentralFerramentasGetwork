# 🎨 Central de Ferramentas — Frontend

Frontend profissional e moderno para o portal de gerenciamento de ferramentas Forbiz & GetWork.

## 🚀 Tecnologias

- **React 18** com TypeScript
- **Vite** para build e dev server
- **React Router** para navegação
- **TailwindCSS** para estilização
- **Lucide React** para ícones
- **Sonner** para notificações toast

## 📋 Requisitos

- Node.js 18+ ou superior
- pnpm (recomendado) ou npm

## 🔧 Instalação

```bash
# Instalar dependências
pnpm install
# ou
npm install
```

## ⚙️ Configuração

### Desenvolvimento Local (Padrão)

O frontend detecta automaticamente o ambiente. Para desenvolvimento local, não precisa configurar nada:

```bash
npm run dev
```

### Configuração Manual (Opcional)

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

2. Configure conforme necessário:

```env
# Deixe vazio para detecção automática (recomendado)
VITE_API_URL=

# Ou defina explicitamente:
VITE_API_URL=http://localhost:4000
```

## 🏃 Scripts de Deploy

Criamos scripts para facilitar o deploy em diferentes ambientes:

### Windows (PowerShell)

```powershell
# Desenvolvimento local
.\scripts\deploy.ps1 local

# Cloudflare Tunnel (teste)
.\scripts\deploy.ps1 tunnel

# Build de produção
.\scripts\deploy.ps1 production
```

### Linux/Mac

```bash
# Desenvolvimento local
./scripts/deploy.sh local

# Cloudflare Tunnel (teste)
./scripts/deploy.sh tunnel

# Build de produção
./scripts/deploy.sh production
```

## 🌐 Cloudflare Tunnel

O frontend suporta automaticamente o Cloudflare Tunnel para expor o projeto na internet sem IP fixo.

### Como funciona a detecção automática

O `api/client.ts` detecta o ambiente automaticamente:

1. **VITE_API_URL definida** → Usa a URL configurada
2. **localhost** → Usa `http://localhost:4000`
3. **\*.trycloudflare.com** → Usa `api-*.trycloudflare.com`
4. **Domínio customizado** → Usa `api.{domínio}`

### Exemplo com Cloudflare Tunnel

Se seu frontend está em:
```
https://getwork-portal.trycloudflare.com
```

A API será detectada automaticamente em:
```
https://api-getwork-portal.trycloudflare.com
```

### Configuração do Túnel

1. Instale o cloudflared:
```powershell
winget install Cloudflare.cloudflared
```

2. Inicie túneis para frontend e API:
```powershell
# Terminal 1: Frontend
cloudflared tunnel --url http://localhost:5173

# Terminal 2: API
cloudflared tunnel --url http://localhost:4000
```

3. Anote as URLs geradas e configure no `config.yml` do cloudflared.

## 🏗️ Build para Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

## 👀 Preview da Build

```bash
npm run preview
```

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── api/              # Cliente HTTP e tipos da API
│   │   ├── client.ts     # Cliente com detecção automática de ambiente
│   │   ├── types.ts      # Tipos TypeScript da API
│   │   └── seniorx.types.ts # Tipos para integração Senior X
│   ├── auth/             # Autenticação e proteção de rotas
│   ├── components/       # Componentes reutilizáveis
│   ├── layout/           # Layout da aplicação
│   ├── lib/              # Utilitários
│   ├── pages/            # Páginas da aplicação
│   └── routes/           # Configuração de rotas
├── scripts/              # Scripts de deploy
│   ├── deploy.ps1        # Windows
│   └── deploy.sh         # Linux/Mac
├── .env.example          # Exemplo de variáveis
├── .env.local.example    # Exemplo para desenvolvimento
├── .env.production       # Configuração de produção
└── package.json
```

## 📄 Páginas

### Autenticação
- `/login` - Login de usuários
- `/register` - Cadastro de novos usuários
- `/forgot-password` - Recuperação de senha
- `/reset-password` - Redefinição de senha

### Gestão
- `/tenants` - Gerenciamento de clientes
- `/tenants/:id` - Detalhes do tenant (credenciais, WhatsApp)
- `/tenants/:id/products` - Produtos do tenant
- `/products` - Catálogo de produtos

### Automação WhatsApp
- `/sources` - Fontes de dados (Sign, ECM, Custom)
- `/templates` - Templates de mensagem
- `/jobs` - Jobs de envio automático

### Monitoramento
- `/outbox` - Mensagens enviadas
- `/logs` - Logs de execução

### Suporte
- `/docs` - Documentação da API

## 🔐 Autenticação

O sistema utiliza autenticação JWT:

1. Faça login com suas credenciais na página `/login`
2. O token é armazenado no `localStorage`
3. Todas as requisições incluem o token no header `Authorization: Bearer <token>`
4. Se o token expirar, você será redirecionado para login

## 🎨 Design System

- **Cores:** Paleta sóbria com azul como cor primária
- **Tipografia:** Sistema de fontes nativo
- **Espaçamento:** Baseado em múltiplos de 4px
- **Componentes:** Cards, tabelas, modais bem acabados
- **Feedback:** Toasts discretos

## 🐛 Troubleshooting

### Erro de conexão com a API

1. Verifique se a API está rodando
2. Abra o DevTools (F12) e veja o console para a URL detectada
3. Verifique se não há firewall bloqueando

### Erro de CORS

Configure o backend para aceitar requisições da origem do frontend:
```typescript
// No backend Fastify
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
});
```

### Build falha

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Debug da URL da API

O cliente loga a URL detectada no console em desenvolvimento:
```
[API Client] URL detectada: http://localhost:4000
[API Client] Host atual: localhost
```

## 📝 Licença

Proprietário - Forbiz & GetWork

---

**Desenvolvido com ❤️ para Forbiz & GetWork**
