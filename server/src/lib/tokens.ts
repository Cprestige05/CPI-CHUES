import { randomToken, sha256, now } from './ids.js';

export interface IssuedToken {
  token: string;      // valeur en clair — transmise à l'utilisateur, jamais stockée
  tokenHash: string;  // hash stocké en base
  expiresAt: number;  // epoch ms
}

/** Crée un jeton aléatoire + son hash + son expiration (heures). */
export function issueToken(ttlHours: number): IssuedToken {
  const token = randomToken(32);
  return { token, tokenHash: sha256(token), expiresAt: now() + ttlHours * 3_600_000 };
}

/** Hash d'un jeton reçu, pour recherche en base (comparaison par hash). */
export function hashToken(token: string): string {
  return sha256(token);
}
