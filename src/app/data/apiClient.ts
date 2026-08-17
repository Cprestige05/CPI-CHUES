/**
 * Client API centralisé du portail « Mon Espace ».
 *
 * - Cible le NOUVEAU backend indépendant via `VITE_API_URL` (défaut `/api`, proxifié
 *   vers http://127.0.0.1:8787 par Vite). Aucune référence à l'ancien système (:8090, /pb).
 * - `credentials: 'include'` → l'authentification repose sur un cookie HttpOnly.
 *   AUCUN token n'est stocké dans localStorage/sessionStorage.
 * - Gestion uniforme des réponses JSON et des erreurs (réseau, validation, 401/403/409/413/422/429).
 */

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api').replace(/\/$/, '');

export interface FieldIssue { path: string; message: string }

export class ApiError extends Error {
  status: number;
  code: string;
  issues?: FieldIssue[];
  constructor(status: number, code: string, message: string, issues?: FieldIssue[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

function defaultMessage(status: number): string {
  switch (status) {
    case 0: return 'Serveur indisponible. Vérifiez votre connexion et réessayez.';
    case 400: return 'Requête invalide.';
    case 401: return 'Vous devez être connecté.';
    case 403: return 'Action non autorisée.';
    case 404: return 'Ressource introuvable.';
    case 409: return 'Conflit — cette action n\'est pas possible en l\'état.';
    case 413: return 'Fichier trop volumineux.';
    case 415: return 'Format de fichier non autorisé.';
    case 422: return 'Données invalides.';
    case 429: return 'Trop de tentatives. Réessayez plus tard.';
    default: return status >= 500 ? 'Erreur interne du serveur.' : 'Une erreur est survenue.';
  }
}

async function handle(res: Response): Promise<any> {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? 'error', body?.message ?? defaultMessage(res.status), body?.issues);
  }
  return body;
}

async function request(method: string, path: string, data?: unknown): Promise<any> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: data !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', defaultMessage(0)); // erreur réseau (serveur down…)
  }
  return handle(res);
}

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, data?: unknown) => request('POST', path, data ?? {}),
  patch: (path: string, data?: unknown) => request('PATCH', path, data ?? {}),
  del: (path: string) => request('DELETE', path),

  /** Téléversement multipart (le navigateur fixe lui-même le Content-Type/boundary). */
  async upload(path: string, form: FormData): Promise<any> {
    let res: Response;
    try {
      res = await fetch(BASE + path, { method: 'POST', credentials: 'include', body: form });
    } catch {
      throw new ApiError(0, 'network', defaultMessage(0));
    }
    return handle(res);
  },
};

/** Message utilisateur clair à partir d'une erreur quelconque. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return defaultMessage(0);
}
