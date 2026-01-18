// ============================================================
// Products Routes (Placeholder)
// ============================================================
// Este endpoint é um placeholder para a funcionalidade de produtos
// que será implementada futuramente.

import { FastifyInstance } from 'fastify';
import { success } from '../lib/response.js';

export async function productsRoutes(app: FastifyInstance) {
  // Middleware de autenticação
  app.addHook('preHandler', app.authenticate as any);

  // GET /products - Listar todos os produtos
  app.get('/', async () => {
    // TODO: Implementar quando a tabela de produtos existir
    return success([]);
  });

  // GET /products/:id - Buscar produto por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    // TODO: Implementar quando a tabela de produtos existir
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Produto não encontrado',
      },
    });
  });

  // POST /products - Criar produto
  app.post('/', async (request, reply) => {
    // TODO: Implementar quando a tabela de produtos existir
    return reply.status(501).send({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Funcionalidade de produtos ainda não implementada',
      },
    });
  });
}
