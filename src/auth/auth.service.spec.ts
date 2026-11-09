import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService (US16 – protéger les données)', () => {
  const jwt = new JwtService({ secret: 'secret-test' });
  let repo: Record<string, jest.Mock>;
  let service: AuthService;
  let qb: Record<string, jest.Mock>;

  beforeEach(() => {
    qb = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    repo = {
      exists: jest.fn(),
      create: jest.fn((u) => u),
      save: jest.fn(async (u) => ({ id: 1, ...u })),
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    service = new AuthService(repo as never, jwt);
  });

  it('hache le mot de passe avec bcrypt et ne le stocke jamais en clair', async () => {
    await service.inscrire({
      nom: 'Martin',
      prenom: 'Léa',
      email: 'Lea@Exemple.fr',
      motDePasse: 'MotDePasse2026',
    });
    const enregistre = repo.save.mock.calls[0][0];
    expect(enregistre.motDePasseHash).not.toBe('MotDePasse2026');
    expect(enregistre.motDePasseHash).toMatch(/^\$2[aby]\$10\$/);
    expect(await bcrypt.compare('MotDePasse2026', enregistre.motDePasseHash)).toBe(true);
    expect(enregistre.email).toBe('lea@exemple.fr');
    expect(enregistre.role).toBe('client');
  });

  it('ne renvoie jamais le hash dans la réponse', async () => {
    const res = await service.inscrire({
      nom: 'Martin',
      prenom: 'Léa',
      email: 'lea@exemple.fr',
      motDePasse: 'MotDePasse2026',
    });
    expect(JSON.stringify(res)).not.toContain('$2');
    expect(res.accessToken).toBeDefined();
  });

  it('refuse une inscription avec un e-mail déjà utilisé', async () => {
    repo.exists.mockResolvedValue(true);
    await expect(
      service.inscrire({
        nom: 'A',
        prenom: 'B',
        email: 'client@legrandcinema.fr',
        motDePasse: 'MotDePasse2026',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('connecte un utilisateur avec le bon mot de passe et met son rôle dans le jeton', async () => {
    qb.getOne.mockResolvedValue({
      id: 7,
      nom: 'Admin',
      prenom: 'Cinéma',
      email: 'admin@legrandcinema.fr',
      role: 'admin',
      motDePasseHash: await bcrypt.hash('Demo2026!', 4),
    });
    const res = await service.connecter({
      email: 'admin@legrandcinema.fr',
      motDePasse: 'Demo2026!',
    });
    expect(jwt.verify(res.accessToken)).toMatchObject({ sub: 7, role: 'admin' });
  });

  it("renvoie le même message que l'e-mail existe ou non", async () => {
    qb.getOne.mockResolvedValue(null);
    const inconnu = service.connecter({ email: 'inconnu@exemple.fr', motDePasse: 'x' });
    await expect(inconnu).rejects.toThrow('E-mail ou mot de passe incorrect.');

    qb.getOne.mockResolvedValue({ id: 1, motDePasseHash: await bcrypt.hash('bon', 4) });
    const mauvais = service.connecter({ email: 'client@legrandcinema.fr', motDePasse: 'mauvais' });
    await expect(mauvais).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(mauvais).rejects.toThrow('E-mail ou mot de passe incorrect.');
  });

  it('anonymise les données personnelles quand le compte est supprimé (RGPD)', async () => {
    repo.findOne.mockResolvedValue({ id: 3 });
    await service.supprimerCompte(3);
    const [id, maj] = repo.update.mock.calls[0];
    expect(id).toBe(3);
    expect(maj).toMatchObject({
      nom: 'Supprimé',
      prenom: 'Compte',
      email: 'supprime-3@anonyme.invalid',
    });
  });
});
