import { FastifyInstance } from 'fastify';
import { CreateDocumentSchema } from './dto/documents.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { createDocument } from './documents.service';

export default async function documentsRoutes(app: FastifyInstance) {
  app.post('/documents', async (request, reply) => {
    try {
      const data = zodValidate(CreateDocumentSchema, request.body);
      // TODO: Add authentication/authorization if needed
      const document = await createDocument(data);
      reply.code(201).send(document);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });
}
