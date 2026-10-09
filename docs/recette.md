# Procès-verbal de recette · V1

**Version :** 1.0.0 · **Données :** baromètre Arcom 2026, traitement du 8 octobre 2026 · **Recette :** 9 octobre 2026 (sprint 8)

Référence : cahier des charges fonctionnel § 12 et exigences non fonctionnelles (ENF). Chaque critère renvoie à sa preuve : un test automatisé, relancé à chaque pull request, ou une mesure datée.

## Synthèse

| Recette | Résultat |
|---|---|
| Données (§ 12.1, T-081) | ✅ 5 critères sur 5 |
| Fonctionnelle (§ 12.2, T-082) | ✅ 4 scénarios automatisés · ⏳ tests avec 5 utilisateurs à mener |
| Conformité (§ 12.3, T-083) | ✅ 4 critères sur 4 · ⏳ navigateurs autres que Chromium à vérifier à la main |
| Anomalies (T-084) | ✅ 0 bloquante, 0 majeure ouverte (3 corrigées) · 7 mineures reportées en V2 |
| Mise en production (T-088) | ✅ `v1.0.0` en ligne le 9 octobre 2026 · ⏳ Observatory, aperçu de lien, paquets ghcr.io à cocher |

## 1. Recette des données (§ 12.1, T-081)

| Critère | Résultat | Preuve |
|---|---|---|
| **Effectifs** : pour 3 médias tirés au hasard, effectif = variable d'origine | ✅ Vérifié pour **tous** les médias des 7 questions, pas seulement 3 | `tests/data/test_donnees_arcom.py::test_effectifs_egaux_aux_variables_d_origine` (recomptage indépendant depuis le fichier brut) |
| **Pondération** : somme des poids cohérente avec la source | ✅ Fichier source : 3 377 répondants, poids total 3 459,47. Retenus (RG-10) : 2 939, poids total 2 942,75 dans la source **et** dans la table du pipeline (écart 0) | `test_poids_conserves` (poids identiques un à un) ; mesure du 9 octobre 2026 |
| **Liens** : aucun lien ne viole RG-04 ou RG-05 | ✅ 1 413 liens, tous ≥ 30 répondants communs et borne basse > 1 ; effectifs communs recomptés | `tests/data/test_donnees_liens.py::test_aucun_lien_hors_rg04_rg05`, `test_effectifs_communs_recomptes_depuis_la_table` |
| **Stabilité** publiée dans la page Méthode | ✅ « 3 familles, 94 % des médias stables », tailles 43 / 15 / 10 ; tous les chiffres de la méthode = journal du calcul | `tests/data/test_methode_publiee.py` (nouveau) |
| **Reproductibilité** : le script unique reproduit l'export | ✅ Deux exécutions forcées : **29 fichiers identiques** octet pour octet. Par rapport aux fichiers versionnés (produits dans Docker, Linux x86) : `graph.json`, CSV, GEXF, dictionnaire et journal identiques ; Parquet identiques à 10⁻¹⁴ près (dernier chiffre des nombres à virgule, calcul fait sur macOS ARM) | `make reproductibilite` ; exécution du 9 octobre 2026 |

Tests du pipeline : **124 réussis** (70 unitaires, 54 sur les données).

## 2. Recette fonctionnelle (§ 12.2, T-082)

### 2.1 Scénarios automatisés (Playwright, contre l'image de production)

| Scénario | Critère | Résultat | Test |
|---|---|---|---|
| **Inès** | Trouver les 5 voisins de France Inter et copier la mention de source en moins de 30 s | ✅ 2 s | `e2e/tests/ines.spec.ts` |
| **Thomas** | Activer le calque d'un propriétaire et exporter l'image avec sa source | ✅ SVG et PNG ; titre, médias du propriétaire, phrase RG-21 et source dans l'image | `e2e/tests/recette.spec.ts` |
| **Claire** | Télécharger les liens en CSV et retrouver, pour 2 liens, le lift affiché | ✅ France Inter–France Culture et France Inter–Libération : même lift, même effectif commun | `recette.spec.ts` |
| **Karim** | Retrouver HugoDécrypte et ouvrir sa fiche sans aide | ✅ « hugo » → HugoDécrypte, fiche ouverte | `recette.spec.ts` |

