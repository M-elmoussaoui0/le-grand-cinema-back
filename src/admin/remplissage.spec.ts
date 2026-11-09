import { StatistiquesService } from './statistiques.service';

describe('StatistiquesService.remplissage (US11 – voir le taux de remplissage)', () => {
  const db = { query: jest.fn() };
  const service = new StatistiquesService(db as never);
  const ligne = (id: number, film: string, capacite: number, vendues: number) => ({
    seance_id: id,
    film,
    salle: 'Salle',
    debut: new Date(),
    capacite,
    en_ligne: vendues,
    guichet: 0,
    en_attente: 0,
    entrees: 0,
    derniere_heure: 0,
    recettes: vendues * 10,
  });

  it('calcule le taux de chaque séance, du jour et par film', async () => {
    db.query.mockResolvedValueOnce([
      ligne(1, 'Nuit Blanche', 100, 90),
      ligne(2, 'Nuit Blanche', 100, 70),
      ligne(3, 'Orbite Basse', 200, 50),
    ]);
    const res = await service.remplissage('2026-12-05');
    expect(res.seances.map((s) => s.tauxRemplissage)).toEqual([90, 70, 25]);
    expect(res.resume).toMatchObject({
      seances: 3,
      placesVendues: 210,
      capacite: 400,
      tauxRemplissage: 52.5,
    });
    expect(res.parFilm[0]).toMatchObject({ film: 'Nuit Blanche', tauxRemplissage: 80 });
  });

  it('renvoie un résumé vide pour un jour sans séance', async () => {
    db.query.mockResolvedValueOnce([]);
    const res = await service.remplissage('2030-01-01');
    expect(res.resume).toMatchObject({ seances: 0, tauxRemplissage: 0 });
  });
});
