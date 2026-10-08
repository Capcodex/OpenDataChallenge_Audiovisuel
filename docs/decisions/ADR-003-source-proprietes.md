# ADR-003 · Source des données de propriété des médias

- **Statut :** acceptée
- **Date :** 8 octobre 2026
- **Références :** E0-04, E0-08, risque « base de propriété inutilisable » du plan d'implémentation

## Contexte

Le graphe relie chaque média à son groupe et à ses propriétaires (EF-M4). La source envisagée est la base « Médias français : qui possède quoi », du Monde diplomatique et d'Acrimed ([dépôt GitHub](https://github.com/mdiplo/Medias_francais)).

Vérifications faites le 8 octobre 2026 :

| Point | Constat |
|---|---|
| Licence | **ODC-By v1.0** (Open Data Commons Attribution) : réutilisation libre, **attribution obligatoire** |
| Format | 7 fichiers TSV : `medias`, `organisations`, `personnes` et 4 tables de relations avec parts de détention |
| Dernière mise à jour | Commit `231814e` du **17 décembre 2024** |
| Périmètre | Médias nationaux, quotidiens régionaux, médias en ligne et audiovisuel national, avec leurs principaux actionnaires. **La presse indépendante n'est pas couverte** (selon le README du dépôt). |

## Décision

1. Utiliser cette base comme source principale, **figée au commit `231814e`** (adresses et empreintes dans `config/sources.yaml`).
2. Créer au sprint 4 un fichier `config/proprietes_corrections.csv` pour :
   - les médias du baromètre absents de la base (médias indépendants, créateurs de contenu) ;
   - les changements de propriété postérieurs à décembre 2024.
   Chaque ligne de correction porte une **source vérifiable et une date**.
3. Afficher l'attribution « Le Monde diplomatique / Acrimed, licence ODC-By » dans l'interface, la page Méthode et les exports, conformément à la licence.

## Conséquences

- Plan B partiellement nécessaire dès le départ : la tâche T-042 (couverture ≥ 90 %) devra probablement mobiliser une partie de sa réserve de 6 h pour les corrections manuelles.
- Les médias sans propriétaire identifiable restent marqués « propriétaire non identifié » (EF-M4-04).
- Une mise à jour du dépôt amont impose de revoir les corrections et de mettre à jour les empreintes.
