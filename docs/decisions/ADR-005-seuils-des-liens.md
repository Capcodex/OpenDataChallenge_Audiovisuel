# ADR-005 · Seuils des liens de co-audience (RG-01, RG-04, RG-05)

- **Statut :** acceptée · RG-01 et RG-04 maintenus ; **option C retenue** pour RG-05 par le porteur du projet le 8 octobre 2026
- **Date :** 8 octobre 2026
- **Références :** T-025, T-026, RG-01, RG-04, RG-05, RG-15, CdC technique § 7.4 ; rapport [docs/exploration/seuils.md](../exploration/seuils.md)

## Contexte

Le pipeline calcule le lift des 2 278 paires de médias affichables, avec un intervalle à 95 % issu de 1 000 tirages bootstrap. Les règles du cahier des charges fonctionnel gardent un lien si l'effectif commun atteint 30 répondants (RG-04) et si la borne basse du lift dépasse strictement 1 (RG-05).

Résultat avec ces règles : **1 413 liens sur 2 278 paires (62 %)**, degré médian de 46 (chaque média est relié à 46 des 67 autres). La carte serait illisible et le mot « lien » perdrait son sens.

L'exploration (`make exploration`) en donne la cause :

| Constat | Valeur |
|---|---|
| Paires avec un lift inférieur à 1 | 5 % |
| Médias suivis par répondant (moyenne pondérée) | 10,7 ; 99e centile : 38 |
| Lift attendu si les répondants ne différaient que par le nombre de médias suivis : `E[k²] / E[k]²` | **1,57** |
| Plafond du lift de TF1 (`1 / part du public`) | 1,80 |

**Les gros consommateurs d'information sont dans le public de presque tous les médias.** Cet effet d'intensité donne à toute paire un lift d'environ 1,57, sans rapport avec une proximité réelle entre les deux publics. Le seuil « > 1 » de RG-05 ne l'écarte pas. Le lift de référence est désormais calculé à chaque exécution (`journal_coaudience.json`, clé `lift_reference_intensite`).

Second effet : le lift d'une paire ne peut pas dépasser `1 / max(p_i, p_j)`. Les médias de masse (TF1 55 %, France 2 43 %, M6 41 % du public) ont mécaniquement des lifts bas.

## Décision

### RG-01 : 50 répondants pour afficher un média (acceptée)

Seuil **maintenu**. Il exclut 12 médias non génériques : 11 cités par personne en 2026 et Jean Massiet (moins de 50). Aucun média de premier plan n'est perdu.

### RG-04 : 30 répondants en commun (acceptée)

Seuil **maintenu**. La largeur médiane de l'intervalle, rapportée au lift, est de 93 % sous 30 répondants communs, 63 % entre 30 et 49, 44 % entre 50 et 99. Sous 30, le lift est trop imprécis pour être publié. Monter à 50 isolerait 5 médias sans gain décisif.

### RG-05 : borne basse du lift (option C retenue)

| Option | Règle | Liens | Densité | Médias isolés | Effet sur les règles |
|---|---|---|---|---|---|
| A | Borne basse > 1 (RG-05 actuelle) | 1 413 | 62 % | 0 | Aucun |
| B | Borne basse > **lift de référence** (1,57 en 2026, recalculé à chaque édition) | 591 | 26 % | 1 (TF1) | RG-05 modifiée |
| C | Option A pour les données ; la carte n'affiche que les liens les plus forts de chaque média (par exemple ses 5 premiers) et ceux de l'option B | 623 affichés (5 voisins), 1 413 dans les données | 27 % à l'écran | 0 | Nouvelle règle d'affichage |

**Recommandation : option C.**

- Les données publiées gardent la règle statistique d'origine. RG-05 n'est pas modifiée et reste vérifiable par un chercheur (persona Claire).
- La carte devient lisible. Aucun média n'est isolé : TF1 garde ses voisins les plus proches malgré le plafond de son lift. Le degré médian reste de 18 à l'écran : la mise en évidence au survol (EF-M1) reste nécessaire. Avec 3 voisins minimum : 601 liens, avec 8 : 673. Le choix de ce nombre a peu d'effet.
- Le lift de référence est affiché dans la fiche et la page « Méthode » comme repère de lecture : « un lift de 1,6 correspond à ce que produit la seule intensité de consommation ».
- Les familles (Leiden) devaient être calculées sur tous les liens retenus. L'exploration du sprint 3 a montré qu'elles n'y sont pas stables : elles sont calculées sur les liens affichés ([ADR-007](ADR-007-familles.md)).

**Option écartée pour la V1 :** remplacer le lift par une mesure corrigée de l'intensité (lift conditionnel au nombre de médias suivis, corrélation, PMI normalisé). Cela changerait RG-15 et la lecture « deux fois plus que le hasard » que comprennent les personas. À réévaluer en V2.

## Conséquences (mises en œuvre au sprint 3)

- `params.yaml` : section `affichage`, `voisins_min_par_media: 5`.
- `liens.parquet` : colonne `affiche` (623 liens sur 1 413 en 2026). Les exports publient tous les liens retenus, avec cette colonne.
- La disposition de la carte (ADR-008) et les familles (ADR-007) sont calculées sur les liens affichés. Sur tous les liens retenus, aucune partition en familles utiles ne respecte RG-07 (ADR-007).
- `docs/methode.md` présente la règle d'affichage et le lift de référence.
