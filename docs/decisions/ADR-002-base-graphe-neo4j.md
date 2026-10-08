# ADR-002 · Base graphe d'analyse : Neo4j Community

- **Statut :** acceptée
- **Date :** 8 octobre 2026
- **Références :** CdC technique § 10.1, décision D1

## Contexte

La note de cadrage proposait Kùzu, base graphe embarquée. Le dépôt de Kùzu a été archivé le 10 octobre 2025 (dernière version 0.11.3), après le rachat de son éditeur par Apple : plus aucun correctif n'est publié.

## Décision

La base graphe d'analyse est **Neo4j Community Edition**, lancée via l'image Docker officielle (`neo4j:5-community`, profil Compose `analyse`) et chargée depuis les fichiers Parquet par `python -m pipeline export-neo4j` (sprint 4).

La base graphe n'est **pas** utilisée par le site, qui reste statique (CdC technique principe A2).

## Conséquences

- Requêtes en Cypher, conformes au modèle du CdC technique § 10.2.
- La base étant alimentée depuis les Parquet (source de vérité), elle reste remplaçable sans impact sur le reste de l'architecture (par exemple par un fork maintenu de Kùzu).
- Le mot de passe Neo4j est fourni par `.env` (non versionné).
