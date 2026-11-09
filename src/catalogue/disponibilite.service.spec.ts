import { DisponibiliteService } from './disponibilite.service';

describe('DisponibiliteService (US2 et US3)', () => {
  const db = { query: jest.fn() };
  const service = new DisponibiliteService(db as never);

  beforeEach(() => db.query.mockReset());

  it('calcule les places restantes et marque une séance complète en ligne', async () => {
    db.query.mockResolvedValue([
      { seance_id: 1, en_ligne: 12, guichet: 3 },
      { seance_id: 2, en_ligne: 0, guichet: 4 },
    ]);
    const res = await service.placesRestantes([1, 2]);
    expect(res.get(1)).toEqual({ enLigne: 12, guichet: 3, total: 15, complet: false });
    expect(res.get(2)?.complet).toBe(true);
  });

  it("n'interroge pas la base sans séance", async () => {
    expect((await service.placesRestantes([])).size).toBe(0);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('regroupe le plan par rangée et donne la priorité au statut occupée', async () => {
    db.query.mockResolvedValue([
      { place_id: 1, rangee: 'A', numero: 1, type: 'pmr', guichet: false, occupee: false },
      { place_id: 2, rangee: 'A', numero: 2, type: 'standard', guichet: false, occupee: true },
      { place_id: 3, rangee: 'B', numero: 1, type: 'standard', guichet: true, occupee: true },
      { place_id: 4, rangee: 'B', numero: 2, type: 'standard', guichet: true, occupee: false },
    ]);
    const { rangees, placesRestantes } = await service.plan(9);
    expect(rangees.map((r) => r.rangee)).toEqual(['A', 'B']);
    expect(rangees[0].places.map((p) => p.statut)).toEqual(['libre', 'occupee']);
    expect(rangees[1].places.map((p) => p.statut)).toEqual(['occupee', 'guichet']);
    expect(placesRestantes).toEqual({ enLigne: 1, guichet: 1, total: 2, complet: false });
  });
});
