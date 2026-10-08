import copy
import json
from pathlib import Path

import pandas as pd
import pytest

from pipeline.export.site_json import ErreurExport, serialiser, valider
from pipeline.export.telechargements import (
    COLONNES,
    ErreurTelechargements,
    gexf,
    verifier_dictionnaire,
)

SCHEMA = json.loads(
    (Path(__file__).parents[2] / "site" / "src" / "graph" / "schema.json").read_text("utf-8")
)

NOEUD = {
    "id": "le-monde",
    "label": "Le Monde",
    "aliases": [],
    "type": "journal",
    "public": "prive",
    "x": 0.5,
    "y": 0.5,
    "community": 1,
    "stability": 0.9,
    "bridge": False,
    "n": 626,
    "share": 0.2,
    "fragile": False,
    "pol": [5.1, 4.9, 5.4],
    "pol_nr": 0.02,
    "age": [41.7, 40.2, 43.1],
    "under35": [0.46, 0.41, 0.5],
    "trust": [0.53, 0.49, 0.57],
    "trust_gap": None,
    "group": "Groupe Le Monde",
    "owners": [{"id": "xavier-niel", "share": None}],
    "owner_status": "base",
}
GRAPHE = {
    "meta": {
        "format": 1,
        "edition": "2026",
        "date_traitement": "2026-10-08",
        "version_pipeline": "0.1.0",
        "adresse_site": "https://exemple.fr",
        "sources": [{"name": "Arcom", "producer": "Arcom", "license": "LO", "url": "https://x"}],
        "params": {},
        "communities_displayed": True,
        "lift_reference": 1.57,
    },
    "nodes": [NOEUD],
    "others": [],
    "edges": [],
    "communities": [],
    "owners": [],
    "jt": None,
}


def test_graphe_conforme_accepte():
    valider(GRAPHE, SCHEMA, serialiser(GRAPHE))


@pytest.mark.parametrize(
    "modifier",
    [
        lambda g: g["nodes"][0].update(pol=[11, 4.9, 5.4]),  # hors échelle 0-10
        lambda g: g["nodes"][0].pop("n"),  # champ obligatoire
        lambda g: g["nodes"][0].update(resp_id=1),  # champ inconnu (ENF-09)
        lambda g: g["meta"].update(date_traitement="8 octobre"),
        lambda g: g["edges"].append(
            {"s": "a", "t": "b", "lift": 0.9, "ci": [0.8, 1], "n": 40, "shown": True}
        ),  # lien sous 1
    ],
)
def test_graphe_non_conforme_refuse(modifier):
    g = copy.deepcopy(GRAPHE)
    modifier(g)
    with pytest.raises(ErreurExport, match="non conforme"):
        valider(g, SCHEMA, serialiser(g))


def test_serialisation_reproductible_et_sans_nan():
    assert serialiser(GRAPHE) == serialiser(copy.deepcopy(GRAPHE))
    with pytest.raises(ValueError):
        serialiser({"x": float("nan")})


def test_dictionnaire_complet_requis():
    verifier_dictionnaire({"liens": pd.DataFrame(columns=list(COLONNES["liens"]))})
    with pytest.raises(ErreurTelechargements, match="sans description"):
        verifier_dictionnaire({"liens": pd.DataFrame(columns=["source", "nouvelle"])})


def test_gexf_date_fixe():
    medias = pd.DataFrame(
        {
            "media_id": ["a", "b"],
            "nom": ["A", "B"],
            "type": ["tv", "tv"],
            "n_repondants": [60, 70],
            "famille": [1, 1],
            "pol_moy": [5.0, 6.0],
            "age_moy": [40.0, 50.0],
            "pont": [False, True],
            "x": [0.1, 0.9],
            "y": [0.2, 0.8],
        }
    )
    liens = pd.DataFrame(
        {
            "source": ["a"],
            "cible": ["b"],
            "lift": [2.0],
            "lift_bas": [1.5],
            "n_communs": [40],
            "affiche": [True],
        }
    )
    texte = gexf({"medias": medias, "liens": liens}, "2026-10-08")
    assert 'lastmodifieddate="2026-10-08"' in texte
    assert texte == gexf({"medias": medias, "liens": liens}, "2026-10-08")


def test_lire_requetes_cypher(tmp_path):
    from pipeline.export.neo4j import lire_requetes

    fichier = tmp_path / "requetes.cypher"
    fichier.write_text(
        "// En-tête du fichier\n\n// Première requête\nMATCH (m) RETURN m;\n\n"
        "// Seconde\nMATCH (n)\nRETURN count(n);\n",
        encoding="utf-8",
    )
    assert lire_requetes(fichier) == {
        "Première requête": "MATCH (m) RETURN m",
        "Seconde": "MATCH (n)\nRETURN count(n)",
    }


def test_enregistrements_neo4j_sans_nan():
    from pipeline.export.neo4j import enregistrements

    lignes = enregistrements(pd.DataFrame({"a": [1.0, float("nan")], "b": ["x", None]}))
    assert lignes == [{"a": 1.0, "b": "x"}, {"a": None, "b": None}]
