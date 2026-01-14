# 🔧 Central de Ferramentas — Forbiz & GetWork

Portal completo de gerenciamento de ferramentas e notificações para integração com Senior X e WhatsApp.

## 📦 Estrutura do Projeto

```
CentralFerramentasGetwork/
├── frontend/          # Frontend React + Vite + TypeScript
└── README.md          # Este arquivo
```

## 🚀 Frontend

O frontend é uma aplicação React moderna e profissional para gerenciamento de:

- **Tenants**: Gerenciamento de clientes/empresas
- **Regras**: Configuração de regras de notificação
- **Agendamentos**: Agendamentos cron para execução automática
- **Mensagens**: Visualização de mensagens enviadas (outbox)
- **Logs**: Monitoramento de logs de execução

### Tecnologias

- React 18 + TypeScript
- Vite para build e dev server
- TailwindCSS para estilização
- React Router para navegação
- Lucide React para ícones

### Começar

```bash
cd frontend
pnpm install
pnpm dev
```

Veja o [README do frontend](./frontend/README.md) para mais detalhes.

## 🔌 Backend

O backend deve ser configurado separadamente. Este repositório contém apenas o frontend.

A API deve estar disponível em:
- **Dev local:** http://localhost:4000
- **LAN:** http://SEU_IP:4000

Configure a URL da API no arquivo `.env` do frontend:

```env
VITE_API_URL=http://localhost:4000
```

## 📝 Licença

Proprietário - Forbiz & GetWork

---

**Desenvolvido com ❤️ para Forbiz & GetWork**
