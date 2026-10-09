# Bilan du sprint 7 · Méthode, liens permanents, fonctionnalités Should

**Période prévue :** 23-27 novembre 2026 (4 jours) · **Réalisé :** 9 octobre 2026 (branche `sprint-7`, partie de `main`) · **🧊 J4 : gel des fonctionnalités**

## Résultat

Toutes les fonctionnalités V1 sont en place, sauf le profil détaillé du public (T-078), qui demande de nouvelles données au pipeline. Le site compte maintenant cinq écrans : Carte, Propriétaires, JT, Méthode et Données. Chaque écran et chaque média a sa page HTML pré-générée, avec titre, description, balises Open Graph et résumé lisible sans JavaScript. Les scénarios de recette de Thomas, Claire et Karim sont automatisés, et axe-core ne trouve aucune violation grave ou critique sur 10 écrans.

| Indicateur | Valeur |
|---|---|
| Pages pré-générées | **84** : 4 écrans, 68 médias, 12 médias sous le seuil |
| JavaScript du site | 559 ko, **151 ko compressé** (budget ENF-01 : 250 ko ; +15 ko, dont le texte de la méthode ; `marked` ne sert qu'au build) |
| Tests | 78 Vitest (+18) et 27 Playwright (+19), tous verts ; 118 pytest inchangés |
| Accessibilité (axe-core, WCAG 2.1 AA) | **0 violation grave ou critique** sur 10 écrans (carte, 3 états de fiche, méthode, tableau, JT, propriétaires, recherche ouverte, export) |
| Contrôle du vocabulaire (RG-20) | Vert, `docs/methode.md` compris |

## Tâches

| ID | Tâche | Prio. | Statut | Remarque |
|---|---|---|---|---|
| T-069 | Page Méthode générée depuis `docs/methode.md` | M | ✅ | Convertie au build par `marked` (module `virtual:methode`) ; sommaire, ancres, liens relatifs vers le dépôt. Sections ajoutées : « Ce que la carte ne mesure pas » (EF-M6-04), « Sources, code et licences » |
| T-070 | Pré-rendu des pages `/media/<id>/` | M | ✅ | Plugin Vite en fin de build ; titre, description, canonique, Open Graph, résumé sans JavaScript. Pas d'image d'aperçu (`og:image`) : voir écarts |
| T-071 | Propriétaire dans la fiche | M | ✅ | Fait au sprint 6 ; vérifié : groupe, propriétaires, parts, source, date, « non identifié » |
| T-072 | Vue tableau + bascule si WebGL indisponible | M | ✅ | Tri (aria-sort) et filtre au clavier ; sans WebGL, la carte est remplacée par le tableau, la fiche reste disponible |
| T-080 | Scénarios Thomas, Claire, Karim + axe-core | M | ✅ | Thomas : calque, export SVG et PNG, contenu du cartouche vérifié. Claire : lift du CSV = lift de la fiche (2 liens). Karim : « hugo » → HugoDécrypte |
| T-073 | Calque propriétaires | S | ✅ | Page `/proprietaires?proprietaire=<id>` : liste filtrable, carte, synthèse (médias, parts, familles, source datée) ; export de l'image du calque |
| T-074 | Filtres par type et famille dans l'URL | S | ✅ | Pastilles combinables au-dessus de la carte (`?type=radio,journal`) ; famille via la légende depuis le sprint 5 |
| T-075 | Export PNG / SVG avec cartouche obligatoire | S | ✅ | SVG généré depuis les positions ; PNG = rendu du SVG sur canvas ; aperçu = image exportée ; cartouche RG-23 non désactivable |
| T-076 | Page JT | S | ✅ | Profils empilés, isolement d'une rubrique, matrice du pipeline, avertissement permanent. Profils par année : voir décisions |
| T-077 | Page téléchargements | S | ✅ | Dans la page Données, à côté du tableau (maquette) : 7 fichiers, dictionnaire, code, méthode |
| T-078 | Profil détaillé du public comparé à l'ensemble | S | ❌ | Demande les répartitions (positionnement 0-10, tranches d'âge) dans `graph.json`, donc une modification du pipeline : impossible sans Docker pendant le sprint |
| T-079 | Phrase d'explication au survol d'un lien | S | ✅ | Infobulle RG-22 sur la carte (souris) ; au clavier, la même phrase est sur chaque voisin de la fiche |

