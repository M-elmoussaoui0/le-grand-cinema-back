import { AlertesService } from './alertes.service';
import { LigneStats } from './statistiques.service';

describe('AlertesService (US12 – être alerté en cas de pic)', () => {
  const service = new AlertesService({} as never);
  const ligne = (vendues: number, derniereHeure = 0): LigneStats => ({
    seance_id: 1,
    film: 'Nuit Blanche',
    salle: 'Salle 8',
    debut: new Date(),
    fin: new Date(),
    capacite: 100,
    en_ligne: vendues,
    guichet: 0,
    en_attente: 0,
    entrees: 0,
    derniere_heure: derniereHeure,
    recettes: 0,
  });

  afterEach(() => {
    delete process.env.ALERTE_SEUIL_REMPLISSAGE;
  });

  it("pas d'alerte sous le seuil", () => {
    expect(service.detecter([ligne(50)])).toEqual([]);
  });

  it('alerte « presque complet » à partir de 90 %', () => {
    const [a] = service.detecter([ligne(92)]);
    expect(a).toMatchObject({ type: 'presque_complet', niveau: 'attention' });
    expect(a.message).toContain('92 %');
  });

  it('alerte critique quand la séance est complète', () => {
    expect(service.detecter([ligne(100)])[0]).toMatchObject({
      type: 'complet',
      niveau: 'critique',
    });
  });

  it('alerte « pic de ventes » au-delà de 50 places vendues en une heure', () => {
    const alertes = service.detecter([ligne(60, 55)]);
    expect(alertes).toHaveLength(1);
    expect(alertes[0]).toMatchObject({ type: 'pic_ventes', niveau: 'critique' });
  });

  it('le seuil se règle par variable d’environnement', () => {
    process.env.ALERTE_SEUIL_REMPLISSAGE = '70';
    expect(service.detecter([ligne(75)])[0].type).toBe('presque_complet');
  });

  it('les alertes critiques sont affichées en premier', () => {
    const alertes = service.detecter([
      { ...ligne(92), seance_id: 1 },
      { ...ligne(100), seance_id: 2 },
    ]);
    expect(alertes.map((a) => a.niveau)).toEqual(['critique', 'attention']);
  });
});
