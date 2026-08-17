import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeKeysToRemove,
  runStorageMigrations,
  DEMO_KEYS_WHITELIST,
  MIGRATION_FLAG,
} from './storageMigration';

describe('computeKeysToRemove — purge par liste blanche EXACTE', () => {
  it('retire les clés statiques de démonstration connues', () => {
    const existing = ['cpi_clients_registry_v1', 'cpi_activity_log_v1', 'cpi_banks_seeded_v1'];
    expect(computeKeysToRemove(existing).sort()).toEqual([...existing].sort());
  });

  it('retire les clés par client UNIQUEMENT pour les identifiants démo documentés', () => {
    const existing = [
      'cpi_docs_v4_c-aissatou',   // démo → retiré
      'cpi_history_v4_c-mamadou', // démo → retiré
      'cpi_docs_v4_c-real-xyz',   // id inconnu → conservé
      'cpi_docs_v4_',             // sans id → conservé
    ];
    expect(computeKeysToRemove(existing).sort()).toEqual(
      ['cpi_docs_v4_c-aissatou', 'cpi_history_v4_c-mamadou'].sort(),
    );
  });

  it('CONSERVE une clé étrangère proche (cpi_future_valid_data)', () => {
    expect(computeKeysToRemove(['cpi_future_valid_data'])).toEqual([]);
    expect(DEMO_KEYS_WHITELIST.has('cpi_future_valid_data')).toBe(false);
  });

  it("CONSERVE une clé appartenant à une autre application", () => {
    const foreign = ['other_app_session', 'analytics_id', 'theme', 'cpiXYZ_not_ours'];
    expect(computeKeysToRemove(foreign)).toEqual([]);
  });

  it('ne retire jamais le drapeau de version dédié', () => {
    expect(computeKeysToRemove([MIGRATION_FLAG])).toEqual([]);
    expect(MIGRATION_FLAG).toBe('mon_espace_storage_migration_v1');
  });
});

// ─── Mock localStorage minimal (isolé, aucune dépendance jsdom) ────────────────
function makeLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    _store: store,
  };
}

describe('runStorageMigrations — sûr, ciblé, idempotent', () => {
  beforeEach(() => {
    (globalThis as any).window = { localStorage: makeLocalStorageMock() };
  });

  it("purge les clés démo mais laisse INTACTES les clés étrangères, et pose le drapeau", () => {
    const ls = (globalThis as any).window.localStorage;
    ls.setItem('cpi_clients_registry_v1', '[]');       // démo → retiré
    ls.setItem('cpi_docs_v4_c-aissatou', '{}');        // démo → retiré
    ls.setItem('cpi_future_valid_data', 'IMPORTANT');  // étranger → conservé
    ls.setItem('other_app_session', 'xyz');            // autre app → conservé

    const removed = runStorageMigrations();

    expect(removed).toBe(2);
    expect(ls.getItem('cpi_clients_registry_v1')).toBeNull();
    expect(ls.getItem('cpi_docs_v4_c-aissatou')).toBeNull();
    expect(ls.getItem('cpi_future_valid_data')).toBe('IMPORTANT'); // intacte
    expect(ls.getItem('other_app_session')).toBe('xyz');            // intacte
    expect(ls.getItem(MIGRATION_FLAG)).toBe('done');
  });

  it('est idempotent : un 2ᵉ appel ne retire rien', () => {
    const ls = (globalThis as any).window.localStorage;
    ls.setItem('cpi_activity_log_v1', '[]');
    expect(runStorageMigrations()).toBe(1);
    ls.setItem('cpi_staff_registry_v1', '[]'); // rajoutée après coup
    expect(runStorageMigrations()).toBe(0);     // drapeau déjà posé → no-op
    expect(ls.getItem('cpi_staff_registry_v1')).toBe('[]'); // non touchée
  });
});
