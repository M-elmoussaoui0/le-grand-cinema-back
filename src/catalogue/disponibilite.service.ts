import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MAINTENANT_SQL } from '../common/temps';

/** Durée pendant laquelle une place reste bloquée en attendant le paiement. */
export const DELAI_PAIEMENT_MINUTES = 15;

/**
 * Une place est occupée si elle appartient à une réservation payée,
 * ou à une réservation en attente de paiement depuis moins de 15 minutes.
 */
export const RESERVATION_ACTIVE_SQL = `(r.statut = 'payee' OR (r.statut = 'en_attente'
  AND r.date_reservation > ${MAINTENANT_SQL} - interval '${DELAI_PAIEMENT_MINUTES} minutes'))`;

/**
 * Les places du guichet (US9) sont les dernières places de la salle (dernières rangées) :
 * elles ne sont pas vendues en ligne.
 */
export const PLACES_SEANCE_SQL = `
  SELECT s.id AS seance_id, p.id AS place_id, p.rangee, p.numero, p.type,
         ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY p.rangee DESC, p.numero DESC) <= s.quota_guichet AS guichet,
         occ.place_id IS NOT NULL AS occupee
  FROM seance s
  JOIN place p ON p.salle_id = s.salle_id
  LEFT JOIN (
    SELECT rp.seance_id, rp.place_id
    FROM reservation_place rp JOIN reservation r ON r.id = rp.reservation_id
    WHERE rp.seance_id = ANY($1) AND ${RESERVATION_ACTIVE_SQL}
  ) occ ON occ.seance_id = s.id AND occ.place_id = p.id
  WHERE s.id = ANY($1)`;

export type StatutPlace = 'libre' | 'occupee' | 'guichet';

export interface PlacePlan {
  id: number;
  numero: number;
  type: 'standard' | 'pmr' | 'vip';
  statut: StatutPlace;
}

export interface PlacesRestantes {
  /** Places encore réservables en ligne */
  enLigne: number;
  /** Places encore disponibles au guichet */
  guichet: number;
  total: number;
  complet: boolean;
}

@Injectable()
export class DisponibiliteService {
  constructor(private readonly db: DataSource) {}

  /** Places restantes de plusieurs séances, calculées en une seule requête (US2). */
  async placesRestantes(seanceIds: number[]): Promise<Map<number, PlacesRestantes>> {
    const resultat = new Map<number, PlacesRestantes>();
    if (seanceIds.length === 0) return resultat;
    const lignes: { seance_id: number; en_ligne: number; guichet: number }[] = await this.db.query(
      `SELECT seance_id,
              COUNT(*) FILTER (WHERE NOT occupee AND NOT guichet)::int AS en_ligne,
              COUNT(*) FILTER (WHERE NOT occupee AND guichet)::int AS guichet
       FROM (${PLACES_SEANCE_SQL}) places
       GROUP BY seance_id`,
      [seanceIds],
    );
    for (const l of lignes) {
      resultat.set(l.seance_id, {
        enLigne: l.en_ligne,
        guichet: l.guichet,
        total: l.en_ligne + l.guichet,
        complet: l.en_ligne === 0,
      });
    }
    return resultat;
  }

  /** Plan de la salle pour une séance, rangée par rangée (US3). */
  async plan(seanceId: number): Promise<{
    rangees: { rangee: string; places: PlacePlan[] }[];
    placesRestantes: PlacesRestantes;
  }> {
    const lignes: {
      place_id: number;
      rangee: string;
      numero: number;
      type: PlacePlan['type'];
      guichet: boolean;
      occupee: boolean;
    }[] = await this.db.query(`${PLACES_SEANCE_SQL} ORDER BY rangee, numero`, [[seanceId]]);
    const rangees = new Map<string, PlacePlan[]>();
    let enLigne = 0;
    let guichet = 0;
    for (const l of lignes) {
      const statut: StatutPlace = l.occupee ? 'occupee' : l.guichet ? 'guichet' : 'libre';
      if (statut === 'libre') enLigne++;
      if (statut === 'guichet') guichet++;
      if (!rangees.has(l.rangee)) rangees.set(l.rangee, []);
      rangees.get(l.rangee)!.push({ id: l.place_id, numero: l.numero, type: l.type, statut });
    }
    // Les places restantes sont déduites du plan : une seule requête pour tout l'écran
    return {
      rangees: [...rangees].map(([rangee, places]) => ({ rangee, places })),
      placesRestantes: { enLigne, guichet, total: enLigne + guichet, complet: enLigne === 0 },
    };
  }
}
