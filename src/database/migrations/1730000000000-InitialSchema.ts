import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Création initiale de la base : reprend le script database/schema.sql conçu au Dossier 1.
 */
export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
-- =====================================================================
-- Le Grand Cinéma : base de données de l'application de réservation
-- SGBD : PostgreSQL 16
-- Couvre : utilisateurs, films, salles, places, séances, réservations
-- =====================================================================

-- Extension nécessaire à la contrainte anti-chevauchement des séances
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- UTILISATEUR : clients et administrateurs du cinéma
-- ---------------------------------------------------------------------
CREATE TABLE utilisateur (
    id                 SERIAL       PRIMARY KEY,
    nom                VARCHAR(100) NOT NULL,
    prenom             VARCHAR(100) NOT NULL,
    email              VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash  VARCHAR(255) NOT NULL,          -- jamais le mot de passe en clair
    role               VARCHAR(20)  NOT NULL DEFAULT 'client'
                       CHECK (role IN ('client', 'admin')),
    date_creation      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- FILM : catalogue des films programmés
-- ---------------------------------------------------------------------
CREATE TABLE film (
    id              SERIAL       PRIMARY KEY,
    titre           VARCHAR(200) NOT NULL,
    synopsis        TEXT,
    duree_minutes   INTEGER      NOT NULL CHECK (duree_minutes > 0),
    genre           VARCHAR(50),
    classification  VARCHAR(20),                        -- ex. « Tous publics », « -12 »
    affiche_url     VARCHAR(500)
);

-- ---------------------------------------------------------------------
-- SALLE : les 10 salles modulables du cinéma (1 700 places au total)
-- ---------------------------------------------------------------------
CREATE TABLE salle (
    id             SERIAL      PRIMARY KEY,
    nom            VARCHAR(50) NOT NULL UNIQUE,
    capacite       INTEGER     NOT NULL CHECK (capacite > 0),
    configuration  VARCHAR(50) NOT NULL DEFAULT 'standard'   -- salle modulable : standard, concert, conférence...
);

-- ---------------------------------------------------------------------
-- PLACE : chaque siège physique d'une salle
-- ---------------------------------------------------------------------
CREATE TABLE place (
    id        SERIAL      PRIMARY KEY,
    salle_id  INTEGER     NOT NULL REFERENCES salle (id) ON DELETE CASCADE,
    rangee    VARCHAR(2)  NOT NULL,                     -- A, B, C...
    numero    INTEGER     NOT NULL CHECK (numero > 0),
    type      VARCHAR(20) NOT NULL DEFAULT 'standard'
              CHECK (type IN ('standard', 'pmr', 'vip')),
    CONSTRAINT uq_place_salle UNIQUE (salle_id, rangee, numero)
);

-- ---------------------------------------------------------------------
-- SEANCE : un film projeté dans une salle à un horaire donné
-- ---------------------------------------------------------------------
CREATE TABLE seance (
    id              SERIAL        PRIMARY KEY,
    film_id         INTEGER       NOT NULL REFERENCES film (id),
    salle_id        INTEGER       NOT NULL REFERENCES salle (id),
    debut           TIMESTAMP     NOT NULL,
    fin             TIMESTAMP     NOT NULL,
    prix            NUMERIC(6, 2) NOT NULL CHECK (prix >= 0),
    langue          VARCHAR(10)   NOT NULL DEFAULT 'VF' CHECK (langue IN ('VF', 'VOST')),
    quota_guichet   INTEGER       NOT NULL DEFAULT 0 CHECK (quota_guichet >= 0),  -- places gardées pour le guichet (US9)
    CONSTRAINT ck_seance_horaires CHECK (fin > debut),
    -- Deux séances ne peuvent pas se chevaucher dans la même salle
    CONSTRAINT ex_seance_chevauchement
        EXCLUDE USING gist (salle_id WITH =, tsrange(debut, fin) WITH &&)
);

-- ---------------------------------------------------------------------
-- RESERVATION : la commande d'un utilisateur pour une séance
-- ---------------------------------------------------------------------
CREATE TABLE reservation (
    id                  SERIAL        PRIMARY KEY,
    utilisateur_id      INTEGER       NOT NULL REFERENCES utilisateur (id),
    seance_id           INTEGER       NOT NULL REFERENCES seance (id),
    statut              VARCHAR(20)   NOT NULL DEFAULT 'en_attente'
                        CHECK (statut IN ('en_attente', 'payee', 'annulee')),
    montant_total       NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (montant_total >= 0),
    reference_paiement  VARCHAR(100),                   -- identifiant du paiement Stripe
    code_billet         VARCHAR(64)   UNIQUE,           -- contenu du QR code du billet
    date_reservation    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_reservation_seance UNIQUE (id, seance_id)  -- sert à la clé étrangère composée ci-dessous
);

-- ---------------------------------------------------------------------
-- RESERVATION_PLACE : les places choisies dans une réservation
-- La contrainte uq_place_par_seance interdit la double réservation :
-- une place ne peut appartenir qu'à une seule réservation par séance.
-- Une annulation supprime ces lignes, ce qui libère les places.
-- ---------------------------------------------------------------------
CREATE TABLE reservation_place (
    reservation_id  INTEGER NOT NULL,
    seance_id       INTEGER NOT NULL,
    place_id        INTEGER NOT NULL REFERENCES place (id),
    PRIMARY KEY (reservation_id, place_id),
    CONSTRAINT fk_reservation FOREIGN KEY (reservation_id, seance_id)
        REFERENCES reservation (id, seance_id) ON DELETE CASCADE,
    CONSTRAINT uq_place_par_seance UNIQUE (seance_id, place_id)
);

-- Une place réservée doit appartenir à la salle de la séance
CREATE FUNCTION verifier_place_dans_salle() RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM place p
        JOIN seance s ON s.salle_id = p.salle_id
        WHERE p.id = NEW.place_id AND s.id = NEW.seance_id
    ) THEN
        RAISE EXCEPTION 'La place % n''appartient pas à la salle de la séance %', NEW.place_id, NEW.seance_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_place_dans_salle
    BEFORE INSERT OR UPDATE ON reservation_place
    FOR EACH ROW EXECUTE FUNCTION verifier_place_dans_salle();

-- ---------------------------------------------------------------------
-- Index pour les recherches fréquentes
-- ---------------------------------------------------------------------
CREATE INDEX idx_seance_debut        ON seance (debut);
CREATE INDEX idx_seance_film         ON seance (film_id);
CREATE INDEX idx_reservation_client  ON reservation (utilisateur_id);
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS reservation_place, reservation, seance, place, salle, film, utilisateur CASCADE;
      DROP FUNCTION IF EXISTS verifier_place_dans_salle();
    `);
  }
}
