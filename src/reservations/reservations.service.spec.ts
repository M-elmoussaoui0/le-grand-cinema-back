import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ReservationsService } from './reservations.service';

describe('ReservationsService (US5 – garantir une place unique)', () => {
  let tx: { query: jest.Mock };
  let service: ReservationsService;

  /** Simule les réponses successives de la base dans la transaction. */
  function base(...reponses: unknown[]) {
    reponses.forEach((r) => tx.query.mockResolvedValueOnce(r));
  }

  beforeEach(() => {
    tx = { query: jest.fn() };
    const db = { transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    service = new ReservationsService(db as never, { payer: jest.fn() } as never);
  });

  it('crée une réservation en attente et calcule le montant', async () => {
    base(
      [],
      [{ id: 1, prix: '8.50', commencee: false }],
      [
        { place_id: 5, guichet: false, occupee: false },
        { place_id: 6, guichet: false, occupee: false },
      ],
      [{ id: 42, seanceId: 1, statut: 'en_attente', montantTotal: 17 }],
      [],
    );
    const res = await service.creer(2, { seanceId: 1, placeIds: [5, 6] });
    expect(res).toMatchObject({ id: 42, statut: 'en_attente', montantTotal: 17, placeIds: [5, 6] });
    expect(tx.query.mock.calls[3][1]).toEqual([2, 1, 17]);
  });

  it('refuse une séance inexistante', async () => {
    base([], []);
    await expect(service.creer(2, { seanceId: 9, placeIds: [1] })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuse une séance déjà commencée', async () => {
    base([], [{ id: 1, prix: '8.50', commencee: true }]);
    await expect(service.creer(2, { seanceId: 1, placeIds: [1] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("refuse une place d'une autre salle", async () => {
    base([], [{ id: 1, prix: '8.50', commencee: false }], []);
    await expect(service.creer(2, { seanceId: 1, placeIds: [999] })).rejects.toThrow(
      "n'existe pas",
    );
  });

  it('refuse une place gardée pour le guichet', async () => {
    base(
      [],
      [{ id: 1, prix: '8.50', commencee: false }],
      [{ place_id: 300, guichet: true, occupee: false }],
    );
    await expect(service.creer(2, { seanceId: 1, placeIds: [300] })).rejects.toThrow('guichet');
  });

  it('refuse une place déjà réservée (409)', async () => {
    base(
      [],
      [{ id: 1, prix: '8.50', commencee: false }],
      [{ place_id: 5, guichet: false, occupee: true }],
    );
    await expect(service.creer(2, { seanceId: 1, placeIds: [5] })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("traduit la violation de la contrainte d'unicité en 409 (deux clients au même instant)", async () => {
    const erreur = Object.assign(new QueryFailedError('INSERT', [], new Error('duplicate key')), {
      code: '23505',
    });
    base(
      [],
      [{ id: 1, prix: '8.50', commencee: false }],
      [{ place_id: 5, guichet: false, occupee: false }],
      [{ id: 43 }],
    );
    tx.query.mockRejectedValueOnce(erreur);
    await expect(service.creer(2, { seanceId: 1, placeIds: [5] })).rejects.toThrow('vient d');
  });
});
