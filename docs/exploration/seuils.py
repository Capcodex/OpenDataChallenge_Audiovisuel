"""Exploration des seuils des liens (T-025) : hors produit, sert à la revue des seuils (ADR-005).

Lancement : `make exploration`. Lit les sorties du pipeline et écrit docs/exploration/seuils.md.
Le rapport est versionné : il ne contient que des comptes de paires et des distributions,
jamais de paire nommée sous les seuils (ENF-09).
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline.chemins import Chemins
from pipeline.compute.coaudience import lift_reference
from pipeline.config import charger_params

CHEMINS = Chemins.depuis_environnement()
SORTIE = Path(__file__).with_suffix(".md")
EFFECTIFS = [20, 30, 50]
BORNES = [1.0, 1.2, 1.5, 2.0]
ENTETES_GRILLE = [
    "Effectif commun (RG-04)",
    "Borne basse (RG-05)",
    "Liens",
    "Densité",
    "Degré médian",
    "Isolés",
]


def graphe(paires: pd.DataFrame, medias: list[str], effectif: int, borne: float) -> dict:
    gardees = paires[(paires["n_communs"] >= effectif) & (paires["lift_bas"] > borne)]
    degres = pd.concat([gardees["source"], gardees["cible"]]).value_counts()
    degres = degres.reindex(medias, fill_value=0)
    return {
        "liens": len(gardees),
        "densite": len(gardees) / len(paires),
        "degre_median": float(degres.median()),
        "isoles": int((degres == 0).sum()),
    }


def tableau(lignes: list[list], entetes: list[str]) -> str:
    sortie = ["| " + " | ".join(entetes) + " |", "|" + "---|" * len(entetes)]
    sortie += ["| " + " | ".join(str(c) for c in ligne) + " |" for ligne in lignes]
    return "\n".join(sortie)


def main() -> None:
    params = charger_params(CHEMINS)
    paires = pd.read_parquet(CHEMINS.interim / "paires.parquet")
    table = pd.read_parquet(CHEMINS.interim / "repondant_media.parquet")
    medias = pd.read_parquet(CHEMINS.output / "medias.parquet")
    attributs = pd.read_parquet(CHEMINS.output / "attributs_medias.parquet")
    journal = json.loads((CHEMINS.output / "journal_coaudience.json").read_text(encoding="utf-8"))
    affichables = medias.loc[medias["affichable"], "media_id"].tolist()
    n = len(affichables)

    # 1. Distribution des lifts.
    q = paires["lift"].quantile([0.05, 0.25, 0.5, 0.75, 0.95])
    part_sous_1 = (paires["lift"] < 1).mean()
    part_haut_sous_1 = (paires["lift_haut"] < 1).mean()

    # 2. Effet de l'intensité de consommation : nombre de médias suivis par répondant (tous les
    # médias du baromètre, y compris génériques), moyennes pondérées.
    w = table["poids"].to_numpy() / table["poids"].sum()
    k = table.drop(columns=["resp_id", "poids"]).sum(axis=1).to_numpy(dtype=float)
    k_moy = float(w @ k)
    k_carre = float(w @ k**2)
    lift_nul = lift_reference(table)
    k_q = np.quantile(k, [0.25, 0.5, 0.75, 0.99])

    # 3. Grille de seuils.
    grille = [
        [
            f"≥ {e}",
            f"> {b:g}",
            (g := graphe(paires, affichables, e, b))["liens"],
            f"{100 * g['densite']:.0f} %",
            f"{g['degre_median']:.0f}",
            g["isoles"],
        ]
        for e in EFFECTIFS
        for b in BORNES
    ]
    au_dessus_nul = paires[
        (paires["n_communs"] >= params.seuils.lien_effectif_commun_min)
        & (paires["lift_bas"] > lift_nul)
    ]
    isoles_nul = sorted(
        set(affichables) - set(au_dessus_nul["source"]) - set(au_dessus_nul["cible"])
    )

    # Plafond du lift : p_ij ≤ min(p_i, p_j), donc lift ≤ 1 / max(p_i, p_j).
    grands = medias[medias["affichable"]].nlargest(3, "part_ponderee")
    plafonds = ", ".join(
        f"{m} (part {100 * p:.0f} %, lift ≤ {1 / p:.2f})"
        for m, p in zip(grands["media_id"], grands["part_ponderee"], strict=True)
    )

    # 4. Effectif commun et précision : largeur relative de l'intervalle selon l'effectif commun.
    tranches = pd.cut(paires["n_communs"], [0, 29, 49, 99, 199, 10_000])
    largeur = ((paires["lift_haut"] - paires["lift_bas"]) / paires["lift"]).groupby(
        tranches, observed=True
    )
    precision = [
        [str(t).replace("(", "]"), int(c), f"{100 * m:.0f} %"]
        for (t, c), m in zip(largeur.count().items(), largeur.median(), strict=True)
    ]

    # 5. Médias exclus (RG-01) : rappel.
    exclus = medias[~medias["affichable"] & ~medias["generique"]]

    texte = f"""# Exploration des seuils des liens de co-audience

