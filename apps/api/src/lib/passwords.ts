import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';

// argon2id con parámetros recomendados por OWASP (19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(128, 'La contraseña no puede tener más de 128 caracteres');

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

// Hash fijo para igualar el tiempo de respuesta cuando el correo no existe.
let dummyHash: Promise<string> | undefined;
export async function verifyDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('contraseña-de-relleno-para-tiempos');
  await verifyPassword(await dummyHash, password);
}
