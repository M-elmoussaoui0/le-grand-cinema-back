import { NotFoundException } from '@nestjs/common';
import { aujourdhui } from '../common/temps';
import { CatalogueService } from './catalogue.service';

describe('CatalogueService (US1 – voir les séances sans compte)', () => {
  let qb: Record<string, jest.Mock>;
  let seances: Record<string, jest.Mock>;
  let service: CatalogueService;

  beforeEach(() => {
    qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    seances = { createQueryBuilder: jest.fn(() => qb), findOne: jest.fn() };
    service = new CatalogueService({ find: jest.fn() } as never, seances as never);
  });

  it("cherche les séances du jour quand aucune date n'est donnée", async () => {
    await service.rechercherSeances({});
    expect(qb.where).toHaveBeenCalledWith(expect.any(String), { jour: aujourdhui() });
    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('applique les filtres film et langue', async () => {
    await service.rechercherSeances({ date: '2026-12-05', filmId: 2, langue: 'VOST' });
    expect(qb.where).toHaveBeenCalledWith(expect.any(String), { jour: '2026-12-05' });
    expect(qb.andWhere).toHaveBeenCalledWith(expect.any(String), { filmId: 2 });
    expect(qb.andWhere).toHaveBeenCalledWith(expect.any(String), { langue: 'VOST' });
  });

  it('renvoie une erreur 404 pour une séance inexistante', async () => {
    seances.findOne.mockResolvedValue(null);
    await expect(service.seance(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
