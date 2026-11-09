import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MAINTENANT_SQL } from '../common/temps';

/**
 * Chiffres de vente par séance, calculés en une requête :
 * places vendues en ligne et au guichet, places en attente de paiement, recettes.
 */
export const STATS_SEANCE_SQL = `
  SELECT se.id AS seance_id, f.titre AS film, sa.nom AS salle, se.debut, se.fin, sa.capacite,
         COUNT(rp.place_id) FILTER (WHERE r.statut = 'payee' AND r.reference_paiement IS DISTINCT FROM 'guichet')::int AS en_ligne,
         COUNT(rp.place_id) FILTER (WHERE r.statut = 'payee' AND r.reference_paiement = 'guichet')::int AS guichet,
         COUNT(rp.place_id) FILTER (WHERE r.statut = 'en_attente')::int AS en_attente,
         COUNT(rp.place_id) FILTER (WHERE r.statut = 'payee'
                                     AND r.date_reservation > ${MAINTENANT_SQL} - interval '1 hour')::int AS derniere_heure,
         COALESCE(SUM(se.prix) FILTER (WHERE r.statut = 'payee'), 0)::float AS recettes
  FROM seance se
  JOIN film f ON f.id = se.film_id
  JOIN salle sa ON sa.id = se.salle_id
  LEFT JOIN reservation r ON r.seance_id = se.id
  LEFT JOIN reservation_place rp ON rp.reservation_id = r.id`;

export interface LigneStats {
  seance_id: number;
  film: string;
  salle: string;
  debut: Date;
  fin: Date;
  capacite: number;
  en_ligne: number;
  guichet: number;
  en_attente: number;
  derniere_heure: number;
  recettes: number;
}

/** Taux de remplissage en pourcentage, arrondi à 0,1. */
export function taux(vendues: number, capacite: number): number {
  return capacite === 0 ? 0 : Math.round((vendues / capacite) * 1000) / 10;
}

@Injectable()
export class StatistiquesService {
  constructor(private readonly db: DataSource) {}

  /** Suivi d'une séance en direct (US10) : le tableau de bord rafraîchit ces chiffres toutes les 10 secondes. */
  async direct(seanceId: number) {
    const [l]: LigneStats[] = await this.db.query(
      `${STATS_SEANCE_SQL} WHERE se.id = $1 GROUP BY se.id, f.titre, sa.nom, sa.capacite`,
      [seanceId],
    );
    if (!l) throw new NotFoundException('Séance introuvable.');
    const vendues = l.en_ligne + l.guichet;
    return {
      seanceId: l.seance_id,
      film: l.film,
      salle: l.salle,
      debut: l.debut,
      capacite: l.capacite,
      vendues: { enLigne: l.en_ligne, guichet: l.guichet, total: vendues },
      enAttentePaiement: l.en_attente,
      restantes: l.capacite - vendues - l.en_attente,
      tauxRemplissage: taux(vendues, l.capacite),
      ventesDerniereHeure: l.derniere_heure,
      recettes: l.recettes,
      misAJourA: new Date(),
    };
  }
}