*Généré par `docs/exploration/seuils.py` (`make exploration`). Édition {params.edition},
{n} médias affichables, {journal["paires_testees"]} paires, {params.bootstrap.iterations}
tirages bootstrap. Ne pas modifier à la main.*

## 1. Distribution des lifts (toutes les paires de médias affichables)

{tableau([[f"{v:.2f}" for v in q]], ["5 %", "25 %", "médiane", "75 %", "95 %"])}

- {100 * part_sous_1:.0f} % des paires ont un lift inférieur à 1 ;
  {100 * part_haut_sous_1:.1f} % ont même une borne haute inférieure à 1.
- **Presque toutes les paires de médias partagent leur public plus que ne le voudrait le hasard.**

## 2. Pourquoi : l'intensité de consommation

Un répondant suit en moyenne **{k_moy:.1f} médias** (pondéré ; quartiles {k_q[0]:.0f} /
{k_q[1]:.0f} / {k_q[2]:.0f}, 99e centile {k_q[3]:.0f}). Les gros consommateurs d'information
apparaissent dans le public de presque tous les médias, ce qui gonfle tous les lifts.

Si les répondants ne différaient **que** par le nombre de médias qu'ils suivent (chacun choisissant
ses médias au hasard, proportionnellement à leur audience), le lift attendu de **toute** paire
serait :

```
lift_nul = E[k²] / E[k]² = {k_carre:.1f} / {k_moy:.1f}² = {lift_nul:.2f}
```

Ce lift de référence ne dit rien de la proximité entre deux médias : il mesure seulement la
dispersion des intensités de consommation. Avec RG-05 tel qu'écrit (borne basse > 1), la plupart
des liens retenus ne font que refléter cet effet.

## 3. Nombre de liens selon les seuils

Densité = liens / paires possibles ; degré = nombre de liens d'un média ; isolés = médias
affichables sans aucun lien.

{tableau(grille, ENTETES_GRILLE)}

Avec RG-04 à {params.seuils.lien_effectif_commun_min} et une borne basse supérieure au lift de
référence ({lift_nul:.2f}) : **{len(au_dessus_nul)} liens**, médias isolés :
{", ".join(isoles_nul) if isoles_nul else "aucun"}.

**Plafond des grands médias.** Comme `p_ij ≤ min(p_i, p_j)`, le lift d'une paire ne peut pas
dépasser `1 / max(p_i, p_j)`. Les médias à très large audience ont donc mécaniquement des lifts
faibles et disparaissent du graphe dès que le seuil monte : {plafonds}.

## 4. Précision selon l'effectif commun

Largeur médiane de l'intervalle à 95 %, rapportée au lift.

{tableau(precision, ["Effectif commun", "Paires", "Largeur relative médiane"])}

## 5. Médias exclus par RG-01 (moins de {params.seuils.media_affichable_min} répondants)

{", ".join(exclus["media_id"]) or "aucun"} ({len(exclus)} médias non génériques, dont
{int((exclus["n_repondants"] == 0).sum())} cités par personne).

## 6. Attributs : précision

Largeur médiane de l'intervalle du positionnement politique : \
{(attributs["pol_haut"] - attributs["pol_bas"]).median():.2f} point (échelle 0-10) ;
maximum {(attributs["pol_haut"] - attributs["pol_bas"]).max():.2f} point
({attributs.loc[(attributs["pol_haut"] - attributs["pol_bas"]).idxmax(), "media_id"]}).
"""
    SORTIE.write_text(texte, encoding="utf-8")
    print(f"Rapport écrit : {SORTIE}")


if __name__ == "__main__":
    main()
