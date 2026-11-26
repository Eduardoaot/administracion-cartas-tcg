import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client.js';

export type Db = PrismaClient;

/** Crea el cliente Prisma sobre MySQL 8 usando el adaptador mariadb (requerido en Prisma 7). */
export function createDb(databaseUrl: string): Db {
  const url = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 10,
    // MySQL 8 usa caching_sha2_password; sin TLS hace falta pedir la llave pública.
    allowPublicKeyRetrieval: true,
  });
  return new PrismaClient({ adapter });
}
