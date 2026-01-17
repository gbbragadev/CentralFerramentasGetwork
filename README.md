# 🔧 Central de Ferramentas — Forbiz & GetWork

Portal SaaS completo para integração com Senior X e notificações via WhatsApp.

## 📋 Estrutura do Projeto

```
CentralFerramentasGetwork/
├── frontend/          # React + Vite + TypeScript + TailwindCSS
├── api/               # Backend Fastify + Prisma
├── prisma/            # Schema e migrations do banco
├── docker-compose.yml # Orquestração dos serviços
└── .env.example       # Variáveis de ambiente
```

## 🚀 Quick Start (3 Passos)

### **1. Obter a senha do banco Supabase**

1. Acesse: https://supabase.com/dashboard/project/ggirtwkivqzoynoqzcuh/settings/database
2. Copie a **senha do banco de dados** (Database Password)
3. Se não lembrar, clique em "Reset database password"

### **2. Configurar variáveis de ambiente**

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env
# Windows: notepad .env
# Linux/Mac: nano .env
```

**Substitua `SUPABASE_DB_PASSWORD` pela senha que você copiou:**

```env
DATABASE_URL="postgresql://postgres.ggirtwkivqzoynoqzcuh:SUPABASE_DB_PASSWORD@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ggirtwkivqzoynoqzcuh:SUPABASE_DB_PASSWORD@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

### **3. Rodar com Docker**

```bash
# Iniciar todos os serviços (API + Worker + Redis)
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Aguardar ~30 segundos para o Prisma criar as tabelas
```

## ✅ Verificar se está funcionando

### **Backend (API)**
- Acesse: http://localhost:4000/health
- Deve retornar: `{"status":"ok"}`

### **Frontend**
- Acesse: http://localhost:3000
- Faça login com:
  - **Email:** guilherme.braga@getwork.com.br
  - **Senha:** Rorono@zor0

## 📦 Serviços

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| **Frontend** | 3000 | Interface React |
| **API** | 4000 | Backend Fastify |
| **Redis** | 6379 | Cache e filas |
| **Supabase** | Externo | Banco PostgreSQL |

## 🛠️ Comandos Úteis

```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Reiniciar serviços
docker-compose restart

# Rebuild após mudanças no código
docker-compose up -d --build

# Parar tudo
docker-compose down

# Parar e remover volumes (limpar dados)
docker-compose down -v
```

## 📱 Frontend

O frontend está na pasta `frontend/`. Para rodar localmente (sem Docker):

```bash
cd frontend
pnpm install
pnpm dev
```

Acesse: http://localhost:3000

**Documentação completa:** [frontend/README.md](./frontend/README.md)

## 🔌 API Endpoints

### **Auth**
- `POST /auth/login` - Login
- `GET /auth/me` - Usuário atual

### **Tenants**
- `GET /tenants` - Listar
- `POST /tenants` - Criar
- `PUT /tenants/:id` - Atualizar
- `DELETE /tenants/:id` - Excluir
- `GET /tenants/:id/senior-credentials` - Credenciais Senior
- `PUT /tenants/:id/senior-credentials` - Atualizar credenciais

### **Regras de Notificação**
- `GET /rules` - Listar
- `POST /rules` - Criar
- `PUT /rules/:id` - Atualizar
- `DELETE /rules/:id` - Excluir
- `POST /rules/:id/test` - Testar regra

### **Agendamentos**
- `GET /schedules` - Listar
- `POST /schedules` - Criar
- `PUT /schedules/:id` - Atualizar
- `DELETE /schedules/:id` - Excluir
- `POST /schedules/:id/trigger` - Executar manualmente

### **Mensagens (Outbox)**
- `GET /outbox` - Listar mensagens
- `GET /outbox/:id` - Buscar
- `GET /outbox/stats/summary` - Estatísticas
- `POST /outbox/:id/retry` - Reprocessar

### **Logs**
- `GET /logs` - Listar
- `GET /logs/:id` - Buscar
- `GET /logs/stats` - Estatísticas

### **Mock (Simulação WhatsApp)**
- `POST /mock/outbox/:id/status` - Simular status de entrega
- `POST /mock/webhook` - Simular webhook
- `GET /mock/send-test?tenantId=xxx` - Enviar mensagem de teste

## 🔒 Credenciais Padrão

### **Usuário Admin**
- **Email:** guilherme.braga@getwork.com.br
- **Senha:** Rorono@zor0

### **Supabase**
- **Project ID:** ggirtwkivqzoynoqzcuh
- **Region:** sa-east-1 (São Paulo)
- **API URL:** https://ggirtwkivqzoynoqzcuh.supabase.co

## 🐛 Problemas Comuns

### **Erro: "Cannot connect to database"**

**Causa:** Senha do banco incorreta no `.env`

**Solução:**
1. Verifique a senha em: https://supabase.com/dashboard/project/ggirtwkivqzoynoqzcuh/settings/database
2. Edite o `.env` com a senha correta
3. Reinicie: `docker-compose restart`

### **Erro: "Port 4000 already in use"**

**Causa:** Outra aplicação está usando a porta 4000

**Solução:**
1. Mude a porta no `docker-compose.yml` (linha 44): `"4001:4000"`
2. Mude no `frontend/.env`: `VITE_API_URL=http://localhost:4001`
3. Reinicie: `docker-compose up -d`

### **Frontend não conecta na API**

**Causa:** API não está rodando ou URL incorreta

**Solução:**
1. Verifique se a API está rodando: `docker-compose ps`
2. Teste a API: http://localhost:4000/health
3. Verifique `frontend/.env`: `VITE_API_URL=http://localhost:4000`

### **Tabelas não foram criadas**

**Causa:** Migrations não rodaram

**Solução:**
```bash
docker-compose exec api npx prisma db push
docker-compose exec api npx prisma db seed
```

## 📚 Documentação Adicional

- [Product Vision](./docs/product-vision.md) - Visão do produto
- [Remote Access](./docs/remote-access.md) - Acesso remoto via ngrok
- [Frontend README](./frontend/README.md) - Documentação do frontend

## 🔐 Segurança

⚠️ **Este é um MVP. Para produção, implemente:**
- Tokens Senior em KMS (não em texto plano)
- HTTPS/TLS obrigatório
- Rate limiting
- CORS restrito
- Logs de auditoria
- Backup automático do banco

## 📄 Licença

Proprietário - Forbiz & GetWork

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs -f api`
2. Verifique o status: `docker-compose ps`
3. Consulte a documentação do Supabase
4. Entre em contato com o time de desenvolvimento

---

**Desenvolvido com ❤️ para Forbiz & GetWork**
