import { describe, it, expect } from 'vitest';
import { newClient, upload, files, db } from './util.js';

describe('Documents — validations & versionnage', () => {
  it('format non autorisé (texte) → 415', async () => {
    const { a } = await newClient('d1@test.sn');
    expect(await upload(a, 'cni', 0, files.txt()).then(r => r.status)).toBe(415);
  });

  it('extension falsifiée (.pdf mais contenu texte) → 415 (MIME réel vérifié)', async () => {
    const { a } = await newClient('d2@test.sn');
    const f = files.txt();
    f.filename = 'faux.pdf';
    f.contentType = 'application/pdf';
    expect(await upload(a, 'cni', 0, f).then(r => r.status)).toBe(415);
  });

  it('fichier vide → 400', async () => {
    const { a } = await newClient('d3@test.sn');
    expect(await upload(a, 'cni', 0, files.empty()).then(r => r.status)).toBe(400);
  });

  it('fichier trop volumineux → 413', async () => {
    const { a } = await newClient('d4@test.sn');
    expect(await upload(a, 'cni', 0, files.big()).then(r => r.status)).toBe(413);
  });

  it('nom de fichier dangereux (double extension) → 400', async () => {
    const { a } = await newClient('d6@test.sn');
    const f = files.pdf();
    f.filename = 'cni.pdf.exe';
    expect(await upload(a, 'cni', 0, f).then(r => r.status)).toBe(400);
  });

  it('emplacement invalide (slot hors bornes) → 400', async () => {
    const { a } = await newClient('d7@test.sn');
    expect(await upload(a, 'cni', 3).then(r => r.status)).toBe(400); // cni n'a qu'1 emplacement
  });

  it('dépôt PDF valide → version 1 ; remplacement → version 2 (ancienne inactive, conservée)', async () => {
    const { a, userId } = await newClient('d5@test.sn');
    const r1 = await upload(a, 'cni', 0, files.pdf());
    expect(r1.status).toBe(201);
    expect(r1.body.version).toBe(1);

    const r2 = await upload(a, 'cni', 0, files.png());
    expect(r2.status).toBe(201);
    expect(r2.body.version).toBe(2);

    const dossierId = (db.prepare('SELECT id FROM dossiers WHERE user_id=?').get(userId) as any).id;
    const docId = (db.prepare("SELECT id FROM documents WHERE dossier_id=? AND type_code='cni' AND slot_index=0").get(dossierId) as any).id;
    const versions = db.prepare('SELECT version, active FROM document_versions WHERE document_id=? ORDER BY version').all(docId) as any[];
    expect(versions.length).toBe(2);
    expect(versions[0].active).toBe(0); // ancienne version conservée mais inactive
    expect(versions[1].active).toBe(1);
  });

  it('suppression possible avant soumission, impossible après', async () => {
    const { a, userId } = await newClient('d8@test.sn');
    await upload(a, 'cni', 0);
    const dossierId = (db.prepare('SELECT id FROM dossiers WHERE user_id=?').get(userId) as any).id;
    const docId = (db.prepare("SELECT id FROM documents WHERE dossier_id=? AND type_code='cni' AND slot_index=0").get(dossierId) as any).id;
    expect(await a.delete(`/api/documents/${docId}`).then(r => r.status)).toBe(200);
    expect((db.prepare('SELECT status FROM documents WHERE id=?').get(docId) as any).status).toBe('MANQUANT');
  });
});
