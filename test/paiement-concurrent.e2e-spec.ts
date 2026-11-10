import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { PaiementService } from '../src/paiement/paiement.service';
import { demarrerApp, jeton } from './outils';

/**
 * Bug potentiel de la réservation : le paiement vérifie la réservation, débite le client,
 * puis seulement ensuite la passe en « payée ». Entre la vérification et la mise à jour,
 * une deuxième demande de paiement (double appui sur « Payer ») débite une deuxième fois.
 */
describe('Paiement – un double appui sur « Payer » ne doit débiter qu’une fois', () => {
  let app: INestApplication;
  let db: DataSource;
  let token: string;
  let seanceId: number;
  let banque: jest.SpyInstance;

  beforeAll(async () => {
    ({ app, db } = await demarrerApp());
    token = await jeton(app, 'client@legrandcinema.fr');
    [{ id: seanceId }] = await db.query(
      `SELECT id FROM seance WHERE debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 3 ORDER BY id LIMIT 1`,
    );
    // La banque met un peu de temps à répondre, comme un vrai prestataire de paiement
    const paiement = app.get(PaiementService);
    const original = paiement.payer.bind(paiement);
    banque = jest.spyOn(paiement, 'payer').mockImplementation(async (...args) => {
      await new Promise((r) => setTimeout(r, 300));
      return original(...args);
    });
  });
  afterAll(() => app.close());

  it('deux paiements simultanés de la même réservation : un seul débit', async () => {
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    const place = plan.body.rangees[0].places[5].id;
    const { body } = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ seanceId, placeIds: [place] })
      .expect(201);

    const payer = () =>
      request(app.getHttpServer())
        .post(`/api/reservations/${body.id}/paiement`)
        .set('Authorization', `Bearer ${token}`)
        .send({ moyen: 'carte', jetonPaiement: 'tok_visa' });
    const reponses = await Promise.all([payer(), payer()]);

    expect(reponses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(banque).toHaveBeenCalledTimes(1);
  });
});
