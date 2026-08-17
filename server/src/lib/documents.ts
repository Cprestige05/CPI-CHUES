// Sécurité documentaire : contrôle du type MIME RÉEL (magic bytes), formats autorisés,
// et validation du nom d'origine (doubles extensions / chemins malveillants).

interface AllowedType {
  mime: string;
  ext: string;
  magic: number[][]; // signatures possibles (octets de tête)
}

export const ALLOWED_TYPES: AllowedType[] = [
  { mime: 'application/pdf', ext: 'pdf', magic: [[0x25, 0x50, 0x44, 0x46]] }, // %PDF
  { mime: 'image/jpeg', ext: 'jpg', magic: [[0xff, 0xd8, 0xff]] },
  { mime: 'image/png', ext: 'png', magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
];

export const ALLOWED_LABEL = 'PDF, JPG, JPEG, PNG';

/** Détecte le type MIME RÉEL à partir des octets. `null` si non autorisé. */
export function sniffMime(buf: Buffer): { mime: string; ext: string } | null {
  for (const t of ALLOWED_TYPES) {
    for (const sig of t.magic) {
      if (buf.length >= sig.length && sig.every((b, i) => buf[i] === b)) {
        return { mime: t.mime, ext: t.ext };
      }
    }
  }
  return null;
}

/**
 * Valide le nom d'origine : refuse chemins, octets nuls, « .. », noms trop longs,
 * et doubles extensions potentiellement exécutables. (Le fichier est de toute façon
 * stocké sous un nom interne aléatoire — ceci est une défense en profondeur.)
 */
export function isSafeOriginalName(name: string): boolean {
  if (!name || name.length > 200) return false;
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) return false;
  if (name.includes('..')) return false;
  if (/\.(php|phtml|exe|sh|bat|cmd|js|mjs|cjs|html?|svg|jar|com|dll)(\.|$)/i.test(name)) return false;
  return true;
}
