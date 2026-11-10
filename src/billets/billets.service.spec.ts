import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BilletsService } from './billets.service';

describe('BilletsService (US6 – recevoir un billet QR code)', () => {
  const db = { query: jest.fn() };
  const service = new BilletsService(db as never);
  const ligne = {
    id: 1,
    statut: 'payee',
    code_billet: 'LGC-abc',
    montant: 17,
    titre: 'Nuit Blanche',
    salle: 'Salle 2',
    debut: new Date('2026-12-05T20:30:00'),
    langue: 'VF',
    places: ['A1', 'A2'],
  };

  it('génère un billet avec un QR code en image PNG', async () => {
    db.query.mockResolvedValueOnce([ligne]);
    const billet = await service.billet(1, 2);
    expect(billet).toMatchObject({
      codeBillet: 'LGC-abc',
      film: 'Nuit Blanche',
      places: ['A1', 'A2'],
    });
    expect(billet.qrCode).toMatch(/^data:image\/png;base64,/);
  });

  it("refuse le billet d'une réservation non payée", async () => {
    db.query.mockResolvedValueOnce([{ ...ligne, statut: 'en_attente' }]);
    await expect(service.billet(1, 2)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("ne donne pas le billet d'un autre client", async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.billet(1, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
