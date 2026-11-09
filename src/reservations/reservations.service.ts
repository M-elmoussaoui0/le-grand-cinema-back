import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { DELAI_PAIEMENT_MINUTES, PLACES_SEANCE_SQL } from '../catalogue/disponibilite.service';
import { MAINTENANT_SQL } from '../common/temps';
import { PaiementService } from '../paiement/paiement.service';
import { CreerReservationDto } from './dto/creer-reservation.dto';
import { PayerReservationDto } from './dto/payer-reservation.dto';

/** Code PostgreSQL d'une violation de contrainte d'unicité. */
const VIOLATION_UNICITE = '23505';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly db: DataSource,
    private readonly paiement: PaiementService,
  ) {}

  /**
   * Réserve des places pour une séance (US5).
   * Tout se fait dans une transaction : soit toutes les places sont réservées, soit aucune.
   * Si deux clients valident la même place au même instant, la contrainte UNIQUE (seance_id, place_id)
   * de la base n'accepte que le premier : le second reçoit une erreur 409.
   */
  async creer(utilisateurId: number, dto: CreerReservationDto) {
    try {
      return await this.db.transaction(async (tx) => {
        await this.libererReservationsExpirees(tx, dto.seanceId);

        const [seance] = await tx.query(
          `SELECT id, prix, debut <= ${MAINTENANT_SQL} AS commencee FROM seance WHERE id = $1`,
          [dto.seanceId],
        );
        if (!seance) throw new NotFoundException('Séance introuvable.');
        if (seance.commencee) throw new BadRequestException('Cette séance a déjà commencé.');

        const places: { place_id: number; guichet: boolean; occupee: boolean }[] = await tx.query(
          `SELECT place_id, guichet, occupee FROM (${PLACES_SEANCE_SQL}) p WHERE place_id = ANY($2)`,
          [[dto.seanceId], dto.placeIds],
        );
        if (places.length !== dto.placeIds.length) {
          throw new BadRequestException("Une des places choisies n'existe pas dans cette salle.");
        }
        if (places.some((p) => p.guichet)) {
          throw new BadRequestException(
            'Une des places choisies est réservée à la vente au guichet.',
          );
        }
        if (places.some((p) => p.occupee)) {
          throw new ConflictException('Une des places choisies est déjà réservée.');
        }

        const montant = Number(seance.prix) * dto.placeIds.length;
        const [reservation] = await tx.query(
          `INSERT INTO reservation (utilisateur_id, seance_id, statut, montant_total, date_reservation)
           VALUES ($1, $2, 'en_attente', $3, ${MAINTENANT_SQL})
           RETURNING id, seance_id AS "seanceId", statut, montant_total::float AS "montantTotal",
                     date_reservation + interval '${DELAI_PAIEMENT_MINUTES} minutes' AS "payerAvant"`,
          [utilisateurId, dto.seanceId, montant],
        );
        await tx.query(
          `INSERT INTO reservation_place (reservation_id, seance_id, place_id)
           SELECT $1, $2, unnest($3::int[])`,
          [reservation.id, dto.seanceId, dto.placeIds],
        );
        return { ...reservation, placeIds: dto.placeIds };
      });
    } catch (erreur) {
      if (
        erreur instanceof QueryFailedError &&
        (erreur as { code?: string }).code === VIOLATION_UNICITE
      ) {
        throw new ConflictException(
          "Une des places choisies vient d'être réservée par un autre spectateur. Choisissez une autre place.",
        );
      }
      throw erreur;
    }
  }

  /**
   * Paiement d'une réservation en attente, par carte, Apple Pay ou Google Pay (US4).
   * Une fois payée, la réservation reçoit un code de billet unique et impossible à deviner.
   */
  async payer(id: number, utilisateurId: number, dto: PayerReservationDto) {
    const [r] = await this.db.query(
      `SELECT id, statut, montant_total::float AS montant,
              date_reservation <= ${MAINTENANT_SQL} - interval '${DELAI_PAIEMENT_MINUTES} minutes' AS expiree
       FROM reservation WHERE id = $1 AND utilisateur_id = $2`,
      [id, utilisateurId],
    );
    if (!r) throw new NotFoundException('Réservation introuvable.');
    if (r.statut === 'payee') throw new ConflictException('Cette réservation est déjà payée.');
    if (r.statut === 'annulee') throw new BadRequestException('Cette réservation a été annulée.');
    if (r.expiree) {
      throw new GoneException(
        `Le délai de paiement de ${DELAI_PAIEMENT_MINUTES} minutes est dépassé : les places ont été libérées.`,
      );
    }

    const { reference } = await this.paiement.payer(r.montant, dto.moyen, dto.jetonPaiement);
    const codeBillet = `LGC-${randomBytes(12).toString('base64url')}`;
    // Pour un UPDATE … RETURNING, TypeORM renvoie [lignes, nombre de lignes modifiées]
    const [[payee]] = await this.db.query(
      `UPDATE reservation SET statut = 'payee', reference_paiement = $2, code_billet = $3
       WHERE id = $1 AND statut = 'en_attente'
       RETURNING id, statut, montant_total::float AS "montantTotal", code_billet AS "codeBillet"`,
      [id, reference, codeBillet],
    );
    if (!payee) throw new ConflictException('Cette réservation a changé pendant le paiement.');
    return payee;
  }

  /** Les réservations non payées dans le délai libèrent leurs places (suppression en cascade). */
  private libererReservationsExpirees(tx: EntityManager, seanceId: number) {
    return tx.query(
      `DELETE FROM reservation
       WHERE seance_id = $1 AND statut = 'en_attente'
         AND date_reservation <= ${MAINTENANT_SQL} - interval '${DELAI_PAIEMENT_MINUTES} minutes'`,
      [seanceId],
    );
  }

  /** Réservation appartenant à l'utilisateur connecté, sinon 404 (on ne révèle pas celles des autres). */
  async trouverPourUtilisateur(id: number, utilisateurId: number) {
    const [reservation] = await this.db.query(
      'SELECT * FROM reservation WHERE id = $1 AND utilisateur_id = $2',
      [id, utilisateurId],
    );
    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    return reservation;
  }
}
