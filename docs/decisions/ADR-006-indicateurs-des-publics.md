# ADR-006 · Indicateurs des publics : âge, positionnement politique, confiance

- **Statut :** acceptée · définition de l'indicateur de confiance **à confirmer** par le porteur du projet
- **Date :** 8 octobre 2026
- **Références :** E0-06, T-021 à T-023, RG-03, RG-11, RG-13, RG-14, CdC technique § 7.3 et § 8.1

## Contexte

Le CdC technique prévoit, pour chaque média, un positionnement politique moyen, un âge moyen, la part des moins de 35 ans et une confiance moyenne avec un écart gauche/droite, chacun avec un intervalle de confiance. La base anonymisée de l'Arcom 2026 impose trois adaptations.

| Variable | Constat |
|---|---|
| Âge `RS2C_RECODE_AGE` | **Pas d'âge exact** : 6 classes (15-17, 18-24, 25-34, 35-49, 50-64, 65 ans et plus) |
| Orientation politique `NOU1_R1` | Échelle 0-10 en deux colonnes : sous-total (« ST Gauche »…) puis note détaillée. La note 5 n'a pas de code détaillé : seul « ST Centre » la porte (34 % des répondants). Non-réponse : 1,1 % de la base |
| Confiance `SOURCES1TER_R2` | 3 niveaux (« source de référence », « complémentaire », « à prendre avec précaution »), pas une note. Aucune colonne pour les JT |

## Décision

1. **Âge moyen approché** par le centre de chaque classe (`[borne basse, borne haute + 1[`, par exemple 21,5 ans pour 18-24 ans). La classe « 65 ans et plus » reçoit une **valeur conventionnelle de 74 ans** (`params.yaml`, `attributs.age_valeur_65_plus`), à confronter à la pyramide des âges de l'INSEE au sprint 7. Les 65 ans et plus forment 22,8 % de la base pondérée : une variation de ± 4 ans sur cette convention déplace l'âge moyen d'environ ± 0,9 an. La **part des moins de 35 ans** est exacte, car la classe 25-34 se termine à 34 ans. **Le site met en avant la part des moins de 35 ans** et présente l'âge moyen comme approché (« ≈ 45 ans »).
2. **Positionnement politique** : note détaillée si elle existe, 5 pour « ST Centre » seul, non-réponse sinon. Un répondant avec deux notes détaillées fait échouer le pipeline. Les codes et libellés sont vérifiés contre le dictionnaire, comme ceux des médias (`variables_arcom.yaml`, section `profil`).
3. **Confiance** : l'indicateur `conf_ref` est la **part pondérée de « source de référence »** parmi les personnes ayant donné leur niveau de confiance pour le média. Il est publié à partir de **50 réponses** (`confiance_effectif_min`, même logique que RG-01). Cela concerne 59 médias en 2026, tous sauf les 9 JT.
4. **Écart gauche/droite** : `conf_ref` des répondants se situant de 0 à 4, moins celui des répondants de 6 à 10. Le centre (5) est exclu. L'écart est publié si chaque bord compte au moins **30 réponses** (`ecart_effectif_min_par_bord`, même logique que RG-04). Cela concerne 46 médias.
5. **Intervalles** : mêmes 1 000 tirages bootstrap que les liens, pour tous les indicateurs.

## Conséquences

- Les noms de colonnes suivent la convention française du dépôt (`pol_moy`, `age_moy`, `moins35`, `conf_ref`, `conf_ecart_gd`…), et non l'anglais du CdC technique § 8.1. La correspondance figure dans le DAT § 7.3. Le format `graph.json` (sprint 4) garde les clés courtes du CdC.
- L'indicateur de confiance est une **part** (0 à 1), pas une moyenne : le libellé du site devra être « X % de son public le considère comme une source de référence ».
- La fiche d'un JT affichera « confiance : non mesurée par le baromètre pour les JT ».
- Une nouvelle édition qui renumérote les classes d'âge ou l'échelle politique fait échouer le pipeline (contrôle des libellés).
