import { ConflictException, GoneException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

describe('ReservationsService.payer (US4)', () => {
  // La transaction exécute directement le travail demandé avec la même connexion simulée
  const db: { query: jest.Mock; transaction: jest.Mock } = {
    query: jest.fn(),
    transaction: jest.fn((travail: (tx: unknown) => unknown) => travail(db)),
  };
  const paiement = { payer: jest.fn().mockResolvedValue({ reference: 'pi_test_carte_1' }) };
  const service = new ReservationsService(db as never, paiement as never);
  const dto = { moyen: 'apple_pay' as const, jetonPaiement: 'tok_visa' };

  beforeEach(() => db.query.mockReset());

  it('paie la réservation et génère un code de billet unique', async () => {
    db.query
      .mockResolvedValueOnce([{ id: 1, statut: 'en_attente', montant: 17, expiree: false }])
      .mockImplementationOnce(async (_sql: string, params: string[]) => [
        [{ id: 1, statut: 'payee', codeBillet: params[2] }],
        1,
      ]);
    const res = await service.payer(1, 2, dto);
    expect(paiement.payer).toHaveBeenCalledWith(17, 'apple_pay', 'tok_visa');
    expect(res.codeBillet).toMatch(/^LGC-[A-Za-z0-9_-]{16}$/);
  });

  it("refuse la réservation d'un autre client (404)", async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.payer(1, 99, dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse un double paiement (409)', async () => {
    db.query.mockResolvedValueOnce([{ id: 1, statut: 'payee', montant: 17, expiree: false }]);
    await expect(service.payer(1, 2, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse le paiement après le délai de 15 minutes (410)', async () => {
    db.query.mockResolvedValueOnce([{ id: 1, statut: 'en_attente', montant: 17, expiree: true }]);
    await expect(service.payer(1, 2, dto)).rejects.toBeInstanceOf(GoneException);
  });
});
