import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:8080'),
  DATABASE_URL: z.string().default('mysql://boveda:boveda@localhost:3306/boveda'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MINIO_ENDPOINT: z.string().url().default('http://localhost:9000'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_VISION_MODEL: z.string().default('llama3.2-vision:11b'),
  OLLAMA_TEXT_MODEL: z.string().default('llama3.2:3b'),
  HEALTH_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Configuración inválida: ${parsed.error.message}`);
  }
  return parsed.data;
}
