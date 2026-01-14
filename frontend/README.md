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

1. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

2. Configure a URL da API no arquivo `.env`:

```env
VITE_API_URL=http://localhost:4000
```

**Nota:** Se a variável `VITE_API_URL` não for definida, o frontend usará `http://localhost:4000` como padrão.

### Configuração para acesso em rede local

Para acessar o frontend de outros dispositivos na mesma rede:

```env
VITE_API_URL=http://SEU_IP:4000
```

Substitua `SEU_IP` pelo endereço IP da máquina onde a API está rodando.

## 🏃 Executar em Desenvolvimento

```bash
pnpm dev
# ou
npm run dev
```

O frontend estará disponível em:
- **Local:** http://localhost:3000
- **Rede:** http://SEU_IP:3000

## 🏗️ Build para Produção

```bash
pnpm build
# ou
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

## 👀 Preview da Build

Após fazer o build, você pode testar a versão de produção localmente:

```bash
pnpm preview
# ou
npm run preview
```

## 📁 Estrutura do Projeto

```
frontend/
├── src/
│   ├── api/              # Cliente HTTP e tipos da API
│   │   ├── client.ts     # Configuração do cliente HTTP
│   │   └── types.ts      # Tipos TypeScript da API
│   ├── auth/             # Autenticação e proteção de rotas
│   │   ├── AuthContext.tsx
│   │   └── ProtectedRoute.tsx
│   ├── components/       # Componentes reutilizáveis
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Table.tsx
│   ├── layout/           # Layout da aplicação
│   │   ├── AppLayout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── lib/              # Utilitários
│   │   └── utils.ts
│   ├── pages/            # Páginas da aplicação
│   │   ├── LoginPage.tsx
│   │   ├── TenantsPage.tsx
│   │   ├── RulesPage.tsx
│   │   ├── SchedulesPage.tsx
│   │   ├── OutboxPage.tsx
│   │   └── LogsPage.tsx
│   ├── routes/           # Configuração de rotas
│   │   └── index.tsx
│   ├── App.tsx           # Componente raiz
│   ├── main.tsx          # Entry point
│   └── index.css         # Estilos globais
├── public/               # Arquivos estáticos
├── .env.example          # Exemplo de variáveis de ambiente
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🔐 Autenticação

O sistema utiliza autenticação JWT:

1. Faça login com suas credenciais na página `/login`
2. O token é armazenado no `localStorage`
3. Todas as requisições para a API incluem o token no header `Authorization: Bearer <token>`
4. Se o token expirar ou for inválido, você será redirecionado para a página de login

### Credenciais Padrão

Use as credenciais configuradas no backend (arquivo `.env` do backend):

```
Email: admin@suaempresa.com.br
Senha: SuaSenhaForte123!
```

## 📄 Páginas

### 1. Login (`/login`)
- Autenticação de usuários
- Validação de credenciais
- Redirecionamento automático se já estiver autenticado

### 2. Tenants (`/tenants`)
- Listar, criar, editar e excluir tenants
- Configurar credenciais Senior para cada tenant
- Filtros e paginação

### 3. Regras (`/rules`)
- Gerenciar regras de notificação
- Configurar providers (MOCK_WHATSAPP, META_WHATSAPP)
- Definir estratégias de polling e templates de mensagem
- Filtrar por tenant

### 4. Agendamentos (`/schedules`)
- Criar e gerenciar agendamentos cron
- Executar manualmente agendamentos
- Configurar timezone
- Filtrar por tenant

### 5. Mensagens (`/outbox`)
- Visualizar mensagens enviadas
- Ver detalhes e metadados
- Simular status de mensagens (apenas MOCK_WHATSAPP)
- Filtrar por tenant e status

### 6. Logs (`/logs`)
- Visualizar logs de execução
- Ver detalhes de erros
- Filtrar por tenant e status

## 🎨 Design System

O frontend segue um design system profissional e clean:

- **Cores:** Paleta sóbria com azul como cor primária
- **Tipografia:** Sistema de fontes nativo do sistema operacional
- **Espaçamento:** Consistente e baseado em múltiplos de 4px
- **Componentes:** Cards, tabelas, modais e formulários bem acabados
- **Feedback:** Toasts discretos para sucesso/erro
- **Estados:** Loading skeletons e empty states

## 🔌 Integração com API

O cliente HTTP está configurado em `src/api/client.ts` e oferece:

- Configuração automática de headers
- Injeção automática do token JWT
- Tratamento de erros padronizado
- Suporte a paginação
- Tipos TypeScript completos

### Exemplo de uso:

```typescript
import { apiClient } from '@/api/client';
import { Tenant } from '@/api/types';

const response = await apiClient.get<Tenant[]>('/tenants');
if (response.data) {
  // Sucesso
  console.log(response.data);
} else if (response.error) {
  // Erro
  console.error(response.error.message);
}
```

## 🐛 Troubleshooting

### Erro de conexão com a API

Verifique se:
1. A API está rodando em `http://localhost:4000`
2. A variável `VITE_API_URL` está configurada corretamente
3. Não há firewall bloqueando a conexão

### Erro de CORS

Se você estiver acessando de uma rede diferente, certifique-se de que o backend está configurado para aceitar requisições da sua origem.

### Build falha

Execute:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

## 📝 Licença

Proprietário - Forbiz & GetWork

---

**Desenvolvido com ❤️ para Forbiz & GetWork**
