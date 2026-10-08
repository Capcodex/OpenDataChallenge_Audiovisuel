# Méthode

*Source de la page « Méthode » du site (rédaction finale au sprint 7). Ce document est mis à jour à chaque modification d'un calcul ou d'un seuil. Les paramètres cités sont dans [`config/params.yaml`](../config/params.yaml).*

État : **sprint 3**. Données, liens de co-audience, profils des publics, familles et disposition de la carte. La propriété et les JT seront ajoutés aux sprints 4 et 5.

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

### 3.5 Les liens tracés sur la carte

Tracer les 1 413 liens rendrait la carte illisible. La carte montre donc, pour chaque média, **ses 5 liens les plus forts** (`voisins_min_par_media`), plus **tous les liens nettement au-dessus du lift de référence** (borne basse > 1,57). En 2026, cela fait **623 liens**, et aucun média n'est isolé ([ADR-005](decisions/ADR-005-seuils-des-liens.md)).

Les données téléchargeables contiennent les 1 413 liens, avec une colonne indiquant ceux qui sont tracés.

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

## 5. Les familles de médias

Les couleurs de la carte correspondent à des **familles** : des groupes de médias plus liés entre eux qu'avec le reste. Personne ne les définit à l'avance. Elles sont détectées automatiquement par l'algorithme de Leiden, à partir des liens tracés sur la carte, chaque lien comptant selon le logarithme de son lift (RG-06).

**Ces familles sont-elles solides ?** On refait tout le calcul sur 100 échantillons tirés au hasard (`sous_echantillons`). Pour chaque média, la **stabilité** est la part des échantillons où il reste dans sa famille. Les familles ne sont affichées que si au moins 80 % des médias ont une stabilité d'au moins 80 % (RG-07). Sinon, la carte s'affiche sans couleurs.

En 2026 : **3 familles, 94 % des médias stables** ([ADR-007](decisions/ADR-007-familles.md)).

| Famille | Médias | Caractéristique du public |
|---|---|---|
| 1 | 43 | Chaînes d'information, radios, presse nationale et magazines |
| 2 | 15 | Grandes chaînes de télévision et leurs journaux télévisés ; public plus âgé (50 ans en moyenne) |
| 3 | 10 | Médias en ligne et créateurs de contenu ; public jeune (34 ans en moyenne) |

Un découpage plus fin, en 4 familles, n'est pas assez stable (75 %) : il n'est pas affiché.

**Médias « ponts ».** Certains médias ont des liens dans plusieurs familles. Le **coefficient de participation** mesure cette répartition : 0 si tous les liens du média restent dans sa famille, davantage s'ils se partagent entre plusieurs. Les 10 médias au coefficient le plus élevé sont signalés comme « ponts » (`ponts_nombre`).

## 6. La disposition de la carte

La position des médias est calculée une fois pour toutes par l'algorithme ForceAtlas2, celui du logiciel Gephi. Les médias reliés s'attirent, d'autant plus que leur lift est élevé, et tous les médias se repoussent. Deux médias proches sur la carte partagent donc souvent leur public. **Les distances ne sont pas des mesures exactes** : seuls les liens et leur lift le sont. Le calcul part d'une position tirée avec une graine fixe : la carte est identique à chaque visite ([ADR-008](decisions/ADR-008-disposition.md)).

## 7. Ce qui n'est jamais publié

- Aucune réponse individuelle : les tables par répondant ne quittent pas le pipeline.
- Aucun lien appuyé sur moins de 30 répondants communs, aucun indicateur de média sous 50 répondants, aucune confiance sous 50 réponses.

## 8. Paramètres (édition 2026)

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
| `voisins_min_par_media` | 5 liens tracés au minimum par média | ADR-005 |
| `communautes.liens` | liens tracés | ADR-007 |
| `communautes.poids` | log(lift) | RG-06, ADR-007 |
| `communautes.resolution` | 0,6 | ADR-007 |
| `communautes.sous_echantillons` | 100 | RG-07 |
| `stabilite_noeud_min`, `part_noeuds_stables_min` | 80 %, 80 % | RG-07 |
| `ponts_nombre` | 10 | ADR-007 |
| `layout.iterations` | 2 000 | ADR-008 |
| `seed` | 20261008 | Reproductibilité |
