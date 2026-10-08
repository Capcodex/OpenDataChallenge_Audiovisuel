"""Exploration des familles (T-032) : hors produit, sert au choix de la résolution et de la
pondération de Leiden (ADR-007) et au jalon J2.

Lancement : `make exploration`. Lit les sorties du pipeline et écrit docs/exploration/familles.md.
"""

from dataclasses import replace
from pathlib import Path

import numpy as np
import pandas as pd
from pipeline.compute.familles import (
    partition,
    poids_liens,
    renumeroter,
    selectionner_liens,
    stabilite,
)

from pipeline.chemins import Chemins
from pipeline.config import charger_params

CHEMINS = Chemins.depuis_environnement()
SORTIE = Path(__file__).with_suffix(".md")
RESOLUTIONS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.5]
TAILLE_MIN = 3  # une famille lisible compte au moins 3 médias
ENTETES = [
    "Liens",
    "Poids",
    "Résolution",
    "Familles",
    "Tailles",
    "Médias stables",
    "ARI moyen",
    "RG-07",
]
MODES = ["log_lift", "lift"]
ENSEMBLES = {"retenus": "tous les liens retenus", "affiches": "liens affichés (ADR-005)"}


def tableau(lignes: list[list], entetes: list[str]) -> str:
    sortie = ["| " + " | ".join(entetes) + " |", "|" + "---|" * len(entetes)]
    sortie += ["| " + " | ".join(str(c) for c in ligne) + " |" for ligne in lignes]
    return "\n".join(sortie)


def main() -> None:
    params = charger_params(CHEMINS)
    c = params.communautes
    table = pd.read_parquet(CHEMINS.interim / "repondant_media.parquet")
    medias_ref = pd.read_parquet(CHEMINS.output / "medias.parquet").set_index("media_id")
    tous = pd.read_parquet(CHEMINS.output / "liens.parquet")
    medias = sorted(medias_ref.index[medias_ref["affichable"]])
    x = table[medias].to_numpy(dtype=np.float64)
    poids = table["poids"].to_numpy(dtype=np.float64)

    lignes, resultats = [], {}
    for ensemble in ENSEMBLES:
        liens = selectionner_liens(tous, ensemble)
        for mode in MODES:
            for resolution in RESOLUTIONS:
                p = replace(params, communautes=replace(c, resolution=resolution, poids=mode))
                brut = partition(
                    medias,
                    liens["source"].tolist(),
                    liens["cible"].tolist(),
                    poids_liens(liens["lift"].to_numpy(), mode),
                    resolution,
                    params.seed,
                )
                ref = renumeroter(brut, medias)
                stab, ari = stabilite(x, poids, medias, liens, ref, p)
                part = float((stab >= c.stabilite_noeud_min).mean())
                tailles = np.bincount(ref)[1:]
                resultats[(ensemble, mode, resolution)] = (ref, stab, part)
                lignes.append(
                    [
                        ENSEMBLES[ensemble],
                        "log(lift)" if mode == "log_lift" else "lift",
                        f"{resolution:g}",
                        len(tailles),
                        "/".join(map(str, tailles)),
                        f"{100 * part:.0f} %",
                        f"{np.mean(ari):.2f}",
                        "✅" if part >= c.part_noeuds_stables_min else "—",
                    ]
                )

    # Critère de choix (ADR-007) : RG-07 respectée, au moins 2 familles, toutes d'au moins
    # TAILLE_MIN médias ; parmi celles-là, le plus grand nombre de familles, puis la plus stable.
    def admissible(v):
        tailles = np.bincount(v[0])[1:]
        stable = v[2] >= c.part_noeuds_stables_min
        return stable and len(tailles) >= 2 and tailles.min() >= TAILLE_MIN

    candidats = {k: v for k, v in resultats.items() if admissible(v)}
    meilleure = max(candidats, key=lambda k: (len(np.unique(candidats[k][0])), candidats[k][2]))
    ref, stab, part = candidats[meilleure]
    retenue = (c.liens, c.poids, c.resolution)

    def composition(cle):
        r, s, _ = resultats[cle]
        attributs = pd.read_parquet(CHEMINS.output / "attributs_medias.parquet").set_index(
            "media_id"
        )
        lignes = []
        for f in np.unique(r):
            membres = [(m, x) for m, y, x in zip(medias, r, s, strict=True) if y == f]
            membres.sort(key=lambda t: -medias_ref.loc[t[0], "n_repondants"])
            ids = [m for m, _ in membres]
            lignes.append(
                [
                    f,
                    len(membres),
                    f"{attributs.loc[ids, 'age_moy'].mean():.0f} ans",
                    ", ".join(
                        f"{medias_ref.loc[m, 'nom']}{'' if x >= c.stabilite_noeud_min else ' *'}"
                        for m, x in membres
                    ),
                ]
            )
        return tableau(lignes, ["Famille", "Médias", "Âge moyen des publics", "Composition"])

    instables = sorted(
        (s, medias_ref.loc[m, "nom"])
        for m, s in zip(medias, resultats[retenue][1], strict=True)
        if s < c.stabilite_noeud_min
    )
    alternative = ("affiches", "log_lift", 1.0)
    liste_instables = ", ".join(f"{n} ({100 * s:.0f} %)" for s, n in instables)

    texte = f"""# Exploration des familles de médias

*Généré par `docs/exploration/familles.py` (`make exploration`). Édition {params.edition},
{len(medias)} médias, {c.sous_echantillons} sous-échantillons bootstrap par configuration.
Ne pas modifier à la main.*

RG-07 : les familles sont affichées si au moins {100 * c.part_noeuds_stables_min:.0f} % des
médias ont une stabilité d'au moins {100 * c.stabilite_noeud_min:.0f} % (part des
sous-échantillons où le média reste dans sa famille).

## 1. Toutes les configurations

{tableau(lignes, ENTETES)}

## 2. Choix

Critère : RG-07 respectée, toutes les familles d'au moins {TAILLE_MIN} médias ; parmi ces
configurations, le plus grand nombre de familles, puis la plus stable.

- Configuration qui satisfait le critère : **{ENSEMBLES[meilleure[0]]}, poids {meilleure[1]},
  résolution {meilleure[2]:g}** ({100 * part:.0f} % des médias stables).
- Configuration de `params.yaml` : **{ENSEMBLES[retenue[0]]}, poids {retenue[1]}, résolution
  {retenue[2]:g}** ({"identique" if retenue == meilleure else "différente : à revoir"}).

## 3. Familles de la configuration retenue

Médias marqués * : stabilité inférieure à {100 * c.stabilite_noeud_min:.0f} %. Médias classés
par taille de public.

{composition(retenue)}

Médias sous le seuil de stabilité : {liste_instables or "aucun"}.

## 4. Alternative écartée : 4 familles (liens affichés, log(lift), résolution 1)

{100 * resultats[alternative][2]:.0f} % des médias stables : RG-07 n'est pas respectée.

{composition(alternative)}
"""
    SORTIE.write_text(texte, encoding="utf-8")
    print(f"Rapport écrit : {SORTIE}")


if __name__ == "__main__":
    main()
