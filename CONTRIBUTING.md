# Contribuer

Merci de votre intérêt pour Graphe des médias. Le projet décrit les **publics** des médias français à partir de données publiques ; deux règles priment sur tout le reste :

1. **Aucune donnée individuelle n'est publiée.** Les tables par répondant restent dans `data/interim/` (non versionné) ; seuls des agrégats au-dessus des seuils sortent du pipeline. Les tests `tests/data/test_no_individual_data.py` le vérifient.
2. **Le site décrit des publics, pas des lignes éditoriales.** Aucun texte ne qualifie la ligne politique d'un média (RG-20). Formulation imposée : « Le public de ce média se situe en moyenne à X sur une échelle de 0 (très à gauche) à 10 (très à droite) ». Le contrôle du vocabulaire (`make lint-site`) refuse les formules interdites.

## Installer

Docker avec Docker Compose v2 suffit (voir le [README](README.md)). Python, Node et toutes les dépendances tournent dans les conteneurs.

## Proposer une modification

1. Ouvrir une issue pour discuter d'un changement important (calcul, seuil, nouvelle source).
2. Créer une branche depuis `main`, puis une pull request. Chaque pull request est construite, testée et publiée sur une adresse d'aperçu (commentaire automatique).
3. Avant d'ouvrir la pull request :

```bash
make test        # pipeline : tests unitaires et tests sur les données
make lint        # ruff
make test-site   # Vitest
make lint-site   # ESLint, Prettier, contrôle du vocabulaire
make test-e2e    # Playwright, axe-core, Lighthouse contre l'image de production
```

## Conventions

- **Langue :** code, commentaires, textes et documentation en français.
- **Textes de l'interface :** tous dans `site/src/i18n/fr.ts`, jamais en dur dans les composants.
- **Paramètres :** tous les seuils sont dans `config/params.yaml` et publiés dans la page Méthode (RG-08). Un changement de seuil met aussi à jour `docs/methode.md` ; les tests vérifient que les chiffres publiés sont ceux du calcul.
- **Décisions :** une décision d'architecture ou de méthode fait l'objet d'un ADR dans `docs/decisions/`.
- **Reproductibilité :** deux exécutions du pipeline doivent produire les mêmes fichiers (`make reproductibilite`). Les sorties publiées (`site/public/`) sont versionnées et régénérées par le pipeline, jamais modifiées à la main.
- **Images Docker :** images de base figées par empreinte, mises à jour volontairement.

## Signaler un problème de données

Une erreur dans la propriété d'un média, un nom mal orthographié, un chiffre qui semble faux : ouvrir une issue en indiquant la page, le média et, si possible, la source qui contredit le site.

## Licences

En contribuant, vous acceptez que votre code soit publié sous [licence MIT](LICENSE) et vos contributions aux données sous Licence Ouverte v2.0 ([LICENSE-DATA.md](LICENSE-DATA.md)).
