import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { PLACES_SEANCE_SQL } from '../catalogue/disponibilite.service';
import { MAINTENANT_SQL } from '../common/temps';
import { ModifierQuotaDto, VenteGuichetDto } from './dto/guichet.dto';

@Injectable()
export class GuichetService {
  constructor(private readonly db: DataSource) {}

  /** Ajuste le nombre de places gardées pour le guichet (US9). */
  async modifierQuota(seanceId: number, dto: ModifierQuotaDto) {
    const [s] = await this.db.query(
      'SELECT sa.capacite FROM seance se JOIN salle sa ON sa.id = se.salle_id WHERE se.id = $1',
      [seanceId],
    );
    if (!s) throw new NotFoundException('Séance introuvable.');
    if (dto.quotaGuichet > s.capacite) {
      throw new BadRequestException(`Le quota dépasse la capacité de la salle (${s.capacite}).`);
    }
    await this.db.query('UPDATE seance SET quota_guichet = $2 WHERE id = $1', [
      seanceId,
      dto.quotaGuichet,
    ]);
    return { seanceId, quotaGuichet: dto.quotaGuichet };
  }

  /**
   * Vente au guichet (US9) : les places du quota guichet sont attribuées en premier,
   * puis les places libres en ligne s'il n'en reste plus. Le billet est payé sur place.
   */
  async vendre(vendeurId: number, dto: VenteGuichetDto) {
    return this.db.transaction(async (tx) => {
      // Verrou sur la séance : deux ventes simultanées au guichet sont traitées l'une après l'autre
      const [seance] = await tx.query(
        `SELECT id, prix, fin <= ${MAINTENANT_SQL} AS terminee FROM seance WHERE id = $1 FOR UPDATE`,
        [dto.seanceId],
      );
      if (!seance) throw new NotFoundException('Séance introuvable.');
      if (seance.terminee) throw new BadRequestException('Cette séance est terminée.');

      const places: { place_id: number; rangee: string; numero: number }[] = await tx.query(
        `SELECT place_id, rangee, numero FROM (${PLACES_SEANCE_SQL}) p
         WHERE NOT occupee ORDER BY guichet DESC, rangee DESC, numero DESC LIMIT $2`,
        [[dto.seanceId], dto.nombre],
      );
      if (places.length < dto.nombre) {
        throw new ConflictException(`Il ne reste que ${places.length} place(s) pour cette séance.`);
      }

      const codeBillet = `LGC-${randomBytes(12).toString('base64url')}`;
      const [reservation] = await tx.query(
        `INSERT INTO reservation (utilisateur_id, seance_id, statut, montant_total, reference_paiement, code_billet, date_reservation)
         VALUES ($1, $2, 'payee', $3, 'guichet', $4, ${MAINTENANT_SQL})
         RETURNING id, montant_total::float AS "montantTotal", code_billet AS "codeBillet"`,
        [vendeurId, dto.seanceId, Number(seance.prix) * dto.nombre, codeBillet],
      );
      await tx.query(
        'INSERT INTO reservation_place (reservation_id, seance_id, place_id) SELECT $1, $2, unnest($3::int[])',
        [reservation.id, dto.seanceId, places.map((p) => p.place_id)],
      );
      return { ...reservation, places: places.map((p) => `${p.rangee}${p.numero}`) };
    });
  }
}
