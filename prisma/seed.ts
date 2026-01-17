// ===========================================
// Database Seed
// ===========================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // Criar usuário admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@getwork.com.br';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`👤 Admin já existe: ${adminEmail}`);
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN',
      },
    });

    console.log(`✅ Admin criado: ${adminEmail}`);
    console.log(`   Senha: ${adminPassword}\n`);
  }

  // Criar tenant de exemplo (opcional)
  const demoSlug = 'demo-tenant';
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: demoSlug },
  });

  if (existingTenant) {
    console.log(`🏢 Tenant demo já existe: ${demoSlug}`);
  } else {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Empresa Demo',
        slug: demoSlug,
        metadata: {
          description: 'Tenant para demonstração',
        },
      },
    });

    // Criar credenciais Senior (modo demo)
    await prisma.seniorCredentials.create({
      data: {
        tenantId: tenant.id,
        baseUrl: 'https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform',
        authToken: 'Bearer demo_token_aqui',
        demoMode: true,
      },
    });

    // Criar canal de notificação Mock
    const channel = await prisma.notificationChannel.create({
      data: {
        tenantId: tenant.id,
        type: 'MOCK_WHATSAPP',
        enabled: true,
      },
    });

    // Criar regra de exemplo
    const rule = await prisma.rule.create({
      data: {
        tenantId: tenant.id,
        channelId: channel.id,
        name: 'Notificação de Assinatura Pendente',
        description: 'Notifica quando há documentos aguardando assinatura',
        enabled: true,
        seniorEndpointPath: '/sign/queries/listEnvelopes',
        pollStrategy: 'SIMPLE',
        messageTemplate: 'Olá {signerName}! Você tem um documento "{envelopeName}" aguardando sua assinatura. Acesse o Senior X para assinar.',
        recipientStrategy: 'FIELD',
        recipientField: 'signerPhone',
      },
    });

    // Criar agendamento de exemplo
    const schedule = await prisma.schedule.create({
      data: {
        tenantId: tenant.id,
        name: 'Verificação Diária - 9h',
        enabled: true,
        cron: '0 9 * * *', // Todo dia às 9h
        timezone: 'America/Sao_Paulo',
      },
    });

    // Vincular regra ao agendamento
    await prisma.scheduleRule.create({
      data: {
        scheduleId: schedule.id,
        ruleId: rule.id,
      },
    });

    console.log(`✅ Tenant demo criado: ${demoSlug}`);
    console.log(`   Credenciais: Modo Demo ativado`);
    console.log(`   Canal: WhatsApp Mock`);
    console.log(`   Regra: ${rule.name}`);
    console.log(`   Agendamento: ${schedule.name}`);
  }

  console.log('\n✅ Seed concluído!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
