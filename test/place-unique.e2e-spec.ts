import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp } from './outils';

describe('US5 – Garantir une place unique', () => {
  let app: INestApplication;
  let db: DataSource;
  let seanceId: number;
  let placeLibre: number;
  const jetonDe = (id: number) => app.get(JwtService).sign({ sub: id, email: `c${id}@test.fr`, role: 'client' });

  beforeAll(async () => {
    ({ app, db } = await demarrerApp());
    // Une séance de demain soir, et une place libre en ligne sur son plan
    const [s] = await db.query(
      `SELECT id FROM seance WHERE debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 2 ORDER BY id LIMIT 1`,
    );
    seanceId = s.id;
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    placeLibre = plan.body.rangees[0].places[0].id;
    // 20 clients de test
    await db.query(
      `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe_hash)
       SELECT 'Test', 'Client' || n, 'concurrent' || n || '@test.fr', 'x' FROM generate_series(1, 20) n`,
    );
  });
  afterAll(() => app.close());

  it('exige une connexion (401)', async () => {
    await request(app.getHttpServer()).post('/api/reservations').send({ seanceId, placeIds: [placeLibre] }).expect(401);
  });

  it('20 clients réservent la même place au même instant : un seul réussit', async () => {
    const ids: { id: number }[] = await db.query("SELECT id FROM utilisateur WHERE email LIKE 'concurrent%'");
    const reponses = await Promise.all(
      ids.map(({ id }) =>
        request(app.getHttpServer())
          .post('/api/reservations')
          .set('Authorization', `Bearer ${jetonDe(id)}`)
          .send({ seanceId, placeIds: [placeLibre] }),
      ),
    );
    const statuts = reponses.map((r) => r.status);
    expect(statuts.filter((s) => s === 201)).toHaveLength(1);
    expect(statuts.filter((s) => s === 409)).toHaveLength(19);

    const [{ nb }] = await db.query(
      'SELECT COUNT(*)::int AS nb FROM reservation_place WHERE seance_id = $1 AND place_id = $2',
      [seanceId, placeLibre],
    );
    expect(nb).toBe(1);
  });

  it('la place réservée apparaît occupée sur le plan', async () => {
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    expect(plan.body.rangees[0].places[0].statut).toBe('occupee');
  });

  it('transaction : si une place est prise, aucune des autres places n’est réservée', async () => {
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    const autre = plan.body.rangees[0].places[1].id;
    await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${jetonDe(2)}`)
      .send({ seanceId, placeIds: [autre, placeLibre] })
      .expect(409);
    const [{ nb }] = await db.query(
      'SELECT COUNT(*)::int AS nb FROM reservation_place WHERE seance_id = $1 AND place_id = $2',
      [seanceId, autre],
    );
    expect(nb).toBe(0);
  });

  it('refuse une place du guichet et plus de 10 places (400)', async () => {
    const plan = await request(app.getHttpServer()).get(`/api/seances/${seanceId}/plan`);
    const guichet = plan.body.rangees.at(-1).places[0].id;
    await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${jetonDe(2)}`)
      .send({ seanceId, placeIds: [guichet] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${jetonDe(2)}`)
      .send({ seanceId, placeIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] })
      .expect(400);
  });
});
