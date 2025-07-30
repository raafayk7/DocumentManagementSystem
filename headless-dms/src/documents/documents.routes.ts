import { FastifyInstance } from 'fastify';
import { CreateDocumentSchema } from './dto/documents.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { createDocument, uploadDocument, downloadDocument } from './documents.service';
import { findAllDocuments, findOneDocument, generateDownloadLink } from './documents.service';
import { UpdateDocumentSchema } from './dto/documents.dto';
import { updateDocument, removeDocument } from './documents.service';
import { authenticateJWT } from '../auth/authenticate';
import { requireRole } from '../auth/roleGuard';
import * as dotenv from 'dotenv';
dotenv.config();

export default async function documentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateJWT);

  app.post('/', { preHandler: requireRole('admin') }, async (request, reply) => {
    try {
      const data = zodValidate(CreateDocumentSchema, request.body);
      // TODO: Add authentication/authorization if needed
      const document = await createDocument(data);
      reply.code(201).send(document);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });


  // GET /documents
  app.get('/', async (request, reply) => {
    try {
      const { name, mimeType, from, to, tags, metadata } = request.query as any;
      const docs = await findAllDocuments({ name, mimeType, from, to, tags, metadata });
      reply.send(docs);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  

  // GET /documents/:id
  app.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const doc = await findOneDocument(id);
      reply.send(doc);
    } catch (err: any) {
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  

  // PATCH /documents/:id
  app.patch('/:id',{ preHandler: requireRole('admin') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updateDto = zodValidate(UpdateDocumentSchema, request.body);
      const updated = await updateDocument(id, updateDto);
      reply.send(updated);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // DELETE /documents/:id
  app.delete('/:id',{ preHandler: requireRole('admin') }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await removeDocument(id);
      reply.send(result);
    } catch (err: any) {
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // POST /documents/upload
  app.post('/upload',{ preHandler: requireRole('admin') }, async (request, reply) => {
    try{
      const doc = await uploadDocument(request);
      reply.code(201).send(doc);
    }catch(err:any){
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /documents/:id/download
  app.get('/:id/download', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await downloadDocument(reply,id,false);
    } catch (err: any) {
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });


  // POST /documents/:id/generate-download-link
  app.post('/:id/generate-download-link', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const url = await generateDownloadLink(id);
      reply.send({ url });
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

 // GET /documents/download-link
  app.get('/download-link', async (request, reply) => {
    console.log('Download link route hit!', request.params);
    try {
      const { token } = request.query as { token: string };
      await downloadDocument(reply,token,true);
    } catch (err) {
      console.error('JWT verification error:', err);
      reply.code(403).send({ error: 'Invalid or expired download link' });
    }
  });

}
