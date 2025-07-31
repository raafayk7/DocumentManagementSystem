// src/app.ts
import 'reflect-metadata';
import Fastify from 'fastify';
import authRoutes from './auth/auth.routes.js';
import documentsRoutes from './documents/documents.routes.js';
import fastifyMultipart from '@fastify/multipart';


const app = Fastify({ logger: true });

// Health check route
app.get('/ping', async (request, reply) => {
  return { pong: 'it works!' };
});

app.register(fastifyMultipart, {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB, adjust as needed
});

app.register(documentsRoutes, { prefix: '/documents' });


// Start server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Server listening on http://localhost:3000');
    app.ready(() => {
      console.log(app.printRoutes());
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

app.register(authRoutes);
start();
