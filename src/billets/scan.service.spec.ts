import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ScanService } from './scan.service';

describe('ScanService (US7 – scanner un billet à l’entrée)', () => {
  const db = { query: jest.fn() };
  const service = new ScanService(db as never);
  const refus = (ligne: object | undefined) =>
    db.query.mockResolvedValueOnce([[], 0]).mockResolvedValueOnce(ligne ? [ligne] : []);
  const ligne = {
    statut: 'payee',
    scanne_le: null,
    debut: new Date('2026-12-05T20:30:00'),
    trop_tot: false,
    terminee: false,
  };

  beforeEach(() => db.query.mockReset());

  it("accepte un billet valide et enregistre l'heure d'entrée", async () => {
    const scanneLe = new Date();
    db.query
      .mockResolvedValueOnce([[{ id: 8, scanne_le: scanneLe }], 1])
      .mockResolvedValueOnce([
        { film: 'Nuit Blanche', salle: 'Salle 2', debut: new Date(), places: ['A1', 'A2'] },
      ]);
    const res = await service.scanner('LGC-ok');
    expect(res).toMatchObject({ valide: true, places: ['A1', 'A2'], scanneLe });
    expect(res.message).toBe('Entrée autorisée : 2 place(s).');
  });

  it('refuse un billet inconnu (404)', async () => {
    refus(undefined);
    await expect(service.scanner('LGC-faux')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse un billet déjà utilisé et donne son heure de passage (409)', async () => {
    refus({ ...ligne, scanne_le: new Date('2026-12-05T20:12:00') });
    const scan = service.scanner('LGC-deja');
    await expect(scan).rejects.toBeInstanceOf(ConflictException);
    await expect(scan).rejects.toThrow('Billet déjà utilisé à 20:12');
  });

  it('refuse un billet annulé', async () => {
    refus({ ...ligne, statut: 'annulee' });
    await expect(service.scanner('LGC-annule')).rejects.toThrow('Billet annulé');
  });

  it('refuse un billet non payé', async () => {
    refus({ ...ligne, statut: 'en_attente' });
    await expect(service.scanner('LGC-attente')).rejects.toThrow('non payé');
  });

  it('refuse un billet présenté plus d’une heure avant la séance', async () => {
    refus({ ...ligne, trop_tot: true });
    await expect(service.scanner('LGC-tot')).rejects.toThrow('05/12/2026 à 20:30');
  });

  it("refuse un billet d'une séance terminée", async () => {
    refus({ ...ligne, terminee: true });
    await expect(service.scanner('LGC-fini')).rejects.toBeInstanceOf(BadRequestException);
  });
});
