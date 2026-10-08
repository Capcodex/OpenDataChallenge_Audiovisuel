"""Étape « export_site » : graph.json, les données de la carte (E0-10, CdC technique § 8.2).

Assemble les sorties agrégées (médias, attributs, familles, disposition, liens, propriété) dans
le format compact consommé par le site : clés courtes, réels arrondis à 3 décimales. Le fichier
est validé contre site/src/graph/schema.json avant d'être écrit : un export non conforme fait
échouer le pipeline (T-044). Budget : 2 Mo (ENF-02).

Aucune donnée sous les seuils : seuls les médias affichables ont des indicateurs ; les autres
(RG-02) n'apparaissent que par leur nom, pour la recherche.

Sortie versionnée : site/public/data/graph.json.
"""

import json
import logging
import math
from pathlib import Path

import jsonschema
import pandas as pd

from pipeline import __version__
from pipeline.chemins import Chemins
from pipeline.config import Params, charger_params

log = logging.getLogger(__name__)

BUDGET_OCTETS = 2 * 1024 * 1024  # ENF-02
# Couleurs des familles : jetons --couleur-famille-* du site (site/src/styles/jetons.css).
COULEURS_FAMILLES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"]
SOURCES_PUBLIEES = [
    {
        "name": "Les Français et l'information, baromètre 2026",
        "producer": "Arcom",
        "license": "Licence Ouverte v2.0",
        "url": "https://www.data.gouv.fr/fr/datasets/les-francais-et-linformation-barometre/",
    },
    {
        "name": "Médias français : qui possède quoi (commit du 17/12/2024)",
        "producer": "Le Monde diplomatique, Acrimed",
        "license": "ODC-By v1.0",
        "url": "https://github.com/mdiplo/Medias_francais",
    },
]


class ErreurExport(Exception):
    """graph.json non conforme à son schéma ou au-dessus du budget."""


def arrondi(x: float | None, chiffres: int = 3) -> float | None:
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    return round(float(x), chiffres)


def triplet(
    ligne: pd.Series, valeur: str, prefixe: str | None = None, chiffres: int = 3
) -> list[float] | None:
    """[valeur, borne basse, borne haute] ; None si l'indicateur n'est pas publié.

    `prefixe` des colonnes de bornes (`<prefixe>_bas`, `<prefixe>_haut`), par défaut `valeur`.
    """
    prefixe = prefixe or valeur
    valeurs = [ligne[valeur], ligne[f"{prefixe}_bas"], ligne[f"{prefixe}_haut"]]
    if any(pd.isna(v) for v in valeurs):
        return None
    return [arrondi(v, chiffres) for v in valeurs]


