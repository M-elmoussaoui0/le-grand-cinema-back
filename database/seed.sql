-- =====================================================================
-- Le Grand Cinéma : jeu de données de démonstration
-- À exécuter après schema.sql
-- =====================================================================

-- Comptes de démonstration : mot de passe haché en bcrypt par pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO utilisateur (nom, prenom, email, mot_de_passe_hash, role) VALUES
    ('Admin',  'Cinéma', 'admin@legrandcinema.fr', crypt('Studi2026', gen_salt('bf', 10)), 'admin'),
    ('Martin', 'Léa',    'lea.martin@exemple.fr',  crypt('Studi2026', gen_salt('bf', 10)), 'client');

INSERT INTO film (titre, synopsis, duree_minutes, genre, classification) VALUES
    ('Le Dernier Accord', 'Un pianiste de jazz prépare le concert de sa vie.', 118, 'Drame', 'Tous publics'),
    ('Nuit Blanche',      'Une enquête haletante dans la ville endormie.',     104, 'Thriller', '-12');

-- 10 salles modulables, 1 700 places au total
INSERT INTO salle (nom, capacite) VALUES
    ('Salle 1', 300), ('Salle 2', 250), ('Salle 3', 200), ('Salle 4', 200), ('Salle 5', 150),
    ('Salle 6', 150), ('Salle 7', 150), ('Salle 8', 100), ('Salle 9', 100), ('Salle 10', 100);

-- Génération des places : rangées de 20 sièges (A, B, C...)
INSERT INTO place (salle_id, rangee, numero)
SELECT s.id,
       CHR(65 + ((n - 1) / 20)),          -- rangée A, B, C...
       ((n - 1) % 20) + 1                 -- siège 1 à 20
FROM salle s
CROSS JOIN LATERAL generate_series(1, s.capacite) AS n;

-- Séances de démonstration
INSERT INTO seance (film_id, salle_id, debut, fin, prix, langue, quota_guichet) VALUES
    (1, 1, '2026-12-05 18:00', '2026-12-05 20:15', 10.50, 'VF',   30),
    (1, 1, '2026-12-05 20:30', '2026-12-05 22:45', 10.50, 'VOST', 30),
    (2, 2, '2026-12-05 21:00', '2026-12-05 23:00',  9.50, 'VF',   20);

-- Une réservation payée de 2 places (A1 et A2 de la salle 1)
INSERT INTO reservation (utilisateur_id, seance_id, statut, montant_total, reference_paiement, code_billet)
VALUES (2, 1, 'payee', 21.00, 'pi_demo_0001', 'LGC-2026-0001');

INSERT INTO reservation_place (reservation_id, seance_id, place_id)
SELECT 1, 1, p.id FROM place p
WHERE p.salle_id = 1 AND p.rangee = 'A' AND p.numero IN (1, 2);
