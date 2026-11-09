import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source';

/**
 * Jeu de données de démonstration :
 * - 2 comptes (administrateur et client), mot de passe « Demo2026! » haché en bcrypt ;
 * - 6 films, 10 salles modulables, 1 700 places ;
 * - 3 séances par jour et par salle pendant 60 jours à partir d'aujourd'hui ;
 * - des réservations sur les séances de demain, pour alimenter le tableau de bord.
 * Le script ne fait rien si la base contient déjà des données.
 */
export const SEED_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO utilisateur (nom, prenom, email, mot_de_passe_hash, role) VALUES
  ('Admin',  'Cinéma', 'admin@legrandcinema.fr', crypt('Demo2026!', gen_salt('bf', 10)), 'admin'),
  ('Martin', 'Léa',    'client@legrandcinema.fr', crypt('Demo2026!', gen_salt('bf', 10)), 'client'),
  ('Démo',   'Festival', 'festival@legrandcinema.fr', crypt('Demo2026!', gen_salt('bf', 10)), 'client');

INSERT INTO film (titre, synopsis, duree_minutes, genre, classification) VALUES
  ('Le Dernier Accord', 'Un pianiste de jazz prépare le concert de sa vie, la veille du festival.', 118, 'Drame', 'Tous publics'),
  ('Nuit Blanche', 'Une enquête haletante dans une ville endormie.', 104, 'Thriller', '-12'),
  ('Les Ailes du Port', 'Deux enfants recueillent un goéland blessé et partent à l''aventure.', 92, 'Animation', 'Tous publics'),
  ('Saxophone Rouge', 'Portrait documentaire des musiciens qui font vivre le festival de jazz.', 85, 'Documentaire', 'Tous publics'),
  ('Orbite Basse', 'Une mission de secours en orbite tourne mal.', 132, 'Science-fiction', 'Tous publics'),
  ('Le Banquet des Voisins', 'Une comédie chorale autour d''un repas de quartier.', 97, 'Comédie', 'Tous publics');

INSERT INTO salle (nom, capacite) VALUES
  ('Salle 1', 300), ('Salle 2', 250), ('Salle 3', 200), ('Salle 4', 200), ('Salle 5', 150),
  ('Salle 6', 150), ('Salle 7', 150), ('Salle 8', 100), ('Salle 9', 100), ('Salle 10', 100);

INSERT INTO place (salle_id, rangee, numero, type)
SELECT s.id, CHR(65 + ((n - 1) / 20)), ((n - 1) % 20) + 1,
       CASE WHEN n <= 4 THEN 'pmr' ELSE 'standard' END
FROM salle s CROSS JOIN LATERAL generate_series(1, s.capacite) AS n;

INSERT INTO seance (film_id, salle_id, debut, fin, prix, langue, quota_guichet)
SELECT f.id, s.id, x.debut, x.debut + make_interval(mins => f.duree_minutes + 15),
       CASE WHEN c.slot = 3 THEN 10.50 ELSE 8.50 END,
       CASE WHEN c.slot = 3 AND d % 3 = 0 THEN 'VOST' ELSE 'VF' END,
       s.capacite / 10
FROM generate_series(0, 59) AS d
CROSS JOIN salle s
CROSS JOIN (VALUES (1, TIME '14:00'), (2, TIME '17:15'), (3, TIME '20:30')) AS c(slot, heure)
CROSS JOIN LATERAL (SELECT CURRENT_DATE + d + c.heure AS debut) x
JOIN film f ON f.id = ((d + s.id + c.slot) % 6) + 1;

DO $$
DECLARE
  sc RECORD;
  taux INTEGER;
  nb INTEGER;
  res_id INTEGER;
  client_id INTEGER;
BEGIN
  SELECT id INTO client_id FROM utilisateur WHERE email = 'festival@legrandcinema.fr';
  FOR sc IN
    SELECT se.id, se.salle_id, sa.capacite, se.quota_guichet, se.prix
    FROM seance se JOIN salle sa ON sa.id = se.salle_id
    WHERE se.debut::date = CURRENT_DATE + 1
  LOOP
    taux := 20 + ((sc.id * 37) % 76);
    nb := LEAST((sc.capacite * taux) / 100, sc.capacite - sc.quota_guichet);
    INSERT INTO reservation (utilisateur_id, seance_id, statut, montant_total, reference_paiement, code_billet)
    VALUES (client_id, sc.id, 'payee', nb * sc.prix, 'demo', 'LGC-DEMO-' || sc.id)
    RETURNING id INTO res_id;
    INSERT INTO reservation_place (reservation_id, seance_id, place_id)
    SELECT res_id, sc.id, p.id FROM place p
    WHERE p.salle_id = sc.salle_id
    ORDER BY p.rangee, p.numero
    LIMIT nb;
  END LOOP;
END $$;
`;

export async function seed(dataSource: DataSource): Promise<boolean> {
  const [{ count }] = await dataSource.query('SELECT COUNT(*)::int AS count FROM salle');
  if (count > 0) return false;
  await dataSource.query(SEED_SQL);
  return true;
}

async function main() {
  const dataSource = new DataSource(buildDataSourceOptions());
  await dataSource.initialize();
  await dataSource.runMigrations();
  const done = await seed(dataSource);
  console.log(done ? 'Données de démonstration créées.' : 'Base déjà initialisée : rien à faire.');
  await dataSource.destroy();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
