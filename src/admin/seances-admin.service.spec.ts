import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SeancesAdminService } from './seances-admin.service';

describe('SeancesAdminService (US8 – créer une séance)', () => {
  const db = { query: jest.fn() };
  const service = new SeancesAdminService(db as never);
  const dto = {
    filmId: 1,
    salleId: 3,
    debut: '2026-12-05T22:45',
    prix: 9.5,
    langue: 'VF' as const,
  };

  beforeEach(() => db.query.mockReset());

  it('calcule la fin (durée du film + 15 min) et le quota guichet par défaut (10 %)', async () => {
    db.query
      .mockResolvedValueOnce([{ capacite: 200 }])
      .mockResolvedValueOnce([{ duree_minutes: 118 }])
      .mockResolvedValueOnce([{ passe: false }])
      .mockResolvedValueOnce([{ id: 99 }]);
    await service.creer(dto);
    const params = db.query.mock.calls[3][1];
    expect(params).toEqual([1, 3, '2026-12-05T22:45', 133, 9.5, 'VF', 20]);
  });

  it('refuse une séance dans le passé', async () => {
    db.query
      .mockResolvedValueOnce([{ capacite: 200 }])
      .mockResolvedValueOnce([{ duree_minutes: 118 }])
      .mockResolvedValueOnce([{ passe: true }]);
    await expect(service.creer(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse une salle inconnue', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.creer(dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse un quota guichet plus grand que la salle', async () => {
    db.query
      .mockResolvedValueOnce([{ capacite: 100 }])
      .mockResolvedValueOnce([{ duree_minutes: 90 }]);
    await expect(service.creer({ ...dto, quotaGuichet: 150 })).rejects.toThrow('capacité');
  });

  it('refuse de supprimer une séance avec des réservations', async () => {
    db.query.mockResolvedValueOnce([{ nb: 3 }]);
    await expect(service.supprimer(1)).rejects.toBeInstanceOf(ConflictException);
  });
});
