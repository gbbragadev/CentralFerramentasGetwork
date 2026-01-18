// ============================================================
// Auth Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { success, invalidCredentials, send401, send404, ErrorCodes, apiError } from '../lib/response.js';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const normalizedEmail = body.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return reply.status(409).send(apiError(ErrorCodes.ALREADY_EXISTS, 'Email já cadastrado'));
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    return reply.status(201).send(
      success({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
      })
    );
  });

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !user.active) {
      return reply.status(401).send(invalidCredentials());
    }

    const validPassword = await bcrypt.compare(body.password, user.password);
    if (!validPassword) {
      return reply.status(401).send(invalidCredentials());
    }

    const token = app.jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: '24h' }
    );

    return success({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  // GET /auth/me
  app.get('/me', {
    preHandler: [app.authenticate as any],
  }, async (request, reply) => {
    const decoded = request.user as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) {
      return send404(reply, 'Usuário');
    }

    if (!user.active) {
      return reply.status(401).send(apiError(ErrorCodes.UNAUTHORIZED, 'Usuário desativado'));
    }

    return success(user);
  });
}
