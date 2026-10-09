"""Étape « jt » : profils thématiques des JT du soir, 2000-2020 (E0-09, EF-FT-08, T-051).

Source : INA, baromètre thématique des journaux télévisés (Licence Ouverte v1.0). CSV en latin-1,
sans en-tête, séparateur « ; ». Une ligne = un jour × une chaîne × une rubrique, avec le nombre de
sujets et leur durée cumulée en secondes. La 3e colonne est vide.

Sorties agrégées :
- data/interim/jt_quotidien.parquet : séries journalières (date, chaîne, rubrique), pour la
  synchronisation des agendas (compute/jt.py) ;
- data/output/jt_profils.parquet : chaîne × année × rubrique, avec les parts de la rubrique dans
  les JT de la chaîne cette année-là (en sujets et en durée).
"""

import logging
from pathlib import Path

import pandas as pd

from pipeline.chemins import Chemins
from pipeline.config import chemin_source

log = logging.getLogger(__name__)

COLONNES = ["date", "chaine", "vide", "rubrique", "n_sujets", "duree_s"]
CHAINES = ["TF1", "France 2", "France 3", "Arte", "M6"]
RUBRIQUES = [
    "Catastrophes",
    "Culture-loisirs",
    "Economie",
    "Education",
    "Environnement",
    "Faits divers",
    "Histoire-hommages",
    "International",
    "Justice",
    "Politique France",
    "Santé",
    "Sciences et techniques",
    "Société",
    "Sport",
]


class ErreurJt(Exception):
    """Fichier de l'INA différent de la structure attendue."""


def lire(chemin: Path) -> pd.DataFrame:
    brut = pd.read_csv(chemin, sep=";", header=None, encoding="latin-1", names=COLONNES)
    erreurs = []
    if brut["vide"].notna().any():
        erreurs.append("la 3e colonne n'est plus vide : structure à revoir")
    if inconnues := sorted(set(brut["chaine"]) - set(CHAINES)):
        erreurs.append(f"chaînes inattendues {inconnues}")
    if inconnues := sorted(set(brut["rubrique"]) - set(RUBRIQUES)):
        erreurs.append(f"rubriques inattendues {inconnues}")
    if (brut["n_sujets"] < 1).any() or (brut["duree_s"] < 0).any():
        erreurs.append("nombre de sujets ou durée négatifs")
    if brut.duplicated(["date", "chaine", "rubrique"]).any():
        erreurs.append("plusieurs lignes pour un même jour, une même chaîne, une même rubrique")
    if erreurs:
        raise ErreurJt(f"{chemin.name} :\n  - " + "\n  - ".join(erreurs))
    sortie = brut.drop(columns="vide")
    sortie["date"] = pd.to_datetime(sortie["date"], format="%d/%m/%Y")
    return sortie.astype({"n_sujets": "int64", "duree_s": "int64"})


def profils(quotidien: pd.DataFrame) -> pd.DataFrame:
    """Chaîne × année × rubrique (toutes les rubriques, 0 si aucun sujet)."""
    q = quotidien.assign(annee=quotidien["date"].dt.year)
    agrege = q.groupby(["chaine", "annee", "rubrique"], as_index=False)[
        ["n_sujets", "duree_s"]
    ].sum()
    complet = pd.MultiIndex.from_product(
        [CHAINES, sorted(q["annee"].unique()), RUBRIQUES], names=["chaine", "annee", "rubrique"]
    )
    agrege = agrege.set_index(["chaine", "annee", "rubrique"]).reindex(complet, fill_value=0)
    agrege = agrege.reset_index()
    totaux = agrege.groupby(["chaine", "annee"])[["n_sujets", "duree_s"]].transform("sum")
    agrege["part_sujets"] = agrege["n_sujets"] / totaux["n_sujets"]
    agrege["part_duree"] = agrege["duree_s"] / totaux["duree_s"]
    # Ordre fixe : chaînes dans l'ordre de CHAINES, puis année, puis rubrique.
    agrege["chaine"] = pd.Categorical(agrege["chaine"], categories=CHAINES, ordered=True)
    agrege = agrege.sort_values(["chaine", "annee", "rubrique"]).reset_index(drop=True)
    agrege["chaine"] = agrege["chaine"].astype(str)
    return agrege.astype({"annee": "int64", "n_sujets": "int64", "duree_s": "int64"})


def executer(chemins: Chemins) -> None:
    quotidien = lire(chemin_source(chemins, "ina_jt_2000_2020"))
    p = profils(quotidien)
    chemins.interim.mkdir(parents=True, exist_ok=True)
    chemins.output.mkdir(parents=True, exist_ok=True)
    quotidien.to_parquet(chemins.interim / "jt_quotidien.parquet", index=False)
    p.to_parquet(chemins.output / "jt_profils.parquet", index=False)
    log.info(
        "  %d lignes, %d sujets de %s à %s ; %d chaînes × %d années × %d rubriques",
        len(quotidien),
        int(quotidien["n_sujets"].sum()),
        quotidien["date"].min().date(),
        quotidien["date"].max().date(),
        p["chaine"].nunique(),
        p["annee"].nunique(),
        p["rubrique"].nunique(),
    )


def entrees(chemins: Chemins) -> list[Path]:
    return [chemin_source(chemins, "ina_jt_2000_2020")]


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.interim / "jt_quotidien.parquet", chemins.output / "jt_profils.parquet"]
