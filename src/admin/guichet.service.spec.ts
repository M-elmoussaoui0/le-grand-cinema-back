import { BadRequestException, ConflictException } from '@nestjs/common';
import { GuichetService } from './guichet.service';

describe('GuichetService (US9 – réserver un quota au guichet)', () => {
  const tx = { query: jest.fn() };
  const db = { query: jest.fn(), transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
  const service = new GuichetService(db as never);

  beforeEach(() => {
    tx.query.mockReset();
    db.query.mockReset();
  });

  it('refuse un quota plus grand que la salle', async () => {
    db.query.mockResolvedValueOnce([{ capacite: 100 }]);
    await expect(service.modifierQuota(1, { quotaGuichet: 120 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('vend les billets demandés et calcule le montant', async () => {
    tx.query
      .mockResolvedValueOnce([{ id: 1, prix: '10.50', terminee: false }])
      .mockResolvedValueOnce([
        { place_id: 300, rangee: 'O', numero: 20 },
        { place_id: 299, rangee: 'O', numero: 19 },
      ])
      .mockResolvedValueOnce([{ id: 50, montantTotal: 21, codeBillet: 'LGC-x' }])
      .mockResolvedValueOnce([]);
    const res = await service.vendre(1, { seanceId: 1, nombre: 2 });
    expect(tx.query.mock.calls[2][1][2]).toBe(21);
    expect(res.places).toEqual(['O20', 'O19']);
  });

  it("refuse la vente s'il ne reste pas assez de places", async () => {
    tx.query
      .mockResolvedValueOnce([{ id: 1, prix: '10.50', terminee: false }])
      .mockResolvedValueOnce([{ place_id: 300, rangee: 'O', numero: 20 }]);
    await expect(service.vendre(1, { seanceId: 1, nombre: 3 })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
