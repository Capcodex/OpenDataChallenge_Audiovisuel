# Dictionnaire des données téléchargeables

Édition 2026 du baromètre de l'Arcom · traitement du 2026-10-08 · https://graphe-medias.fr

Données agrégées uniquement, au-dessus des seuils d'effectif (aucune réponse individuelle). Méthode : page « Méthode » du site. CSV en UTF-8, séparateur virgule, point décimal ; mêmes tables en Parquet.

**Licence et citation.** Licence Ouverte v2.0. Citer : « Source : Arcom, baromètre Les Français et l'information 2026 ; traitement : Graphe des médias ». Données de propriété : Le Monde diplomatique / Acrimed, Médias français, licence ODC-By (attribution obligatoire).

## `medias.csv` · 68 lignes

| Colonne | Unité | Définition |
|---|---|---|
| `media_id` | texte | Identifiant stable du média |
| `nom` | texte | Nom affiché |
| `type` | texte | radio, journal, magazine, tv, info, web, createur, jt |
| `public_prive` | texte | public (service public), prive, autre, na |
| `n_repondants` | répondants | Répondants (non pondéré) qui suivent le média ; ≥ 50 |
| `part_ponderee` | part 0-1 | Part pondérée des 2 939 répondants qui suivent le média |
| `fragile` | booléen | Moins de 100 répondants : chiffres fragiles (RG-03) |
| `pol_n` | répondants | Public ayant donné une note politique |
| `pol_moy` | note 0-10 | Positionnement politique moyen du public (0 très à gauche) |
| `pol_bas` | note 0-10 | Borne basse de l'intervalle à 95 % de pol_moy |
| `pol_haut` | note 0-10 | Borne haute de l'intervalle à 95 % de pol_moy |
| `pol_part_nr` | part 0-1 | Part du public sans note politique |
| `age_moy` | années | Âge moyen approché du public (âge connu par classes, ADR-006) |
| `age_bas` | années | Borne basse de l'intervalle à 95 % de age_moy |
| `age_haut` | années | Borne haute de l'intervalle à 95 % de age_moy |
| `moins35` | part 0-1 | Part du public âgée de moins de 35 ans |
| `moins35_bas` | part 0-1 | Borne basse de l'intervalle à 95 % de moins35 |
| `moins35_haut` | part 0-1 | Borne haute de l'intervalle à 95 % de moins35 |
| `n_confiance` | réponses | Réponses de confiance ; vide si conf_ref n'est pas publié |
| `conf_ref` | part 0-1 | Part « source de référence » ; vide sous 50 réponses ou pour un JT |
| `conf_ref_bas` | part 0-1 | Borne basse de l'intervalle à 95 % de conf_ref |
| `conf_ref_haut` | part 0-1 | Borne haute de l'intervalle à 95 % de conf_ref |
| `n_conf_gauche` | réponses | Réponses de confiance des répondants notés 0 à 4 (si écart publié) |
| `n_conf_droite` | réponses | Réponses de confiance des répondants notés 6 à 10 (si écart publié) |
| `conf_ecart_gd` | écart -1 à 1 | conf_ref à gauche moins à droite ; vide sous 30 par côté |
| `conf_ecart_gd_bas` | écart -1 à 1 | Borne basse de l'intervalle à 95 % de conf_ecart_gd |
| `conf_ecart_gd_haut` | écart -1 à 1 | Borne haute de l'intervalle à 95 % de conf_ecart_gd |
| `famille` | entier | Famille de médias détectée par Leiden (RG-06) ; 1 = la plus grande |
| `stabilite` | part 0-1 | Part des 100 sous-échantillons où le média reste dans sa famille |
| `intermediarite` | 0-1 | Intermédiarité pondérée (distance = 1 / lift), normalisée |
| `participation` | 0-1 | Coefficient de participation aux familles |
| `pont` | booléen | Parmi les 10 médias à la participation la plus forte |
| `x` | 0-1 | Position horizontale sur la carte (ForceAtlas2) |
| `y` | 0-1 | Position verticale sur la carte, croissante vers le bas |
| `groupe` | texte | Détenteur direct principal ; vide si non identifié |

## `liens.csv` · 1413 lignes

| Colonne | Unité | Définition |
|---|---|---|
| `source` | texte | media_id du premier média (ordre alphabétique) |
| `cible` | texte | media_id du second média |
| `lift` | rapport | P(A et B) / (P(A) × P(B)), probabilités pondérées (RG-15) |
| `lift_bas` | rapport | Borne basse de l'intervalle à 95 % ; > 1 (RG-05) |
| `lift_haut` | rapport | Borne haute de l'intervalle à 95 % |
| `n_communs` | répondants | Répondants qui suivent les deux médias ; ≥ 30 (RG-04) |
| `affiche` | booléen | Lien tracé sur la carte (ADR-005) |

## `proprietes.csv` · 89 lignes

| Colonne | Unité | Définition |
|---|---|---|
| `media_id` | texte | Identifiant du média |
| `groupe` | texte | Détenteur direct principal |
| `proprietaire_id` | texte | Identifiant du propriétaire ultime ; vide si non identifié |
| `proprietaire` | texte | Propriétaire ultime (sommet de la chaîne de détention) |
| `type_proprietaire` | texte | personne (ou famille), etat, organisation |
| `part` | part 0-1 | Part effective du capital ; vide si une part de la chaîne est inconnue |
| `statut` | texte | base, correction (saisie sourcée), meme_que (JT), non_identifie |
| `source` | texte | Source de l'information |
| `date` | date | Date de la source |

## `graphe.gexf`

Graphe complet pour Gephi : nœuds = médias de `medias.csv` (avec leur position), arêtes = liens de `liens.csv` (poids = lift).
