import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp, jeton } from './outils';

describe("US7 – Scanner un billet à l'entrée", () => {
  let app: INestApplication;
  let db: DataSource;
  let admin: string;
  let client: string;
  let code: string;
  let seanceId: number;

  /** Réserve et paie 2 places pour une séance, renvoie le code du billet. */
  async function acheterBillet(idSeance: number, index: number) {
    const plan = await request(app.getHttpServer()).get(`/api/seances/${idSeance}/plan`);
    const placeIds = plan.body.rangees[index].places.slice(0, 2).map((p: { id: number }) => p.id);
    const { body } = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${client}`)
      .send({ seanceId: idSeance, placeIds })
      .expect(201);
    const paiement = await request(app.getHttpServer())
      .post(`/api/reservations/${body.id}/paiement`)
      .set('Authorization', `Bearer ${client}`)
      .send({ moyen: 'carte', jetonPaiement: 'tok_visa' })
      .expect(200);
    return paiement.body.codeBillet as string;
  }

  /** Crée une salle de test vide et une séance qui commence dans quelques minutes (contrôle ouvert). */
  async function seanceDansMinutes(nomSalle: string, minutes: number) {
    const [{ id: salleId }] = await db.query(
      'INSERT INTO salle (nom, capacite) VALUES ($1, 40) RETURNING id',
      [nomSalle],
    );
    await db.query(
      `INSERT INTO place (salle_id, rangee, numero)
       SELECT $1, CHR(65 + (n - 1) / 20), (n - 1) % 20 + 1 FROM generate_series(1, 40) n`,
      [salleId],
    );
    const [{ id }] = await db.query(
      `INSERT INTO seance (film_id, salle_id, debut, fin, prix, langue, quota_guichet)
       SELECT 1, $1, d, d + interval '2 hours', 9.50, 'VF', 4
       FROM (SELECT (now() AT TIME ZONE 'Europe/Paris') + make_interval(mins => $2) AS d) x
       RETURNING id`,
      [salleId, minutes],
    );
    return id as number;
  }

  const scanner = (c: string, token = admin) =>
    request(app.getHttpServer())
      .post('/api/billets/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: c });

  beforeAll(async () => {
    ({ app, db } = await demarrerApp());
    admin = await jeton(app, 'admin@legrandcinema.fr');
    client = await jeton(app, 'client@legrandcinema.fr');
    seanceId = await seanceDansMinutes('Salle test 1', 30);
    code = await acheterBillet(seanceId, 0);
  });
  afterAll(() => app.close());

  it('un client ne peut pas scanner de billet (403)', async () => {
    const res = await scanner(code, client).expect(403);
    expect(res.body.message).toBe('Accès réservé.');
  });

  it('accepte le billet une première fois et donne les places', async () => {
    const res = await scanner(code).expect(200);
    expect(res.body).toMatchObject({
      valide: true,
      film: 'Le Dernier Accord',
      salle: 'Salle test 1',
      places: ['A1', 'A2'],
    });
  });

  it('refuse le même billet une deuxième fois (409)', async () => {
    const res = await scanner(code).expect(409);
    expect(res.body.message).toMatch(/^Billet déjà utilisé à \d{2}:\d{2}/);
  });

  it('le suivi en direct compte les entrées', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/admin/seances/${seanceId}/direct`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(res.body.entrees).toBe(2);
  });

  it('refuse un billet inconnu (404)', async () => {
    const res = await scanner('LGC-inexistant').expect(404);
    expect(res.body.message).toBe('Billet inconnu : entrée refusée.');
  });

  it('refuse un billet pour une séance dans plusieurs jours (400)', async () => {
    const [{ id }] = await db.query(
      `SELECT id FROM seance WHERE debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 6 ORDER BY id LIMIT 1`,
    );
    const autreCode = await acheterBillet(id, 1);
    const res = await scanner(autreCode).expect(400);
    expect(res.body.message).toContain('trop tôt');
  });

  it('deux scans simultanés du même billet : une seule entrée acceptée', async () => {
    const id = await seanceDansMinutes('Salle test 2', 10);
    const codePartage = await acheterBillet(id, 0);
    const statuts = (
      await Promise.all([scanner(codePartage), scanner(codePartage), scanner(codePartage)])
    ).map((r) => r.status);
    expect(statuts.filter((s) => s === 200)).toHaveLength(1);
    expect(statuts.filter((s) => s === 409)).toHaveLength(2);
  });
});
