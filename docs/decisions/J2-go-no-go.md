# Jalon J2 · Décision « go / no go » sur la carte

- **Statut :** proposition : **go sous condition**, décision du porteur du projet attendue
- **Date :** 8 octobre 2026 (jalon prévu le 30 octobre)
- **Références :** plan d'implémentation § S3, T-037, ADR-005, ADR-007, ADR-008

## Question

Le graphe est-il lisible, et les familles assez solides pour être affichées ?

## Résultats

| Critère du plan | Seuil | Résultat 2026 | |
|---|---|---|---|
| Médias stables dans leur famille (RG-07) | ≥ 80 % | **94 %** (ARI moyen 0,86) | ✅ |
| Familles nommables | Test H5 : 3 à 5 personnes extérieures | **Non fait** | ⏳ |
| Densité (risque « graphe trop dense ») | ≤ 40 % des paires | 62 % des paires retenues, **27 % affichées** (ADR-005) | ✅ à l'écran |
| Structure visible | Lecture de la carte | 3 zones nettes : grands publics de la télévision, information et presse, médias en ligne au public jeune | ✅ |

Aperçu : [`docs/exploration/carte.svg`](../exploration/carte.svg). Graphe pour Gephi : `data/output/graphe_provisoire.gexf` (`make exploration`).

## Points de vigilance

1. **Familles peu nombreuses et inégales (43/15/10).** Elles ne disent pas « qui est proche de qui » à l'intérieur de l'information et de la presse : ce rôle revient aux liens, à la fiche et à la vue tableau.
2. **Le choix de la résolution est fragile.** À 0,7 au lieu de 0,6, la stabilité tombe à 66 %. À revoir à chaque édition (ADR-007).
3. **Un découpage plus fin (4 familles) serait lu politiquement** : deux familles d'information dont les publics se situent en moyenne à 6,2 et à 5,1. Il est aussi instable (75 %). Il est écarté.
4. **TF1, France 2 et M6** ont peu de liens, à cause du plafond de leur lift (ADR-005). La fiche devra l'expliquer.

## Proposition

**Go, sous condition du test H5.** On continue le plan : propriété et export de `graph.json` au sprint 4, carte au sprint 5.

- **Si le test H5 montre que les 3 familles sont nommables** (par exemple « grandes chaînes », « information », « médias en ligne des jeunes ») : go confirmé. Les noms retenus deviennent les libellés de la légende (`community_meta`, sprint 4).
- **Si les familles ne sont pas nommables** : go partiel. La carte s'affiche sans couleurs de famille, comme le prévoit RG-07, et les tâches de familles côté site sont réduites.

## Décision

*À compléter par le porteur du projet : go, go partiel ou stop, avec la date et le résultat du test H5.*