### 2.2 Tests avec 5 utilisateurs (à mener)

Critères : **4 testeurs sur 5** réussissent chaque scénario ; **4 sur 5** reformulent correctement ce que mesure un lien (« même public », pas « même opinion »).

**Protocole** (20 minutes par personne, sur l'adresse de production, sans aide) :

1. Lire à voix haute la consigne d'un scénario, chronométrer, noter réussite et hésitations.
2. Inès : « Trouvez les médias dont le public ressemble le plus à celui de France Inter, puis copiez de quoi citer la source. »
3. Thomas : « Montrez les médias de Xavier Niel sur la carte et téléchargez l'image. »
4. Claire : « Téléchargez les données des liens et retrouvez-y le chiffre qui relie France Inter et France Culture. »
5. Karim : « Trouvez HugoDécrypte et ouvrez sa fiche. »
6. Question finale : « Pour vous, que veut dire un trait entre deux médias ? »

| Testeur | Profil | Inès (< 30 s) | Thomas | Claire | Karim | Reformulation du lien | Remarques |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |

## 3. Recette de conformité (§ 12.3, T-083)

| Critère | Résultat | Preuve |
|---|---|---|
| **Neutralité** : 0 formulation contraire à RG-20 | ✅ 0 infraction dans les textes de l'interface, la méthode, le dictionnaire des données, le README et le guide de contribution | `npm run vocabulaire` (CI) ; `src/i18n/vocabulaire.test.ts` |
| **Sources** sur 100 % des écrans et des exports | ✅ Arcom, licence et date sur les 6 écrans ; cartouche obligatoire dans les images PNG et SVG ; mention RG-24 copiable sur chaque fiche | `recette.spec.ts` (« sources… sur chaque écran », Thomas) ; `image-svg.test.ts` |
| **Accessibilité** : clavier et contrastes vérifiés automatiquement | ✅ axe-core (WCAG 2.1 AA) : **0 violation grave ou critique** sur 10 écrans ; Lighthouse accessibilité **100** sur 6 écrans ; recherche, fiche, voisins, tableau, export utilisables au clavier | `recette.spec.ts`, `ines.spec.ts`, `e2e/lighthouse.mjs` |
| **Performance** : ENF-01 à ENF-03 | ✅ voir ci-dessous | `e2e/lighthouse.mjs`, `ines.spec.ts` |

| Exigence | Critère | Mesure |
|---|---|---|
| ENF-01 | Carte affichée en moins de 3 s à 10 Mbit/s | ✅ LCP 0,5 à 0,6 s (Lighthouse « bureau » : 10 Mbit/s simulés) ; performance 97 à 100 sur 6 écrans, poste avec carte graphique (9 octobre 2026) |
| ENF-02 | Données chargées < 2 Mo | ✅ `graph.json` : 181 ko ; JavaScript : 151 ko compressés |
| ENF-03 | Fiche et voisins en moins de 200 ms | ✅ médiane de 5 ouvertures sous 200 ms (test automatisé) |
| ENF-04 | Deux dernières versions de Chrome, Firefox, Safari, Edge | ⏳ Chromium testé automatiquement ; **Firefox et Safari à vérifier à la main** pendant les tests utilisateurs |
| ENF-05 | Tablette, ≥ 1024 px | ✅ aucun débordement à 1024 px ; sur la page Propriétaires, la synthèse passe sous la carte (mineure) |
| ENF-08 | Vue tableau | ✅ `/tableau`, bascule automatique sans WebGL |
| ENF-09 | Aucune donnée individuelle publiée | ✅ `tests/data/test_no_individual_data.py` |
| ENF-11 | HTTPS, sans formulaire ni stockage | ✅ HTTPS (Cloud Run) ; en-têtes de sécurité dont HSTS (ajouté au sprint 8) ; aucun formulaire envoyé, aucun cookie |
| ENF-12 | Résultats régénérables | ✅ voir § 1, reproductibilité |

**Lighthouse dans la CI.** Les machines de GitHub Actions n'ont pas de carte graphique : Chromium y émule WebGL sur le processeur, et le premier rendu de la carte (compilation des shaders, atlas des étiquettes de Sigma 4) bloque le fil principal de 350 à 500 ms. Les pages avec carte y obtenaient 79 à 99 selon les passages, contre 100 sur un poste réel. Décision du porteur du projet (sprint 8) : dans la CI, performance ≥ 75 pour les trois pages avec carte, ≥ 90 pour les autres, accessibilité ≥ 95 partout ; le critère « ≥ 90 » est vérifié sur un poste réel avant chaque version (`BASE_URL=… npm run lighthouse` dans `e2e/`). Deux corrections ont réduit ce blocage d'environ un quart : survol des liens activé au premier passage de la souris, centrage initial sans animation.

## 4. Anomalies (T-084)

| N° | Anomalie | Gravité | Statut |
|---|---|---|---|
| A-01 | En-tête HSTS absent (Cloud Run ne l'ajoute pas) | Majeure (sécurité, ENF-11) | ✅ Corrigée : en-tête ajouté à nginx, contrôlé par `verifier-production.sh` |
| A-02 | Adresse du site provisoire (`graphe-medias.fr`, domaine non détenu) dans les liens permanents, la mention de source et les exports | Majeure | ✅ Corrigée : adresse de production dans `config/params.yaml`, sorties régénérées par le pipeline |
| A-10 | Performance Lighthouse des pages avec carte sous 90 dans la CI (machines sans carte graphique) | Majeure (CI bloquée) | ✅ Corrigée : blocage réduit d'un quart ; seuil de 75 pour ces pages dans la CI, ≥ 90 vérifié sur poste réel |
| A-03 | Profil détaillé du public comparé à l'ensemble (T-078, EF-M3-05, Should) | Mineure | V2 |
| A-04 | Pas d'image d'aperçu Open Graph (`og:image`) | Mineure | V2 |
| A-05 | Page JT : profils par année seulement (pas de profil de période) | Mineure | V2 (ajouter les profils de période à `graph.json`) |
| A-06 | Page Propriétaires à 1024 px : synthèse sous la carte | Mineure | V2 |
| A-07 | Étiquettes qui se chevauchent au centre de la carte | Mineure | V2 |
| A-08 | Proximité moyenne des publics d'un propriétaire (EF-M4-03, Could) | Mineure | V2 |
| A-09 | Mise en page téléphone non optimisée (hors V1, ENF-05) | Mineure | V2 |

## 5. Mise en production (T-088)

À cocher après le déploiement de `v1.0.0` (workflow « Mise en production »). Les lignes marquées 🤖 sont vérifiées automatiquement par `scripts/verifier-production.sh` à chaque déploiement.

- [x] 🤖 HTTPS : https://graphe-medias-718967467429.europe-west9.run.app répond 200 (9 octobre 2026)
- [x] 🤖 En-têtes de sécurité : CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP
- [ ] Mozilla Observatory (https://developer.mozilla.org/fr/observatory) : note ≥ B+, capture jointe
- [x] 🤖 Healthcheck : pages, données et téléchargements répondent 200 ; page absente → 404
- [x] 🤖 Liens permanents : `/media/le-monde` et `/media/le-monde/` ; `og:url` et `adresse_site` = adresse de production
- [ ] Aperçu d'un lien de fiche collé dans une messagerie ou un réseau social : titre et description corrects
- [ ] Paquets ghcr.io `graphe-medias-site` et `graphe-medias-pipeline` publics, en `amd64` et `arm64`
- [x] Révision précédente notée pour un retour arrière : `graphe-medias-00001-9m7` (image de démonstration). Version en service : `graphe-medias-v1-0-0-10d9c0e-1`
- [ ] Étiquette `demo` du service d'aperçu retirée (`gcloud run services update-traffic graphe-medias-apercu --region europe-west9 --remove-tags demo`)

**Incident du premier déploiement (9 octobre 2026).** La révision `v1.0.0` a été créée, mais l'étape suivante du workflow a échoué : le calcul de l'adresse appelait l'API Cloud Resource Manager, non activée sur le projet. Le retour arrière automatique a rendu le trafic à la page de démonstration, comme prévu. La révision, vérifiée sur une adresse temporaire sans trafic (tous contrôles verts), a ensuite été mise en service à la main. Correctif : le workflow lit l'adresse dans `config/params.yaml`, validé par le déploiement de `v1.0.1`.
