# Méthode

*Source de la page « Méthode » du site (rédaction finale au sprint 7). Ce document est mis à jour à chaque modification d'un calcul ou d'un seuil. Les paramètres cités sont dans [`config/params.yaml`](../config/params.yaml).*

État : **sprint 2**. Données, liens de co-audience et profils des publics. Les familles, la disposition de la carte, la propriété et les JT seront ajoutés aux sprints 3 à 5.

---

## 1. Les données

**Source :** baromètre de l'Arcom « Les Français et l'information », édition 2026. Réponses individuelles anonymisées, Licence Ouverte.

- **3 377 personnes interrogées**, dont **2 939** intéressées par l'information générale. Seules ces dernières ont répondu aux questions sur les médias, et elles forment la base de tous les calculs (RG-10).
- Les médias suivis viennent de sept questions : radios, journaux, magazines, chaînes de télévision, chaînes d'information, médias en ligne et créateurs, journaux télévisés. Les sous-totaux, « Rien de tout cela » et les catégories génériques (« une radio locale ») ne sont pas des médias (RG-12).
- La question sur les médias en ligne n'a pas été posée aux 143 personnes interrogées par téléphone, qui n'utilisent pas internet. Elles sont comptées comme ne suivant pas ces médias ([ADR-004](decisions/ADR-004-base-repondants.md)).
- **Pondération :** tous les pourcentages et moyennes utilisent le poids fourni par l'Arcom (colonne `POIDS`), qui rend l'échantillon représentatif. Les effectifs affichés (« 586 répondants ») sont des nombres de personnes, non pondérés (RG-11).

## 2. Quels médias apparaissent

Un média apparaît sur la carte s'il est suivi par au moins **50 répondants** (`media_affichable_min`, RG-01). Sous ce seuil, il reste trouvable dans la recherche avec la mention « effectif insuffisant » (RG-02).

Entre 50 et 99 répondants, ses chiffres sont signalés comme **fragiles** (`chiffre_fragile_sous`, RG-03).

En 2026 : 99 médias au référentiel, dont 19 catégories génériques. **68 médias sont affichables**, dont 10 fragiles.

## 3. Les liens : publics partagés

### 3.1 Le lift

Deux médias sont proches quand **les mêmes personnes les suivent**. On mesure cette proximité par le **lift** (RG-15) :

```
lift(A, B) = part du public qui suit A et B  /  (part qui suit A × part qui suit B)
```

- Lift = 1 : les deux publics se recouvrent comme si chacun choisissait ses médias au hasard.
- Lift = 2 : ils se recouvrent deux fois plus.
- Lift < 1 : moins que le hasard.

Le lift décrit des **publics**, pas des lignes éditoriales : deux médias reliés sont suivis par les mêmes personnes, ce qui ne dit rien de leur contenu.

### 3.2 La marge d'incertitude

Chaque lift est accompagné d'un **intervalle de confiance à 95 %**. On le calcule par rééchantillonnage : on refait le calcul 1 000 fois (`bootstrap.iterations`) sur des échantillons tirés au hasard, avec remise, parmi les répondants, en gardant leurs poids. Les bornes de l'intervalle sont les valeurs qui laissent 2,5 % des résultats en dessous et 2,5 % au-dessus. Le tirage est fixé par une graine (`seed`) : le calcul donne exactement le même résultat à chaque exécution.

### 3.3 Quels liens sont gardés

Un lien entre deux médias affichables est gardé si :

1. au moins **30 répondants** suivent les deux médias (`lien_effectif_commun_min`, RG-04). En dessous, l'intervalle de confiance est presque aussi large que le lift lui-même ;
2. la **borne basse** de l'intervalle du lift est **strictement supérieure à 1** (`lien_lift_borne_basse_min`, RG-05).

En 2026 : 2 278 paires testées, **1 413 liens gardés**. 580 paires sont écartées pour effectif insuffisant et 285 pour un lift non significativement supérieur à 1.

