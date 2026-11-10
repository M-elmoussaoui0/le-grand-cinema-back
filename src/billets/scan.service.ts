import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FUSEAU_CINEMA, MAINTENANT_SQL } from '../common/temps';
import { BilletValideDto } from './dto/scan.dto';

/** Le contrôle ouvre 1 heure avant la séance et ferme à la fin de la séance. */
export const OUVERTURE_CONTROLE_MINUTES = 60;

const heure = (d: Date) =>
  new Date(d).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSEAU_CINEMA,
  });

@Injectable()
export class ScanService {
  constructor(private readonly db: DataSource) {}

  /**
   * Contrôle d'un billet à l'entrée de la salle (US7).
   * La mise à jour est atomique : si le même billet est scanné deux fois au même instant
   * (photo partagée), une seule entrée est acceptée.
   */
  async scanner(code: string): Promise<BilletValideDto> {
    const [[valide]] = await this.db.query(
      `UPDATE reservation r SET scanne_le = ${MAINTENANT_SQL}
       FROM seance se
       WHERE r.code_billet = $1 AND se.id = r.seance_id
         AND r.statut = 'payee' AND r.scanne_le IS NULL
         AND ${MAINTENANT_SQL} BETWEEN se.debut - interval '${OUVERTURE_CONTROLE_MINUTES} minutes' AND se.fin
       RETURNING r.id, r.scanne_le`,
      [code],
    );
    if (valide) {
      const billet = await this.details(valide.id);
      return {
        valide: true,
        message: `Entrée autorisée : ${billet.places.length} place(s).`,
        ...billet,
        scanneLe: valide.scanne_le,
      };
    }
    return this.refuser(code);
  }

  /** Le billet n'a pas été accepté : on explique pourquoi au contrôleur. */
  private async refuser(code: string): Promise<never> {
    const [r] = await this.db.query(
      `SELECT r.statut, r.scanne_le, se.debut,
              ${MAINTENANT_SQL} < se.debut - interval '${OUVERTURE_CONTROLE_MINUTES} minutes' AS trop_tot,
              ${MAINTENANT_SQL} > se.fin AS terminee
       FROM reservation r JOIN seance se ON se.id = r.seance_id
       WHERE r.code_billet = $1`,
      [code],
    );
    if (!r) throw new NotFoundException('Billet inconnu : entrée refusée.');
    if (r.statut === 'annulee') throw new BadRequestException('Billet annulé : entrée refusée.');
    if (r.statut !== 'payee') throw new BadRequestException('Billet non payé : entrée refusée.');
    if (r.scanne_le)
      throw new ConflictException(`Billet déjà utilisé à ${heure(r.scanne_le)} : entrée refusée.`);
    if (r.trop_tot) {
      const date = new Date(r.debut).toLocaleDateString('fr-FR', { timeZone: FUSEAU_CINEMA });
      throw new BadRequestException(
        `Billet pour la séance du ${date} à ${heure(r.debut)} : trop tôt.`,
      );
    }
    if (r.terminee) throw new BadRequestException('Séance terminée : billet expiré.');
    throw new ConflictException('Billet en cours de contrôle sur un autre poste.');
  }

  private async details(reservationId: number) {
    const [d] = await this.db.query(
      `SELECT f.titre AS film, sa.nom AS salle, se.debut,
              ARRAY_AGG(p.rangee || p.numero ORDER BY p.rangee, p.numero) AS places
       FROM reservation r
       JOIN seance se ON se.id = r.seance_id
       JOIN film f ON f.id = se.film_id
       JOIN salle sa ON sa.id = se.salle_id
       JOIN reservation_place rp ON rp.reservation_id = r.id
       JOIN place p ON p.id = rp.place_id
       WHERE r.id = $1
       GROUP BY f.titre, sa.nom, se.debut`,
      [reservationId],
    );
    return d as { film: string; salle: string; debut: Date; places: string[] };
  }
}