def construire(
    medias: pd.DataFrame,
    attributs: pd.DataFrame,
    familles: pd.DataFrame,
    disposition: pd.DataFrame,
    liens: pd.DataFrame,
    proprietes: pd.DataFrame,
    journal_familles: dict,
    journal_coaudience: dict,
    params: Params,
) -> dict:
    m = medias.set_index("media_id")
    a = attributs.set_index("media_id")
    f = familles.set_index("media_id")
    d = disposition.set_index("media_id")
    affichables = sorted(m.index[m["affichable"]])
    proprio = proprietes.groupby("media_id")

    nodes = []
    for mid in affichables:
        lignes_p = proprio.get_group(mid)
        identifies = lignes_p[lignes_p["proprietaire_id"].notna()]
        nodes.append(
            {
                "id": mid,
                "label": m.loc[mid, "nom"],
                "aliases": list(m.loc[mid, "variantes"]),
                "type": m.loc[mid, "type"],
                "public": m.loc[mid, "public_prive"],
                "x": arrondi(d.loc[mid, "x"]),
                "y": arrondi(d.loc[mid, "y"]),
                "community": int(f.loc[mid, "famille"]),
                "stability": arrondi(f.loc[mid, "stabilite"]),
                "bridge": bool(f.loc[mid, "pont"]),
                "n": int(m.loc[mid, "n_repondants"]),
                "share": arrondi(m.loc[mid, "part_ponderee"]),
                "fragile": bool(m.loc[mid, "fragile"]),
                "pol": triplet(a.loc[mid], "pol_moy", "pol"),
                "pol_nr": arrondi(a.loc[mid, "pol_part_nr"]),
                "age": triplet(a.loc[mid], "age_moy", "age", chiffres=1),
                "under35": triplet(a.loc[mid], "moins35"),
                "trust": triplet(a.loc[mid], "conf_ref"),
                "trust_gap": triplet(a.loc[mid], "conf_ecart_gd"),
                "group": None
                if pd.isna(lignes_p["groupe"].iloc[0])
                else lignes_p["groupe"].iloc[0],
                "owners": [
                    {"id": r.proprietaire_id, "share": arrondi(r.part)}
                    for r in identifies.itertuples()
                ],
                "owner_status": lignes_p["statut"].iloc[0],
            }
        )

    others = [
        {
            "id": mid,
            "label": m.loc[mid, "nom"],
            "aliases": list(m.loc[mid, "variantes"]),
            "type": m.loc[mid, "type"],
        }
        for mid in sorted(m.index[~m["affichable"] & ~m["generique"]])
    ]

    edges = [
        {
            "s": r.source,
            "t": r.cible,
            "lift": arrondi(r.lift),
            "ci": [arrondi(r.lift_bas), arrondi(r.lift_haut)],
            "n": int(r.n_communs),
            "shown": bool(r.affiche),
        }
        for r in liens.sort_values(["source", "cible"]).itertuples()
    ]

    tailles = familles["famille"].value_counts()
    communities = [
        {
            "id": int(k),
            # Libellés provisoires : les noms définitifs viendront du test H5 (jalon J2).
            "label": f"Famille {int(k)}",
            "color": COULEURS_FAMILLES[(int(k) - 1) % len(COULEURS_FAMILLES)],
            "size": int(tailles[k]),
        }
        for k in sorted(tailles.index)
    ]

    identifies = proprietes[
        proprietes["proprietaire_id"].notna() & proprietes["media_id"].isin(affichables)
    ]
    owners = [
        {
            "id": r.proprietaire_id,
            "name": r.proprietaire,
            "type": r.type_proprietaire,
            "source": r.source,
            "as_of": r.date,
        }
        for r in identifies.drop_duplicates("proprietaire_id")
        .sort_values("proprietaire_id")
        .itertuples()
    ]

    return {
        "meta": {
            "format": 1,
            "edition": params.edition,
            "date_traitement": params.publication.date_traitement,
            "version_pipeline": __version__,
            "adresse_site": params.publication.adresse_site,
            "sources": SOURCES_PUBLIEES,
            "params": params.publies(),
            "communities_displayed": bool(journal_familles["familles_affichees"]),
            "lift_reference": arrondi(journal_coaudience["lift_reference_intensite"]),
        },
        "nodes": nodes,
        "others": others,
        "edges": edges,
        "communities": communities,
        "owners": owners,
        "jt": None,
    }


def serialiser(graphe: dict) -> str:
    """JSON compact (sans espaces), clés dans l'ordre de construction : sortie reproductible."""
    return json.dumps(graphe, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def valider(graphe: dict, schema: dict, texte: str) -> None:
    try:
        jsonschema.validate(graphe, schema, cls=jsonschema.Draft202012Validator)
    except jsonschema.ValidationError as e:
        chemin = "/".join(map(str, e.absolute_path))
        raise ErreurExport(f"graph.json non conforme au schéma ({chemin}) : {e.message}") from e
    taille = len(texte.encode("utf-8"))
    if taille > BUDGET_OCTETS:
        raise ErreurExport(f"graph.json pèse {taille} octets, au-dessus du budget de 2 Mo")


def executer(chemins: Chemins) -> None:
    params = charger_params(chemins)
    lire = lambda nom: pd.read_parquet(chemins.output / nom)  # noqa: E731
    graphe = construire(
        lire("medias.parquet"),
        lire("attributs_medias.parquet"),
        lire("familles.parquet"),
        lire("disposition.parquet"),
        lire("liens.parquet"),
        lire("proprietes.parquet"),
        json.loads((chemins.output / "journal_familles.json").read_text(encoding="utf-8")),
        json.loads((chemins.output / "journal_coaudience.json").read_text(encoding="utf-8")),
        params,
    )
    texte = serialiser(graphe)
    valider(graphe, json.loads(chemins.schema_graphe.read_text(encoding="utf-8")), texte)
    sortie = chemins.site_public / "data" / "graph.json"
    sortie.parent.mkdir(parents=True, exist_ok=True)
    sortie.write_text(texte + "\n", encoding="utf-8")
    log.info(
        "  graph.json : %d médias, %d hors carte, %d liens (%d tracés), %d propriétaires ; %d ko",
        len(graphe["nodes"]),
        len(graphe["others"]),
        len(graphe["edges"]),
        sum(e["shown"] for e in graphe["edges"]),
        len(graphe["owners"]),
        len(texte.encode("utf-8")) // 1024,
    )


def entrees(chemins: Chemins) -> list[Path]:
    o = chemins.output
    return [
        chemins.config / "params.yaml",
        chemins.schema_graphe,
        o / "medias.parquet",
        o / "attributs_medias.parquet",
        o / "familles.parquet",
        o / "disposition.parquet",
        o / "liens.parquet",
        o / "proprietes.parquet",
        o / "journal_familles.json",
        o / "journal_coaudience.json",
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.site_public / "data" / "graph.json"]
