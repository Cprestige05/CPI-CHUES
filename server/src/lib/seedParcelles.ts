import { db } from '../db/index.js';
import { newId, now } from './ids.js';

/**
 * Seed déterministe du catalogue des parcelles : 2500 lots répartis en 482 îlots.
 * Idempotent : ne fait rien si la table `parcelles` contient déjà des lignes.
 * Données générées (démo) — remplaçables plus tard par les vraies parcelles.
 *
 * Répartition : 90 îlots de 6 lots + 392 îlots de 5 lots = 2500 lots.
 * Statuts pondérés (~70% disponible, ~20% réservé, ~10% vendu), déterministes.
 */
export function seedParcelles(): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM parcelles').get() as { n: number }).n;
  if (count > 0) return;

  const t = now();
  const insert = db.prepare(
    'INSERT INTO parcelles (id, reference, ilot, numero_lot, surface, prix, statut, created_at) VALUES (?,?,?,?,?,?,?,?)',
  );
  const statutOf = (k: number): string => {
    const m = k % 10;
    if (m <= 6) return 'disponible'; // 70%
    if (m <= 8) return 'reserve';    // 20%
    return 'vendu';                  // 10%
  };
  const tx = db.transaction(() => {
    let total = 0;
    for (let ilot = 1; ilot <= 482; ilot++) {
      const lotsInIlot = ilot <= 90 ? 6 : 5; // 90*6 + 392*5 = 2500
      for (let numero = 1; numero <= lotsInIlot; numero++) {
        const surface = 150 + ((ilot * 7 + numero * 13) % 15) * 25; // 150 → 500 m²
        const prix = surface * 25_000;                              // 25 000 FCFA/m²
        const reference = `CPI-${String(ilot).padStart(3, '0')}-${String(numero).padStart(2, '0')}`;
        insert.run(newId('lot'), reference, String(ilot), String(numero), `${surface}`, prix, statutOf(ilot + numero), t);
        total++;
      }
    }
    console.log(`[seed] Catalogue parcelles généré : ${total} lots sur 482 îlots.`);
  });
  tx();
}
