"""Étape « referentiel » : référentiel des médias enrichi des effectifs (E0-02, RG-01, RG-03).

Sortie agrégée data/output/medias.parquet : une ligne par média, avec
- n_repondants : nombre (non pondéré) de répondants qui suivent le média ;
- part_ponderee : part pondérée des répondants interrogés sur les médias qui le suivent ;
- affichable : marque identifiable (non générique) suivie par au moins
  `media_affichable_min` répondants ;
- fragile : effectif sous `chiffre_fragile_sous`.
"""

import logging
from pathlib import Path

import pandas as pd

from pipeline.chemins import Chemins
from pipeline.config import charger_params
from pipeline.prepare.medias import charger_referentiel

log = logging.getLogger(__name__)


def enrichir(
    ref: pd.DataFrame, table: pd.DataFrame, seuil_affichable: int, seuil_fragile: int
) -> pd.DataFrame:
    colonnes_medias = [c for c in table.columns if c not in ("resp_id", "poids")]
    effectifs = table[colonnes_medias].sum()
    parts = table[colonnes_medias].mul(table["poids"], axis=0).sum() / table["poids"].sum()

    sortie = ref.copy()
    sortie["n_repondants"] = sortie["media_id"].map(effectifs).fillna(0).astype("int64")
    sortie["part_ponderee"] = sortie["media_id"].map(parts).fillna(0.0).astype("float64")
    sortie["affichable"] = (~sortie["generique"]) & (sortie["n_repondants"] >= seuil_affichable)
    sortie["fragile"] = sortie["n_repondants"] < seuil_fragile
    return sortie


def executer(chemins: Chemins) -> None:
    params = charger_params(chemins)
    ref = charger_referentiel(chemins.config / "medias.csv")
    table = pd.read_parquet(chemins.interim / "repondant_media.parquet")
    sortie = enrichir(
        ref,
        table,
        params.seuils.media_affichable_min,
        params.seuils.chiffre_fragile_sous,
    )

    absents = sortie.loc[sortie["n_repondants"] == 0, "media_id"].tolist()
    if absents:
        log.info(
            "  Médias cités par aucun répondant en %s : %s", params.edition, ", ".join(absents)
        )
    sous_seuil = sortie.loc[
        ~sortie["generique"] & ~sortie["affichable"] & (sortie["n_repondants"] > 0), "media_id"
    ].tolist()
    if sous_seuil:
        log.info("  Sous le seuil d'affichage (RG-01) : %s", ", ".join(sous_seuil))

    chemins.output.mkdir(parents=True, exist_ok=True)
    sortie.to_parquet(chemins.output / "medias.parquet", index=False)
    log.info(
        "  %d médias au référentiel, %d affichables (dont %d fragiles), %d génériques",
        len(sortie),
        int(sortie["affichable"].sum()),
        int((sortie["affichable"] & sortie["fragile"]).sum()),
        int(sortie["generique"].sum()),
    )


def entrees(chemins: Chemins) -> list[Path]:
    return [
        chemins.config / "medias.csv",
        chemins.config / "params.yaml",
        chemins.interim / "repondant_media.parquet",
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.output / "medias.parquet"]
