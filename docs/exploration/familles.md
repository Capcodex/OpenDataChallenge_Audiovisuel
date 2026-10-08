# Exploration des familles de médias

*Généré par `docs/exploration/familles.py` (`make exploration`). Édition 2026,
68 médias, 100 sous-échantillons bootstrap par configuration.
Ne pas modifier à la main.*

RG-07 : les familles sont affichées si au moins 80 % des
médias ont une stabilité d'au moins 80 % (part des
sous-échantillons où le média reste dans sa famille).

## 1. Toutes les configurations

| Liens | Poids | Résolution | Familles | Tailles | Médias stables | ARI moyen | RG-07 |
|---|---|---|---|---|---|---|---|
| tous les liens retenus | log(lift) | 0.5 | 1 | 68 | 100 % | nan | ✅ |
| tous les liens retenus | log(lift) | 0.6 | 1 | 68 | 100 % | nan | ✅ |
| tous les liens retenus | log(lift) | 0.7 | 2 | 58/10 | 85 % | 0.60 | ✅ |
| tous les liens retenus | log(lift) | 0.8 | 1 | 68 | 72 % | nan | — |
| tous les liens retenus | log(lift) | 0.9 | 3 | 28/24/16 | 56 % | 0.38 | — |
| tous les liens retenus | log(lift) | 1 | 3 | 30/21/17 | 49 % | 0.51 | — |
| tous les liens retenus | log(lift) | 1.1 | 5 | 16/14/14/13/11 | 44 % | 0.56 | — |
| tous les liens retenus | log(lift) | 1.2 | 6 | 16/12/12/11/11/6 | 56 % | 0.60 | — |
| tous les liens retenus | log(lift) | 1.5 | 17 | 12/10/10/7/5/4/4/4/3/2/1/1/1/1/1/1/1 | 50 % | 0.71 | — |
| tous les liens retenus | lift | 0.5 | 1 | 68 | 100 % | nan | ✅ |
| tous les liens retenus | lift | 0.6 | 1 | 68 | 100 % | nan | ✅ |
| tous les liens retenus | lift | 0.7 | 1 | 68 | 100 % | nan | ✅ |
| tous les liens retenus | lift | 0.8 | 2 | 57/11 | 50 % | 0.35 | — |
| tous les liens retenus | lift | 0.9 | 3 | 29/23/16 | 75 % | 0.67 | — |
| tous les liens retenus | lift | 1 | 4 | 25/20/18/5 | 63 % | 0.67 | — |
| tous les liens retenus | lift | 1.1 | 5 | 21/18/15/11/3 | 57 % | 0.58 | — |
| tous les liens retenus | lift | 1.2 | 7 | 22/17/11/8/8/1/1 | 41 % | 0.61 | — |
| tous les liens retenus | lift | 1.5 | 18 | 15/11/7/5/4/4/4/4/4/2/1/1/1/1/1/1/1/1 | 37 % | 0.68 | — |
| liens affichés (ADR-005) | log(lift) | 0.5 | 2 | 55/13 | 85 % | 0.65 | ✅ |
| liens affichés (ADR-005) | log(lift) | 0.6 | 3 | 43/15/10 | 94 % | 0.86 | ✅ |
| liens affichés (ADR-005) | log(lift) | 0.7 | 3 | 32/26/10 | 66 % | 0.72 | — |
| liens affichés (ADR-005) | log(lift) | 0.8 | 4 | 21/21/13/13 | 68 % | 0.52 | — |
| liens affichés (ADR-005) | log(lift) | 0.9 | 4 | 21/20/14/13 | 74 % | 0.70 | — |
| liens affichés (ADR-005) | log(lift) | 1 | 4 | 20/17/16/15 | 75 % | 0.72 | — |
| liens affichés (ADR-005) | log(lift) | 1.1 | 5 | 18/16/16/11/7 | 71 % | 0.70 | — |
| liens affichés (ADR-005) | log(lift) | 1.2 | 5 | 18/16/15/10/9 | 50 % | 0.61 | — |
| liens affichés (ADR-005) | log(lift) | 1.5 | 12 | 12/12/9/8/7/5/5/4/3/1/1/1 | 37 % | 0.52 | — |
| liens affichés (ADR-005) | lift | 0.5 | 2 | 55/13 | 85 % | 0.66 | ✅ |
| liens affichés (ADR-005) | lift | 0.6 | 3 | 45/13/10 | 93 % | 0.88 | ✅ |
| liens affichés (ADR-005) | lift | 0.7 | 3 | 32/26/10 | 74 % | 0.79 | — |
| liens affichés (ADR-005) | lift | 0.8 | 4 | 31/19/10/8 | 69 % | 0.67 | — |
| liens affichés (ADR-005) | lift | 0.9 | 4 | 21/19/15/13 | 68 % | 0.63 | — |
| liens affichés (ADR-005) | lift | 1 | 4 | 19/18/16/15 | 71 % | 0.67 | — |
| liens affichés (ADR-005) | lift | 1.1 | 5 | 18/16/16/11/7 | 66 % | 0.67 | — |
| liens affichés (ADR-005) | lift | 1.2 | 6 | 16/16/15/11/6/4 | 51 % | 0.64 | — |
| liens affichés (ADR-005) | lift | 1.5 | 11 | 13/13/12/7/5/5/4/4/3/1/1 | 43 % | 0.53 | — |

