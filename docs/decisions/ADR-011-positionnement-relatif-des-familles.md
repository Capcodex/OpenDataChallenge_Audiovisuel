# ADR-011 · Positionnement relatif du public des familles

- **Statut :** acceptée (choix du porteur du projet, V2, 9 octobre 2026)
- **Date :** 9 octobre 2026
- **Références :** RG-06, RG-07, RG-13, RG-20, RG-25 (CdC fonctionnel), ADR-006 (indicateurs des publics), ADR-007 (familles), ADR-009 (format de `graph.json`)

## Contexte

Le porteur du projet souhaite qualifier les familles de médias de « gauche », « centre » ou « droite », avec des seuils 4 et 6 sur l'échelle de 0 à 10.

Deux obstacles :

1. **La charte.** RG-20 interdit tout texte qui qualifie la ligne politique d'un média ; RG-25 interdit un classement gauche-droite en page d'accueil. Le score de 0 à 10 est celui du **public** (auto-positionnement des personnes qui suivent le média), pas du média.
2. **Les données.** Avec les seuils 4 et 6, les trois familles seraient toutes « centre » : leurs publics sont en moyenne entre 5,3 et 5,6, et aucun des 68 médias n'a un public sous 4.

Le porteur du projet a retenu des **seuils relatifs** : les familles sont qualifiées les unes par rapport aux autres.

## Décision

### Mesure

Pour chaque famille, le **positionnement moyen de son public** : moyenne pondérée de la note 0-10 des répondants qui suivent **au moins un** média de la famille, sans les non-réponses (RG-13), avec son intervalle à 95 % calculé sur les mêmes 1 000 tirages que les autres indicateurs (`pipeline/compute/publics_familles.py`).

C'est le public réel de la famille, et non une moyenne des médias : un répondant qui suit plusieurs médias de la famille compte une fois.

### Libellé relatif

1. Les familles sont triées par positionnement moyen.
2. Deux familles voisines ne sont distinguées que si leur **écart est significatif** : l'intervalle à 95 % de leur différence, calculée tirage par tirage, exclut zéro. Sinon, elles forment un même groupe.
3. Un seul groupe : aucun libellé (« publics de positionnement proche »). Sinon, le premier groupe est « gauche », le dernier « droite », les groupes intermédiaires « centre ».
4. Aucun libellé si les familles ne sont pas affichées (RG-07).

**Pourquoi un test sur la différence plutôt que le chevauchement des intervalles.** Les publics des familles se recoupent fortement (2 558 des 2 939 répondants suivent un média de la famille 1). Leurs intervalles varient ensemble d'un tirage à l'autre ; comparer les intervalles séparément est trop prudent. En 2026, les intervalles des trois familles se chevauchent, mais l'écart entre la famille 3 et les deux autres est significatif :

| Comparaison | Écart | Intervalle à 95 % |
|---|---|---|
| Famille 1 − famille 2 | +0,00 | [−0,07 ; +0,07] : non significatif |
| Famille 1 − famille 3 | +0,24 | [+0,06 ; +0,42] : significatif |
| Famille 2 − famille 3 | +0,24 | [+0,05 ; +0,42] : significatif |

Résultat 2026 : famille 3 « gauche », familles 1 et 2 « droite ».

### Formulation (amendement de RG-20 et RG-25)

RG-20 et RG-25 sont amendées pour les **familles** seulement, aux conditions suivantes :

- le libellé porte sur le **public** et il est **relatif** : « Public le plus à gauche des 3 familles », « Public parmi les plus à droite des 3 familles », « Public au centre des 3 familles » ;
- il est toujours accompagné de la valeur et de sa marge, sur l'échelle complète : « 5,3 sur 10, marge 5,1–5,6 » ;
- aucun libellé n'est attribué à un **média** ; la formulation imposée par RG-20 pour un média reste inchangée, et le contrôle du vocabulaire continue d'interdire « média de gauche » et ses variantes ;
- la page d'accueil ne propose toujours aucun classement des médias (RG-25).

### Format

`graph.json` passe au format 2 (règle de l'ADR-009) : `communities[]` reçoit `pol` (triplet), `pol_n` et `position` (`"gauche"`, `"centre"`, `"droite"` ou `null`).

## Conséquences

- **Lecture.** « Gauche » et « droite » sont relatifs : un public à 5,3 est au centre de l'échelle absolue. La valeur affichée à côté du libellé le rappelle, et la page Méthode l'explique.
- **Écarts faibles.** L'écart significatif en 2026 est de 0,24 point sur 10. Les libellés distinguent des publics proches, pas des camps.
- **Stabilité.** Les libellés peuvent changer d'une édition à l'autre (nouvelles familles, nouveaux écarts) ; ils sont recalculés par le pipeline, jamais saisis à la main.
- **Tests.** Règle testée sur des cas simulés (`tests/unit/test_publics_familles.py`), cohérence vérifiée sur les données réelles (`tests/data/test_donnees_familles.py`), formulations vérifiées par le contrôle du vocabulaire.