### 3.4 Un repère de lecture : le lift de référence

Les personnes qui s'informent beaucoup suivent de nombreux médias : 10,7 en moyenne, et jusqu'à 38 pour 1 % des répondants. Elles font partie du public de presque tous les médias, ce qui rapproche toutes les paires. Si les répondants ne différaient que par le **nombre** de médias qu'ils suivent, chaque paire aurait un lift d'environ **1,57** en 2026 (`E[k²] / E[k]²`, où `k` est le nombre de médias suivis).

Un lift proche de 1,6 indique donc surtout que les deux médias touchent des gros consommateurs d'information. Un lift de 3 ou plus indique une vraie proximité des publics.

Les médias à très large audience ont des lifts mécaniquement bas : le lift ne peut pas dépasser `1 / part du public du média`, soit 1,8 pour TF1.

*La règle d'affichage des liens sur la carte est en cours de décision ([ADR-005](decisions/ADR-005-seuils-des-liens.md)).*

## 4. Le profil des publics

Pour chaque média affichable, on décrit les personnes qui le suivent ([ADR-006](decisions/ADR-006-indicateurs-des-publics.md)). Chaque indicateur est accompagné d'un intervalle à 95 %, calculé avec les mêmes 1 000 tirages que les liens.

| Indicateur | Définition |
|---|---|
| **Positionnement politique moyen** | Moyenne, sur l'échelle de 0 (très à gauche) à 10 (très à droite), de l'auto-positionnement des personnes qui suivent le média. Les non-réponses sont exclues, et leur part est indiquée (RG-13). Elle est de 1 % sur l'ensemble de la base. |
| **Part des moins de 35 ans** | Part des personnes qui suivent le média ayant moins de 35 ans. |
| **Âge moyen (approché)** | L'Arcom ne publie l'âge que par tranches. Chaque tranche est remplacée par son milieu (21,5 ans pour 18-24 ans) et les 65 ans et plus comptent pour 74 ans, une valeur conventionnelle. Le résultat est un ordre de grandeur, à ± 1 an environ. |
| **Confiance** | Part des personnes qui suivent le média et le considèrent comme « une source de référence ». Les autres réponses possibles sont « complémentaire » et « à prendre avec précaution ». Publiée à partir de 50 réponses (`confiance_effectif_min`). Le baromètre ne pose pas cette question pour les journaux télévisés (RG-14). |
| **Écart de confiance gauche/droite** | Confiance chez les personnes qui se situent de 0 à 4, moins confiance chez celles de 6 à 10. Le centre (5) est exclu. Publié si chaque côté compte au moins 30 réponses (`ecart_effectif_min_par_bord`). |

**Le positionnement politique décrit le public, pas le média.** Un public positionné à 6,7 en moyenne ne fait pas d'un média un « média de droite » (RG-20).

## 5. Ce qui n'est jamais publié

- Aucune réponse individuelle : les tables par répondant ne quittent pas le pipeline.
- Aucun lien appuyé sur moins de 30 répondants communs, aucun indicateur de média sous 50 répondants, aucune confiance sous 50 réponses.

## 6. Paramètres (édition 2026)

| Paramètre | Valeur | Règle |
|---|---|---|
| `media_affichable_min` | 50 | RG-01 |
| `chiffre_fragile_sous` | 100 | RG-03 |
| `lien_effectif_commun_min` | 30 | RG-04 |
| `lien_lift_borne_basse_min` | 1,0 (strictement supérieur) | RG-05 |
| `confiance_effectif_min` | 50 | RG-14, ADR-006 |
| `ecart_effectif_min_par_bord` | 30 | ADR-006 |
| `bootstrap.iterations` | 1 000 | CdCT § 7.3 |
| `bootstrap.niveau_confiance` | 95 % | |
| `age_valeur_65_plus` | 74 ans | ADR-006 |
| `seed` | 20261008 | Reproductibilité |
