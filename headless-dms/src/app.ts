// src/app.ts
import Fastify from 'fastify';
import authRoutes from './auth/auth.routes';
import documentsRoutes from './documents/documents.routes';

const app = Fastify({ logger: true });

// Health check route
app.get('/ping', async (request, reply) => {
  return { pong: 'it works!' };
});

app.register(documentsRoutes);

// Start server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Server listening on http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

app.register(authRoutes);
start();
