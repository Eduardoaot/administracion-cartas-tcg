import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  /** Origen del frontend: único permitido por CORS y por la revisión de Origin. */
  WEB_ORIGIN: z.string().url().default('http://localhost:8080'),
  /** URL pública de la web, usada en los enlaces de los correos. */
  APP_URL: z.string().url().default('http://localhost:8080'),
  /** Prefijo con el que el navegador ve el api (nginx y Vite montan el api en /api). */
  API_PUBLIC_PREFIX: z.string().default('/api'),
  DATABASE_URL: z.string().default('mysql://boveda:boveda@localhost:3306/boveda'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MINIO_ENDPOINT: z.string().url().default('http://localhost:9000'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_VISION_MODEL: z.string().default('qwen3-vl:4b'),
  OLLAMA_TEXT_MODEL: z.string().default('llama3.2:3b'),
  HEALTH_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),

  // --- Auth ---
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** 32 bytes en base64 para cifrar secretos TOTP (AES-256-GCM). */
  MFA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'MFA_ENCRYPTION_KEY: 32 bytes en base64'),
  /** Pepper para el HMAC de los códigos de respaldo. */
  BACKUP_CODE_PEPPER: z.string().min(16),
  COOKIE_SECURE: bool.default(true),
  MAX_FAILED_LOGINS: z.coerce.number().int().positive().default(5),
  LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_ENABLED: bool.default(true),

  // --- Correo ---
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().default('Bóveda TCG <no-reply@boveda.local>'),

  // --- Admin inicial (solo se crea si no existe) ---
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(10).optional(),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${issues}`);
  }
  return parsed.data;
}
