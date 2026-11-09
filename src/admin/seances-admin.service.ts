import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MAINTENANT_SQL } from '../common/temps';
import { CreerSeanceDto } from './dto/creer-seance.dto';

/** Temps de nettoyage de la salle entre deux séances. */
export const NETTOYAGE_MINUTES = 15;

@Injectable()
export class SeancesAdminService {
  constructor(private readonly db: DataSource) {}

  salles() {
    return this.db.query('SELECT id, nom, capacite, configuration FROM salle ORDER BY id');
  }

  /**
   * Création d'une séance par l'administrateur (US8).
   * La fin est calculée : début + durée du film + nettoyage.
   * Un chevauchement avec une autre séance de la même salle est refusé par la contrainte
   * d'exclusion ex_seance_chevauchement de la base (erreur 409).
   */
  async creer(dto: CreerSeanceDto) {
    const [salle] = await this.db.query('SELECT capacite FROM salle WHERE id = $1', [dto.salleId]);
    if (!salle) throw new NotFoundException('Salle introuvable.');
    const [film] = await this.db.query('SELECT duree_minutes FROM film WHERE id = $1', [
      dto.filmId,
    ]);
    if (!film) throw new NotFoundException('Film introuvable.');

    const quota = dto.quotaGuichet ?? Math.floor(salle.capacite / 10);
    if (quota > salle.capacite) {
      throw new BadRequestException(
        `Le quota guichet dépasse la capacité de la salle (${salle.capacite}).`,
      );
    }
    const [{ passe }] = await this.db.query(`SELECT $1::timestamp <= ${MAINTENANT_SQL} AS passe`, [
      dto.debut,
    ]);
    if (passe) throw new BadRequestException('Le début de la séance doit être dans le futur.');

    const [seance] = await this.db.query(
      `INSERT INTO seance (film_id, salle_id, debut, fin, prix, langue, quota_guichet)
       VALUES ($1, $2, $3::timestamp, $3::timestamp + make_interval(mins => $4), $5, $6, $7)
       RETURNING id, film_id AS "filmId", salle_id AS "salleId", debut, fin, prix::float, langue,
                 quota_guichet AS "quotaGuichet"`,
      [
        dto.filmId,
        dto.salleId,
        dto.debut,
        film.duree_minutes + NETTOYAGE_MINUTES,
        dto.prix,
        dto.langue,
        quota,
      ],
    );
    return seance;
  }

  /** Suppression d'une séance, seulement si aucune place n'y est réservée. */
  async supprimer(id: number) {
    const [{ nb }] = await this.db.query(
      "SELECT COUNT(*)::int AS nb FROM reservation WHERE seance_id = $1 AND statut <> 'annulee'",
      [id],
    );
    if (nb > 0)
      throw new ConflictException('Impossible de supprimer une séance qui a des réservations.');
    await this.db.query('DELETE FROM reservation WHERE seance_id = $1', [id]);
    const [, supprimees] = await this.db.query('DELETE FROM seance WHERE id = $1', [id]);
    if (!supprimees) throw new NotFoundException('Séance introuvable.');
    return { message: 'Séance supprimée.' };
  }
}
