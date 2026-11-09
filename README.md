# Le Grand Cinéma – Back end (API et base de données)

API et base de données de l'application de réservation de places pour le cinéma Le Grand Cinéma (10 salles modulables, 1 700 places).

## Branches principales

| Branche | Rôle | Règle |
|---|---|---|
| `main` | Version en production, toujours stable | Aucun push direct : modification uniquement par Pull Request validée |
| `develop` | Branche d'intégration de toutes les fonctionnalités terminées | Reçoit les branches `feature/` et `fix/` par Pull Request |

## Convention de nommage des branches

Format : `type/ID-description-courte`

| Type | Usage | Part de | Revient dans | Exemple |
|---|---|---|---|---|
| `feature/` | Nouvelle fonctionnalité (une User Story) | `develop` | `develop` | `feature/US5-place-unique` |
| `fix/` | Correction d'un bug non urgent | `develop` | `develop` | `fix/US5-double-reservation` |
| `hotfix/` | Correction urgente en production | `main` | `main` et `develop` | `hotfix/paiement-stripe` |
| `release/` | Préparation d'une version | `develop` | `main` et `develop` | `release/1.0.0` |

## Règles d'écriture

- Tout en minuscules, sauf l'identifiant de la User Story (US5).
- Mots séparés par des tirets `-` : pas d'espaces, pas d'accents.
- L'identifiant reprend celui de la carte Trello (US1 à US16).
- Une branche = une User Story ou un bug.

## Cycle de travail

1. Créer sa branche depuis `develop` : `feature/US5-place-unique`.
2. Développer et tester en local.
3. Ouvrir une Pull Request vers `develop`, relue par un autre développeur.
4. Fusionner une fois les tests passés et la DoD respectée.
5. En fin de sprint : `release/x.y.z` puis fusion dans `main`.

## Messages de commit

Format : `type: description` (convention Conventional Commits)

- `feat: ajout de l'API de réservation`
- `fix: blocage de la place pendant le paiement`
- `docs: mise à jour de la convention de branches`

## Stack technique

- **NestJS 10** (TypeScript) : API REST
- **PostgreSQL 16** avec **TypeORM** (migrations versionnées)
- **Swagger / OpenAPI** : documentation de l'API sur `/api/docs`
- **Jest** : tests unitaires et tests d'intégration
- **GitHub Actions** : intégration continue à chaque Pull Request

## Démarrer le projet en local

```bash
npm install
cp .env.example .env      # puis renseigner DATABASE_URL et JWT_SECRET
npm run build
npm run seed              # crée les tables et les données de démonstration
npm start                 # API sur http://localhost:3000/api
```

Documentation interactive de l'API : http://localhost:3000/api/docs

## Scripts

| Commande | Rôle |
|---|---|
| `npm run start:dev` | Démarre l'API en mode développement (rechargement automatique) |
| `npm run lint` | Vérifie la qualité du code (ESLint) |
| `npm test` | Lance les tests unitaires |
| `npm run test:e2e` | Lance les tests d'intégration sur une vraie base PostgreSQL |
| `npm run seed` | Applique les migrations et insère les données de démonstration |
| `npm run charge` | Test de charge : 200 utilisateurs simultanés sur la programmation et le plan de salle |

## User Stories développées

Chaque User Story a été développée sur sa propre branche `feature/`, puis fusionnée dans `develop`.

| User Story | Branche | Routes de l'API |
|---|---|---|
| US1 Voir les séances sans compte | `feature/US1-voir-seances` | `GET /api/films`, `GET /api/seances`, `GET /api/seances/:id` |
| US2 Voir les places restantes | `feature/US2-places-restantes` | `placesRestantes` dans chaque séance |
| US3 Choisir sa place sur un plan | `feature/US3-plan-salle` | `GET /api/seances/:id/plan` |
| US4 Réserver et payer sur mobile | `feature/US4-paiement-mobile` | `POST /api/reservations/:id/paiement` |
| US5 Garantir une place unique | `feature/US5-place-unique` | `POST /api/reservations` |
| US6 Recevoir un billet QR code | `feature/US6-billet-qr-code` | `GET /api/reservations/:id/billet` |
| US7 Scanner un billet à l'entrée | `feature/US7-scanner-billet` | `POST /api/billets/scan` |
| US8 Créer une séance | `feature/US8-creer-seance` | `POST /api/admin/seances`, `DELETE /api/admin/seances/:id` |
| US9 Réserver un quota au guichet | `feature/US9-quota-guichet` | `PATCH /api/admin/seances/:id/quota`, `POST /api/admin/guichet/ventes` |
| US10 Suivre une séance en direct | `feature/US10-suivi-direct` | `GET /api/admin/seances/:id/direct` |
| US11 Voir le taux de remplissage | `feature/US11-taux-remplissage` | `GET /api/admin/remplissage` |
| US12 Être alerté en cas de pic | `feature/US12-alerte-pic` | `GET /api/admin/alertes` |
| US13 Retrouver ses réservations | `feature/US13-mes-reservations` | `GET /api/reservations/moi`, `DELETE /api/reservations/:id` |
| US14 Réserver en anglais | (front end) | – |
| US15 Tenir la charge du festival | `feature/US15-tenir-la-charge` | cache, compression, index, test de charge |
| US16 Protéger les données | `feature/US16-protection-donnees` | `POST /api/auth/inscription`, `POST /api/auth/connexion`, `GET` et `DELETE /api/auth/moi` |

## Organisation du code

```
src/
├── auth/            US16 : inscription, connexion JWT, rôles, suppression du compte
├── catalogue/       US1 à US3 : films, séances, places restantes, plan de salle
├── reservations/    US4, US5, US13 : réservation, paiement, historique, annulation
├── paiement/        prestataire de paiement (mode test, sur le modèle de Stripe)
├── billets/         US6, US7 : billet QR code, contrôle à l'entrée
├── admin/           US8 à US12 : séances, guichet, suivi en direct, remplissage, alertes
├── common/          gestion des erreurs, fuseau horaire
├── database/        connexion, migrations, données de démonstration
└── health/          état de l'API et de la base
test/                tests d'intégration (API + vraie base PostgreSQL)
```

Chaque module suit le découpage NestJS : le **contrôleur** reçoit la requête HTTP, le **DTO** valide les données, le **service** contient les règles métier et accède à la base.

## Variables d'environnement

Voir [`.env.example`](.env.example). Aucun secret n'est versionné : le fichier `.env` est ignoré par Git.
