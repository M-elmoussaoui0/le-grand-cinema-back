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
