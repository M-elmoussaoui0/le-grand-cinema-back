import { HttpException } from '@nestjs/common';
import { PaiementService } from './paiement.service';

describe('PaiementService (US4 – payer sur mobile)', () => {
  const service = new PaiementService();

  it.each(['carte', 'apple_pay', 'google_pay'] as const)(
    'accepte un paiement %s avec un jeton valide',
    async (moyen) => {
      const { reference } = await service.payer(17, moyen, 'tok_visa');
      expect(reference).toMatch(new RegExp(`^pi_test_${moyen}_[0-9a-f]{16}$`));
    },
  );

  it('refuse un paiement rejeté par la banque (402)', async () => {
    await expect(service.payer(17, 'carte', 'tok_chargeDeclined')).rejects.toMatchObject({
      status: 402,
    });
  });

  it('refuse un montant nul', async () => {
    await expect(service.payer(0, 'carte', 'tok_visa')).rejects.toBeInstanceOf(HttpException);
  });
});
