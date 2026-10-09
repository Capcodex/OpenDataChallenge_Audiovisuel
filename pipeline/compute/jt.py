"""Étape « jt_similarites » : proximité des profils éditoriaux des JT (E0-09, CdC technique § 7.8).

Pour chaque paire de chaînes, chaque période (params.yaml) et chaque mesure (nombre de sujets,
durée) :
- similarité = 1 − distance de Jensen-Shannon (base 2) entre les répartitions des 14 rubriques ;
  1 = profils identiques, 0 = aucune rubrique en commun ;
- synchronisation = corrélation de Pearson des volumes journaliers d'une rubrique entre les deux
  chaînes, moyennée sur les rubriques ; mesure si les deux JT couvrent les mêmes sujets les mêmes
  jours. Calculée sur les jours où les deux chaînes ont diffusé.

Sortie agrégée : data/output/jt_similarites.parquet.
"""

import logging
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.spatial.distance import jensenshannon

from pipeline.chemins import Chemins
from pipeline.config import charger_params
from pipeline.prepare.jt import CHAINES, RUBRIQUES

log = logging.getLogger(__name__)

MESURES = {"sujets": "n_sujets", "duree": "duree_s"}


def repartition(
    profils: pd.DataFrame, chaine: str, debut: int, fin: int, colonne: str
) -> np.ndarray:
    """Répartition (somme 1) des rubriques d'une chaîne sur une période, ordre de RUBRIQUES."""
    p = profils[(profils["chaine"] == chaine) & profils["annee"].between(debut, fin)]
    volumes = p.groupby("rubrique")[colonne].sum().reindex(RUBRIQUES, fill_value=0)
    return (volumes / volumes.sum()).to_numpy()


def similarite(p: np.ndarray, q: np.ndarray) -> float:
    return float(1 - jensenshannon(p, q, base=2))


def synchronisation(quotidien: pd.DataFrame, a: str, b: str, colonne: str) -> float:
    """Corrélation moyenne, sur les rubriques, des volumes journaliers des deux chaînes."""
    serie = quotidien[quotidien["chaine"].isin([a, b])].pivot_table(
        index="date", columns=["chaine", "rubrique"], values=colonne, aggfunc="sum", fill_value=0
    )
    jours_communs = (serie[a].sum(axis=1) > 0) & (serie[b].sum(axis=1) > 0)
    serie = serie[jours_communs]
    correlations = []
    for r in RUBRIQUES:
        xa = serie[a][r] if r in serie[a] else pd.Series(0, index=serie.index)
        xb = serie[b][r] if r in serie[b] else pd.Series(0, index=serie.index)
        if xa.std() > 0 and xb.std() > 0:
            correlations.append(float(np.corrcoef(xa, xb)[0, 1]))
    return float(np.mean(correlations)) if correlations else float("nan")


def calculer(profils: pd.DataFrame, quotidien: pd.DataFrame, periodes: list) -> pd.DataFrame:
    annee = quotidien["date"].dt.year
    lignes = []
    for debut, fin in periodes:
        q = quotidien[annee.between(debut, fin)]
        for a, b in combinations(CHAINES, 2):
            for mesure, colonne in MESURES.items():
                lignes.append(
                    {
                        "chaine_a": a,
                        "chaine_b": b,
                        "periode": f"{debut}-{fin}",
                        "mesure": mesure,
                        "similarite_js": similarite(
                            repartition(profils, a, debut, fin, colonne),
                            repartition(profils, b, debut, fin, colonne),
                        ),
                        "synchronisation": synchronisation(q, a, b, colonne),
                    }
                )
    return pd.DataFrame(lignes)


def executer(chemins: Chemins) -> None:
    params = charger_params(chemins)
    profils = pd.read_parquet(chemins.output / "jt_profils.parquet")
    quotidien = pd.read_parquet(chemins.interim / "jt_quotidien.parquet")
    sortie = calculer(profils, quotidien, params.jt.periodes)
    sortie.to_parquet(chemins.output / "jt_similarites.parquet", index=False)

    tout = sortie[(sortie["periode"] == params.jt.libelles[0]) & (sortie["mesure"] == "sujets")]
    moyenne = {
        c: tout.loc[(tout["chaine_a"] == c) | (tout["chaine_b"] == c), "similarite_js"].mean()
        for c in CHAINES
    }
    singuliere = min(moyenne, key=moyenne.get)
    log.info(
        "  %d similarités (%d périodes) ; profil le plus singulier sur %s : %s (%.2f en moyenne)",
        len(sortie),
        len(params.jt.periodes),
        params.jt.libelles[0],
        singuliere,
        moyenne[singuliere],
    )


def entrees(chemins: Chemins) -> list[Path]:
    return [
        chemins.config / "params.yaml",
        chemins.output / "jt_profils.parquet",
        chemins.interim / "jt_quotidien.parquet",
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.output / "jt_similarites.parquet"]
