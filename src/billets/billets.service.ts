import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { DataSource } from 'typeorm';

export interface Billet {
  reservationId: number;
  codeBillet: string;
  /** Image du QR code (PNG encodé en base64), à afficher dans l'application ou à imprimer */
  qrCode: string;
  film: string;
  salle: string;
  debut: Date;
  langue: string;
  places: string[];
  montantTotal: number;
}

@Injectable()
export class BilletsService {
  constructor(private readonly db: DataSource) {}

  /** Billet électronique d'une réservation payée (US6). */
  async billet(reservationId: number, utilisateurId: number): Promise<Billet> {
    const [r] = await this.db.query(
      `SELECT r.id, r.statut, r.code_billet, r.montant_total::float AS montant,
              f.titre, sa.nom AS salle, se.debut, se.langue,
              ARRAY_AGG(p.rangee || p.numero ORDER BY p.rangee, p.numero) AS places
       FROM reservation r
       JOIN seance se ON se.id = r.seance_id
       JOIN film f ON f.id = se.film_id
       JOIN salle sa ON sa.id = se.salle_id
       JOIN reservation_place rp ON rp.reservation_id = r.id
       JOIN place p ON p.id = rp.place_id
       WHERE r.id = $1 AND r.utilisateur_id = $2
       GROUP BY r.id, f.titre, sa.nom, se.debut, se.langue`,
      [reservationId, utilisateurId],
    );
    if (!r) throw new NotFoundException('Billet introuvable.');
    if (r.statut !== 'payee')
      throw new BadRequestException('Le billet est disponible après le paiement.');

    return {
      reservationId: r.id,
      codeBillet: r.code_billet,
      // Le QR code ne contient que le code du billet : aucune donnée personnelle
      qrCode: await QRCode.toDataURL(r.code_billet, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
      }),
      film: r.titre,
      salle: r.salle,
      debut: r.debut,
      langue: r.langue,
      places: r.places,
      montantTotal: r.montant,
    };
  }
}
