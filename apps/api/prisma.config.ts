import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 ya no carga .env por sí solo. En Docker las variables vienen del compose;
// en desarrollo local se lee el .env de la raíz del monorepo si existe.
if (!process.env.DATABASE_URL && existsSync('../../.env')) {
  process.loadEnvFile('../../.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
