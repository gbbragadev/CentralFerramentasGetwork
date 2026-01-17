# ⚡ Início Rápido - 3 Minutos

## 🎯 O que você precisa fazer

### **1. Pegar a senha do banco Supabase** (1 min)

1. Acesse: https://supabase.com/dashboard/project/ggirtwkivqzoynoqzcuh/settings/database
2. Copie a **Database Password**
3. Se não lembrar, clique em **"Reset database password"**

### **2. Configurar o .env** (1 min)

```bash
# 1. Copiar o arquivo
cp .env.example .env

# 2. Editar (Windows)
notepad .env

# 2. Editar (Linux/Mac)
nano .env
```

**Substitua `SUPABASE_DB_PASSWORD` pela senha:**

```env
DATABASE_URL="postgresql://postgres.ggirtwkivqzoynoqzcuh:SUA_SENHA_AQUI@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ggirtwkivqzoynoqzcuh:SUA_SENHA_AQUI@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

### **3. Rodar** (1 min)

```bash
docker-compose up -d
```

Aguarde ~30 segundos e acesse:

- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000/health

## 🔐 Login

- **Email:** guilherme.braga@getwork.com.br
- **Senha:** Rorono@zor0

---

## ❌ Não está funcionando?

### **Ver logs:**
```bash
docker-compose logs -f api
```

### **Reiniciar:**
```bash
docker-compose restart
```

### **Parar tudo:**
```bash
docker-compose down
```

---

**Pronto! 🎉**

Leia o [README.md](./README.md) completo para mais detalhes.
