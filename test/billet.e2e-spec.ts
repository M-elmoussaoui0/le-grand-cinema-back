import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp, jeton } from './outils';

describe('US6 – Recevoir un billet QR code', () => {
  let app: INestApplication;
  let db: DataSource;
  let client: string;
  let reservationId: number;

  beforeAll(async () => {
    ({ app, db } = await demarrerApp());
    client = await jeton(app, 'client@legrandcinema.fr');
    const [{ id: seanceId }] = await db.query(
      `SELECT id FROM seance WHERE debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 4 ORDER BY id LIMIT 1`,
    );
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    const placeIds = plan.body.rangees[0].places.slice(0, 2).map((p: { id: number }) => p.id);
    const res = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${client}`)
      .send({ seanceId, placeIds });
    reservationId = res.body.id;
  });
  afterAll(() => app.close());

  it('pas de billet avant le paiement (400)', async () => {
    await request(app.getHttpServer())
      .get(`/api/reservations/${reservationId}/billet`)
      .set('Authorization', `Bearer ${client}`)
      .expect(400);
  });

  it('après paiement, le billet contient le QR code, le film, la salle et les places', async () => {
    await request(app.getHttpServer())
      .post(`/api/reservations/${reservationId}/paiement`)
      .set('Authorization', `Bearer ${client}`)
      .send({ moyen: 'carte', jetonPaiement: 'tok_visa' })
      .expect(200);
    const res = await request(app.getHttpServer())
      .get(`/api/reservations/${reservationId}/billet`)
      .set('Authorization', `Bearer ${client}`)
      .expect(200);
    expect(res.body).toMatchObject({
      codeBillet: expect.stringMatching(/^LGC-/),
      qrCode: expect.stringMatching(/^data:image\/png;base64,/),
      places: ['A1', 'A2'],
    });
  });

  it("un autre client ne peut pas voir ce billet (404)", async () => {
    const admin = await jeton(app, 'admin@legrandcinema.fr');
    await request(app.getHttpServer())
      .get(`/api/reservations/${reservationId}/billet`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(404);
  });
});
