# ADR-008 · Disposition de la carte : ForceAtlas2 implémenté dans le pipeline Python

- **Statut :** acceptée
- **Date :** 8 octobre 2026
- **Références :** T-033, EF-M1-02, CdC technique § 7.6, décision D4

## Contexte

Les positions des médias sur la carte doivent être calculées une seule fois, dans le pipeline, pour que la carte soit identique à chaque visite (CdC technique, principe A1). Le CdC prévoit ForceAtlas2, l'algorithme de Gephi, et laisse deux options :

| Option | Problème |
|---|---|
| Bibliothèque Python `fa2` | Plus maintenue, extension compilée : risque à chaque montée de version de Python, non testé ici |
| Script Node `graphology-layout-forceatlas2` appelé par le pipeline | Il faudrait ajouter Node à l'image du pipeline, déjà à 794 Mo pour un budget de 1 Go, ou orchestrer deux conteneurs pour une seule étape |

## Décision

**ForceAtlas2 est implémenté directement en numpy** dans `pipeline/compute/disposition.py`, en une centaine de lignes, d'après l'article de référence (Jacomy, Venturini, Heymann et Bastian, *PLoS ONE*, 2014) :

- répulsion entre toutes les paires, proportionnelle au produit des degrés plus un ;
- attraction le long des liens affichés, proportionnelle à la distance et au lift ;
- gravité vers le centre ;
- vitesse adaptative de l'article (oscillation et traction).

Les réglages sont ceux de Gephi par défaut, avec 2 000 itérations (`params.yaml`). Les positions initiales sont tirées avec la graine du projet. Les coordonnées sont mises à l'échelle dans [0, 1] sans déformation et arrondies à 4 décimales.

Avec 68 médias, le calcul direct de toutes les paires suffit : 0,4 s. L'approximation de Barnes-Hut n'est pas nécessaire.

## Conséquences

- Aucune dépendance supplémentaire. La disposition est testée : elle est identique d'une exécution à l'autre, reste dans [0, 1], et deux groupes faiblement reliés sont placés à distance l'un de l'autre.
- L'implémentation n'est pas identique à celle de Gephi au pixel près. L'aperçu `docs/exploration/carte.svg` et le fichier `graphe_provisoire.gexf`, ouvrable dans Gephi, permettent de comparer.
- La disposition utilise les 623 liens affichés (ADR-005). Avec les 1 413 liens retenus, la carte serait une pelote indistincte.
- Le site lit `x` et `y` sans jamais les recalculer.
