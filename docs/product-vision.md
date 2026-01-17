# 📋 GetWork Portal - Visão do Produto

## Proposta de Valor

**Para:** Consultores e empresas que usam Senior X (RH da Senior Sistemas)

**Que precisam:** Automatizar notificações sobre documentos/eventos pendentes

**O GetWork Portal é:** Uma plataforma SaaS multi-tenant

**Que oferece:** Integração com APIs do Senior X + disparo automático de notificações via WhatsApp

**Diferente de:** Soluções manuais ou customizações internas

**Nosso produto:** Centraliza gestão, oferece idempotência, logs e fácil configuração

---

## Personas

### 1. Administrador GetWork/Forbiz
- Configura tenants (clientes)
- Gerencia credenciais Senior X
- Monitora execuções e logs

### 2. Usuário Final (Cliente)
- Recebe notificações no WhatsApp
- Interage com documentos pendentes

---

## Principais Telas

| Tela | Função |
|------|--------|
| **Login** | Autenticação JWT |
| **Tenants** | CRUD de clientes + credenciais Senior |
| **Regras** | Configurar o que monitorar e como notificar |
| **Agendamentos** | Quando executar as regras (cron) |
| **Outbox** | Ver mensagens enviadas (WhatsApp Simulado) |
| **Logs** | Auditoria de execuções |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| API Senior indisponível | Média | Alto | Retry automático + modo Demo |
| Credenciais Meta indisponíveis | Alta (MVP) | Médio | Mock Provider funcional |
| Duplicação de mensagens | Média | Alto | Idempotência via hash |
| Tokens vazados | Baixa | Crítico | KMS em produção |
| Sobrecarga de requests | Baixa | Médio | Rate limiting por tenant |

---

## Modelo de Dados

### Entidades Principais

```
tenants (1)
  ├── senior_credentials (0..1)
  ├── notification_channels (0..n)
  ├── rules (0..n)
  │     └── outbox_messages (0..n)
  ├── schedules (0..n)
  │     └── schedule_rules (n..m) → rules
  ├── delivery_logs (0..n)
  └── idempotency_keys (0..n)
```

### Campos Essenciais

**tenants**
- id, name, slug, active, createdAt

**senior_credentials**
- tenantId, baseUrl, authToken (criptografado em prod), demoMode

**notification_channels**
- tenantId, type (MOCK_WHATSAPP | META_WHATSAPP), config

**rules**
- tenantId, name, seniorEndpoint, pollingStrategy
- messageTemplate, recipientStrategy, recipientConfig

**schedules**
- tenantId, name, cronExpression, timezone
- lastRunAt, nextRunAt, active

**outbox_messages**
- tenantId, channelType, recipient, content
- status (QUEUED | SENT | DELIVERED | READ | FAILED)
- sentAt, deliveredAt, readAt, failedAt, errorMessage

**delivery_logs**
- tenantId, level (INFO | SUCCESS | WARNING | ERROR)
- message, metadata

**idempotency_keys**
- keyHash (SHA256 de eventId + ruleId + recipient)
- processedAt

---

## Stack Técnica

### Opção A: Node.js (Escolhida para MVP)
- **API:** Fastify + TypeScript
- **Worker:** BullMQ
- **DB:** PostgreSQL + Prisma ORM
- **Cache/Queue:** Redis
- **Frontend:** React + Vite + Tailwind

**Justificativa:** Ecossistema rico, performance, facilidade de deploy

### Opção B: Ruby on Rails (Alternativa)
- **API/Worker:** Rails + Sidekiq
- **DB:** PostgreSQL + ActiveRecord
- **Frontend:** React ou Hotwire

**Justificativa:** Produtividade, convenções, menos código

---

## Backlog MVP

### Sprint 1: Infraestrutura ✅
- [x] Setup Docker Compose
- [x] Schema Prisma
- [x] Seed inicial
- [x] API base (Fastify + JWT)

### Sprint 2: CRUD Básico ✅
- [x] Endpoints de Tenants
- [x] Credenciais Senior
- [x] Endpoints de Rules
- [x] Endpoints de Schedules

### Sprint 3: Worker e Notificações ✅
- [x] Senior Connector (Demo + Real)
- [x] WhatsApp Mock Provider
- [x] BullMQ Scheduler
- [x] Idempotência

### Sprint 4: Frontend ✅
- [x] Login
- [x] Tenants + Credenciais
- [x] Rules
- [x] Schedules
- [x] Outbox
- [x] Logs

### Sprint 5: Documentação ✅
- [x] README
- [x] Remote Access Guide
- [x] Product Vision

---

## Definition of Done

- [ ] Código commitado
- [ ] Docker Compose funcional
- [ ] Testes manuais passando
- [ ] Documentação atualizada
- [ ] Login → Tenant → Rule → Schedule → Outbox funcional

---

## Preparação para Produção

### Multi-tenant
- [x] Isolamento por tenantId em todas queries
- [x] Slug único por tenant

### Versionamento de Conectores
- [x] SeniorConnector como classe
- [x] Interface NotificationProvider

### Feature Flags
- [x] demoMode por tenant
- [ ] Flags globais (Unleash/LaunchDarkly)

### Rate Limiting
- [x] Concurrency no BullMQ
- [ ] API rate limit por tenant

### Segurança
- [x] JWT com expiração
- [x] Bcrypt para senhas
- [ ] KMS para tokens Senior
- [ ] RBAC (roles: admin, viewer)
- [x] Audit logs
