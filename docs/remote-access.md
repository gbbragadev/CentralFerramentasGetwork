# Guia de Acesso Remoto - GetWork Portal

Este guia explica como acessar o GetWork Portal rodando no seu PC Windows para demonstrações e colaboração.

## 📍 Opção 1: Acesso via Rede Local (LAN)

### Passo a passo

1. **Encontre o IP do seu PC:**
   ```cmd
   ipconfig
   ```
   Procure por "Endereço IPv4" na sua conexão ativa (ex: `192.168.1.100`)

2. **Libere as portas no Firewall do Windows:**
   - Abra "Windows Defender Firewall" 
   - Clique em "Configurações avançadas"
   - Em "Regras de Entrada", crie novas regras:
     - Porta 3000 (frontend) - TCP
     - Porta 4000 (API) - TCP

3. **Configure o VITE_API_URL no .env:**
   ```env
   VITE_API_URL=http://192.168.1.100:4000
   ```

4. **Rebuild do frontend:**
   ```bash
   docker-compose up -d --build web
   ```

5. **Compartilhe o acesso:**
   ```
   http://192.168.1.100:3000
   ```

### ⚠️ Limitações
- Funciona apenas na mesma rede Wi-Fi/cabo
- Pode não funcionar em redes corporativas com restrições

---

## 🌐 Opção 2: Cloudflare Tunnel (Recomendado para demos)

Zero Trust tunnel gratuito, HTTPS automático, sem abrir portas.

### Instalação

1. **Baixe o cloudflared:**
   - [Download para Windows](https://github.com/cloudflare/cloudflared/releases)
   - Ou via Chocolatey: `choco install cloudflared`

2. **Crie túneis para frontend e API:**

   **Terminal 1 - Frontend:**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Você receberá uma URL tipo: `https://random-name.trycloudflare.com`

   **Terminal 2 - API:**
   ```bash
   cloudflared tunnel --url http://localhost:4000
   ```
   Você receberá outra URL tipo: `https://another-random.trycloudflare.com`

3. **Atualize o VITE_API_URL:**
   ```env
   VITE_API_URL=https://another-random.trycloudflare.com
   ```

4. **Rebuild do frontend:**
   ```bash
   docker-compose up -d --build web
   ```

5. **Compartilhe a URL do frontend** (a primeira URL gerada)

### ✅ Vantagens
- HTTPS automático
- Funciona de qualquer lugar
- Sem configuração de firewall
- URLs temporárias (bom para demos)

### 📌 Para URLs permanentes
Crie uma conta Cloudflare e configure um túnel nomeado com seu domínio.

---

## 🔒 Opção 3: Tailscale VPN (Recomendado para equipes)

VPN mesh privada, segura e fácil de configurar.

### Setup

1. **Instale o Tailscale:**
   - [Download para Windows](https://tailscale.com/download)
   - Crie uma conta gratuita

2. **Conecte seu PC:**
   - Execute o Tailscale e faça login
   - Seu PC recebe um IP tipo `100.x.x.x`

3. **Configure o .env:**
   ```env
   VITE_API_URL=http://100.x.x.x:4000
   ```

4. **Rebuild do frontend:**
   ```bash
   docker-compose up -d --build web
   ```

5. **Convide colaboradores:**
   - Cada pessoa instala Tailscale
   - Você adiciona à sua tailnet
   - Acesso via `http://100.x.x.x:3000`

### ✅ Vantagens
- Criptografia end-to-end
- Funciona através de NAT/firewall
- Acesso como se estivesse na mesma LAN
- Controle de quem pode acessar

### 🆓 Plano gratuito
- Até 100 dispositivos
- 3 usuários
- Perfeito para pequenas equipes

---

## 🚀 Opção 4: ngrok (Alternativa rápida)

Similar ao Cloudflare Tunnel, mas com limites no plano gratuito.

### Setup

1. **Instale o ngrok:**
   ```bash
   # Windows via Chocolatey
   choco install ngrok
   
   # Ou baixe de https://ngrok.com/download
   ```

2. **Crie conta gratuita** em https://ngrok.com

3. **Configure o authtoken:**
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

4. **Crie os túneis:**
   ```bash
   # Terminal 1: Frontend
   ngrok http 3000
   
   # Terminal 2: API
   ngrok http 4000
   ```

5. **Atualize VITE_API_URL e rebuild**

### ⚠️ Limitações do plano gratuito
- URLs mudam a cada reinício
- Taxa limitada de requests
- Aviso de página do ngrok para visitantes

---

## 📋 Resumo: Qual escolher?

| Cenário | Recomendação |
|---------|--------------|
| Demo rápida (1-2 horas) | Cloudflare Tunnel |
| Equipe fixa | Tailscale |
| Mesma rede local | LAN direto |
| Teste rápido | ngrok |

---

## 🔧 Troubleshooting

### API não conecta
1. Verifique se o VITE_API_URL está correto
2. Teste a API diretamente: `curl http://localhost:4000/health`
3. Verifique logs: `docker-compose logs api`

### CORS errors
- Certifique-se que o backend permite a origem do túnel
- A API já está configurada para aceitar qualquer origem no MVP

### Túnel não funciona
- Verifique sua conexão com internet
- Tente reiniciar o túnel
- Verifique se não há firewall bloqueando

### Frontend mostra "localhost"
- O VITE_API_URL é configurado em tempo de build
- Após mudar, faça rebuild: `docker-compose up -d --build web`
