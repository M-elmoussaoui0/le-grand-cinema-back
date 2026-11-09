/**
 * Les horaires des séances sont stockés en heure locale du cinéma (TIMESTAMP sans fuseau).
 * Le serveur (Render) et la base (Neon) tournent en UTC : on fixe donc explicitement le fuseau.
 */
export const FUSEAU_CINEMA = 'Europe/Paris';

/** Heure actuelle du cinéma, utilisable dans une requête SQL. */
export const MAINTENANT_SQL = `(now() AT TIME ZONE '${FUSEAU_CINEMA}')`;

/** Date du jour au format AAAA-MM-JJ, dans le fuseau du cinéma. */
export function aujourdhui(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: FUSEAU_CINEMA });
}
