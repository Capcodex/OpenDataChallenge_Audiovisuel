# ADR-004 · Base des répondants et question sur les réseaux sociaux

- **Statut :** acceptée
- **Date :** 8 octobre 2026
- **Références :** E0-01, RG-10, CdC technique § 6.3

## Contexte

Le baromètre de l'Arcom 2026 compte 3 377 répondants. Les questions sur les médias suivis (`SOURCES1*`, `TV2AR`) ne sont posées qu'aux personnes intéressées par l'information générale : **2 939 répondants** (87 %, conforme au guide de l'Arcom).

La question sur les médias en ligne et les créateurs (`SOURCES1FR_R2_R`) n'a que **2 796 répondants**. Les 143 manquants sont tous issus de l'**échantillon interrogé par téléphone** (`PAGE_R_2 = 2`, CATI), qui représente les personnes n'utilisant pas internet.

## Décision

- La base de calcul est celle des **2 939 répondants** interrogés sur les médias.
- Pour les 143 répondants non interrogés sur les réseaux sociaux, une absence de réponse vaut **« ne suit pas ce média en ligne »**. Ce choix est explicite dans `config/variables_arcom.yaml` (`absence_vaut_non: true`) ; toute autre question sans réponse fait échouer le pipeline.
- La colonne de pondération est `POIDS` (le guide de l'Arcom mentionne `POIDS03`, nom utilisé dans l'édition 2024).

## Conséquences

- Les publics des médias en ligne sont légèrement sous-estimés si une partie de ces 143 personnes les suit par un autre moyen ; l'effet est jugé négligeable (personnes sans usage d'internet).
- Ce point est à mentionner dans la page Méthode (section « Les données »).
- Un test vérifie que les non-interrogés sont bien 143 et tous issus de l'échantillon téléphonique.
