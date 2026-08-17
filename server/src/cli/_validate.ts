// Validateurs simples pour la CLI (sans dépendance externe).

export function emailField_parse(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
    return 'adresse e-mail invalide.';
  }
  return null;
}

export function strongPassword_parse(password: string): string | null {
  if (password.length < 10) return 'mot de passe trop court (10 caractères minimum).';
  if (password.length > 128) return 'mot de passe trop long.';
  if (!/[A-Za-z]/.test(password)) return 'le mot de passe doit contenir une lettre.';
  if (!/\d/.test(password)) return 'le mot de passe doit contenir un chiffre.';
  return null;
}
