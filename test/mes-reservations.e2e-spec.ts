import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp, jeton } from './outils';

describe('US13 – Retrouver ses réservations', () => {
  let app: INestApplication;
  let db: DataSource;
  let client: string;
  let seanceId: number;
  let reservationId: number;

  beforeAll(async () => {
    ({ app, db } = await demarrerApp());
    client = await jeton(app, 'client@legrandcinema.fr');
    [{ id: seanceId }] = await db.query(
      `SELECT id FROM seance WHERE debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 5 ORDER BY id LIMIT 1`,
    );
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    const res = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${client}`)
      .send({ seanceId, placeIds: [plan.body.rangees[0].places[0].id] });
    reservationId = res.body.id;
    await request(app.getHttpServer())
      .post(`/api/reservations/${reservationId}/paiement`)
      .set('Authorization', `Bearer ${client}`)
      .send({ moyen: 'carte', jetonPaiement: 'tok_visa' });
  });
  afterAll(() => app.close());

  it('liste les réservations du client avec le code du billet', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reservations/moi')
      .set('Authorization', `Bearer ${client}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: reservationId,
      statut: 'payee',
      places: ['A1'],
      annulable: true,
    });
    expect(res.body[0].codeBillet).toMatch(/^LGC-/);
  });

  it("n'affiche pas les réservations des autres clients", async () => {
    const admin = await jeton(app, 'admin@legrandcinema.fr');
    const res = await request(app.getHttpServer())
      .get('/api/reservations/moi')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(res.body).toHaveLength(0);
  });

  it('annule la réservation et libère la place', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${client}`)
      .expect(200);
    expect(res.body).toMatchObject({ statut: 'annulee', rembourse: true });
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    expect(plan.body.rangees[0].places[0].statut).toBe('libre');
  });
});
