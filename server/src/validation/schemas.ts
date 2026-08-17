import { z } from 'zod';

// Identité — accents, apostrophes, traits d'union autorisés ; valeurs manifestement
// invalides rejetées. Espaces superflus retirés.
const nameField = z
  .string()
  .trim()
  .min(2, 'Trop court.')
  .max(60, 'Trop long.')
  .regex(/^[\p{L}][\p{L} '’.-]*$/u, 'Caractères invalides.');

// Téléphone : format sénégalais (77/78/76/70/75…) ou international +… ; normalisé ailleurs.
const phoneField = z
  .string()
  .trim()
  .regex(/^(\+?\d[\d\s.-]{6,17})$/, 'Numéro de téléphone invalide.');

const emailField = z.string().trim().toLowerCase().email('Adresse e-mail invalide.').max(180);

// Mot de passe : longueur minimale sécurisée + au moins une lettre et un chiffre.
const passwordField = z
  .string()
  .min(10, 'Au moins 10 caractères.')
  .max(128, 'Trop long.')
  .regex(/[A-Za-z]/, 'Doit contenir une lettre.')
  .regex(/\d/, 'Doit contenir un chiffre.');

export const registerSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  email: emailField,
  phone: phoneField.optional(),
  password: passwordField,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter les CGU.' }) }),
  acceptMarketing: z.boolean().optional().default(false),
  // `role` volontairement ABSENT — jamais accepté depuis une inscription publique.
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Mot de passe requis.'),
});

export const emailTokenSchema = z.object({ token: z.string().min(10).max(200) });

export const requestResetSchema = z.object({ email: emailField });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordField,
});

export const profileSchema = z.object({
  firstName: nameField.optional(),
  lastName: nameField.optional(),
  phone: phoneField.optional(),
  employer: z.string().trim().max(120).optional(),
  address: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
});

export const uploadMetaSchema = z.object({
  typeCode: z.enum(['cni', 'bulletin', 'releve']),
  slotIndex: z.coerce.number().int().min(0).max(9),
  period: z.string().trim().max(20).optional().default(''),
});

export const reviewReasonSchema = z.object({
  reason: z.string().trim().min(3, 'Motif obligatoire.').max(500),
});

export const dossierFilterSchema = z.object({
  status: z
    .enum(['BROUILLON', 'SOUMIS', 'EN_VERIFICATION', 'VALIDE', 'A_CORRIGER', 'REJETE'])
    .optional(),
  q: z.string().trim().max(120).optional(),
});

/** Normalise un numéro de téléphone (retire espaces/points/tirets ; garde un + initial). */
export function normalizePhone(raw: string): string {
  const t = raw.trim();
  const plus = t.startsWith('+') ? '+' : '';
  return plus + t.replace(/[^\d]/g, '');
}
