import { describe, it, expect } from 'vitest';
import { newClient, newAdmin, newAgent, uploadAllSeven } from './util.js';

/**
 * Parcours de validation du compte par l'admin + attribution d'un agent CPI.
 * Inscription → e-mail vérifié → (compte NON validé : accès bloqué) → l'admin
 * valide + attribue un agent → le client accède → l'agent voit ce client.
 * L'admin conserve la traçabilité.
 */
describe('Validation compte + attribution agent', () => {
  it('bloque le dossier tant que le compte n\'est pas validé (403 not_approved)', async () => {
    const { a: client } = await newClient('pending@example.test', undefined, { approved: false });
    const r = await client.get('/api/dossier');
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('not_approved');
    // Le dépôt de pièce est aussi bloqué.
    const up = await client.post('/api/documents').field('typeCode', 'cni').field('slotIndex', '0')
      .attach('file', Buffer.from('%PDF-1.4\n%%EOF'), { filename: 'c.pdf', contentType: 'application/pdf' });
    expect(up.status).toBe(403);
  });

  it('admin valide + attribue un agent → le client accède, l\'agent voit son client, traçabilité OK', async () => {
    const { a: client, userId: clientId } = await newClient('toapprove@example.test', undefined, { approved: false });
    const { a: admin } = await newAdmin('approver@example.test');
    const { a: agent, userId: agentId } = await newAgent('agent1@example.test');

    // Le compte apparaît dans la file des comptes en attente.
    const pending = await admin.get('/api/admin/accounts?status=pending');
    expect(pending.status).toBe(200);
    expect(pending.body.accounts.some((c: any) => c.id === clientId && !c.approved)).toBe(true);

    // L'agent apparaît dans la liste des agents.
    const agents = await admin.get('/api/admin/agents');
    expect(agents.body.agents.some((a: any) => a.id === agentId)).toBe(true);

    // Attribution sans agent → refusée.
    const noAgent = await admin.post(`/api/admin/accounts/${clientId}/approve`).send({});
    expect(noAgent.status).toBe(400);

    // Validation + attribution.
    const approve = await admin.post(`/api/admin/accounts/${clientId}/approve`).send({ agentId });
    expect(approve.status).toBe(200);

    // Le client accède désormais à son dossier.
    const dossier = await client.get('/api/dossier');
    expect(dossier.status).toBe(200);

    // Re-valider un compte déjà validé → 409.
    const again = await admin.post(`/api/admin/accounts/${clientId}/approve`).send({ agentId });
    expect(again.status).toBe(409);

    // Le client soumet son dossier → l'agent attribué le voit (et pas les autres agents).
    await uploadAllSeven(client);
    await client.post('/api/dossier/submit');
    const agentList = await agent.get('/api/admin/dossiers');
    expect(agentList.body.dossiers.some((d: any) => d.client.email === 'toapprove@example.test')).toBe(true);

    const { a: otherAgent } = await newAgent('agent2@example.test');
    const otherList = await otherAgent.get('/api/admin/dossiers');
    expect(otherList.body.dossiers.some((d: any) => d.client.email === 'toapprove@example.test')).toBe(false);

    // Traçabilité admin : validation + attribution journalisées.
    const activity = await admin.get('/api/admin/activity');
    const actions = activity.body.activity.map((a: any) => a.action);
    expect(actions).toContain('account_approved');
    expect(actions).toContain('agent_assigned');

    // Le client a été notifié de la validation.
    const notifs = await client.get('/api/notifications');
    expect(notifs.body.notifications.some((n: any) => n.type === 'account_approved')).toBe(true);
  });
});
