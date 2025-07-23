export function requireRole(...roles: string[]) {
  return (request: any, reply: any, done: any) => {
    const user = request.user;
    if (!user || !roles.includes(user.role)) {
      reply.code(403).send({ error: 'You do not have permission (role) for this resource' });
      return;
    }
    done();
  };
}
