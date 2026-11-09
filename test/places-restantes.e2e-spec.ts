import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp } from './outils';

describe('US2 – Voir les places restantes', () => {
  let app: INestApplication;
  let db: DataSource;

  beforeAll(async () => ({ app, db } = await demarrerApp()));
  afterAll(() => app.close());

  it("affiche toutes les places d'une séance sans réservation", async () => {
    const res = await request(app.getHttpServer()).get('/api/seances/1').expect(200);
    // Salle 1 : 300 places dont 30 gardées pour le guichet
    expect(res.body.placesRestantes).toEqual({ enLigne: 270, guichet: 30, total: 300, complet: false });
  });

  it('déduit les places réservées et payées', async () => {
    const demain = new Date(Date.now() + 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
    const res = await request(app.getHttpServer()).get('/api/seances').query({ date: demain }).expect(200);
    const [{ vendues }] = await db.query(
      'SELECT COUNT(*)::int AS vendues FROM reservation_place WHERE seance_id = $1',
      [res.body[0].id],
    );
    expect(vendues).toBeGreaterThan(0);
    expect(res.body[0].placesRestantes.total).toBe(res.body[0].salle.capacite - vendues);
  });

  it('ne compte plus une réservation en attente de paiement depuis plus de 15 minutes', async () => {
    const [{ id }] = await db.query(
      `INSERT INTO reservation (utilisateur_id, seance_id, statut, date_reservation)
       VALUES (2, 2, 'en_attente', (now() AT TIME ZONE 'Europe/Paris') - interval '20 minutes') RETURNING id`,
    );
    await db.query(
      `INSERT INTO reservation_place (reservation_id, seance_id, place_id)
       SELECT $1, 2, p.id FROM place p JOIN seance s ON s.salle_id = p.salle_id WHERE s.id = 2 LIMIT 5`,
      [id],
    );
    const res = await request(app.getHttpServer()).get('/api/seances/2').expect(200);
    expect(res.body.placesRestantes.total).toBe(res.body.salle.capacite);
  });
});
