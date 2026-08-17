import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError, errorMessage } from './apiClient';

/**
 * Tests du client API centralisé (section 14 : cas d'erreur & sécurité).
 * On stub `fetch` : aucun serveur requis, exécution déterministe en env node.
 */

type FakeRes = {
  ok: boolean;
  status: number;
  json?: unknown;
  contentType?: string | null;
};

function mockFetch(res: FakeRes | (() => never)) {
  const f = vi.fn(async () => {
    if (typeof res === 'function') return res(); // permet de throw (erreur réseau)
    return {
      ok: res.ok,
      status: res.status,
      headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? (res.contentType ?? 'application/json') : null) },
      json: async () => res.json,
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', f);
  return f;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('api — requêtes nominales', () => {
  it('GET renvoie le corps JSON et inclut le cookie (credentials: include)', async () => {
    const f = mockFetch({ ok: true, status: 200, json: { ok: true, value: 42 } });
    const out = await api.get('/dossier');
    expect(out).toEqual({ ok: true, value: 42 });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain('/dossier');
    expect((init as RequestInit).credentials).toBe('include');
  });

  it('POST sérialise le corps en JSON avec le bon Content-Type', async () => {
    const f = mockFetch({ ok: true, status: 200, json: { ok: true } });
    await api.post('/auth/login', { email: 'a@b.sn', password: 'x' });
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.sn', password: 'x' });
  });
});

describe('api — mapping des erreurs vers des messages FR clairs', () => {
  const cases: [number, string][] = [
    [401, 'Vous devez être connecté.'],
    [403, 'Action non autorisée.'],
    [409, "Conflit — cette action n'est pas possible en l'état."],
    [413, 'Fichier trop volumineux.'],
    [415, 'Format de fichier non autorisé.'],
    [422, 'Données invalides.'],
    [429, 'Trop de tentatives. Réessayez plus tard.'],
    [500, 'Erreur interne du serveur.'],
  ];
  for (const [status, msg] of cases) {
    it(`HTTP ${status} → ApiError avec message par défaut`, async () => {
      mockFetch({ ok: false, status, json: null });
      await expect(api.get('/x')).rejects.toMatchObject({ status, message: msg });
    });
  }

  it('privilégie le message renvoyé par le serveur si présent', async () => {
    mockFetch({ ok: false, status: 409, json: { error: 'email_taken', message: 'Cette adresse e-mail est déjà utilisée.' } });
    await expect(api.post('/auth/register', {})).rejects.toMatchObject({
      status: 409, code: 'email_taken', message: 'Cette adresse e-mail est déjà utilisée.',
    });
  });

  it('expose les issues de validation (422) pour l\'affichage par champ', async () => {
    mockFetch({ ok: false, status: 422, json: { error: 'validation', message: 'Données invalides.', issues: [{ path: 'email', message: 'E-mail invalide.' }] } });
    try {
      await api.post('/auth/register', {});
      throw new Error('devait rejeter');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).issues).toEqual([{ path: 'email', message: 'E-mail invalide.' }]);
    }
  });
});

describe('api — serveur indisponible (réseau)', () => {
  it('une exception de fetch devient une ApiError status 0 avec message dédié', async () => {
    mockFetch(() => { throw new TypeError('Failed to fetch'); });
    await expect(api.get('/dossier')).rejects.toMatchObject({
      status: 0, code: 'network', message: 'Serveur indisponible. Vérifiez votre connexion et réessayez.',
    });
  });
});

describe('api.upload — multipart', () => {
  it('n\'impose PAS de Content-Type (boundary géré par le navigateur) et garde credentials', async () => {
    const f = mockFetch({ ok: true, status: 201, json: { ok: true } });
    const form = new FormData();
    const out = await api.upload('/documents', form);
    expect(out).toEqual({ ok: true });
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(init.headers).toBeUndefined();
    expect(init.body).toBe(form);
  });

  it('erreur réseau à l\'upload → ApiError status 0', async () => {
    mockFetch(() => { throw new Error('down'); });
    await expect(api.upload('/documents', new FormData())).rejects.toMatchObject({ status: 0, code: 'network' });
  });
});

describe('errorMessage', () => {
  it('retourne le message d\'une ApiError', () => {
    expect(errorMessage(new ApiError(403, 'forbidden', 'Action non autorisée.'))).toBe('Action non autorisée.');
  });
  it('retombe sur le message réseau pour une erreur inconnue', () => {
    expect(errorMessage(new Error('boom'))).toBe('Serveur indisponible. Vérifiez votre connexion et réessayez.');
  });
});
