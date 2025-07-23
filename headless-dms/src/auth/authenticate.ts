import jwt from 'jsonwebtoken';

export function authenticateJWT(request: any, reply: any, done: any) {
  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    reply.code(401).send({ error: 'No token provided' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      reply.code(403).send({ error: 'Invalid token' });
      return;
    }
    request.user = user;
    done();
  });
}
