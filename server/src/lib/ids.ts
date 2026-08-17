import { randomBytes, createHash } from 'node:crypto';

/** Horodatage courant en millisecondes (epoch). */
export function now(): number {
  return Date.now();
}

/** Identifiant aléatoire (hex 128 bits), avec préfixe optionnel. */
export function newId(prefix = ''): string {
  return (prefix ? prefix + '_' : '') + randomBytes(16).toString('hex');
}

/** Jeton opaque aléatoire, URL-safe. La valeur en clair n'est JAMAIS stockée en base. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Empreinte SHA-256 (hex). Sert à stocker le HASH des jetons (session/vérif/reset). */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Nom de fichier interne aléatoire et sûr — n'emprunte rien au nom d'origine. */
export function safeStoredName(ext: string): string {
  const cleanExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8);
  return randomBytes(24).toString('hex') + (cleanExt ? '.' + cleanExt : '');
}