## Décisions prises

- **Pages pré-générées par un plugin Vite** plutôt qu'un script séparé : le script réutilise les fonctions du site (voisins, propriété, mention de source, textes), et Vite résout les imports TypeScript. nginx servait déjà `$uri/index.html` : aucune modification de sa configuration.
- **Une page HTML par écran**, chargée normalement (liens `<a>`), plutôt qu'un routeur côté client : chaque adresse a son titre et ses balises sans JavaScript, et l'état de la carte reste dans son adresse.
- **JT : profils par année, matrice par période.** `graph.json` contient les parts annuelles ; le pipeline calcule les profils de période en sommant les volumes. Recalculer un profil de période dans le navigateur aurait donné d'autres valeurs que le pipeline. Les 7 rubriques détaillées sont celles de l'année choisie (en 2020, la santé).
- **Export de la vue courante = filtres appliqués, carte entière**, pas le cadrage de la caméra : l'image garde toujours le même cadre et reste lisible.
- **Couleurs des rubriques JT** : le premier bleu est éclairci (4,1:1 → plus de 4,5:1 avec le texte foncé), repéré par axe-core.

## Problèmes rencontrés et corrigés

| Problème | Correction |
|---|---|
| « Autres rubriques » à plus de 50 % en 2020 : les 7 rubriques détaillées étaient celles de 2000-2020, sans la santé | Rubriques détaillées de l'année choisie |
| Contraste insuffisant du texte des segments JT et de la matrice | Palette et seuil de couleur du texte ajustés ; vérifiés par axe-core |
| `docs/methode.md` hors du contexte Docker (`docs/` et `*.md` exclus) | Exception dans `.dockerignore`, copie dans l'étape `build`, montage dans `site-dev` |
| Scénario de Thomas : l'export n'existait que sur la carte, pas sur le calque | Export disponible sur la page Propriétaires, avec titre et médias mis en avant |

## Écarts au backlog

| Écart | Raison |
|---|---|
| T-078 non fait | Données absentes de `graph.json` ; pipeline non exécutable sans Docker. À faire au sprint 8 si Docker est rétabli, sinon en V2 |
| Pas d'image d'aperçu Open Graph (`og:image`) ; aperçu non testé dans un vrai outil de prévisualisation | Titre et description sont en place ; une image par média demanderait une génération au build. Test à faire sur l'aperçu de la pull request |
| EF-M4-03 (proximité moyenne des publics d'un propriétaire, priorité C) | Les paires non significatives n'ont pas de lift publié : une moyenne sur les seuls liens retenus serait biaisée |
| Lighthouse CI (CdC technique § 12.2) | À intégrer avec la recette (sprint 8) |
| Image `site` non construite sur le poste | Docker toujours indisponible ; la CI la construit et vérifie les pages pré-générées |

## Constats utiles pour la suite

- **Recette utilisateurs (sprint 8)** : les scénarios automatisés passent ; reste la mesure avec de vrais testeurs (4 sur 5 en moins de 30 s pour Inès).
- **Propriétaires** : 16 médias de la carte n'ont pas de propriétaire identifié ; la page le dit. Les parts affichées (par exemple 7 % de M6 pour Rodolphe Saadé) viennent de la base, à faire relire avec la saisie sourcée prévue.
- **JT 2020** : la santé occupe jusqu'à 42 % des sujets (Covid). Les données s'arrêtent là : l'avertissement le rappelle.

## Restant à faire hors code

- [ ] Vérifier dans la CI de la pull request : image `site` avec la méthode, pages pré-générées servies par nginx, 27 tests Playwright.
- [ ] Coller l'URL d'aperçu d'une fiche dans un outil de prévisualisation de liens (messagerie, réseau social) pour T-070.
- [ ] Toujours en attente : test H5 (noms des familles), saisies sourcées de propriété, GEXF dans Gephi, recherche utilisateur R-01.