## 2. Choix

Critère : RG-07 respectée, toutes les familles d'au moins 3 médias ; parmi ces
configurations, le plus grand nombre de familles, puis la plus stable.

- Configuration qui satisfait le critère : **liens affichés (ADR-005), poids log_lift,
  résolution 0.6** (94 % des médias stables).
- Configuration de `params.yaml` : **liens affichés (ADR-005), poids log_lift, résolution
  0.6** (identique).

## 3. Familles de la configuration retenue

Médias marqués * : stabilité inférieure à 80 %. Médias classés
par taille de public.

| Famille | Médias | Âge moyen des publics | Composition |
|---|---|---|---|
| 1 | 43 | 45 ans | BFM TV, Arte, CNews, Franceinfo (TV), Franceinfo (radio), RTL, LCI, Le Monde, France Inter, L'Équipe, Le Parisien, Europe 1, Le Figaro, RMC, RMC Story, France 24, Arte Journal, France Culture, Le Point, BFM Business, Paris Match, Mediapart, Libération, M, le magazine du Monde, HuffPost, Les Echos, L'Express, Linternaute, L'Obs, Courrier international, Marianne, Samuel Étienne, Télérama, Le Figaro Magazine, L'Humanité, Sud Radio, Valeurs actuelles, La Croix, Radio Classique, RFI, Rue89, Frontières, Atlantico |
| 2 | 15 | 50 ans | TF1, France 2, M6, Le 20h de TF1, France 3, Le 20h de France 2, Le 13h de TF1, Le 19.45 de M6, France 5 *, Le 19/20 de France 3, Le 12.45 de M6, Le 13h de France 2, TMC *, Ici (ex-France Bleu), Le 12/13 de France 3 |
| 3 | 10 | 34 ans | Brut, HugoDécrypte, Konbini, Blast, Loopsider, Salomé Saqué *, Gaspard G, AJ+, Slate *, Le Crayon |

Médias sous le seuil de stabilité : France 5 (20 %), TMC (29 %), Salomé Saqué (65 %), Slate (66 %).

## 4. Alternative écartée : 4 familles (liens affichés, log(lift), résolution 1)

75 % des médias stables : RG-07 n'est pas respectée.

| Famille | Médias | Âge moyen des publics | Composition |
|---|---|---|---|
| 1 | 20 | 46 ans | BFM TV, CNews, RTL, LCI, L'Équipe, Europe 1, Le Figaro, RMC, RMC Story *, Le Point, BFM Business, Paris Match, L'Express, Le Figaro Magazine *, Sud Radio, Valeurs actuelles, La Croix *, Radio Classique *, Frontières, Atlantico |
| 2 | 17 | 46 ans | Arte, Franceinfo (TV), Franceinfo (radio), France Inter, Arte Journal, France Culture, Libération, M, le magazine du Monde, HuffPost, Les Echos *, Linternaute *, L'Obs, Courrier international, Marianne, Télérama, L'Humanité, RFI * |
| 3 | 16 | 36 ans | Le Monde, Brut, Le Parisien *, HugoDécrypte, Konbini, France 24 *, Mediapart *, Samuel Étienne, Blast, Rue89, Loopsider, Salomé Saqué *, Gaspard G, AJ+, Slate *, Le Crayon |
| 4 | 15 | 50 ans | TF1, France 2, M6 *, Le 20h de TF1, France 3, Le 20h de France 2, Le 13h de TF1, Le 19.45 de M6 *, France 5 *, Le 19/20 de France 3, Le 12.45 de M6 *, Le 13h de France 2, TMC *, Ici (ex-France Bleu), Le 12/13 de France 3 |
