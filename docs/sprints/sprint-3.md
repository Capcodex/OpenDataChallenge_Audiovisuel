# Bilan du sprint 3 · familles, disposition, socle front

**Période prévue :** 26-30 octobre 2026 · **Réalisé :** 8 octobre 2026 (branche `sprint-3`)

## Résultat

Le pipeline produit maintenant tout ce qu'il faut pour dessiner la carte : liens affichés, familles et positions. Sur le site, les jetons de design, les polices et les textes sont en place, et la CI contrôle les Dockerfiles, les failles des images et le vocabulaire.

| Indicateur | Valeur |
|---|---|
| Liens tracés sur la carte (ADR-005, option C) | **623** sur 1 413 retenus (27 % des paires), aucun média isolé |
| Familles (Leiden, liens affichés, `log(lift)`, résolution 0,6) | **3** : 43 / 15 / 10 médias |
| Médias stables (RG-07, seuil 80 %) | **94 %**, ARI moyen 0,86 → **familles affichées** |
| Configurations comparées (T-032) | 36 |
| Durée des étapes `familles` (100 sous-échantillons) et `disposition` (2 000 itérations) | 0,9 s et 0,4 s |
| Tests | 70 pytest (50 unitaires, 20 sur les données) + 20 Vitest, tous verts |
| hadolint, Trivy | 0 avertissement ; 0 faille haute ou critique corrigeable (2 images) |
| Image `site` | 8,7 Mo, polices comprises |

## Tâches

| ID | Tâche | Statut | Remarque |
|---|---|---|---|
| — | Option C de RG-05 (décision du 8 octobre) | ✅ | `affichage.voisins_min_par_media`, colonne `liens.affiche` |
| T-030 | Leiden, graine fixe, résolutions | ✅ | `compute/familles.py` |
| T-031 | Stabilité, appariement hongrois, ARI, RG-07 | ✅ | `familles.parquet` + `journal_familles.json` |
| T-032 | `log(lift)` / `lift`, choix de la résolution, ADR | ✅ | [ADR-007](../decisions/ADR-007-familles.md) ; rapport `docs/exploration/familles.md` |
| T-033 | ForceAtlas2 à graine fixe, ADR | ✅ | Implémenté en numpy, [ADR-008](../decisions/ADR-008-disposition.md) |
| T-034 | Intermédiarité, participation, ponts (Should) | ✅ | Dans `familles.parquet` plutôt que `attributs_medias` (voir écarts) |
| T-035 | Export GEXF et lecture visuelle | 🟡 | GEXF + aperçu `carte.svg` ; **lecture dans Gephi à faire par toi** |
| T-036 | Tests de déterminisme et RG-07 | ✅ | 7 tests unitaires, 5 sur les données |
| T-037 | Compte rendu J2 | 🟡 | [Proposition](../decisions/J2-go-no-go.md) : go sous condition du **test H5** |
| T-038 | Jetons de design, polices hébergées | ✅ | `site/src/styles/` ; IBM Plex via `@fontsource` (OFL-1.1) ; aucune requête externe |
| T-039 | `i18n/fr.ts`, contrôle du vocabulaire en CI | ✅ | Formulations RG-20 à RG-24 testées ; `npm run vocabulaire` |
| T-040 | CI front : hadolint, Trivy | ✅ | Outils figés par empreinte ; Vitest et build existaient depuis S2 |

## Décisions prises

- [ADR-005](../decisions/ADR-005-seuils-des-liens.md) : **acceptée** (option C).
- [ADR-006](../decisions/ADR-006-indicateurs-des-publics.md) : **acceptée** (confiance = part de « source de référence »).
- [ADR-007](../decisions/ADR-007-familles.md) : familles sur les **liens affichés**. Sur les 1 413 liens retenus, aucune partition en familles de taille utile n'est stable : 49 à 63 % de médias stables.
- [ADR-008](../decisions/ADR-008-disposition.md) : ForceAtlas2 en numpy dans le pipeline. Ni Node dans l'image Python, ni paquet `fa2` non maintenu.

## Écarts au backlog

| Écart | Raison |
|---|---|
| Familles calculées sur les liens affichés, pas sur tous les liens retenus | Seule option stable (ADR-007). Cohérent avec ce que voit l'utilisateur |
| Résolution 0,6, hors des valeurs prévues (0,5 / 1,0 / 1,5) | 0,5 donne 2 familles, 1,0 n'est pas stable (75 %) ; balayage de 0,5 à 1,5 par pas de 0,1 |
| Indicateurs de ponts dans `familles.parquet` | Ils dépendent des familles, calculées après les attributs. Correspondance dans `donnees.md` |
| Noms de tables `familles`, `disposition` (CdCT : `communities`, `layout`) | Convention française du dépôt |
| Option `--start-interval` retirée du `HEALTHCHECK` du Dockerfile | hadolint ne la reconnaît pas ; elle reste dans `compose.yaml` |

## Constats utiles pour la suite

- **Familles larges.** La famille 1 regroupe 43 médias. La carte distingue trois grands publics, pas des nuances fines. Les liens et la fiche portent le détail.
- **Fragilité.** Le choix de la résolution doit être revu à chaque édition (`make exploration`).
- **Ponts.** Avec 3 familles, les ponts sont surtout les JT, TMC et quelques médias en ligne. Leur intérêt éditorial (EF-M1-09) est à évaluer au sprint 7.
- **4 médias à l'appartenance incertaine** : France 5, TMC, Salomé Saqué, Slate. À signaler dans leur fiche (sprint 6).

## Restant à faire hors code

- [ ] **Test H5** : faire nommer les 3 familles par 3 à 5 personnes extérieures, puis compléter la décision J2.
- [ ] Ouvrir `data/output/graphe_provisoire.gexf` dans Gephi (T-035), après `make exploration`.
- [ ] Ouvrir une pull request `sprint-3` → `main` et vérifier la CI : les jobs hadolint et Trivy n'ont pas encore tourné sur GitHub.
- [ ] Recherche utilisateur R-01 (reportée depuis le sprint 1).
