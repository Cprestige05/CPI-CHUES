/**
 * storageMigration — nettoyage LOCAL, ciblé et versionné du stockage du projet.
 *
 * Règles de sécurité (STRICTES) :
 *  - Aucune suppression générique : PAS de `key.startsWith('cpi_')`, PAS de regex globale
 *    sur `cpi_*`, PAS de `localStorage.clear()`.
 *  - On ne retire QUE des clés figurant dans une LISTE BLANCHE EXACTE de clés de
 *    démonstration/test connues et documentées.
 *  - Toute clé inconnue (autre application, future clé valide comme `cpi_future_valid_data`)
 *    reste TOUJOURS intacte.
 *  - Journalisation : uniquement le NOMBRE de clés retirées, jamais leur contenu.
 *  - Idempotent et versionné via un drapeau dédié `mon_espace_storage_migration_v1`.
 */

// Drapeau de version dédié au projet (jamais purgé).
export const MIGRATION_FLAG = 'mon_espace_storage_migration_v1';

// Identifiants clients de démonstration documentés (anciens).
const DEMO_CLIENT_IDS = ['c-aissatou', 'c-mamadou', 'c-fatou', 'c-ibrahim'] as const;

// Préfixes des clés par client — format documenté exact : `<prefixe><idClientDémo>`.
const PER_CLIENT_PREFIXES = [
  'cpi_docs_v4_',
  'cpi_history_v4_',
  'cpi_etape_v4_',
  'cpi_cpidocs_',
  'cpi_cpihistory_',
  'cpi_demande_v1_',
] as const;

// Clés statiques de démonstration/test (valeurs exactes).
const STATIC_DEMO_KEYS = [
  'cpi_clients_registry_v1',
  'cpi_staff_registry_v1',
  'cpi_activity_log_v1',
  'cpi_chantier_all_state',
  'cpi_chantier_aissatou_state',
  'cpi_decaissements_v1',
  'cpi_banks_registry_v1',
  'cpi_bank_assign_v1',
  'cpi_banks_seeded_v1',
  'cpi_demo_cpi_docs',
  'cpi_demo_cpi_history',
] as const;

/**
 * Liste blanche EXACTE des anciennes clés de démonstration à purger.
 * = clés statiques + (préfixes par client × identifiants clients démo documentés).
 * Aucune clé n'y figure « par préfixe » : ce sont toutes des chaînes complètes.
 */
export const DEMO_KEYS_WHITELIST: ReadonlySet<string> = new Set<string>([
  ...STATIC_DEMO_KEYS,
  ...PER_CLIENT_PREFIXES.flatMap(prefix => DEMO_CLIENT_IDS.map(id => `${prefix}${id}`)),
]);

/**
 * Fonction PURE (testable) : parmi les clés existantes, ne retourne QUE celles dont la
 * valeur correspond EXACTEMENT à une entrée de la liste blanche. Toute clé inconnue est
 * ignorée (jamais retournée) — y compris des clés proches comme `cpi_future_valid_data`
 * ou `cpi_docs_v4_c-inconnu`.
 */
export function computeKeysToRemove(
  existingKeys: readonly string[],
  whitelist: ReadonlySet<string> = DEMO_KEYS_WHITELIST,
): string[] {
  return existingKeys.filter(key => whitelist.has(key));
}

/**
 * Exécute la migration une seule fois (garde le drapeau de version).
 * Retourne le nombre de clés retirées. Ne journalise que ce nombre, jamais le contenu.
 */
export function runStorageMigrations(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const ls = window.localStorage;

    if (ls.getItem(MIGRATION_FLAG) === 'done') return 0;

    // Snapshot des clés existantes (lecture seule) → décision par fonction pure.
    const existing: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k) existing.push(k);
    }

    const toRemove = computeKeysToRemove(existing);
    for (const key of toRemove) ls.removeItem(key);

    ls.setItem(MIGRATION_FLAG, 'done');

    if (import.meta.env.DEV && toRemove.length > 0) {
      // NOMBRE uniquement — jamais le contenu des clés.
      console.info(`[storageMigration] ${toRemove.length} ancienne(s) clé(s) de démonstration retirée(s).`);
    }
    return toRemove.length;
  } catch {
    return 0;
  }
}
