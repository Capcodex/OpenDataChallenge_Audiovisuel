# ADR-007 · Familles de médias : liens, pondération et résolution de Leiden

- **Statut :** acceptée
- **Date :** 8 octobre 2026
- **Références :** T-030 à T-032, E0-07, RG-06, RG-07, CdC technique § 7.5, décision D6 ; rapport [docs/exploration/familles.md](../exploration/familles.md)

## Contexte

Le CdC technique prévoit Leiden (`RBConfigurationVertexPartition`) sur le graphe des liens, avec des poids `log(lift)`. Il faut aussi choisir la résolution parmi 0,5, 1,0 et 1,5, en comparant `log(lift)` et `lift` brut. RG-07 n'autorise l'affichage des familles que si au moins 80 % des médias ont une stabilité d'au moins 80 %, mesurée sur 100 sous-échantillons.

**Mesure de la stabilité.** Pour chaque sous-échantillon bootstrap, on recalcule le lift et l'effectif commun des liens. On garde ceux dont le lift reste supérieur à 1 et qui respectent RG-04, puis on recalcule les familles. Un nouvel intervalle de confiance par sous-échantillon, c'est-à-dire un bootstrap dans le bootstrap, coûterait 100 000 calculs pour un gain négligeable.

L'exploration a testé 36 configurations : deux ensembles de liens, deux pondérations, et des résolutions de 0,5 à 1,5. Extrait :

| Liens | Poids | Résolution | Familles | Médias stables | RG-07 |
|---|---|---|---|---|---|
| Tous les liens retenus (1 413) | log(lift) | 1,0 | 3 (30/21/17) | 49 % | ✗ |
| Tous les liens retenus | lift | 1,0 | 4 (25/20/18/5) | 63 % | ✗ |
| Tous les liens retenus | log(lift) | 1,5 | 17, dont 6 réduites à un seul média | 50 % | ✗ |
| Liens affichés (623) | log(lift) | 0,5 | 2 (55/13) | 85 % | ✓ |
| **Liens affichés** | **log(lift)** | **0,6** | **3 (43/15/10)** | **94 %** | **✓** |
| Liens affichés | log(lift) | 0,7 | 3 (32/26/10) | 66 % | ✗ |
| Liens affichés | log(lift) | 1,0 | 4 (20/17/16/15) | 75 % | ✗ |

**Sur tous les liens retenus, aucune partition en familles de taille utile ne respecte RG-07.** Le graphe est trop dense : l'effet d'intensité de consommation de l'ADR-005 brouille les regroupements. Les fortes résolutions ne passent RG-07 qu'en morcelant le graphe en dizaines de familles d'un seul média.

## Décision

- **Liens :** les liens affichés sur la carte (ADR-005, option C). C'est aussi ce que voit l'utilisateur : les couleurs correspondent aux liens tracés.
- **Poids :** `log(lift)`, comme le recommandait le CdC (décision D6). À résolution égale, `lift` brut donne des résultats proches et un peu moins stables.
- **Résolution : 0,6.** Le critère est fixé dans le script d'exploration : RG-07 respectée, toutes les familles d'au moins 3 médias, puis le plus grand nombre de familles et enfin la meilleure stabilité.

Résultat en 2026 : **3 familles, 94 % des médias stables, ARI moyen 0,86 → familles affichées.**

| Famille | Médias | Âge moyen des publics | Exemples |
|---|---|---|---|
| 1 | 43 | 45 ans | Chaînes d'information, radios, presse nationale et magazines |
| 2 | 15 | 50 ans | TF1, France 2, France 3, M6 et leurs JT, France 5, TMC, Ici |
| 3 | 10 | 34 ans | Brut, HugoDécrypte, Konbini, Loopsider, Blast, AJ+, Gaspard G… |

**Alternative écartée : 4 familles (résolution 1,0).** Seuls 75 % des médias y sont stables. Elle découpe la famille 1 en deux groupes dont le public moyen se situe à 6,2 et à 5,1 sur l'échelle politique. Une telle carte serait lue comme un partage gauche/droite des médias, que RG-20 interdit de suggérer.

## Conséquences

- La famille 1 est très large : 43 des 68 médias. La carte distingue surtout les grands publics de la télévision, les publics de l'information, et les publics jeunes des médias en ligne. La proximité fine entre médias passe par les liens et la fiche, pas par les couleurs.
- **Ce choix est fragile.** À la résolution 0,7, la stabilité tombe à 66 %. À chaque nouvelle édition, `make exploration` doit être relancé et ce choix revu. RG-07 protège le site : si la stabilité passe sous le seuil, la carte s'affiche sans couleurs de famille.
- 4 médias ont une stabilité inférieure à 80 % : France 5 (20 %), TMC (29 %), Salomé Saqué (65 %) et Slate (66 %). Leur fiche devra signaler une « appartenance incertaine » (sprint 6).
- **Médias « ponts » (T-034)** : intermédiarité et coefficient de participation sont calculés sur les mêmes liens. Avec 3 familles, la participation repère surtout les médias à cheval entre deux familles : les JT, TMC, et Slate, Loopsider et Konbini à la lisière des publics jeunes.
- Paramètres dans `params.yaml` : `communautes.liens: affiches`, `poids: log_lift`, `resolution: 0.6`.
