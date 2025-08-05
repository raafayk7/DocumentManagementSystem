import { FastifyRequest, FastifyReply } from 'fastify';

export const requireRole = (requiredRole: 'user' | 'admin') => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user; // Now properly typed from the module declaration
    
    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    if (user.role !== requiredRole && user.role !== 'admin') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
};
