import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp } from './outils';

describe('US16 – Protéger les données (API + PostgreSQL)', () => {
  let app: INestApplication;
  let db: DataSource;

  beforeAll(async () => ({ app, db } = await demarrerApp()));
  afterAll(() => app.close());

  it('inscrit un client et stocke un hash bcrypt, jamais le mot de passe', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/inscription')
      .send({
        nom: 'Durand',
        prenom: 'Paul',
        email: 'paul@exemple.fr',
        motDePasse: 'MotDePasse2026',
      })
      .expect(201);
    expect(res.body.utilisateur).toMatchObject({ email: 'paul@exemple.fr', role: 'client' });
    expect(res.body.utilisateur.motDePasseHash).toBeUndefined();

    const [ligne] = await db.query(
      "SELECT mot_de_passe_hash FROM utilisateur WHERE email = 'paul@exemple.fr'",
    );
    expect(ligne.mot_de_passe_hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('refuse un mot de passe trop faible (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/inscription')
      .send({ nom: 'A', prenom: 'B', email: 'faible@exemple.fr', motDePasse: 'abc' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['Le mot de passe doit contenir au moins 8 caractères.']),
    );
  });

  it('refuse un mot de passe très long, sans ralentir le serveur (400)', async () => {
    const debut = Date.now();
    const res = await request(app.getHttpServer())
      .post('/api/auth/inscription')
      .send({ nom: 'A', prenom: 'B', email: 'long@exemple.fr', motDePasse: 'a'.repeat(50000) })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['Le mot de passe doit contenir au plus 72 caractères.']),
    );
    expect(Date.now() - debut).toBeLessThan(500);
  });

  it('refuse un champ inconnu envoyé par le client, par exemple un rôle admin (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/inscription')
      .send({
        nom: 'A',
        prenom: 'B',
        email: 'pirate@exemple.fr',
        motDePasse: 'MotDePasse2026',
        role: 'admin',
      })
      .expect(400);
  });

  it('connecte le compte de démonstration et donne accès au profil', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/auth/connexion')
      .send({ email: 'client@legrandcinema.fr', motDePasse: 'Studi2026' })
      .expect(200);
    const profil = await request(app.getHttpServer())
      .get('/api/auth/moi')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    expect(profil.body).toMatchObject({ email: 'client@legrandcinema.fr', role: 'client' });
    expect(profil.body.motDePasseHash).toBeUndefined();
  });

  it('refuse le profil sans jeton (401)', async () => {
    await request(app.getHttpServer()).get('/api/auth/moi').expect(401);
  });

  it('supprime le compte : les données personnelles sont anonymisées', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/api/auth/connexion')
      .send({ email: 'paul@exemple.fr', motDePasse: 'MotDePasse2026' })
      .expect(200);
    await request(app.getHttpServer())
      .delete('/api/auth/moi')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    const lignes = await db.query("SELECT 1 FROM utilisateur WHERE email = 'paul@exemple.fr'");
    expect(lignes).toHaveLength(0);
  });

  it('bloque la force brute : au-delà de 5 tentatives par minute, réponse 429', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/auth/connexion')
        .send({ email: 'admin@legrandcinema.fr', motDePasse: 'mauvais' });
    }
    await request(app.getHttpServer())
      .post('/api/auth/connexion')
      .send({ email: 'admin@legrandcinema.fr', motDePasse: 'mauvais' })
      .expect(429);
  });
});
