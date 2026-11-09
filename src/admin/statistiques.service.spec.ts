import { NotFoundException } from '@nestjs/common';
import { StatistiquesService, taux } from './statistiques.service';

describe('StatistiquesService (US10 – suivre une séance en direct)', () => {
  const db = { query: jest.fn() };
  const service = new StatistiquesService(db as never);

  it('calcule le taux de remplissage arrondi à 0,1 %', () => {
    expect(taux(150, 200)).toBe(75);
    expect(taux(1, 3)).toBe(33.3);
    expect(taux(0, 0)).toBe(0);
  });

  it('additionne les ventes en ligne et au guichet', async () => {
    db.query.mockResolvedValueOnce([
      {
        seance_id: 1,
        film: 'Nuit Blanche',
        salle: 'Salle 1',
        debut: new Date(),
        capacite: 300,
        en_ligne: 200,
        guichet: 25,
        en_attente: 5,
        derniere_heure: 12,
        recettes: 2362.5,
      },
    ]);
    const res = await service.direct(1);
    expect(res.vendues).toEqual({ enLigne: 200, guichet: 25, total: 225 });
    expect(res.restantes).toBe(70);
    expect(res.tauxRemplissage).toBe(75);
  });

  it('renvoie 404 pour une séance inexistante', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.direct(9)).rejects.toBeInstanceOf(NotFoundException);
  });
});
