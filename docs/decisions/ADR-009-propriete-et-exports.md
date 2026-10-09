# ADR-009 · Propriété des médias et format des exports (jalon J3)

- **Statut :** acceptée · format `graph.json` **gelé** (version 1), sous réserve de validation par le porteur du projet
- **Date :** 8 octobre 2026
- **Références :** T-041 à T-047, E0-08, E0-10, EF-FT-07, ADR-003, CdC technique § 8 et § 10

## 1. Propriété

### Contexte

La base « Médias français » décrit un **graphe de détention** : des personnes et des organisations détiennent des organisations, qui détiennent des médias. Les liens sont qualifiés (« égal à 50 % », « contrôle », « participe »…). Le site doit afficher, pour chaque média, un groupe et des propriétaires.

### Décision

- **Rapprochement** des noms par normalisation (nom, variantes, libellés Arcom). 43 médias affichables sur 68 sont rattachés directement.
- **Groupe** = détenteur direct principal : plus forte part, « contrôle » comptant comme 100 %, puis ordre alphabétique. Par exemple, Groupe TF1 pour TF1.
- **Propriétaires** = **propriétaires ultimes**, c'est-à-dire les sommets de la chaîne de détention, avec leur **part effective** : produit des parts le long de la chaîne, sommé sur les chemins. Par exemple, la famille Bouygues détient 24 % de Bouygues, qui détient 44 % du Groupe TF1 : sa part effective dans TF1 est de 10,6 %. La part est laissée vide dès qu'un maillon n'est pas chiffré (« contrôle »). C'est le cas des chaînes publiques, contrôlées par la République française.
- **Corrections** (`config/proprietes_corrections.csv`) avec quatre règles :
  - `nom_base` : nom différent dans la base (RFI, écrite « Radio France International ») ;
  - `meme_que` : les 9 JT ont les propriétaires de leur chaîne ;
  - `detenteur` : saisie sourcée, avec une source obligatoire ;
  - `non_identifie` : absence assumée.
- **Aucune saisie sans source.** Les 16 médias absents de la base sont marqués `non_identifie` : Mediapart, L'Équipe, L'Humanité, des médias en ligne et les créateurs de contenu.

Couverture 2026 : **76 % des médias affichables rattachés**, **100 % rattachés ou marqués** (critère de T-042 : ≥ 90 %).

### Conséquences

- Le plan B de l'ADR-003, la saisie sourcée, reste ouvert : chaque ligne `detenteur` ajoutée fait monter la couverture sans changer le code.
- La base est figée à décembre 2024 : les changements de propriété de 2025 n'y figurent pas. Ils sont à reporter, sources à l'appui, dans le fichier de corrections.
- Neo4j relie directement le média à ses propriétaires ultimes (`(:Media)-[:DETENU_PAR {part}]->(:Proprietaire)`), plutôt qu'en passant par le groupe comme le prévoyait le CdCT § 10.2. Les parts effectives sont propres à chaque média.

## 2. Format `graph.json` (gel J3)

### Décision

Le format suit le CdC technique § 8.2, avec les clés courtes en anglais du contrat d'origine. Il est décrit par `site/src/graph/schema.json` et validé à chaque export : un fichier non conforme fait échouer le pipeline. Précisions et écarts :

| Point | Choix | Raison |
|---|---|---|
| `meta.format` | `1` | Version du format : changée seulement si le site doit être adapté |
| `meta.generated_at` | **remplacé** par `meta.date_traitement`, fixée dans `params.yaml` | Un horodatage changerait le fichier à chaque exécution (ENF-12) |
| `meta.lift_reference` | ajouté | Repère de lecture des lifts (ADR-005) |
| `nodes[].trust`, `trust_gap` | `null` si non publiés | Seuils d'ADR-006 ; JT sans question de confiance |
| `nodes[].owners` | `[{id, share}]`, `share` = part effective ou `null` | Propriétaires ultimes ; détail dans `owners` |
| `nodes[].owner_status` | ajouté | Distinguer « non identifié » de « sans propriétaire » |
| `others` | ajouté | Médias sous le seuil (RG-02) : nom seulement, pour la recherche |
| `edges` | tous les liens retenus, `shown` = tracé sur la carte | La fiche peut citer des voisins hors de la carte |
| `communities[].label` | « Famille 1 » à « Famille 3 », provisoires | Noms issus du test H5 (jalon J2) |
| `jt` | bloc du module JT (sprint 5, voir l'addendum) | Réservé dès le gel J3 |

En 2026, le fichier pèse **155 ko**, 29 ko compressé (budget : 2 Mo).

### Addendum du sprint 5 : bloc `jt`

Le bloc `jt`, réservé (`null`) au jalon J3, est complété sans changer `meta.format`, car le site ne le lisait pas encore. Contenu : `channels`, `rubrics`, `years`, `periods`, `profiles[mesure][chaîne][année][rubrique]` (parts de 0 à 1, mesures `sujets` et `duree`), et `similarity[]` (`a`, `b`, `period`, `measure`, `js`, `sync`). Le fichier passe de 155 à 181 ko.

### Conséquences

- Tout changement du format après J3 passe par un nouvel ADR et une incrémentation de `meta.format`.
- Le site valide `graph.json` contre le même schéma dans ses tests (sprint 5).

## 3. Données téléchargeables

- Fichiers produits : `medias`, `liens` et `proprietes` en **CSV et Parquet**, `graphe.gexf`, `dictionnaire.md` et `journal.json`. Le CdC prévoyait un fichier `graphe_medias.parquet` unique ; or un fichier Parquet ne contient qu'une table, d'où un fichier par table.
- `dictionnaire.md` est **généré** à partir des descriptions du code. Une colonne sans description fait échouer l'export.
- **ENF-09 :** un effectif n'est publié qu'avec l'indicateur qu'il accompagne. Par exemple, le nombre de réponses de confiance par bord politique est vide quand l'écart gauche/droite n'est pas publié.
- Fichiers reproductibles : date fixe dans le GEXF, tri explicite, réels arrondis.
