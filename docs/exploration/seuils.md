# Exploration des seuils des liens de co-audience

*Généré par `docs/exploration/seuils.py` (`make exploration`). Édition 2026,
68 médias affichables, 2278 paires, 1000
tirages bootstrap. Ne pas modifier à la main.*

## 1. Distribution des lifts (toutes les paires de médias affichables)

| 5 % | 25 % | médiane | 75 % | 95 % |
|---|---|---|---|---|
| 1.00 | 1.36 | 1.80 | 2.70 | 4.81 |

- 5 % des paires ont un lift inférieur à 1 ;
  0.7 % ont même une borne haute inférieure à 1.
- **Presque toutes les paires de médias partagent leur public plus que ne le voudrait le hasard.**

## 2. Pourquoi : l'intensité de consommation

Un répondant suit en moyenne **10.7 médias** (pondéré ; quartiles 6 /
10 / 15, 99e centile 38). Les gros consommateurs d'information
apparaissent dans le public de presque tous les médias, ce qui gonfle tous les lifts.

Si les répondants ne différaient **que** par le nombre de médias qu'ils suivent (chacun choisissant
ses médias au hasard, proportionnellement à leur audience), le lift attendu de **toute** paire
serait :

```
lift_nul = E[k²] / E[k]² = 179.3 / 10.7² = 1.57
```

Ce lift de référence ne dit rien de la proximité entre deux médias : il mesure seulement la
dispersion des intensités de consommation. Avec RG-05 tel qu'écrit (borne basse > 1), la plupart
des liens retenus ne font que refléter cet effet.

## 3. Nombre de liens selon les seuils

Densité = liens / paires possibles ; degré = nombre de liens d'un média ; isolés = médias
affichables sans aucun lien.

| Effectif commun (RG-04) | Borne basse (RG-05) | Liens | Densité | Degré médian | Isolés |
|---|---|---|---|---|---|
| ≥ 20 | > 1 | 1615 | 71 % | 51 | 0 |
| ≥ 20 | > 1.2 | 1257 | 55 % | 40 | 0 |
| ≥ 20 | > 1.5 | 807 | 35 % | 24 | 0 |
| ≥ 20 | > 2 | 395 | 17 % | 8 | 5 |
| ≥ 30 | > 1 | 1413 | 62 % | 46 | 0 |
| ≥ 30 | > 1.2 | 1080 | 47 % | 34 | 0 |
| ≥ 30 | > 1.5 | 663 | 29 % | 18 | 0 |
| ≥ 30 | > 2 | 306 | 13 % | 6 | 6 |
| ≥ 50 | > 1 | 1075 | 47 % | 36 | 5 |
| ≥ 50 | > 1.2 | 800 | 35 % | 24 | 5 |
| ≥ 50 | > 1.5 | 462 | 20 % | 12 | 5 |
| ≥ 50 | > 2 | 189 | 8 % | 3 | 12 |

Avec RG-04 à 30 et une borne basse supérieure au lift de
référence (1.57) : **591 liens**, médias isolés :
tf1.

**Plafond des grands médias.** Comme `p_ij ≤ min(p_i, p_j)`, le lift d'une paire ne peut pas
dépasser `1 / max(p_i, p_j)`. Les médias à très large audience ont donc mécaniquement des lifts
faibles et disparaissent du graphe dès que le seuil monte : tf1 (part 55 %, lift ≤ 1.80), france-2 (part 43 %, lift ≤ 2.30), m6 (part 41 %, lift ≤ 2.46).

## 4. Précision selon l'effectif commun

Largeur médiane de l'intervalle à 95 %, rapportée au lift.

| Effectif commun | Paires | Largeur relative médiane |
|---|---|---|
| ]0, 29] | 580 | 93 % |
| ]29, 49] | 428 | 63 % |
| ]49, 99] | 572 | 44 % |
| ]99, 199] | 428 | 31 % |
| ]199, 10000] | 270 | 19 % |

## 5. Médias exclus par RG-01 (moins de 50 répondants)

cherie-fm, europe-2, france-musique, fun-radio, nostalgie, nrj, rfm, rtl2, skyrock, c8, canal-plus, jean-massiet (12 médias non génériques, dont
11 cités par personne).

## 6. Attributs : précision

Largeur médiane de l'intervalle du positionnement politique : 0.67 point (échelle 0-10) ;
maximum 2.31 point
(slate).
