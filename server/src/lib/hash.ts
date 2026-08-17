import { argon2id, argon2Verify } from 'hash-wasm';
import { randomBytes } from 'node:crypto';

// Paramètres Argon2id alignés sur les recommandations OWASP (dev/prod raisonnable).
const ARGON2_OPTS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 19456, // ~19 Mio
  hashLength: 32,
  outputType: 'encoded' as const, // chaîne auto-descriptive $argon2id$...
};

/** Hache un mot de passe avec Argon2id (sel aléatoire par mot de passe). */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({ password, salt: randomBytes(16), ...ARGON2_OPTS });
}

/** Vérifie un mot de passe contre un hash encodé Argon2id. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}
