import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp, jeton } from './outils';

describe('US4 – Réserver et payer sur mobile', () => {
  let app: INestApplication;
  let db: DataSource;
  let token: string;
  let seanceId: number;

  async function reserver(index: number) {
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    const place = plan.body.rangees[0].places[index].id;
    const res = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ seanceId, placeIds: [place] })
      .expect(201);
    return res.body.id as number;
  }

  beforeAll(async () => {
    ({ app, db } = await demarrerApp());
    token = await jeton(app, 'client@legrandcinema.fr');
    [{ id: seanceId }] = await db.query(
      `SELECT id FROM seance WHERE debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 3 ORDER BY id LIMIT 1`,
    );
  });
  afterAll(() => app.close());

  it('paie avec Apple Pay et reçoit un code de billet', async () => {
    const id = await reserver(0);
    const res = await request(app.getHttpServer())
      .post(`/api/reservations/${id}/paiement`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moyen: 'apple_pay', jetonPaiement: 'tok_visa' })
      .expect(200);
    expect(res.body).toMatchObject({ statut: 'payee', codeBillet: expect.stringMatching(/^LGC-/) });
  });

  it('carte refusée : 402 et la réservation reste en attente', async () => {
    const id = await reserver(1);
    await request(app.getHttpServer())
      .post(`/api/reservations/${id}/paiement`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moyen: 'carte', jetonPaiement: 'tok_chargeDeclined' })
      .expect(402);
    const [r] = await db.query('SELECT statut FROM reservation WHERE id = $1', [id]);
    expect(r.statut).toBe('en_attente');
  });

  it('délai de 15 minutes dépassé : 410', async () => {
    const id = await reserver(2);
    await db.query(
      "UPDATE reservation SET date_reservation = date_reservation - interval '16 minutes' WHERE id = $1",
      [id],
    );
    await request(app.getHttpServer())
      .post(`/api/reservations/${id}/paiement`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moyen: 'google_pay', jetonPaiement: 'tok_visa' })
      .expect(410);
  });

  it('refuse un moyen de paiement inconnu (400)', async () => {
    const id = await reserver(3);
    await request(app.getHttpServer())
      .post(`/api/reservations/${id}/paiement`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moyen: 'cheque', jetonPaiement: 'tok_visa' })
      .expect(400);
  });
});
