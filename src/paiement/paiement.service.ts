import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export type MoyenPaiement = 'carte' | 'apple_pay' | 'google_pay';

/**
 * Prestataire de paiement en mode test, sur le modèle de Stripe : le front n'envoie jamais
 * de numéro de carte à notre API, seulement un jeton de paiement créé par le prestataire.
 * Jetons de test : « tok_visa » et « tok_mastercard » acceptés, « tok_chargeDeclined » refusé.
 * En production, cette classe est remplacée par un appel à l'API Stripe (PaymentIntent).
 */
@Injectable()
export class PaiementService {
  static readonly JETONS_ACCEPTES = ['tok_visa', 'tok_mastercard'];

  async payer(
    montant: number,
    moyen: MoyenPaiement,
    jeton: string,
  ): Promise<{ reference: string }> {
    if (!PaiementService.JETONS_ACCEPTES.includes(jeton)) {
      throw new HttpException(
        'Paiement refusé par la banque. Essayez un autre moyen de paiement.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    if (montant <= 0) throw new HttpException('Montant invalide.', HttpStatus.BAD_REQUEST);
    return { reference: `pi_test_${moyen}_${randomBytes(8).toString('hex')}` };
  }
}
