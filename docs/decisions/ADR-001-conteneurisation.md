# ADR-001 · Conteneurisation intégrale du projet

- **Statut :** acceptée
- **Date :** 8 octobre 2026
- **Références :** CdC technique principe A7 et § 5

## Contexte

Le projet combine un pipeline Python, un site TypeScript, des tests de bout en bout avec navigateurs et une base Neo4j optionnelle. Il doit être reproductible (ENF-12) et pouvoir être repris par un contributeur extérieur, notamment un chercheur (persona Claire).

## Décision

Tout le projet est conteneurisé avec Docker et orchestré par `compose.yaml`. Le seul prérequis sur un poste ou en CI est Docker avec Docker Compose v2. Aucune dépendance n'est installée directement sur la machine.

- Images de base figées par empreinte (`@sha256:…`), mises à jour volontairement.
- Conteneurs exécutés avec un utilisateur non root (uid 1000).
- Le dossier `data/` n'entre jamais dans une image : il est exclu par `.dockerignore` et monté en volume (ENF-09).
- Les dépendances Python sont verrouillées par `uv.lock` ; uv tourne lui aussi dans un conteneur.

## Conséquences

- Même environnement sur tous les postes et en CI.
- Sur Linux, les dossiers montés doivent être accessibles en écriture à l'uid 1000 (la CI fait un `chmod`). Sans effet sur Docker Desktop (macOS).
- L'image du pipeline mesure ≈ 800 Mo, principalement pyarrow, scipy et pandas. Le budget de 1 Go est contrôlé en CI.
- Une modification des dépendances impose de régénérer `uv.lock` dans un conteneur (commande dans le README).
