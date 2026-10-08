"""Lecture du dictionnaire des variables du baromètre Arcom (« datamap »)."""

from pathlib import Path

import pandas as pd


def charger_libelles(chemin: Path) -> dict[str, dict[int, str]]:
    """Libellés des modalités, par nom de variable ou de liste : {"RS1_R": {1: "Un homme", …}}.

    La feuille TEXTS contient une ligne par libellé (TYPE = LABEL) avec le code de la modalité.
    Les listes partagées (ex. « C_SOURCES1TER_R2 », libellés des 90 colonnes de confiance)
    y figurent sous leur propre nom.
    """
    textes = pd.read_excel(chemin, sheet_name="TEXTS")
    attendues = {"NAME", "TYPE", "CODE", "FR:L"}
    if not attendues <= set(textes.columns):
        raise ValueError(
            f"Feuille TEXTS inattendue dans {chemin} : colonnes {list(textes.columns)}"
        )
    libelles = textes[(textes["TYPE"] == "LABEL") & textes["CODE"].notna()]
    resultat: dict[str, dict[int, str]] = {}
    for nom, groupe in libelles.groupby("NAME"):
        resultat[str(nom)] = {
            int(code): str(texte)
            for code, texte in zip(groupe["CODE"], groupe["FR:L"], strict=True)
        }
    return resultat
