import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from '../../di/container.js';
import { IAuthHandler } from '../../auth/interfaces/IAuthHandler.js';
import { DecodedToken } from '../../auth/interfaces/IAuthHandler.js';

// Extend FastifyRequest to include user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedToken;
  }
}

export const authenticateJWT = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHandler = container.resolve<IAuthHandler>('IAuthHandler');
  
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return reply.code(401).send({ error: 'No token provided' });
  }

  const result = await authHandler.validateToken(token);
  if (result.isErr()) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  request.user = result.unwrap(); // Attach decoded token to request
};
