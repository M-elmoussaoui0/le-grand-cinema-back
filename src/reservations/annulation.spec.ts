import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

describe('ReservationsService.annuler (US13 – retrouver ses réservations)', () => {
  const tx = { query: jest.fn() };
  const db = { transaction: (fn: (t: typeof tx) => unknown) => fn(tx), query: jest.fn() };
  const service = new ReservationsService(db as never, {} as never);

  beforeEach(() => tx.query.mockReset());

  it('annule, libère les places et signale le remboursement', async () => {
    tx.query.mockResolvedValueOnce([{ id: 1, statut: 'payee', trop_tard: false }]);
    const res = await service.annuler(1, 2);
    expect(tx.query.mock.calls[1][0]).toContain('DELETE FROM reservation_place');
    expect(res).toMatchObject({ statut: 'annulee', rembourse: true });
  });

  it("refuse l'annulation moins d'une heure avant la séance", async () => {
    tx.query.mockResolvedValueOnce([{ id: 1, statut: 'payee', trop_tard: true }]);
    await expect(service.annuler(1, 2)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse une double annulation', async () => {
    tx.query.mockResolvedValueOnce([{ id: 1, statut: 'annulee', trop_tard: false }]);
    await expect(service.annuler(1, 2)).rejects.toBeInstanceOf(ConflictException);
  });

  it("refuse d'annuler la réservation d'un autre client", async () => {
    tx.query.mockResolvedValueOnce([]);
    await expect(service.annuler(1, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
