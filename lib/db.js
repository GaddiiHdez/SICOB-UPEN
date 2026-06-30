import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['warn', 'error'],
  });
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prismaGlobal ?? prismaClientSingleton();

export default prisma;

// Almacenar singleton en TODOS los entornos para evitar
// agotar el pool de conexiones de PostgreSQL.
globalForPrisma.prismaGlobal = prisma;
