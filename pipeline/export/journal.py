"""Étape « journal » : journal d'exécution complet (EF-FT-10, T-047).

Rassemble les journaux de chaque étape, les paramètres et les empreintes des sources dans un seul
fichier, publié avec les données pour que chaque chiffre soit traçable :
- data/output/run_log.json ;
- site/public/telechargements/journal.json (même contenu).

Pas d'horodatage d'exécution : le journal ne change que si les données changent (ENF-12).
"""

import json
import logging
from pathlib import Path

import pandas as pd

from pipeline import __version__
from pipeline.chemins import Chemins
from pipeline.config import charger_params

log = logging.getLogger(__name__)

JOURNAUX = ["arcom", "coaudience", "familles", "proprietes"]


def construire(chemins: Chemins) -> dict:
    params = charger_params(chemins)
    lire = lambda nom: json.loads((chemins.output / nom).read_text(encoding="utf-8"))  # noqa: E731
    journaux = {nom: lire(f"journal_{nom}.json") for nom in JOURNAUX}
    medias = pd.read_parquet(chemins.output / "medias.parquet")
    non_generiques = medias[~medias["generique"]]
    manifeste = lire_manifeste(chemins.raw / "manifest.json")
    attributs = pd.read_parquet(chemins.output / "attributs_medias.parquet")

    return {
        "version_pipeline": __version__,
        "edition": params.edition,
        "date_traitement": params.publication.date_traitement,
        "sources": manifeste,
        "params": params.publies(),
        "repondants": {
            "total": journaux["arcom"]["repondants_total"],
            "base": journaux["arcom"]["repondants_base"],
            "non_interroges_par_question": journaux["arcom"]["non_interroges_par_question"],
        },
        "medias": {
            "referentiel": len(medias),
            "generiques": int(medias["generique"].sum()),
            "affichables": int(medias["affichable"].sum()),
            "fragiles": int((medias["affichable"] & medias["fragile"]).sum()),
            "cites_par_personne": sorted(
                non_generiques.loc[non_generiques["n_repondants"] == 0, "media_id"]
            ),
            "sous_le_seuil": sorted(
                non_generiques.loc[
                    ~non_generiques["affichable"] & (non_generiques["n_repondants"] > 0), "media_id"
                ]
            ),
        },
        "liens": journaux["coaudience"],
        "attributs": {
            "confiance_publiee": int(attributs["conf_ref"].notna().sum()),
            "ecart_gauche_droite_publie": int(attributs["conf_ecart_gd"].notna().sum()),
        },
        "familles": journaux["familles"],
        "proprietes": journaux["proprietes"],
    }


def lire_manifeste(chemin: Path) -> list[dict]:
    """Identifiant, empreinte et taille de chaque source (sans la date de vérification, qui
    change à chaque téléchargement)."""
    contenu = json.loads(chemin.read_text(encoding="utf-8"))
    return [
        {"id": s["id"], "sha256": s["sha256"], "octets": s["octets"]} for s in contenu["sources"]
    ]


def executer(chemins: Chemins) -> None:
    texte = json.dumps(construire(chemins), indent=2, ensure_ascii=False) + "\n"
    (chemins.output / "run_log.json").write_text(texte, encoding="utf-8")
    publie = chemins.site_public / "telechargements" / "journal.json"
    publie.parent.mkdir(parents=True, exist_ok=True)
    publie.write_text(texte, encoding="utf-8")
    log.info("  Journal d'exécution : data/output/run_log.json et telechargements/journal.json")


def entrees(chemins: Chemins) -> list[Path]:
    o = chemins.output
    return [
        chemins.config / "params.yaml",
        chemins.raw / "manifest.json",
        o / "medias.parquet",
        o / "attributs_medias.parquet",
        *[o / f"journal_{nom}.json" for nom in JOURNAUX],
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [
        chemins.output / "run_log.json",
        chemins.site_public / "telechargements" / "journal.json",
    ]
